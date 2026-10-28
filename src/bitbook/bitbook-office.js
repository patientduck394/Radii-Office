/* =====================================================================
   Bitbook's OneNote layout! A purple ribbon (Home with a Tags gallery,
   Insert, Skills, View), a page list, a OneNote-style page header with
   the note's title and date, page colors and rule lines, on top of
   Bitbook's own editor. Bitbook Classic stays one click away in Settings!
   Loaded after app.js, marketplace.js, settings.js and office-shell.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof canvas === 'undefined' || !canvas) return;
    const OS = window.OfficeShell;
    const ed = canvas;

    const PREF_KEY = 'bitbook_onenote_prefs';
    const PAGE_KEY = 'bitbook_onenote_pages';
    const prefs = Object.assign({ nav: true, pane: false, zoom: 1, full: false, lines: 'none', color: '' }, (function () {
        try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; }
    })());
    // Per-note page looks + created dates (layout-only, never inside the note text)!
    let pageInfo = (function () { try { return JSON.parse(localStorage.getItem(PAGE_KEY) || '{}') || {}; } catch (e) { return {}; } })();
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }
    function savePages() { try { localStorage.setItem(PAGE_KEY, JSON.stringify(pageInfo)); } catch (e) {} }
    // --- Keydown: Un-format shows every tag as plain text, so formatting mistakes are easy to spot;
    // Re-format formats the whole page again and checks it for tags that could not be formatted! ---
    function kdCanvas() { return document.getElementById('wysiwyg-canvas'); }
    function kdAfterChange() {
        try { if (typeof kdHydrateInteractions === 'function') kdHydrateInteractions(); } catch (e) {}
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
        try { if (typeof kdRenderOutline === 'function') kdRenderOutline(); } catch (e) {}
    }
    function unformatDoc() {
        if (!window.kdDoc || !kdCanvas()) return;
        const n = kdDoc.unformat(kdCanvas());
        kdAfterChange();
        OS.toast(n ? 'Un-formatted ' + n + ' piece' + (n === 1 ? '' : 's') + '! Fix any mistakes, then press Re-format!' : 'There is no Keydown formatting on this page!');
    }
    function reformatDoc() {
        if (!window.kdDoc || !kdCanvas()) return;
        const r = kdDoc.reformat(kdCanvas());
        kdAfterChange();
        if (!r.problems.length) { OS.toast('Formatted the whole page, and every Keydown tag checks out!'); return; }
        OS.dialog('Keydown check', '<p class="os-dlg-text">' + r.problems.length + ' tag' + (r.problems.length === 1 ? ' could' : 's could') + ' not be formatted! They are underlined in red on the page. A closing tag may be missing or mistyped:</p><ul class="os-dlg-text" style="max-height:260px;overflow:auto;margin:0;padding-left:20px">' +
            r.problems.slice(0, 50).map(function (p) { return '<li><code>' + OS.esc(p.tag) + '</code> in “' + OS.esc(p.line) + '”</li>'; }).join('') + '</ul>', [{ label: 'Got it!', primary: true, value: true }]);
    }
    function office() { return document.body.classList.contains('os-office'); }
    function save() { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} }
    function tab() { try { return kdActiveTab(); } catch (e) { return null; } }
    function info(t) {
        t = t || tab();
        if (!t) return {};
        if (!pageInfo[t.id]) { pageInfo[t.id] = { created: new Date().toISOString() }; savePages(); }
        return pageInfo[t.id];
    }

    /* ---------- Selection helpers ---------- */
    function selNode() {
        const s = window.getSelection();
        if (!s || !s.rangeCount || !ed.contains(s.anchorNode)) return null;
        const n = s.anchorNode;
        return n.nodeType === 3 ? n.parentElement : n;
    }
    function selComputed() { return getComputedStyle(selNode() || ed); }
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

    /* ---------- Text actions (shared with Writeout's Word layout!) ---------- */
    const FONTS = (function () {
        const sel = document.querySelector('#format-text-controls [data-edit-action="fontName"]');
        const list = sel ? [].map.call(sel.options, function (o) { return o.value; }) : [];
        return list.length ? list : ['JetBrains Mono', 'Roboto', 'Space Grotesk', 'Comic Neue'];
    })();
    function currentFont() {
        const fam = selComputed().fontFamily.replace(/['"]+/g, '').toLowerCase();
        return FONTS.find(function (f) { return fam.indexOf(f.toLowerCase()) === 0; }) || FONTS.find(function (f) { return fam.indexOf(f.toLowerCase()) !== -1; }) || null;
    }
    function setFont(f) {
        try { document.execCommand('fontName', false, f); } catch (e) {}
        save();
    }
    function currentSize() { return Math.round(parseFloat(selComputed().fontSize)); }
    function setSize(px) { if (typeof fmtApplySizePx === 'function') fmtApplySizePx(px); save(); }
    function bumpSize(d) {
        const steps = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96];
        const cur = currentSize() || 16;
        let next = d > 0 ? steps.find(function (s) { return s > cur; }) : steps.slice().reverse().find(function (s) { return s < cur; });
        if (!next) next = d > 0 ? cur + 8 : Math.max(6, cur - 2);
        setSize(next);
    }
    function currentWeight() {
        const w0 = selComputed().fontWeight;
        const w = w0 === 'bold' ? 700 : w0 === 'normal' ? 400 : parseInt(w0, 10);
        return String(Math.min(900, Math.max(300, Math.round(w / 100) * 100)));
    }
    let lastColor = '#9333ea';
    const COLORS = ['#000000', '#334155', '#64748b', '#ffffff', '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#16a34a', '#059669', '#0891b2', '#0284c7', '#2563eb', '#7c3aed', '#9333ea', '#db2777'];
    function applyColor(c) { lastColor = c; try { document.execCommand('foreColor', false, c); } catch (e) {} save(); }
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
    function colorMenu() {
        return [{ header: 'Font Color' }, { swatches: COLORS.map(function (c) { return { color: c, title: c, run: function () { applyColor(c); } }; }) }, { sep: true },
            { label: 'Automatic (inherit)', icon: 'reset', run: function () { if (typeof fmtResetColor === 'function') fmtResetColor('foreColor'); save(); } },
            { label: 'More Colors…', icon: 'palette', run: moreColors }];
    }
    function swatchMenu(title, list, applyFn, swCls) {
        return [{ header: title }, { cols: 5, cls: 'bb-sw-grid', swatches: list.map(function (s) { return { cls: swCls + ' ' + s.cls, html: 'Aa', title: s.label, run: function () { applyFn(s.cls); save(); } }; }) }];
    }
    function setBlock(kind) {
        const map = { p: 'div', h1: 'h1', h2: 'h2', h3: 'h3', quote: 'blockquote', code: 'pre' };
        let blk = topBlock();
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
        try { kdRenderOutline(); } catch (e) {}
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
    function currentAlign() { const t = selComputed().textAlign; return t === 'start' ? 'left' : t === 'end' ? 'right' : t; }
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
        } catch (e) { OS.toast('Press ⌘V (Ctrl+V) to paste: the browser blocks the Paste button here!'); }
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
        if (text && range) { range.deleteContents(); range.insertNode(a); save(); }
        else if (typeof fmtInsertNodeAtCaret === 'function') fmtInsertNodeAtCaret(a);
    }
    function insertKind(k) { if (typeof runInsertKind === 'function') runInsertKind(k); }
    function tagKind(k) { const it = document.querySelector('#tags-menu-popup [data-tag="' + k + '"]'); if (it) it.click(); }
    function skill(k) { const it = document.querySelector('#skills-menu-popup [data-skill="' + k + '"]'); if (it) it.click(); else OS.toast('That skill is not available here!'); }
    function newNote() { const b = document.getElementById('tabs-add-btn'); if (b) b.click(); setTimeout(function () { info(); renderHead(); focusTitle(); }, 30); }
    function focusTitle() { if (office()) ed.focus(); }

    /* ---------- Find ---------- */
    function textNodes() {
        const out = [];
        const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) out.push(n);
        return out;
    }
    function findDialog(withReplace) {
        const box = document.createElement('div');
        box.innerHTML = '<label class="os-field"><span>Find what</span><input class="os-dlg-input" id="bb-find-q" spellcheck="false"></label>' +
            '<label class="os-field"' + (withReplace ? '' : ' style="display:none"') + '><span>Replace with</span><input class="os-dlg-input" id="bb-find-r" spellcheck="false"></label>' +
            '<p class="os-dlg-text" id="bb-find-msg" style="color:var(--os-dim);font-size:12px">Type a word, then Find Next!</p>';
        let lastNode = null, lastEnd = 0;
        const msg = function (t) { box.querySelector('#bb-find-msg').textContent = t; };
        const findNext = function () {
            const q = box.querySelector('#bb-find-q').value.toLowerCase();
            if (!q) { msg('Type something to find first!'); return; }
            const nodes = textNodes();
            let start = lastNode ? Math.max(0, nodes.indexOf(lastNode)) : 0;
            for (let pass = 0; pass < 2; pass++) {
                for (let i = pass === 0 ? start : 0; i < nodes.length; i++) {
                    const from = (pass === 0 && nodes[i] === lastNode) ? lastEnd : 0;
                    const at = nodes[i].nodeValue.toLowerCase().indexOf(q, from);
                    if (at !== -1) {
                        lastNode = nodes[i];
                        lastEnd = at + q.length;
                        const r = document.createRange();
                        r.setStart(nodes[i], at);
                        r.setEnd(nodes[i], at + q.length);
                        const s = window.getSelection();
                        s.removeAllRanges();
                        s.addRange(r);
                        if (nodes[i].parentElement) nodes[i].parentElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        msg('Found it! Press Find Next for the next one!');
                        return;
                    }
                }
                lastNode = null; lastEnd = 0;
            }
            msg('No matches!');
        };
        const replaceAll = function () {
            const q = box.querySelector('#bb-find-q').value;
            const rep = box.querySelector('#bb-find-r').value;
            if (!q) { msg('Type something to find first!'); return; }
            const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            let count = 0;
            textNodes().forEach(function (n) { const nv = n.nodeValue.replace(re, function () { count++; return rep; }); if (nv !== n.nodeValue) n.nodeValue = nv; });
            save();
            msg(count ? 'Replaced ' + count + '!' : 'No matches!');
        };
        const btns = [{ label: 'Close', value: null }];
        if (withReplace) btns.push({ label: 'Replace All', keep: true, value: replaceAll });
        btns.push({ label: 'Find Next', primary: true, keep: true, value: findNext });
        OS.dialog(withReplace ? 'Find and Replace' : 'Find', box, btns);
    }

    /* ---------- Page look: colors + rule lines, per note! ---------- */
    const PAGE_COLORS = [['', 'No Color', '#ffffff'], ['#fff9db', 'Yellow', '#fff9db'], ['#e8f8e8', 'Green', '#e8f8e8'], ['#e3f2fd', 'Blue', '#e3f2fd'], ['#f3e8ff', 'Purple', '#f3e8ff'], ['#fde8f1', 'Pink', '#fde8f1'], ['#fff1e6', 'Peach', '#fff1e6'], ['#eef1f4', 'Gray', '#eef1f4']];
    const LINES = [['none', 'None'], ['rule', 'Rule Lines'], ['wide', 'Wide Rule Lines'], ['small', 'Small Grid'], ['large', 'Large Grid']];
    function pageLook() {
        const i = info();
        return { color: i.color != null ? i.color : prefs.color, lines: i.lines || prefs.lines };
    }
    function setPageLook(key, val) {
        const i = info();
        i[key] = val;
        savePages();
        applyPage();
    }
    function applyPage() {
        const look = pageLook();
        const scb = document.querySelector('.canvas-scrollbox');
        const lh = parseFloat(getComputedStyle(ed).lineHeight) || 27;
        const st = document.body.style;
        st.setProperty('--on-page', look.color || '#ffffff');
        st.setProperty('--on-lh', lh + 'px');
        const line = 'rgba(120, 140, 200, 0.35)';
        const L = {
            none: 'none',
            rule: 'repeating-linear-gradient(to bottom, transparent 0, transparent ' + (lh - 1) + 'px, ' + line + ' ' + (lh - 1) + 'px, ' + line + ' ' + lh + 'px)',
            wide: 'repeating-linear-gradient(to bottom, transparent 0, transparent ' + (lh * 2 - 1) + 'px, ' + line + ' ' + (lh * 2 - 1) + 'px, ' + line + ' ' + lh * 2 + 'px)',
            small: 'linear-gradient(' + line + ' 1px, transparent 1px), linear-gradient(90deg, ' + line + ' 1px, transparent 1px)',
            large: 'linear-gradient(' + line + ' 1px, transparent 1px), linear-gradient(90deg, ' + line + ' 1px, transparent 1px)'
        }[look.lines] || 'none';
        st.setProperty('--on-lines', L);
        st.setProperty('--on-lines-size', look.lines === 'small' ? '20px 20px' : look.lines === 'large' ? '44px 44px' : 'auto');
        document.body.classList.toggle('on-has-lines', look.lines !== 'none');
        if (scb) scb.classList.toggle('on-colored', !!look.color);
        OS.sync();
    }
    function pageColorMenu() {
        const cur = pageLook().color;
        return [{ header: 'Page Color' }].concat(PAGE_COLORS.map(function (c) {
            return { label: c[1], dot: c[2], checked: cur === c[0], run: function () { setPageLook('color', c[0]); } };
        }));
    }
    function linesMenu() {
        const cur = pageLook().lines;
        return [{ header: 'Rule Lines' }].concat(LINES.map(function (l) {
            return { label: l[1], icon: l[0] === 'none' ? 'x' : l[0].indexOf('grid') !== -1 || l[0] === 'small' || l[0] === 'large' ? 'grid' : 'lines', checked: cur === l[0], run: function () { setPageLook('lines', l[0]); } };
        })).concat([{ sep: true }, { label: 'Use this look for new pages', icon: 'check', run: function () { const lk = pageLook(); prefs.color = lk.color; prefs.lines = lk.lines; savePrefs(); OS.toast('New pages get this look!'); } }]);
    }

    /* ---------- The OneNote page header: title + date! ---------- */
    let head = null;
    function buildHead() {
        head = document.createElement('div');
        head.id = 'on-page-head';
        head.innerHTML = '<input id="on-title" spellcheck="true" placeholder="Untitled page" aria-label="Page title"><div id="on-date"></div>';
        const scb = ed.parentElement;
        scb.insertBefore(head, ed);
        const t = head.querySelector('#on-title');
        t.addEventListener('input', function () {
            const tb = tab();
            if (!tb) return;
            tb.name = t.value.substring(0, 60) || 'Untitled page';
            kdSaveTabs();
            clearTimeout(t._r);
            t._r = setTimeout(function () { kdRenderTabs(); OS.sync(); }, 150);
        });
        t.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                ed.focus();
                try { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (err) {}
            }
        });
    }
    function renderHead() {
        if (!head) return;
        const tb = tab();
        const t = head.querySelector('#on-title');
        if (tb && document.activeElement !== t) t.value = tb.name || '';
        const d = new Date(info().created || Date.now());
        head.querySelector('#on-date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '     ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        if (head._tabId !== (tb && tb.id)) {
            head._tabId = tb && tb.id;
            head.classList.remove('on-head-in');
            void head.offsetWidth;
            head.classList.add('on-head-in');
            applyPage();
        }
    }

    /* ---------- View ---------- */
    function setZoom(z) { prefs.zoom = Math.max(0.5, Math.min(2, Math.round(z * 100) / 100)); savePrefs(); applyView(); }
    function setFull(on) {
        prefs.full = !!on;
        savePrefs();
        applyView();
        if (on) OS.toast('Full Page View! Press Esc to bring everything back!');
    }
    function togglePane(group) {
        if (group) { prefs.pane = true; try { fmtSetGroup(group); } catch (e) {} }
        else prefs.pane = !prefs.pane;
        savePrefs();
        applyView();
    }
    function applyView() {
        const on = office();
        document.body.classList.toggle('bb-nav-off', !prefs.nav);
        document.body.classList.toggle('bb-pane-on', !!prefs.pane);
        document.body.classList.toggle('bb-full', on && !!prefs.full);
        const scb = document.querySelector('.canvas-scrollbox');
        if (scb) scb.style.zoom = on && prefs.zoom !== 1 ? String(prefs.zoom) : '';
        renderHead();
        applyPage();
        OS.sync();
    }
    function themeMenu() {
        const M = window.WriteoutMarketplace;
        let themes = [], active = '';
        try { themes = M ? M.themes() : []; active = M ? M.activeTheme() : ''; } catch (e) {}
        const rows = [{ id: '', name: 'Default Paper', installed: true }].concat(themes);
        return [{ header: 'Canvas Theme' }].concat(rows.map(function (t) {
            return { label: t.name + (t.id === '' || t.installed ? '' : ' (Get)'), checked: active === t.id, icon: 'pageColor', run: function () { if (M && M.applyTheme) M.applyTheme(t.id); setTimeout(applyPage, 60); } };
        }));
    }

    /* ---------- Stats ---------- */
    function stats() {
        const text = ed.innerText || '';
        return { words: (text.match(/[^\s]+/g) || []).length, chars: text.replace(/\n/g, '').length };
    }

    /* ---------- File screen ---------- */
    function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
    const DL = [
        ['kn', '.KN note', 'Every note, tag and skill!', 'save'],
        ['docx', 'Word (.docx)', 'Opens in Microsoft Word!', 'file'],
        ['pdf', 'PDF', 'Via the print dialog!', 'print'],
        ['odt', 'OpenDocument (.odt)', 'For LibreOffice!', 'file'],
        ['txt', 'Plain Text (.txt)', 'Just the words!', 'page'],
        ['epub', 'EPUB e-book', 'For e-readers!', 'notebook'],
        ['jpeg', 'JPEG image', 'A snapshot of the note!', 'image'],
        ['svg', 'SVG image', 'A vector snapshot!', 'image'],
        ['web', 'Web page (.zip)', 'HTML + CSS!', 'web']
    ];
    function download(f) { if (typeof runDownloadFormat === 'function') runDownloadFormat(f); }
    function openFile() { const g = document.getElementById('file-loader-gate'); if (g) g.click(); }
    function openClassicSettings() { const b = document.getElementById('settings-trigger-btn'); if (b) b.click(); }
    async function newNotebook() {
        const any = (kdTabs || []).some(function (t) { return t.html && t.html.replace(/<[^>]*>/g, '').trim(); });
        if (any && !(await OS.confirm('New Notebook', 'Start a fresh notebook? Every page in this one will be cleared (download a .kn first to keep it)!', 'Start Fresh', true))) return;
        kdFreshTabs();
        ed.innerHTML = '';
        try { kdRenderTabs(); kdRenderOutline(); } catch (e) {}
        save();
        applyView();
        OS.toast('Fresh notebook, ready for notes!');
    }
    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'New page', hint: 'A fresh page in this notebook!', icon: 'newDoc', run: newNote },
                    { label: 'New notebook', hint: 'Start over with an empty notebook!', icon: 'notebook', run: newNotebook },
                    { label: 'Open a .kn file', hint: 'Import a Bitbook note!', icon: 'folder', run: openFile }
                ]));
                const s = stats();
                b.insertAdjacentHTML('beforeend', '<h2>This notebook</h2><div class="bb-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + OS.esc((tab() || {}).name || 'Quick Note') + '</b><span>' + kdTabs.length + ' page' + (kdTabs.length === 1 ? '' : 's') + ' · ' + s.words.toLocaleString() + ' words on this page · saves automatically in this browser!</span></div></div>');
            }
        },
        { id: 'new', label: 'New', icon: 'newDoc', render: function (b) { b.innerHTML = '<h1>New</h1>'; b.appendChild(OS.bsCards([{ label: 'New page', hint: 'Keeps every other page!', icon: 'newDoc', run: newNote }, { label: 'New notebook', hint: 'Clears every page!', icon: 'notebook', run: newNotebook }])); } },
        { id: 'open', label: 'Open', icon: 'folder', render: function (b) { b.innerHTML = '<h1>Open</h1>'; b.appendChild(OS.bsCards([{ label: 'Browse…', hint: 'Open a .kn or .kd file!', icon: 'folder', run: openFile }])); } },
        { id: 'export', label: 'Export', icon: 'export', render: function (b) { b.innerHTML = '<h1>Export</h1>'; b.appendChild(OS.bsCards(DL.map(function (d) { return { label: d[1], hint: d[2], icon: d[3], run: function () { download(d[0]); } }; }))); } },
        { id: 'print', label: 'Print', icon: 'print', action: function () { if (typeof printWriteoutPage === 'function') printWriteoutPage(); } },
        { id: 'info', label: 'Info', icon: 'info', render: function (b) { const s = stats(); b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Pages</td><td><b>' + kdTabs.length + '</b></td></tr><tr><td>Words (this page)</td><td><b>' + s.words + '</b></td></tr><tr><td>Characters (this page)</td><td><b>' + s.chars + '</b></td></tr><tr><td>Locked</td><td><b>' + (typeof kdDocPasswordHash !== 'undefined' && kdDocPasswordHash ? 'Yes!' : 'No') + '</b></td></tr></table>'; b.appendChild(OS.bsCards([{ label: 'Lock Notebook', hint: 'Set a password!', icon: 'lock', run: function () { togglePane('doc'); } }, { label: 'Note Info', hint: 'Jot info about this note!', icon: 'info', run: function () { togglePane('main'); } }])); } }
    ];
    function settingsExtra(b) {
        b.insertAdjacentHTML('beforeend', '<h2>Pages</h2>');
        const seg = function (opts, cur, pick) {
            const s = document.createElement('div');
            s.className = 'os-seg';
            opts.forEach(function (o) {
                const x = document.createElement('button');
                x.type = 'button';
                x.textContent = o[1];
                x.classList.toggle('on', o[0] === cur());
                x.addEventListener('click', function () { pick(o[0]); [].forEach.call(s.children, function (y, i) { y.classList.toggle('on', opts[i][0] === cur()); }); });
                s.appendChild(x);
            });
            return s;
        };
        const row = function (label, node) { const r = document.createElement('div'); r.className = 'os-set-row'; r.innerHTML = '<b>' + label + '</b>'; r.appendChild(node); return r; };
        b.appendChild(row('New page color', seg(PAGE_COLORS.map(function (c) { return [c[0], c[1]]; }), function () { return prefs.color; }, function (v) { prefs.color = v; savePrefs(); applyPage(); })));
        b.appendChild(row('New page lines', seg(LINES, function () { return prefs.lines; }, function (v) { prefs.lines = v; savePrefs(); applyPage(); })));
        b.insertAdjacentHTML('beforeend', '<h2>Bitbook</h2>');
        const o = document.createElement('div');
        o.className = 'os-opts';
        const WS = window.WriteoutSettings;
        if (WS) {
            o.appendChild(OS.optRow('Floating spheres', 'The drifting glass bubbles from Bitbook Classic!', function () { return !WS.ambientHidden(); }, function (v) { WS.setAmbientHidden(!v); }));
            if (WS.aeroUiMode) o.appendChild(OS.optRow('Frutiger Aero UI', 'Gel "Toolbar" skin on Bitbook\'s own buttons!', function () { return !!WS.aeroUiMode(); }, function (v) { WS.setAeroUi(v ? 'toolbar' : ''); }));
            o.appendChild(OS.optRow('Restore notes on start', 'Reopen your pages when Bitbook starts!', function () { return WS.restoreDocs(); }, function (v) { WS.setRestoreDocs(v); }));
        }
        b.appendChild(o);
        b.appendChild(OS.bsCards([{ label: 'Canvas themes & more', hint: 'Themes, favorites, note info and the rest of Bitbook Classic settings!', icon: 'palette', run: openClassicSettings }]));
    }

    /* ---------- Ribbon ---------- */
    const hl = typeof FMT_HIGHLIGHT_STYLES !== 'undefined' ? FMT_HIGHLIGHT_STYLES : [];
    const chips = typeof FMT_CHIP_STYLES !== 'undefined' ? FMT_CHIP_STYLES : [];
    const aqua = typeof FMT_AQUA_STYLES !== 'undefined' ? FMT_AQUA_STYLES : [];
    let lastHl = hl[0] ? hl[0].cls : '';
    const styleGallery = [
        { label: 'Heading 1', preview: '<i class="bb-gp bb-gp-h1">AaBb</i>', run: function () { setBlock('h1'); }, active: function () { return blockKind() === 'h1'; } },
        { label: 'Heading 2', preview: '<i class="bb-gp bb-gp-h2">AaBb</i>', run: function () { setBlock('h2'); }, active: function () { return blockKind() === 'h2'; } },
        { label: 'Heading 3', preview: '<i class="bb-gp bb-gp-h3">AaBb</i>', run: function () { setBlock('h3'); }, active: function () { return blockKind() === 'h3'; } },
        { label: 'Normal', preview: '<i class="bb-gp bb-gp-p">AaBb</i>', run: function () { setBlock('p'); }, active: function () { return blockKind() === 'p'; } },
        { label: 'Quote', preview: '<i class="bb-gp bb-gp-q">AaBb</i>', run: function () { setBlock('quote'); }, active: function () { return blockKind() === 'quote'; } },
        { label: 'Code', preview: '<i class="bb-gp bb-gp-c">AaBb</i>', run: function () { setBlock('code'); }, active: function () { return blockKind() === 'code'; } }
    ];
    const tagGallery = [
        { label: 'To Do', preview: '<i class="bb-tg bb-tg-todo">☐</i>', title: 'To Do: a checkbox you can tick!', run: function () { tagKind('checkbox'); } },
        { label: 'Important', preview: '<i class="bb-tg bb-tg-imp">★</i>', run: function () { tagKind('important'); } },
        { label: 'Idea', preview: '<i class="bb-tg bb-tg-idea">💡</i>', run: function () { tagKind('idea'); } },
        { label: 'Contact', preview: '<i class="bb-tg bb-tg-contact">☎</i>', run: function () { tagKind('contact'); } },
        { label: 'Person', preview: '<i class="bb-tg bb-tg-user">@</i>', title: 'Tag a person (@name)', run: function () { tagKind('user'); } },
        { label: 'Hashtag', preview: '<i class="bb-tg bb-tg-hash">#</i>', run: function () { tagKind('hashtag'); } },
        { label: 'Date', preview: '<i class="bb-tg bb-tg-date">📅</i>', run: function () { tagKind('date'); } },
        { label: 'Dropdown', preview: '<i class="bb-tg bb-tg-drop">▾</i>', title: 'A dropdown chip (To do / Doing / Done)', run: function () { tagKind('dropdown'); } }
    ];
    const SKILLS = [
        ['unichip', 'Uni-Chip', 'palette'], ['customchip', 'Custom\nChip', 'bubble'], ['uniquechip', 'Unique\nStyles', 'sparkle'], ['customcss', 'Custom\nCSS', 'css'],
        ['jumper', 'Jumper', 'jumper'], ['beepbox', 'BeepBox\nSong', 'music'], ['sprite', 'Pixel\nSprite', 'pixel'], ['capsule', 'Time\nCapsule', 'capsule'],
        ['flashcard', 'Flashcard', 'cards'], ['timer', 'Focus\nTimer', 'timer'], ['dice', 'Dice\nRoller', 'dice'], ['programs', 'Programs', 'code'], ['annotate', 'Annotate', 'annotate']
    ].filter(function (s) { return document.querySelector('#skills-menu-popup [data-skill="' + s[0] + '"]'); });

    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'Clipboard', items: [
                    { big: true, icon: 'paste', label: 'Paste', run: paste },
                    { stack: [
                        { sm: true, icon: 'cut', label: 'Cut', run: function () { try { document.execCommand('cut'); } catch (e) {} save(); } },
                        { sm: true, icon: 'copy', label: 'Copy', run: function () { try { document.execCommand('copy'); } catch (e) {} } },
                        { sm: true, icon: 'clearFormat', label: 'Exit Formatting', run: function () { if (typeof fmtExitFormattingNow === 'function') fmtExitFormattingNow(); save(); } }
                    ] }
                ] },
                { label: 'Basic Text', items: [{ rows: [
                    [
                        { select: true, title: 'Font', width: 126, fontPreview: true, options: FONTS, get: currentFont, set: setFont },
                        { number: true, title: 'Font Size (px)', width: 50, min: 6, max: 200, get: currentSize, set: setSize },
                        { icon: 'growFont', title: 'Increase Font Size', run: function () { bumpSize(1); } },
                        { icon: 'shrinkFont', title: 'Decrease Font Size', run: function () { bumpSize(-1); } },
                        { select: true, title: 'Font Weight', width: 90, options: [['300', 'Light'], ['400', 'Normal'], ['500', 'Medium'], ['600', 'Semi Bold'], ['700', 'Bold'], ['800', 'Extra Bold'], ['900', 'Black']], get: currentWeight, set: function (v) { if (typeof fmtApplyWeight === 'function') fmtApplyWeight(v); save(); } }
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
                        { icon: 'outdent', title: 'Decrease Indent', run: function () { if (typeof fmtIndentBlocks === 'function') fmtIndentBlocks(-1); } },
                        { icon: 'indent', title: 'Increase Indent', run: function () { if (typeof fmtIndentBlocks === 'function') fmtIndentBlocks(1); } }
                    ],
                    [
                        { icon: 'aLeft', title: 'Align Left', run: function () { align('left'); }, checked: function () { return currentAlign() === 'left'; } },
                        { icon: 'aCenter', title: 'Center', run: function () { align('center'); }, checked: function () { return currentAlign() === 'center'; } },
                        { icon: 'aRight', title: 'Align Right', run: function () { align('right'); }, checked: function () { return currentAlign() === 'right'; } },
                        { icon: 'aJustify', title: 'Justify', run: function () { align('justify'); }, checked: function () { return currentAlign() === 'justify'; } }
                    ]
                ] }] },
                { label: 'Styles', items: [{ gallery: true, cls: 'bb-style-gal', items: styleGallery }] },
                { label: 'Tags', items: [
                    { gallery: true, cls: 'bb-tag-gal', items: tagGallery },
                    { big: true, icon: 'sparkle', label: 'Keydown\nStyles', title: 'Every Keydown style, by category: pick one to style the selection!', menu: function (b) { return window.kdDoc ? kdDoc.styleMenu(OS, b, function () { togglePane('style'); }) : null; } }
                ] },
                { label: 'Find', items: [{ stack: [
                    { sm: true, icon: 'search', label: 'Find', kbd: '⌘F', run: function () { findDialog(false); } },
                    { sm: true, icon: 'reset', label: 'Replace', run: function () { findDialog(true); } }
                ] }] }
            ]
        },
        {
            id: 'insert', label: 'Insert', groups: [
                { label: 'Pages', items: [{ big: true, icon: 'newDoc', label: 'New\nPage', run: newNote }] },
                { label: 'Files', items: [
                    { big: true, icon: 'attach', label: 'File\nAttachment', run: function () { insertKind('file'); } },
                    { big: true, icon: 'image', label: 'Pictures', run: function () { insertKind('image'); } },
                    { big: true, icon: 'search', label: 'Online\nPictures', title: 'Search free CC0 / CC BY / CC BY-SA pictures!', run: function () { window.openOnlinePictures(); } }
                ] },
                { label: 'Links', items: [{ big: true, icon: 'link', label: 'Link', run: insertLink }] },
                { label: 'Math', items: [{ big: true, icon: 'sigma', label: 'Equation', title: 'Insert LaTeX math! (Or type $x^2$ then Space, or $$...$$ then Space)', run: function () { if (window.kdMathInsert) window.kdMathInsert(true); }, menu: function () { return [{ label: 'Equation (centered)', icon: 'sigma', run: function () { window.kdMathInsert(true); } }, { label: 'Inline math', icon: 'sigma', run: function () { window.kdMathInsert(false); } }]; } }] },
                { label: 'Time Stamp', items: [{ stack: [
                    { sm: true, icon: 'calendar', label: 'Date', run: function () { insertKind('date'); } },
                    { sm: true, icon: 'clock', label: 'Date & Time', run: function () { insertKind('timestamp'); } },
                    { sm: true, icon: 'divider', label: 'Divider', run: function () { insertKind('divider'); } }
                ] }] },
                { label: 'Symbols', items: [{ big: true, icon: 'symbol', label: 'Symbol', run: function () { insertKind('symbols'); } }] },
                { label: 'Lists', items: [
                    { big: true, icon: 'todo', label: 'To Do\nTag', run: function () { tagKind('checkbox'); } },
                    { big: true, icon: 'bullets', label: 'Bullets', run: function () { list(false); } }
                ] }
            ]
        },
        {
            id: 'skills', label: 'Skills', groups: [
                { label: 'Chips', items: SKILLS.slice(0, 4).map(function (s) { return { big: true, icon: s[2], label: s[1], run: function () { skill(s[0]); } }; }) },
                { label: 'Gadgets', items: SKILLS.slice(4).map(function (s) { return { big: true, icon: s[2], label: s[1], run: function () { skill(s[0]); } }; }) },
                { label: 'Keydown', items: [
                    { big: true, icon: 'code', label: 'Un-\nformat', title: 'Show every Keydown tag as plain text, so formatting mistakes are easy to spot!', run: unformatDoc },
                    { big: true, icon: 'check', label: 'Re-\nformat', title: 'Format the whole page again and check it for tags that could not be formatted!', run: reformatDoc }
                ] }
            ]
        },
        {
            id: 'view', label: 'View', groups: [
                { label: 'Views', items: [
                    { big: true, icon: 'fullscreen', label: 'Full Page\nView', title: 'Just the page (Esc to exit)!', run: function () { setFull(true); } }
                ] },
                { label: 'Page Setup', items: [
                    { big: true, icon: 'pageColor', label: 'Page\nColor', menu: pageColorMenu },
                    { big: true, icon: 'lines', label: 'Rule\nLines', menu: linesMenu },
                    { big: true, icon: 'palette', label: 'Canvas\nTheme', menu: themeMenu }
                ] },
                { label: 'Show', items: [{ stack: [
                    { check: true, label: 'Page List', get: function () { return prefs.nav; }, set: function (v) { prefs.nav = v; savePrefs(); applyView(); } },
                    { check: true, label: 'Format Pane', get: function () { return prefs.pane; }, set: function (v) { prefs.pane = v; savePrefs(); applyView(); } },
                    { check: true, label: 'Floating Spheres', get: function () { return window.WriteoutSettings ? !window.WriteoutSettings.ambientHidden() : true; }, set: function (v) { if (window.WriteoutSettings) window.WriteoutSettings.setAmbientHidden(!v); } }
                ] }] },
                { label: 'Zoom', items: [
                    { big: true, icon: 'zoom', label: 'Zoom', menu: function () { return [75, 90, 100, 125, 150].map(function (z) { return { label: z + '%', checked: Math.round(prefs.zoom * 100) === z, run: function () { setZoom(z / 100); } }; }); } },
                    { big: true, glyph: '100', label: '100%', run: function () { setZoom(1); } }
                ] },
                { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: function () { return [{ label: 'OneNote', checked: true, icon: 'layout', run: function () { OS.setLayout('office'); } }, { label: 'Bitbook Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }] }
            ]
        },
        {
            id: 'help', label: 'Help', groups: [
                { label: 'Help', items: [{ big: true, icon: 'help', label: 'Help\nDeck', run: function () { if (typeof openHelpDeck === 'function') openHelpDeck(); } }] },
                { label: 'BitLang', items: [{ big: true, icon: 'code', label: 'BitLang\nGuide', title: 'How to write programs and games in Bitbook!', run: function () { if (window.BitLang) window.BitLang.openDocs(); } }] },
                { label: 'Extensions', items: [{ big: true, icon: 'store', label: 'Marketplace', run: function () { const b = document.getElementById('marketplace-trigger-btn'); if (b) b.click(); } }] }
            ]
        }
    ];

    /* ---------- Boot ---------- */
    buildHead();
    OS.init({
        app: 'Bitbook',
        officeName: 'OneNote',
        kind: 'onenote',
        key: 'bitbook',
        icon: 'favicon-96.png',
        officeHint: 'A purple ribbon, a page list, page titles with dates, tags and rule lines, like OneNote!',
        classicHint: 'The original Bitbook: purple glass sidebars, gel buttons and floating spheres!',
        classicToast: 'Bitbook Classic: purple glass and gel!',
        theme: { accent: '#9333ea', 'accent-d': '#7e22ce', 'accent-l': '#f3e8ff', title: '#9333ea', gel1: '#d946ef', gel2: '#9333ea', 'gel-border': '#e9d5ff', 'gel-glow': 'rgba(147, 51, 234, 0.45)', glow: 'rgba(233, 213, 255, 0.9)', 'thumb-bg': '#1a0b2e' },
        editor: function () { return ed; },
        keepSelection: true,
        title: function () { const t = tab(); return t ? t.name : 'Quick Note'; },
        rename: function (name) { const t = tab(); if (t) { t.name = name.substring(0, 60); kdSaveTabs(); kdRenderTabs(); renderHead(); } },
        qat: [
            { icon: 'save', title: 'Download a copy (.kn)', run: function () { download('kn'); OS.flashSaved('Saved!'); } },
            { icon: 'undo', title: 'Undo (⌘Z)', run: function () { try { if (window.kdBlockUndo) window.kdBlockUndo(); else document.execCommand('undo'); } catch (e) {} } },
            { icon: 'redo', title: 'Redo (⌘⇧Z)', run: function () { try { if (window.kdBlockRedo) window.kdBlockRedo(); else document.execCommand('redo'); } catch (e) {} } },
            { icon: 'newDoc', title: 'New Page', run: newNote }
        ],
        tabs: tabs,
        backstage: backstage,
        settings: settingsExtra,
        status: function () {
            const s = stats();
            const i = kdTabs.indexOf(tab());
            return ['Page <b>' + (i + 1) + '</b> of <b>' + kdTabs.length + '</b>', '<b>' + s.words.toLocaleString() + '</b> word' + (s.words === 1 ? '' : 's'), '<b>' + s.chars.toLocaleString() + '</b> characters'];
        },
        views: [
            { icon: 'navPane', title: 'Page List', run: function () { prefs.nav = !prefs.nav; savePrefs(); applyView(); }, active: function () { return prefs.nav; } },
            { icon: 'fullscreen', title: 'Full Page View', run: function () { setFull(!prefs.full); }, active: function () { return prefs.full; } }
        ],
        zoom: { get: function () { return prefs.zoom; }, set: setZoom, min: 50, max: 200 },
        searchExtra: function (q) {
            const out = [];
            try { kdTabs.forEach(function (t) { if (t.name.toLowerCase().indexOf(q) !== -1 || (t.html || '').replace(/<[^>]*>/g, ' ').toLowerCase().indexOf(q) !== -1) out.push({ label: 'Open page "' + t.name + '"', icon: 'page', where: 'Pages', it: { run: function () { kdActivateTab(t.id); renderHead(); } } }); }); } catch (e) {}
            return out.slice(0, 6);
        },
        onLayout: function () { applyView(); }
    });

    // Bitbook Classic's Settings gets the layout cards too!
    const classicBody = document.querySelector('#settings-modal-overlay .dialog-body-scroll');
    if (classicBody) {
        const h = document.createElement('h4');
        h.textContent = 'Layout — OneNote or Bitbook Classic';
        const cards = OS.layoutCards();
        cards.classList.add('bb-classic-cards');
        classicBody.insertBefore(cards, classicBody.firstChild);
        classicBody.insertBefore(h, cards);
        const sBtn = document.getElementById('settings-trigger-btn');
        if (sBtn) sBtn.addEventListener('click', OS.syncLayoutCards);
    }

    // Keep the page header fresh as notes switch!
    const tabsList = document.getElementById('doc-tabs-list');
    if (tabsList) tabsList.addEventListener('click', function () { setTimeout(renderHead, 20); });
    const addBtn = document.getElementById('tabs-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () { setTimeout(function () { info(); renderHead(); if (office()) focusTitle(); }, 20); });
    new MutationObserver(function () { setTimeout(applyPage, 30); }).observe(ed, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', function (e) {
        if (!office()) return;
        if (e.key === 'Escape' && prefs.full) { setFull(false); return; }
        const mod = e.metaKey || e.ctrlKey;
        if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') { e.preventDefault(); findDialog(false); }
    });
    setInterval(function () { if (office()) renderHead(); }, 30000);
    applyView();
    window.BitbookOneNote = { applyView: applyView, prefs: prefs, renderHead: renderHead };
})();
