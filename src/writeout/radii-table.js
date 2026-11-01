/* =====================================================================
   Radii Tables! One table tool for Writeout, Bitbook and Amber (identical copies in each).
   - RadiiTable.open({ onInsert(table) }) shows the Insert Table dialog: a new table, or one
     imported from Imbuer (the workbook saved in this browser, or a .ks / .csv / .tsv file),
     with Imbuer's formulas worked out and its bold, colors and number formats kept!
   - RadiiTable.attach(root) gives every table inside root a floating toolbar (add or remove
     rows and columns, header row, style, delete) and Tab / Shift+Tab to hop between cells.
   - RadiiTable.fromRows(rows, opts) builds a table, and RadiiTable.STYLES lists the looks.
   ===================================================================== */
(function () {
    'use strict';
    if (window.RadiiTable) return;

    const STYLES = [
        { id: 'blue', name: 'Aero Blue' },
        { id: 'green', name: 'Gel Green' },
        { id: 'purple', name: 'Amethyst' },
        { id: 'amber', name: 'Amber Glow' },
        { id: 'plain', name: 'Plain' },
        { id: 'dark', name: 'Night Glass' }
    ];
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    /* ---------- the looks ---------- */
    const CSS = `
.rt-table{border-collapse:separate;border-spacing:0;margin:10px 0;min-width:min(320px,100%);max-width:100%;font-size:.95em;line-height:1.4;border-radius:10px;overflow:hidden;--rt-line:#bae6fd;--rt-ink:#0c4a6e;--rt-head:linear-gradient(180deg,#e0f2fe 0%,#7dd3fc 49%,#38bdf8 51%,#0ea5e9 100%);--rt-head-ink:#fff;--rt-row:#fff;--rt-alt:#f0f9ff;border:1px solid var(--rt-line);box-shadow:0 2px 8px rgba(2,132,199,.15)}
.rt-table td,.rt-table th{padding:6px 12px;border-right:1px solid var(--rt-line);border-bottom:1px solid var(--rt-line);color:var(--rt-ink);background:var(--rt-row);vertical-align:top;min-width:3em;text-align:left}
.rt-table tr>:last-child{border-right:0}.rt-table tr:last-child>*{border-bottom:0}
.rt-table tbody tr:nth-child(even)>td{background:var(--rt-alt)}
.rt-table th{background:var(--rt-head);color:var(--rt-head-ink);font-weight:700;text-shadow:0 1px 1px rgba(0,0,0,.25)}
.rt-table.rt-green{--rt-line:#bbf7d0;--rt-ink:#14532d;--rt-head:linear-gradient(180deg,#dcfce7 0%,#86efac 49%,#4ade80 51%,#16a34a 100%);--rt-alt:#f0fdf4}
.rt-table.rt-purple{--rt-line:#e9d5ff;--rt-ink:#581c87;--rt-head:linear-gradient(180deg,#f3e8ff 0%,#d8b4fe 49%,#c084fc 51%,#9333ea 100%);--rt-alt:#faf5ff}
.rt-table.rt-amber{--rt-line:#fde68a;--rt-ink:#78350f;--rt-head:linear-gradient(180deg,#fef3c7 0%,#fcd34d 49%,#fbbf24 51%,#d97706 100%);--rt-alt:#fffbeb}
.rt-table.rt-plain{--rt-line:#d4d4d8;--rt-ink:inherit;--rt-head:transparent;--rt-head-ink:inherit;--rt-row:transparent;--rt-alt:transparent;border-radius:0;box-shadow:none}
.rt-table.rt-plain th{text-shadow:none;border-bottom-width:2px}
.rt-table.rt-dark{--rt-line:rgba(148,197,255,.35);--rt-ink:#e0f2fe;--rt-head:linear-gradient(180deg,rgba(125,211,252,.55),rgba(14,116,144,.75));--rt-row:rgba(15,23,42,.55);--rt-alt:rgba(30,41,59,.6);backdrop-filter:blur(8px)}
.rt-bar{position:fixed;z-index:2147480000;display:flex;flex-wrap:wrap;gap:3px;padding:4px;border-radius:10px;border:1px solid rgba(14,116,144,.3);background:linear-gradient(180deg,#fff,#e0f2fe);box-shadow:0 6px 18px rgba(2,60,110,.25);font:600 12px system-ui,sans-serif;max-width:calc(100vw - 16px)}
.rt-bar[hidden]{display:none}
.rt-bar button{border:1px solid transparent;background:transparent;color:#0c4a6e;border-radius:7px;padding:4px 7px;cursor:pointer;font:inherit;white-space:nowrap}
.rt-bar button:hover{background:#bae6fd;border-color:#7dd3fc}
.rt-bar .rt-sep{width:1px;background:#bae6fd;margin:2px 2px}
.rt-bar .rt-danger{color:#b91c1c}
.os-dlg.rt-dialog{width:min(640px,calc(100vw - 16px))}.os-dlg.rt-dialog .os-dlg-body{overflow-y:auto}
.rt-dlg{display:flex;flex-direction:column;gap:12px;min-width:0;font:14px system-ui,sans-serif;color:#0c4a6e}
.slide-text-content .rt-table,.slide-text-content .rt-table *{text-shadow:none}
.slide-text-content .rt-table td{font-weight:400}
.rt-tabs{display:flex;gap:4px;padding:3px;border-radius:10px;background:#e0f2fe;align-self:flex-start}
.rt-tabs button{border:0;border-radius:8px;padding:6px 14px;background:transparent;color:#0369a1;font:700 13px system-ui,sans-serif;cursor:pointer}
.rt-tabs button.on{background:#fff;box-shadow:0 1px 3px rgba(2,132,199,.3)}
.rt-row{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}
.rt-row label{display:flex;align-items:center;gap:6px;font-weight:600}
.rt-row input[type=number],.rt-row input[type=text],.rt-row select{font:14px system-ui,sans-serif;padding:5px 8px;border-radius:7px;border:1px solid #7dd3fc;background:#fff;color:#0c4a6e}
.rt-row input[type=number]{width:70px}
.rt-styles{display:flex;flex-wrap:wrap;gap:6px}
.rt-styles button{border:2px solid transparent;border-radius:9px;padding:3px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font:600 11px system-ui,sans-serif;color:#0c4a6e}
.rt-styles button.on{border-color:#0284c7}
.rt-styles .rt-table{margin:0;min-width:0;font-size:9px;box-shadow:none;pointer-events:none}
.rt-styles .rt-table td,.rt-styles .rt-table th{padding:1px 6px;min-width:0}
.rt-preview{max-height:220px;overflow:auto;border-radius:10px;border:1px dashed #7dd3fc;padding:6px;background:#f8fafc}
.rt-preview .rt-table{margin:0}
.rt-note{font-size:12.5px;color:#475569}
.rt-note.bad{color:#b91c1c}
`;
    function injectCss() {
        if (document.getElementById('rt-css')) return;
        const st = document.createElement('style');
        st.id = 'rt-css';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ---------- building a table ---------- */
    // rows: arrays of cells; a cell is text, or { text, style }. opts: { header: true, style: 'blue' }
    function fromRows(rows, opts) {
        opts = opts || {};
        injectCss();
        const t = document.createElement('table');
        t.className = 'rt-table rt-' + (STYLES.some((s) => s.id === opts.style) ? opts.style : 'blue');
        const width = Math.max(1, ...rows.map((r) => r.length));
        const addRow = (parent, cells, tag) => {
            const tr = document.createElement('tr');
            for (let c = 0; c < width; c++) {
                const cell = cells[c];
                const td = document.createElement(tag);
                const text = cell && typeof cell === 'object' ? cell.text : cell;
                if (text === undefined || text === null || text === '') td.appendChild(document.createElement('br'));
                else td.textContent = String(text);
                if (cell && typeof cell === 'object' && cell.style) td.setAttribute('style', cell.style);
                tr.appendChild(td);
            }
            parent.appendChild(tr);
        };
        let body = rows;
        if (opts.header && rows.length) {
            const head = document.createElement('thead');
            addRow(head, rows[0], 'th');
            t.appendChild(head);
            body = rows.slice(1);
        }
        const tb = document.createElement('tbody');
        body.forEach((r) => addRow(tb, r, 'td'));
        if (!body.length) addRow(tb, [], 'td');
        t.appendChild(tb);
        return t;
    }
    function blank(rows, cols) {
        const out = [];
        for (let r = 0; r < rows; r++) out.push(new Array(cols).fill(''));
        return out;
    }

    /* ---------- reading Imbuer ---------- */
    const colNum = (letters) => letters.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    const colName = (c) => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
    function parseRef(ref) { const m = /^([A-Z]+)(\d+)$/.exec(String(ref).toUpperCase()); return m ? { c: colNum(m[1]), r: +m[2] } : null; }
    function usedArea(sheet) {
        let r1 = 0, c1 = -1, r0 = Infinity, c0 = Infinity;
        Object.keys(sheet.data || {}).forEach((k) => {
            const v = sheet.data[k];
            if (v === '' || v === null || v === undefined) return;
            const p = parseRef(k);
            if (!p) return;
            r0 = Math.min(r0, p.r); c0 = Math.min(c0, p.c);
            r1 = Math.max(r1, p.r); c1 = Math.max(c1, p.c);
        });
        return c1 < 0 ? null : { r0, c0, r1, c1 };
    }
    function parseRange(text) {
        const m = /^\s*([A-Za-z]+\d+)\s*(?::\s*([A-Za-z]+\d+))?\s*$/.exec(text || '');
        if (!m) return null;
        const a = parseRef(m[1]), b = parseRef(m[2] || m[1]);
        return { r0: Math.min(a.r, b.r), r1: Math.max(a.r, b.r), c0: Math.min(a.c, b.c), c1: Math.max(a.c, b.c) };
    }
    // Imbuer's own number formats (a compact copy of imbuer/app.js formatValue)
    function fmtGeneral(n) {
        if (Number.isInteger(n) && Math.abs(n) < 1e11) return String(n);
        const abs = Math.abs(n);
        if (abs !== 0 && (abs >= 1e11 || abs < 1e-9)) return n.toExponential(5).replace(/\.?0+e/, 'E').replace(/e/, 'E');
        let s = String(parseFloat(n.toPrecision(10)));
        if (s.length > 11) s = String(parseFloat(n.toFixed(Math.max(0, 10 - String(Math.trunc(abs)).length - (n < 0 ? 1 : 0)))));
        return s;
    }
    const commas = (s) => { const p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return p.join('.'); };
    function formatValue(v, st, hint) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && typeof v.code === 'string') return v.code;
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (typeof v !== 'number') return String(v);
        const fmt = (st && st.fmt) || hint || 'general';
        const dec = st && st.dec !== undefined ? st.dec : (fmt === 'percent' ? 0 : 2);
        const abs = Math.abs(v), neg = v < 0 ? '-' : '';
        switch (fmt) {
            case 'number': return neg + (st && st.sep ? commas(abs.toFixed(dec)) : abs.toFixed(dec));
            case 'currency': return neg + '$' + commas(abs.toFixed(dec));
            case 'accounting': return v < 0 ? '$ (' + commas(abs.toFixed(dec)) + ')' : (v === 0 ? '$ -' : '$ ' + commas(v.toFixed(dec)));
            case 'percent': return (v * 100).toFixed(dec) + '%';
            case 'comma': return neg + commas(abs.toFixed(dec));
            case 'scientific': return v.toExponential(dec).replace('e', 'E').replace(/E(\d)/, 'E+$1');
            case 'date': case 'longdate': case 'datetime': case 'time': {
                const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000));
                if (isNaN(d.getTime())) return '#####';
                const opts = fmt === 'date' ? { timeZone: 'UTC' } : fmt === 'longdate' ? { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                    : fmt === 'time' ? { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', second: '2-digit' } : { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' };
                return fmt === 'time' ? d.toLocaleTimeString('en-US', opts) : fmt === 'date' ? d.toLocaleDateString('en-US', opts) : d.toLocaleString('en-US', opts);
            }
            default: return fmtGeneral(v);
        }
    }
    // the bits of an Imbuer cell style a document can show
    function cellCss(st, value) {
        if (!st) return typeof value === 'number' ? 'text-align:right' : '';
        const out = [];
        if (st.fill) out.push('background:' + st.fill);
        if (st.color) out.push('color:' + st.color);
        if (st.b) out.push('font-weight:700');
        if (st.i) out.push('font-style:italic');
        const deco = [st.u && 'underline', st.s && 'line-through'].filter(Boolean);
        if (deco.length) out.push('text-decoration:' + deco.join(' '));
        const align = st.align || st.ha || (typeof value === 'number' ? 'right' : '');
        if (/^(left|center|right)$/.test(align)) out.push('text-align:' + align);
        return out.join(';').replace(/[<>"]/g, '');
    }
    let engineP = null;
    function loadEngine() {
        if (window.FormulaEngine) return Promise.resolve(window.FormulaEngine);
        if (!engineP) engineP = new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = '/imbuer/formula_engine.js';
            s.onload = () => resolve(window.FormulaEngine || null);
            s.onerror = () => { engineP = null; resolve(null); };
            document.head.appendChild(s);
        });
        return engineP;
    }
    function savedBook() {
        try {
            const b = JSON.parse(localStorage.getItem('imbuer-book-v2') || 'null');
            if (b && Array.isArray(b.sheets) && b.sheets.some((s) => usedArea(s))) return b;
        } catch (e) {}
        return null;
    }
    // A .ks file (Imbuer workbook), or a classic one ({ data, styles } or a bare cell map)
    function bookFromKs(text, name) {
        const p = JSON.parse(text);
        if (p && p.imbuer === 2 && p.book && Array.isArray(p.book.sheets)) return p.book;
        const data = p && p.data && typeof p.data === 'object' ? p.data : p;
        if (!data || typeof data !== 'object') throw new Error('not a workbook');
        const clean = {};
        Object.keys(data).forEach((k) => { if (/^[A-Z]+\d+$/.test(k)) clean[k] = String(data[k]); });
        return { name: name, sheets: [{ name: name || 'Sheet1', data: clean, styles: {} }] };
    }
    function parseDelimited(text, delim) {
        const rows = [];
        let row = [], cell = '', q = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (q) {
                if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
                else if (ch === '"') q = false;
                else cell += ch;
            } else if (ch === '"' && cell === '') q = true;
            else if (ch === delim) { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); rows.push(row); row = []; cell = '';
            } else cell += ch;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        while (rows.length && rows[rows.length - 1].every((c) => c === '')) rows.pop();
        return rows;
    }
    // one sheet (or a range of it) as rows of { text, style }, with formulas worked out
    function sheetRows(book, si, rangeText, keepLook, engine) {
        const sheet = book.sheets[si];
        const area = rangeText && rangeText.trim() ? parseRange(rangeText) : usedArea(sheet);
        if (!area) return { rows: [], error: rangeText && rangeText.trim() ? 'That range does not look right: try something like A1:D10!' : 'That sheet is empty!' };
        if ((area.r1 - area.r0 + 1) * (area.c1 - area.c0 + 1) > 5000) return { rows: [], error: 'That is a lot of cells: pick a range with up to 5,000!' };
        let values = null, hints = null;
        if (engine) {
            try {
                const calc = engine.evaluateWorkbook(book.sheets.map((s) => ({ name: s.name, data: s.data || {}, rows: s.rows || 100, cols: s.cols || 26 })));
                values = calc.values[si] || {}; hints = (calc.hints || [])[si] || {};
            } catch (e) { values = null; }
        }
        const rows = [];
        for (let r = area.r0; r <= area.r1; r++) {
            const row = [];
            for (let c = area.c0; c <= area.c1; c++) {
                const id = colName(c) + r;
                const raw = (sheet.data || {})[id];
                const st = (sheet.styles || {})[id];
                let v = raw === undefined ? '' : raw;
                if (values && raw !== undefined && raw !== '') v = st && st.fmt === 'text' ? String(raw).replace(/^'/, '') : formatValue(values[id] === undefined ? raw : values[id], st, hints && hints[id]);
                row.push(keepLook ? { text: v, style: cellCss(st, values ? values[id] : null) } : v);
            }
            rows.push(row);
        }
        return { rows: rows, area: colName(area.c0) + area.r0 + ':' + colName(area.c1) + area.r1, formulas: !!values };
    }

    /* ---------- the Insert Table dialog ---------- */
    function styleButtons(pick, current) {
        const wrap = document.createElement('div');
        wrap.className = 'rt-styles';
        STYLES.forEach((s) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.style = s.id;
            b.className = s.id === current ? 'on' : '';
            b.title = s.name;
            b.appendChild(fromRows([['A', 'B'], ['1', '2'], ['3', '4']], { header: true, style: s.id }));
            b.appendChild(document.createTextNode(s.name));
            b.addEventListener('click', () => { wrap.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); pick(s.id); });
            wrap.appendChild(b);
        });
        return wrap;
    }
    function open(opts) {
        opts = opts || {};
        injectCss();
        const OS = window.OfficeShell;
        const state = { mode: 'new', style: opts.style || 'blue', rows: 3, cols: 3, header: true, imp: null, impHeader: true, keepLook: true };
        const body = document.createElement('div');
        body.className = 'rt-dlg';
        body.innerHTML =
            '<div class="rt-tabs"><button type="button" data-mode="new" class="on">New table</button><button type="button" data-mode="imbuer">From Imbuer</button></div>' +
            '<div class="rt-pane" data-pane="new"><div class="rt-row">' +
            '<label>Rows <input type="number" min="1" max="60" value="3" data-k="rows"></label>' +
            '<label>Columns <input type="number" min="1" max="15" value="3" data-k="cols"></label>' +
            '<label><input type="checkbox" checked data-k="header"> Header row</label></div></div>' +
            '<div class="rt-pane" data-pane="imbuer" hidden>' +
            '<div class="rt-row"><label>From <select data-k="source"></select></label><input type="file" accept=".ks,.json,.csv,.tsv,.txt" hidden data-k="file"></div>' +
            '<div class="rt-row"><label>Sheet <select data-k="sheet"></select></label><label>Range <input type="text" placeholder="all used cells" size="10" data-k="range"></label></div>' +
            '<div class="rt-row"><label><input type="checkbox" checked data-k="impHeader"> First row is a header</label><label><input type="checkbox" checked data-k="keepLook"> Keep Imbuer\'s bold, colors and alignment</label></div>' +
            '<div class="rt-note" data-k="note"></div><div class="rt-preview" data-k="preview"></div></div>' +
            '<div><div class="rt-note" style="margin-bottom:6px">Style</div></div>';
        const q = (k) => body.querySelector('[data-k="' + k + '"]');
        body.lastElementChild.appendChild(styleButtons((s) => { state.style = s; refresh(); }, state.style));
        body.querySelectorAll('.rt-tabs button').forEach((b) => b.addEventListener('click', () => {
            state.mode = b.dataset.mode;
            body.querySelectorAll('.rt-tabs button').forEach((x) => x.classList.toggle('on', x === b));
            body.querySelectorAll('.rt-pane').forEach((p) => { p.hidden = p.dataset.pane !== state.mode; });
            if (state.mode === 'imbuer' && !state.imp) loadSource();
        }));
        ['rows', 'cols'].forEach((k) => q(k).addEventListener('input', () => { state[k] = Math.max(1, Math.min(k === 'rows' ? 60 : 15, parseInt(q(k).value, 10) || 1)); }));
        q('header').addEventListener('change', () => { state.header = q('header').checked; });
        q('impHeader').addEventListener('change', () => { state.impHeader = q('impHeader').checked; refresh(); });
        q('keepLook').addEventListener('change', () => { state.keepLook = q('keepLook').checked; refresh(); });
        q('range').addEventListener('input', refresh);
        q('sheet').addEventListener('change', () => { q('range').value = ''; refresh(); });

        // where the Imbuer table comes from: this browser's workbook, or a file
        const book = savedBook();
        const src = q('source');
        src.innerHTML = (book ? '<option value="saved">Your Imbuer workbook (' + esc(book.name || 'Book1') + ')</option>' : '') + '<option value="file">A file (.ks, .csv, .tsv)…</option>';
        src.addEventListener('change', loadSource);
        q('file').addEventListener('change', () => {
            const f = q('file').files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                const text = String(reader.result || '');
                const name = f.name.replace(/\.[^.]+$/, '');
                try {
                    if (/\.(csv|tsv|txt)$/i.test(f.name)) {
                        const delim = /\.tsv$/i.test(f.name) || (text.includes('\t') && !text.split('\n')[0].includes(',')) ? '\t' : ',';
                        const rows = parseDelimited(text, delim);
                        const data = {};
                        rows.forEach((r, ri) => r.forEach((v, ci) => { if (v !== '') data[colName(ci) + (ri + 1)] = v; }));
                        setBook({ name: name, sheets: [{ name: name, data: data, styles: {} }] }, f.name);
                    } else setBook(bookFromKs(text, name), f.name);
                } catch (e) { note('That file is not a workbook Imbuer can read!', true); }
            };
            reader.readAsText(f);
        });
        function setBook(b, label) {
            state.imp = b;
            q('sheet').innerHTML = b.sheets.map((s, i) => '<option value="' + i + '"' + (i === (b.active | 0) ? ' selected' : '') + '>' + esc(s.name || 'Sheet' + (i + 1)) + '</option>').join('');
            if (label) note('Opened ' + label + '!');
            refresh();
        }
        function loadSource() {
            if (src.value === 'saved' && book) setBook(book);
            else { state.imp = null; q('preview').innerHTML = ''; note('Pick a file to take a table from!'); q('file').click(); }
        }
        function note(text, bad) { const n = q('note'); n.textContent = text; n.classList.toggle('bad', !!bad); }
        let last = null;
        function refresh() {
            if (!state.imp) return;
            loadEngine().then((engine) => {
                const res = sheetRows(state.imp, +q('sheet').value || 0, q('range').value, state.keepLook, engine);
                last = res;
                const pv = q('preview');
                pv.innerHTML = '';
                if (res.error) { note(res.error, true); return; }
                note('Cells ' + res.area + ' (' + res.rows.length + ' rows)' + (engine ? ', with formulas worked out!' : '! (Formulas show as written: Imbuer\'s formula engine did not load.)'));
                pv.appendChild(fromRows(res.rows.slice(0, 12), { header: state.impHeader, style: state.style }));
            });
        }
        if (!book) note('No Imbuer workbook is saved in this browser yet, so pick a file!');

        const build = () => {
            if (state.mode === 'new') {
                const rows = blank(state.rows, state.cols);
                if (state.header) rows[0] = rows[0].map((_, i) => 'Column ' + (i + 1));
                return fromRows(rows, { header: state.header, style: state.style });
            }
            if (!last || last.error || !last.rows.length) return null;
            return fromRows(last.rows, { header: state.impHeader, style: state.style });
        };
        const finish = (table) => { if (table && typeof opts.onInsert === 'function') opts.onInsert(table); };
        if (OS && OS.dialog) {
            OS.dialog('Insert Table', body, [
                { label: 'Cancel', value: null },
                { label: 'Insert', primary: true, value: () => build() }
            ], { cls: 'rt-dialog' }).then(finish);
        } else {
            // a page without the shared shell: a plain modal
            const back = document.createElement('div');
            back.style.cssText = 'position:fixed;inset:0;z-index:2147480001;background:rgba(15,40,70,.35);display:grid;place-items:center;padding:16px';
            const box = document.createElement('div');
            box.style.cssText = 'background:#fff;border-radius:14px;padding:16px;max-height:90vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.3)';
            box.innerHTML = '<b style="font:700 16px system-ui;color:#0c4a6e">Insert Table</b>';
            box.appendChild(body);
            const foot = document.createElement('div');
            foot.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
            foot.innerHTML = '<button type="button">Cancel</button><button type="button">Insert</button>';
            foot.children[0].onclick = () => back.remove();
            foot.children[1].onclick = () => { const t = build(); back.remove(); finish(t); };
            box.appendChild(foot);
            back.appendChild(box);
            document.body.appendChild(back);
        }
    }

    /* ---------- editing tables: the floating toolbar, and Tab between cells ---------- */
    function attach(root, opts) {
        opts = opts || {};
        if (!root || root.dataset.rtAttached) return;
        root.dataset.rtAttached = '1';
        injectCss();
        const bar = document.createElement('div');
        bar.className = 'rt-bar';
        bar.hidden = true;
        const BTN = [
            ['rowAbove', '↑ Row', 'Add a row above'], ['rowBelow', '↓ Row', 'Add a row below'],
            ['colLeft', '← Column', 'Add a column to the left'], ['colRight', '→ Column', 'Add a column to the right'], ['sep'],
            ['delRow', '✕ Row', 'Delete this row', 1], ['delCol', '✕ Column', 'Delete this column', 1], ['sep'],
            ['header', 'Header', 'Turn the header row on or off'], ['style', 'Style ▾', 'Change the table style'], ['sep'],
            ['delTable', 'Delete table', 'Delete the whole table', 1]
        ];
        bar.innerHTML = BTN.map((b) => b[0] === 'sep' ? '<span class="rt-sep"></span>' : '<button type="button" data-act="' + b[0] + '" title="' + b[2] + '"' + (b[3] ? ' class="rt-danger"' : '') + '>' + b[1] + '</button>').join('');
        document.body.appendChild(bar);
        let cell = null;
        const tableOf = (c) => c && c.closest('table');
        const editable = (t) => (opts.editable ? opts.editable(t) : true);
        function cellAt(node) {
            const el = node && (node.nodeType === 1 ? node : node.parentElement);
            const c = el && el.closest && el.closest('td, th');
            return c && root.contains(c) && editable(c.closest('table')) ? c : null;
        }
        function place() {
            const t = tableOf(cell);
            if (!t || !t.isConnected) { bar.hidden = true; return; }
            const r = t.getBoundingClientRect();
            bar.hidden = false;
            const top = r.top - bar.offsetHeight - 6;
            bar.style.top = Math.max(4, top < 4 ? r.bottom + 6 : top) + 'px';
            bar.style.left = Math.max(4, Math.min(window.innerWidth - bar.offsetWidth - 4, r.left)) + 'px';
        }
        function track() {
            const sel = window.getSelection();
            const c = sel && sel.rangeCount ? cellAt(sel.anchorNode) : null;
            if (c) { cell = c; place(); } else if (!bar.contains(document.activeElement)) { cell = null; bar.hidden = true; }
        }
        document.addEventListener('selectionchange', track);
        root.addEventListener('click', track);
        window.addEventListener('scroll', () => { if (!bar.hidden) place(); }, true);
        window.addEventListener('resize', () => { if (!bar.hidden) place(); });

        const changed = (t) => {
            const host = t && t.isConnected ? t : root;
            host.dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof opts.onChange === 'function') opts.onChange();
        };
        const newCell = (like, tag) => {
            const c = document.createElement(tag || like.tagName.toLowerCase());
            if (like.hasAttribute('contenteditable')) c.setAttribute('contenteditable', like.getAttribute('contenteditable'));
            c.appendChild(document.createElement('br'));
            return c;
        };
        const focusCell = (c) => {
            if (!c) return;
            try {
                if (c.getAttribute('contenteditable') === 'true') c.focus({ preventScroll: true });
                const r = document.createRange();
                r.selectNodeContents(c);
                r.collapse(false);
                const s = window.getSelection();
                s.removeAllRanges(); s.addRange(r);
            } catch (e) {}
            cell = c;
        };
        const colIndex = (c) => Array.prototype.indexOf.call(c.parentNode.children, c);
        function act(name) {
            const t = tableOf(cell);
            if (!t) return;
            const tr = cell.parentNode, ci = colIndex(cell);
            const rowsAll = Array.from(t.rows);
            if (name === 'rowAbove' || name === 'rowBelow') {
                const like = tr.parentNode.tagName === 'THEAD' ? (t.tBodies[0] && t.tBodies[0].rows[0]) || tr : tr;
                const fresh = document.createElement('tr');
                Array.from(like.children).forEach((c) => fresh.appendChild(newCell(c, 'td')));
                if (tr.parentNode.tagName === 'THEAD') {
                    const tb = t.tBodies[0] || t.appendChild(document.createElement('tbody'));
                    tb.insertBefore(fresh, tb.firstChild);
                } else if (name === 'rowAbove') tr.before(fresh); else tr.after(fresh);
                focusCell(fresh.children[Math.min(ci, fresh.children.length - 1)]);
            } else if (name === 'colLeft' || name === 'colRight') {
                if (rowsAll[0] && rowsAll[0].children.length >= 20) return;
                rowsAll.forEach((row) => {
                    const ref = row.children[Math.min(ci, row.children.length - 1)];
                    const c = newCell(ref);
                    if (name === 'colLeft') ref.before(c); else ref.after(c);
                });
                focusCell(tr.children[name === 'colLeft' ? ci : ci + 1]);
            } else if (name === 'delRow') {
                if (rowsAll.length <= 1) return act('delTable');
                const next = tr.nextElementSibling || tr.previousElementSibling;
                const sect = tr.parentNode;
                tr.remove();
                if (!sect.rows.length) sect.remove();
                focusCell(next ? next.children[Math.min(ci, next.children.length - 1)] : t.rows[0] && t.rows[0].children[0]);
            } else if (name === 'delCol') {
                if (tr.children.length <= 1) return act('delTable');
                rowsAll.forEach((row) => { if (row.children[ci]) row.children[ci].remove(); });
                focusCell(tr.children[Math.min(ci, tr.children.length - 1)]);
            } else if (name === 'header') {
                const head = t.tHead;
                if (head) {
                    // the header row becomes an ordinary first row
                    const row = head.rows[0];
                    const tb = t.tBodies[0] || t.appendChild(document.createElement('tbody'));
                    Array.from(row.children).forEach((th) => { const td = document.createElement('td'); Array.from(th.attributes).forEach((a) => td.setAttribute(a.name, a.value)); while (th.firstChild) td.appendChild(th.firstChild); th.replaceWith(td); });
                    tb.insertBefore(row, tb.firstChild);
                    head.remove();
                } else {
                    const row = t.rows[0];
                    const th = document.createElement('thead');
                    Array.from(row.children).forEach((td) => { const h = document.createElement('th'); Array.from(td.attributes).forEach((a) => h.setAttribute(a.name, a.value)); while (td.firstChild) h.appendChild(td.firstChild); td.replaceWith(h); });
                    th.appendChild(row);
                    t.insertBefore(th, t.firstChild);
                    if (!t.tBodies[0] || !t.tBodies[0].rows.length) { const tb = t.tBodies[0] || t.appendChild(document.createElement('tbody')); const r2 = document.createElement('tr'); Array.from(row.children).forEach((c) => r2.appendChild(newCell(c, 'td'))); tb.appendChild(r2); }
                }
                focusCell(t.rows[0].children[0]);
            } else if (name === 'delTable') {
                const after = t.nextElementSibling;
                t.remove();
                cell = null; bar.hidden = true;
                if (after) focusCell(after);
                changed(root);
                return;
            }
            changed(t);
            place();
        }
        bar.addEventListener('mousedown', (e) => e.preventDefault());
        bar.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            e.stopPropagation();
            if (b.dataset.act === 'style') {
                const t = tableOf(cell);
                if (!t) return;
                const items = STYLES.map((s) => ({ label: (t.classList.contains('rt-' + s.id) ? '✓ ' : '') + s.name, run: () => setStyle(t, s.id) }));
                if (window.OfficeShell && window.OfficeShell.openMenu) window.OfficeShell.openMenu(b, items);
                else { const cur = STYLES.findIndex((s) => t.classList.contains('rt-' + s.id)); setStyle(t, STYLES[(cur + 1) % STYLES.length].id); }
                return;
            }
            act(b.dataset.act);
        });
        function setStyle(t, id) {
            STYLES.forEach((s) => t.classList.remove('rt-' + s.id));
            t.classList.add('rt-table', 'rt-' + id);
            changed(t);
        }
        // Tab and Shift+Tab hop between cells (Tab in the last cell adds a row)
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
            const sel = window.getSelection();
            const c = sel && sel.rangeCount ? cellAt(sel.anchorNode) : null;
            if (!c) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const all = Array.from(c.closest('table').querySelectorAll('th, td'));
            const i = all.indexOf(c);
            if (e.shiftKey) { if (i > 0) focusCell(all[i - 1]); return; }
            if (i < all.length - 1) { focusCell(all[i + 1]); return; }
            cell = c;
            act('rowBelow');
            focusCell(c.parentNode.nextElementSibling.children[0]);
        }, true);
    }

    /* ---------- Writeout and Bitbook: a table goes in as its own block, right after the caret's line ---------- */
    function insertIntoEditor(canvas) {
        if (!canvas) return;
        let range = null;
        try {
            const sel = window.getSelection();
            if (sel.rangeCount && canvas.contains(sel.anchorNode)) range = sel.getRangeAt(0).cloneRange();
        } catch (e) {}
        open({
            onInsert: (table) => {
                let box = null;
                if (range && canvas.contains(range.startContainer)) {
                    let n = range.startContainer;
                    while (n && n.parentNode !== canvas) n = n.parentNode;
                    box = n && n.nodeType === 1 ? n : null;
                }
                const editable = !!canvas.querySelector(':scope > [contenteditable="true"]');
                if (box && /^(DIV|P)$/.test(box.tagName) && !(box.textContent || '').replace(/[\s​]/g, '') && !box.querySelector('img, table, [contenteditable="false"]')) box.replaceWith(table);
                else if (box) box.after(table);
                else canvas.appendChild(table);
                if (!table.nextElementSibling || table.nextElementSibling.tagName === 'TABLE') {
                    const d = document.createElement('div');
                    if (editable) d.setAttribute('contenteditable', 'true');
                    d.appendChild(document.createElement('br'));
                    table.after(d);
                }
                canvas.dispatchEvent(new Event('input', { bubbles: true }));
                try { if (typeof window.autoSaveCanvasContent === 'function') window.autoSaveCanvasContent(); } catch (e) {}
                // the caret goes into the first cell, ready to type (after the editor has made the cells editable)
                setTimeout(() => {
                    const first = table.querySelector('th, td');
                    if (!first) return;
                    try {
                        if (first.getAttribute('contenteditable') === 'true') first.focus();
                        else canvas.focus();
                        const r = document.createRange();
                        r.selectNodeContents(first);
                        r.collapse(true);
                        const s = window.getSelection();
                        s.removeAllRanges(); s.addRange(r);
                    } catch (e) {}
                    try { table.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
                }, 60);
                try { if (window.OfficeShell) window.OfficeShell.toast('Table added! Tab hops between cells, and the bar above it adds rows and columns!'); } catch (e) {}
            }
        });
    }

    window.RadiiTable = { open: open, attach: attach, insertIntoEditor: insertIntoEditor, fromRows: fromRows, STYLES: STYLES, injectCss: injectCss, parseDelimited: parseDelimited };
    if (document.head) injectCss();
    // Writeout and Bitbook: every table in the document gets the toolbar
    const startEditor = () => { const c = document.getElementById('wysiwyg-canvas'); if (c) attach(c); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startEditor); else startEditor();
})();
