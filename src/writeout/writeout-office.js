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
    prefs.pane = false; // the Format sidebar is gone from this layout (Protect and Note Info still open their own panel)
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

    const MARGINS = {
        normal: { label: 'Normal', hint: '1" all around', t: 96, b: 96, s: 96 },
        narrow: { label: 'Narrow', hint: '0.5" all around', t: 48, b: 48, s: 48 },
        moderate: { label: 'Moderate', hint: '1" top/bottom, 0.75" sides', t: 96, b: 96, s: 72 },
        wide: { label: 'Wide', hint: '1" top/bottom, 2" sides', t: 96, b: 96, s: 192 },
        writeout: { label: 'Writeout', hint: 'The original snug 30px padding', t: 30, b: 30, s: 30 }
    };
    let GAP = 28, printing = false, previewing = false;   // printing and Print Preview lay the pages edge to edge, at their real size
    function printLayout() { return printing || previewing; }

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

    // underline, wavy underline and strikethrough each remember the color last picked from their arrow (null = the text's own color)
    const lastDeco = { u: null, w: null, s: null };
    function decoRun(kind) { if (MORE().decorate) MORE().decorate(kind, lastDeco[kind], true); else fmt(kind === 's' ? 'strikethrough' : 'underline'); }
    function decoPick(kind, c) { lastDeco[kind] = c || null; if (MORE().decorate) MORE().decorate(kind, c || ''); }
    function decoMenu(kind, title) {
        return [
            { header: title },
            { swatches: COLORS.map(function (c) { return { color: c, title: c, run: function () { decoPick(kind, c); } }; }) },
            { sep: true },
            { label: 'Automatic (the text color)', icon: 'reset', run: function () { decoPick(kind, null); } },
            { label: 'More Colors…', icon: 'palette', run: function () {
                const inp = document.createElement('input');
                inp.type = 'color'; inp.value = lastDeco[kind] || '#e11d48';
                inp.style.cssText = 'position:fixed;left:-40px;top:0;opacity:0';
                document.body.appendChild(inp);
                inp.addEventListener('change', function () { OS.restoreSelection(); decoPick(kind, inp.value); inp.remove(); });
                inp.addEventListener('blur', function () { setTimeout(function () { inp.remove(); }, 400); });
                inp.click();
            } }
        ];
    }

    function swatchMenu(title, list, applyFn, swCls) {
        return [
            { header: title },
            { cols: 5, cls: 'wo-sw-grid', swatches: list.map(function (s) { return { cls: swCls + ' ' + s.cls, html: 'Aa', title: s.label, run: function () { applyFn(s.cls); save(); } }; }) }
        ];
    }
    /* ---------- Gel Chips: the Bubble Chip's cousins. An icon grid of the styles; pick one to see its color variants
       (live previews), pick a color to apply it just like Gel Orbs and Gel Bubbles do! ---------- */
    const CHIP_SVG = function (inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>'; };
    const CHIP_FAMILIES = [
        { id: 'pill', name: 'Gloss Pill', icon: CHIP_SVG('<rect x="2.5" y="7.5" width="19" height="9" rx="4.5"/><path d="M7 10.8h6" stroke-width="2"/>') },
        { id: 'flag', name: 'Gel Flag', icon: CHIP_SVG('<path d="M3 6.5h18l-3.2 5.5 3.2 5.5H3z"/><path d="M6.5 10h6" stroke-width="2"/>') },
        { id: 'tab', name: 'Gel Tab', icon: CHIP_SVG('<path d="M3 18.5v-9a3.5 3.5 0 0 1 3.5-3.5h11A3.5 3.5 0 0 1 21 9.5v9z"/><path d="M7 10h6" stroke-width="2"/>') },
        { id: 'drop', name: 'Gel Drop', icon: CHIP_SVG('<rect x="3" y="6" width="18" height="12" rx="5"/><ellipse cx="16.8" cy="14.6" rx="2" ry="1" stroke-width="1.5"/>') },
        { id: 'split', name: 'Gel Split', icon: CHIP_SVG('<rect x="3" y="4.5" width="15" height="11" rx="3"/><path d="M6.5 19.5H21V9"/>') },
        { id: 'lens', name: 'Gel Lens', icon: CHIP_SVG('<rect x="3" y="6" width="18" height="12" rx="6"/><path d="M10 8L7.5 16M14.5 8L12 16" stroke-width="1.5"/>') },
        { id: 'speech', name: 'Speech Bubble', icon: CHIP_SVG('<path d="M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v6.5a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h-1A2.5 2.5 0 0 1 3 13.5V7a2.5 2.5 0 0 1 2.5-2.5z"/>') },
        { id: 'logo', name: 'Logo Chip', icon: CHIP_SVG('<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.2 9.5A4.2 4.2 0 0 1 12 7.4" stroke-width="2"/>') },
        { id: 'aero', name: 'Aero Chip', icon: CHIP_SVG('<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M5.5 10.5h13" stroke-width="1.4" opacity=".7"/>') }
    ];
    const CHIP_COLORS = [['red', 'Red'], ['orange', 'Orange'], ['gold', 'Gold'], ['yellow', 'Yellow'], ['lime', 'Lime'], ['green', 'Green'], ['turquoise', 'Turquoise'], ['teal', 'Teal'], ['cyan', 'Cyan'], ['blue', 'Blue'], ['purple', 'Purple'], ['pink', 'Pink'], ['white', 'White'], ['fog', 'Fog'], ['slate', 'Slate'], ['black', 'Black']];
    OS.icons.chips = '<rect x="2" y="3" width="13" height="8" rx="4"/><path d="M6 11v3.2l3.2-3.2"/><rect x="9" y="13.5" width="13" height="7" rx="3.5"/>';
    function chipsMenu() {
        const wrap = document.createElement('div');
        wrap.className = 'bb-chipmenu';
        // (keeps the text selection in the note while you click around in the menu)
        wrap.addEventListener('mousedown', function (e) { e.preventDefault(); });
        function head(text, back) {
            const h = document.createElement('div');
            h.className = 'bb-chipmenu-head';
            if (back) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'bb-chipmenu-back';
                b.textContent = '‹ Styles';
                b.addEventListener('click', function (e) { e.stopPropagation(); showFamilies(); });
                h.appendChild(b);
            }
            const t = document.createElement('span');
            t.textContent = text;
            h.appendChild(t);
            wrap.appendChild(h);
        }
        function showFamilies() {
            wrap.innerHTML = '';
            head('Gel Chips');
            const grid = document.createElement('div');
            grid.className = 'bb-chip-fams';
            CHIP_FAMILIES.forEach(function (f) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'bb-chip-fam';
                b.title = f.name;
                b.innerHTML = f.icon + '<span>' + f.name + '</span>';
                b.addEventListener('click', function (e) { e.stopPropagation(); showColors(f); }); // (the button is replaced during the click, so the shell must not see it as a click outside the menu)
                grid.appendChild(b);
            });
            wrap.appendChild(grid);
        }
        function showColors(f) {
            wrap.innerHTML = '';
            head(f.name, true);
            const grid = document.createElement('div');
            grid.className = 'bb-chip-cols';
            CHIP_COLORS.forEach(function (c) {
                const cls = 'gel-' + f.id + '-chip gel-' + f.id + '-' + c[0];
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'bb-chip-col';
                b.title = f.name + ' ' + c[1];
                // the real chip, so you see exactly what you get
                const chip = document.createElement('span');
                chip.className = cls;
                chip.textContent = 'Aa';
                chip.style.margin = '0';
                b.appendChild(chip);
                const nm = document.createElement('small');
                nm.textContent = c[1];
                b.appendChild(nm);
                b.addEventListener('click', function () {
                    OS.closeMenu();
                    if (typeof fmtApplyAqua === 'function') fmtApplyAqua(cls);
                    save();
                });
                grid.appendChild(b);
            });
            wrap.appendChild(grid);
        }
        showFamilies();
        return [{ node: wrap }];
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

    // New Page adds a real page: a page break, so the text after it starts on a fresh sheet (Ctrl/Cmd+Enter does the same)
    function newPage() {
        const line = typeof kdInsertPageBreak === 'function' ? kdInsertPageBreak() : null;
        save();
        paginateSoon();
        setTimeout(function () { paginate(); OS.sync(); try { if (line && line.scrollIntoView) line.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} OS.toast('Page ' + currentPage() + '!'); }, 60);
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
    // --- Keydown: Un-format shows every tag as plain text, so formatting mistakes are easy to spot;
    // Re-format formats the whole page again and checks it for tags that could not be formatted! ---
    function kdCanvas() { return document.getElementById('wysiwyg-canvas'); }
    function kdAfterChange() {
        try { if (typeof kdHydrateInteractions === 'function') kdHydrateInteractions(); } catch (e) {}
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
        try { if (typeof kdRenderOutline === 'function') kdRenderOutline(); } catch (e) {}
    }
    // Un-format, like Re-format, takes in every page tab (the others off-screen, saved back into their tabs)
    function eachOtherPage(fn) {
        let changed = 0, total = 0;
        if (typeof kdTabs === 'undefined' || !Array.isArray(kdTabs) || typeof kdActiveTab !== 'function') return { pages: 0, total: 0, problems: [] };
        const act = kdActiveTab(), problems = [];
        const box = document.createElement('div');
        box.setAttribute('contenteditable', 'false');
        box.setAttribute('aria-hidden', 'true');
        box.style.cssText = 'position:absolute;left:-100000px;top:0;width:800px;visibility:hidden;pointer-events:none';
        document.body.appendChild(box);
        try {
            kdTabs.forEach(function (t) {
                if (!t || t === act || !t.html) return;
                box.innerHTML = t.html;
                const r = fn(box, t);
                if (typeof r === 'number') total += r;
                else if (r && r.problems) r.problems.forEach(function (p) { problems.push({ tag: p.tag, line: p.line, page: t.name }); });
                if (box.innerHTML !== t.html) { t.html = box.innerHTML; changed++; }
            });
        } catch (e) {}
        box.remove();
        if (changed) { try { kdSaveTabs(); } catch (e) {} }
        try { if (typeof kdRenderTabs === 'function') kdRenderTabs(); } catch (e) {}
        return { pages: changed, total: total, problems: problems };
    }
    function unformatDoc() {
        if (!window.kdDoc || !kdCanvas()) return;
        const others = eachOtherPage(function (box) { return kdDoc.unformat(box); });
        const n = kdDoc.unformat(kdCanvas()) + others.total;
        kdAfterChange();
        const many = typeof kdTabs !== 'undefined' && Array.isArray(kdTabs) && kdTabs.length > 1;
        OS.toast(n ? 'Un-formatted ' + n + ' piece' + (n === 1 ? '' : 's') + (many ? ' on all ' + kdTabs.length + ' pages' : '') + '! Fix any mistakes, then press Re-format!' : 'There is no Keydown formatting ' + (many ? 'on any page' : 'on this page') + '!');
    }
    // Re-format formats EVERY page tab: the open one on screen, the others off-screen, saved back into their tabs!
    function reformatOtherPages() { return eachOtherPage(function (box) { return kdDoc.reformat(box); }); }
    function reformatDoc() {
        if (!window.kdDoc || !kdCanvas()) return;
        // the other pages first, so the red underlines that stay on screen belong to the open page
        const others = reformatOtherPages();
        const r = kdDoc.reformat(kdCanvas());
        kdAfterChange();
        const many = typeof kdTabs !== 'undefined' && Array.isArray(kdTabs) && kdTabs.length > 1;
        const here = (typeof kdActiveTab === 'function' && kdActiveTab()) ? kdActiveTab().name : 'this page';
        const all = r.problems.map(function (p) { return { tag: p.tag, line: p.line, page: here }; }).concat(others.problems);
        if (r.errors && r.errors.length) { OS.dialog('Re-format hit a problem', '<p class="os-dlg-text">Re-format formatted everything it could, but ' + r.errors.length + ' part' + (r.errors.length === 1 ? '' : 's') + ' of this page hit an error! Please send this to Claude:</p><pre class="os-dlg-text" style="white-space:pre-wrap;max-height:200px;overflow:auto;font-size:11px">' + OS.esc(r.errors.slice(0, 5).join('\n')) + '</pre>', [{ label: 'Got it!', primary: true, value: true }]); return; }
        if (r.skipped && r.skipped.length) { OS.dialog('Some text was left alone', '<p class="os-dlg-text">Re-format did not touch ' + r.skipped.length + ' piece' + (r.skipped.length === 1 ? '' : 's') + ' of text with Keydown in them, on purpose. Here is why (if that looks wrong, send this list to Claude!):</p><ul class="os-dlg-text" style="max-height:260px;overflow:auto;margin:0;padding-left:20px;font-size:12px">' + r.skipped.map(function (k) { return '<li><code>' + OS.esc(k.text) + '</code><br>because ' + OS.esc(k.why) + '</li>'; }).join('') + '</ul>', [{ label: 'Got it!', primary: true, value: true }]); return; }
        if (!all.length) { OS.toast(many ? 'Formatted all ' + kdTabs.length + ' pages, and every Keydown tag checks out!' : 'Formatted the whole page, and every Keydown tag checks out!'); return; }
        OS.dialog('Keydown check', '<p class="os-dlg-text">' + all.length + ' tag' + (all.length === 1 ? ' could' : 's could') + ' not be formatted!' + (r.problems.length ? ' The ones on this page are underlined in red.' : '') + ' A closing tag may be missing or mistyped:</p><ul class="os-dlg-text" style="max-height:260px;overflow:auto;margin:0;padding-left:20px">' +
            all.slice(0, 50).map(function (p) { return '<li>' + (many ? '<b>' + OS.esc(p.page) + ':</b> ' : '') + '<code>' + OS.esc(p.tag) + '</code> in “' + OS.esc(p.line) + '”</li>'; }).join('') + '</ul>', [{ label: 'Got it!', primary: true, value: true }]);
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
    function pagesOn() { return office() && (prefs.pages || printLayout()); }

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
        document.body.classList.toggle('wo-web', on && !pagesOn());
        document.body.classList.toggle('wo-preview', previewing);
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
        st.zoom = on ? String(printLayout() ? 1 : prefs.zoom) : '';
        st.setProperty('--wo-print-fs', getComputedStyle(ed).fontSize);
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
            pageList();
            return;
        }
        // measure the text on its own: the last page count's height must not hold the document open (or pages could never go away)
        zoomer.style.removeProperty('--wo-total-h');
        const d = pageDims();
        const m = MARGINS[prefs.margins] || MARGINS.normal;
        const H = d.h, P = d.h + GAP;
        const box = ed.getBoundingClientRect();
        const ratio = (box.height / (ed.offsetHeight || 1)) || 1;
        const top0 = box.top;
        let idx = 0, lastBottom = m.t, forceTop = null;   // forceTop: where the line after a page break must start
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
            if (forceTop !== null) {
                if (t < forceTop - 0.5) target = forceTop;                  // right after a page break: the top of the next page!
                forceTop = null;
            }
            if (target !== null) { /* decided by the page break above */ }
            else if (t > cBottom - 0.5) target = (p + 1) * P + m.t;          // starts in the bottom margin or the gap!
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
            // a page break: the next line starts on the page after the one this break sits on
            if (kid.classList && kid.classList.contains('kd-pagebreak')) forceTop = (Math.floor(((target !== null ? target : t) + 1) / P) + 1) * P + m.t;
        }
        // Bare text right inside the canvas still counts toward the height!
        const contentH = Math.max(lastBottom, (ed.scrollHeight || 0) - m.b - 2);
        pageCount = Math.max(1, Math.floor((contentH - 1) / P) + 1);
        const total = pageCount * P - GAP - (printLayout() ? 1 : 0);
        zoomer.style.setProperty('--wo-total-h', total + 'px');
        if (sheets.children.length !== pageCount || sheets._pitch !== P) {
            sheets._pitch = P;
            let html = '';
            for (let i = 0; i < pageCount; i++) html += '<div class="wo-sheet" style="top:' + (i * P) + 'px"><span class="wo-pnum">' + (i + 1) + '</span></div>';
            sheets.innerHTML = html;
            if (sheets._count && pageCount > sheets._count) {
                const last = sheets.lastElementChild;
                if (last) last.classList.add('wo-sheet-new');
            }
            sheets._count = pageCount;
        }
        applyPageNumbers();
        pageList();
    }

    /* ---------- the Pages list in the side pane: every page of the document, click to jump there ---------- */
    // Page number formats: ::pagenumbers{style|start} sets how the numbers look from the page it sits on (none for front matter, roman, letters, Greek)
    function pageLabel(fmt, n) {
        const up = /^upper-/.test(fmt), base = fmt.replace(/^upper-/, '');
        let s = '';
        if (base === 'none') return '';
        if (base === 'roman') {
            if (n < 1 || n > 3999) s = String(n);
            else { [['m', 1000], ['cm', 900], ['d', 500], ['cd', 400], ['c', 100], ['xc', 90], ['l', 50], ['xl', 40], ['x', 10], ['ix', 9], ['v', 5], ['iv', 4], ['i', 1]].forEach(function (r) { while (n >= r[1]) { s += r[0]; n -= r[1]; } }); }
        } else if (base === 'alpha' || base === 'greek') {
            const L = base === 'alpha' ? 'abcdefghijklmnopqrstuvwxyz' : 'αβγδεζηθικλμνξοπρστυφχψω';
            if (n < 1) s = String(n);
            else { while (n > 0) { n--; s = L.charAt(n % L.length) + s; n = Math.floor(n / L.length); } }
        } else s = String(n);
        return up ? s.toUpperCase() : s;
    }
    const PAGE_NUMBER_FORMATS = [['none', 'No page numbers (front matter)'], ['roman', 'Roman numerals (i, ii, iii)'], ['upper-roman', 'Roman numerals (I, II, III)'], ['alpha', 'Latin letters (a, b, c)'], ['upper-alpha', 'Latin letters (A, B, C)'], ['greek', 'Greek letters (α, β, γ)'], ['upper-greek', 'Greek letters (Α, Β, Γ)'], ['arabic', 'Numbers (1, 2, 3), starting again at 1']];
    function pageNumberMenu() {
        return PAGE_NUMBER_FORMATS.map(function (f) { return { label: f[1], run: function () { insertKind('pagenums:' + f[0]); if (f[0] !== 'none' && !prefs.numbers) { prefs.numbers = true; savePrefs(); applyView(); } paginateSoon(); OS.toast('Page numbers from this page: ' + f[1] + '!'); } }; });
    }
    function applyPageNumbers() {
        if (!sheets) return;
        const box = ed.getBoundingClientRect();
        const ratio = (box.height / (ed.offsetHeight || 1)) || 1;
        const P = pageDims().h + GAP;
        const marks = [];
        Array.from(ed.querySelectorAll('.kd-pagenums')).forEach(function (el) {
            const r = el.getBoundingClientRect();
            marks.push({ page: Math.max(0, Math.floor(((r.top - box.top) / ratio) / P)), fmt: el.getAttribute('data-fmt') || 'arabic', start: parseInt(el.getAttribute('data-start'), 10) || 1 });
        });
        marks.sort(function (a, b) { return a.page - b.page; });
        Array.from(sheets.children).forEach(function (sh, p) {
            let cur = { page: 0, fmt: 'arabic', start: 1 };
            marks.forEach(function (m) { if (m.page <= p) cur = m; });
            const span = sh.querySelector('.wo-pnum');
            if (span) span.textContent = pageLabel(cur.fmt, cur.start + (p - cur.page));
        });
    }
    function pageList() {
        const list = document.getElementById('doc-pages-list');
        if (!list) return;
        const breaks = ed.querySelectorAll('.kd-pagebreak').length;
        const n = pagesOn() ? Math.max(pageCount, breaks + 1) : breaks + 1;
        // the page the caret is on: by the sheet it sits on, or (without sheets) by the page breaks above it
        let here = 1;
        if (pagesOn()) here = currentPage();
        else {
            const s = window.getSelection();
            if (s && s.rangeCount && ed.contains(s.anchorNode)) {
                let top = s.anchorNode;
                while (top && top.parentNode !== ed) top = top.parentNode;
                for (let k = top && top.previousElementSibling; k; k = k.previousElementSibling) if (k.classList.contains('kd-pagebreak')) here++;
            }
        }
        here = Math.min(here, n);
        const key = n + ':' + here;
        if (list._key === key) return;
        list._key = key;
        list.innerHTML = '';
        for (let i = 1; i <= n; i++) {
            const row = document.createElement('div');
            row.className = 'tab-row';
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'outline-item' + (i === here ? ' active' : '');
            b.textContent = 'Page ' + i;
            b.title = 'Go to page ' + i;
            b.addEventListener('click', function () { goToPage(i); });
            row.appendChild(b);
            list.appendChild(row);
        }
        // a document with only its first tab has nothing to switch between: the Tabs list stays out of the way
        document.body.classList.toggle('wo-one-tab', document.querySelectorAll('#doc-tabs-list .tab-row').length <= 1);
    }
    function goToPage(i) {
        if (pagesOn() && sheets && sheets.children[i - 1]) { sheets.children[i - 1].scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
        const brs = ed.querySelectorAll('.kd-pagebreak');
        const target = i <= 1 ? ed.firstElementChild : (brs[i - 2] && brs[i - 2].nextElementSibling);
        if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
    const PLUS = function () { return window.WriteoutPlus || {}; };
    const MORE = function () { return window.WriteoutMore || {}; };
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
        // the formatting part of the sidebar is gone; only Protect ('doc') and Note Info ('main') still open the panel
        if (group === 'doc' || group === 'main') {
            prefs.pane = !(prefs.pane && prefs.paneGroup === group);
            prefs.paneGroup = group;
            try { if (typeof fmtSetGroup === 'function') fmtSetGroup(group); } catch (e) {}
        } else prefs.pane = false;
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
                    { label: 'New page', hint: 'Add a page to this document: the text after it starts on a fresh sheet!', icon: 'newDoc', run: newPage },
                    { label: 'Open a .kd file', hint: 'Import a Writeout document!', icon: 'folder', run: openFile }
                ]));
                // every saved document lives right here on Home (rename, copy, delete, switch), like Bitbook!
                if (window.RadiiDocs && RadiiDocs.mount) {
                    b.insertAdjacentHTML('beforeend', '<h2>Your documents</h2>');
                    const box = document.createElement('div');
                    box.className = 'rd-embed';
                    b.appendChild(box);
                    RadiiDocs.mount(box);
                } else b.insertAdjacentHTML('beforeend', '<h2>This document</h2><div class="wo-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + OS.esc((kdActiveTab() || {}).name || 'Main') + '</b><span>' + OS.esc(statsLine()) + '</span></div></div>');
            }
        },
        { id: 'new', label: 'New', icon: 'newDoc', render: function (b) { b.innerHTML = '<h1>New</h1>'; b.appendChild(OS.bsCards([{ label: 'Blank document', hint: 'Clears every page!', preview: '<div class="os-card-prev wo-prev-blank"></div>', run: newDocument }, { label: 'New page', hint: 'A fresh page after this one, keeping the rest!', icon: 'newDoc', run: newPage }])); } },
        { id: 'open', label: 'Open', icon: 'folder', render: function (b) { b.innerHTML = '<h1>Open</h1>'; b.appendChild(OS.bsCards([{ label: 'Browse…', hint: 'Open a .kd Writeout document!', icon: 'folder', run: openFile }])); b.insertAdjacentHTML('beforeend', '<p class="os-note">Your work also saves automatically in this browser!</p>'); } },
        { id: 'save', label: 'Save a Copy', icon: 'save', render: function (b) { b.innerHTML = '<h1>Save a Copy</h1>'; b.appendChild(OS.bsCards(DL.slice(0, 2).map(function (d) { return { label: d[1], hint: d[2], icon: d[3], run: function () { download(d[0]); } }; }))); } },
        { id: 'export', label: 'Export', icon: 'export', render: function (b) { b.innerHTML = '<h1>Export</h1>'; b.appendChild(OS.bsCards(DL.map(function (d) { return { label: d[1], hint: d[2], icon: d[3], run: function () { download(d[0]); } }; }))); } },
        { id: 'print', label: 'Print', icon: 'print', action: function () { if (typeof printWriteoutPage === 'function') printWriteoutPage(); } },
        {
            id: 'info', label: 'Info', icon: 'info', render: function (b) {
                const s = stats();
                b.innerHTML = '<h1>Info</h1><table class="wo-wc big"><tr><td>Pages</td><td><b>' + pageCount + '</b></td></tr><tr><td>Words</td><td><b>' + s.words.toLocaleString() + '</b></td></tr><tr><td>Characters</td><td><b>' + s.chars.toLocaleString() + '</b></td></tr><tr><td>Paragraphs</td><td><b>' + s.paras + '</b></td></tr><tr><td>Protected</td><td><b>' + (kdDocPasswordHash ? 'Yes!' : 'No') + '</b></td></tr></table>';
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
            o2.appendChild(OS.optRow('Pre-made templates in search', 'Search temp:name in the command search (\u2318K) can also find the built-in templates, not just your own!', function () { return !!(window.WriteoutTemplates && window.WriteoutTemplates.premadeInSearch()); }, function (v) { if (window.WriteoutTemplates) window.WriteoutTemplates.setPremadeInSearch(v); }));
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
                        { glyph: 'U', glyphCls: 'u', title: 'Underline (the arrow picks a color: Keydown [R]__text__)', kbd: '⌘U', run: function () { decoRun('u'); }, menu: function () { return decoMenu('u', 'Underline Color'); }, bar: function () { return lastDeco.u; }, checked: function () { return inTag('u:not(.kd-wavy)'); } },
                        { glyph: 'U', glyphCls: 'uw', title: 'Wavy Underline (the arrow picks a color: Keydown ~_text_~ or [R]~_text_~)', run: function () { decoRun('w'); }, menu: function () { return decoMenu('w', 'Wavy Underline Color'); }, bar: function () { return lastDeco.w; }, checked: function () { return inTag('u.kd-wavy'); } },
                        { glyph: 'ab', glyphCls: 's', title: 'Strikethrough (the arrow picks a color: Keydown -_text_- or [R]-_text_-)', run: function () { decoRun('s'); }, menu: function () { return decoMenu('s', 'Strikethrough Color'); }, bar: function () { return lastDeco.s; }, checked: function () { return inTag('s, strike, del'); } },
                        { icon: 'code', title: 'Inline Code (works at the caret too)', run: function () { if (MORE().code) MORE().code(); else inlineCode(); }, checked: function () { return inTag('code'); } },
                        { icon: 'smallCaps', title: 'Small Caps (Keydown {sc}text{/sc})', run: function () { if (MORE().emphasis) MORE().emphasis('sc'); }, checked: function () { return MORE().emphasisActive ? MORE().emphasisActive('sc') : false; } },
                        { icon: 'superscript', title: 'Superscript', run: function () { if (MORE().script) MORE().script('superscript'); }, checked: function () { return inTag('sup'); } },
                        { icon: 'subscript', title: 'Subscript', run: function () { if (MORE().script) MORE().script('subscript'); }, checked: function () { return inTag('sub'); } },
                        { icon: 'emphasisDots', title: 'Emphasis Dots (Keydown {dots}text{/dots})', run: function () { if (MORE().emphasis) MORE().emphasis('dots'); }, checked: function () { return MORE().emphasisActive ? MORE().emphasisActive('dots') : false; } },
                        { icon: 'dim', title: 'Dim: half strength, like a terminal (Keydown {dim}text{/dim})', run: function () { if (MORE().emphasis) MORE().emphasis('dim'); }, checked: function () { return MORE().emphasisActive ? MORE().emphasisActive('dim') : false; } },
                        { icon: 'tooltipUnderline', title: 'Tooltip Underline: a colored underline that shows a note when you point at the words (Keydown {tip red dashed|note}words{/tip})', run: function () { if (MORE().tooltipDialog) MORE().tooltipDialog(); }, checked: function () { return inTag('.kdx-tipu'); } },
                        { sep: true },
                        { icon: 'fontColor', title: 'Font Color', bar: function () { return lastColor; }, run: function () { applyColor(lastColor); }, menu: colorMenu },
                        { icon: 'orb', title: 'Gel Orbs', menu: function () { return swatchMenu('Gel Orbs', chips, fmtApplyChip, 'cp-swatch'); } },
                        { icon: 'bubble', title: 'Gel Bubbles', menu: function () { return swatchMenu('Gel Bubbles', aqua, fmtApplyAqua, 'aq-swatch'); } },
                        { icon: 'chips', title: 'Gel Chips: the Bubble Chip cousins (pills, flags, tabs, drops, splits, lenses, speech bubbles, logo and Aero chips)', menu: chipsMenu }
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
                    { big: true, icon: 'sparkle', label: 'Keydown\nStyles', title: 'Every Keydown style, by category: pick one to style the selection!', menu: function (b) { return window.kdDoc ? kdDoc.styleMenu(OS, b, null) : null; } }
                ] },
                { label: 'Editing', items: [{ stack: [
                    { sm: true, icon: 'search', label: 'Find', kbd: '⌘F', run: function () { findDialog(false); } },
                    { sm: true, icon: 'reset', label: 'Replace', run: function () { findDialog(true); } }
                ] }] },
                { label: 'More', items: [
                    { big: true, icon: 'marginMarks', label: 'Margin\nMarks', title: 'Bars, badges and labels in the page margin: change bars in flat, gel, aero, neon, candy or double looks, stars, flags, notes...', run: function () { if (MORE().marksDialog) MORE().marksDialog(); } },
                    { stack: [
                        { sm: true, icon: 'arrowUp', label: 'Sort A to Z', title: 'Sort the selected paragraphs or list items!', run: function () { if (MORE().sortLines) MORE().sortLines(false); } },
                        { sm: true, icon: 'arrowDown', label: 'Sort Z to A', title: 'Sort the selected paragraphs or list items backwards!', run: function () { if (MORE().sortLines) MORE().sortLines(true); } }
                    ] }
                ] }
            ]
        },
        {
            id: 'insert', label: 'Insert', groups: [
                { label: 'Pages', items: [
                    { big: true, icon: 'newDoc', label: 'New\nPage', title: 'Add a page to this document (Ctrl/Cmd+Enter): the text after it starts on a fresh sheet!', run: newPage },
                    { stack: [
                        { sm: true, icon: 'divider', label: 'Divider', title: 'Insert a divider line: pick a style!', menu: function () { return KD_DIVIDER_STYLES.map(function (d) { return { label: d[1], icon: 'divider', run: function () { insertKind('divider:' + d[0]); paginateSoon(); } }; }); } },
                        { sm: true, cls: 'os-dim', icon: 'table', label: 'Blank Space', title: 'Leave empty room to write in, for practice sheets: pick a style!', menu: function () { return [['box', 'Box'], ['dashed', 'Dashed box'], ['lines', 'Ruled lines'], ['grid', 'Grid'], ['dots', 'Dot grid']].map(function (d) { return { label: d[1], icon: 'table', run: function () { insertKind('blank:' + d[0]); paginateSoon(); } }; }); } }
                    ] }
                ] },
                { label: 'Illustrations', items: [
                    { big: true, icon: 'table', label: 'Table', title: 'Insert a table, or bring one in from Imbuer!', run: function () { insertKind('table'); } },
                    { big: true, icon: 'image', label: 'Picture', run: function () { insertKind('image'); } },
                    { stack: [
                        { sm: true, cls: 'os-dim', icon: 'search', label: 'OpenDB Images', title: 'Pick a free CC0 picture from OpenDB!', run: function () { window.openOnlinePictures(); } },
                        { sm: true, cls: 'os-dim', icon: 'shapes', label: 'draw.io', title: 'Draw a diagram in draw.io! (Double-click a diagram later to edit it)', run: function () { if (window.openDrawioDiagram) window.openDrawioDiagram(); } },
                        { sm: true, cls: 'os-dim', icon: 'pen', label: 'Inkpath', title: 'Add an Inkpath drawing (.kv file)!', run: function () { if (window.insertInkpathDrawing) window.insertInkpathDrawing(); } }
                    ] },
                    { stack: [
                        { sm: true, cls: 'os-dim', icon: 'cube', label: '3D Scene', title: 'Build a 3D scene in Zonerider and put it here! (Double-click it later to keep editing)', run: function () { if (window.insertZoneriderScene) window.insertZoneriderScene(); } },
                        { sm: true, cls: 'os-dim', icon: 'bringFront', label: 'Image on Top', title: 'Add image on top of document (from your computer or OpenDB)', menu: function () { return [{ label: 'Picture from your computer...', icon: 'image', run: function () { if (window.DocOverlay) window.DocOverlay.pickFile(); } }, { label: 'OpenDB image...', icon: 'search', run: function () { if (window.DocOverlay) window.DocOverlay.pickOpenDB(); } }]; } },
                        { sm: true, cls: 'os-dim', icon: 'attach', label: 'File', run: function () { insertKind('file'); } }
                    ] }
                ] },
                { label: 'Links', items: [
                    { big: true, icon: 'link', label: 'Link', run: insertLink },
                    { stack: [
                        { sm: true, cls: 'os-dim', icon: 'pages', label: 'Bookmark', title: 'Name a place in the document!', run: function () { if (PLUS().bookmark) PLUS().bookmark(); } }
                    ] }
                ] },
                { label: 'Header & Footer', items: [
                    { big: true, icon: 'pages', label: 'Header &\nFooter', title: 'Text and page numbers at the top and bottom of every page!', run: function () { if (PLUS().headerFooter) PLUS().headerFooter(); } },
                    { stack: [
                        { sm: true, cls: 'os-dim', icon: 'font', label: 'Drop Cap', title: 'A big first letter!', menu: function () { return PLUS().dropCapMenu ? PLUS().dropCapMenu() : []; } }
                    ] }
                ] },
                { label: 'Symbols', items: [
                    { big: true, icon: 'symbol', label: 'Symbols', title: 'Arrows, math, Greek, currency and more!', run: function () { if (MORE().symbols) MORE().symbols(); } },
                    { stack: [
                        { sm: true, cls: 'os-dim', icon: 'notes', label: 'Quick Parts', title: 'Save a piece of text and drop it back in whenever you like!', menu: function () { return MORE().quickPartsMenu ? MORE().quickPartsMenu() : []; } },
                        { sm: true, cls: 'os-dim', icon: 'lines', label: 'Lorem Ipsum', title: 'Filler paragraphs!', menu: function () { return MORE().loremMenu ? MORE().loremMenu() : []; } }
                    ] }
                ] },
                { label: 'Captions', items: [
                    { big: true, icon: 'tag', label: 'Insert\nCaption', title: 'Figure 1, Table 2... numbered for you!', menu: function () { return MORE().captionMenu ? MORE().captionMenu() : []; } },
                    { stack: [
                        { sm: true, cls: 'os-dim', icon: 'lines', label: 'Table of Figures', title: 'A clickable list of every caption!', menu: function () { return MORE().tofMenu ? MORE().tofMenu() : []; } }
                    ] }
                ] },
                { label: 'Templates', items: [
                    { big: true, icon: 'templates', label: 'Templates', title: 'Snippets of Keydown you can save and paste: meeting notes, planners, letters and your own!', run: function () { if (window.WriteoutTemplates) window.WriteoutTemplates.manager(); }, menu: function () { return window.WriteoutTemplates ? window.WriteoutTemplates.menu() : []; } }
                ] },
                { label: 'Math & Emoji', items: [
                    { big: true, icon: 'sigma', label: 'Equation', title: 'Insert LaTeX math! (Or type $x^2$ then Space, or $$...$$ then Space)', run: function () { if (window.kdMathInsert) window.kdMathInsert(true); }, menu: function () { return [{ label: 'Equation (centered)', icon: 'sigma', run: function () { window.kdMathInsert(true); } }, { label: 'Inline math', icon: 'sigma', run: function () { window.kdMathInsert(false); } }]; } },
                    { stack: [
                        { sm: true, cls: 'os-dim', icon: 'sparkle', label: 'Custom Emoji', title: 'Draw your own emoji or symbol on a square canvas and put it in your text!', run: function () { if (window.KdEmoji) window.KdEmoji.insert(); } }
                    ] }
                ] },
                { label: 'Text', items: [{ stack: [
                    { sm: true, cls: 'os-dim', icon: 'calendar', label: 'Date', run: function () { insertKind('date'); } },
                    { sm: true, cls: 'os-dim', icon: 'clock', label: 'Timestamp', run: function () { insertKind('timestamp'); } },
                    { sm: true, cls: 'os-dim', icon: 'code', label: 'Code Block', run: function () { setBlock('code'); } }
                ] }] },
                { label: 'Lists', items: [
                    { big: true, icon: 'bullets', label: 'Bulleted\nList', run: function () { list(false); } },
                    { big: true, icon: 'numbers', label: 'Numbered\nList', run: function () { list(true); } }
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
                    { big: true, icon: 'print', label: 'Print\nPreview', title: 'See the pages at the real size they will print: Letter paper, 100%, with every page margin!', run: function () { setPreview(!previewing); }, checked: function () { return previewing; } },
                    { big: true, icon: 'web', label: 'Color\nPreview', title: 'See the pages in black and white, or as people with color blindness see them!', menu: colorPreviewMenu },
                    { big: true, icon: 'pages', label: 'Page Number\nFormat', title: 'Front matter with no numbers, Roman numerals, letters or Greek letters: the numbers change from the page where you place it!', menu: pageNumberMenu },
                    { stack: [
                        { check: true, label: 'Page Numbers', get: function () { return prefs.numbers; }, set: function (v) { prefs.numbers = v; savePrefs(); applyView(); } }
                    ] }
                ] },
                { label: 'Page Background', items: [
                    { big: true, icon: 'background', label: 'Watermark', menu: function () { return PLUS().watermarkMenu ? PLUS().watermarkMenu() : []; } },
                    { big: true, icon: 'margins', label: 'Page\nBorder', menu: function () { return PLUS().borderMenu ? PLUS().borderMenu() : []; } }
                ] },
                { label: 'Spacing', items: [{ big: true, icon: 'indent', label: 'Line\nSpacing', menu: function () { return PLUS().lineSpacingMenu ? PLUS().lineSpacingMenu() : []; } }] },
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
                { label: 'Cross-references', items: [
                    { big: true, icon: 'link', label: 'Cross-\nreference', title: 'Link to a heading or bookmark, by its text or page number!', run: function () { if (PLUS().crossRef) PLUS().crossRef(); } },
                    { stack: [{ sm: true, icon: 'reset', label: 'Update Refs', run: function () { if (PLUS().updateXrefs) { const n = PLUS().updateXrefs(); OS.toast(n ? n + ' updated!' : 'All up to date!'); } } }] }
                ] },
                { label: 'Citations', items: [
                    { big: true, icon: 'notes', label: 'Insert\nCitation', menu: function () { return PLUS().citeMenu ? PLUS().citeMenu() : []; } },
                    { big: true, icon: 'folder', label: 'Sources', run: function () { if (PLUS().sources) PLUS().sources(); } },
                    { big: true, icon: 'bullets', label: 'Bibliography', title: 'APA, MLA or Chicago, built from the sources you cited!', run: function () { if (PLUS().bibliography) PLUS().bibliography(); } }
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
                    { big: true, icon: 'search', label: 'Find &\nReplace', run: function () { findDialog(true); } },
                    { stack: [{ check: true, label: 'AutoCorrect', get: function () { return MORE().autoCorrect ? MORE().autoCorrect() : false; }, set: function (v) { if (MORE().setAutoCorrect) MORE().setAutoCorrect(v); } }] }
                ] },
                { label: 'Comments', items: [
                    { big: true, icon: 'annotate', label: 'New\nComment', title: 'Pin a note to the selected text!', run: function () { if (PLUS().newComment) PLUS().newComment(); } },
                    { stack: [{ check: true, label: 'Show Comments', get: function () { return PLUS().commentsOn ? PLUS().commentsOn() : false; }, set: function (v) { if (PLUS().showComments) PLUS().showComments(v); } }] }
                ] },
                { label: 'Tracking', items: [
                    { big: true, icon: 'pen', label: 'Track\nChanges', title: 'Mark every insertion and deletion so you can accept or reject it!', run: function () { if (PLUS().setTracking) PLUS().setTracking(!PLUS().tracking()); }, checked: function () { return PLUS().tracking ? PLUS().tracking() : false; } },
                    { stack: [
                        { sm: true, icon: 'check', label: 'Accept All', run: function () { if (PLUS().acceptAll) PLUS().acceptAll(); } },
                        { sm: true, icon: 'x', label: 'Reject All', run: function () { if (PLUS().rejectAll) PLUS().rejectAll(); } },
                        { sm: true, icon: 'search', label: 'Next Change', run: function () { if (PLUS().nextChange) PLUS().nextChange(); } }
                    ] },
                    { big: true, icon: 'web', label: 'Markup', menu: function () { return [{ label: 'All Markup', run: function () { PLUS().showMarkup('all'); } }, { label: 'Simple (hide deletions)', run: function () { PLUS().showMarkup('simple'); } }, { label: 'No Markup', run: function () { PLUS().showMarkup('none'); } }]; } }
                ] },
                { label: 'Speech', items: [{ big: true, icon: 'play', label: 'Read\nAloud', title: 'Hear your document, sentence by sentence!', run: function () { if (PLUS().reading && PLUS().reading()) PLUS().stopRead(); else if (PLUS().readAloud) PLUS().readAloud(); } }] },
                { label: 'Keydown', items: [
                    { big: true, icon: 'code', label: 'Un-\nformat', title: 'Show every Keydown tag as plain text, so formatting mistakes are easy to spot!', run: unformatDoc },
                    { big: true, icon: 'check', label: 'Re-\nformat', title: 'Format the whole page again and check it for tags that could not be formatted!', run: reformatDoc }
                ] },
                { label: 'Annotator', items: [
                    { big: true, icon: 'annotate', label: 'Annotator', title: 'A pen tray: pick a pen and a color, then select text to mark it! Notes and a list of every mark too!', run: function () { if (window.WriteoutAnnotator) window.WriteoutAnnotator.toggle(); }, checked: function () { return !!(window.WriteoutAnnotator && window.WriteoutAnnotator.isOn()); } },
                    { big: true, icon: 'brush', label: 'Ink\nDrawing', title: 'Draw right on the page with the Annotate inks (Gel, Felt Pen, Highlighter, Neon, Crayon and the Theme Packs) in 13 colors!', run: function () { if (window.AnnotateInk) window.AnnotateInk.start(); else OS.toast('The Annotate inks did not load!'); } },
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
                { label: 'Editing', items: [
                    { big: true, icon: 'eye', label: 'View', title: 'Read the page, fully formatted (no editing)!', run: function () { if (window.KdModes) KdModes.set('view'); }, checked: function () { return !!window.KdModes && KdModes.get() === 'view'; } },
                    { big: true, icon: 'pen', label: 'Visual', title: 'Edit the formatted page!', run: function () { if (window.KdModes) KdModes.set('visual'); }, checked: function () { return !window.KdModes || KdModes.get() === 'visual'; } },
                    { big: true, icon: 'code', label: 'Source', title: 'Edit the page as Keydown text! Going back formats all of it!', run: function () { if (window.KdModes) KdModes.set('source'); }, checked: function () { return !!window.KdModes && KdModes.get() === 'source'; } },
                    { big: true, icon: 'codeTheme', label: 'Code\nTheme', title: 'Colors for Source mode and the Templates window: Monokai, Poolside or Poolside Light!', menu: function () { return window.KdModes && KdModes.themes ? KdModes.themes.map(function (t) { return { label: t[1], icon: 'codeTheme', checked: KdModes.codeTheme() === t[0], run: function () { KdModes.setCodeTheme(t[0]); } }; }) : []; } }
                ] },
                { label: 'Views', items: [
                    { big: true, icon: 'pages', label: 'Pages', title: 'Print Layout: separate pages!', run: function () { setPagesView(true); }, checked: function () { return prefs.pages; } },
                    { big: true, icon: 'web', label: 'Continuous', title: 'One long page, like Word\'s Web Layout!', run: function () { setPagesView(false); }, checked: function () { return !prefs.pages; } },
                    { big: true, icon: 'focus', label: 'Focus', title: 'Hide everything but the page (Esc to exit)!', run: function () { setFocus(true); } }
                ] },
                { label: 'Show', items: [{ stack: [
                    { check: true, label: 'Navigation Pane', get: function () { return prefs.nav; }, set: function (v) { prefs.nav = v; savePrefs(); applyView(); } },
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

    /* ---------- Phone mode: the Navigation pane is a drawer that starts closed ---------- */
    // (tapping outside it, or picking something in it, closes it again; the ribbon's toggle opens it)
    function phoneDrawer() {
        if (!OS.isPhone() || !prefs.nav) return;
        prefs.nav = false;
        applyView();
    }
    document.addEventListener('click', function (e) {
        if (!OS.isPhone() || !prefs.nav || !office()) return;
        const side = document.getElementById('sidebar');
        if (!side || e.target.closest('#os-top, #os-status, .os-menu, .os-dlg')) return;
        if (side.contains(e.target) && !e.target.closest('button, a, li, [data-page], [data-note], .page-item, .note-item')) return;
        prefs.nav = false;
        applyView();
        OS.sync();
    }, true);

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
            { icon: 'navPane', title: 'Navigation Pane', run: function () { prefs.nav = !prefs.nav; savePrefs(); applyView(); }, active: function () { return prefs.nav; } },
            { icon: 'focus', title: 'Focus', run: function () { setFocus(true); }, active: function () { return prefs.focus; } },
            { icon: 'pages', title: 'Pages (Print Layout)', run: function () { setPagesView(true); }, active: function () { return prefs.pages; } },
            { icon: 'web', title: 'Continuous (Web Layout)', run: function () { setPagesView(false); }, active: function () { return !prefs.pages; } }
        ],
        zoom: { get: function () { return prefs.zoom; }, set: setZoom, min: 50, max: 200 },
        searchExtra: function (q) {
            if (/^temp:/.test(q)) return window.WriteoutTemplates ? window.WriteoutTemplates.searchHits(q.slice(5)) : [];
            const out = [];
            try {
                kdTabs.forEach(function (t) { if (t.name.toLowerCase().indexOf(q) !== -1) out.push({ label: 'Go to page "' + t.name + '"', icon: 'page', where: 'Pages', it: { run: function () { kdActivateTab(t.id); } } }); });
            } catch (e) {}
            return out;
        },
        onLayout: function () { applyView(); }
    });
    phoneDrawer();

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
    const pagesAdd = document.getElementById('pages-add-btn');
    if (pagesAdd) pagesAdd.addEventListener('click', function () { newPage(); });
    document.addEventListener('selectionchange', function () { if (ed.contains((window.getSelection() || {}).anchorNode || null)) pageList(); });
    // Page tabs re-render the canvas: re-paginate after every switch!
    const tabsList = document.getElementById('doc-tabs-list');
    if (tabsList) tabsList.addEventListener('click', function () { setTimeout(paginateSoon, 30); });
    // Printing: the page itself has no margin (so the browser prints no date, title or address in the corners), and the Page Layout
    // margins are padding that repeats on EVERY printed page (box-decoration-break: clone); the text flows from page to page by itself
    // and the on-screen page-break spacing is switched off while printing!
    // Firefox prints a tiled SVG background (the wavy, dashed, zigzag, scallop and arrows dividers) as tiny 72 dpi pictures. While printing in Firefox
    // each tile is drawn as repeated copies of its own vector shapes in an inline SVG instead (sharp at any printer resolution), then put back
    let printTiles = [];
    function printTilesOn() {
        printTilesOff();
        if (!/Firefox\//.test(navigator.userAgent)) return;
        Array.from(ed.querySelectorAll('.kd-div-line, .aero-liquid-divider')).forEach(function (el, n) {
            if (el.classList.contains('kd-rasted')) return;   // (already drawn as a high-resolution picture)
            const cs = getComputedStyle(el);
            const m = /^url\("data:image\/svg\+xml[;,]([^"]*)"\)$/.exec((cs.backgroundImage || '').trim());
            if (!m) return;
            let svg;
            try { svg = decodeURIComponent(m[1].replace(/^charset=utf-8,/i, '')); } catch (e) { return; }
            const root = /<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i.exec(svg);
            if (!root) return;
            const attr = function (name) { const a = new RegExp('\\b' + name + "=['\"]([^'\"]*)['\"]").exec(root[1]); return a ? a[1] : ''; };
            let tw = parseFloat(attr('width')), th = parseFloat(attr('height'));
            const vb = attr('viewBox').split(/[\s,]+/).map(parseFloat);
            if (!(tw > 0)) tw = vb[2];
            if (!(th > 0)) th = vb[3];
            const sz = (cs.backgroundSize || '').split(' ').map(parseFloat);
            if (sz[0] > 0 && !/%/.test(cs.backgroundSize)) { th = sz[1] > 0 ? sz[1] : th * sz[0] / tw; tw = sz[0]; }
            if (!(tw > 0 && th > 0)) return;
            const W = el.clientWidth, H = el.clientHeight;
            if (!W || !H) return;
            const px = function (v, room) { v = String(v || '0'); return /%$/.test(v) ? (parseFloat(v) / 100) * room : parseFloat(v) || 0; };
            const rep = cs.backgroundRepeat || 'repeat';
            const x0 = px(cs.backgroundPositionX, W - tw), y0 = px(cs.backgroundPositionY, H - th);
            const repX = !/^no-repeat|^repeat-y/.test(rep), repY = !/^no-repeat|^repeat-x/.test(rep);
            const nx = repX ? Math.ceil(W / tw) + 1 : 1, ny = repY ? Math.ceil(H / th) + 1 : 1;
            const id = 'kdtile' + n;
            const inner = vb.length === 4 && vb[2] > 0 ? '<svg x="0" y="0" width="' + tw + '" height="' + th + '" viewBox="' + vb.join(' ') + '">' + root[2] + '</svg>' : root[2];
            let uses = '';
            for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
                const ux = (repX ? (x0 % tw - (x0 % tw > 0 ? tw : 0)) : x0) + i * tw, uy = (repY ? (y0 % th - (y0 % th > 0 ? th : 0)) : y0) + j * th;
                uses += '<use href="#' + id + '" x="' + ux + '" y="' + uy + '"/>';
            }
            const holder = document.createElement('span');
            holder.className = 'kd-print-svg';
            holder.setAttribute('aria-hidden', 'true');
            holder.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none;display:block;overflow:hidden';
            holder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><defs><g id="' + id + '">' + inner + '</g></defs>' + uses + '</svg>';
            printTiles.push({ el: el, holder: holder, bg: el.style.backgroundImage, pos: el.style.position });
            if (cs.position === 'static') el.style.position = 'relative';
            el.insertBefore(holder, el.firstChild);
            el.style.backgroundImage = 'none';
        });
    }
    function printTilesOff() {
        printTiles.forEach(function (r) { r.holder.remove(); r.el.style.backgroundImage = r.bg; r.el.style.position = r.pos; });
        printTiles = [];
    }
    function printPageSize(on) {
        let st = document.getElementById('wo-print-page');
        if (!st) { st = document.createElement('style'); st.id = 'wo-print-page'; document.head.appendChild(st); }
        const d = pageDims(), m = MARGINS[prefs.margins] || MARGINS.normal;
        st.textContent = on ? '@media print { @page { size: ' + d.w + 'px ' + d.h + 'px; margin: 0; } }' : '';
    }
    // Firefox: the chips and divider lines are drawn ahead of time as high-resolution pictures (print-raster.js), a moment after the page changes
    (function () {
        if (!window.KdPrintRaster || !KdPrintRaster.active) return;
        let t = 0;
        const go = function () { clearTimeout(t); t = setTimeout(function () { try { KdPrintRaster.prepare(ed); } catch (e) {} }, 1200); };
        new MutationObserver(go).observe(ed, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
        setTimeout(go, 1500);
    })();
    // Page numbers on paper! The sheets (and the numbers written on them) are hidden when printing, so each page's number is
    // written into the printed flow instead: a layer of labels, one per page, each sitting (page number x page height) down from the top
    // (the pages are laid edge to edge with the margins repeated on each, so page i ends exactly i page heights down). It lives next to
    // the document, not inside it, so nothing is saved by accident, and it goes away after printing!
    function printNumbersOn() {
        printNumbersOff();
        if (!prefs.numbers || !pagesOn() || !sheets || !zoomer) return;
        // (the sheets already carry the right label for each page: read them as they are)
        const labels = Array.from(sheets.children).map(function (sh) { const sp = sh.querySelector('.wo-pnum'); return sp ? sp.textContent : ''; });
        if (!labels.length) return;
        const H = pageDims().h;
        const box = document.createElement('div');
        box.className = 'wo-print-nums';
        box.setAttribute('aria-hidden', 'true');
        labels.forEach(function (t, i) {
            if (!t) return;
            const sp = document.createElement('span');
            sp.textContent = t;
            sp.style.top = ((i + 1) * H) + 'px';
            box.appendChild(sp);
        });
        zoomer.appendChild(box);
        zoomer.style.setProperty('--wo-print-h', (labels.length * H - 1) + 'px');
        document.body.classList.add('wo-printnums');
    }
    function printNumbersOff() {
        Array.from(document.querySelectorAll('.wo-print-nums')).forEach(function (b) { b.remove(); });
        document.body.classList.remove('wo-printnums');
        if (zoomer) zoomer.style.removeProperty('--wo-print-h');
    }
    window.addEventListener('beforeprint', function () { try { if (window.KdPrintRaster && KdPrintRaster.active) KdPrintRaster.on(); } catch (e) { console.warn('print raster', e); } printPageSize(true); if (ruleStyle) ruleStyle.disabled = true; try { printTilesOn(); } catch (e) { console.warn('print tiles', e); } try { printNumbersOn(); } catch (e) { console.warn('print numbers', e); } });
    window.addEventListener('afterprint', function () { printPageSize(false); printTilesOff(); printNumbersOff(); if (ruleStyle) ruleStyle.disabled = false; paginateSoon(); });
    // Color previews: see the pages as a printout in black and white, or as people with color blindness see them (screen only, never printed)
    const COLOR_PREVIEWS = [['', 'Normal vision'], ['gray', 'Grayscale (a black and white printout)'], ['protan', 'Protanopia (no red)'], ['deutan', 'Deuteranopia (no green)'], ['tritan', 'Tritanopia (no blue)']];
    let colorPreview = '';
    function ensureColorDefs() {
        if (document.getElementById('kd-cb-defs')) return;
        const m = function (id, v) { return '<filter id="kd-cb-' + id + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + v + '"/></filter>'; };
        const wrap = document.createElement('div');
        wrap.id = 'kd-cb-defs';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        wrap.innerHTML = '<svg width="0" height="0" xmlns="http://www.w3.org/2000/svg"><defs>' +
            m('protan', '0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0') +
            m('deutan', '0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0') +
            m('tritan', '1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0') +
            '</defs></svg>';
        document.body.appendChild(wrap);
    }
    function setColorPreview(v) {
        colorPreview = v || '';
        ensureColorDefs();
        if (zoomer) zoomer.style.filter = colorPreview === 'gray' ? 'grayscale(1)' : colorPreview ? 'url(#kd-cb-' + colorPreview + ')' : '';
        const l = COLOR_PREVIEWS.filter(function (c) { return c[0] === colorPreview; })[0];
        OS.toast(colorPreview ? 'Color preview: ' + l[1] + '!' : 'Normal colors again!');
    }
    function colorPreviewMenu() { return COLOR_PREVIEWS.map(function (c) { return { label: c[1], checked: colorPreview === c[0], run: function () { setColorPreview(c[0]); } }; }); }
    // Print Preview: the pages exactly as they will print (real paper size, 100%, no gaps)
    function setPreview(on) { previewing = !!on; GAP = (previewing || printing) ? 0 : 28; applyView(); OS.toast(previewing ? 'Print Preview: the pages at their real printed size!' : 'Print Preview off!'); }
    applyView();
    window.WriteoutWord = { setPreview: setPreview, paginate: paginate, applyView: applyView, prefs: prefs, pageCount: function () { return pageCount; } };
})();
