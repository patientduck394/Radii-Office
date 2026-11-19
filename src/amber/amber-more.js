/* =====================================================================
   Amber More! Another round of features for Amber:
     Rotate & Flip      turn an object by any angle, flip it sideways or upside down
     Transparency       fade any object from 100% to almost clear
     Shadow             soft, hard, lift and glow shadows for any object
     Align to Slide     left, center, right, top, middle, bottom
     Size & Position    type the exact place, size and angle of an object
     Icons              hundreds of icons from Vadivam (MIT License, github.com/praveenjuge/vadivam), any color and size
     Diagrams           process, list, cycle, pyramid, timeline and hub diagrams from a list of words
     Find & Replace     across every slide at once (also Ctrl/Cmd+F)
     Agenda Slide       a contents slide made from your slide titles
     Deck Stats         slides, words, objects and how long it takes to say it
   Rotation, flip, transparency and shadow are saved with the slide (see applyElFx in slides-app.js).
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof slides === 'undefined') return;
    const OS = window.OfficeShell;
    const toast = function (m) { try { OS.toast(m); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const slide = function () { return slides[activeSlideIndex]; };
    const activeEl = function () { return activeElementId ? (slide().elements.find(function (e) { return e.id === activeElementId; }) || null) : null; };
    const redraw = function () { try { renderThumbnails(); renderActiveSlide(); OS.sync(); } catch (e) {} try { if (typeof amberQueueSave === 'function') amberQueueSave(); } catch (e) {} };
    const uid = function (p) { return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); };
    const W = 720, H = 405;

    const css = document.createElement('style');
    css.textContent = [
        '.am-mdlg label{display:block;font-size:12px;font-weight:700;margin:8px 0 3px}',
        '.am-mdlg input[type=text],.am-mdlg input[type=number],.am-mdlg select,.am-mdlg textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px;padding:6px 8px;border-radius:8px;border:1px solid rgba(120,120,120,.45);background:var(--os-field,#fff);color:inherit}',
        '.am-mdlg .row{display:flex;gap:8px}.am-mdlg .row>*{flex:1}',
        '.am-mdlg .chk{display:flex;gap:6px;align-items:center;font-weight:600}.am-mdlg .note{font-size:11px;opacity:.7;margin-top:6px}',
        '.am-icgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:6px;max-height:240px;overflow:auto;margin-top:8px;padding:2px}',
        '.am-icgrid button{height:44px;border-radius:10px;border:1.5px solid rgba(120,120,120,.35);background:transparent;color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
        '.am-icgrid button svg{width:22px;height:22px}.am-icgrid button:hover{border-color:var(--os-accent,#d97706)}.am-icgrid button.on{border-color:var(--os-accent,#d97706);background:var(--os-hover,rgba(217,119,6,.15))}',
        '.am-icprev{display:flex;align-items:center;justify-content:center;height:90px;border-radius:12px;margin-top:8px;background:linear-gradient(135deg,#fbbf24,#d97706)}.am-icprev svg{width:56px;height:56px}',
        '.am-dgprev{margin-top:8px;border-radius:12px;background:linear-gradient(135deg,#fbbf24,#d97706);padding:6px}.am-dgprev svg{width:100%;height:auto;display:block}'
    ].join('\n');
    document.head.appendChild(css);

    function needEl(fn) { const e = activeEl(); if (!e) { toast('Select an object first!'); return; } fn(e); }
    function change(fn, msg) { needEl(function (e) { saveState(); fn(e); redraw(); if (msg) toast(msg); }); }
    function numPrompt(title, label, value, okLabel) {
        const box = document.createElement('div'); box.className = 'am-mdlg';
        box.innerHTML = '<label>' + esc(label) + '</label><input type="number" step="any" value="' + esc(value) + '">';
        return OS.dialog(title, box, [{ label: 'Cancel', value: null }, { label: okLabel || 'OK', primary: true, value: function (b) { const v = parseFloat(b.querySelector('input').value); return isNaN(v) ? null : v; } }]);
    }

    /* ---------- Rotate, flip, transparency, shadow ---------- */
    function norm(a) { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; }
    function rotateMenu() {
        const turn = function (d) { return function () { change(function (e) { e.rotation = norm((e.rotation || 0) + d); if (!e.rotation) delete e.rotation; }); }; };
        return [
            { label: 'Rotate Right 15°', icon: 'redo', run: turn(15) },
            { label: 'Rotate Left 15°', icon: 'undo', run: turn(-15) },
            { label: 'Rotate Right 90°', icon: 'redo', run: turn(90) },
            { label: 'Rotate Left 90°', icon: 'undo', run: turn(-90) },
            { sep: true },
            { label: 'Flip Sideways', icon: 'aCenter', checked: !!(activeEl() && activeEl().flipX), run: function () { change(function (e) { e.flipX = !e.flipX; }); } },
            { label: 'Flip Upside Down', icon: 'aJustify', checked: !!(activeEl() && activeEl().flipY), run: function () { change(function (e) { e.flipY = !e.flipY; }); } },
            { sep: true },
            { label: 'Exact Angle…', icon: 'pen', run: function () { needEl(function (e) { numPrompt('Exact Angle', 'Angle in degrees (-180 to 180)', e.rotation || 0, 'Turn').then(function (v) { if (v == null) return; change(function (x) { x.rotation = norm(v); if (!x.rotation) delete x.rotation; }); }); }); } },
            { label: 'Straighten and Unflip', icon: 'trash', run: function () { change(function (e) { delete e.rotation; delete e.flipX; delete e.flipY; }, 'Back to normal!'); } }
        ];
    }
    function transparencyMenu() {
        const cur = activeEl() ? (activeEl().opacity == null ? 1 : activeEl().opacity) : 1;
        return [1, 0.9, 0.75, 0.5, 0.25, 0.1].map(function (v) {
            return { label: Math.round(v * 100) + '% visible' + (v === 1 ? ' (normal)' : ''), checked: Math.abs(cur - v) < 0.01, run: function () { change(function (e) { if (v === 1) delete e.opacity; else e.opacity = v; }); } };
        });
    }
    function shadowMenu() {
        const cur = activeEl() ? activeEl().shadow : null;
        const names = { soft: 'Soft', lift: 'Lifted', hard: 'Hard offset', long: 'Long', glow: 'Glow', ink: 'Dark outline' };
        const items = [{ label: 'No Shadow', checked: !cur, run: function () { change(function (e) { delete e.shadow; }); } }, { sep: true }];
        Object.keys(names).forEach(function (k) { items.push({ label: names[k], checked: cur === k, run: function () { change(function (e) { e.shadow = k; }); } }); });
        return items;
    }

    /* ---------- Align to slide, size and position ---------- */
    function alignMenu() {
        const put = function (fn) { return function () { change(function (e) { fn(e); e.left = Math.round(e.left); e.top = Math.round(e.top); }); }; };
        return [
            { label: 'Align Left', icon: 'aLeft', run: put(function (e) { e.left = 0; }) },
            { label: 'Align Center', icon: 'aCenter', run: put(function (e) { e.left = (W - (e.width || 120)) / 2; }) },
            { label: 'Align Right', icon: 'aRight', run: put(function (e) { e.left = W - (e.width || 120); }) },
            { sep: true },
            { label: 'Align Top', icon: 'aLeft', run: put(function (e) { e.top = 0; }) },
            { label: 'Align Middle', icon: 'aJustify', run: put(function (e) { e.top = (H - (e.height || 60)) / 2; }) },
            { label: 'Align Bottom', icon: 'aRight', run: put(function (e) { e.top = H - (e.height || 60); }) },
            { sep: true },
            { label: 'Center on the Slide', icon: 'aCenter', run: put(function (e) { e.left = (W - (e.width || 120)) / 2; e.top = (H - (e.height || 60)) / 2; }) },
            { label: 'Fill the Slide Width', icon: 'aJustify', run: put(function (e) { e.left = 0; e.width = W; }) }
        ];
    }
    function sizeDialog() {
        needEl(function (e) {
            const box = document.createElement('div'); box.className = 'am-mdlg';
            const f = function (id, label, v) { return '<div><label>' + label + '</label><input type="number" step="1" id="sp-' + id + '" value="' + Math.round(v) + '"></div>'; };
            box.innerHTML = '<div class="row">' + f('x', 'Left (x)', e.left) + f('y', 'Top (y)', e.top) + '</div><div class="row">' + f('w', 'Width', e.width || 120) + f('h', 'Height', e.height || 60) + '</div>'
                + '<div class="row">' + f('r', 'Angle (degrees)', e.rotation || 0) + '<div><label>Slide is</label><input type="text" disabled value="' + W + ' × ' + H + '"></div></div>'
                + '<label class="chk"><input type="checkbox" id="sp-lock"> Keep the shape proportions when I change the width</label>';
            const ratio = (e.width || 120) / (e.height || 60);
            box.querySelector('#sp-w').addEventListener('input', function () { if (box.querySelector('#sp-lock').checked) box.querySelector('#sp-h').value = Math.round((+this.value || 10) / ratio); });
            OS.dialog('Size & Position', box, [{ label: 'Cancel', value: null }, { label: 'Apply', primary: true, value: function (b) { const g = function (id) { return parseFloat(b.querySelector('#sp-' + id).value); }; return { x: g('x'), y: g('y'), w: g('w'), h: g('h'), r: g('r') }; } }]).then(function (v) {
                if (!v) return;
                change(function (el) {
                    if (!isNaN(v.x)) el.left = v.x;
                    if (!isNaN(v.y)) el.top = v.y;
                    if (!isNaN(v.w)) el.width = Math.max(10, v.w);
                    if (!isNaN(v.h)) el.height = Math.max(10, v.h);
                    if (!isNaN(v.r)) { const a = norm(v.r); if (a) el.rotation = a; else delete el.rotation; }
                });
            });
        });
    }

    /* ---------- Icons from Vadivam ---------- */
    let iconsLoading = null;
    function loadIcons() {
        if (window.AMBER_ICONS) return Promise.resolve(window.AMBER_ICONS);
        if (!iconsLoading) iconsLoading = new Promise(function (res, rej) {
            const s = document.createElement('script'); s.src = 'vadivam-icons.js?v=20261118f';
            s.onload = function () { res(window.AMBER_ICONS); }; s.onerror = function () { iconsLoading = null; rej(new Error('icons')); };
            document.head.appendChild(s);
        });
        return iconsLoading;
    }
    function iconSvg(name, color, sw) {
        const inner = (window.AMBER_ICONS || {})[name] || '';
        return '<svg xmlns="http://www.w3.org/2000/svg" class="am-icon" data-icon="' + esc(name) + '" viewBox="0 0 24 24" fill="none" stroke="' + esc(color) + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;display:block">' + inner + '</svg>';
    }
    function iconOf(el) {
        if (!el || typeof el.content !== 'string' || el.content.indexOf('am-icon') < 0) return null;
        const d = document.createElement('div'); d.innerHTML = el.content;
        const s = d.querySelector('svg.am-icon');
        return s ? { name: s.getAttribute('data-icon'), color: s.getAttribute('stroke') || '#ffffff', sw: parseFloat(s.getAttribute('stroke-width')) || 2 } : null;
    }
    async function iconDialog(existing) {
        try { await loadIcons(); } catch (e) { toast('The icons did not load, please try again!'); return; }
        const icons = window.AMBER_ICONS, names = Object.keys(icons).sort();
        const old = existing ? iconOf(existing) : null;
        const cur = { name: old ? old.name : 'star', color: old ? old.color : '#ffffff', sw: old ? old.sw : 2, size: existing ? Math.round(existing.width || 96) : 96 };
        const sizes = [[48, 'Small'], [96, 'Medium'], [160, 'Large'], [260, 'Huge']];
        const box = document.createElement('div'); box.className = 'am-mdlg';
        box.innerHTML = '<input type="text" id="ic-q" placeholder="Search ' + names.length + ' icons: heart, chart, arrow, cloud…" spellcheck="false"><div class="am-icgrid" id="ic-grid"></div><div class="am-icprev" id="ic-prev"></div>'
            + '<div class="row"><div><label>Color</label><input type="color" id="ic-col" value="' + (/^#[0-9a-f]{6}$/i.test(cur.color) ? cur.color : '#ffffff') + '"></div>'
            + '<div><label>Line thickness</label><select id="ic-sw">' + [1, 1.5, 2, 2.5, 3].map(function (n) { return '<option value="' + n + '"' + (n === cur.sw ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div>'
            + (existing ? '' : '<div><label>Size</label><select id="ic-size">' + sizes.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === cur.size ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>') + '</div>'
            + '<div class="note">Icons by Vadivam (MIT License)! To change one later, double-click it or use Insert > Icons > Edit Icon!</div>';
        const grid = box.querySelector('#ic-grid');
        const read = function () { cur.color = box.querySelector('#ic-col').value; cur.sw = +box.querySelector('#ic-sw').value; const s = box.querySelector('#ic-size'); if (s) cur.size = +s.value; };
        const drawGrid = function () {
            const q = box.querySelector('#ic-q').value.trim().toLowerCase();
            const hits = names.filter(function (n) { return !q || n.indexOf(q) >= 0; }).slice(0, 260);
            grid.innerHTML = hits.map(function (n) { return '<button type="button" data-n="' + n + '" title="' + n + '" class="' + (n === cur.name ? 'on' : '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icons[n] + '</svg></button>'; }).join('') || '<span style="grid-column:1/-1;font-size:12px;opacity:.7">Nothing matches that, try another word!</span>';
        };
        // the grid is only rebuilt when you search, so a click is never lost between press and release
        const draw = function () {
            grid.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.n === cur.name); });
            box.querySelector('#ic-prev').innerHTML = iconSvg(cur.name, cur.color, cur.sw);
        };
        box.addEventListener('input', function (e) { if (e.target.id === 'ic-q') drawGrid(); else read(); draw(); });
        box.addEventListener('change', function (e) { if (e.target.id === 'ic-q') return; read(); draw(); });
        grid.addEventListener('click', function (e) { const b = e.target.closest('button[data-n]'); if (b) { cur.name = b.dataset.n; draw(); } });
        drawGrid(); draw();
        const ok = await OS.dialog(existing ? 'Edit Icon' : 'Insert Icon', box, [{ label: 'Cancel', value: false }, { label: existing ? 'Update' : 'Insert', primary: true, value: true }]);
        if (!ok) return;
        saveState();
        if (existing) { existing.content = iconSvg(cur.name, cur.color, cur.sw); existing.color = cur.color; toast('Icon updated!'); }
        else {
            const id = uid('el');
            slide().elements.push({ id: id, type: 'text', content: iconSvg(cur.name, cur.color, cur.sw), top: Math.round((H - cur.size) / 2), left: Math.round((W - cur.size) / 2), width: cur.size, height: cur.size, zIndex: slide().elements.length + 1, fontSize: '16px', color: cur.color, textAlign: 'center' });
            activeElementId = id; editingElementId = null;
            toast('Icon added! Drag it, resize it, rotate it!');
        }
        redraw();
    }
    function editIcon() { const el = activeEl(); if (el && iconOf(el)) iconDialog(el); else toast('Select an icon first!'); }
    document.addEventListener('dblclick', function (e) {
        const n = e.target.closest && e.target.closest('#slide-canvas .slide-element');
        if (!n) return;
        const el = slide().elements.find(function (x) { return x.id === n.dataset.elId; });
        if (el && iconOf(el)) { e.preventDefault(); e.stopPropagation(); iconDialog(el); }
    }, true);

    /* ---------- Diagrams ---------- */
    const DG_KINDS = { process: 'Process (steps in a row)', list: 'List (stacked bars)', cycle: 'Cycle (a ring)', pyramid: 'Pyramid (levels)', timeline: 'Timeline (dots on a line)', hub: 'Hub (one idea in the middle)' };
    const DG_COLORS = { amber: ['#f59e0b', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#ec4899', '#64748b'], ocean: ['#0ea5e9', '#0284c7', '#06b6d4', '#0369a1', '#22d3ee', '#075985', '#38bdf8', '#0e7490'], sunset: ['#f97316', '#ef4444', '#ec4899', '#f59e0b', '#dc2626', '#fb7185', '#ea580c', '#be123c'], forest: ['#16a34a', '#84cc16', '#0d9488', '#65a30d', '#15803d', '#14b8a6', '#4d7c0f', '#0f766e'], mono: ['#334155', '#475569', '#64748b', '#1e293b', '#94a3b8', '#0f172a', '#52525b', '#3f3f46'] };
    function shapeEl(type, text, left, top, w, h, fill, extra) {
        return Object.assign({ id: uid('el'), type: 'shape', shapeType: type, content: esc(text), top: Math.round(top), left: Math.round(left), width: Math.round(w), height: Math.round(h), zIndex: 1, fontSize: '16px', color: '#ffffff', fillColor: fill, strokeSync: true, strokeColor: null, strokeWidth: 2, cornerRadius: null, cornerRx: null, cornerRy: null, bgBlur: 0, innerShadow: null }, extra || {});
    }
    function textOnly(text, left, top, w, h, size, color) {
        return { id: uid('el'), type: 'text', content: esc(text), top: Math.round(top), left: Math.round(left), width: Math.round(w), height: Math.round(h), zIndex: 1, fontSize: size, color: color, textAlign: 'center' };
    }
    function buildDiagram(kind, items, pal) {
        const C = DG_COLORS[pal] || DG_COLORS.amber, n = items.length, out = [], col = function (i) { return C[i % C.length]; };
        const fs = n > 6 ? '13px' : n > 4 ? '15px' : '17px';
        if (kind === 'process') {
            const gap = 34, bw = Math.min(150, (W - 60 - gap * (n - 1)) / n), total = bw * n + gap * (n - 1), x0 = (W - total) / 2;
            items.forEach(function (t, i) {
                out.push(shapeEl('rounded', t, x0 + i * (bw + gap), 150, bw, 100, col(i), { fontSize: fs }));
                if (i < n - 1) out.push(shapeEl('arrow-right', '', x0 + i * (bw + gap) + bw + 4, 186, gap - 8, 28, '#ffffff', { fontSize: '10px', color: '#92400e' }));
            });
        } else if (kind === 'list') {
            const bh = Math.min(58, (H - 120) / n - 8), y0 = (H - (bh * n + 8 * (n - 1))) / 2 + 14;
            items.forEach(function (t, i) { out.push(shapeEl('rounded', t, 110, y0 + i * (bh + 8), 500, bh, col(i), { fontSize: fs })); });
        } else if (kind === 'cycle') {
            const R = 120, cx = W / 2, cy = H / 2 + 14, d = Math.min(96, 2 * Math.PI * R / n - 14);
            items.forEach(function (t, i) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; out.push(shapeEl('circle', t, cx + R * Math.cos(a) - d / 2, cy + R * Math.sin(a) - d / 2, d, d, col(i), { fontSize: n > 6 ? '11px' : '13px' })); });
            out.push(shapeEl('ring', '', cx - 34, cy - 34, 68, 68, '#ffffff', { fontSize: '10px' }));
        } else if (kind === 'pyramid') {
            const lh = Math.min(62, (H - 110) / n - 4), y0 = (H - (lh * n + 4 * (n - 1))) / 2 + 14;
            items.forEach(function (t, i) { const w = 120 + (500 - 120) * (i / Math.max(1, n - 1)); out.push(shapeEl(i === 0 && n > 1 ? 'triangle' : 'rect', t, (W - w) / 2, y0 + i * (lh + 4), w, lh, col(i), { fontSize: fs })); });
        } else if (kind === 'timeline') {
            const x0 = 70, span = W - 140;
            out.push(shapeEl('rect', '', x0 - 20, 198, span + 40, 6, '#ffffff'));
            items.forEach(function (t, i) { const x = n === 1 ? W / 2 : x0 + span * i / (n - 1), up = i % 2 === 0; out.push(shapeEl('circle', String(i + 1), x - 17, 184, 34, 34, col(i), { fontSize: '14px' })); out.push(textOnly(t, x - 60, up ? 120 : 228, 120, 50, '14px', '#ffffff')); });
        } else {
            const cx = W / 2, cy = H / 2 + 14, R = 135, d = 92, m = n - 1;
            items.slice(1).forEach(function (t, i) { const a = -Math.PI / 2 + i * 2 * Math.PI / Math.max(1, m); out.push(shapeEl('rounded', t, cx + R * 1.25 * Math.cos(a) - d / 2, cy + R * 0.95 * Math.sin(a) - 28, d, 56, col(i + 1), { fontSize: '13px' })); });
            out.push(shapeEl('circle', items[0], cx - 55, cy - 55, 110, 110, col(0), { fontSize: '17px' }));
        }
        return out;
    }
    function diagramSvg(kind, items, pal) {
        const els = buildDiagram(kind, items, pal);
        const shape = function (e) {
            if (e.type === 'text') return '<text x="' + (e.left + e.width / 2) + '" y="' + (e.top + 24) + '" text-anchor="middle" font-size="14" fill="#fff" font-family="system-ui">' + e.content + '</text>';
            let g;
            if (e.shapeType === 'circle' || e.shapeType === 'ring') g = '<ellipse cx="' + (e.left + e.width / 2) + '" cy="' + (e.top + e.height / 2) + '" rx="' + e.width / 2 + '" ry="' + e.height / 2 + '" fill="' + (e.shapeType === 'ring' ? 'none" stroke="#fff" stroke-width="5' : e.fillColor) + '"/>';
            else if (e.shapeType === 'triangle') g = '<polygon points="' + (e.left + e.width / 2) + ',' + e.top + ' ' + (e.left + e.width) + ',' + (e.top + e.height) + ' ' + e.left + ',' + (e.top + e.height) + '" fill="' + e.fillColor + '"/>';
            else g = '<rect x="' + e.left + '" y="' + e.top + '" width="' + e.width + '" height="' + e.height + '" rx="' + (e.shapeType === 'rounded' ? 12 : 2) + '" fill="' + e.fillColor + '"/>';
            return g + (e.content && e.shapeType !== 'ring' ? '<text x="' + (e.left + e.width / 2) + '" y="' + (e.top + e.height / 2 + 5) + '" text-anchor="middle" font-size="13" fill="#fff" font-family="system-ui">' + e.content.slice(0, 18) + '</text>' : '');
        };
        return '<svg viewBox="0 0 ' + W + ' ' + H + '">' + els.map(shape).join('') + '</svg>';
    }
    async function diagramDialog() {
        const box = document.createElement('div'); box.className = 'am-mdlg';
        box.innerHTML = '<div class="row"><div><label>Kind</label><select id="dg-kind">' + Object.keys(DG_KINDS).map(function (k) { return '<option value="' + k + '">' + DG_KINDS[k] + '</option>'; }).join('') + '</select></div>'
            + '<div><label>Colors</label><select id="dg-pal">' + Object.keys(DG_COLORS).map(function (k) { return '<option value="' + k + '">' + k[0].toUpperCase() + k.slice(1) + '</option>'; }).join('') + '</select></div></div>'
            + '<label>One word or phrase per line (2 to 8)</label><textarea id="dg-items" rows="5" spellcheck="false">Plan\nBuild\nTest\nLaunch</textarea><div class="am-dgprev" id="dg-prev"></div>'
            + '<div class="note">The pieces are ordinary shapes, so you can recolor, move, rotate and animate each one!</div>';
        const read = function () { const items = box.querySelector('#dg-items').value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8); return items.length >= 2 ? { kind: box.querySelector('#dg-kind').value, pal: box.querySelector('#dg-pal').value, items: items } : null; };
        const upd = function () { const r = read(); box.querySelector('#dg-prev').innerHTML = r ? diagramSvg(r.kind, r.items, r.pal) : '<span style="font-size:12px;color:#7c2d12">Type at least two lines!</span>'; };
        box.addEventListener('input', upd); box.addEventListener('change', upd); upd();
        const r = await OS.dialog('Insert Diagram', box, [{ label: 'Cancel', value: null }, { label: 'Insert', primary: true, value: function () { return read() || undefined; } }]);
        if (!r) return;
        saveState();
        const els = buildDiagram(r.kind, r.items, r.pal);
        const base = slide().elements.length;
        els.forEach(function (e, i) { e.zIndex = base + i + 1; slide().elements.push(e); });
        activeElementId = els[0].id; editingElementId = null;
        toast('Diagram added! Each piece is a shape you can change!');
        redraw();
    }

    /* ---------- Find & Replace ---------- */
    let lastFind = { find: '', rep: '', matchCase: false, whole: false };
    function matcher(f) {
        if (!f.find) return null;
        const src = f.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(f.whole ? '\\b' + src + '\\b' : src, f.matchCase ? 'g' : 'gi');
    }
    function eachTextNode(html, fn) {
        const d = document.createElement('div'); d.innerHTML = html;
        if (d.querySelector('svg')) return null;
        const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT), nodes = []; let n;
        while ((n = w.nextNode())) nodes.push(n);
        let hits = 0;
        nodes.forEach(function (t) { hits += fn(t); });
        return { hits: hits, html: d.innerHTML };
    }
    function findAll(f, replace) {
        const re = matcher(f); if (!re) return { hits: 0, slides: 0, first: -1 };
        let total = 0; const inSlides = new Set();
        slides.forEach(function (s, si) {
            s.elements.forEach(function (el) {
                if (typeof el.content !== 'string') return;
                const r = eachTextNode(el.content, function (t) {
                    const m = t.nodeValue.match(re); if (!m) return 0;
                    if (replace) t.nodeValue = t.nodeValue.replace(re, function () { return f.rep; });
                    return m.length;
                });
                if (!r || !r.hits) return;
                total += r.hits; inSlides.add(si);
                if (replace) el.content = r.html;
            });
        });
        return { hits: total, slides: inSlides.size, first: inSlides.size ? Math.min.apply(null, Array.from(inSlides)) : -1 };
    }
    function findDialog() {
        const box = document.createElement('div'); box.className = 'am-mdlg';
        box.innerHTML = '<label>Find</label><input type="text" id="fr-f" spellcheck="false"><label>Replace with</label><input type="text" id="fr-r" spellcheck="false">'
            + '<label class="chk"><input type="checkbox" id="fr-c"> Match upper and lower case</label><label class="chk"><input type="checkbox" id="fr-w"> Whole words only</label><div class="note" id="fr-n">Searches the words on every slide!</div>';
        box.querySelector('#fr-f').value = lastFind.find; box.querySelector('#fr-r').value = lastFind.rep;
        const read = function () { lastFind = { find: box.querySelector('#fr-f').value, rep: box.querySelector('#fr-r').value, matchCase: box.querySelector('#fr-c').checked, whole: box.querySelector('#fr-w').checked }; return lastFind; };
        const count = function () { const r = findAll(read(), false); box.querySelector('#fr-n').textContent = !lastFind.find ? 'Type something to find!' : r.hits ? r.hits + ' found on ' + r.slides + ' slide' + (r.slides === 1 ? '' : 's') + '!' : 'Nothing found!'; return r; };
        box.addEventListener('input', count);
        OS.dialog('Find & Replace', box, [
            { label: 'Close', value: null },
            { label: 'Go to first', keep: true, value: function () { const r = count(); if (r.hits && r.first >= 0) { if (window.Amber && window.Amber.goToSlide) window.Amber.goToSlide(r.first); else { activeSlideIndex = r.first; renderThumbnails(); renderActiveSlide(); } } } },
            { label: 'Replace All', primary: true, value: function () { return read(); } }
        ]).then(function (f) {
            if (!f || !f.find) return;
            saveState();
            const r = findAll(f, true);
            redraw();
            toast(r.hits ? 'Replaced ' + r.hits + ' on ' + r.slides + ' slide' + (r.slides === 1 ? '' : 's') + '!' : 'Nothing to replace!');
        });
        setTimeout(function () { try { box.querySelector('#fr-f').focus(); } catch (e) {} }, 40);
    }

    /* ---------- Agenda slide and deck stats ---------- */
    const plain = function (html) { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, ' '); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
    function titleOf(s, i) {
        const texts = s.elements.filter(function (e) { return e.type === 'text' && typeof e.content === 'string' && e.content.indexOf('<svg') < 0 && plain(e.content); }).sort(function (a, b) { return a.top - b.top; });
        const t = texts.length ? plain(texts[0].content) : '';
        return (t || s.title || 'Slide ' + (i + 1)).slice(0, 60);
    }
    function agendaSlide() {
        const rows = slides.map(function (s, i) { return { i: i, t: titleOf(s, i) }; });
        saveState();
        const items = rows.map(function (r) { return esc((r.i + 1) + '.  ' + r.t); }).join('<br>');
        const cur = slide();
        const ns = { id: uid('slide'), title: 'Agenda', background: cur ? cur.background : 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)', elements: [
            { id: uid('el'), type: 'text', content: 'Agenda', top: 30, left: 40, width: 640, height: 54, zIndex: 1, fontSize: '36px', color: '#ffffff' },
            { id: uid('el'), type: 'text', content: items, top: 100, left: 60, width: 600, height: Math.min(280, 30 + rows.length * 30), zIndex: 2, fontSize: rows.length > 8 ? '16px' : '20px', color: '#ffffff', textAlign: 'left', lineHeight: 1.5 }
        ] };
        slides.splice(0, 0, ns);
        activeSlideIndex = 0; activeElementId = null; editingElementId = null;
        redraw();
        toast('Agenda slide added at the front, from your ' + rows.length + ' slide titles!');
    }
    function statsDialog() {
        let words = 0, objs = 0, notesW = 0, shapes = 0, icons = 0, charts = 0;
        slides.forEach(function (s) {
            s.elements.forEach(function (e) {
                objs++; if (e.type === 'shape') shapes++;
                if (typeof e.content === 'string') { if (e.content.indexOf('am-chart') >= 0) charts++; else if (e.content.indexOf('am-icon') >= 0) icons++; else { const p = plain(e.content); if (p) words += p.split(/\s+/).length; } }
            });
            if (typeof s.notes === 'string') notesW += plain(s.notes).split(/\s+/).filter(Boolean).length;
        });
        const mins = Math.max(1, Math.round((notesW || words) / 130));
        const box = document.createElement('div'); box.className = 'am-mdlg';
        const row = function (a, b) { return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(120,120,120,.25)"><span>' + a + '</span><b>' + b + '</b></div>'; };
        box.innerHTML = row('Slides', slides.length) + row('Objects', objs + ' (' + shapes + ' shapes, ' + charts + ' charts, ' + icons + ' icons)') + row('Words on the slides', words) + row('Words in the speaker notes', notesW)
            + row('Time to present', 'about ' + mins + ' minute' + (mins === 1 ? '' : 's')) + '<div class="note">Counted at a relaxed 130 words a minute, using your notes when you wrote some!</div>';
        OS.dialog('Deck Stats', box, [{ label: 'Nice!', primary: true, value: true }]);
    }

    window.AmberMore = {
        rotateMenu: rotateMenu, transparencyMenu: transparencyMenu, shadowMenu: shadowMenu, alignMenu: alignMenu, sizeDialog: sizeDialog,
        iconDialog: function () { iconDialog(); }, editIcon: editIcon, diagramDialog: diagramDialog, findDialog: findDialog, agendaSlide: agendaSlide, statsDialog: statsDialog
    };
    document.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'f' && !e.target.closest('input, textarea, [contenteditable="true"]') && document.getElementById('slide-canvas')) { e.preventDefault(); findDialog(); }
    });
})();
