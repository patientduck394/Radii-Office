/* =====================================================================
   Writeout Plus! What Word, Pages and LibreOffice Writer have that Writeout didn't:
     Headers & Footers   left / center / right text with page numbers (Page {page} of {pages}), shown on every page and printed
     Comments            a note pinned to selected text, with replies and a Resolve button, in a side pane
     Track Changes       typing shows as insertions, deleting as strike-throughs; accept or reject each change, or all of them
     Read Aloud          your document, spoken sentence by sentence (the sentence is highlighted as it goes)
     Format Painter      copy how some text looks and paint it onto other text
     Line Spacing        single, 1.5, double and more, plus space before and after paragraphs
     Drop Cap            a big first letter for a paragraph
     Watermark & Border  DRAFT / CONFIDENTIAL (or your own words) behind the text, and a page border
     Bookmarks           name a place, then link to it with a Cross-reference (text or page number)
     Citations           keep a list of sources, cite them (APA, MLA or Chicago) and build the bibliography
   Settings, comments and sources live inside the document itself (one hidden .wo-docmeta element), so saving,
   exporting and sharing keep them! Loaded after writeout-pro.js.
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed) return;
    const OS = window.OfficeShell || null;
    const toast = function (m) { try { if (OS) OS.toast(m); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const rid = function () { return Math.random().toString(36).slice(2, 9); };
    const save = function () { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} };
    const dialog = function (title, body, buttons, opts) { return OS ? OS.dialog(title, body, buttons, opts) : Promise.resolve(null); };
    const $ = function (id) { return document.getElementById(id); };
    const AUTHOR = (function () { try { return localStorage.getItem('writeout_author') || 'You'; } catch (e) { return 'You'; } })();

    /* ---------- the document's own settings (a hidden element at the end of the page) ---------- */
    const DEFAULTS = function () { return { hdr: { l: '', c: '', r: '' }, ftr: { l: '', c: '', r: '' }, diffFirst: false, wm: '', border: '', borderColor: '#475569', comments: [], showComments: false, sources: [], citeStyle: 'apa' }; };
    function metaEl(create) {
        let m = ed.querySelector(':scope > .wo-docmeta');
        if (!m && create) {
            m = document.createElement('div');
            m.className = 'wo-docmeta'; m.hidden = true; m.setAttribute('contenteditable', 'false');
            ed.appendChild(m);
        }
        return m;
    }
    function getS() {
        const m = metaEl(false), d = DEFAULTS();
        if (!m) return d;
        try { const s = JSON.parse(m.getAttribute('data-json') || '{}'); return Object.assign(d, s, { hdr: Object.assign(d.hdr, s.hdr || {}), ftr: Object.assign(d.ftr, s.ftr || {}) }); } catch (e) { return d; }
    }
    function setS(s, quiet) {
        metaEl(true).setAttribute('data-json', JSON.stringify(s));
        if (!quiet) save();
        decorate();
    }

    /* ---------- selection helpers ---------- */
    function curRange() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return null;
        const r = sel.getRangeAt(0);
        return ed.contains(r.commonAncestorContainer) ? r : null;
    }
    function restoreRange(r) {
        if (!r) return;
        try { ed.focus(); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) {}
    }
    const BLOCK = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE|TD|TH)$/;
    function blockOf(node) {
        let n = node && node.nodeType === 3 ? node.parentNode : node;
        while (n && n !== ed) { if (n.nodeType === 1 && BLOCK.test(n.tagName) && n.parentNode) return n; n = n.parentNode; }
        return null;
    }
    function blocksIn(range) {
        if (!range) return [];
        const out = [], first = blockOf(range.startContainer), last = blockOf(range.endContainer);
        if (!first) return [];
        if (first === last || !last) return [first];
        // every block between the first and the last (siblings at the same level, plus the ones inside them)
        const all = Array.from(ed.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre')).filter(function (b) { return !b.closest('.wo-docmeta, .wo-toc, .wo-footnotes, .wo-bib'); });
        let on = false;
        all.forEach(function (b) {
            if (b === first) on = true;
            if (on && !b.querySelector('p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre')) out.push(b);
            if (b === last) on = false;
        });
        return out.length ? out : [first];
    }

    /* ---------- styles ---------- */
    const css = document.createElement('style');
    css.textContent = [
        '.wo-docmeta{display:none!important}',
        // headers, footers, watermark, border (drawn on every page sheet)
        '.wo-hf{position:absolute;left:var(--wo-ms,60px);right:var(--wo-ms,60px);display:flex;gap:12px;font-size:11px;color:#475569;pointer-events:none;z-index:1;line-height:1.2}',
        '.wo-hf-h{top:calc(var(--wo-mt,60px) / 2 - 7px)}.wo-hf-f{bottom:calc(var(--wo-mb,60px) / 2 - 7px)}',
        '.wo-hf span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wo-hf .c{text-align:center}.wo-hf .r{text-align:right}',
        '.wo-wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;overflow:hidden}',
        '.wo-wm b{font-size:min(14vw,120px);font-weight:900;letter-spacing:.06em;color:rgba(100,116,139,.17);transform:rotate(-32deg);white-space:nowrap;user-select:none}',
        '.wo-pborder{position:absolute;inset:14px;pointer-events:none;z-index:1}',
        // comments
        '.wo-cmt{background:rgba(250,204,21,.38);border-bottom:2px solid rgba(202,138,4,.7);cursor:pointer}',
        '.wo-cmt.wo-cmt-done{background:rgba(148,163,184,.22);border-bottom-color:rgba(100,116,139,.5)}',
        '.wo-cmt.on{background:rgba(250,204,21,.7)}',
        '#wo-cmts{position:fixed;right:14px;top:128px;bottom:44px;width:290px;z-index:60;display:none;flex-direction:column;gap:8px;overflow:auto;padding:10px;border-radius:14px;background:linear-gradient(180deg,rgba(255,251,235,.97),rgba(254,243,199,.95));border:1px solid rgba(202,138,4,.5);box-shadow:0 12px 30px rgba(120,53,15,.25);font:13px/1.4 system-ui,sans-serif;color:#422006}',
        'body.wo-cmts-on #wo-cmts{display:flex}',
        '#wo-cmts h4{margin:0;display:flex;align-items:center;justify-content:space-between;font-size:14px;color:#78350f}',
        '.wo-c{background:#fff;border:1px solid rgba(202,138,4,.45);border-radius:10px;padding:8px 10px;box-shadow:0 2px 6px rgba(120,53,15,.12)}',
        '.wo-c.on{border-color:#d97706;box-shadow:0 0 0 2px rgba(217,119,6,.3)}.wo-c.done{opacity:.6}',
        '.wo-c-q{font-size:11px;color:#92400e;border-left:3px solid #fbbf24;padding-left:6px;margin-bottom:5px;font-style:italic;max-height:3.2em;overflow:hidden}',
        '.wo-c-who{font-weight:800;font-size:12px}.wo-c-when{font-size:10px;color:#a16207;margin-left:6px;font-weight:400}',
        '.wo-c-text{margin:3px 0;white-space:pre-wrap;word-break:break-word}',
        '.wo-c-rep{margin:5px 0 0 8px;padding-left:8px;border-left:2px solid #fde68a}',
        '.wo-c-act{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}',
        '.wo-c-act button,#wo-cmts h4 button{font:inherit;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;border:1px solid rgba(180,83,9,.5);background:#fff;color:#92400e;cursor:pointer}',
        '.wo-c-act button.danger{color:#b91c1c;border-color:rgba(220,38,38,.45)}',
        '.wo-c textarea{width:100%;box-sizing:border-box;font:inherit;font-size:12px;border:1px solid #fcd34d;border-radius:8px;padding:5px;margin-top:5px;resize:vertical}',
        '.wo-c-empty{color:#a16207;text-align:center;margin:20px 6px}',
        // track changes
        'ins.wo-ins{color:#1d4ed8;text-decoration:underline;text-decoration-color:rgba(29,78,216,.6);background:rgba(59,130,246,.1)}',
        'del.wo-del{color:#b91c1c;text-decoration:line-through;background:rgba(239,68,68,.09)}',
        'body.wo-tc-simple del.wo-del{display:none}body.wo-tc-simple ins.wo-ins{color:inherit;text-decoration:none;background:none}',
        'body.wo-tc-off del.wo-del,body.wo-tc-off ins.wo-ins{all:unset}body.wo-tc-off del.wo-del{display:none}',
        '#wo-tc-bar{position:fixed;left:50%;bottom:56px;transform:translateX(-50%);z-index:60;display:none;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:linear-gradient(180deg,#eff6ff,#dbeafe);border:1px solid rgba(37,99,235,.55);box-shadow:0 8px 22px rgba(30,64,175,.28);font:12px system-ui,sans-serif;color:#1e3a8a}',
        'body.wo-tc-on #wo-tc-bar{display:flex}#wo-tc-bar b{font-weight:800}',
        '#wo-tc-bar button,#wo-ra button{font:inherit;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid rgba(37,99,235,.5);background:#fff;color:#1d4ed8;cursor:pointer}',
        // read aloud
        '::highlight(wo-read){background-color:rgba(56,189,248,.45)}',
        '#wo-ra{position:fixed;left:50%;bottom:56px;transform:translateX(-50%);z-index:61;display:none;align-items:center;gap:9px;padding:7px 14px;border-radius:999px;background:linear-gradient(180deg,#f0f9ff,#bae6fd);border:1px solid rgba(2,132,199,.6);box-shadow:0 8px 22px rgba(3,105,161,.3);font:12px system-ui,sans-serif;color:#075985}',
        'body.wo-ra-on #wo-ra{display:flex}#wo-ra select,#wo-ra input{font:inherit;font-size:11px;border:1px solid rgba(2,132,199,.5);border-radius:8px;background:#fff;color:#075985;max-width:130px}#wo-ra button{border-color:rgba(2,132,199,.55);color:#0369a1}',
        // paragraph extras
        '.wo-dropcap{float:left;font-size:3.4em;line-height:.82;font-weight:800;padding:.04em .1em 0 0;color:#0369a1}',
        '.wo-bm{background:rgba(34,197,94,.14);border-bottom:2px dotted rgba(21,128,61,.7)}',
        'a.wo-xref{color:#0369a1;text-decoration:underline dotted;cursor:pointer}',
        '.wo-flash-x{animation:woFlashX 1.2s ease}@keyframes woFlashX{0%{background:rgba(250,204,21,.8)}100%{background:transparent}}',
        '.wo-cite{color:#0f172a;cursor:default}',
        '.wo-bib{margin:18px 0;padding-top:8px;border-top:2px solid rgba(15,23,42,.18)}',
        '.wo-bib-head{font-weight:800;font-size:1.15em;margin-bottom:6px}',
        '.wo-bib ol{list-style:none;margin:0;padding:0}.wo-bib li{margin:5px 0 5px 2em;text-indent:-2em;line-height:1.5}',
        '.wo-pdlg label{display:block;font-size:12px;font-weight:700;margin:8px 0 3px;color:#334155}',
        '.wo-pdlg input[type=text],.wo-pdlg select,.wo-pdlg textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px;padding:6px 8px;border-radius:8px;border:1px solid rgba(2,132,199,.45)}',
        '.wo-pdlg .row{display:flex;gap:8px}.wo-pdlg .row>*{flex:1}.wo-pdlg .chk{display:flex;gap:6px;align-items:center;font-weight:600;margin-top:8px}',
        '.wo-pdlg .src{display:flex;align-items:center;gap:8px;padding:6px 9px;border:1px solid rgba(148,163,184,.45);border-radius:8px;margin:4px 0;font-size:12px}.wo-pdlg .src span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.wo-pdlg .mini{font:inherit;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid rgba(2,132,199,.45);background:#fff;color:#0369a1;cursor:pointer}',
        '.wo-pdlg .tok{font-size:11px;color:#64748b;margin-top:6px}',
        '@media print{#wo-cmts,#wo-tc-bar,#wo-ra{display:none!important}.wo-cmt{background:none;border:0}}',
    ].join('\n');
    document.head.appendChild(css);

    /* ==================================================================
       HEADERS & FOOTERS, WATERMARK, PAGE BORDER (drawn on every page sheet)
       ================================================================== */
    function docTitle() {
        const t = $('doc-title') || document.querySelector('.os-title, #title-input, .wo-title');
        const v = t && (t.value || t.textContent);
        return (v && v.trim()) || document.title.replace(/\s*[-–|].*$/, '') || 'Document';
    }
    function fill(text, page, pages) {
        return String(text || '').replace(/\{page\}/gi, page).replace(/\{pages\}/gi, pages).replace(/\{title\}/gi, docTitle()).replace(/\{date\}/gi, new Date().toLocaleDateString());
    }
    let decorating = false;
    function decorate() {
        if (decorating) return;
        const sheets = $('wo-sheets');
        if (!sheets) return;
        decorating = true;
        try {
            const S = getS();
            const list = Array.from(sheets.querySelectorAll('.wo-sheet'));
            const n = list.length || 1;
            const has = function (o) { return !!(o.l || o.c || o.r); };
            list.forEach(function (sh, i) {
                sh.querySelectorAll('.wo-hf, .wo-wm, .wo-pborder').forEach(function (x) { x.remove(); });
                const skip = S.diffFirst && i === 0;
                [['hdr', 'wo-hf-h'], ['ftr', 'wo-hf-f']].forEach(function (k) {
                    const o = S[k[0]];
                    if (!has(o) || skip) return;
                    const d = document.createElement('div');
                    d.className = 'wo-hf ' + k[1];
                    d.innerHTML = ['l', 'c', 'r'].map(function (s) { return '<span class="' + s + '">' + esc(fill(o[s], i + 1, n)) + '</span>'; }).join('');
                    sh.appendChild(d);
                });
                if (S.wm) { const w = document.createElement('div'); w.className = 'wo-wm'; w.innerHTML = '<b>' + esc(S.wm) + '</b>'; sh.insertBefore(w, sh.firstChild); }
                if (S.border) {
                    const b = document.createElement('div'); b.className = 'wo-pborder';
                    const c = S.borderColor || '#475569';
                    b.style.border = S.border === 'double' ? '4px double ' + c : (S.border === 'thick' ? '3px solid ' + c : '1.5px solid ' + c);
                    if (S.border === 'shadow') b.style.boxShadow = '3px 3px 0 ' + c;
                    sh.appendChild(b);
                }
            });
            printStyle(S);
        } finally { decorating = false; }
    }
    // printing: the browser's own page boxes carry the header, footer and watermark
    function cssStr(text) {
        const parts = String(text || '').split(/(\{page\}|\{pages\})/i).filter(Boolean);
        return parts.map(function (p) {
            if (/^\{page\}$/i.test(p)) return 'counter(page)';
            if (/^\{pages\}$/i.test(p)) return 'counter(pages)';
            return '"' + fill(p, '', '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';
        }).join(' ') || '""';
    }
    function printStyle(S) {
        let st = $('wo-print-hf');
        if (!st) { st = document.createElement('style'); st.id = 'wo-print-hf'; document.head.appendChild(st); }
        const box = function (name, text) { return text ? '@' + name + ' { content: ' + cssStr(text) + '; font: 9pt system-ui, sans-serif; color: #475569; }' : ''; };
        let r = '@media print { @page { ' + box('top-left', S.hdr.l) + box('top-center', S.hdr.c) + box('top-right', S.hdr.r) + box('bottom-left', S.ftr.l) + box('bottom-center', S.ftr.c) + box('bottom-right', S.ftr.r) + ' }';
        if (S.wm) r += ' #wysiwyg-canvas::before { content: ' + JSON.stringify(S.wm) + '; position: fixed; top: 42%; left: 8%; right: 8%; text-align: center; font-size: 110px; font-weight: 900; color: rgba(100,116,139,.16); transform: rotate(-32deg); z-index: 0; pointer-events: none; }';
        st.textContent = r + ' }';
    }
    async function headerFooterDialog() {
        const S = getS();
        const box = document.createElement('div');
        box.className = 'wo-pdlg';
        const field = function (id, label, v) { return '<div><label>' + label + '</label><input type="text" id="' + id + '" value="' + esc(v) + '" spellcheck="false"></div>'; };
        box.innerHTML = '<p class="os-dlg-text" style="margin:0">Type text for the top and bottom of every page. Use <b>{page}</b>, <b>{pages}</b>, <b>{title}</b> and <b>{date}</b>!</p>' +
            '<label>Header</label><div class="row">' + field('hf-hl', 'Left', S.hdr.l) + field('hf-hc', 'Center', S.hdr.c) + field('hf-hr', 'Right', S.hdr.r) + '</div>' +
            '<label>Footer</label><div class="row">' + field('hf-fl', 'Left', S.ftr.l) + field('hf-fc', 'Center', S.ftr.c) + field('hf-fr', 'Right', S.ftr.r) + '</div>' +
            '<label class="chk"><input type="checkbox" id="hf-first"' + (S.diffFirst ? ' checked' : '') + '> Different first page (no header or footer on page 1)</label>' +
            '<div class="tok"><button type="button" class="mini" data-fill="footer">Footer: Page {page} of {pages}</button> <button type="button" class="mini" data-fill="clear">Clear all</button></div>';
        box.addEventListener('click', function (e) {
            const b = e.target.closest && e.target.closest('[data-fill]');
            if (!b) return;
            if (b.dataset.fill === 'footer') box.querySelector('#hf-fc').value = 'Page {page} of {pages}';
            else box.querySelectorAll('input[type=text]').forEach(function (i) { i.value = ''; });
        });
        const r = await dialog('Header & Footer', box, [{ label: 'Cancel', value: null }, { label: 'OK', value: function (b) { return { h: ['l', 'c', 'r'].map(function (k) { return b.querySelector('#hf-h' + k).value; }), f: ['l', 'c', 'r'].map(function (k) { return b.querySelector('#hf-f' + k).value; }), first: b.querySelector('#hf-first').checked }; }, primary: true }]);
        if (!r) return;
        const s = getS();
        s.hdr = { l: r.h[0], c: r.h[1], r: r.h[2] }; s.ftr = { l: r.f[0], c: r.f[1], r: r.f[2] }; s.diffFirst = r.first;
        setS(s);
        toast((r.h.concat(r.f).some(Boolean)) ? 'Header & footer set!' : 'Header & footer cleared!');
    }
    function watermarkMenu() {
        const S = getS();
        const set = function (t) { const s = getS(); s.wm = t; setS(s); toast(t ? 'Watermark set!' : 'Watermark removed!'); };
        return [
            { label: 'DRAFT', icon: 'pen', checked: S.wm === 'DRAFT', run: function () { set('DRAFT'); } },
            { label: 'CONFIDENTIAL', icon: 'lock', checked: S.wm === 'CONFIDENTIAL', run: function () { set('CONFIDENTIAL'); } },
            { label: 'SAMPLE', icon: 'tag', checked: S.wm === 'SAMPLE', run: function () { set('SAMPLE'); } },
            { label: 'DO NOT COPY', icon: 'x', checked: S.wm === 'DO NOT COPY', run: function () { set('DO NOT COPY'); } },
            { label: 'Custom text…', icon: 'font', run: function () { if (OS) OS.prompt('Watermark', 'Text behind every page', S.wm || '').then(function (t) { if (t !== null && t !== undefined) set(String(t).trim().slice(0, 30)); }); } },
            { sep: true },
            { label: 'Remove Watermark', icon: 'trash', run: function () { set(''); } }
        ];
    }
    function borderMenu() {
        const S = getS();
        const set = function (b) { const s = getS(); s.border = b; setS(s); toast(b ? 'Page border set!' : 'Page border removed!'); };
        const colors = [['#475569', 'Slate'], ['#0369a1', 'Sky'], ['#b45309', 'Amber'], ['#15803d', 'Green'], ['#be123c', 'Rose']];
        return [
            { label: 'None', checked: !S.border, run: function () { set(''); } },
            { label: 'Box', checked: S.border === 'box', run: function () { set('box'); } },
            { label: 'Thick Box', checked: S.border === 'thick', run: function () { set('thick'); } },
            { label: 'Double Line', checked: S.border === 'double', run: function () { set('double'); } },
            { label: 'Shadow Box', checked: S.border === 'shadow', run: function () { set('shadow'); } },
            { sep: true },
            { header: 'Color' }
        ].concat(colors.map(function (c) { return { label: c[1], checked: S.borderColor === c[0], run: function () { const s = getS(); s.borderColor = c[0]; if (!s.border) s.border = 'box'; setS(s); } }; }));
    }

    /* ==================================================================
       COMMENTS
       ================================================================== */
    let activeCmt = null;
    function ago(ts) {
        const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
        if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago';
        return new Date(ts).toLocaleDateString();
    }
    function anchorText(id) { const a = ed.querySelector('.wo-cmt[data-cid="' + id + '"]'); return a ? a.textContent : ''; }
    function renderComments() {
        let pane = $('wo-cmts');
        const S = getS();
        if (!pane) {
            pane = document.createElement('div'); pane.id = 'wo-cmts'; document.body.appendChild(pane);
            pane.addEventListener('click', function (e) {
                const b = e.target.closest && e.target.closest('[data-a]');
                const card = e.target.closest && e.target.closest('.wo-c');
                if (card && !b) { focusComment(card.dataset.id); return; }
                if (!b || !card) { if (b && b.dataset.a === 'close') showComments(false); return; }
                const s = getS(), c = s.comments.find(function (x) { return x.id === card.dataset.id; });
                if (!c) return;
                if (b.dataset.a === 'resolve') { c.resolved = !c.resolved; const a = ed.querySelector('.wo-cmt[data-cid="' + c.id + '"]'); if (a) a.classList.toggle('wo-cmt-done', c.resolved); setS(s); }
                else if (b.dataset.a === 'delete') { removeComment(c.id); }
                else if (b.dataset.a === 'reply') { const t = card.querySelector('textarea'); const v = t && t.value.trim(); if (v) { c.replies = (c.replies || []).concat([{ who: AUTHOR, ts: Date.now(), text: v }]); setS(s); } else if (t) t.focus(); }
            });
        }
        const live = S.comments;
        pane.innerHTML = '<h4><span>Comments (' + live.filter(function (c) { return !c.resolved; }).length + ')</span><button type="button" data-a="close">Close</button></h4>' +
            (live.length ? live.map(function (c) {
                const q = anchorText(c.id);
                return '<div class="wo-c' + (c.resolved ? ' done' : '') + (activeCmt === c.id ? ' on' : '') + '" data-id="' + c.id + '">' +
                    (q ? '<div class="wo-c-q">' + esc(q) + '</div>' : '<div class="wo-c-q">(the text was deleted)</div>') +
                    '<div><span class="wo-c-who">' + esc(c.who) + '</span><span class="wo-c-when">' + ago(c.ts) + (c.resolved ? ' · resolved' : '') + '</span></div><div class="wo-c-text">' + esc(c.text) + '</div>' +
                    (c.replies || []).map(function (r) { return '<div class="wo-c-rep"><span class="wo-c-who">' + esc(r.who) + '</span><span class="wo-c-when">' + ago(r.ts) + '</span><div class="wo-c-text">' + esc(r.text) + '</div></div>'; }).join('') +
                    '<textarea rows="1" placeholder="Reply…"></textarea><div class="wo-c-act"><button type="button" data-a="reply">Reply</button><button type="button" data-a="resolve">' + (c.resolved ? 'Reopen' : 'Resolve') + '</button><button type="button" class="danger" data-a="delete">Delete</button></div></div>';
            }).join('') : '<div class="wo-c-empty">No comments yet! Select some text, then press New Comment!</div>');
        document.body.classList.toggle('wo-cmts-on', !!S.showComments);
    }
    function showComments(on) { const s = getS(); s.showComments = !!on; setS(s, true); renderComments(); }
    function focusComment(id) {
        activeCmt = id;
        ed.querySelectorAll('.wo-cmt').forEach(function (a) { a.classList.toggle('on', a.dataset.cid === id); });
        const a = ed.querySelector('.wo-cmt[data-cid="' + id + '"]');
        if (a && a.scrollIntoView) a.scrollIntoView({ block: 'center', behavior: 'smooth' });
        renderComments();
    }
    function removeComment(id) {
        const a = ed.querySelector('.wo-cmt[data-cid="' + id + '"]');
        if (a) { const p = a.parentNode; while (a.firstChild) p.insertBefore(a.firstChild, a); a.remove(); p.normalize(); }
        const s = getS(); s.comments = s.comments.filter(function (c) { return c.id !== id; }); setS(s);
        renderComments();
    }
    async function newComment() {
        const r = curRange();
        if (!r || r.collapsed) { toast('Select some text to comment on first!'); return; }
        const saved = r.cloneRange();
        const box = document.createElement('div'); box.className = 'wo-pdlg';
        box.innerHTML = '<label>Comment on “' + esc(String(saved).slice(0, 80)) + '”</label><textarea id="wo-cm-text" rows="4" placeholder="Write your comment…"></textarea>';
        const text = await dialog('New Comment', box, [{ label: 'Cancel', value: null }, { label: 'Add Comment', value: function (b) { return b.querySelector('#wo-cm-text').value.trim() || null; }, primary: true }]);
        if (!text) return;
        restoreRange(saved);
        const range = curRange() || saved, id = rid();
        // wrap each text piece of the selection so the anchor survives across paragraphs
        wrapRange(range, function () { const s = document.createElement('span'); s.className = 'wo-cmt'; s.setAttribute('data-cid', id); return s; });
        const s = getS(); s.comments.push({ id: id, who: AUTHOR, ts: Date.now(), text: text, resolved: false, replies: [] }); s.showComments = true; setS(s);
        activeCmt = id; renderComments(); toast('Comment added!');
    }
    // wraps the text inside a range, piece by piece (every text node gets its own wrapper), keeping the structure
    function wrapRange(range, make) {
        const root = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
        const nodes = [];
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) { if (range.intersectsNode(n) && n.nodeValue !== '') nodes.push(n); }
        if (!nodes.length && range.commonAncestorContainer.nodeType === 3) nodes.push(range.commonAncestorContainer);
        const wrappers = [];
        nodes.forEach(function (n) {
            let a = 0, b = n.nodeValue.length;
            if (n === range.startContainer) a = range.startOffset;
            if (n === range.endContainer) b = range.endOffset;
            if (b <= a) return;
            let mid = n;
            if (b < n.nodeValue.length) n.splitText(b);
            if (a > 0) mid = n.splitText(a);
            const el = make(); mid.parentNode.insertBefore(el, mid); el.appendChild(mid); wrappers.push(el);
        });
        return wrappers;
    }
    ed.addEventListener('click', function (e) {
        const a = e.target.closest && e.target.closest('.wo-cmt');
        if (a) { const s = getS(); s.showComments = true; setS(s, true); focusComment(a.dataset.cid); }
        const x = e.target.closest && e.target.closest('a.wo-xref');
        if (x) { e.preventDefault(); goBookmark(x.getAttribute('data-xref')); }
    });

    /* ==================================================================
       TRACK CHANGES
       ================================================================== */
    let tracking = false;
    function setTracking(on) {
        tracking = !!on;
        document.body.classList.toggle('wo-tc-on', tracking);
        toast(tracking ? 'Track Changes is on! Your edits are marked!' : 'Track Changes is off!');
        if (OS) OS.sync();
    }
    const ownIns = function (node) { const el = node && (node.nodeType === 1 ? node : node.parentElement); return el ? el.closest('ins.wo-ins') : null; };
    const stamp = function (tag) { const e = document.createElement(tag); e.className = tag === 'ins' ? 'wo-ins' : 'wo-del'; e.setAttribute('data-a', AUTHOR); e.setAttribute('data-t', String(Date.now())); return e; };
    // the selected text becomes struck-through "deleted" text (text you typed yourself is just removed)
    function markDeleted(range) {
        const frag = range.cloneContents();
        const holder = document.createElement('div'); holder.appendChild(frag);
        const w = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT); const texts = [];
        for (let n = w.nextNode(); n; n = w.nextNode()) texts.push(n);
        const startIns = ownIns(range.startContainer), endIns = ownIns(range.endContainer);
        texts.forEach(function (n) {
            if (!n.nodeValue) return;
            if (n.parentNode.closest && n.parentNode.closest('del.wo-del')) return;
            if (n.parentNode.closest && n.parentNode.closest('ins.wo-ins') && (startIns || endIns)) { n.remove(); return; }
            const d = stamp('del'); n.parentNode.insertBefore(d, n); d.appendChild(n);
        });
        const html = holder.innerHTML;
        const stampT = Date.now();
        document.execCommand('insertHTML', false, html);
        // caret goes just before the deleted text
        const dels = ed.querySelectorAll('del.wo-del'); let first = null;
        dels.forEach(function (d) { if (!first && Number(d.getAttribute('data-t')) >= stampT - 2000) first = d; });
        if (first) { const r = document.createRange(); r.setStartBefore(first); r.collapse(true); restoreRange(r); }
    }
    function typeInsert(text) {
        const sel = window.getSelection();
        if (!text) return;
        const n = sel.anchorNode, off = sel.anchorOffset;
        let ins = ownIns(n);
        if (!ins && n) {
            // right after a change I made: type inside it
            let prev = null;
            if (n.nodeType === 3 && off === 0) prev = n.previousSibling;
            else if (n.nodeType === 1 && off > 0) prev = n.childNodes[off - 1];
            if (prev && prev.nodeType === 1 && prev.matches && prev.matches('ins.wo-ins')) {
                const last = prev.lastChild && prev.lastChild.nodeType === 3 ? prev.lastChild : prev.appendChild(document.createTextNode(''));
                const r = document.createRange(); r.setStart(last, last.nodeValue.length); r.collapse(true); restoreRange(r); ins = prev;
            }
        }
        if (ins) { document.execCommand('insertText', false, text); return; }
        const e = stamp('ins'); e.innerHTML = esc(text).replace(/\n/g, '<br>');
        document.execCommand('insertHTML', false, e.outerHTML);
    }
    ed.addEventListener('beforeinput', function (e) {
        if (!tracking) return;
        const sel = window.getSelection();
        if (!sel.rangeCount || !ed.contains(sel.anchorNode)) return;
        const t = e.inputType || '';
        if (/^(insertText|insertReplacementText|insertFromPaste|insertFromDrop)$/.test(t)) {
            const text = e.data != null ? e.data : (e.dataTransfer ? e.dataTransfer.getData('text/plain') : '');
            e.preventDefault();
            if (!sel.isCollapsed) markDeleted(sel.getRangeAt(0));
            typeInsert(text);
            return;
        }
        if (/^delete/.test(t)) {
            if (!sel.isCollapsed) { e.preventDefault(); markDeleted(sel.getRangeAt(0)); return; }
            const back = !/Forward/.test(t), unit = /Word/.test(t) ? 'word' : /Line|Hard/.test(t) ? 'lineboundary' : 'character';
            const n = sel.anchorNode, off = sel.anchorOffset;
            if (ownIns(n) && n.nodeType === 3 && (back ? off > 0 : off < n.nodeValue.length)) return;   // your own typing just goes away
            e.preventDefault();
            sel.modify('extend', back ? 'backward' : 'forward', unit);
            if (sel.isCollapsed) return;
            markDeleted(sel.getRangeAt(0));
        }
    }, true);
    function changes() { return Array.from(ed.querySelectorAll('ins.wo-ins, del.wo-del')); }
    function unwrap(el) { const p = el.parentNode; if (!p) return; while (el.firstChild) p.insertBefore(el.firstChild, el); el.remove(); p.normalize(); }
    function resolve(el, accept) {
        if (el.matches('ins.wo-ins')) { if (accept) unwrap(el); else el.remove(); }
        else if (accept) el.remove(); else unwrap(el);
    }
    function acceptAll(accept) {
        const list = changes();
        if (!list.length) { toast('No tracked changes!'); return; }
        list.forEach(function (el) { resolve(el, accept); });
        save(); toast(list.length + (list.length === 1 ? ' change ' : ' changes ') + (accept ? 'accepted!' : 'rejected!'));
    }
    let tcAt = -1;
    function gotoChange(dir) {
        const list = changes();
        if (!list.length) { toast('No tracked changes!'); return null; }
        tcAt = (tcAt + dir + list.length) % list.length;
        const el = list[tcAt];
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('wo-flash-x'); setTimeout(function () { el.classList.remove('wo-flash-x'); }, 1300);
        const r = document.createRange(); r.selectNode(el); restoreRange(r);
        return el;
    }
    function actOnCurrent(accept) {
        const sel = window.getSelection(); let el = null;
        if (sel.rangeCount) { const n = sel.getRangeAt(0).commonAncestorContainer; const base = n.nodeType === 3 ? n.parentElement : n; el = base && base.closest ? base.closest('ins.wo-ins, del.wo-del') : null; if (!el && base && base.matches && base.matches('ins.wo-ins, del.wo-del')) el = base; if (!el && !sel.isCollapsed) { const r = sel.getRangeAt(0); el = changes().find(function (c) { return r.intersectsNode(c); }) || null; } }
        if (!el) { el = gotoChange(1); if (!el) return; toast('Selected the next change: press Accept or Reject again!'); return; }
        resolve(el, accept); save(); gotoChange(0 === 0 ? 0 : 0);
    }
    function showMarkup(mode) { document.body.classList.toggle('wo-tc-simple', mode === 'simple'); document.body.classList.toggle('wo-tc-off', mode === 'none'); }
    (function buildTcBar() {
        const bar = document.createElement('div'); bar.id = 'wo-tc-bar';
        bar.innerHTML = '<b>Tracking changes</b><button type="button" data-a="prev">◀ Previous</button><button type="button" data-a="next">Next ▶</button><button type="button" data-a="accept">✓ Accept</button><button type="button" data-a="reject">✕ Reject</button><button type="button" data-a="all">Accept all</button><button type="button" data-a="off">Turn off</button>';
        bar.addEventListener('mousedown', function (e) { e.preventDefault(); });
        bar.addEventListener('click', function (e) {
            const b = e.target.closest && e.target.closest('[data-a]'); if (!b) return;
            ({ prev: function () { gotoChange(-1); }, next: function () { gotoChange(1); }, accept: function () { actOnCurrent(true); }, reject: function () { actOnCurrent(false); }, all: function () { acceptAll(true); }, off: function () { setTracking(false); } })[b.dataset.a]();
        });
        document.body.appendChild(bar);
    })();

    /* ==================================================================
       READ ALOUD
       ================================================================== */
    let ra = null;
    function textMap() {
        const map = [], w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return n.parentElement && n.parentElement.closest('.wo-docmeta, del.wo-del, script, style, .wo-bib-skip') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
        let text = '';
        for (let n = w.nextNode(); n; n = w.nextNode()) {
            const t = n.nodeValue; if (!t) continue;
            const blockBreak = map.length && blockOf(n) !== map[map.length - 1].block;
            if (blockBreak) text += '\n';
            map.push({ node: n, start: text.length, end: text.length + t.length, block: blockOf(n) });
            text += t;
        }
        return { text: text, map: map };
    }
    function offsetOf(map, node, off) { for (let i = 0; i < map.length; i++) if (map[i].node === node) return map[i].start + off; return -1; }
    function rangeOf(map, a, b) {
        const r = document.createRange(); let sOk = false;
        for (let i = 0; i < map.length; i++) {
            const m = map[i];
            if (!sOk && a < m.end) { r.setStart(m.node, Math.max(0, a - m.start)); sOk = true; }
            if (sOk && b <= m.end) { r.setEnd(m.node, Math.max(0, b - m.start)); return r; }
        }
        return sOk ? r : null;
    }
    function sentenceSpans(text, from, to) {
        const spans = [], re = /[^.!?\n]+[.!?]*[)"'”]*|\n+/g; let m;
        re.lastIndex = from;
        while ((m = re.exec(text)) && m.index < to) { const t = m[0]; if (t.trim()) spans.push([m.index, Math.min(m.index + t.length, to)]); }
        return spans;
    }
    function readAloud() {
        if (!('speechSynthesis' in window)) { toast('This browser cannot read aloud!'); return; }
        stopRead(true);
        const tm = textMap(), sel = window.getSelection();
        let from = 0, to = tm.text.length;
        if (sel.rangeCount && ed.contains(sel.anchorNode)) {
            const r = sel.getRangeAt(0), a = offsetOf(tm.map, r.startContainer, r.startOffset), b = offsetOf(tm.map, r.endContainer, r.endOffset);
            if (a >= 0) from = a;
            if (!r.collapsed && b > a && b >= 0) to = b;
        }
        const spans = sentenceSpans(tm.text, from, to);
        if (!spans.length) { toast('Nothing to read yet!'); return; }
        ra = { tm: tm, spans: spans, i: 0, paused: false, rate: 1, voice: '', gen: 0 };
        document.body.classList.add('wo-ra-on'); drawRaBar();
        speakNext(0);
    }
    function speakNext(gen) {
        if (!ra || gen !== ra.gen) return;
        if (ra.i >= ra.spans.length) { stopRead(); toast('Finished reading!'); return; }
        const sp = ra.spans[ra.i], text = ra.tm.text.slice(sp[0], sp[1]).replace(/\s+/g, ' ').trim();
        try { const r = rangeOf(ra.tm.map, sp[0], sp[1]); if (r && window.CSS && CSS.highlights && window.Highlight) CSS.highlights.set('wo-read', new Highlight(r)); } catch (e) {}
        const u = new SpeechSynthesisUtterance(text);
        u.rate = ra.rate;
        if (ra.voice) { const v = speechSynthesis.getVoices().find(function (x) { return x.name === ra.voice; }); if (v) u.voice = v; }
        const next = function () { if (ra && gen === ra.gen) { ra.i++; speakNext(gen); } };
        u.onend = next; u.onerror = function (e) { if (e && e.error === 'interrupted') return; next(); };
        speechSynthesis.speak(u);
    }
    function stopRead(quiet) {
        if (ra) ra.gen++;
        try { speechSynthesis.cancel(); } catch (e) {}
        ra = null;
        try { if (window.CSS && CSS.highlights) CSS.highlights.delete('wo-read'); } catch (e) {}
        document.body.classList.remove('wo-ra-on');
    }
    function pauseRead() { if (!ra) return; try { if (ra.paused) { speechSynthesis.resume(); } else speechSynthesis.pause(); } catch (e) {} ra.paused = !ra.paused; drawRaBar(); }
    function drawRaBar() {
        let bar = $('wo-ra');
        if (!bar) {
            bar = document.createElement('div'); bar.id = 'wo-ra';
            bar.addEventListener('mousedown', function (e) { if (!e.target.closest('select,input')) e.preventDefault(); });
            bar.addEventListener('click', function (e) { const b = e.target.closest && e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'pause') pauseRead(); else if (b.dataset.a === 'stop') stopRead(); else if (b.dataset.a === 'skip' && ra) { ra.gen++; speechSynthesis.cancel(); ra.i++; speakNext(ra.gen); } else if (b.dataset.a === 'back' && ra) { ra.gen++; speechSynthesis.cancel(); ra.i = Math.max(0, ra.i - 1); speakNext(ra.gen); } });
            bar.addEventListener('change', function (e) { if (!ra) return; if (e.target.id === 'wo-ra-rate') { ra.rate = Number(e.target.value); } if (e.target.id === 'wo-ra-voice') { ra.voice = e.target.value; } ra.gen++; speechSynthesis.cancel(); speakNext(ra.gen); });
            document.body.appendChild(bar);
        }
        const voices = (function () { try { return speechSynthesis.getVoices(); } catch (e) { return []; } })();
        bar.innerHTML = '<b>Reading aloud</b><button type="button" data-a="back">⏮</button><button type="button" data-a="pause">' + (ra && ra.paused ? '▶ Resume' : '⏸ Pause') + '</button><button type="button" data-a="skip">⏭</button><button type="button" data-a="stop">⏹ Stop</button>' +
            '<label>Speed <input id="wo-ra-rate" type="range" min="0.6" max="2" step="0.1" value="' + (ra ? ra.rate : 1) + '"></label>' + (voices.length ? '<select id="wo-ra-voice"><option value="">Default voice</option>' + voices.map(function (v) { return '<option' + (ra && ra.voice === v.name ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('') + '</select>' : '');
    }
    if ('speechSynthesis' in window) { try { speechSynthesis.onvoiceschanged = function () { if (ra) drawRaBar(); }; } catch (e) {} }

    /* ==================================================================
       FORMAT PAINTER
       ================================================================== */
    let painter = null;
    function formatPainter() {
        const r = curRange();
        if (!r) { toast('Click in the text you want to copy the look of!'); return; }
        const n = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer;
        const cs = getComputedStyle(n);
        painter = { w: cs.fontWeight, i: cs.fontStyle, td: cs.textDecorationLine || cs.textDecoration, c: cs.color, bg: cs.backgroundColor, ff: cs.fontFamily, fs: cs.fontSize };
        document.body.style.cursor = 'copy';
        toast('Now select the text to paint!');
        const apply = function () {
            document.removeEventListener('mouseup', onUp, true); document.body.style.cursor = '';
            const rr = curRange(); if (!painter || !rr || rr.collapsed) { painter = null; return; }
            const p = painter; painter = null;
            const holder = document.createElement('div'); holder.appendChild(rr.cloneContents());
            const bold = Number(p.w) >= 600 || p.w === 'bold';
            const style = 'font-weight:' + (bold ? 700 : 400) + ';font-style:' + (p.i === 'italic' ? 'italic' : 'normal') + ';text-decoration:' + (/underline/.test(p.td) ? 'underline' : /line-through/.test(p.td) ? 'line-through' : 'none') + ';color:' + p.c + ';font-family:' + p.ff.replace(/"/g, "'") + ';font-size:' + p.fs + (p.bg && p.bg !== 'rgba(0, 0, 0, 0)' ? ';background-color:' + p.bg : '');
            document.execCommand('insertHTML', false, '<span style="' + style + '">' + holder.innerHTML + '</span>');
            save(); toast('Formatting painted!');
        };
        const onUp = function () { setTimeout(apply, 0); };
        document.addEventListener('mouseup', onUp, true);
        formatPainter.apply = apply;
    }

    /* ==================================================================
       LINE SPACING & DROP CAP
       ================================================================== */
    function lineSpacingMenu() {
        const r = curRange(), blocks = blocksIn(r);
        const cur = blocks[0] ? parseFloat(blocks[0].style.lineHeight) || 0 : 0;
        const set = function (v) { const b = blocksIn(curRange() || r); if (!b.length) { toast('Click in a paragraph first!'); return; } b.forEach(function (x) { if (v) x.style.lineHeight = String(v); else x.style.removeProperty('line-height'); }); save(); toast(v ? 'Line spacing ' + v + '!' : 'Line spacing reset!'); if (OS) OS.sync(); };
        const sp = function (side, px) { const b = blocksIn(curRange() || r); if (!b.length) { toast('Click in a paragraph first!'); return; } b.forEach(function (x) { x.style[side === 'before' ? 'marginTop' : 'marginBottom'] = px + 'px'; }); save(); toast('Space ' + side + ' paragraph: ' + px + 'px!'); };
        const L = [['1.0', 1], ['1.15', 1.15], ['1.5', 1.5], ['2.0', 2], ['2.5', 2.5], ['3.0', 3]].map(function (x) { return { label: x[0], checked: cur === x[1], run: function () { set(x[1]); } }; });
        return L.concat([{ sep: true }, { label: 'Default spacing', run: function () { set(0); } }, { sep: true },
            { label: 'Add space before paragraph', run: function () { sp('before', 12); } }, { label: 'Remove space before', run: function () { sp('before', 0); } },
            { label: 'Add space after paragraph', run: function () { sp('after', 12); } }, { label: 'Remove space after', run: function () { sp('after', 0); } }]);
    }
    function dropCapMenu() {
        return [
            { label: 'None', run: function () { dropCap(false); } },
            { label: 'Dropped letter', run: function () { dropCap(true); } }
        ];
    }
    function dropCap(on) {
        const b = blockOf((curRange() || {}).startContainer);
        if (!b) { toast('Click in a paragraph first!'); return; }
        const had = b.querySelector(':scope > .wo-dropcap');
        if (!on) { if (had) { const p = had.parentNode; p.insertBefore(document.createTextNode(had.textContent), had); had.remove(); p.normalize(); save(); toast('Drop cap removed!'); } return; }
        if (had) return;
        const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n = w.nextNode();
        while (n && !n.nodeValue.trim()) n = w.nextNode();
        if (!n) { toast('That paragraph is empty!'); return; }
        const t = n.nodeValue, i = t.search(/\S/);
        const span = document.createElement('span'); span.className = 'wo-dropcap'; span.textContent = t[i];
        const after = document.createTextNode(t.slice(i + 1)); n.nodeValue = t.slice(0, i);
        n.parentNode.insertBefore(span, n.nextSibling); span.parentNode.insertBefore(after, span.nextSibling);
        save(); toast('Drop cap added!');
    }

    /* ==================================================================
       BOOKMARKS & CROSS-REFERENCES
       ================================================================== */
    const slug = function (s) { return String(s).trim().replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40); };
    function bookmarks() { return Array.from(ed.querySelectorAll('.wo-bm')).map(function (b) { return { name: b.getAttribute('data-bm'), text: b.textContent.slice(0, 50), el: b }; }); }
    async function bookmarkDialog() {
        const r = curRange(); const saved = r ? r.cloneRange() : null;
        const box = document.createElement('div'); box.className = 'wo-pdlg';
        const list = bookmarks();
        box.innerHTML = '<label>Bookmark name (letters, numbers and _)</label><input type="text" id="wo-bm-name" spellcheck="false" placeholder="chapter_one">' +
            (list.length ? '<label>Existing bookmarks</label>' + list.map(function (b) { return '<div class="src"><span><b>' + esc(b.name) + '</b> · ' + esc(b.text) + '</span><button type="button" class="mini" data-go="' + esc(b.name) + '">Go to</button><button type="button" class="mini" data-del="' + esc(b.name) + '">Delete</button></div>'; }).join('') : '<p class="tok">No bookmarks yet! Select some text (or just click), name it, and press Add!</p>');
        box.addEventListener('click', function (e) {
            const g = e.target.closest && e.target.closest('[data-go]'), d = e.target.closest && e.target.closest('[data-del]');
            if (g) goBookmark(g.dataset.go);
            if (d) { const b = ed.querySelector('.wo-bm[data-bm="' + d.dataset.del + '"]'); if (b) { unwrap(b); save(); d.closest('.src').remove(); } }
        });
        const name = await dialog('Bookmark', box, [{ label: 'Close', value: null }, { label: 'Add', value: function (b) { return slug(b.querySelector('#wo-bm-name').value) || null; }, primary: true }]);
        if (!name) return;
        if (ed.querySelector('.wo-bm[data-bm="' + name + '"]')) { toast('That name is taken!'); return; }
        restoreRange(saved);
        const rr = curRange();
        if (!rr) { toast('Click in the text first!'); return; }
        if (rr.collapsed) { const s = document.createElement('span'); s.className = 'wo-bm'; s.setAttribute('data-bm', name); s.id = 'bm-' + name; s.textContent = '​'; rr.insertNode(s); }
        else { const ws = wrapRange(rr, function () { const s = document.createElement('span'); s.className = 'wo-bm'; s.setAttribute('data-bm', name); return s; }); if (ws[0]) ws[0].id = 'bm-' + name; }
        save(); toast('Bookmark “' + name + '” added!');
    }
    function goBookmark(name) {
        let el = ed.querySelector('.wo-bm[data-bm="' + name + '"]') || ed.querySelector('[id="bm-' + name + '"]') || ed.querySelector('[data-xref-id="' + name + '"]');
        if (!el) { toast('That bookmark is gone!'); return; }
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('wo-flash-x'); setTimeout(function () { el.classList.remove('wo-flash-x'); }, 1300);
    }
    async function crossRefDialog() {
        const r = curRange(); const saved = r ? r.cloneRange() : null;
        const heads = Array.from(ed.querySelectorAll('h1, h2, h3')).filter(function (h) { return h.textContent.trim() && !h.closest('.wo-toc'); });
        const marks = bookmarks();
        if (!heads.length && !marks.length) { toast('Add a heading or a bookmark first!'); return; }
        const box = document.createElement('div'); box.className = 'wo-pdlg';
        box.innerHTML = '<label>Refer to</label><select id="wo-xr-t">' + marks.map(function (b) { return '<option value="b:' + esc(b.name) + '">Bookmark: ' + esc(b.name) + '</option>'; }).join('') + heads.map(function (h, i) { return '<option value="h:' + i + '">Heading: ' + esc(h.textContent.trim().slice(0, 50)) + '</option>'; }).join('') + '</select>' +
            '<label>Insert</label><select id="wo-xr-k"><option value="text">The text</option><option value="page">The page number</option><option value="above">“above” or “below”</option></select>';
        const pick = await dialog('Cross-reference', box, [{ label: 'Cancel', value: null }, { label: 'Insert', value: function (b) { return { t: b.querySelector('#wo-xr-t').value, k: b.querySelector('#wo-xr-k').value }; }, primary: true }]);
        if (!pick) return;
        restoreRange(saved);
        let target, name, text;
        if (pick.t[0] === 'b') { name = pick.t.slice(2); target = ed.querySelector('.wo-bm[data-bm="' + name + '"]'); text = target ? target.textContent : name; }
        else { target = heads[Number(pick.t.slice(2))]; name = 'h_' + slug(target.textContent).slice(0, 24) + '_' + rid().slice(0, 3); target.setAttribute('data-xref-id', name); text = target.textContent.trim(); }
        if (!target) { toast('That place is gone!'); return; }
        if (pick.k === 'page') text = String(window.WriteoutPages ? window.WriteoutPages.pageOf(target) : 1);
        else if (pick.k === 'above') { const rr = curRange(); text = rr && rr.startContainer && (rr.startContainer.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_PRECEDING) ? 'above' : 'below'; }
        document.execCommand('insertHTML', false, '<a class="wo-xref" data-xref="' + esc(name) + '" data-kind="' + pick.k + '" href="#' + esc(name) + '">' + esc(text) + '</a>&nbsp;');
        save(); toast('Cross-reference inserted! Click it to jump there!');
    }
    function updateXrefs() {
        let n = 0;
        ed.querySelectorAll('a.wo-xref').forEach(function (a) {
            const name = a.getAttribute('data-xref'), t = ed.querySelector('.wo-bm[data-bm="' + name + '"]') || ed.querySelector('[data-xref-id="' + name + '"]');
            if (!t) return;
            const kind = a.getAttribute('data-kind');
            const v = kind === 'page' ? String(window.WriteoutPages ? window.WriteoutPages.pageOf(t) : 1) : kind === 'above' ? ((a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_PRECEDING) ? 'above' : 'below') : t.textContent.trim();
            if (v && a.textContent !== v) { a.textContent = v; n++; }
        });
        return n;
    }

    /* ==================================================================
       CITATIONS & BIBLIOGRAPHY
       ================================================================== */
    const STYLES = { apa: 'APA 7', mla: 'MLA 9', chicago: 'Chicago (author-date)' };
    const names = function (a) { return String(a || '').split(/\s*(?:;| and | & )\s*/i).map(function (x) { return x.trim(); }).filter(Boolean); };
    const lastName = function (n) { return n.indexOf(',') >= 0 ? n.split(',')[0].trim() : n.trim().split(/\s+/).pop(); };
    const firstInit = function (n) { if (n.indexOf(',') >= 0) { const f = n.split(',').slice(1).join(',').trim(); return f ? f.split(/\s+/).map(function (x) { return x[0] + '.'; }).join(' ') : ''; } const p = n.trim().split(/\s+/); return p.slice(0, -1).map(function (x) { return x[0] + '.'; }).join(' '); };
    function inText(src, style) {
        const au = names(src.author), ln = au.map(lastName), y = src.year || 'n.d.';
        let who = ln.length === 0 ? (src.title || 'Anonymous').split(/\s+/).slice(0, 3).join(' ') : ln.length === 1 ? ln[0] : ln.length === 2 ? ln[0] + (style === 'apa' ? ' & ' : ' and ') + ln[1] : ln[0] + ' et al.';
        if (style === 'mla') return '(' + who + (src.pages ? ' ' + src.pages : '') + ')';
        if (style === 'chicago') return '(' + who + ' ' + y + (src.pages ? ', ' + src.pages : '') + ')';
        return '(' + who + ', ' + y + (src.pages ? ', p. ' + src.pages : '') + ')';
    }
    function entry(src, style) {
        const au = names(src.author), t = src.title ? '<i>' + esc(src.title) + '</i>' : '', y = src.year || 'n.d.';
        const cont = src.container ? esc(src.container) : '', url = src.url ? esc(src.url) : '';
        let who;
        if (style === 'mla') who = au.length === 0 ? '' : au.length === 1 ? esc(au[0].indexOf(',') >= 0 ? au[0] : lastName(au[0]) + ', ' + au[0].trim().split(/\s+/).slice(0, -1).join(' ')) : au.length === 2 ? esc(au[0]) + ', and ' + esc(au[1]) : esc(au[0]) + ', et al';
        else if (au.length === 0) who = '';
        else who = au.map(function (n) { return esc(lastName(n) + (firstInit(n) ? ', ' + firstInit(n) : '')); }).join(style === 'apa' ? ', ' : ', ');
        const dot = function (s) { return s ? (/[.!?]$/.test(s.replace(/<[^>]+>/g, '')) ? s : s + '.') : ''; };
        if (style === 'mla') return [dot(who), dot(t), cont ? esc(src.container) + (src.year ? ', ' + y : '') + (url ? ', ' + url : '') + '.' : (src.year ? y + '.' : '')].filter(Boolean).join(' ');
        if (style === 'chicago') return [dot(who), dot(y), dot(t), dot(cont), dot(url)].filter(Boolean).join(' ');
        return [dot(who), '(' + esc(y) + ').', dot(t), dot(cont), url ? url : ''].filter(Boolean).join(' ');
    }
    const biblioTitle = function (style) { return style === 'mla' ? 'Works Cited' : style === 'chicago' ? 'Bibliography' : 'References'; };
    function renderCites() {
        const S = getS();
        ed.querySelectorAll('.wo-cite').forEach(function (c) { const s = S.sources.find(function (x) { return x.id === c.getAttribute('data-src'); }); if (s) c.textContent = inText(s, S.citeStyle); });
        const bib = ed.querySelector('.wo-bib');
        if (bib) {
            const used = Array.from(new Set(Array.from(ed.querySelectorAll('.wo-cite')).map(function (c) { return c.getAttribute('data-src'); })));
            const list = S.sources.filter(function (s) { return used.indexOf(s.id) >= 0; }).sort(function (a, b) { return lastName(names(a.author)[0] || a.title || '').localeCompare(lastName(names(b.author)[0] || b.title || '')); });
            bib.innerHTML = '<div class="wo-bib-head">' + biblioTitle(S.citeStyle) + '</div>' + (list.length ? '<ol>' + list.map(function (s) { return '<li>' + entry(s, S.citeStyle) + '</li>'; }).join('') + '</ol>' : '<p style="color:#64748b;font-style:italic">Cite a source in the text and it shows up here!</p>');
        }
    }
    async function sourcesDialog() {
        let S = getS();
        const box = document.createElement('div'); box.className = 'wo-pdlg';
        const draw = function () {
            S = getS();
            box.innerHTML = '<div class="row"><div><label>Citation style</label><select id="wo-cs">' + Object.keys(STYLES).map(function (k) { return '<option value="' + k + '"' + (S.citeStyle === k ? ' selected' : '') + '>' + STYLES[k] + '</option>'; }).join('') + '</select></div></div>' +
                '<label>Your sources (' + S.sources.length + ')</label>' + (S.sources.length ? S.sources.map(function (s) { return '<div class="src" data-id="' + s.id + '"><span><b>' + esc(s.author || '(no author)') + '</b> · ' + esc(s.year || 'n.d.') + ' · ' + esc(s.title) + '</span><button type="button" class="mini" data-a="edit">Edit</button><button type="button" class="mini" data-a="del">Delete</button></div>'; }).join('') : '<p class="tok">No sources yet! Add one below!</p>') +
                '<label id="wo-src-h">Add a source</label>' +
                '<div class="row"><div><label>Author(s) (Last, First; or First Last)</label><input type="text" id="wo-s-au"></div><div><label>Year</label><input type="text" id="wo-s-y" style="max-width:90px"></div></div>' +
                '<label>Title</label><input type="text" id="wo-s-t"><div class="row"><div><label>Journal, website or publisher</label><input type="text" id="wo-s-c"></div><div><label>Pages (for quotes)</label><input type="text" id="wo-s-p"></div></div><label>Link (optional)</label><input type="text" id="wo-s-u">' +
                '<div style="margin-top:8px"><button type="button" class="mini" data-a="save">Save source</button></div>';
        };
        let editing = null;
        draw();
        box.addEventListener('change', function (e) { if (e.target.id === 'wo-cs') { const s = getS(); s.citeStyle = e.target.value; setS(s); renderCites(); } });
        box.addEventListener('click', function (e) {
            const b = e.target.closest && e.target.closest('[data-a]'); if (!b) return;
            const id = b.closest('.src') && b.closest('.src').dataset.id;
            if (b.dataset.a === 'del') { const s = getS(); s.sources = s.sources.filter(function (x) { return x.id !== id; }); setS(s); draw(); return; }
            if (b.dataset.a === 'edit') { const x = getS().sources.find(function (s) { return s.id === id; }); if (!x) return; editing = id; box.querySelector('#wo-s-au').value = x.author || ''; box.querySelector('#wo-s-y').value = x.year || ''; box.querySelector('#wo-s-t').value = x.title || ''; box.querySelector('#wo-s-c').value = x.container || ''; box.querySelector('#wo-s-p').value = x.pages || ''; box.querySelector('#wo-s-u').value = x.url || ''; box.querySelector('#wo-src-h').textContent = 'Edit this source'; return; }
            if (b.dataset.a === 'save') {
                const v = function (i) { return box.querySelector('#' + i).value.trim(); };
                if (!v('wo-s-t') && !v('wo-s-au')) { toast('Give the source a title or an author!'); return; }
                const s = getS(), rec = { id: editing || rid(), author: v('wo-s-au'), year: v('wo-s-y'), title: v('wo-s-t'), container: v('wo-s-c'), pages: v('wo-s-p'), url: v('wo-s-u') };
                const i = s.sources.findIndex(function (x) { return x.id === rec.id; });
                if (i >= 0) s.sources[i] = rec; else s.sources.push(rec);
                setS(s); renderCites(); editing = null; draw(); toast('Source saved!');
            }
        });
        await dialog('Sources', box, [{ label: 'Done', value: null, primary: true }]);
    }
    function citeMenu() {
        const S = getS();
        if (!S.sources.length) return [{ label: 'Add a source first…', icon: 'plus', run: sourcesDialog }];
        return S.sources.map(function (s) { return { label: inText(s, S.citeStyle) + '  ' + (s.title || '').slice(0, 36), run: function () { insertCite(s.id); } }; }).concat([{ sep: true }, { label: 'Manage Sources…', icon: 'gear', run: sourcesDialog }]);
    }
    function insertCite(id) {
        const S = getS(), s = S.sources.find(function (x) { return x.id === id; });
        if (!s) return;
        ed.focus();
        document.execCommand('insertHTML', false, '<span class="wo-cite" data-src="' + s.id + '" contenteditable="false">' + esc(inText(s, S.citeStyle)) + '</span>&nbsp;');
        save(); renderCites();
    }
    function insertBibliography() {
        const S = getS();
        if (!S.sources.length) { toast('Add some sources first!'); sourcesDialog(); return; }
        const had = ed.querySelector('.wo-bib');
        if (had) { renderCites(); had.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Bibliography updated!'); save(); return; }
        ed.focus();
        document.execCommand('insertHTML', false, '<div class="wo-bib" contenteditable="false"></div><p><br></p>');
        renderCites(); save(); toast('Bibliography added! It updates when you cite more sources!');
    }

    /* ---------- keep everything fresh ---------- */
    let pend = 0;
    function refresh() { clearTimeout(pend); pend = setTimeout(function () { try { decorate(); renderComments(); } catch (e) {} }, 80); }
    const sheetsWatch = function () {
        const s = $('wo-sheets');
        if (!s || sheetsWatch.on) return;
        sheetsWatch.on = true;
        new MutationObserver(function () { if (!decorating) refresh(); }).observe(s, { childList: true });
    };
    window.addEventListener('beforeprint', function () { printStyle(getS()); });
    // after a tab switch or a reload the canvas has new content: draw this document's pieces again
    new MutationObserver(function () { if (!decorating) refresh(); }).observe(ed, { childList: true });
    ed.addEventListener('input', function () { clearTimeout(refresh.t); refresh.t = setTimeout(function () { renderComments(); }, 600); });
    setInterval(function () { sheetsWatch(); }, 700);
    setTimeout(function () { sheetsWatch(); decorate(); renderComments(); renderCites(); }, 800);

    window.WriteoutPlus = {
        headerFooter: headerFooterDialog, watermarkMenu: watermarkMenu, borderMenu: borderMenu,
        newComment: newComment, showComments: showComments, commentsOn: function () { return !!getS().showComments; }, removeComment: removeComment, comments: function () { return getS().comments; },
        tracking: function () { return tracking; }, setTracking: setTracking, acceptAll: function () { acceptAll(true); }, rejectAll: function () { acceptAll(false); }, nextChange: function () { gotoChange(1); }, prevChange: function () { gotoChange(-1); }, changes: changes, showMarkup: showMarkup,
        readAloud: readAloud, stopRead: stopRead, reading: function () { return !!ra; },
        formatPainter: formatPainter, lineSpacingMenu: lineSpacingMenu, dropCapMenu: dropCapMenu, dropCap: dropCap,
        bookmark: bookmarkDialog, crossRef: crossRefDialog, updateXrefs: updateXrefs, goBookmark: goBookmark,
        sources: sourcesDialog, citeMenu: citeMenu, insertCite: insertCite, bibliography: insertBibliography, renderCites: renderCites,
        settings: getS, setSettings: setS, decorate: decorate, inText: inText, entry: entry
    };
})();
