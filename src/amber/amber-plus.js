/* =====================================================================
   Amber Plus! What PowerPoint, Keynote and LibreOffice Impress have that Amber didn't:
     Charts           column, bar, line, area, pie and donut charts from a little table of numbers (double-click to edit)
     Presenter View   a second window with your notes, the next slide, a timer and Previous / Next buttons
     Pen & Laser      draw on the slide while you present (L laser, D pen, H highlighter, E erase)
     Format Painter   copy how one object looks and paint it onto another
     Line Spacing     tighter or looser lines for a text box
     Footer           footer text, slide numbers and the date on every slide at once
   Charts are ordinary text boxes that hold an SVG picture, so they save, export, animate and show like everything else!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof slides === 'undefined' || !window.AmberShow) return;
    const OS = window.OfficeShell;
    const SHOW = window.AmberShow;
    const toast = function (m) { try { OS.toast(m); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const slide = function () { return slides[activeSlideIndex]; };
    const activeEl = function () { return activeElementId ? (slide().elements.find(function (e) { return e.id === activeElementId; }) || null) : null; };
    const redraw = function () { try { renderThumbnails(); renderActiveSlide(); OS.sync(); } catch (e) {} try { if (typeof amberQueueSave === 'function') amberQueueSave(); } catch (e) {} };
    const uid = function (p) { return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); };

    const css = document.createElement('style');
    css.textContent = [
        '.am-pdlg label{display:block;font-size:12px;font-weight:700;margin:8px 0 3px;color:#7c2d12}',
        '.am-pdlg input[type=text],.am-pdlg select,.am-pdlg textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px;padding:6px 8px;border-radius:8px;border:1px solid rgba(217,119,6,.5);background:#fff;color:#431407}',
        '.am-pdlg textarea{font-family:ui-monospace,Menlo,monospace;font-size:12px}',
        '.am-pdlg .row{display:flex;gap:8px}.am-pdlg .row>*{flex:1}',
        '.am-pdlg .chk{display:flex;gap:6px;align-items:center;font-weight:600}',
        '.am-pdlg .prev{margin-top:10px;border-radius:12px;background:linear-gradient(135deg,#fbbf24,#d97706);padding:8px;display:flex;justify-content:center}',
        '.am-pdlg .prev svg{width:100%;max-width:340px;height:auto;display:block}',
        '.am-pdlg .note{font-size:11px;color:#92400e;margin-top:6px}',
        'body.am-painting #slide-canvas{cursor:copy}',
        // slide-show tools
        '.as-ink{position:absolute;inset:0;z-index:20;pointer-events:none;width:100%;height:100%}',
        '.amber-show.as-tool .as-ink{pointer-events:auto}',
        '.amber-show.as-tool-laser,.amber-show.as-tool-laser *{cursor:none!important}',
        '.amber-show.as-tool-pen .as-ink,.amber-show.as-tool-hl .as-ink{cursor:crosshair}',
        '.as-laser{position:absolute;z-index:21;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff 0 18%,#ff2d2d 30%,rgba(255,45,45,.55) 55%,rgba(255,45,45,0) 72%);box-shadow:0 0 18px 6px rgba(255,45,45,.55);display:none}',
        '.as-hud button.as-tl{font-size:14px}.as-hud button.as-tl.on{outline:3px solid #0ea5e9;outline-offset:1px}',
        '.as-hud button.as-pv{width:auto;border-radius:16px;padding:0 10px;font-size:12px}'
    ].join('\n');
    document.head.appendChild(css);

    /* ==================================================================
       CHARTS
       ================================================================== */
    const PALETTES = {
        amber: ['#f59e0b', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#ec4899', '#64748b'],
        poolside: ['#06b6d4', '#f97316', '#0284c7', '#fb923c', '#22d3ee', '#ea580c', '#0e7490', '#fdba74'],
        forest: ['#16a34a', '#84cc16', '#0d9488', '#ca8a04', '#15803d', '#65a30d', '#0f766e', '#a16207'],
        berry: ['#db2777', '#9333ea', '#e11d48', '#7c3aed', '#f472b6', '#c026d3', '#be123c', '#a78bfa']
    };
    const SAMPLE = 'Month, Sales, Costs\nJan, 12, 8\nFeb, 19, 11\nMar, 15, 9\nApr, 24, 13\nMay, 30, 15';
    const TYPES = { column: 'Column', bar: 'Bar (sideways)', line: 'Line', area: 'Area', pie: 'Pie', donut: 'Donut' };

    function parseTable(text) {
        const rows = String(text || '').split(/\r?\n/).map(function (l) { return l.split(/[,\t;]/).map(function (c) { return c.trim(); }); }).filter(function (r) { return r.some(Boolean); });
        if (rows.length < 2 || rows[0].length < 2) return null;
        const head = rows[0], body = rows.slice(1);
        const series = head.slice(1).map(function (n, i) { return { name: n || 'Series ' + (i + 1), values: body.map(function (r) { const v = parseFloat(String(r[i + 1] || '').replace(/[^0-9.\-eE]/g, '')); return isFinite(v) ? v : 0; }) }; });
        return { labels: body.map(function (r) { return r[0] || ''; }), series: series };
    }
    function niceStep(range) {
        const raw = range / 4, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / mag;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    }
    const fmt = function (v) { const a = Math.abs(v); return a >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : a >= 1e4 ? +(v / 1e3).toFixed(1) + 'k' : String(+v.toFixed(2)); };
    const clip = function (s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

    function chartSvg(spec) {
        const W = 480, H = 270, cols = PALETTES[spec.palette] || PALETTES.amber, data = spec.series, labels = spec.labels;
        const type = spec.type, pie = type === 'pie' || type === 'donut';
        const legendItems = pie ? labels.map(function (l, i) { return [l, cols[i % cols.length]]; }) : data.map(function (s, i) { return [s.name, cols[i % cols.length]]; });
        const showLegend = spec.legend && (pie || data.length > 1);
        const top = spec.title ? 42 : 18, bottom = showLegend ? H - 34 : H - 12;
        let o = '<svg xmlns="http://www.w3.org/2000/svg" class="am-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block" data-chart="' + esc(JSON.stringify(spec)) + '" font-family="system-ui,sans-serif">';
        o += '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="14" fill="rgba(255,255,255,0.94)" stroke="rgba(0,0,0,0.12)"/>';
        if (spec.title) o += '<text x="' + W / 2 + '" y="27" text-anchor="middle" font-size="16" font-weight="800" fill="#1e293b">' + esc(clip(spec.title, 48)) + '</text>';
        if (pie) {
            const vals = data[0].values.map(function (v) { return Math.max(0, v); }), tot = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
            const cx = W / 2, cy = (top + bottom) / 2 + 2, R = Math.min(bottom - top, W - 40) / 2 - 2, r0 = type === 'donut' ? R * 0.56 : 0;
            let a0 = -Math.PI / 2;
            vals.forEach(function (v, i) {
                const fr = v / tot;
                if (fr <= 0) return;
                const a1 = a0 + fr * Math.PI * 2, big = fr > 0.5 ? 1 : 0;
                const p = function (r, a) { return (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2); };
                let d;
                if (fr >= 0.9999) d = 'M' + p(R, 0) + 'A' + R + ' ' + R + ' 0 1 1 ' + p(R, Math.PI) + 'A' + R + ' ' + R + ' 0 1 1 ' + p(R, 0) + (r0 ? 'M' + p(r0, 0) + 'A' + r0 + ' ' + r0 + ' 0 1 0 ' + p(r0, Math.PI) + 'A' + r0 + ' ' + r0 + ' 0 1 0 ' + p(r0, 0) : '') + 'Z';
                else d = 'M' + p(R, a0) + 'A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + p(R, a1) + (r0 ? 'L' + p(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + p(r0, a0) : 'L' + cx + ' ' + cy) + 'Z';
                o += '<path d="' + d + '" fill="' + cols[i % cols.length] + '" fill-rule="evenodd" stroke="#fff" stroke-width="2"/>';
                if (fr > 0.06) { const m = (a0 + a1) / 2, rr = r0 ? (R + r0) / 2 : R * 0.64; o += '<text x="' + (cx + rr * Math.cos(m)).toFixed(1) + '" y="' + (cy + rr * Math.sin(m) + 4).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:2px">' + Math.round(fr * 100) + '%</text>'; }
                a0 = a1;
            });
        } else {
            const horiz = type === 'bar';
            let mx = 0, mn = 0;
            data.forEach(function (s) { s.values.forEach(function (v) { mx = Math.max(mx, v); mn = Math.min(mn, v); }); });
            if (mx === mn) mx = mn + 1;
            const step = niceStep(mx - mn);
            mx = Math.ceil(mx / step) * step; mn = Math.floor(mn / step) * step;
            const L = horiz ? 64 : 46, Rr = W - 18, T = top, B = bottom - (horiz ? 4 : 20);
            const px0 = L, px1 = Rr, py0 = T, py1 = B;
            const val = function (v) { return horiz ? px0 + (v - mn) / (mx - mn) * (px1 - px0) : py1 - (v - mn) / (mx - mn) * (py1 - py0); };
            for (let t = mn; t <= mx + step / 1000; t += step) {
                const pos = val(t);
                if (horiz) o += '<line x1="' + pos + '" y1="' + py0 + '" x2="' + pos + '" y2="' + py1 + '" stroke="#e2e8f0"/><text x="' + pos + '" y="' + (py1 + 14) + '" text-anchor="middle" font-size="10" fill="#64748b">' + fmt(t) + '</text>';
                else o += '<line x1="' + px0 + '" y1="' + pos + '" x2="' + px1 + '" y2="' + pos + '" stroke="#e2e8f0"/><text x="' + (px0 - 6) + '" y="' + (pos + 3.5) + '" text-anchor="end" font-size="10" fill="#64748b">' + fmt(t) + '</text>';
            }
            const n = labels.length, band = (horiz ? (py1 - py0) : (px1 - px0)) / n, zero = val(0);
            labels.forEach(function (l, i) {
                const c = (horiz ? py0 : px0) + band * (i + 0.5);
                if (horiz) o += '<text x="' + (px0 - 6) + '" y="' + (c + 3.5) + '" text-anchor="end" font-size="10" fill="#475569">' + esc(clip(l, 9)) + '</text>';
                else o += '<text x="' + c + '" y="' + (py1 + 14) + '" text-anchor="middle" font-size="10" fill="#475569">' + esc(clip(l, band > 60 ? 12 : 6)) + '</text>';
            });
            if (type === 'column' || type === 'bar') {
                const k = data.length, bw = Math.min(40, band * 0.78 / k);
                data.forEach(function (s, si) {
                    s.values.forEach(function (v, i) {
                        const c = (horiz ? py0 : px0) + band * (i + 0.5) - bw * k / 2 + bw * si, p = val(v);
                        const col = cols[si % cols.length];
                        if (horiz) o += '<rect x="' + Math.min(p, zero) + '" y="' + c + '" width="' + Math.max(1, Math.abs(p - zero)) + '" height="' + (bw - 1) + '" rx="3" fill="' + col + '"/>';
                        else o += '<rect x="' + c + '" y="' + Math.min(p, zero) + '" width="' + (bw - 1) + '" height="' + Math.max(1, Math.abs(p - zero)) + '" rx="3" fill="' + col + '"/>';
                    });
                });
            } else {
                data.forEach(function (s, si) {
                    const col = cols[si % cols.length];
                    const pts = s.values.map(function (v, i) { return [px0 + band * (i + 0.5), val(v)]; });
                    const line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
                    if (type === 'area') o += '<path d="' + line + 'L' + pts[pts.length - 1][0].toFixed(1) + ' ' + zero + 'L' + pts[0][0].toFixed(1) + ' ' + zero + 'Z" fill="' + col + '" fill-opacity="0.35"/>';
                    o += '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
                    pts.forEach(function (p) { o += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="#fff" stroke="' + col + '" stroke-width="2"/>'; });
                });
            }
            o += horiz ? '<line x1="' + zero + '" y1="' + py0 + '" x2="' + zero + '" y2="' + py1 + '" stroke="#94a3b8"/>' : '<line x1="' + px0 + '" y1="' + zero + '" x2="' + px1 + '" y2="' + zero + '" stroke="#94a3b8"/>';
        }
        if (showLegend) {
            const widths = legendItems.map(function (it) { return 26 + Math.min(it[0].length, 14) * 6; }), tw = widths.reduce(function (a, b) { return a + b; }, 0);
            let x = Math.max(8, (W - tw) / 2);
            legendItems.forEach(function (it, i) { o += '<rect x="' + x + '" y="' + (H - 25) + '" width="11" height="11" rx="3" fill="' + it[1] + '"/><text x="' + (x + 16) + '" y="' + (H - 15.5) + '" font-size="11" fill="#334155">' + esc(clip(it[0], 14)) + '</text>'; x += widths[i]; });
        }
        return o + '</svg>';
    }
    function chartSpecOf(el) {
        if (!el || typeof el.content !== 'string' || el.content.indexOf('am-chart') < 0) return null;
        const d = document.createElement('div'); d.innerHTML = el.content;
        const s = d.querySelector('svg.am-chart');
        try { return s ? JSON.parse(s.getAttribute('data-chart')) : null; } catch (e) { return null; }
    }
    async function chartDialog(existing) {
        const old = existing ? chartSpecOf(existing) : null;
        const sp = old || { type: 'column', title: 'Quarterly Results', palette: 'amber', legend: true, table: SAMPLE };
        const box = document.createElement('div');
        box.className = 'am-pdlg';
        const tableText = old ? ['Label'].concat(old.series.map(function (s) { return s.name; })).join(', ') + '\n' + old.labels.map(function (l, i) { return [l].concat(old.series.map(function (s) { return s.values[i]; })).join(', '); }).join('\n') : sp.table;
        box.innerHTML = '<div class="row"><div><label>Chart type</label><select id="ch-type">' + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (sp.type === k ? ' selected' : '') + '>' + TYPES[k] + '</option>'; }).join('') + '</select></div>' +
            '<div><label>Colors</label><select id="ch-pal">' + Object.keys(PALETTES).map(function (k) { return '<option value="' + k + '"' + (sp.palette === k ? ' selected' : '') + '>' + k[0].toUpperCase() + k.slice(1) + '</option>'; }).join('') + '</select></div></div>' +
            '<label>Title</label><input type="text" id="ch-title" value="' + esc(sp.title) + '">' +
            '<label>Data (first row names the series, first column names the groups)</label><textarea id="ch-data" rows="7" spellcheck="false">' + esc(tableText) + '</textarea>' +
            '<label class="chk"><input type="checkbox" id="ch-leg"' + (sp.legend ? ' checked' : '') + '> Show legend</label><div class="prev" id="ch-prev"></div><div class="note">Paste straight from a spreadsheet! Pie and donut charts use the first series!</div>';
        const read = function () {
            const t = parseTable(box.querySelector('#ch-data').value);
            if (!t) return null;
            return { type: box.querySelector('#ch-type').value, palette: box.querySelector('#ch-pal').value, title: box.querySelector('#ch-title').value.trim(), legend: box.querySelector('#ch-leg').checked, labels: t.labels, series: t.series };
        };
        const upd = function () { const s = read(); box.querySelector('#ch-prev').innerHTML = s ? chartSvg(s) : '<span style="color:#7c2d12;font-size:12px">Needs a header row plus at least one row of numbers!</span>'; };
        box.addEventListener('input', upd); box.addEventListener('change', upd); upd();
        const spec = await OS.dialog(existing ? 'Edit Chart' : 'Insert Chart', box, [{ label: 'Cancel', value: null }, { label: existing ? 'Update' : 'Insert', value: function () { return read() || undefined; }, primary: true }]);
        if (!spec) return;
        saveState();
        if (existing) { existing.content = chartSvg(spec); toast('Chart updated!'); }
        else {
            const id = uid('el');
            slide().elements.push({ id: id, type: 'text', content: chartSvg(spec), top: 70, left: 120, width: 480, height: 270, zIndex: slide().elements.length + 1, fontSize: '16px', color: '#1e293b', textAlign: 'left' });
            activeElementId = id; editingElementId = null;
            toast('Chart added! Double-click it to change the numbers!');
        }
        redraw();
    }
    function editChart() { const el = activeEl(); if (el && chartSpecOf(el)) chartDialog(el); else toast('Select a chart first!'); }
    document.addEventListener('dblclick', function (e) {
        const n = e.target.closest && e.target.closest('#slide-canvas .slide-element');
        if (!n) return;
        const el = slide().elements.find(function (x) { return x.id === n.dataset.elId; });
        if (el && chartSpecOf(el)) { e.preventDefault(); e.stopImmediatePropagation(); activeElementId = el.id; chartDialog(el); }
    }, true);

    /* ==================================================================
       FORMAT PAINTER
       ================================================================== */
    let painter = null;
    const TEXT_PROPS = ['fontSize', 'color', 'fontFamily', 'textAlign', 'lineHeight'];
    const SHAPE_PROPS = ['fillColor', 'strokeSync', 'strokeColor', 'strokeWidth', 'cornerRadius', 'cornerRx', 'cornerRy', 'bgBlur', 'innerShadow'];
    function formatPainter() {
        const el = activeEl();
        if (!el) { toast('Select the object whose look you want to copy first!'); return; }
        painter = { from: el.id, props: {}, shape: el.type === 'shape' };
        TEXT_PROPS.concat(el.type === 'shape' ? SHAPE_PROPS : []).forEach(function (k) { if (el[k] !== undefined) painter.props[k] = JSON.parse(JSON.stringify(el[k])); });
        document.body.classList.add('am-painting');
        toast('Now click the object to paint!');
        OS.sync();
    }
    function stopPainter() { painter = null; document.body.classList.remove('am-painting'); OS.sync(); }
    document.addEventListener('mousedown', function (e) {
        if (!painter) return;
        const n = e.target.closest && e.target.closest('#slide-canvas .slide-element');
        if (!n) { if (e.target.closest && e.target.closest('#slide-canvas')) stopPainter(); return; }
        if (n.dataset.elId === painter.from) return;
        const el = slide().elements.find(function (x) { return x.id === n.dataset.elId; });
        if (!el) return;
        e.preventDefault(); e.stopImmediatePropagation();
        saveState();
        Object.keys(painter.props).forEach(function (k) { if (SHAPE_PROPS.indexOf(k) >= 0 && el.type !== 'shape') return; el[k] = JSON.parse(JSON.stringify(painter.props[k])); });
        activeElementId = el.id;
        stopPainter(); redraw(); toast('Formatting painted!');
    }, true);
    document.addEventListener('keydown', function (e) { if (painter && e.key === 'Escape') stopPainter(); }, true);

    /* ==================================================================
       LINE SPACING
       ================================================================== */
    function lineSpacingMenu() {
        const el = activeEl(), cur = el && el.lineHeight ? el.lineHeight : 0;
        const set = function (v) { const e = activeEl(); if (!e) { toast('Select a text box or shape first!'); return; } saveState(); e.lineHeight = v || null; redraw(); toast(v ? 'Line spacing ' + v + '!' : 'Line spacing reset!'); };
        return [['1.0', 1], ['1.15', 1.15], ['1.5', 1.5], ['2.0', 2], ['2.5', 2.5], ['3.0', 3]].map(function (x) { return { label: x[0], checked: cur === x[1], run: function () { set(x[1]); } }; })
            .concat([{ sep: true }, { label: 'Default spacing', run: function () { set(0); } }]);
    }

    /* ==================================================================
       FOOTER, SLIDE NUMBERS AND DATE ON EVERY SLIDE
       ================================================================== */
    const FTR = 'el-ftr-';
    function inkFor(bg) {
        const m = String(bg || '').match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
        if (!m) return '#ffffff';
        let h = m[1]; if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
        const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#1e293b' : '#ffffff';
    }
    function footerState() {
        const f = {}; slides[0].elements.forEach(function (e) { if (e.id.indexOf(FTR) === 0) f[e.id.slice(FTR.length)] = e; });
        const first = slides.length > 1 && !slides[0].elements.some(function (e) { return e.id.indexOf(FTR) === 0; }) && slides[1].elements.some(function (e) { return e.id.indexOf(FTR) === 0; });
        const any = slides.map(function (s) { return s.elements.filter(function (e) { return e.id.indexOf(FTR) === 0; }); }).find(function (a) { return a.length; }) || [];
        const by = {}; any.forEach(function (e) { by[e.id.slice(FTR.length)] = e; });
        return { text: by.text ? by.text.content.replace(/<[^>]*>/g, '') : '', num: !!by.num, date: !!by.date, skipFirst: first };
    }
    function applyFooter(o) {
        saveState();
        slides.forEach(function (s, i) {
            s.elements = s.elements.filter(function (e) { return e.id.indexOf(FTR) !== 0; });
            if (o.clear || (o.skipFirst && i === 0)) return;
            const color = inkFor(s.background), z = 900;
            const add = function (k, c, left, w, align) { s.elements.push({ id: FTR + k, type: 'text', content: c, top: 368, left: left, width: w, height: 28, zIndex: z, fontSize: '12px', color: color, textAlign: align }); };
            if (o.text) add('text', esc(o.text), 28, 330, 'left');
            if (o.date) add('date', esc(o.dateText), 270, 180, 'center');
            if (o.num) add('num', String(i + 1), 640, 52, 'right');
        });
        redraw();
    }
    async function footerDialog() {
        const f = footerState(), box = document.createElement('div');
        box.className = 'am-pdlg';
        box.innerHTML = '<label>Footer text</label><input type="text" id="ft-text" value="' + esc(f.text) + '" placeholder="Company name, talk title…">' +
            '<label class="chk" style="margin-top:10px"><input type="checkbox" id="ft-num"' + (f.num ? ' checked' : '') + '> Slide number</label>' +
            '<label class="chk"><input type="checkbox" id="ft-date"' + (f.date ? ' checked' : '') + '> Date <input type="text" id="ft-dt" value="' + esc(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })) + '" style="flex:1"></label>' +
            '<label class="chk"><input type="checkbox" id="ft-skip"' + (f.skipFirst ? ' checked' : '') + '> Don\'t show on the title slide</label>' +
            '<div class="note">Footers are small text boxes you can still move or delete! Run this again after you reorder slides to refresh the numbers!</div>';
        const r = await OS.dialog('Header & Footer', box, [{ label: 'Cancel', value: null }, { label: 'Remove Footers', value: { clear: true }, danger: true }, { label: 'Apply to All', primary: true, value: function (b) { return { text: b.querySelector('#ft-text').value.trim(), num: b.querySelector('#ft-num').checked, date: b.querySelector('#ft-date').checked, dateText: b.querySelector('#ft-dt').value.trim(), skipFirst: b.querySelector('#ft-skip').checked }; } }]);
        if (!r) return;
        applyFooter(r);
        toast(r.clear ? 'Footers removed!' : 'Footer added to every slide!');
    }

    /* ==================================================================
       PEN, HIGHLIGHTER AND LASER IN THE SLIDE SHOW
       ================================================================== */
    let tools = null;
    const PEN = { pen: ['#ef4444', 4], hl: ['rgba(250,204,21,0.45)', 22] };
    function setTool(name) {
        if (!tools) return;
        tools.tool = tools.tool === name ? null : name;
        const el = tools.el;
        el.classList.toggle('as-tool', !!tools.tool);
        ['laser', 'pen', 'hl'].forEach(function (k) { el.classList.toggle('as-tool-' + k, tools.tool === k); });
        tools.laser.style.display = 'none';
        el.querySelectorAll('.as-tl').forEach(function (b) { b.classList.toggle('on', b.dataset.tl === tools.tool); });
    }
    function clearInk() { if (tools) tools.ctx.clearRect(0, 0, tools.cv.width, tools.cv.height); }
    function installShowTools(el) {
        const cv = document.createElement('canvas');
        cv.className = 'as-ink';
        const laser = document.createElement('div');
        laser.className = 'as-laser';
        el.appendChild(cv); el.appendChild(laser);
        const size = function () { const r = el.getBoundingClientRect(); if (cv.width !== r.width || cv.height !== r.height) { cv.width = Math.max(1, Math.round(r.width)); cv.height = Math.max(1, Math.round(r.height)); } };
        size();
        tools = { el: el, cv: cv, ctx: cv.getContext('2d'), laser: laser, tool: null, down: false, last: null };
        const pos = function (e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
        cv.addEventListener('pointerdown', function (e) {
            e.stopPropagation();
            if (tools.tool === 'pen' || tools.tool === 'hl') { tools.down = true; tools.last = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (x) {} tools.ctx.beginPath(); }
        });
        cv.addEventListener('pointermove', function (e) {
            e.stopPropagation();
            const p = pos(e);
            if (tools.tool === 'laser') { laser.style.display = 'block'; laser.style.left = p[0] + 'px'; laser.style.top = p[1] + 'px'; return; }
            if (!tools.down) return;
            const c = tools.ctx, k = PEN[tools.tool];
            c.globalCompositeOperation = 'source-over';
            c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = k[0]; c.lineWidth = k[1];
            c.beginPath(); c.moveTo(tools.last[0], tools.last[1]); c.lineTo(p[0], p[1]); c.stroke();
            tools.last = p;
        });
        cv.addEventListener('pointerup', function (e) { e.stopPropagation(); tools.down = false; });
        cv.addEventListener('click', function (e) { e.stopPropagation(); });
        cv.addEventListener('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); });
        const hud = el.querySelector('.as-hud');
        if (hud) {
            const mk = function (label, title, attr, fn, cls) {
                const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.title = title; b.textContent = label;
                if (attr) b.dataset.tl = attr;
                b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
                hud.insertBefore(b, hud.querySelector('.as-exit'));
            };
            mk('🔴', 'Laser pointer (L)', 'laser', function () { setTool('laser'); }, 'as-tl');
            mk('✏️', 'Pen (D)', 'pen', function () { setTool('pen'); }, 'as-tl');
            mk('🖍️', 'Highlighter (H)', 'hl', function () { setTool('hl'); }, 'as-tl');
            mk('🧽', 'Erase drawing (E)', '', clearInk, 'as-tl');
            mk('🎤 Presenter', 'Presenter View (V)', '', presenterView, 'as-pv');
        }
        // fresh slide, fresh ink
        const count = el.querySelector('.as-count');
        if (count) new MutationObserver(clearInk).observe(count, { childList: true, characterData: true, subtree: true });
        window.addEventListener('resize', size);
    }
    new MutationObserver(function (muts) {
        muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.classList.contains('amber-show') && !n.querySelector('.as-ink')) installShowTools(n); }); m.removedNodes.forEach(function (n) { if (n.nodeType === 1 && n.classList.contains('amber-show')) { tools = null; } }); });
    }).observe(document.body, { childList: true });
    window.addEventListener('keydown', function (e) {
        if (!tools || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key.toLowerCase(), stop = function () { e.preventDefault(); e.stopImmediatePropagation(); };
        if (k === 'l') { stop(); setTool('laser'); }
        else if (k === 'd') { stop(); setTool('pen'); }
        else if (k === 'h') { stop(); setTool('hl'); }
        else if (k === 'e') { stop(); clearInk(); }
        else if (k === 'v') { stop(); presenterView(); }
        else if (k === 'escape' && tools.tool) { stop(); setTool(tools.tool); }
    }, true);

    /* ==================================================================
       PRESENTER VIEW (a second window: notes, next slide, timer, buttons)
       ================================================================== */
    let pv = null, pvTimer = null;
    const slideText = function (s) {
        const d = document.createElement('div');
        return s.elements.slice().sort(function (a, b) { return (a.top - b.top) || (a.left - b.left); }).map(function (e) { d.innerHTML = e.content || ''; return (d.textContent || '').trim(); }).filter(Boolean);
    };
    const titleOf = function (s) { return (slideText(s)[0] || s.title || 'Untitled slide').slice(0, 80); };
    function presenterView() {
        if (pv && !pv.closed) { pv.focus(); return; }
        const w = window.open('', 'amber-presenter', 'width=980,height=640');
        if (!w) { toast('Allow pop-ups to open Presenter View!'); return; }
        pv = w;
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Presenter View</title><style>' +
            'body{margin:0;font:15px system-ui,sans-serif;background:#1c1917;color:#fef3c7;display:grid;grid-template-columns:1.25fr 1fr;grid-template-rows:auto 1fr auto;height:100vh;gap:14px;padding:14px;box-sizing:border-box}' +
            '.top{grid-column:1/3;display:flex;align-items:center;gap:18px}.top b{font-size:22px;color:#fbbf24}.top .t{font:800 30px ui-monospace,monospace;color:#fff}.top .c{opacity:.7;font:600 14px ui-monospace,monospace}.sp{flex:1}' +
            'section{background:#292524;border:1px solid #57534e;border-radius:14px;padding:14px 16px;overflow:auto;min-height:0}section h2{margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#fb923c}' +
            '#cur{font-size:26px;font-weight:800;color:#fff;margin-bottom:8px}#cl{margin:0;padding-left:20px;opacity:.85}#notes{white-space:pre-wrap;font-size:20px;line-height:1.45;color:#fff}#notes.e{opacity:.5;font-style:italic}' +
            '#nxt{font-size:19px;font-weight:700;color:#fff}.nl{opacity:.75;margin:6px 0 0;padding-left:20px}' +
            '.bar{grid-column:1/3;display:flex;gap:10px}button{font:800 15px system-ui;padding:10px 20px;border-radius:999px;border:0;cursor:pointer;background:linear-gradient(180deg,#fcd34d,#d97706);color:#431407}button.s{background:#44403c;color:#fef3c7}button.d{background:linear-gradient(180deg,#fca5a5,#dc2626);color:#fff}' +
            '</style></head><body><div class="top"><b>Presenter View</b><span class="t" id="tm">00:00</span><button class="s" id="rs">Reset timer</button><span class="sp"></span><span class="c" id="ck"></span><span class="c" id="ct"></span></div>' +
            '<section><h2>Now showing</h2><div id="cur"></div><ul id="cl"></ul><h2 style="margin-top:16px">Speaker notes</h2><div id="notes"></div></section>' +
            '<section><h2>Up next</h2><div id="nxt"></div><ul class="nl" id="nl"></ul></section>' +
            '<div class="bar"><button class="s" id="pr">◀ Previous</button><button id="nx">Next ▶</button><span class="sp"></span><button class="d" id="en">End show</button></div></body></html>');
        w.document.close();
        const g = function (id) { return w.document.getElementById(id); };
        let t0 = Date.now(), lastKey = '';
        g('rs').onclick = function () { t0 = Date.now(); };
        g('pr').onclick = function () { SHOW.prev(); };
        g('nx').onclick = function () { SHOW.next(); };
        g('en').onclick = function () { SHOW.exit(); };
        w.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); SHOW.next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); SHOW.prev(); } else if (e.key === 'Escape') SHOW.exit(); });
        const li = function (a) { return a.slice(1, 7).map(function (t) { return '<li>' + esc(t.slice(0, 90)) + '</li>'; }).join(''); };
        const tick = function () {
            if (!pv || pv.closed) { clearInterval(pvTimer); pv = null; return; }
            const st = SHOW.state(), sl = window.Amber.getSlides();
            const sec = Math.floor((Date.now() - t0) / 1000), p2 = function (n) { return String(n).padStart(2, '0'); };
            g('tm').textContent = (sec >= 3600 ? p2(Math.floor(sec / 3600)) + ':' : '') + p2(Math.floor(sec / 60) % 60) + ':' + p2(sec % 60);
            g('ck').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const i = st ? st.index : activeSlideIndex, s = sl[i];
            const key = i + '|' + (st ? st.step : 0) + '|' + (s ? s.notes : '');
            g('ct').textContent = 'Slide ' + (i + 1) + ' of ' + sl.length + (st && st.steps ? ' · step ' + Math.min(st.step, st.steps) + '/' + st.steps : '') + (st ? '' : ' · show not running');
            if (key === lastKey || !s) return;
            lastKey = key;
            g('cur').textContent = titleOf(s); g('cl').innerHTML = li(slideText(s));
            const n = (s.notes || '').trim();
            g('notes').textContent = n || 'No notes for this slide! Add some in Amber under View, Notes!'; g('notes').className = n ? '' : 'e';
            let j = i + 1; while (j < sl.length && sl[j].hidden) j++;
            if (j < sl.length) { g('nxt').textContent = titleOf(sl[j]); g('nl').innerHTML = li(slideText(sl[j])); }
            else { g('nxt').textContent = 'End of the show!'; g('nl').innerHTML = ''; }
        };
        clearInterval(pvTimer); pvTimer = setInterval(tick, 400); tick();
        if (!SHOW.isShowing()) SHOW.start(activeSlideIndex);
    }

    window.AmberPlus = {
        chartDialog: function () { return chartDialog(null); }, editChart: editChart, chartSvg: chartSvg, parseTable: parseTable, chartSpecOf: chartSpecOf,
        formatPainter: formatPainter, painting: function () { return !!painter; }, lineSpacingMenu: lineSpacingMenu,
        footerDialog: footerDialog, applyFooter: applyFooter, presenterView: presenterView,
        setTool: setTool, tool: function () { return tools ? tools.tool : null; }
    };
})();
