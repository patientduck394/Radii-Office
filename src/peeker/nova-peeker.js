/* =====================================================================
   Nova for Peeker: a slim tool dock, a top bar with a jump-to-anything palette, a floating tool capsule (Peeker's own
   toolbar, restyled), flyout panels and a status pill. It is its own interface, and it only presses Peeker's own buttons,
   so every tool works exactly the same as in Classic. Layout is saved as peeker_layout ('nova' or 'classic').
   Icons: Vadivam first, then Gravity UI Icons, then Lucide (see nova-icons.js and ATTRIBUTIONS.md).
   ===================================================================== */
(function () {
    'use strict';
    const ICONS = window.NovaIcons || {};
    const LKEY = 'peeker_layout', DKEY = 'peeker_nova_dark';
    const $ = function (id) { return document.getElementById(id); };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
    function ic(name, cls) {
        const d = ICONS[name]; if (!d) return '';
        if (d[0] === 'g') return '<svg class="pn-ic pn-g' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + d[1] + '</svg>';
        return '<svg class="pn-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d[1] + '</svg>';
    }

    /* ---------- the commands: each one presses a button Peeker already has ---------- */
    const TOOLS = [
        ['select', 'Select', 'pen', 'Select and move marks (V)'], ['edit', 'Edit', 'pencil', 'Edit what is already in the PDF (E)'], ['text', 'Text', 'textbox', 'Add text (T)'],
        ['hl', 'Highlight', 'brush', 'Highlight an area (H)'], ['ink', 'Draw', 'wand', 'Draw freehand (D)'], ['box', 'Box', 'shapes', 'Draw a box (B)'],
        ['white', 'Whiteout', 'clearFormat', 'Cover something with white (W)'], ['img', 'Image', 'image', 'Place a picture'], ['sign', 'Sign', 'annotate', 'Draw your signature and place it']
    ];
    const FILE = [
        ['open-btn', 'Open PDF', 'folder'], ['blank-btn', 'New blank', 'newDoc'], ['merge-btn', 'Add pages', 'import'], ['__docs', 'Documents', 'notebook'],
        ['save-btn', 'Save PDF', 'save'], ['extract-btn', 'Extract', 'export']
    ];
    const PAGES = [
        ['rotl', 'Rotate left', 'undo'], ['rotr', 'Rotate right', 'redo'], ['up', 'Move up', 'arrowUp'], ['down', 'Move down', 'arrowDown'],
        ['dup', 'Duplicate', 'duplicate'], ['blank', 'Blank page', 'plus'], ['del', 'Delete page', 'trash']
    ];
    function press(kind, key) {
        let b = null;
        if (kind === 'tool') b = document.querySelector('#tools [data-tool="' + key + '"]');
        else if (kind === 'page') b = document.querySelector('#pagebar [data-page="' + key + '"]');
        else if (key === '__docs') { try { RadiiDocs.openDialog(); } catch (e) {} return; }
        else b = $(key);
        if (b && !b.disabled) b.click();
    }
    function commands() {
        const out = [];
        TOOLS.forEach(function (t) { out.push({ label: t[1] + ' tool', icon: t[2], where: 'Tools', run: function () { press('tool', t[0]); } }); });
        FILE.forEach(function (f) { out.push({ label: f[1], icon: f[2], where: 'File', run: function () { press('id', f[0]); } }); });
        PAGES.forEach(function (p) { out.push({ label: p[1], icon: p[2], where: 'Pages', run: function () { press('page', p[0]); } }); });
        [['forms-btn', 'Fill forms', 'list'], ['find-btn', 'Find text', 'search'], ['undo-btn', 'Undo', 'undo'], ['redo-btn', 'Redo', 'redo'], ['del-mark-btn', 'Delete the selected mark', 'trash'], ['zoom-in', 'Zoom in', 'plus'], ['zoom-out', 'Zoom out', 'minus'], ['zoom-fit', 'Fit the page width', 'zoom']].forEach(function (c) {
            out.push({ label: c[1], icon: c[2], where: 'Peeker', run: function () { press('id', c[0]); } });
        });
        out.push({ label: 'Switch to Peeker Classic', icon: 'layout', where: 'Layout', run: function () { setLayout('classic'); } });
        out.push({ label: 'Light or dark Nova', icon: 'moon', where: 'Layout', run: function () { toggleDark(); } });
        return out;
    }

    /* ---------- state ---------- */
    let on = false, nodes = {}, popEl = null, palEl = null, timer = 0, mo = null, lastName = null;
    const narrow = function () { return window.matchMedia && matchMedia('(max-width: 720px)').matches; };
    function wanted() { return store(LKEY) === 'nova' && !narrow(); }
    function setLayout(l) { store(LKEY, l); apply(); }
    function dark() { const d = store(DKEY); return d === '1' || (d === null && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
    function toggleDark() { store(DKEY, dark() ? '0' : '1'); document.body.classList.toggle('pn-dark', dark()); paintTheme(); }
    function paintTheme() { if (nodes.theme) { nodes.theme.querySelector('.pn-d-ic').innerHTML = ic(dark() ? 'sun' : 'moon'); } }

    /* ---------- popovers ---------- */
    function closePop() { if (popEl) { popEl.remove(); popEl = null; } document.querySelectorAll('.pn-open').forEach(function (n) { n.classList.remove('pn-open'); }); }
    function openPop(anchor, build, cls) {
        const was = popEl && popEl._anchor === anchor; closePop(); if (was) return;
        const p = el('div', 'pn pn-pop' + (cls ? ' ' + cls : '')); build(p); document.body.appendChild(p);
        const r = anchor.getBoundingClientRect(), h = p.offsetHeight;
        p.style.left = (r.right + 10) + 'px'; p.style.top = Math.max(8, Math.min(r.top, window.innerHeight - h - 8)) + 'px';
        p._anchor = anchor; popEl = p; anchor.classList.add('pn-open');
    }
    function tile(icon, label, title, onclick, opts) {
        const b = el('button', 'pn-t pn-tile', ic(icon) + '<span>' + esc(label) + '</span>'); b.type = 'button'; b.title = title || label;
        b.addEventListener('click', function (e) { onclick(e); if (!(opts && opts.keep)) closePop(); }); return b;
    }
    function panelFor(kind) {
        return function (p) {
            const head = el('div', 'pn-pop-h', '<b>' + (kind === 'tool' ? 'Tools' : kind === 'file' ? 'File' : 'Pages') + '</b>');
            const grid = el('div', 'pn-grid'); p.appendChild(head); p.appendChild(grid);
            if (kind === 'tool') TOOLS.forEach(function (t) { const b = tile(t[2], t[1], t[3], function () { press('tool', t[0]); }); b.dataset.tool = t[0]; grid.appendChild(b); });
            if (kind === 'file') FILE.forEach(function (f) { const b = tile(f[2], f[1], f[1], function () { press('id', f[0]); }); b.dataset.id = f[0]; grid.appendChild(b); });
            if (kind === 'page') PAGES.forEach(function (g) { const b = tile(g[2], g[1], g[1], function () { press('page', g[0]); }, { keep: true }); b.dataset.page = g[0]; grid.appendChild(b); });
            sync();
        };
    }

    /* ---------- the palette (Cmd/Ctrl+K) ---------- */
    function closePal() { if (palEl) { palEl.remove(); palEl = null; } }
    function openPal() {
        closePop(); closePal();
        const all = commands(); let shown = all, idx = 0;
        const w = el('div', 'pn pn-palwrap'); const box = el('div', 'pn-pal');
        const inp = el('input'); inp.type = 'text'; inp.placeholder = 'Jump to any tool or command'; inp.setAttribute('aria-label', 'Jump to anything');
        const list = el('div', 'pn-pal-list');
        box.appendChild(inp); box.appendChild(list); w.appendChild(box); document.body.appendChild(w); palEl = w; inp.focus();
        function paint() {
            list.innerHTML = '';
            shown.slice(0, 40).forEach(function (c, i) {
                const b = el('button', 'pn-pal-item' + (i === idx ? ' kb' : ''), '<span class="pn-pal-ic">' + ic(c.icon) + '</span><span class="pn-pal-l">' + esc(c.label) + '</span><em>' + esc(c.where) + '</em>'); b.type = 'button';
                b.addEventListener('click', function () { closePal(); c.run(); }); list.appendChild(b);
            });
            if (!shown.length) list.innerHTML = '<p class="pn-none">Nothing matches that!</p>';
        }
        inp.addEventListener('input', function () { const q = inp.value.trim().toLowerCase(); shown = q ? all.filter(function (c) { return (c.label + ' ' + c.where).toLowerCase().indexOf(q) !== -1; }) : all; idx = 0; paint(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { closePal(); e.preventDefault(); }
            else if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, Math.min(shown.length, 40) - 1); paint(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); paint(); e.preventDefault(); }
            else if (e.key === 'Enter') { const c = shown[idx]; if (c) { closePal(); c.run(); } e.preventDefault(); }
        });
        w.addEventListener('mousedown', function (e) { if (e.target === w) closePal(); });
        paint();
    }

    /* ---------- build ---------- */
    function dockBtn(icon, label, title) { const b = el('button', 'pn-d', ic(icon) + '<span>' + esc(label) + '</span>'); b.type = 'button'; b.title = title || label; b.setAttribute('aria-label', title || label); return b; }
    function barBtn(icon, title, fn, label) { const b = el('button', 'pn-t pn-barbtn' + (label ? ' pn-withlab' : ''), ic(icon) + (label ? '<span>' + esc(label) + '</span>' : '')); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.addEventListener('click', fn); return b; }
    function build() {
        const dock = el('nav', 'pn pn-dock'); dock.id = 'pn-dock'; dock.setAttribute('aria-label', 'Peeker tools');
        const logo = el('button', 'pn-logo', '<img src="favicon-96.png" alt="">'); logo.type = 'button'; logo.title = 'Open a PDF'; logo.addEventListener('click', function () { press('id', 'open-btn'); });
        const main = el('div', 'pn-dock-main'), end = el('div', 'pn-dock-end');
        const tools = dockBtn('pen', 'Tools', 'Tools: select, edit, text, highlight, draw, box, whiteout, image, sign'); tools.addEventListener('click', function (e) { openPop(tools, panelFor('tool')); e.stopPropagation(); });
        const pages = dockBtn('pages', 'Pages', 'Pages: rotate, move, duplicate, add and delete'); pages.addEventListener('click', function (e) { openPop(pages, panelFor('page')); e.stopPropagation(); });
        const forms = dockBtn('list', 'Forms', 'Fill in the form fields of this PDF'); forms.addEventListener('click', function () { closePop(); press('id', 'forms-btn'); });
        const find = dockBtn('search', 'Find', 'Find words in this PDF (Ctrl+F)'); find.addEventListener('click', function () { closePop(); press('id', 'find-btn'); });
        main.appendChild(tools); main.appendChild(pages); main.appendChild(forms); main.appendChild(find);
        const file = dockBtn('doc', 'File', 'File: open, new, add pages, documents, save, extract'); file.addEventListener('click', function (e) { openPop(file, panelFor('file')); e.stopPropagation(); });
        const lay = dockBtn('layout', 'Layout', 'Switch layout');
        lay.addEventListener('click', function (e) {
            openPop(lay, function (p) {
                p.appendChild(el('div', 'pn-pop-h', '<b>Layout</b>'));
                const g = el('div', 'pn-cards');
                [['nova', 'Nova', 'A slim dock, floating tools and a jump-to-anything bar!'], ['classic', 'Classic', 'The orange glass sidebar and gel buttons!']].forEach(function (l) {
                    const b = el('button', 'pn-card' + (l[0] === 'nova' ? ' on' : ''), '<b>' + l[1] + '</b><small>' + l[2] + '</small>'); b.type = 'button';
                    b.addEventListener('click', function () { setLayout(l[0]); }); g.appendChild(b);
                });
                p.appendChild(g);
            }); e.stopPropagation();
        });
        const theme = dockBtn('moon', 'Theme', 'Light or dark Nova'); theme.querySelector('svg').outerHTML = '<span class="pn-d-ic">' + ic('moon') + '</span>'; theme.addEventListener('click', toggleDark);
        file.classList.add('pn-d-end'); end.appendChild(file); end.appendChild(lay); end.appendChild(theme);
        dock.appendChild(logo); dock.appendChild(main); dock.appendChild(end);

        const bar = el('header', 'pn pn-bar'); bar.id = 'pn-bar';
        const left = el('div', 'pn-bar-l'); const name = el('input', 'pn-docname'); name.type = 'text'; name.maxLength = 120; name.setAttribute('aria-label', 'Document name');
        name.addEventListener('input', function () { const o = $('doc-name'); if (o && !o.disabled) { o.value = name.value; o.dispatchEvent(new Event('input', { bubbles: true })); } });
        name.addEventListener('change', function () { const o = $('doc-name'); if (o && !o.disabled) { o.value = name.value; o.dispatchEvent(new Event('change', { bubbles: true })); } });
        const chip = el('span', 'pn-saved'); chip.innerHTML = ic('check') + '<span>Ready</span>';
        left.appendChild(name); left.appendChild(chip);
        const search = el('button', 'pn-search', ic('search') + '<span>Jump to anything</span><kbd>' + (/Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd>'); search.type = 'button'; search.addEventListener('click', openPal);
        const right = el('div', 'pn-bar-r');
        right.appendChild(barBtn('folder', 'Open a PDF', function () { press('id', 'open-btn'); }));
        right.appendChild(barBtn('undo', 'Undo (Ctrl+Z)', function () { press('id', 'undo-btn'); }));
        right.appendChild(barBtn('redo', 'Redo (Ctrl+Y)', function () { press('id', 'redo-btn'); }));
        const save = barBtn('save', 'Download the edited PDF (Ctrl+S)', function () { press('id', 'save-btn'); }, 'Save PDF'); save.classList.add('pn-primary'); right.appendChild(save);
        bar.appendChild(left); bar.appendChild(search); bar.appendChild(right);

        const st = el('div', 'pn pn-status'); st.id = 'pn-status';
        const pg = el('span', 'pn-pg', 'Page 0 of 0');
        const zm = el('span', 'pn-zm');
        const zo = barBtn('minus', 'Zoom out (Ctrl+-)', function () { press('id', 'zoom-out'); }), zf = el('button', 'pn-t pn-zlab', '100%'); zf.type = 'button'; zf.title = 'Fit the page width'; zf.addEventListener('click', function () { press('id', 'zoom-fit'); });
        const zi = barBtn('plus', 'Zoom in (Ctrl+=)', function () { press('id', 'zoom-in'); });
        zm.appendChild(zo); zm.appendChild(zf); zm.appendChild(zi); const info = el('span', 'pn-info');
        st.appendChild(pg); st.appendChild(info); st.appendChild(zm);

        document.body.appendChild(dock); document.body.appendChild(bar); document.body.appendChild(st);
        nodes = { dock: dock, bar: bar, status: st, name: name, chip: chip, pg: pg, zf: zf, info: info, theme: theme, tools: tools };
    }

    /* ---------- keeping the Nova pieces in step with Peeker ---------- */
    function sync() {
        if (!on) return;
        const o = $('doc-name'), info = $('doc-info'), pgi = $('page-info'), z = $('zoom-fit');
        if (o && nodes.name) {
            nodes.name.disabled = !!o.disabled; nodes.name.placeholder = o.placeholder || 'No document open';
            if (document.activeElement !== nodes.name && nodes.name.value !== o.value) nodes.name.value = o.value;
        }
        if (nodes.pg && pgi) nodes.pg.textContent = pgi.textContent;
        if (nodes.zf && z) nodes.zf.textContent = z.textContent;
        if (nodes.info && info) { const t = info.textContent.replace(/!$/, ''); nodes.info.textContent = o && o.disabled ? '' : t; }
        if (nodes.chip) nodes.chip.querySelector('span').textContent = o && o.disabled ? 'Ready' : 'Open';
        const active = document.querySelector('#tools .view-seg-btn.active'), at = active && active.dataset.tool;
        document.querySelectorAll('.pn-pop [data-tool]').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === at); });
        document.querySelectorAll('.pn-pop [data-id]').forEach(function (b) { const s = $(b.dataset.id); b.disabled = !!(s && s.disabled); });
        document.querySelectorAll('.pn-pop [data-page]').forEach(function (b) { const s = document.querySelector('#pagebar [data-page="' + b.dataset.page + '"]'); b.disabled = !!(s && s.disabled); });
        if (nodes.tools) nodes.tools.classList.toggle('on', !!at && at !== 'select');
        const forms = $('forms-btn'), find = $('find-btn');
        document.querySelectorAll('.pn-dock-main .pn-d').forEach(function (b) {
            const t = b.title || ''; const src = /form/i.test(t) ? forms : /Find/.test(t) ? find : null;
            if (src) { b.disabled = !!src.disabled; }
        });
    }

    function enter() {
        if (on) return; on = true;
        document.body.classList.add('pn-on'); document.body.classList.toggle('pn-dark', dark());
        build(); paintTheme(); sync();
        mo = new MutationObserver(function () { sync(); });
        ['tools', 'pagebar', 'page-info', 'doc-info', 'zoom-fit', 'sidebar'].forEach(function (id) { const n = $(id); if (n) mo.observe(n, { subtree: true, childList: true, attributes: true, characterData: true }); });
        timer = setInterval(sync, 700);
    }
    function leave() {
        if (!on) return; on = false; clearInterval(timer); if (mo) mo.disconnect(); closePop(); closePal();
        document.querySelectorAll('.pn').forEach(function (n) { n.remove(); });
        document.body.classList.remove('pn-on', 'pn-dark'); nodes = {};
    }
    function apply() { if (wanted()) enter(); else leave(); addClassicSwitch(); }

    // Classic gets a small way in: a button at the foot of its sidebar
    function addClassicSwitch() {
        const foot = document.querySelector('.sidebar-foot'); if (!foot) return;
        let b = $('pn-try');
        if (!b) {
            b = el('button', 'pad-toggle-btn', ic('layout') + 'Try the Nova layout'); b.id = 'pn-try'; b.type = 'button'; b.title = 'A slim dock, floating tools and a jump-to-anything bar';
            b.style.marginTop = '10px'; b.addEventListener('click', function () { setLayout('nova'); }); foot.appendChild(b);
            b.querySelector('svg').style.cssText = 'width:1em;height:1em';
        }
    }

    document.addEventListener('keydown', function (e) {
        if (!on) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palEl ? closePal() : openPal(); }
        else if (e.key === 'Escape' && popEl) closePop();
    });
    document.addEventListener('mousedown', function (e) { if (popEl && !e.target.closest('.pn-pop') && !e.target.closest('.pn-d')) closePop(); });
    window.addEventListener('resize', function () { if (on !== wanted()) apply(); });
    window.PeekerNova = { on: function () { return on; }, set: setLayout, openPalette: openPal };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
