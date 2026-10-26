/* =====================================================================
   Writeout's Annotator! Like a pen tray on your desk: pick a pen and a
   color, then just select text and it is marked the moment you let go.
   Different from Bitbook's Annotate on purpose: its own pens (Marker,
   Underline, Strike, Ink Wash, Sticky Tab, Glow Pen, Lasso and Color Ink),
   notes you can pin to any mark, and a list of every mark in the document.
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed) return;
    const OS = window.OfficeShell || null;
    const toast = function (m) { try { if (OS) OS.toast(m); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const save = function () { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} };

    // strip / ul / st are Bitbook's own Annotate styles (.an-hl, .an-hl.an-s-ul, .an-hl.an-s-st, from annotate-hl.css);
    // the rest are Writeout's own pens. Every pen uses Bitbook's highlight colors (.an-hl-red ... .an-hl-slate).
    const PENS = [
        ['strip', 'Highlight'], ['ul', 'Gel Underline'], ['st', 'Gel Strikethrough'],
        ['marker', 'Marker'], ['glow', 'Glow Pen'], ['lasso', 'Lasso'], ['ink', 'Color Ink']
    ];
    const COLORS = [
        ['red', '#ef4444', '#dc2626'], ['orange', '#f97316', '#ea580c'], ['gold', '#ea9f08', '#ca8a04'], ['yellow', '#ead708', '#caa604'],
        ['lime', '#84cc16', '#65a30d'], ['green', '#10b981', '#059669'], ['turquoise', '#30e5cd', '#26b1a5'], ['teal', '#06b6d4', '#0891b2'],
        ['cyan', '#30d3e5', '#26a3b1'], ['blue', '#3b82f6', '#2563eb'], ['purple', '#a855f7', '#9333ea'], ['pink', '#ec4899', '#db2777'], ['slate', '#b4b4b4', '#6f6f6f']
    ];
    const BITBOOK = { strip: '', ul: ' an-s-ul', st: ' an-s-st' };
    function classFor(pen, color) { return pen in BITBOOK ? 'an-hl an-hl-' + color + BITBOOK[pen] : 'wa-hl wa-' + pen + ' an-hl-' + color; }
    const MARKS = 'mark.wa-hl, mark.an-hl';
    const state = Object.assign({ pen: 'strip', color: 'yellow' }, (function () { try { return JSON.parse(localStorage.getItem('writeout_annotator') || '{}') || {}; } catch (e) { return {}; } })());
    const keep = function () { try { localStorage.setItem('writeout_annotator', JSON.stringify({ pen: state.pen, color: state.color })); } catch (e) {} };
    let on = false, eraser = false;

    /* ---------- The pens ---------- */
    const css = document.createElement('style');
    css.textContent = COLORS.map(function (c) { return '.wa-dot.wa-c-' + c[0] + ',.wa-item.wa-c-' + c[0] + '{--hl-c:' + c[1] + ';--hl-edge:' + c[2] + '}'; }).join('\n') + '\n' + [
        'mark.wa-hl{color:inherit;background:none;padding:0;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
        // Marker: a translucent fill with soft rounded ends, a touch darker at the bottom like real ink
        'mark.wa-marker{background:linear-gradient(180deg,color-mix(in srgb,var(--hl-c) 38%,transparent) 0%,color-mix(in srgb,var(--hl-c) 62%,transparent) 100%);border-radius:.25em .45em .3em .5em;padding:0 .12em;margin:0 -.12em}',
        // Glow Pen: the words light up in the color (no fill, no line)
        'mark.wa-glow{text-shadow:0 0 .25em var(--hl-c),0 0 .6em color-mix(in srgb,var(--hl-c) 70%,transparent)}',
        // Lasso: a hand-drawn dashed loop around the words
        'mark.wa-lasso{border:2px dashed var(--hl-edge);border-radius:999px;padding:0 .35em;margin:0 -.35em}',
        // Color Ink: the words themselves are written in the color
        'mark.wa-ink{color:var(--hl-edge);font-weight:700}',
        'mark.wa-hl[data-note],mark.an-hl[data-note]{cursor:help}',
        'mark.wa-hl[data-note]::after,mark.an-hl[data-note]::after{content:"✎";font-size:.6em;vertical-align:super;margin-left:.1em;color:var(--hl-edge);font-weight:800}',
        // the pen tray
        '.wa-tray{position:fixed;left:50%;top:calc(var(--wa-top,150px));transform:translateX(-50%);z-index:900;display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:8px 12px;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(241,245,249,.94));border:1px solid rgba(148,163,184,.55);box-shadow:0 12px 30px rgba(15,23,42,.22);font:12px system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a}',
        '.wa-tray[hidden]{display:none}',
        '.wa-title{font-weight:800;color:#0369a1;margin-right:4px}',
        '.wa-pens,.wa-colors{display:flex;gap:4px;flex-wrap:wrap}',
        '.wa-pen{font:inherit;font-size:13px;min-width:34px;height:30px;padding:0 8px;border-radius:9px;border:1px solid rgba(148,163,184,.6);background:#fff;cursor:pointer}',
        '.wa-pen[aria-pressed="true"]{border-color:#0284c7;box-shadow:0 0 0 2px rgba(2,132,199,.35)}',
        '.wa-dot{width:22px;height:22px;border-radius:50%;border:2px solid #fff;background:var(--hl-c);box-shadow:0 0 0 1px rgba(15,23,42,.25);cursor:pointer;padding:0}',
        '.wa-dot[aria-pressed="true"]{box-shadow:0 0 0 2px var(--hl-edge)}',
        '.wa-sep{width:1px;height:24px;background:rgba(148,163,184,.6)}',
        '.wa-act{font:inherit;font-weight:700;height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(148,163,184,.6);background:#fff;cursor:pointer}',
        '.wa-act[aria-pressed="true"]{background:#fee2e2;border-color:#ef4444;color:#b91c1c}',
        '.wa-act.wa-done{background:linear-gradient(180deg,#38bdf8,#0369a1);color:#fff;border-color:transparent}',
        '.wa-list{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}',
        '.wa-item{display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border:1px solid rgba(148,163,184,.4);border-radius:8px;cursor:pointer;text-align:left;background:#fff;font:inherit}',
        '.wa-item:hover{border-color:#0284c7}',
        '.wa-swatch{flex:none;width:12px;height:12px;border-radius:3px;margin-top:3px;background:var(--hl-c)}',
        '.wa-flash{animation:waFlash 1s ease}',
        '@keyframes waFlash{0%{outline:3px solid #0284c7}100%{outline:3px solid transparent}}'
    ].join('\n');
    document.head.appendChild(css);

    /* ---------- The tray ---------- */
    const tray = document.createElement('div');
    tray.className = 'wa-tray';
    tray.hidden = true;
    tray.setAttribute('role', 'toolbar');
    tray.setAttribute('aria-label', 'Annotator');
    tray.innerHTML = '<span class="wa-title">✍ Annotator</span><div class="wa-pens">' +
        PENS.map(function (p) { return '<button type="button" class="wa-pen" data-pen="' + p[0] + '" title="' + p[1] + '"><mark class="' + classFor(p[0], state.color) + '">Ab</mark></button>'; }).join('') +
        '</div><span class="wa-sep"></span><div class="wa-colors">' +
        COLORS.map(function (c) { return '<button type="button" class="wa-dot wa-c-' + c[0] + '" data-color="' + c[0] + '" title="' + c[0][0].toUpperCase() + c[0].slice(1) + '"></button>'; }).join('') +
        '</div><span class="wa-sep"></span><button type="button" class="wa-act" data-act="erase" title="Eraser: select marked text (or click a mark) to remove it">Eraser</button><button type="button" class="wa-act" data-act="note" title="Pin a note to the mark under the caret">✎ Note</button><button type="button" class="wa-act" data-act="list" title="Every mark in this document">☰ List</button><button type="button" class="wa-act wa-done" data-act="done">Done</button>';
    document.body.appendChild(tray);
    // keep the selection when the tray is clicked
    tray.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    function paintTray() {
        tray.querySelectorAll('[data-pen]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(!eraser && b.getAttribute('data-pen') === state.pen));
            const m = b.querySelector('mark'); m.className = classFor(b.getAttribute('data-pen'), state.color);
        });
        tray.querySelectorAll('[data-color]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-color') === state.color)); });
        tray.querySelector('[data-act="erase"]').setAttribute('aria-pressed', String(eraser));
    }
    function placeTray() {
        const page = document.querySelector('.canvas-scrollbox') || ed;
        const r = page.getBoundingClientRect();
        tray.style.setProperty('--wa-top', Math.max(8, r.top + 8) + 'px');
    }

    /* ---------- Marking ---------- */
    const banned = function (n) { const el = n.nodeType === 1 ? n : n.parentNode; return !el || !el.closest || !!el.closest('.wo-toc, .wo-footnotes, .wo-fn-ref, .wo-merge, [contenteditable="false"]:not(#wysiwyg-canvas)') || !ed.contains(el); };
    function textNodesIn(range) {
        const out = [];
        const root = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return range.intersectsNode(n) && n.nodeValue.trim() && !banned(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
        let n;
        while ((n = w.nextNode())) out.push(n);
        return out;
    }
    function markRange(range) {
        if (range.collapsed) return 0;
        const nodes = textNodesIn(range);
        let count = 0;
        nodes.forEach(function (n) {
            let node = n, start = 0, end = n.nodeValue.length;
            if (n === range.startContainer) start = range.startOffset;
            if (n === range.endContainer) end = range.endOffset;
            if (end <= start) return;
            if (end < node.nodeValue.length) node.splitText(end);
            if (start > 0) node = node.splitText(start);
            const old = node.parentNode.closest && node.parentNode.closest(MARKS);
            if (old && old.textContent === node.nodeValue) { old.className = classFor(state.pen, state.color); count++; return; } // (re-pen a whole mark)
            const m = document.createElement('mark');
            m.className = classFor(state.pen, state.color);
            node.parentNode.insertBefore(m, node);
            m.appendChild(node);
            count++;
        });
        return count;
    }
    function unwrap(m) { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); m.remove(); p.normalize(); }
    function eraseRange(range) {
        let n = 0;
        [].slice.call(ed.querySelectorAll(MARKS)).forEach(function (m) { if (range.intersectsNode(m)) { unwrap(m); n++; } });
        return n;
    }
    function applyToSelection() {
        const s = window.getSelection();
        if (!s || !s.rangeCount || s.isCollapsed || !ed.contains(s.anchorNode)) return false;
        const r = s.getRangeAt(0);
        const n = eraser ? eraseRange(r) : markRange(r);
        if (n) { s.removeAllRanges(); save(); }
        return n > 0;
    }
    // with the tray open, letting go of a selection marks it right away (like a real highlighter)
    document.addEventListener('mouseup', function (e) {
        if (!on || tray.contains(e.target)) return;
        setTimeout(function () {
            if (applyToSelection()) return;
            if (eraser) { const m = e.target.closest && e.target.closest(MARKS); if (m && ed.contains(m)) { unwrap(m); save(); } }
        }, 0);
    });
    // keyboard selections: press M to mark (only while the tray is open and text is selected)
    document.addEventListener('keydown', function (e) {
        if (!on) return;
        if (e.key === 'Escape') { toggle(false); return; }
        const s = window.getSelection();
        if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && s && !s.isCollapsed && ed.contains(s.anchorNode)) { e.preventDefault(); applyToSelection(); }
    }, true);

    /* ---------- Notes + the list ---------- */
    function markAtCaret() {
        const s = window.getSelection();
        const n = s && s.rangeCount ? s.anchorNode : null;
        const el = n && (n.nodeType === 1 ? n : n.parentNode);
        return el && el.closest ? el.closest(MARKS) : null;
    }
    let lastMark = null;
    ed.addEventListener('click', function (e) { const m = e.target.closest && e.target.closest(MARKS); if (m) lastMark = m; });
    function note() {
        const m = markAtCaret() || (lastMark && ed.contains(lastMark) ? lastMark : null);
        if (!m) { toast('Click a mark first, then ✎ Note!'); return; }
        const box = document.createElement('div');
        box.innerHTML = '<p class="os-dlg-text" style="margin-top:0">On: <b>' + esc(m.textContent.slice(0, 80)) + '</b></p><label class="os-field"><span>Your note (empty removes it)</span><textarea class="os-dlg-input" id="wa-note" rows="3" style="resize:vertical"></textarea></label>';
        box.querySelector('#wa-note').value = m.getAttribute('data-note') || '';
        if (!OS) return;
        OS.dialog('Note', box, [{ label: 'Cancel', value: null }, { label: 'Save', primary: true, value: function (b) { return b.querySelector('#wa-note').value; } }]).then(function (v) {
            if (v === null || v === undefined) return;
            const t = String(v).trim().slice(0, 1000);
            if (t) { m.setAttribute('data-note', t); m.title = t; } else { m.removeAttribute('data-note'); m.removeAttribute('title'); }
            save();
            toast(t ? 'Note pinned! Hover the mark to read it!' : 'Note removed!');
        });
    }
    function list() {
        const marks = [].slice.call(ed.querySelectorAll(MARKS));
        if (!OS) return;
        if (!marks.length) { OS.dialog('Marks', '<p class="os-dlg-text">No marks yet! Pick a pen, then select some text!</p>'); return; }
        // marks that touch (a selection over several lines) are listed as one
        const groups = [];
        marks.forEach(function (m) {
            const g = groups[groups.length - 1];
            if (g && g.cls === m.className && g.last.nextSibling === null && g.last.parentNode.nextElementSibling && g.last.parentNode.nextElementSibling.contains(m)) { g.text += ' ' + m.textContent; g.last = m; return; }
            groups.push({ first: m, last: m, cls: m.className, text: m.textContent, note: m.getAttribute('data-note') || '' });
        });
        const box = document.createElement('div');
        box.innerHTML = '<div class="wa-list">' + groups.map(function (g, i) {
            const cl = ' ' + g.cls + ' ';
            const penId = / wa-hl /.test(cl) ? ((cl.match(/ wa-(marker|glow|lasso|ink) /) || [])[1] || 'marker') : / an-s-ul /.test(cl) ? 'ul' : / an-s-st /.test(cl) ? 'st' : 'strip';
            const pen = (PENS.find(function (p) { return p[0] === penId; }) || ['', 'Highlight'])[1];
            const col = ((cl.match(/ an-hl-([a-z]+) /) || [])[1]) || 'yellow';
            return '<button type="button" class="wa-item wa-c-' + col + '" data-i="' + i + '"><span class="wa-swatch"></span><span><b>' + esc(g.text.slice(0, 120)) + (g.text.length > 120 ? '…' : '') + '</b><br><small>' + esc(pen + ' · ' + col) + (g.note ? ' · ✎ ' + esc(g.note.slice(0, 80)) : '') + '</small></span></button>';
        }).join('') + '</div>';
        box.addEventListener('click', function (e) {
            const it = e.target.closest && e.target.closest('[data-i]');
            if (!it) return;
            const m = groups[+it.getAttribute('data-i')].first;
            m.scrollIntoView({ block: 'center', behavior: 'smooth' });
            m.classList.remove('wa-flash'); void m.offsetWidth; m.classList.add('wa-flash');
        });
        const summary = function () { return groups.map(function (g) { return '• ' + g.text + (g.note ? '  (' + g.note + ')' : ''); }).join('\n'); };
        OS.dialog('Marks (' + groups.length + ')', box, [
            { label: 'Copy as a list', keep: true, value: function () { try { navigator.clipboard.writeText(summary()); toast('Copied every mark as a list!'); } catch (e) { toast('Could not copy!'); } } },
            { label: 'Clear all marks', keep: true, value: function (b) {
                const btn = [].find.call(document.querySelectorAll('.os-dlg-btn'), function (x) { return /Clear all marks|Sure/.test(x.textContent); });
                if (btn && btn.textContent !== 'Sure? Click again') { btn.textContent = 'Sure? Click again'; return; }
                [].slice.call(ed.querySelectorAll(MARKS)).forEach(unwrap); save();
                toast('Every mark is gone!');
                b.innerHTML = '<p class="os-dlg-text">No marks left!</p>';
            } },
            { label: 'Close', value: null, primary: true }
        ]);
    }

    /* ---------- Turning it on and off ---------- */
    function toggle(force) {
        on = force === undefined ? !on : !!force;
        if (!on) eraser = false;
        tray.hidden = !on;
        if (on) { placeTray(); paintTray(); toast('Pick a pen and a color, then select text to mark it (or press M)! Esc closes the tray!'); }
        document.body.classList.toggle('wa-on', on);
        try { if (OS && OS.sync) OS.sync(); } catch (e) {}
    }
    window.addEventListener('resize', function () { if (on) placeTray(); });
    tray.addEventListener('click', function (e) {
        const b = e.target.closest && e.target.closest('button');
        if (!b) return;
        if (b.hasAttribute('data-pen')) { state.pen = b.getAttribute('data-pen'); eraser = false; keep(); paintTray(); applyToSelection(); return; }
        if (b.hasAttribute('data-color')) { state.color = b.getAttribute('data-color'); eraser = false; keep(); paintTray(); applyToSelection(); return; }
        const act = b.getAttribute('data-act');
        if (act === 'erase') { eraser = !eraser; paintTray(); if (eraser) applyToSelection(); }
        else if (act === 'note') note();
        else if (act === 'list') list();
        else if (act === 'done') toggle(false);
    });

    // marks made by the first Annotator (its own colors and pens) become the new ones
    function migrate() {
        let n = 0;
        [].slice.call(ed.querySelectorAll('mark.wa-hl')).forEach(function (m) {
            const c = (m.className.match(/wa-c-([a-z]+)/) || [])[1];
            if (!c) return;
            const p = (m.className.match(/wa-(marker|under|strike|wash|sticky|glow|lasso|ink)\b/) || [])[1] || 'strip';
            const pen = { under: 'ul', strike: 'st', wash: 'strip', sticky: 'strip' }[p] || p;
            m.className = classFor(pen, c);
            n++;
        });
        if (n) save();
    }
    setTimeout(migrate, 500);
    ed.addEventListener('input', function () { if (ed.querySelector('mark.wa-hl[class*="wa-c-"]')) migrate(); });

    window.WriteoutAnnotator = { toggle: function () { toggle(); }, isOn: function () { return on; }, list: list, pens: PENS.map(function (p) { return p[0]; }) };
})();
