/* =====================================================================
   Writeout's Word layout! A ribbon, a File screen, a Navigation pane and
   real Pages (Word's Print Layout) on top of Writeout's own editor code.
   Writeout Classic (the original glass layout) stays one click away in
   Settings! Loaded after app.js, marketplace.js, settings.js and
   office-shell.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof canvas === 'undefined' || !canvas) return;
    const OS = window.OfficeShell;
    const ed = canvas;

    /* ---------- Preferences (layout-only, never saved into documents) ---------- */
    const PREF_KEY = 'writeout_word_prefs';
    const prefs = Object.assign({ pages: true, margins: 'normal', numbers: true, nav: true, pane: false, zoom: 1, focus: false }, (function () {
        try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; }
    })());
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

    const MARGINS = {
        normal: { label: 'Normal', hint: '1" all around', t: 96, b: 96, s: 96 },
        narrow: { label: 'Narrow', hint: '0.5" all around', t: 48, b: 48, s: 48 },
        moderate: { label: 'Moderate', hint: '1" top/bottom, 0.75" sides', t: 96, b: 96, s: 72 },
        wide: { label: 'Wide', hint: '1" top/bottom, 2" sides', t: 96, b: 96, s: 192 },
        writeout: { label: 'Writeout', hint: 'The original snug 30px padding', t: 30, b: 30, s: 30 }
    };
    const GAP = 28;

    function save() { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} }

    /* ---------- Selection helpers ---------- */
    function selNode() {
        const s = window.getSelection();
        if (!s || !s.rangeCount || !ed.contains(s.anchorNode)) return null;
        const n = s.anchorNode;
        return n.nodeType === 3 ? n.parentElement : n;
    }
    function selComputed() {
        const n = selNode();
        return getComputedStyle(n || ed);
    }
    function inTag(sel) {
        const n = selNode();
        return !!(n && n !== ed && n.closest && n.closest(sel) && ed.contains(n.closest(sel)));
    }
    function topBlock() {
        let n = selNode();
        if (!n || n === ed) return null;
        while (n && n.parentElement !== ed) n = n.parentElement;
        return n;
    }
    function hasSelection() {
        const s = window.getSelection();
        return !!(s && s.rangeCount && !s.isCollapsed && ed.contains(s.anchorNode));
    }
    function fmt(cmd) { if (typeof applyTextFormatting === 'function') applyTextFormatting(cmd); }

    /* ---------- Home tab actions ---------- */
    const FONTS = ['JetBrains Mono', 'Roboto', 'Space Grotesk', 'Comic Neue', 'Fairfax HD', 'Iosevka', 'Unifont', 'OpenDyslexic'];
    function currentFont() {
        const cs = selComputed();
        if (!cs) return null;
        const fam = cs.fontFamily.replace(/['"]+/g, '').toLowerCase();
        return FONTS.find(function (f) { return fam.indexOf(f.toLowerCase()) === 0; }) || FONTS.find(function (f) { return fam.indexOf(f.toLowerCase()) !== -1; }) || null;
    }
    function setFont(f) {
        try { document.execCommand('fontName', false, f); } catch (e) {}
        save();
    }
    function currentSize() {
        const cs = selComputed();
        return cs ? Math.round(parseFloat(cs.fontSize)) : null;
    }
    function setSize(px) { if (typeof fmtApplySizePx === 'function') fmtApplySizePx(px); save(); }
    function bumpSize(d) {
        const steps = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96];
        const cur = currentSize() || 16;
        let next = d > 0 ? steps.find(function (s) { return s > cur; }) : steps.slice().reverse().find(function (s) { return s < cur; });
        if (!next) next = d > 0 ? cur + 8 : Math.max(6, cur - 2);
        setSize(next);
    }
    function currentWeight() {
        const cs = selComputed();
        if (!cs) return null;
        const w = cs.fontWeight === 'bold' ? 700 : cs.fontWeight === 'normal' ? 400 : parseInt(cs.fontWeight, 10);
        return String(Math.min(900, Math.max(300, Math.round(w / 100) * 100)));
    }

    let lastColor = '#e11d48';
    const COLORS = ['#000000', '#334155', '#64748b', '#ffffff', '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#16a34a', '#059669', '#0891b2', '#0284c7', '#2563eb', '#7c3aed', '#c026d3', '#db2777'];
    function applyColor(c) {
        lastColor = c;
        try { document.execCommand('foreColor', false, c); } catch (e) {}
        save();
    }
    function colorMenu() {
        return [
            { header: 'Font Color' },
            { swatches: COLORS.map(function (c) { return { color: c, title: c, run: function () { applyColor(c); } }; }) },
            { sep: true },
            { label: 'Automatic (inherit)', icon: 'reset', run: function () { if (typeof fmtResetColor === 'function') fmtResetColor('foreColor'); save(); } },
            { label: 'More Colors…', icon: 'palette', run: moreColors }
        ];
    }
    function moreColors() {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.value = lastColor;
        inp.style.cssText = 'position:fixed;left:-40px;top:0;opacity:0';
        document.body.appendChild(inp);
        inp.addEventListener('change', function () { OS.restoreSelection(); applyColor(inp.value); inp.remove(); });
        inp.addEventListener('blur', function () { setTimeout(function () { inp.remove(); }, 400); });
        inp.click();
    }

    function swatchMenu(title, list, applyFn, swCls) {
        return [
            { header: title },
            { cols: 5, cls: 'wo-sw-grid', swatches: list.map(function (s) { return { cls: swCls + ' ' + s.cls, html: 'Aa', title: s.label, run: function () { applyFn(s.cls); save(); } }; }) }
        ];
    }

    function setBlock(kind) {
        const map = { p: 'div', h1: 'h1', h2: 'h2', h3: 'h3', quote: 'blockquote', code: 'pre' };
        let blk = topBlock();
        // Toggle back to Normal when it is already that style!
        if (blk && kind !== 'p' && blk.tagName === map[kind].toUpperCase()) kind = 'p';
        // Every line is its own box now, so the box itself changes tag (not a nested element)!
        if (window.KdBlockEditor && window.KdBlockEditor.setBlock(map[kind], { h1: 'header-1', h2: 'header-2', h3: 'header-3', quote: 'blockquote-list' }[kind])) {
            save();
            try { if (typeof kdRenderOutline === 'function') kdRenderOutline(); } catch (e) {}
            return;
        }
        try { document.execCommand('formatBlock', false, '<' + map[kind] + '>'); } catch (e) {}
        blk = topBlock();
        if (blk) {
            const cls = { h1: 'header-1', h2: 'header-2', h3: 'header-3', quote: 'blockquote-list' }[kind];
            blk.removeAttribute('class');
            if (cls) blk.className = cls;
        }
        save();
        try { if (typeof kdRenderOutline === 'function') kdRenderOutline(); } catch (e) {}
    }
    function blockKind() {
        const b = topBlock();
        if (!b) return 'p';
        return { H1: 'h1', H2: 'h2', H3: 'h3', BLOCKQUOTE: 'quote', PRE: 'code' }[b.tagName] || 'p';
    }
    function list(ordered) {
        if (window.KdBlockEditor && window.KdBlockEditor.toggleList(ordered)) { save(); return; }
        try { document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList'); } catch (e) {}
        const n = selNode();
        const l = n && n.closest && n.closest('ul, ol');
        if (l && ed.contains(l) && l.tagName === 'UL') l.classList.add('bulleted-list');
        save();
    }
    function align(a) { if (typeof fmtAlignBlocks === 'function') fmtAlignBlocks(a); }
    function currentAlign() {
        const cs = selComputed();
        if (!cs) return 'left';
        const t = cs.textAlign;
        return t === 'start' ? 'left' : t === 'end' ? 'right' : t;
    }
    function inlineCode() {
        if (!hasSelection()) { OS.toast('Select some text to turn into code!'); return; }
        const s = window.getSelection();
        const r = s.getRangeAt(0);
        const code = document.createElement('code');
        code.appendChild(r.extractContents());
        r.insertNode(code);
        const nr = document.createRange();
        nr.selectNodeContents(code);
        s.removeAllRanges();
        s.addRange(nr);
        save();
    }

    async function paste() {
        try {
            const t = await navigator.clipboard.readText();
            OS.restoreSelection();
            document.execCommand('insertText', false, t);
            save();
        } catch (e) {
            OS.toast('Press ⌘V (Ctrl+V) to paste: the browser blocks the Paste button here!');
        }
    }

    async function insertLink() {
        const s = window.getSelection();
        const text = hasSelection() ? s.toString() : '';
        const range = s && s.rangeCount && ed.contains(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;
        let url = await OS.prompt('Insert Link', 'Address (URL)', 'https://', 'Insert');
        if (!url || url === 'https://') return;
        if (!/^(https?:|mailto:)/i.test(url)) url = 'https://' + url;
        ed.focus();
        if (range) { s.removeAllRanges(); s.addRange(range); }
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.textContent = text || url;
        if (text && range) {
            range.deleteContents();
            range.insertNode(a);
            save();
        } else if (typeof fmtInsertNodeAtCaret === 'function') fmtInsertNodeAtCaret(a);
        else { ed.appendChild(a); save(); }
    }

    function insertKind(k) { if (typeof runInsertKind === 'function') runInsertKind(k); }

    function newPage() {
        const b = document.getElementById('tabs-add-btn');
        if (b) b.click();
    }

    /* ---------- Find & Replace ---------- */
    function textNodes() {
        const out = [];
        const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) out.push(n);
        return out;
    }
    function findDialog(withReplace) {
        const box = document.createElement('div');
        box.innerHTML = '<label class="os-field"><span>Find what</span><input class="os-dlg-input" id="wo-find-q" spellcheck="false"></label>' +
            '<label class="os-field"><span>Replace with</span><input class="os-dlg-input" id="wo-find-r" spellcheck="false"></label>' +
            '<label class="os-check" style="margin-top:4px"><input type="checkbox" id="wo-find-case"><span>Match case</span></label>' +
            '<p class="os-dlg-text" id="wo-find-msg" style="color:var(--os-dim);font-size:12px">Type a word, then Find Next or Replace All!</p>';
        if (!withReplace) box.children[1].style.display = 'none';
        let lastNode = null, lastEnd = 0;
        const msg = function (t) { box.querySelector('#wo-find-msg').textContent = t; };
        const findNext = function () {
            const q = box.querySelector('#wo-find-q').value;
            if (!q) { msg('Type something to find first!'); return; }
            const mc = box.querySelector('#wo-find-case').checked;
            const nodes = textNodes();
            let start = lastNode ? nodes.indexOf(lastNode) : 0;
            if (start < 0) start = 0;
            for (let pass = 0; pass < 2; pass++) {
                for (let i = pass === 0 ? start : 0; i < nodes.length; i++) {
                    const v = mc ? nodes[i].nodeValue : nodes[i].nodeValue.toLowerCase();
                    const from = (pass === 0 && nodes[i] === lastNode) ? lastEnd : 0;
                    const at = v.indexOf(mc ? q : q.toLowerCase(), from);
                    if (at !== -1) {
                        lastNode = nodes[i];
                        lastEnd = at + q.length;
                        const r = document.createRange();
                        r.setStart(nodes[i], at);
                        r.setEnd(nodes[i], at + q.length);
                        const s = window.getSelection();
                        s.removeAllRanges();
                        s.addRange(r);
                        const rect = r.getBoundingClientRect();
                        const sc = document.querySelector('.canvas-scrollbox');
                        if (sc && rect) { const sr = sc.getBoundingClientRect(); if (rect.top < sr.top + 40 || rect.bottom > sr.bottom - 40) sc.scrollTop += rect.top - sr.top - sr.height / 3; }
                        msg('Found it! Press Find Next for the next one!');
                        return;
                    }
                }
                lastNode = null; lastEnd = 0;
            }
            msg('No matches for "' + q + '"!');
        };
        const replaceAll = function () {
            const q = box.querySelector('#wo-find-q').value;
            const rep = box.querySelector('#wo-find-r').value;
            if (!q) { msg('Type something to find first!'); return; }
            const mc = box.querySelector('#wo-find-case').checked;
            const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), mc ? 'g' : 'gi');
            let count = 0;
            textNodes().forEach(function (n) {
                const v = n.nodeValue;
                const nv = v.replace(re, function () { count++; return rep; });
                if (nv !== v) n.nodeValue = nv;
            });
            save();
            msg(count ? 'Replaced ' + count + ' match' + (count === 1 ? '' : 'es') + '!' : 'No matches for "' + q + '"!');
            paginateSoon();
        };
        // Find Next / Replace All keep the dialog open for repeated presses!
        const btns = [{ label: 'Close', value: null }];
        if (withReplace) btns.push({ label: 'Replace All', keep: true, value: replaceAll });
        btns.push({ label: 'Find Next', primary: true, keep: true, value: findNext });
        OS.dialog(withReplace ? 'Find and Replace' : 'Find', box, btns);
    }

    /* ---------- Word count ---------- */
    function stats() {
        const text = ed.innerText || '';
        const words = (text.match(/[^\s]+/g) || []).length;
        const chars = text.replace(/\n/g, '').length;
        const charsNoSpace = text.replace(/\s/g, '').length;
        const paras = [].filter.call(ed.childNodes, function (n) { return (n.textContent || '').trim(); }).length;
        return { words: words, chars: chars, charsNoSpace: charsNoSpace, paras: paras, read: Math.max(1, Math.round(words / 230)) };
    }
    function wordCount() {
        const s = stats();
        const row = function (a, b) { return '<tr><td>' + a + '</td><td><b>' + b.toLocaleString() + '</b></td></tr>'; };
        OS.dialog('Word Count', '<table class="wo-wc">' + row('Pages', pageCount) + row('Words', s.words) + row('Characters (no spaces)', s.charsNoSpace) + row('Characters (with spaces)', s.chars) + row('Paragraphs', s.paras) + row('Reading time (minutes)', s.read) + '</table>');
    }

    /* ---------- Zoom ---------- */
    function setZoom(z) {
        prefs.zoom = Math.max(0.5, Math.min(2, Math.round(z * 100) / 100));
        savePrefs();
        applyView();
    }
    function fitWidth() {
        const sc = document.querySelector('.canvas-scrollbox');
        const w = pageDims().w + 60;
        if (sc) setZoom(Math.max(0.5, Math.min(2, (sc.clientWidth - 20) / w)));
    }

    /* ---------- Pages (Print Layout) ---------- */
    let zoomer = null, sheets = null, ruleStyle = null, pageCount = 1, sheetBg = '#ffffff';

    function pageDims() {
        let w = (typeof kdPageWidth === 'function' && kdPageWidth()) || 0;
        let h = (typeof kdPageHeight === 'function' && kdPageHeight()) || 1056;
        if (!w) {
            // KD Document size: Letter-shaped pages, turned for Landscape!
            const land = typeof kdPageOrient !== 'undefined' && kdPageOrient === 'landscape';
            w = land ? 1056 : 816;
            h = land ? 816 : 1056;
        }
        return { w: w, h: h };
    }

    function office() { return document.body.classList.contains('os-office'); }
    function pagesOn() { return office() && prefs.pages; }

    function ensureWrap() {
        if (zoomer) return;
        const box = ed.parentElement;
        zoomer = document.createElement('div');
        zoomer.id = 'wo-zoomer';
        sheets = document.createElement('div');
        sheets.id = 'wo-sheets';
        sheets.setAttribute('aria-hidden', 'true');
        box.insertBefore(zoomer, ed);
        zoomer.appendChild(sheets);
        zoomer.appendChild(ed);
        ruleStyle = document.createElement('style');
        ruleStyle.id = 'wo-page-rules';
        document.head.appendChild(ruleStyle);
    }

    // The page color follows the canvas theme (Dark Canvas, Sepia...)!
    function captureSheetBg() {
        const had = document.body.classList.contains('wo-pages');
        if (had) document.body.classList.remove('wo-pages');
        const cs = getComputedStyle(ed);
        sheetBg = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage + ', ' + cs.backgroundColor : cs.backgroundColor;
        if (!sheetBg || sheetBg === 'rgba(0, 0, 0, 0)') sheetBg = '#ffffff';
        if (had) document.body.classList.add('wo-pages');
        if (zoomer) zoomer.style.setProperty('--wo-sheet-bg', sheetBg);
    }

    function applyView() {
        ensureWrap();
        const on = office();
        document.body.classList.toggle('wo-pages', pagesOn());
        document.body.classList.toggle('wo-web', on && !prefs.pages);
        document.body.classList.toggle('wo-nav-off', !prefs.nav);
        document.body.classList.toggle('wo-pane-on', !!prefs.pane);
        document.body.classList.toggle('wo-focus', on && !!prefs.focus);
        document.body.classList.toggle('wo-numbers', !!prefs.numbers);
        const d = pageDims();
        const m = MARGINS[prefs.margins] || MARGINS.normal;
        const st = zoomer.style;
        st.setProperty('--wo-pw', d.w + 'px');
        st.setProperty('--wo-ph', d.h + 'px');
        st.setProperty('--wo-gap', GAP + 'px');
        st.setProperty('--wo-mt', m.t + 'px');
        st.setProperty('--wo-mb', m.b + 'px');
        st.setProperty('--wo-ms', m.s + 'px');
        st.zoom = on ? String(prefs.zoom) : '';
        captureSheetBg();
        paginate();
        OS.sync();
    }

    function paginate() {
        if (!ruleStyle) return;
        const sheet = ruleStyle.sheet;
        while (sheet.cssRules.length) sheet.deleteRule(0);
        if (!pagesOn()) {
            sheets.innerHTML = '';
            ed.style.removeProperty('--wo-min-h');
            pageCount = Math.max(1, Math.ceil((ed.scrollHeight || 1) / pageDims().h));
            return;
        }
        const d = pageDims();
        const m = MARGINS[prefs.margins] || MARGINS.normal;
        const H = d.h, P = d.h + GAP;
        const box = ed.getBoundingClientRect();
        const ratio = (box.height / (ed.offsetHeight || 1)) || 1;
        const top0 = box.top;
        let idx = 0, lastBottom = m.t;
        const kids = ed.children;
        for (let i = 0; i < kids.length; i++) {
            const kid = kids[i];
            idx++;
            const cs = getComputedStyle(kid);
            if (cs.position === 'absolute' || cs.position === 'fixed' || cs.display === 'none') continue;
            const r = kid.getBoundingClientRect();
            const t = (r.top - top0) / ratio;
            const b = (r.bottom - top0) / ratio;
            const h = b - t;
            const p = Math.max(0, Math.floor(t / P));
            const cTop = p * P + m.t;
            const cBottom = p * P + H - m.b;
            let target = null;
            if (t > cBottom - 0.5) target = (p + 1) * P + m.t;          // starts in the bottom margin or the gap!
            else if (b > cBottom + 0.5 && h <= H - m.t - m.b) target = (p + 1) * P + m.t; // would straddle the page break!
            else if (p > 0 && t < cTop - 0.5) target = cTop;              // tucked into the top margin!
            if (target !== null) {
                const push = target - t;
                const prev = kid.previousElementSibling;
                const mt = parseFloat(cs.marginTop) || 0;
                const pmb = prev ? (parseFloat(getComputedStyle(prev).marginBottom) || 0) : 0;
                const base = prev ? Math.max(mt, pmb) : mt;
                sheet.insertRule('#wysiwyg-canvas > :nth-child(' + idx + ') { margin-top: ' + (base + push).toFixed(1) + 'px !important; }', sheet.cssRules.length);
                lastBottom = target + h;
            } else lastBottom = Math.max(lastBottom, b);
        }
        // Bare text right inside the canvas still counts toward the height!
        const contentH = Math.max(lastBottom, (ed.scrollHeight || 0) - m.b - 2);
        pageCount = Math.max(1, Math.floor((contentH - 1) / P) + 1);
        const total = pageCount * P - GAP;
        zoomer.style.setProperty('--wo-total-h', total + 'px');
        if (sheets.children.length !== pageCount) {
            let html = '';
            for (let i = 0; i < pageCount; i++) html += '<div class="wo-sheet" style="top:' + (i * P) + 'px"><span class="wo-pnum">' + (i + 1) + '</span></div>';
            sheets.innerHTML = html;
            if (sheets._count && pageCount > sheets._count) {
                const last = sheets.lastElementChild;
                if (last) last.classList.add('wo-sheet-new');
            }
            sheets._count = pageCount;
        }
    }

    let paginateQueued = false;
    function paginateSoon() {
        if (paginateQueued) return;
        paginateQueued = true;
        requestAnimationFrame(function () { paginateQueued = false; if (office()) paginate(); OS.sync(); });
    }

    function currentPage() {
        if (!pagesOn()) return 1;
        const s = window.getSelection();
        if (!s || !s.rangeCount || !ed.contains(s.anchorNode)) return 1;
        let r = s.getRangeAt(0).getBoundingClientRect();
        if (!r || (!r.height && !r.top)) { const n = selNode(); if (n) r = n.getBoundingClientRect(); }
        const box = ed.getBoundingClientRect();
        const ratio = (box.height / (ed.offsetHeight || 1)) || 1;
        const y = (r.top - box.top) / ratio;
        return Math.min(pageCount, Math.max(1, Math.floor(y / (pageDims().h + GAP)) + 1));
    }

    // Which page an element is on (Pages view), for the Table of Contents!
    window.WriteoutPages = {
        pageOf: function (el) {
            if (!pagesOn() || !el || !el.getBoundingClientRect) return 1;
            const r = el.getBoundingClientRect(), box = ed.getBoundingClientRect();
            const ratio = (box.height / (ed.offsetHeight || 1)) || 1;
            return Math.min(pageCount, Math.max(1, Math.floor(((r.top - box.top) / ratio) / (pageDims().h + GAP)) + 1));
        }
    };
    const PRO = function () { return window.WriteoutPro || {}; };

    function setPagesView(on) { prefs.pages = !!on; savePrefs(); applyView(); }
    function setMargins(k) { prefs.margins = k; savePrefs(); applyView(); OS.toast(MARGINS[k].label + ' margins!'); }
    function setFocus(on) {
        prefs.focus = !!on;
        savePrefs();
        applyView();
        if (on) OS.toast('Focus mode! Press Esc to bring the ribbon back!');
    }

    /* ---------- Menus for Layout ---------- */
    function sizeMenu() {
        return (typeof KD_PAGE_SIZES !== 'undefined' ? KD_PAGE_SIZES : []).map(function (s) {
            return { label: s.name, hint: s.w ? Math.round(s.w / 96 * 100) / 100 + '" × ' + Math.round(s.h / 96 * 100) / 100 + '"' : 'Letter-shaped pages', icon: 'size', checked: kdPageSizeId === s.id, run: function () { kdSetPageSize(s.id); applyView(); } };
        });
    }
    function orientMenu() {
        return ['portrait', 'landscape'].map(function (o) {
            return { label: o[0].toUpperCase() + o.slice(1), icon: 'orientation', checked: kdPageOrient === o, run: function () { kdSetOrient(o); applyView(); } };
        });
    }
    function marginsMenu() {
        return Object.keys(MARGINS).map(function (k) {
            return { label: MARGINS[k].label, hint: MARGINS[k].hint, icon: 'margins', checked: prefs.margins === k, run: function () { setMargins(k); } };
        });
    }
    function zoomMenu() {
        return [50, 75, 90, 100, 125, 150, 200].map(function (z) {
            return { label: z + '%', checked: Math.round(prefs.zoom * 100) === z, run: function () { setZoom(z / 100); } };
        }).concat([{ sep: true }, { label: 'Page Width', icon: 'web', run: fitWidth }]);
    }
    function themeMenu() {
        const M = window.WriteoutMarketplace;
        let themes = [];
        let active = '';
        try { themes = M ? M.themes() : []; active = M ? M.activeTheme() : ''; } catch (e) {}
        const rows = [{ id: '', name: 'Default Paper', installed: true }].concat(themes);
        return [{ header: 'Canvas Theme' }].concat(rows.map(function (t) {
            return {
                label: t.name + (t.id === '' || t.installed ? '' : ' (Get)'),
                checked: active === t.id,
                icon: 'pageColor',
                run: function () {
                    if (M && typeof M.applyTheme === 'function') M.applyTheme(t.id);
                    setTimeout(applyView, 60);
                }
            };
        }));
    }

    /* ---------- Panes ---------- */
    function togglePane(group) {
        if (group) {
            prefs.pane = true;
            try { if (typeof fmtSetGroup === 'function') fmtSetGroup(group); } catch (e) {}
        } else prefs.pane = !prefs.pane;
        savePrefs();
        applyView();
    }

    /* ---------- File screen ---------- */
    function greet() {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    }
    function statsLine() {
        const s = stats();
        return pageCount + ' page' + (pageCount === 1 ? '' : 's') + ' · ' + s.words.toLocaleString() + ' words · saves automatically in this browser!';
    }
    async function newDocument() {
        const any = (typeof kdTabs !== 'undefined' ? kdTabs : []).some(function (t) { return t.html && t.html.replace(/<[^>]*>/g, '').trim(); });
        if (any && !(await OS.confirm('New Document', 'Start a fresh document? Every page in this one will be cleared (export a .kd first to keep it)!', 'Start Fresh', true))) return;
        if (typeof kdFreshTabs === 'function') kdFreshTabs();
        ed.innerHTML = '';
        try { kdRenderTabs(); kdRenderOutline(); } catch (e) {}
        save();
        ed.focus();
        applyView();
        OS.toast('Fresh document, ready to write!');
    }
    const DL = [
        ['kd', '.KD document', 'Every page, style and setting!', 'save'],
        ['docx', 'Word (.docx)', 'Opens in Microsoft Word!', 'file'],
        ['pdf', 'PDF', 'Via the print dialog!', 'print'],
        ['odt', 'OpenDocument (.odt)', 'For LibreOffice!', 'file'],
        ['txt', 'Plain Text (.txt)', 'Just the words!', 'page'],
        ['epub', 'EPUB e-book', 'For e-readers!', 'notebook'],
        ['jpeg', 'JPEG image', 'A snapshot of the page!', 'image'],
        ['svg', 'SVG image', 'A vector snapshot!', 'image'],
        ['web', 'Web page (.zip)', 'HTML + CSS!', 'web']
    ];
    function download(fmt) { if (typeof runDownloadFormat === 'function') runDownloadFormat(fmt); }

    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'Blank document', hint: 'Start fresh!', preview: '<div class="os-card-prev wo-prev-blank"></div>', run: newDocument },
                    { label: 'New page', hint: 'Add a page tab to this document!', icon: 'newDoc', run: newPage },
                    { label: 'Open a .kd file', hint: 'Import a Writeout document!', icon: 'folder', run: openFile }
                ]));
                b.insertAdjacentHTML('beforeend', '<h2>This document</h2><div class="wo-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + OS.esc((kdActiveTab() || {}).name || 'Main') + '</b><span>' + OS.esc(statsLine()) + '</span></div></div>');
            }
        },
        { id: 'new', label: 'New', icon: 'newDoc', render: function (b) { b.innerHTML = '<h1>New</h1>'; b.appendChild(OS.bsCards([{ label: 'Blank document', hint: 'Clears every page!', preview: '<div class="os-card-prev wo-prev-blank"></div>', run: newDocument }, { label: 'New page', hint: 'A fresh page tab, keeping the rest!', icon: 'newDoc', run: newPage }])); } },
        { id: 'open', label: 'Open', icon: 'folder', render: function (b) { b.innerHTML = '<h1>Open</h1>'; b.appendChild(OS.bsCards([{ label: 'Browse…', hint: 'Open a .kd Writeout document!', icon: 'folder', run: openFile }])); b.insertAdjacentHTML('beforeend', '<p class="os-note">Your work also saves automatically in this browser!</p>'); } },
        { id: 'save', label: 'Save a Copy', icon: 'save', render: function (b) { b.innerHTML = '<h1>Save a Copy</h1>'; b.appendChild(OS.bsCards(DL.slice(0, 2).map(function (d) { return { label: d[1], hint: d[2], icon: d[3], run: function () { download(d[0]); } }; }))); } },
        { id: 'export', label: 'Export', icon: 'export', render: function (b) { b.innerHTML = '<h1>Export</h1>'; b.appendChild(OS.bsCards(DL.map(function (d) { return { label: d[1], hint: d[2], icon: d[3], run: function () { download(d[0]); } }; }))); } },
        { id: 'print', label: 'Print', icon: 'print', action: function () { if (typeof printWriteoutPage === 'function') printWriteoutPage(); } },
        {
            id: 'info', label: 'Info', icon: 'info', render: function (b) {
                const s = stats();
                b.innerHTML = '<h1>Info</h1><table class="wo-wc big"><tr><td>Pages</td><td><b>' + pageCount + '</b></td></tr><tr><td>Words</td><td><b>' + s.words.toLocaleString() + '</b></td></tr><tr><td>Characters</td><td><b>' + s.chars.toLocaleString() + '</b></td></tr><tr><td>Paragraphs</td><td><b>' + s.paras + '</b></td></tr><tr><td>Page tabs</td><td><b>' + kdTabs.length + '</b></td></tr><tr><td>Protected</td><td><b>' + (kdDocPasswordHash ? 'Yes!' : 'No') + '</b></td></tr></table>';
                b.appendChild(OS.bsCards([{ label: 'Protect Document', hint: 'Set a password for this document!', icon: 'lock', run: function () { togglePane('doc'); } }]));
            }
        }
    ];

    function openFile() { const g = document.getElementById('file-loader-gate'); if (g) g.click(); }
    function openClassicSettings() { const b = document.getElementById('settings-trigger-btn'); if (b) b.click(); }

    function seg(options, current, onPick) {
        const s = document.createElement('div');
        s.className = 'os-seg';
        options.forEach(function (o) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = o[1];
            b.classList.toggle('on', o[0] === current());
            b.addEventListener('click', function () { onPick(o[0]); [].forEach.call(s.children, function (x, i) { x.classList.toggle('on', options[i][0] === current()); }); });
            s.appendChild(b);
        });
        return s;
    }
    function setRow(label, node) {
        const r = document.createElement('div');
        r.className = 'os-set-row';
        r.innerHTML = '<b>' + OS.esc(label) + '</b>';
        r.appendChild(node);
        return r;
    }

    function settingsExtra(b) {
        b.insertAdjacentHTML('beforeend', '<h2>Pages</h2>');
        b.appendChild(setRow('View', seg([[true, 'Pages'], [false, 'Continuous']], function () { return prefs.pages; }, setPagesView)));
        b.appendChild(setRow('Page size', seg((typeof KD_PAGE_SIZES !== 'undefined' ? KD_PAGE_SIZES : []).map(function (s) { return [s.id, s.id === 'kd' ? 'KD (Letter)' : s.name]; }), function () { return kdPageSizeId; }, function (id) { kdSetPageSize(id); applyView(); })));
        b.appendChild(setRow('Orientation', seg([['portrait', 'Portrait'], ['landscape', 'Landscape']], function () { return kdPageOrient; }, function (o) { kdSetOrient(o); applyView(); })));
        b.appendChild(setRow('Margins', seg(Object.keys(MARGINS).map(function (k) { return [k, MARGINS[k].label]; }), function () { return prefs.margins; }, setMargins)));
        const opts = document.createElement('div');
        opts.className = 'os-opts';
        opts.appendChild(OS.optRow('Page numbers', 'A little number at the bottom of every page!', function () { return prefs.numbers; }, function (v) { prefs.numbers = v; savePrefs(); applyView(); }));
        b.appendChild(opts);
        b.insertAdjacentHTML('beforeend', '<h2>Writeout</h2>');
        const o2 = document.createElement('div');
        o2.className = 'os-opts';
        const WS = window.WriteoutSettings;
        if (WS) {
            o2.appendChild(OS.optRow('Floating spheres', 'The drifting glass bubbles from Writeout Classic!', function () { return !WS.ambientHidden(); }, function (v) { WS.setAmbientHidden(!v); }));
            o2.appendChild(OS.optRow('Restore documents on start', 'Reopen your pages when Writeout starts!', function () { return WS.restoreDocs(); }, function (v) { WS.setRestoreDocs(v); }));
        }
        b.appendChild(o2);
        b.appendChild(OS.bsCards([{ label: 'Canvas themes & more', hint: 'Themes, history wipe and the rest of Writeout Classic settings!', icon: 'palette', run: openClassicSettings }]));
    }

    /* ---------- Ribbon ---------- */
    const hl = typeof FMT_HIGHLIGHT_STYLES !== 'undefined' ? FMT_HIGHLIGHT_STYLES : [];
    const chips = typeof FMT_CHIP_STYLES !== 'undefined' ? FMT_CHIP_STYLES : [];
    const aqua = typeof FMT_AQUA_STYLES !== 'undefined' ? FMT_AQUA_STYLES : [];
    let lastHl = hl[0] ? hl[0].cls : '';

    const styleGallery = [
        { label: 'Normal', preview: '<i class="wo-gp wo-gp-p">AaBb</i>', run: function () { setBlock('p'); }, active: function () { return blockKind() === 'p'; } },
        { label: 'Heading 1', preview: '<i class="wo-gp wo-gp-h1">AaBb</i>', run: function () { setBlock('h1'); }, active: function () { return blockKind() === 'h1'; } },
        { label: 'Heading 2', preview: '<i class="wo-gp wo-gp-h2">AaBb</i>', run: function () { setBlock('h2'); }, active: function () { return blockKind() === 'h2'; } },
        { label: 'Heading 3', preview: '<i class="wo-gp wo-gp-h3">AaBb</i>', run: function () { setBlock('h3'); }, active: function () { return blockKind() === 'h3'; } },
        { label: 'Quote', preview: '<i class="wo-gp wo-gp-q">AaBb</i>', run: function () { setBlock('quote'); }, active: function () { return blockKind() === 'quote'; } },
        { label: 'Code', preview: '<i class="wo-gp wo-gp-c">AaBb</i>', run: function () { setBlock('code'); }, active: function () { return blockKind() === 'code'; } }
    ];

    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'Clipboard', items: [
                    { big: true, icon: 'paste', label: 'Paste', kbd: '⌘V', run: paste },
                    { stack: [
                        { sm: true, icon: 'cut', label: 'Cut', kbd: '⌘X', run: function () { try { document.execCommand('cut'); } catch (e) {} save(); } },
                        { sm: true, icon: 'copy', label: 'Copy', kbd: '⌘C', run: function () { try { document.execCommand('copy'); } catch (e) {} } },
                        { sm: true, icon: 'clearFormat', label: 'Exit Formatting', title: 'Hop out of the current style (⌘⇧E)', run: function () { if (typeof fmtExitFormattingNow === 'function') fmtExitFormattingNow(); save(); } }
                    ] }
                ] },
                { label: 'Font', items: [{ rows: [
                    [
                        { select: true, title: 'Font', width: 132, fontPreview: true, options: FONTS, get: currentFont, set: setFont },
                        { number: true, title: 'Font Size (px)', width: 50, min: 6, max: 200, get: currentSize, set: setSize },
                        { icon: 'growFont', title: 'Increase Font Size', run: function () { bumpSize(1); } },
                        { icon: 'shrinkFont', title: 'Decrease Font Size', run: function () { bumpSize(-1); } },
                        { select: true, title: 'Font Weight', width: 92, options: [['300', 'Light'], ['400', 'Normal'], ['500', 'Medium'], ['600', 'Semi Bold'], ['700', 'Bold'], ['800', 'Extra Bold'], ['900', 'Black']], get: currentWeight, set: function (v) { if (typeof fmtApplyWeight === 'function') fmtApplyWeight(v); save(); } }
                    ],
                    [
                        { glyph: 'B', glyphCls: 'b', title: 'Bold', kbd: '⌘B', run: function () { fmt('bold'); }, checked: function () { return inTag('b, strong'); } },
                        { glyph: 'I', glyphCls: 'it', title: 'Italic', kbd: '⌘I', run: function () { fmt('italic'); }, checked: function () { return inTag('i, em'); } },
                        { glyph: 'U', glyphCls: 'u', title: 'Underline', kbd: '⌘U', run: function () { fmt('underline'); }, checked: function () { return inTag('u'); } },
                        { glyph: 'ab', glyphCls: 's', title: 'Strikethrough', run: function () { fmt('strikethrough'); }, checked: function () { return inTag('s, strike, del'); } },
                        { icon: 'code', title: 'Inline Code', run: inlineCode, checked: function () { return inTag('code'); } },
                        { sep: true },
                        { icon: 'highlighter', title: 'Highlight', bar: function () { return '#fde047'; }, run: function () { if (lastHl && typeof fmtApplyHighlight === 'function') { fmtApplyHighlight(lastHl); save(); } }, menu: function () { return swatchMenu('Highlighter', hl, function (c) { lastHl = c; fmtApplyHighlight(c); }, 'hl-swatch'); } },
                        { icon: 'fontColor', title: 'Font Color', bar: function () { return lastColor; }, run: function () { applyColor(lastColor); }, menu: colorMenu },
                        { icon: 'orb', title: 'Gel Orbs', menu: function () { return swatchMenu('Gel Orbs', chips, fmtApplyChip, 'cp-swatch'); } },
                        { icon: 'bubble', title: 'Gel Bubbles', menu: function () { return swatchMenu('Gel Bubbles', aqua, fmtApplyAqua, 'aq-swatch'); } }
                    ]
                ] }] },
                { label: 'Paragraph', items: [{ rows: [
                    [
                        { icon: 'bullets', title: 'Bullets', run: function () { list(false); }, checked: function () { return inTag('ul'); } },
                        { icon: 'numbers', title: 'Numbering', run: function () { list(true); }, checked: function () { return inTag('ol'); } },
                        { sep: true },
                        { icon: 'outdent', title: 'Decrease Indent', run: function () { if (typeof fmtIndentBlocks === 'function') fmtIndentBlocks(-1); } },
                        { icon: 'indent', title: 'Increase Indent', run: function () { if (typeof fmtIndentBlocks === 'function') fmtIndentBlocks(1); } }
                    ],
                    [
                        { icon: 'aLeft', title: 'Align Left', run: function () { align('left'); }, checked: function () { return currentAlign() === 'left'; } },
                        { icon: 'aCenter', title: 'Center', run: function () { align('center'); }, checked: function () { return currentAlign() === 'center'; } },
                        { icon: 'aRight', title: 'Align Right', run: function () { align('right'); }, checked: function () { return currentAlign() === 'right'; } },
                        { icon: 'aJustify', title: 'Justify', run: function () { align('justify'); }, checked: function () { return currentAlign() === 'justify'; } },
                        { sep: true },
                        { icon: 'quote', title: 'Quote', run: function () { setBlock('quote'); }, checked: function () { return blockKind() === 'quote'; } }
                    ]
                ] }] },
                { label: 'Styles', items: [
                    { gallery: true, items: styleGallery, noIndex: false },
                    { big: true, icon: 'sparkle', label: 'Keydown\nStyles', title: 'Keydown Styles: the styles pane with every Keydown chip!', run: function () { togglePane('style'); }, checked: function () { return prefs.pane; } }
                ] },
                { label: 'Editing', items: [{ stack: [
                    { sm: true, icon: 'search', label: 'Find', kbd: '⌘F', run: function () { findDialog(false); } },
                    { sm: true, icon: 'reset', label: 'Replace', run: function () { findDialog(true); } },
                    { sm: true, icon: 'sidePane', label: 'Format Pane', run: function () { togglePane(); }, checked: function () { return prefs.pane; } }
                ] }] }
            ]
        },
        {
            id: 'insert', label: 'Insert', groups: [
                { label: 'Pages', items: [
                    { big: true, icon: 'newDoc', label: 'New\nPage', title: 'Add a page tab to this document', run: newPage },
                    { big: true, icon: 'divider', label: 'Divider', run: function () { insertKind('divider'); paginateSoon(); } }
                ] },
                { label: 'Media', items: [
                    { big: true, icon: 'image', label: 'Picture', run: function () { insertKind('image'); } },
                    { big: true, icon: 'search', label: 'Online\nPicture', title: 'Search free CC0 / CC BY / CC BY-SA pictures!', run: function () { window.openOnlinePictures(); } },
                    { big: true, icon: 'attach', label: 'File', run: function () { insertKind('file'); } }
                ] },
                { label: 'Links', items: [{ big: true, icon: 'link', label: 'Link', run: insertLink }] },
                { label: 'Math', items: [{ big: true, icon: 'sigma', label: 'Equation', title: 'Insert LaTeX math! (Or type $x^2$ then Space, or $$...$$ then Space)', run: function () { if (window.kdMathInsert) window.kdMathInsert(true); }, menu: function () { return [{ label: 'Equation (centered)', icon: 'sigma', run: function () { window.kdMathInsert(true); } }, { label: 'Inline math', icon: 'sigma', run: function () { window.kdMathInsert(false); } }]; } }] },
                { label: 'Text', items: [{ stack: [
                    { sm: true, icon: 'calendar', label: 'Date', run: function () { insertKind('date'); } },
                    { sm: true, icon: 'clock', label: 'Timestamp', run: function () { insertKind('timestamp'); } },
                    { sm: true, icon: 'code', label: 'Code Block', run: function () { setBlock('code'); } }
                ] }] },
                { label: 'Lists', items: [
                    { big: true, icon: 'bullets', label: 'Bulleted\nList', run: function () { list(false); } },
                    { big: true, icon: 'numbers', label: 'Numbered\nList', run: function () { list(true); } }
                ] },
                { label: 'Gadgets', items: [
                    { big: true, icon: 'dice', label: 'Calculator', title: 'Insert a little calculator gadget!', run: function () { if (typeof insertApplet === 'function') insertApplet('calculator'); save(); } },
                    { big: true, icon: 'annotate', label: 'Sticky\nNote', title: 'Insert a sticky note gadget!', run: function () { if (typeof insertApplet === 'function') insertApplet('notes'); save(); } }
                ] }
            ]
        },
        {
            id: 'layout', label: 'Layout', groups: [
                { label: 'Page Setup', items: [
                    { big: true, icon: 'margins', label: 'Margins', menu: marginsMenu },
                    { big: true, icon: 'orientation', label: 'Orientation', menu: orientMenu },
                    { big: true, icon: 'size', label: 'Size', menu: sizeMenu }
                ] },
                { label: 'Pages', items: [
                    { big: true, icon: 'pages', label: 'Pages\nView', title: 'Show the document as separate pages, like Word\'s Print Layout!', run: function () { setPagesView(!prefs.pages); }, checked: function () { return prefs.pages; } },
                    { stack: [
                        { check: true, label: 'Page Numbers', get: function () { return prefs.numbers; }, set: function (v) { prefs.numbers = v; savePrefs(); applyView(); } },
                        { sm: true, icon: 'newDoc', label: 'New Page Tab', run: newPage }
                    ] }
                ] },
                { label: 'Paragraph', items: [{ stack: [
                    { sm: true, icon: 'indent', label: 'Indent', run: function () { if (typeof fmtIndentBlocks === 'function') fmtIndentBlocks(1); } },
                    { sm: true, icon: 'outdent', label: 'Outdent', run: function () { if (typeof fmtIndentBlocks === 'function') fmtIndentBlocks(-1); } }
                ] }] }
            ]
        },
        {
            id: 'references', label: 'References', groups: [
                { label: 'Table of Contents', items: [
                    { big: true, icon: 'bullets', label: 'Table of\nContents', title: 'Insert a clickable table of contents built from your headings (with page numbers in Pages view)!', run: function () { if (PRO().insertTOC) PRO().insertTOC(); } },
                    { stack: [{ sm: true, icon: 'reset', label: 'Update Table', run: function () { if (PRO().updateTOCs) PRO().updateTOCs(); } }] }
                ] },
                { label: 'Footnotes', items: [
                    { big: true, icon: 'numbers', label: 'Insert\nFootnote', title: 'Add a numbered note at the caret; the note text goes at the end of the document!', run: function () { if (PRO().insertFootnote) PRO().insertFootnote(); } }
                ] },
                { label: 'Mail Merge', items: [
                    { big: true, icon: 'folder', label: 'Mail\nMerge', title: 'One letter, many copies: fill «fields» from a Mainkey database (.kb), CSV or JSON!', run: function () { if (PRO().mailMerge) PRO().mailMerge(); } },
                    { big: true, icon: 'attach', label: 'Merge\nField', menu: function () { return PRO().fieldMenu ? PRO().fieldMenu() : []; } }
                ] }
            ]
        },
        {
            id: 'review', label: 'Review', groups: [
                { label: 'Proofing', items: [
                    { big: true, icon: 'numbers', label: 'Word\nCount', run: wordCount },
                    { big: true, icon: 'search', label: 'Find &\nReplace', run: function () { findDialog(true); } }
                ] },
                { label: 'Annotator', items: [
                    { big: true, icon: 'annotate', label: 'Annotator', title: 'A pen tray: pick a pen and a color, then select text to mark it! Notes and a list of every mark too!', run: function () { if (window.WriteoutAnnotator) window.WriteoutAnnotator.toggle(); }, checked: function () { return !!(window.WriteoutAnnotator && window.WriteoutAnnotator.isOn()); } },
                    { stack: [{ sm: true, icon: 'bullets', label: 'All Marks', run: function () { if (window.WriteoutAnnotator) window.WriteoutAnnotator.list(); } }] }
                ] },
                { label: 'Writing', items: [
                    { big: true, icon: 'sparkle', label: 'Readability', title: 'Reading ease, school grade, reading time and your longest sentences!', run: function () { if (PRO().readability) PRO().readability(); } },
                    { big: true, icon: 'focus', label: 'Word\nGoal', title: 'Set a word goal and watch the progress bar at the bottom!', run: function () { if (PRO().setGoal) PRO().setGoal(); } },
                    { stack: [{ check: true, label: 'Mark Long Sentences', get: function () { return PRO().longOn ? PRO().longOn() : false; }, set: function (v) { if (PRO().setLong) PRO().setLong(v); } }] }
                ] },
                { label: 'History', items: [
                    { big: true, icon: 'save', label: 'Save\nVersion', title: 'Keep a named copy of this page that you can go back to!', run: function () { if (PRO().saveVersion) PRO().saveVersion(); } },
                    { big: true, icon: 'clock', label: 'Version\nHistory', title: 'See, preview and restore saved versions!', run: function () { if (PRO().history) PRO().history(); } }
                ] },
                { label: 'Protect', items: [{ big: true, icon: 'lock', label: 'Protect\nDocument', title: 'Set a password for this document', run: function () { togglePane('doc'); } }] }
            ]
        },
        {
            id: 'view', label: 'View', groups: [
                { label: 'Views', items: [
                    { big: true, icon: 'pages', label: 'Pages', title: 'Print Layout: separate pages!', run: function () { setPagesView(true); }, checked: function () { return prefs.pages; } },
                    { big: true, icon: 'web', label: 'Continuous', title: 'One long page, like Word\'s Web Layout!', run: function () { setPagesView(false); }, checked: function () { return !prefs.pages; } },
                    { big: true, icon: 'focus', label: 'Focus', title: 'Hide everything but the page (Esc to exit)!', run: function () { setFocus(true); } }
                ] },
                { label: 'Show', items: [{ stack: [
                    { check: true, label: 'Navigation Pane', get: function () { return prefs.nav; }, set: function (v) { prefs.nav = v; savePrefs(); applyView(); } },
                    { check: true, label: 'Format Pane', get: function () { return prefs.pane; }, set: function (v) { prefs.pane = v; savePrefs(); applyView(); } },
                    { check: true, label: 'Floating Spheres', get: function () { return window.WriteoutSettings ? !window.WriteoutSettings.ambientHidden() : true; }, set: function (v) { if (window.WriteoutSettings) window.WriteoutSettings.setAmbientHidden(!v); } }
                ] }] },
                { label: 'Zoom', items: [
                    { big: true, icon: 'zoom', label: 'Zoom', menu: zoomMenu },
                    { big: true, glyph: '100', label: '100%', run: function () { setZoom(1); } },
                    { big: true, icon: 'web', label: 'Page\nWidth', run: fitWidth }
                ] },
                { label: 'Appearance', items: [
                    { big: true, icon: 'pageColor', label: 'Canvas\nTheme', menu: themeMenu },
                    { big: true, icon: 'layout', label: 'Layout', title: 'Word or Writeout Classic', menu: function () { return [{ label: 'Word', checked: true, icon: 'layout', run: function () { OS.setLayout('office'); } }, { label: 'Writeout Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }
                ] }
            ]
        },
        {
            id: 'help', label: 'Help', groups: [
                { label: 'Help', items: [
                    { big: true, icon: 'help', label: 'Help\nDeck', run: function () { if (typeof openHelpDeck === 'function') openHelpDeck(); } },
                    { big: true, icon: 'keyboard', label: 'Shortcuts', run: shortcuts }
                ] },
                { label: 'Extensions', items: [{ big: true, icon: 'store', label: 'Marketplace', run: function () { const b = document.getElementById('marketplace-trigger-btn'); if (b) b.click(); } }] }
            ]
        }
    ];

    function shortcuts() {
        const rows = [['⌘B / ⌘I / ⌘U', 'Bold, italic, underline'], ['⌘⇧E', 'Exit formatting'], ['⌘K', 'Search the ribbon'], ['⌘F', 'Find'], ['⌘Z / ⌘⇧Z', 'Undo / redo'], ['Esc', 'Leave Focus mode, close menus'], ['\\ + Space', 'Break out of a style to the right'], ['Double-click a ribbon tab', 'Collapse or expand the ribbon']];
        OS.dialog('Keyboard Shortcuts', '<table class="wo-wc">' + rows.map(function (r) { return '<tr><td><b>' + OS.esc(r[0]) + '</b></td><td>' + OS.esc(r[1]) + '</td></tr>'; }).join('') + '</table>');
    }

    /* ---------- Boot ---------- */
    OS.init({
        app: 'Writeout',
        officeName: 'Word',
        kind: 'word',
        key: 'writeout',
        icon: 'favicon-96.png',
        officeHint: 'A ribbon, a Navigation pane, real Pages and a status bar, like Microsoft Word!',
        classicHint: 'The original Writeout: glass sidebars, gel buttons and floating spheres!',
        theme: { accent: '#0284c7', 'accent-d': '#0369a1', 'accent-l': '#e0f2fe', title: '#0284c7', gel1: '#38bdf8', gel2: '#0284c7', 'gel-border': '#7dd3fc', 'gel-glow': 'rgba(2, 132, 199, 0.35)', glow: 'rgba(125, 211, 252, 0.9)', 'thumb-bg': '#0f172a' },
        editor: function () { return ed; },
        keepSelection: true,
        title: function () { const t = kdActiveTab(); return t ? t.name : 'Main'; },
        rename: function (name) { const t = kdActiveTab(); if (t) { t.name = name.substring(0, 60); kdSaveTabs(); kdRenderTabs(); } },
        qat: [
            { icon: 'save', title: 'Save a copy (.kd)', run: function () { download('kd'); OS.flashSaved('Saved!'); } },
            { icon: 'undo', title: 'Undo (⌘Z)', run: function () { try { if (window.kdBlockUndo) window.kdBlockUndo(); else document.execCommand('undo'); } catch (e) {} paginateSoon(); } },
            { icon: 'redo', title: 'Redo (⌘⇧Z)', run: function () { try { if (window.kdBlockRedo) window.kdBlockRedo(); else document.execCommand('redo'); } catch (e) {} paginateSoon(); } }
        ],
        tabs: tabs,
        backstage: backstage,
        settings: settingsExtra,
        status: function () {
            const s = stats();
            const goal = PRO().goalStatus ? PRO().goalStatus() : '';
            return ['Page <b>' + currentPage() + '</b> of <b>' + pageCount + '</b>'].concat(goal ? [goal] : []).concat([ '<b>' + s.words.toLocaleString() + '</b> word' + (s.words === 1 ? '' : 's'), '<b>' + s.chars.toLocaleString() + '</b> characters', OS.esc((kdActiveTab() || {}).name || '')]);
        },
        views: [
            { icon: 'focus', title: 'Focus', run: function () { setFocus(true); }, active: function () { return prefs.focus; } },
            { icon: 'pages', title: 'Pages (Print Layout)', run: function () { setPagesView(true); }, active: function () { return prefs.pages; } },
            { icon: 'web', title: 'Continuous (Web Layout)', run: function () { setPagesView(false); }, active: function () { return !prefs.pages; } }
        ],
        zoom: { get: function () { return prefs.zoom; }, set: setZoom, min: 50, max: 200 },
        searchExtra: function (q) {
            const out = [];
            try {
                kdTabs.forEach(function (t) { if (t.name.toLowerCase().indexOf(q) !== -1) out.push({ label: 'Go to page "' + t.name + '"', icon: 'page', where: 'Pages', it: { run: function () { kdActivateTab(t.id); } } }); });
            } catch (e) {}
            return out;
        },
        onLayout: function () { applyView(); }
    });

    // Classic Settings gets the layout cards too!
    const classicBody = document.querySelector('#settings-modal-overlay .dialog-body-scroll');
    if (classicBody) {
        const h = document.createElement('h4');
        h.textContent = 'Layout — Word or Writeout Classic';
        const cards = OS.layoutCards();
        cards.classList.add('wo-classic-cards');
        classicBody.insertBefore(cards, classicBody.firstChild);
        classicBody.insertBefore(h, cards);
        const sBtn = document.getElementById('settings-trigger-btn');
        if (sBtn) sBtn.addEventListener('click', OS.syncLayoutCards);
    }

    // Keep pages, status and ribbon state fresh!
    ed.addEventListener('input', paginateSoon);
    new MutationObserver(paginateSoon).observe(ed, { childList: true, subtree: true, characterData: true });
    new MutationObserver(function () { setTimeout(function () { captureSheetBg(); paginateSoon(); }, 30); }).observe(ed, { attributes: true, attributeFilter: ['class'] });
    ed.addEventListener('load', paginateSoon, true);
    window.addEventListener('resize', paginateSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paginateSoon);
    document.addEventListener('keydown', function (e) {
        if (!office()) return;
        if (e.key === 'Escape' && prefs.focus) { setFocus(false); return; }
        const mod = e.metaKey || e.ctrlKey;
        if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') { e.preventDefault(); findDialog(false); }
    });
    // Page tabs re-render the canvas: re-paginate after every switch!
    const tabsList = document.getElementById('doc-tabs-list');
    if (tabsList) tabsList.addEventListener('click', function () { setTimeout(paginateSoon, 30); });
    // Printing never carries the on-screen page-break spacing!
    window.addEventListener('beforeprint', function () { if (ruleStyle) ruleStyle.disabled = true; });
    window.addEventListener('afterprint', function () { if (ruleStyle) ruleStyle.disabled = false; paginateSoon(); });
    applyView();
    window.WriteoutWord = { paginate: paginate, applyView: applyView, prefs: prefs, pageCount: function () { return pageCount; } };
})();
