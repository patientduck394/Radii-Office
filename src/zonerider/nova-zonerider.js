"use strict";
/* ========================================================
   ZONERIDER: THE NOVA LAYOUT
   Its own dock, bar, capsule, flyout panels, palette and status pill, drawn on top of the same editor.
   Every button runs the editor's own commands (window.Zonerider.menus and the original controls), so nothing is duplicated.
   Choose it in More > Layout (or the Nova button in the classic top bar). Saved as localStorage zonerider_layout = 'nova'.
   Icons come from nova-icons.js (Vadivam, then Gravity UI, then Lucide); anything else uses Zonerider's own icons.
   ======================================================== */
(function () {
    'use strict';
    const LAYOUT_KEY = 'zonerider_layout', DARK_KEY = 'zonerider_nova_dark';
    // inside Writeout or Bitbook's 3D Scene block: never Nova
    if (new URLSearchParams(location.search).has('embed') && window.parent !== window) return;

    const ICONS = window.NovaIcons || {};
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    const $ = function (id) { return document.getElementById(id); };
    function Z() { return window.Zonerider; }

    /* ---------- icons: Nova's sets first, then Zonerider's own ---------- */
    const MAP = {
        undo: 'undo', redo: 'redo', plus: 'plus', folder: 'folder', save: 'save', export: 'export', import: 'import', people: 'user', eye: 'eye',
        camera: 'image', sun: 'sun', bulb: 'lightbulb', cube: 'cube', sphere: 'orb', icosphere: 'orb', magnet: 'magnet', keyboard: 'keyboard',
        info: 'info', home: 'home', gear: 'gear', trash: 'trash', copy: 'copy', duplicate: 'duplicate', check: 'check', play: 'play', film: 'play',
        sparkle: 'sparkle', palette: 'palette', key: 'star', globe: 'web', ball: 'orb', shape: 'shapes', object: 'cube', plane: 'page', grid: 'grid',
        new: 'newDoc', newfile: 'newDoc', share: 'share', download: 'download', file: 'file', search: 'search', moon: 'moon', x: 'close', menu: 'menu'
    };
    function ic(name, cls) {
        const k = MAP[name] || name, d = ICONS[k];
        if (d) {
            if (d[0] === 'g') return '<svg class="nv-ic nv-g' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + d[1] + '</svg>';
            return '<svg class="nv-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d[1] + '</svg>';
        }
        const z = Z();
        return z && z.ico ? z.ico(name, 'nv-ic' + (cls ? ' ' + cls : '')) : '';
    }

    let on = false, built = false, dark = true, panelId = null, popEl = null, palEl = null, timer = 0, statusObs = null;
    const nodes = {};
    const wide = function () { return window.innerWidth > 860; };
    function want() { try { return localStorage.getItem(LAYOUT_KEY) !== 'classic'; } catch (e) { return true; } }
    function setLayout(v) { try { localStorage.setItem(LAYOUT_KEY, v); } catch (e) {} apply(); }
    const click = function (sel) { const b = document.querySelector(sel); if (b) b.click(); };
    const pressed = function (sel) { const b = document.querySelector(sel); return !!b && b.getAttribute('aria-pressed') === 'true'; };
    const st = function () { const z = Z(); return z && z.state; };
    const refit = function () { setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30); };

    /* ---------- the menus the editor already has, as lists of rows ---------- */
    function rows(name) {
        const z = Z(); if (!z || !z.menus || !z.menus[name]) return [];
        const out = []; let head = null;
        z.menus[name]().forEach(function (it) {
            if (it === '-') return;
            if (it[0] && it[0][0] === '#') { head = it[0].slice(1); out.push({ head: head }); return; }
            out.push({ label: it[0], kbd: it[1], run: it[2], icon: it[3], group: head });
        });
        return out;
    }

    /* ---------- tiles ---------- */
    function tile(label, icon, run, opts) {
        opts = opts || {};
        const b = el('button', 'nv-t ' + (opts.big ? 'nv-big' : 'nv-sm'));
        b.type = 'button';
        b.title = label + (opts.kbd ? '  (' + opts.kbd + ')' : '');
        b.innerHTML = ic(icon) + '<span class="nv-lab">' + esc(label) + '</span>' + (opts.kbd ? '<kbd>' + esc(opts.kbd) + '</kbd>' : '');
        b.addEventListener('click', function (e) { e.stopPropagation(); try { run(e); } catch (err) { console.error(err); } if (!(opts.keep || e.shiftKey)) closePanel(); sync(); });
        if (opts.on) b._on = opts.on;
        return b;
    }
    function section(title, nodesList, cols) {
        const s = el('section', 'nv-sec'); s.appendChild(el('h4', null, esc(title)));
        const g = el('div', 'nv-grid' + (cols ? ' c' + cols : ''));
        nodesList.forEach(function (n) { g.appendChild(n); });
        s.appendChild(g); return s;
    }
    function rowTiles(name, filter) {
        const groups = []; let cur = null;
        rows(name).forEach(function (r) {
            if (r.head) { cur = { title: r.head, items: [] }; groups.push(cur); return; }
            if (filter && !filter(r)) return;
            if (!cur) { cur = { title: null, items: [] }; groups.push(cur); }
            cur.items.push(r);
        });
        return groups.filter(function (g) { return g.items.length; });
    }
    function itemTile(r) { return tile(r.label, r.icon || 'sparkle', r.run, { kbd: r.kbd }); }

    /* ---------- the dock's groups ---------- */
    const GROUPS = [
        { id: 'tools', name: 'Tools', icon: 'move', title: 'Move, rotate, scale, snap and modes' },
        { id: 'add', name: 'Add', icon: 'plus', title: 'Add shapes, lights and cameras' },
        { id: 'object', name: 'Object', icon: 'cube', title: 'Work on the selected object' },
        { id: 'view', name: 'View', icon: 'eye', title: 'Views, shading and panels' },
        { id: 'render', name: 'Render', icon: 'camera', title: 'Render images and videos' },
        { id: 'scene', name: 'Scene', icon: 'list', title: 'The outliner: every object in the scene' }
    ];
    function groupBody(id) {
        const body = el('div', 'nv-pbody');
        const z = Z();
        if (id === 'tools') {
            body.appendChild(section('Transform', [
                tile('Move', 'move', function () { click('[data-tool="translate"]'); }, { kbd: 'G', keep: true, on: function () { return pressed('[data-tool="translate"]'); } }),
                tile('Rotate', 'rotate', function () { click('[data-tool="rotate"]'); }, { kbd: 'R', keep: true, on: function () { return pressed('[data-tool="rotate"]'); } }),
                tile('Scale', 'scale', function () { click('[data-tool="scale"]'); }, { kbd: 'Shift S', keep: true, on: function () { return pressed('[data-tool="scale"]'); } }),
                tile('Global axes', 'globe', function () { click('[data-space="world"]'); }, { keep: true, on: function () { return pressed('[data-space="world"]'); } }),
                tile('Local axes', 'object', function () { click('[data-space="local"]'); }, { keep: true, on: function () { return pressed('[data-space="local"]'); } }),
                tile('Snap', 'magnet', function () { click('#zr-snap'); }, { keep: true, on: function () { return pressed('#zr-snap'); } })
            ], 2));
            body.appendChild(section('Mode', [
                tile('Object Mode', 'cube', function () { click('[data-mode="object"]'); }, { kbd: 'Tab', keep: true, on: function () { return pressed('[data-mode="object"]'); } }),
                tile('Edit Mode', 'edit', function () { click('[data-mode="edit"]'); }, { kbd: 'Tab', keep: true, on: function () { return pressed('[data-mode="edit"]'); } })
            ], 2));
            rowTiles('edit').forEach(function (g) { body.appendChild(section(g.title || 'Edit', g.items.map(itemTile), 2)); });
        } else if (id === 'view') {
            body.appendChild(section('Shading', [
                tile('Wireframe', 'wire', function () { click('[data-shade="wire"]'); }, { kbd: 'Z', keep: true, on: function () { return pressed('[data-shade="wire"]'); } }),
                tile('Solid', 'solid', function () { click('[data-shade="solid"]'); }, { keep: true, on: function () { return pressed('[data-shade="solid"]'); } }),
                tile('Material', 'material', function () { click('[data-shade="material"]'); }, { keep: true, on: function () { return pressed('[data-shade="material"]'); } }),
                tile('Rendered', 'sun', function () { click('[data-shade="rendered"]'); }, { keep: true, on: function () { return pressed('[data-shade="rendered"]'); } })
            ], 2));
            const shade = /^(Wireframe|Solid|Material Preview|Rendered)$/;
            rowTiles('view', function (r) { return !shade.test(r.label); }).forEach(function (g) { body.appendChild(section(g.title || 'View', g.items.map(itemTile), 2)); });
        } else if (id === 'scene') {
            body.appendChild(el('p', 'nv-note', 'The outliner is open beside this panel. Click an object to select it, double-click to rename!'));
        } else {
            rowTiles(id).forEach(function (g) { body.appendChild(section(g.title || GROUPS.filter(function (x) { return x.id === id; })[0].name, g.items.map(itemTile), id === 'add' ? 3 : 2)); });
        }
        return body;
    }

    /* ---------- the flyout panel ---------- */
    function openPanel(id) {
        closePop();
        if (id === 'scene') {
            closePanel(true);
            panelId = 'scene'; document.body.classList.add('nv-scene');
            dockSync(); refit(); return;
        }
        document.body.classList.remove('nv-scene');
        const g = GROUPS.filter(function (x) { return x.id === id; })[0];
        const p = nodes.panel; p.innerHTML = '';
        const head = el('div', 'nv-phead', '<span class="nv-pic">' + ic(g.icon) + '</span><b>' + esc(g.name) + '</b><small>' + esc(g.title) + '</small>');
        const x = el('button', 'nv-t nv-ic-btn', ic('close')); x.type = 'button'; x.title = 'Close'; x.addEventListener('click', function () { closePanel(); });
        head.appendChild(x);
        p.appendChild(head);
        p.appendChild(groupBody(id));
        p.hidden = false; panelId = id;
        p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
        dockSync(); sync();
    }
    function closePanel(keepScene) {
        if (nodes.panel) nodes.panel.hidden = true;
        if (!keepScene && document.body.classList.contains('nv-scene')) { document.body.classList.remove('nv-scene'); refit(); }
        panelId = keepScene ? panelId : null;
        dockSync();
    }
    function togglePanelFor(id) { if (panelId === id) closePanel(); else openPanel(id); }

    /* ---------- little popover menus (File, More...) ---------- */
    function closePop() { if (popEl) { popEl.remove(); popEl = null; } document.querySelectorAll('.nv-open').forEach(function (n) { n.classList.remove('nv-open'); }); }
    function openPop(anchor, items, opts) {
        closePop(); closePanel();
        const m = el('div', 'nv-pop'); popEl = m;
        items.forEach(function (it) {
            if (it === '-') { m.appendChild(el('hr')); return; }
            if (it.head) { m.appendChild(el('div', 'nv-ph', esc(it.head))); return; }
            const b = el('button', 'nv-pi' + (it.checked ? ' on' : ''), '<span>' + ic(it.icon || 'sparkle') + '</span><i>' + esc(it.label) + '</i>' + (it.kbd ? '<kbd>' + esc(it.kbd) + '</kbd>' : ''));
            b.type = 'button';
            b.addEventListener('click', function (e) { e.stopPropagation(); closePop(); try { it.run(); } catch (err) { console.error(err); } sync(); });
            m.appendChild(b);
        });
        document.body.appendChild(m);
        const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
        let x, y;
        if (opts && opts.side === 'right') { x = r.right + 10; y = Math.min(r.top, innerHeight - mh - 10); } else { x = Math.min(r.left, innerWidth - mw - 10); y = Math.min(r.bottom + 8, innerHeight - mh - 10); }
        m.style.left = Math.max(8, x) + 'px'; m.style.top = Math.max(8, y) + 'px';
        anchor.classList.add('nv-open');
    }
    function fileItems() {
        return rows('file').map(function (r) { return r.head ? { head: r.head } : { label: r.label, icon: r.icon, kbd: r.kbd, run: r.run }; });
    }
    function exportItems() {
        return rows('file').filter(function (r) { return r.label && /^(Export|Render)/.test(r.label); }).map(function (r) { return { label: r.label, icon: r.icon, run: r.run }; });
    }
    function moreItems() {
        const items = [{ head: 'Layout' },
            { label: 'Nova (this layout)', icon: 'sparkle', checked: true, run: function () {} },
            { label: 'Classic Zonerider', icon: 'layout', run: function () { setLayout('classic'); } },
            '-', { head: 'Nova' },
            { label: dark ? 'Light Nova' : 'Dark Nova', icon: dark ? 'sun' : 'moon', run: toggleDark }];
        rows('help').forEach(function (r) { if (!r.head) items.push({ label: r.label, icon: r.icon, kbd: r.kbd, run: r.run }); });
        return items;
    }

    /* ---------- the command palette ---------- */
    function commands() {
        const out = [];
        [['file', 'File'], ['edit', 'Edit'], ['add', 'Add'], ['object', 'Object'], ['view', 'View'], ['render', 'Render'], ['help', 'Help']].forEach(function (m) {
            rows(m[0]).forEach(function (r) { if (!r.head) out.push({ label: r.label, where: m[1], icon: r.icon || 'sparkle', kbd: r.kbd, run: r.run }); });
        });
        out.push({ label: 'Classic layout', where: 'Layout', icon: 'layout', run: function () { setLayout('classic'); } });
        out.push({ label: dark ? 'Light Nova' : 'Dark Nova', where: 'Nova', icon: dark ? 'sun' : 'moon', run: toggleDark });
        return out;
    }
    function closePalette() { if (palEl) { palEl.remove(); palEl = null; } }
    function openPalette() {
        closePop(); closePanel(); closePalette();
        const all = commands();
        const back = el('div', 'nv-pal-back');
        back.innerHTML = '<div class="nv-pal" role="dialog" aria-label="Jump to anything"><div class="nv-pal-in">' + ic('search') + '<input type="text" placeholder="Jump to anything: add a cube, frame all, render…" aria-label="Search commands"><kbd>Esc</kbd></div><div class="nv-pal-list"></div></div>';
        document.body.appendChild(back); palEl = back;
        const input = back.querySelector('input'), list = back.querySelector('.nv-pal-list');
        let idx = 0, shown = [];
        function paint() {
            const q = input.value.trim().toLowerCase(), terms = q.split(/\s+/).filter(Boolean);
            shown = all.filter(function (c) { const h = (c.label + ' ' + c.where).toLowerCase(); return terms.every(function (t) { return h.indexOf(t) !== -1; }); }).slice(0, 40);
            if (idx >= shown.length) idx = Math.max(0, shown.length - 1);
            list.innerHTML = '';
            if (!shown.length) { list.appendChild(el('div', 'nv-pal-empty', 'Nothing matches that!')); return; }
            shown.forEach(function (c, i) {
                const b = el('button', 'nv-pal-item' + (i === idx ? ' kb' : ''), '<span class="nv-pal-ic">' + ic(c.icon) + '</span><span class="nv-pal-l">' + esc(c.label) + '</span><em>' + esc(c.where) + '</em>' + (c.kbd ? '<kbd>' + esc(c.kbd) + '</kbd>' : ''));
                b.type = 'button';
                b.addEventListener('click', function () { go(c); });
                b.addEventListener('mousemove', function () { idx = i; mark(); });
                list.appendChild(b);
            });
        }
        function mark() { list.querySelectorAll('.nv-pal-item').forEach(function (b, i) { b.classList.toggle('kb', i === idx); }); const k = list.querySelector('.kb'); if (k) k.scrollIntoView({ block: 'nearest' }); }
        function go(c) { closePalette(); try { c.run(); } catch (err) { console.error(err); } sync(); }
        input.addEventListener('input', function () { idx = 0; paint(); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(shown.length - 1, idx + 1); mark(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); mark(); }
            else if (e.key === 'Enter') { e.preventDefault(); if (shown[idx]) go(shown[idx]); }
            e.stopPropagation();
        });
        back.addEventListener('mousedown', function (e) { if (e.target === back) closePalette(); });
        paint(); setTimeout(function () { input.focus(); }, 0);
    }

    /* ---------- the floating capsule over the viewport ---------- */
    function capBtn(icon, title, run, onf, needSel) {
        const b = el('button', 'nv-t nv-ic-btn', ic(icon)); b.type = 'button'; b.title = title;
        b.addEventListener('click', function (e) { e.stopPropagation(); try { run(); } catch (err) { console.error(err); } sync(); });
        b._on = onf; b._needSel = needSel; return b;
    }
    function buildCapsule() {
        const c = el('div', 'nv-capsule'); const in_ = el('div', 'nv-capsule-in'); c.appendChild(in_);
        const label = el('span', 'nv-sel', '<i></i><b>Nothing selected</b>'); nodes.sel = label; in_.appendChild(label);
        in_.appendChild(el('span', 'nv-csep'));
        in_.appendChild(capBtn('move', 'Move (G)', function () { click('[data-tool="translate"]'); }, function () { return pressed('[data-tool="translate"]'); }));
        in_.appendChild(capBtn('rotate', 'Rotate (R)', function () { click('[data-tool="rotate"]'); }, function () { return pressed('[data-tool="rotate"]'); }));
        in_.appendChild(capBtn('scale', 'Scale (Shift+S)', function () { click('[data-tool="scale"]'); }, function () { return pressed('[data-tool="scale"]'); }));
        in_.appendChild(el('span', 'nv-csep'));
        in_.appendChild(capBtn('globe', 'Global axes', function () { click('[data-space="world"]'); }, function () { return pressed('[data-space="world"]'); }));
        in_.appendChild(capBtn('object', 'Local axes', function () { click('[data-space="local"]'); }, function () { return pressed('[data-space="local"]'); }));
        in_.appendChild(capBtn('magnet', 'Snap', function () { click('#zr-snap'); }, function () { return pressed('#zr-snap'); }));
        in_.appendChild(el('span', 'nv-csep'));
        in_.appendChild(capBtn('duplicate', 'Duplicate (Shift+D)', function () { Z().duplicate(); }, null, true));
        in_.appendChild(capBtn('focus', 'Frame selected (F)', function () { const s = st(); Z().frameObjects(s.selected); }, null, true));
        in_.appendChild(capBtn('eye', 'Hide (H)', function () { hideSelected(); }, null, true));
        in_.appendChild(capBtn('trash', 'Delete (X)', function () { Z().del(); }, null, true));
        in_.appendChild(el('span', 'nv-csep'));
        ['wire', 'solid', 'material', 'rendered'].forEach(function (s, i) {
            in_.appendChild(capBtn(['wire', 'solid', 'material', 'sun'][i], ['Wireframe (Z)', 'Solid', 'Material Preview', 'Rendered'][i], function () { click('[data-shade="' + s + '"]'); }, function () { return pressed('[data-shade="' + s + '"]'); }));
        });
        return c;
    }
    // the editor hides objects through its Object menu
    function hideSelected() { const r = rows('object').filter(function (x) { return x.label === 'Hide'; })[0]; if (r) r.run(); }

    /* ---------- build and tear down ---------- */
    function build() {
        if (built) return; built = true;
        const app = $('zr-app'), view = $('zr-view');
        // dock
        const dock = el('nav', 'nv nv-dock'); dock.id = 'nv-dock'; dock.setAttribute('aria-label', 'Zonerider tools');
        const logo = el('a', 'nv-logo', '<img src="favicon.svg" alt="Zonerider">'); logo.href = '/'; logo.title = 'Radii Office home';
        dock.appendChild(logo);
        const main = el('div', 'nv-dock-main');
        GROUPS.forEach(function (g) {
            const b = el('button', 'nv-d', ic(g.icon) + '<span>' + esc(g.name) + '</span>'); b.type = 'button'; b.title = g.title; b.dataset.g = g.id;
            b.addEventListener('click', function (e) { e.stopPropagation(); togglePanelFor(g.id); });
            main.appendChild(b);
        });
        const props = el('button', 'nv-d', ic('panelRight') + '<span>Props</span>'); props.type = 'button'; props.title = 'Show or hide the properties panel (N)'; props.dataset.g = 'props';
        props.addEventListener('click', function (e) { e.stopPropagation(); closePanel(); Z().togglePanel('right'); refit(); sync(); });
        main.appendChild(props);
        dock.appendChild(main);
        const end = el('div', 'nv-dock-end');
        const file = el('button', 'nv-d', ic('folder') + '<span>File</span>'); file.type = 'button'; file.title = 'New, open, save, import and export';
        file.addEventListener('click', function (e) { e.stopPropagation(); openPop(file, fileItems(), { side: 'right' }); });
        const theme = el('button', 'nv-d', ic('moon') + '<span>Theme</span>'); theme.type = 'button'; theme.title = 'Light or dark Nova'; theme.addEventListener('click', toggleDark); nodes.theme = theme;
        const more = el('button', 'nv-d nv-grey', ic('gear') + '<span>More</span>'); more.type = 'button'; more.title = 'Layout, shortcuts and about';
        more.addEventListener('click', function (e) { e.stopPropagation(); openPop(more, moreItems(), { side: 'right' }); });
        end.appendChild(file); end.appendChild(theme); end.appendChild(more);
        dock.appendChild(end);
        app.appendChild(dock);
        // top bar
        const bar = el('header', 'nv nv-bar'); bar.id = 'nv-bar';
        const left = el('div', 'nv-bar-l', '<b class="nv-title">Zonerider</b><span class="nv-saved">' + ic('check') + 'Saved</span>'); nodes.saved = left.querySelector('.nv-saved');
        const search = el('button', 'nv-search', ic('search') + '<span>Jump to anything</span><kbd>' + (/Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd>'); search.type = 'button'; search.addEventListener('click', openPalette);
        const right = el('div', 'nv-bar-r');
        const bb = function (icon, title, run, label) { const b = el('button', 'nv-t nv-barbtn' + (label ? ' nv-withlab' : ''), ic(icon) + (label ? '<span>' + esc(label) + '</span>' : '')); b.type = 'button'; b.title = title; b.addEventListener('click', function (e) { e.stopPropagation(); run(b); sync(); }); return b; };
        right.appendChild(bb('undo', 'Undo (Ctrl+Z)', function () { Z().undo(); }));
        right.appendChild(bb('redo', 'Redo (Ctrl+Shift+Z)', function () { Z().redo(); }));
        right.appendChild(bb('folder', 'Open a scene or import a model', function () { const r = rows('file').filter(function (x) { return x.label === 'Open…'; })[0]; if (r) r.run(); }));
        right.appendChild(bb('export', 'Export', function (b) { openPop(b, exportItems()); }, 'Export'));
        const share = bb('share', 'Share and collaborate', function () { if (window.RadiiCollab) window.RadiiCollab.toggle('people'); }, 'Share'); share.classList.add('nv-primary'); right.appendChild(share);
        bar.appendChild(left); bar.appendChild(search); bar.appendChild(right);
        app.appendChild(bar);
        // flyout panel
        const panel = el('aside', 'nv nv-panel'); panel.id = 'nv-panel'; panel.hidden = true; app.appendChild(panel); nodes.panel = panel;
        // capsule and status pill live inside the viewport
        nodes.capsule = buildCapsule(); view.appendChild(nodes.capsule); nodes.capsule.classList.add('nv');
        const pill = el('div', 'nv nv-status'); pill.id = 'nv-status'; view.appendChild(pill); nodes.pill = pill;
        nodes.dock = dock;
        // the classic top bar offers a way in
        const top = document.querySelector('.zr-top');
        if (top && !top.querySelector('.zr-nova-btn')) {
            const b = el('button', 'zr-toggle zr-nova-btn', 'Nova layout'); b.type = 'button'; b.title = 'Switch to the Nova layout';
            b.addEventListener('click', function () { setLayout('nova'); });
            const sp = top.querySelector('.zr-spacer'); top.insertBefore(b, sp ? sp.nextSibling : null);
        }
        // status mirrors the editor's own status line
        const src = $('zr-status');
        if (src && window.MutationObserver) {
            const mirror = function () { pill.innerHTML = src.innerHTML; };
            statusObs = new MutationObserver(mirror); statusObs.observe(src, { childList: true, subtree: true, characterData: true }); mirror();
        }
        document.addEventListener('mousedown', function (e) {
            if (!on) return;
            if (popEl && !e.target.closest('.nv-pop') && !e.target.closest('.nv-d') && !e.target.closest('.nv-barbtn')) closePop();
            if (nodes.panel && !nodes.panel.hidden && !e.target.closest('.nv')) closePanel();
        });
        document.addEventListener('keydown', function (e) {
            if (!on) return;
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); e.stopPropagation(); if (palEl) closePalette(); else openPalette(); }
            else if (e.key === 'Escape') { if (palEl) closePalette(); else if (popEl) closePop(); else if (panelId) closePanel(); }
        }, true);
    }
    function dockSync() {
        if (!nodes.dock) return;
        nodes.dock.querySelectorAll('.nv-d').forEach(function (b) {
            const g = b.dataset.g; let onNow = false;
            if (g === 'props') onNow = !$('zr-app').classList.contains('zr-no-right');
            else if (g) onNow = panelId === g;
            b.classList.toggle('on', onNow);
        });
        if (nodes.theme) nodes.theme.innerHTML = ic(dark ? 'sun' : 'moon') + '<span>' + (dark ? 'Light' : 'Dark') + '</span>';
    }
    // keep every highlight and the capsule's contents right
    function sync() {
        if (!on) return;
        document.querySelectorAll('.nv-t').forEach(function (b) { if (b._on) b.classList.toggle('on', !!b._on()); });
        const s = st();
        if (s) {
            const n = s.selected ? s.selected.length : 0;
            document.querySelectorAll('.nv-capsule .nv-t').forEach(function (b) { if (b._needSel) b.disabled = !n; });
            if (nodes.sel) {
                const a = s.active;
                nodes.sel.querySelector('b').textContent = n ? (a ? a.name : 'Selection') + (n > 1 ? ' +' + (n - 1) : '') : 'Nothing selected';
                nodes.sel.classList.toggle('none', !n);
            }
        }
        dockSync();
    }
    // the little Saved chip blips whenever the editor stores the scene
    let lastSave = '';
    function watchSave() {
        let v = ''; try { v = String((localStorage.getItem('zonerider_scene') || '').length) + ':' + (localStorage.getItem('zonerider_scene') || '').slice(-40); } catch (e) {}
        if (nodes.saved && v !== lastSave) { lastSave = v; nodes.saved.classList.remove('blip'); void nodes.saved.offsetWidth; nodes.saved.classList.add('blip'); }
    }
    function toggleDark() { dark = !dark; try { localStorage.setItem(DARK_KEY, dark ? '1' : '0'); } catch (e) {} document.body.classList.toggle('nv-dark', dark); dockSync(); }

    function enter() {
        if (on) return;
        const z = Z(); if (!z || !z.menus) return;
        on = true;
        try { const d = localStorage.getItem(DARK_KEY); dark = d === null ? true : d === '1'; } catch (e) { dark = true; }
        build();
        document.body.classList.add('zr-nova', 'nv-on'); document.body.classList.toggle('nv-dark', dark);
        document.querySelectorAll('.nv').forEach(function (n) { n.hidden = n === nodes.panel ? true : false; });
        timer = setInterval(function () { sync(); watchSave(); }, 350);
        sync(); refit();
    }
    function leave() {
        if (!on) return;
        on = false; clearInterval(timer);
        closePop(); closePalette(); closePanel();
        document.body.classList.remove('zr-nova', 'nv-on', 'nv-dark', 'nv-scene');
        document.querySelectorAll('.nv').forEach(function (n) { n.hidden = true; });
        refit();
    }
    function apply() { if (want() && wide()) enter(); else leave(); }

    function init() {
        // the classic top bar always carries the Nova button (even when Nova is off)
        const t0 = setInterval(function () {
            if (!Z() || !Z().menus) return;
            clearInterval(t0);
            if (!built) {
                // build lazily, but always add the switch button to the classic bar
                const top = document.querySelector('.zr-top');
                if (top && !top.querySelector('.zr-nova-btn')) {
                    const b = el('button', 'zr-toggle zr-nova-btn', 'Nova layout'); b.type = 'button'; b.title = 'Switch to the Nova layout';
                    b.addEventListener('click', function () { setLayout('nova'); });
                    const sp = top.querySelector('.zr-spacer'); top.insertBefore(b, sp);
                }
            }
            apply();
        }, 60);
        window.addEventListener('resize', function () { apply(); });
        window.addEventListener('storage', function (e) { if (e.key === LAYOUT_KEY) apply(); });
    }
    window.ZonerNova = { on: function () { return on; }, set: setLayout, palette: openPalette };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
