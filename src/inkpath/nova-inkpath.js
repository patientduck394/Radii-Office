"use strict";
/* ========================================================
   INKPATH NOVA: the Nova layout for the vector editor.
   Its own DOM and CSS (nova-inkpath.css), driven by Inkpath's own tools and commands, so nothing is reimplemented:
   a dock of tool groups, a top bar with a command palette, a floating capsule for the selected shape,
   flyout panels, a status pill. The old toolbox, toolbar and inspector stay in the page (hidden or restyled).
   Icons: Vadivam first, then Gravity UI, then Lucide (nova-icons.js, with its licence notices);
   the drawing-tool icons are Inkpath's own.
   Switch: localStorage inkpath_layout = 'nova' (default is the classic layout).
   ======================================================== */
(function () {
    'use strict';
    const LAYOUT_KEY = 'inkpath_layout';
    const DARK_KEY = 'inkpath_nova_dark';
    const INSP_KEY = 'inkpath_nova_inspector';
    const ICONS = window.NovaIcons || {};
    const g = function (name) { return window[name]; };   // Inkpath's functions are globals
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    const el = function (tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
    let on = false, timer = 0, lastSig = '', root = null;
    const nodes = {};
    let flyBtn = null;

    /* ---------- icons ---------- */
    function ic(name, cls) {
        const d = ICONS[name];
        if (!d) return '';
        if (d[0] === 'g') return '<svg class="ik-ic ik-g' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + d[1] + '</svg>';
        return '<svg class="ik-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d[1] + '</svg>';
    }
    // a drawing tool wears the icon Inkpath already has for it
    function toolIc(tool) {
        const b = document.getElementById('btn-' + tool);
        const s = b && b.querySelector('svg');
        if (!s) return ic('shapes');
        const c = s.cloneNode(true);
        c.setAttribute('class', 'ik-ic');
        c.removeAttribute('width'); c.removeAttribute('height');
        c.setAttribute('aria-hidden', 'true');
        return c.outerHTML;
    }

    /* ---------- the commands (all of them are Inkpath's own functions) ---------- */
    const call = function (name) { const a = Array.prototype.slice.call(arguments, 1); return function (ev) { const f = g(name); if (typeof f === 'function') return f.apply(null, a.concat(ev && ev.type ? [ev] : [])); }; };
    const tool = function (t) { return function () { const f = g('setTool'); if (typeof f === 'function') f(t); }; };
    function sections() {
        const T = function (id, label) { return { id: 'tool-' + id, label: label, icon: toolIc(id), tool: id, run: tool(id) }; };
        return {
            shapes: { title: 'Shapes', icon: 'shapes', groups: [{ name: 'Draw a shape', items: [T('rect', 'Rectangle'), T('circle', 'Circle'), T('ellipse', 'Ellipse'), T('triangle', 'Triangle'), T('polygon', 'Star / Polygon'), T('line', 'Line')] }] },
            tools: { title: 'More tools', icon: 'wand', groups: [{ name: 'Tools', items: [T('gradient', 'Gradient'), T('eyedropper', 'Eyedropper'), T('eraser', 'Eraser'), T('zoom', 'Zoom / Focus')] }] },
            arrange: {
                title: 'Shape tools', icon: 'layout', groups: [
                    { name: 'Edit', items: [
                        { id: 'undo', label: 'Undo', icon: ic('undo'), run: call('undo') }, { id: 'redo', label: 'Redo', icon: ic('redo'), run: call('redo') },
                        { id: 'duplicate', label: 'Duplicate', icon: ic('duplicate'), run: call('duplicateSelected'), sel: true }, { id: 'delete', label: 'Delete', icon: ic('trash'), run: call('deleteSelectedObject'), sel: true },
                        { id: 'topath', label: 'Convert to Path', icon: ic('pen'), run: call('convertToPathMenu'), sel: true }] },
                    { name: 'Boolean', items: [
                        { id: 'union', label: 'Union', icon: ic('plus'), run: call('doBooleanOp', 'union'), sel: true }, { id: 'subtract', label: 'Subtract', icon: ic('minus'), run: call('doBooleanOp', 'subtract'), sel: true },
                        { id: 'intersect', label: 'Intersect', icon: ic('cube'), run: call('doBooleanOp', 'intersect'), sel: true }, { id: 'exclude', label: 'Exclude', icon: ic('x'), run: call('doBooleanOp', 'exclude'), sel: true }] },
                    { name: 'Clip and mask', items: [
                        { id: 'clip', label: 'Clip', icon: ic('capsule'), run: call('doClip'), sel: true }, { id: 'mask', label: 'Mask', icon: ic('eye'), run: call('doMask'), sel: true },
                        { id: 'release', label: 'Release', icon: ic('reset'), run: call('releaseOp'), sel: true }] },
                    { name: 'Stacking order', items: [
                        { id: 'front', label: 'To Front', icon: ic('bringFront'), run: call('moveLayer', 'top'), sel: true }, { id: 'up', label: 'Forward', icon: ic('arrowUp'), run: call('moveLayer', 'up'), sel: true },
                        { id: 'down', label: 'Backward', icon: ic('arrowDown'), run: call('moveLayer', 'down'), sel: true }, { id: 'back', label: 'To Back', icon: ic('background'), run: call('moveLayer', 'bottom'), sel: true }] }
                ]
            },
            effects: {
                title: 'Effects', icon: 'effects', groups: [{ name: 'Look and motion', items: [
                    { id: 'filters', label: 'Filters Studio', icon: ic('droplets'), run: function (ev) { const f = g('toggleFxWindow'); if (typeof f === 'function') f(ev); } },
                    { id: 'animate', label: 'Animate', icon: ic('play'), run: function () { if (window.inkpathAnim) window.inkpathAnim.toggle(); } }] }]
            },
            file: {
                title: 'File', icon: 'file', groups: [
                    { name: 'Drawings', items: [
                        { id: 'docs', label: 'Documents', icon: ic('folder'), run: function () { if (window.RadiiDocs) window.RadiiDocs.openDialog(); } },
                        { id: 'clear', label: 'Clear Canvas', icon: ic('trash'), run: call('clearCanvas') }] },
                    { name: 'Import', items: [
                        { id: 'impkv', label: 'Import .KV', icon: ic('import'), run: function () { const f = document.getElementById('file-kv'); if (f) f.click(); } },
                        { id: 'impsvg', label: 'Import SVG', icon: ic('import'), run: function () { const f = document.getElementById('file-svg'); if (f) f.click(); } },
                        { id: 'css', label: 'CSS to SVG', icon: ic('css'), run: function () { const f = g('openCssToSvg') || window.openCssToSvg; if (typeof f === 'function') f(); } }] },
                    { name: 'Export', items: [
                        { id: 'expsvg', label: 'Export SVG', icon: ic('export'), run: call('exportSVG') }, { id: 'exppng', label: 'Export PNG', icon: ic('image'), run: call('exportPNG') },
                        { id: 'expkv', label: 'Export .KV', icon: ic('save'), run: call('exportKV') }] }
                ]
            }
        };
    }

    /* ---------- the flyout panel ---------- */
    let flyEl = null, flyKey = '';
    function closeFly() { if (flyEl) { flyEl.remove(); flyEl = null; } if (flyBtn) flyBtn.classList.remove('ik-open'); flyBtn = null; flyKey = ''; }
    function openFly(key, btn) {
        if (flyKey === key) { closeFly(); return; }
        closeFly();
        const sec = sections()[key];
        if (!sec) return;
        const p = el('div', 'ik ik-fly');
        p.innerHTML = '<div class="ik-fly-h"><span class="ik-fly-ic">' + ic(sec.icon) + '</span><b>' + esc(sec.title) + '</b><button type="button" class="ik-t ik-sq" data-x title="Close">' + ic('x') + '</button></div>';
        sec.groups.forEach(function (gr) {
            const box = el('div', 'ik-card', '<div class="ik-cap">' + esc(gr.name) + '</div>');
            const grid = el('div', 'ik-grid');
            gr.items.forEach(function (it) {
                const b = el('button', 'ik-t ik-tile', it.icon + '<span>' + esc(it.label) + '</span>');
                b.type = 'button'; b.title = it.label; b.dataset.id = it.id;
                if (it.tool) b.dataset.tool = it.tool;
                if (it.sel) b.dataset.sel = '1';
                b.addEventListener('click', function (e) { e.stopPropagation(); try { it.run(e); } catch (err) { console.error(err); } if (it.tool || it.id === 'filters' || it.id === 'animate' || it.id === 'docs' || /^(imp|exp)/.test(it.id)) closeFly(); sync(true); });
                grid.appendChild(b);
            });
            box.appendChild(grid); p.appendChild(box);
        });
        p.querySelector('[data-x]').addEventListener('click', closeFly);
        document.body.appendChild(p);
        const r = btn.getBoundingClientRect();
        p.style.left = (r.right + 10) + 'px';
        p.style.top = Math.max(8, Math.min(window.innerHeight - p.offsetHeight - 8, r.top)) + 'px';
        flyEl = p; flyKey = key; flyBtn = btn; btn.classList.add('ik-open');
        sync(true);
    }

    /* ---------- the command palette ---------- */
    let palEl = null;
    function closePalette() { if (palEl) { palEl.remove(); palEl = null; } }
    function commandIndex() {
        const out = [];
        const S = sections();
        Object.keys(S).forEach(function (k) { S[k].groups.forEach(function (gr) { gr.items.forEach(function (it) { out.push({ label: it.label, where: S[k].title, icon: it.icon, run: it.run }); }); }); });
        [['select', 'Select'], ['node', 'Edit Nodes'], ['bezier', 'Bezier Pen'], ['text', 'Text']].forEach(function (t) { out.push({ label: t[1], where: 'Tools', icon: toolIc(t[0]), run: tool(t[0]) }); });
        out.push({ label: 'Dark or light Nova', where: 'Layout', icon: ic('moon'), run: toggleDark });
        out.push({ label: 'Back to the classic layout', where: 'Layout', icon: ic('layout'), run: function () { setLayout('classic'); } });
        out.push({ label: 'Show or hide the Inspector', where: 'Layout', icon: ic('panelRight'), run: toggleInspector });
        return out;
    }
    function openPalette() {
        closePalette(); closeFly();
        const all = commandIndex();
        const p = el('div', 'ik ik-pal-wrap', '<div class="ik-pal"><div class="ik-pal-in">' + ic('search') + '<input type="text" placeholder="Jump to a tool or command" spellcheck="false" autocomplete="off"><kbd>esc</kbd></div><div class="ik-pal-list"></div></div>');
        const inp = p.querySelector('input'), list = p.querySelector('.ik-pal-list');
        let idx = 0, shown = [];
        function paint() {
            const q = inp.value.trim().toLowerCase();
            shown = all.filter(function (c) { return !q || (c.label + ' ' + c.where).toLowerCase().indexOf(q) !== -1; }).slice(0, 40);
            if (idx >= shown.length) idx = Math.max(0, shown.length - 1);
            list.innerHTML = '';
            if (!shown.length) list.innerHTML = '<div class="ik-pal-none">Nothing matches that!</div>';
            shown.forEach(function (c, i) {
                const b = el('button', 'ik-pal-item' + (i === idx ? ' kb' : ''), '<span class="ik-pal-ic">' + c.icon + '</span><span class="ik-pal-l">' + esc(c.label) + '</span><em>' + esc(c.where) + '</em>');
                b.type = 'button';
                b.addEventListener('mouseenter', function () { idx = i; list.querySelectorAll('.ik-pal-item').forEach(function (n, j) { n.classList.toggle('kb', j === i); }); });
                b.addEventListener('click', function () { run(c); });
                list.appendChild(b);
            });
        }
        function run(c) { closePalette(); try { c.run({}); } catch (e) { console.error(e); } sync(true); }
        inp.addEventListener('input', function () { idx = 0; paint(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { closePalette(); e.preventDefault(); }
            else if (e.key === 'ArrowDown') { idx = Math.min(shown.length - 1, idx + 1); paint(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); paint(); e.preventDefault(); }
            else if (e.key === 'Enter' && shown[idx]) { run(shown[idx]); e.preventDefault(); }
        });
        p.addEventListener('mousedown', function (e) { if (e.target === p) closePalette(); });
        document.body.appendChild(p);
        palEl = p; paint(); inp.focus();
    }

    /* ---------- colors and the selected shape ---------- */
    function sel() { try { return selectedIndices.map(function (i) { return objects[i]; }).filter(Boolean); } catch (e) { return []; } }
    function hex6(c) {
        if (typeof c !== 'string' || !/^#/.test(c)) return null;
        let s = c.slice(1);
        if (s.length === 3 || s.length === 4) s = s.split('').map(function (x) { return x + x; }).join('');
        return s.length >= 6 ? '#' + s.slice(0, 6).toLowerCase() : null;
    }
    function alphaOf(c) { return typeof c === 'string' && /^#[0-9a-f]{8}$/i.test(c) ? c.slice(7) : 'ff'; }
    function paint(prop, rgb) {
        const objs = sel();
        if (!objs.length) return;
        const typeProp = prop === 'fill' ? 'fillType' : 'strokeType';
        if (objs.every(function (o) { return o[typeProp] === 'none' || o[prop] === 'none'; })) { const f = g(prop === 'fill' ? 'setFillType' : 'setStrokeType'); if (typeof f === 'function') f('color'); }
        const keepA = alphaOf(objs[0][prop]);
        pushHistory(true);
        applyColorToProp(prop, rgb + (keepA === '' ? 'ff' : keepA));
        render();
    }

    /* ---------- the capsule: fill, stroke, width, opacity for whatever is selected ---------- */
    function buildCapsule() {
        const c = el('div', 'ik ik-capsule');
        const in_ = el('div', 'ik-capsule-in');
        function swatch(prop, label) {
            const w = el('label', 'ik-sw', '<span class="ik-swl">' + label + '</span><i class="ik-chip"></i><input type="color" aria-label="' + label + ' color">');
            const inp = w.querySelector('input');
            inp.addEventListener('input', function () { paint(prop, inp.value); w.querySelector('.ik-chip').style.background = inp.value; });
            nodes[prop] = { w: w, inp: inp, chip: w.querySelector('.ik-chip') };
            return w;
        }
        in_.appendChild(swatch('fill', 'Fill'));
        in_.appendChild(swatch('stroke', 'Stroke'));
        const wd = el('label', 'ik-num', '<span>Width</span><input type="number" min="0" max="50" step="0.5">');
        wd.querySelector('input').addEventListener('input', function (e) {
            const v = parseFloat(e.target.value); if (isNaN(v)) return;
            pushHistory(false); sel().forEach(function (o) { o.strokeWidth = Math.max(0, Math.min(50, v)); }); render();
        });
        nodes.width = wd.querySelector('input'); in_.appendChild(wd);
        const op = el('label', 'ik-num ik-op', '<span>Opacity</span><input type="range" min="0" max="1" step="0.05"><b>100</b>');
        op.querySelector('input').addEventListener('input', function (e) {
            const v = parseFloat(e.target.value); op.querySelector('b').textContent = Math.round(v * 100);
            pushHistory(false); sel().forEach(function (o) { o.opacity = v; }); render();
        });
        nodes.opacity = op.querySelector('input'); nodes.opv = op.querySelector('b'); in_.appendChild(op);
        in_.appendChild(el('span', 'ik-csep'));
        [['front', 'bringFront', 'To Front', 'top'], ['up', 'arrowUp', 'Forward', 'up'], ['down', 'arrowDown', 'Backward', 'down'], ['back', 'background', 'To Back', 'bottom']].forEach(function (a) {
            const b = el('button', 'ik-t ik-sq', ic(a[1])); b.type = 'button'; b.title = a[2];
            b.addEventListener('click', function () { call('moveLayer', a[3])(); sync(true); });
            in_.appendChild(b);
        });
        in_.appendChild(el('span', 'ik-csep'));
        [['duplicateSelected', 'duplicate', 'Duplicate'], ['deleteSelectedObject', 'trash', 'Delete']].forEach(function (a) {
            const b = el('button', 'ik-t ik-sq', ic(a[1])); b.type = 'button'; b.title = a[2];
            b.addEventListener('click', function () { call(a[0])(); sync(true); });
            in_.appendChild(b);
        });
        c.appendChild(in_);
        nodes.capsule = c;
        return c;
    }

    /* ---------- the dock ---------- */
    function dockButton(label, iconHtml, title, handler, key) {
        const b = el('button', 'ik-d', iconHtml + '<span>' + esc(label) + '</span>');
        b.type = 'button'; b.title = title || label;
        if (key) b.dataset.k = key;
        b.addEventListener('click', function (e) { e.stopPropagation(); handler(b, e); });
        return b;
    }
    function build() {
        root = el('div', 'ik ik-root');
        // dock
        const dock = el('nav', 'ik ik-dock'); dock.id = 'ik-dock';
        const logo = el('button', 'ik-logo', '<img src="favicon-96.png" alt="">'); logo.type = 'button'; logo.title = 'Your drawings';
        logo.addEventListener('click', function () { if (window.RadiiDocs) window.RadiiDocs.openDialog(); });
        dock.appendChild(logo);
        const main = el('div', 'ik-dock-main');
        const toolBtn = function (t, label, title) { return dockButton(label, toolIc(t), title, function () { closeFly(); tool(t)(); sync(true); }, 'tool-' + t); };
        main.appendChild(toolBtn('select', 'Select', 'Select, move and transform'));
        main.appendChild(toolBtn('node', 'Nodes', 'Edit nodes'));
        main.appendChild(toolBtn('bezier', 'Pen', 'Bezier pen'));
        main.appendChild(dockButton('Shapes', ic('shapes'), 'Rectangle, circle, star and more', function (b) { openFly('shapes', b); }, 'fly-shapes'));
        main.appendChild(toolBtn('text', 'Text', 'Text tool'));
        main.appendChild(dockButton('Tools', ic('wand'), 'Eyedropper, eraser, zoom', function (b) { openFly('tools', b); }, 'fly-tools'));
        main.appendChild(dockButton('Arrange', ic('layout'), 'Edit, boolean ops, clip and mask, stacking', function (b) { openFly('arrange', b); }, 'fly-arrange'));
        main.appendChild(dockButton('Effects', ic('effects'), 'Filters and animation', function (b) { openFly('effects', b); }, 'fly-effects'));
        main.appendChild(dockButton('Pro', ic('ruler'), 'Rulers, guides, align, path tools, artboards and export (Alt+P)', function () { closeFly(); if (window.inkpathPro) window.inkpathPro.toggle(); }, 'fly-pro'));
        dock.appendChild(main);
        const end = el('div', 'ik-dock-end');
        end.appendChild(dockButton('File', ic('file'), 'Documents, import and export', function (b) { openFly('file', b); }, 'fly-file'));
        nodes.themeBtn = dockButton('Theme', ic(document.body.classList.contains('ik-dark') ? 'sun' : 'moon'), 'Light or dark Nova', function () { toggleDark(); });
        end.appendChild(nodes.themeBtn);
        end.appendChild(dockButton('Layout', ic('layout'), 'Back to the classic layout', function () { setLayout('classic'); }));
        const more = dockButton('Panel', ic('panelRight'), 'Show or hide the Inspector', function () { toggleInspector(); }); more.classList.add('ik-gray'); end.appendChild(more);
        dock.appendChild(end);
        root.appendChild(dock);
        // top bar
        const bar = el('header', 'ik ik-bar'); bar.id = 'ik-bar';
        const l = el('div', 'ik-bar-l');
        const name = el('button', 'ik-docname', 'Inkpath drawing'); name.type = 'button'; name.title = 'Open your drawings';
        name.addEventListener('click', function () { if (window.RadiiDocs) window.RadiiDocs.openDialog(); });
        nodes.saved = el('span', 'ik-saved', ic('check') + '<span>Saved</span>');
        l.appendChild(name); l.appendChild(nodes.saved);
        const search = el('button', 'ik-search', ic('search') + '<span>Jump to anything</span><kbd>' + (/Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd>');
        search.type = 'button'; search.addEventListener('click', openPalette);
        const r = el('div', 'ik-bar-r');
        const barBtn = function (icon, title, fn, withLab) { const b = el('button', 'ik-t ik-barbtn' + (withLab ? ' ik-withlab' : ''), ic(icon) + (withLab ? '<span>' + esc(withLab) + '</span>' : '')); b.type = 'button'; b.title = title; b.addEventListener('click', function (e) { fn(e); sync(true); }); return b; };
        r.appendChild(barBtn('undo', 'Undo', call('undo')));
        r.appendChild(barBtn('redo', 'Redo', call('redo')));
        try { if (window.RadiiCollab && window.RadiiCollab.shareButton) r.appendChild(window.RadiiCollab.shareButton({ cls: 'ik-share ik-t' })); } catch (e) {}
        r.appendChild(barBtn('export', 'Export as SVG', call('exportSVG'), 'Export'));
        nodes.inspBtn = barBtn('panelRight', 'Show or hide the Inspector', toggleInspector);
        r.appendChild(nodes.inspBtn);
        bar.appendChild(l); bar.appendChild(search); bar.appendChild(r);
        root.appendChild(bar);
        // capsule
        root.appendChild(buildCapsule());
        // status pill
        const st = el('div', 'ik ik-status'); st.id = 'ik-status';
        nodes.tool = el('b', 'ik-tool', 'SELECT');
        const zm = el('button', 'ik-t ik-sq', ic('minus')); zm.type = 'button'; zm.title = 'Zoom out'; zm.addEventListener('click', function () { zoomBy(0.8); });
        const zp = el('button', 'ik-t ik-sq', ic('plus')); zp.type = 'button'; zp.title = 'Zoom in'; zp.addEventListener('click', function () { zoomBy(1.25); });
        nodes.zoom = el('button', 'ik-zoomv', '100%'); nodes.zoom.type = 'button'; nodes.zoom.title = 'Back to 100%'; nodes.zoom.addEventListener('click', function () { zoomBy(0); });
        nodes.xy = el('span', 'ik-xy', 'x 0 · y 0'); nodes.count = el('span', 'ik-count', '0 shapes');
        st.appendChild(nodes.tool); st.appendChild(el('span', 'ik-ssep')); st.appendChild(zm); st.appendChild(nodes.zoom); st.appendChild(zp); st.appendChild(el('span', 'ik-ssep')); st.appendChild(nodes.xy); st.appendChild(nodes.count);
        root.appendChild(st);
        document.body.appendChild(root);
    }

    function zoomBy(f) {
        try {
            const rect = svg.getBoundingClientRect();
            const mx = rect.width / 2, my = rect.height / 2;
            const wx = (mx - panOffset.x) / zoomLevel, wy = (my - panOffset.y) / zoomLevel;
            const nz = f === 0 ? 1 : Math.max(0.2, Math.min(5, zoomLevel * f));
            if (f === 0) { panOffset.x = 0; panOffset.y = 0; } else { panOffset.x = mx - wx * nz; panOffset.y = my - wy * nz; }
            zoomLevel = nz; applyTransform();
        } catch (e) {}
    }

    /* ---------- keeping everything in step ---------- */
    function sync(force) {
        if (!on) return;
        let cur = 'select', objs = [], zl = 1;
        try { cur = currentTool; objs = sel(); zl = zoomLevel; } catch (e) { return; }
        const o = objs[0];
        const sig = [cur, selectedIndices.join(','), objects.length, o ? [o.fill, o.stroke, o.strokeWidth, o.opacity, o.fillType, o.strokeType].join('|') : '', Math.round(zl * 100), flyKey].join(';');
        if (!force && sig === lastSig) return;
        const changedDoc = lastSig && sig.split(';')[2] !== lastSig.split(';')[2];
        lastSig = sig;
        document.querySelectorAll('#ik-dock .ik-d[data-k^="tool-"]').forEach(function (b) { b.classList.toggle('on', b.dataset.k === 'tool-' + cur); });
        const shapeTools = ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'line'], moreTools = ['eyedropper', 'eraser', 'zoom'];
        const fs = document.querySelector('#ik-dock [data-k="fly-shapes"]'), ft = document.querySelector('#ik-dock [data-k="fly-tools"]');
        if (fs) fs.classList.toggle('on', shapeTools.indexOf(cur) !== -1);
        if (ft) ft.classList.toggle('on', moreTools.indexOf(cur) !== -1);
        if (flyEl) flyEl.querySelectorAll('.ik-tile').forEach(function (b) {
            if (b.dataset.tool) b.classList.toggle('on', b.dataset.tool === cur);
            if (b.dataset.sel) b.disabled = !objs.length;
        });
        nodes.tool.textContent = String(cur).toUpperCase();
        nodes.zoom.textContent = Math.round(zl * 100) + '%';
        nodes.count.textContent = objects.length + (objects.length === 1 ? ' shape' : ' shapes') + (objs.length ? ' · ' + objs.length + ' selected' : '');
        nodes.capsule.classList.toggle('show', !!objs.length);
        if (o) {
            ['fill', 'stroke'].forEach(function (p) {
                const h = hex6(o[p]), none = !h || o[p + 'Type'] === 'none';
                const n = nodes[p];
                n.chip.style.background = none ? 'transparent' : (h || 'transparent');
                n.chip.classList.toggle('none', none);
                if (h) n.inp.value = h;
            });
            if (document.activeElement !== nodes.width) nodes.width.value = o.strokeWidth == null ? '' : o.strokeWidth;
            if (document.activeElement !== nodes.opacity) nodes.opacity.value = o.opacity == null ? 1 : o.opacity;
            nodes.opv.textContent = Math.round((o.opacity == null ? 1 : o.opacity) * 100);
        }
        if (changedDoc) { nodes.saved.classList.remove('blip'); void nodes.saved.offsetWidth; nodes.saved.classList.add('blip'); }
    }

    /* ---------- layout, dark mode, inspector ---------- */
    function toggleDark() {
        const d = !document.body.classList.contains('ik-dark');
        document.body.classList.toggle('ik-dark', d);
        try { localStorage.setItem(DARK_KEY, d ? '1' : '0'); } catch (e) {}
        if (nodes.themeBtn) nodes.themeBtn.querySelector('svg').outerHTML = ic(d ? 'sun' : 'moon');
    }
    function toggleInspector() {
        const open = !document.body.classList.contains('ik-insp');
        document.body.classList.toggle('ik-insp', open);
        try { localStorage.setItem(INSP_KEY, open ? '1' : '0'); } catch (e) {}
        if (nodes.inspBtn) nodes.inspBtn.classList.toggle('on', open);
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }
    function currentLayout() { try { return localStorage.getItem(LAYOUT_KEY) === 'classic' ? 'classic' : 'nova'; } catch (e) { return 'nova'; } }
    function setLayout(l) {
        try { localStorage.setItem(LAYOUT_KEY, l); } catch (e) {}
        apply();
    }
    function enter() {
        if (on) return;
        on = true;
        let dark = null, insp = null;
        try { dark = localStorage.getItem(DARK_KEY); insp = localStorage.getItem(INSP_KEY); } catch (e) {}
        document.body.classList.add('ik-nova');
        document.body.classList.toggle('ik-dark', dark === '1' || (dark === null && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches));
        document.body.classList.toggle('ik-insp', insp !== '0');
        build();
        nodes.inspBtn.classList.toggle('on', document.body.classList.contains('ik-insp'));
        lastSig = '';
        sync(true);
        timer = setInterval(function () { sync(false); }, 180);
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }
    function leave() {
        if (!on) return;
        on = false;
        clearInterval(timer);
        closeFly(); closePalette();
        if (root) root.remove(); root = null;
        document.body.classList.remove('ik-nova', 'ik-dark', 'ik-insp');
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }
    function apply() {
        // phones keep the classic layout
        if (currentLayout() === 'nova' && window.innerWidth >= 760) enter(); else leave();
        classicSwitch();
    }
    // a way into Nova from the classic layout
    function classicSwitch() {
        const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
        if (!stack) return;
        let b = document.getElementById('ik-to-nova');
        if (!b) {
            b = el('button', 'action-btn', '✨ Nova layout'); b.id = 'ik-to-nova'; b.type = 'button';
            b.title = 'Switch to the Nova layout: a dock, a command bar and a floating style capsule';
            b.addEventListener('click', function () { setLayout('nova'); });
            stack.appendChild(b);
        }
    }

    document.addEventListener('keydown', function (e) {
        if (!on) return;
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); palEl ? closePalette() : openPalette(); return; }
        if (e.key === 'Escape') { if (palEl) closePalette(); else if (flyEl) closeFly(); }
    });
    document.addEventListener('mousedown', function (e) {
        if (!on || !flyEl) return;
        if (!e.target.closest('.ik-fly') && !e.target.closest('.ik-dock')) closeFly();
    });
    document.addEventListener('mousemove', function (e) {
        if (!on || !nodes.xy || !e.target.closest || !e.target.closest('#viewport')) return;
        try { const p = getMousePos(e); nodes.xy.textContent = 'x ' + Math.round(p.x) + ' · y ' + Math.round(p.y); } catch (err) {}
    });
    window.addEventListener('resize', function () { if (on && window.innerWidth < 760) { /* stay: only a fresh load picks the classic layout on phones */ } });

    window.InkpathNova = { enter: apply, setLayout: setLayout, openPalette: openPalette, layout: currentLayout, isOn: function () { return on; } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
