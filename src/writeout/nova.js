/* =====================================================================
   Nova: Writeout's fourth layout! A slim tool dock on the left, floating tool panels, a format capsule that hovers
   over the page, a jump-to-anything palette and a status pill. It is its own interface (nothing here reuses the Office
   ribbon, menus or tiles) and it shares only the commands, so every tool works the same in every layout.

   Look: "flat soft" buttons. A button's border is its main color and its fill is a lighter tint of that color.
   Icons: Vadivam first, then Gravity UI Icons, then Lucide (see nova-icons.js and ATTRIBUTIONS.md).
   ===================================================================== */
(function () {
    'use strict';
    const OS = window.OfficeShell;
    if (!OS) return;
    const ICONS = window.NovaIcons || {};
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

    /* ---------- icons ---------- */
    function ic(name, cls) {
        const d = ICONS[name];
        if (!d) return OS.ico(name, 'nv-ic' + (cls ? ' ' + cls : ''));   // a name Nova has no icon for: the shell's own icon
        if (d[0] === 'g') return '<svg class="nv-ic nv-g' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + d[1] + '</svg>';
        return '<svg class="nv-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d[1] + '</svg>';
    }

    /* ---------- the sections of the dock: one color each ---------- */
    const SECT = {
        home: { name: 'Write', icon: 'pen', c: 'var(--nv-primary)' },
        insert: { name: 'Insert', icon: 'plus', c: 'var(--nv-primary)' },
        layout: { name: 'Page', icon: 'layout', c: 'var(--nv-primary)' },
        references: { name: 'Cite', icon: 'book', c: 'var(--nv-primary)' },
        review: { name: 'Review', icon: 'review', c: 'var(--nv-primary)' },
        view: { name: 'View', icon: 'eye', c: 'var(--nv-primary)' },
        help: { name: 'Help', icon: 'help', c: 'var(--nv-primary)' }
    };
    const meta = function (tab) { return SECT[tab.id] || { name: tab.label, icon: 'sparkle', c: 'var(--nv-primary)' }; };

    let on = false, cfg = null;
    let controls = [];          // every live control (capsule and the open panel), for syncing
    let panelControls = [];
    let panelTab = null, pinned = false, popEl = null, popAnchor = null, palEl = null, syncQueued = false, timer = 0;
    const nodes = {};           // the pieces of Nova on the page
    try { pinned = localStorage.getItem('writeout_nova_pin') === '1'; } catch (e) {}

    const itemLabel = function (it) { return typeof it.label === 'function' ? it.label() : (it.label || ''); };
    const flat = function (items, out) {
        out = out || [];
        (items || []).forEach(function (it) {
            if (!it) return;
            if (it.stack) flat(it.stack, out);
            else if (it.rows) it.rows.forEach(function (r) { flat(r, out); });
            else out.push(it);
        });
        return out;
    };
    function allItems() { const out = []; cfg.tabs.forEach(function (t) { t.groups.forEach(function (g) { flat(g.items, out); }); }); return out; }
    function run(it, e) { OS.run(it, e); queueSync(); }

    /* ---------- popovers (menus, color grids) ---------- */
    function closePop() {
        if (!popEl) return;
        const p = popEl; popEl = null;
        if (popAnchor) popAnchor.classList.remove('nv-open');
        popAnchor = null;
        p.classList.add('nv-out');
        setTimeout(function () { p.remove(); }, 110);
    }
    function openPop(anchor, items, opts) {
        opts = opts || {};
        if (popEl && popAnchor === anchor) { closePop(); return; }
        closePop();
        if (!items) return;
        const m = el('div', 'nv nv-pop' + (opts.cls ? ' ' + opts.cls : ''));
        m.setAttribute('role', 'menu');
        m.style.setProperty('--nv-c', (anchor && anchor.closest('[data-nvc]') ? anchor.closest('[data-nvc]').dataset.nvc : '') || opts.color || 'var(--nv-primary)');
        items.forEach(function (mi) {
            if (!mi) return;
            if (mi.sep) { m.appendChild(el('hr', 'nv-pop-sep')); return; }
            if (mi.header) { m.appendChild(el('div', 'nv-pop-h', esc(mi.header))); return; }
            if (mi.node) { m.appendChild(mi.node); return; }
            if (mi.swatches) {
                const g = el('div', 'nv-sw' + (mi.cls ? ' ' + mi.cls : ''));
                if (mi.cols) g.style.gridTemplateColumns = 'repeat(' + mi.cols + ', 1fr)';
                mi.swatches.forEach(function (sw) {
                    const b = el('button', 'nv-swb' + (sw.cls ? ' ' + sw.cls : ''), sw.html || '');
                    b.type = 'button'; b.title = sw.title || '';
                    if (sw.color) b.style.background = sw.color;
                    b.addEventListener('click', function (e) { closePop(); run(sw, e); });
                    g.appendChild(b);
                });
                m.appendChild(g);
                return;
            }
            const b = el('button', 'nv-pi' + (mi.checked ? ' on' : '') + (mi.cls ? ' ' + mi.cls : ''));
            b.type = 'button'; b.setAttribute('role', 'menuitem');
            b.innerHTML = '<span class="nv-pi-i">' + (mi.checked ? ic('check') : mi.icon ? ic(mi.icon) : mi.dot ? '<i class="nv-dot" style="background:' + esc(mi.dot) + '"></i>' : '') + '</span>' +
                '<span class="nv-pi-l"' + (mi.style ? ' style="' + esc(mi.style) + '"' : '') + '>' + esc(mi.label) + (mi.hint ? '<small>' + esc(mi.hint) + '</small>' : '') + '</span>' + (mi.kbd ? '<kbd>' + esc(mi.kbd) + '</kbd>' : '');
            if (mi.disabled) b.disabled = true;
            b.addEventListener('click', function (e) { closePop(); run(mi, e); });
            m.appendChild(b);
        });
        document.body.appendChild(m);
        // place it beside or under the thing that opened it, inside the window
        const r = anchor ? anchor.getBoundingClientRect() : { left: 100, bottom: 100, top: 100, right: 100 };
        const mw = m.offsetWidth, mh = m.offsetHeight;
        let x, y;
        if (opts.side === 'right') { x = r.right + 8; y = r.top; } else { x = r.left; y = r.bottom + 6; }
        if (x + mw > window.innerWidth - 8) x = Math.max(8, window.innerWidth - mw - 8);
        if (y + mh > window.innerHeight - 8) y = Math.max(8, (opts.side === 'right' ? window.innerHeight - mh - 8 : r.top - mh - 6));
        m.style.left = x + 'px'; m.style.top = y + 'px';
        popEl = m; popAnchor = anchor || null;
        if (anchor) anchor.classList.add('nv-open');
        return m;
    }

    /* ---------- controls: the same commands the ribbon has, drawn the Nova way ---------- */
    // B / I / U / ab are drawn as icons in Nova
    const GLYPH_ICON = { B: 'bold', I: 'italic', U: 'underline', ab: 'strike' };
    ICONS.underlineWavy = ['v', '<path d="M5 2v8.616C5 14.448 8.004 18 12 18s7-3.553 7-7.385V2M3 21.5c1.5-1.8 3-1.8 4.5 0s3 1.8 4.5 0 3-1.8 4.5 0 3 1.8 4.5 0"/>'];

    function buildButton(it, into) {
        const size = it.big ? 'big' : it.sm ? 'sm' : 'ic';
        const b = el('button', 'nv-t nv-' + size + (it.cls ? ' ' + it.cls : ''));
        b.type = 'button';
        b.title = (it.title || itemLabel(it)) + (it.kbd ? ' (' + it.kbd + ')' : '');
        const gi = it.glyph ? (it.glyphCls === 'uw' ? 'underlineWavy' : GLYPH_ICON[it.glyph]) : null;
        const glyph = gi ? ic(gi) : it.glyph ? '<b class="nv-glyph ' + (it.glyphCls || '') + '">' + it.glyph + '</b>' : ic(it.icon);
        const lab = (it.big || it.sm) ? '<span class="nv-lab">' + esc(itemLabel(it)).replace(/\n/g, '<br>') + '</span>' : '';
        const car = it.menu && !it.run && (it.big || it.sm) ? '<i class="nv-car">' + ic('chevDown') + '</i>' : '';
        b.innerHTML = glyph + lab + car + (it.bar ? '<i class="nv-cbar"></i>' : '');
        const menuOf = function (a) { return typeof it.menu === 'function' ? it.menu(a) : it.menu; };
        if (it.menu && !it.run) {
            b.addEventListener('click', function (e) { openPop(b, menuOf(b)); e.stopPropagation(); });
        } else {
            b.addEventListener('click', function (e) { run(it, e); if (into && into.autoClose && !it.keepOpen && !e.shiftKey) closePanel(); });
        }
        if (it.menu && it.run) {
            const wrap = el('span', 'nv-split nv-sp-' + size);
            const arrow = el('button', 'nv-t nv-arrow', ic('chevDown'));
            arrow.type = 'button';
            arrow.title = (it.title || itemLabel(it)) + ' options';
            arrow.addEventListener('click', function (e) { openPop(arrow, menuOf(arrow)); e.stopPropagation(); });
            wrap.appendChild(b); wrap.appendChild(arrow);
            (into.list || controls).push({ it: it, el: b, wrap: wrap });
            return wrap;
        }
        (into.list || controls).push({ it: it, el: b });
        return b;
    }
    function buildSelect(it, into) {
        const wrap = el('label', 'nv-field nv-select' + (it.cls ? ' ' + it.cls : ''));
        wrap.title = it.title || itemLabel(it);
        const s = el('select', 'nv-sel');
        if (it.width) s.style.width = Math.max(64, it.width) + 'px';
        (typeof it.options === 'function' ? it.options() : it.options).forEach(function (o) {
            const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
            const op = el('option'); op.value = v; op.textContent = t;
            if (it.fontPreview) op.style.fontFamily = v;
            s.appendChild(op);
        });
        s.addEventListener('change', function () {
            if (cfg.keepSelection && it.sel !== false) OS.restoreSelection();
            try { it.set(s.value); } catch (e) { console.error(e); }
            queueSync();
        });
        wrap.appendChild(s);
        (into.list || controls).push({ it: it, el: s, kind: 'select' });
        return wrap;
    }
    function buildNumber(it, into) {
        const wrap = el('label', 'nv-field nv-number');
        wrap.title = it.title || itemLabel(it);
        const minus = el('button', 'nv-step', ic('minus')), plus = el('button', 'nv-step', ic('plus'));
        minus.type = plus.type = 'button';
        const inp = el('input', 'nv-num');
        inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.spellcheck = false;
        const st = it.step || 1;
        const clamp = function (v) { if (it.min != null) v = Math.max(it.min, v); if (it.max != null) v = Math.min(it.max, v); return Math.round(v * 100) / 100; };
        const commit = function (v) {
            if (!isFinite(v)) { queueSync(); return; }
            v = clamp(v); inp.value = String(v);
            if (cfg.keepSelection && it.sel !== false) OS.restoreSelection();
            try { it.set(v); } catch (e) { console.error(e); }
            queueSync();
        };
        const bump = function (d) { const cur = parseFloat(inp.value); commit((isFinite(cur) ? cur : (it.get ? Number(it.get()) || 0 : 0)) + d * st); };
        minus.addEventListener('click', function () { bump(-1); }); plus.addEventListener('click', function () { bump(1); });
        inp.addEventListener('change', function () { commit(parseFloat(inp.value.replace(',', '.'))); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); commit(parseFloat(inp.value.replace(',', '.'))); inp.blur(); OS.restoreSelection(); }
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); bump(e.key === 'ArrowUp' ? 1 : -1); }
        });
        if (it.width) inp.style.width = Math.max(34, Math.min(70, it.width)) + 'px';
        if (it.label) wrap.appendChild(el('span', 'nv-flab', esc(itemLabel(it))));
        wrap.appendChild(minus); wrap.appendChild(inp); wrap.appendChild(plus);
        (into.list || controls).push({ it: it, el: inp, kind: 'number', wrap: wrap });
        return wrap;
    }
    function buildCheck(it, into) {
        const lab = el('label', 'nv-check');
        lab.title = it.title || itemLabel(it);
        const cb = el('input'); cb.type = 'checkbox';
        cb.addEventListener('change', function () { try { it.set(cb.checked); } catch (e) { console.error(e); } queueSync(); });
        lab.appendChild(cb); lab.appendChild(el('i', 'nv-switch')); lab.appendChild(el('span', null, esc(itemLabel(it))));
        (into.list || controls).push({ it: it, el: cb, kind: 'check' });
        return lab;
    }
    function buildGallery(it, into) {
        const g = el('div', 'nv-gallery' + (it.cls ? ' ' + it.cls : ''));
        const list = el('div', 'nv-gal-list');
        g.appendChild(list);
        const render = function () {
            list.innerHTML = '';
            (typeof it.items === 'function' ? it.items() : it.items).forEach(function (gi) {
                const b = el('button', 'nv-gi' + (gi.cls ? ' ' + gi.cls : ''), (gi.preview || '') + '<span>' + esc(gi.label) + '</span>');
                b.type = 'button'; b.title = gi.title || gi.label; b._gi = gi;
                b.addEventListener('click', function (e) { run(gi, e); if (into && into.autoClose && !e.shiftKey) closePanel(); });
                list.appendChild(b);
            });
        };
        render();
        if (it.menu) {
            const more = el('button', 'nv-t nv-ic', ic('more')); more.type = 'button'; more.title = 'More';
            more.addEventListener('click', function (e) { openPop(more, typeof it.menu === 'function' ? it.menu(more) : it.menu); e.stopPropagation(); });
            g.appendChild(more);
        }
        (into.list || controls).push({ it: it, el: g, kind: 'gallery', render: render, list: list });
        return g;
    }
    function buildItem(it, into) {
        if (!it || it.sep) return null;
        if (it.stack) { const f = document.createDocumentFragment(); it.stack.forEach(function (x) { const n = buildItem(x, into); if (n) f.appendChild(n); }); return f; }
        if (it.rows) { const f = document.createDocumentFragment(); it.rows.forEach(function (r) { r.forEach(function (x) { const n = buildItem(x, into); if (n) f.appendChild(n); }); }); return f; }
        if (it.select) return buildSelect(it, into);
        if (it.number) return buildNumber(it, into);
        if (it.check) return buildCheck(it, into);
        if (it.gallery) return buildGallery(it, into);
        if (it.custom) {
            const c = el('div', 'nv-custom');
            try { it.custom(c); } catch (e) { console.error(e); }
            if (it.sync) (into.list || controls).push({ it: it, el: c, kind: 'custom' });
            return c;
        }
        return buildButton(it, into);
    }

    /* ---------- keeping every control up to date ---------- */
    function queueSync() { if (syncQueued || !on) return; syncQueued = true; requestAnimationFrame(function () { syncQueued = false; sync(); }); }
    function syncControls(list) {
        list.forEach(function (c) {
            const it = c.it;
            try {
                if (it.disabled) { const d = !!it.disabled(); if (c.el.disabled !== d) c.el.disabled = d; }
                if (c.kind === 'select') {
                    if (document.activeElement !== c.el && it.get) {
                        const v = it.get();
                        if (v != null && c.el.value !== String(v)) {
                            if (![].some.call(c.el.options, function (o) { return o.value === String(v); })) { const op = el('option'); op.value = v; op.textContent = v; c.el.appendChild(op); }
                            c.el.value = v;
                        }
                    }
                } else if (c.kind === 'number') {
                    if (document.activeElement !== c.el && it.get) { const v = it.get(); const t = v == null ? '' : String(Math.round(Number(v) * 100) / 100); if (c.el.value !== t) c.el.value = t; }
                } else if (c.kind === 'check') {
                    if (it.get) c.el.checked = !!it.get();
                } else if (c.kind === 'gallery') {
                    if (it.refresh && it.refresh()) c.render();
                    [].forEach.call(c.list.children, function (b) { b.classList.toggle('on', !!(b._gi && b._gi.active && b._gi.active())); });
                } else if (c.kind === 'custom') {
                    it.sync(c.el);
                } else {
                    if (it.checked) c.el.classList.toggle('on', !!it.checked());
                    if (it.bar) { const col = it.bar(); const bar = c.el.querySelector('.nv-cbar'); if (bar) bar.style.background = col || 'transparent'; }
                    if (typeof it.label === 'function' && (it.big || it.sm)) { const sp = c.el.querySelector('.nv-lab'); const want = esc(itemLabel(it)).replace(/\n/g, '<br>'); if (sp && sp.innerHTML !== want) sp.innerHTML = want; }
                }
            } catch (e) {}
        });
    }
    function sync() {
        if (!on || !cfg) return;
        syncControls(controls);
        syncControls(panelControls);
        // contextual tabs (like table tools) show up in the dock only while they apply
        cfg.tabs.forEach(function (t) {
            const b = nodes.dockBtns && nodes.dockBtns[t.id];
            if (b && t.contextual) { const vis = t.visible ? !!t.visible() : true; if (b.hidden === vis) { b.hidden = !vis; if (!vis && panelTab === t.id) closePanel(); } }
        });
        // title, saved chip, status pill, views and zoom
        const dn = nodes.docname;
        if (dn && document.activeElement !== dn) { const t = OS.title() || 'Untitled'; if (dn.value !== t) dn.value = t; dn.size = Math.max(6, Math.min(34, t.length + 1)); }
        let parts = [];
        try { parts = cfg.status ? (cfg.status() || []) : []; } catch (e) {}
        const html = parts.map(function (p, i) { return '<span class="nv-st' + (i === 0 ? ' first' : '') + '">' + p + '</span>'; }).join('');
        if (nodes.statusL._h !== html) { nodes.statusL._h = html; nodes.statusL.innerHTML = html; }
        (cfg.views || []).forEach(function (v, i) { const b = nodes.views && nodes.views[i]; if (b && v.active) b.classList.toggle('on', !!v.active()); });
        if (cfg.zoom && nodes.zoomLab) nodes.zoomLab.textContent = Math.round(cfg.zoom.get() * 100) + '%';
        const pb = nodes.paneBtn; if (pb && pb._it && pb._it.checked) pb.classList.toggle('on', !!pb._it.checked());
        const nb = nodes.navBtn; if (nb && cfg.views && cfg.views[0] && cfg.views[0].active) nb.classList.toggle('on', !!cfg.views[0].active());
    }

    /* ---------- the tool panel (opens from the dock) ---------- */
    function closePanel(force) {
        if (!nodes.panel) return;
        if (pinned && !force) return;
        closePop();
        panelControls = [];
        nodes.panel.hidden = true;
        document.body.classList.remove('nv-panel-open');
        if (panelTab && nodes.dockBtns[panelTab]) nodes.dockBtns[panelTab].classList.remove('on');
        panelTab = null;
    }
    function openPanel(tabId) {
        const tab = cfg.tabs.find(function (t) { return t.id === tabId; });
        if (!tab) return;
        if (panelTab === tabId) { closePanel(true); return; }
        closePop();
        if (panelTab && nodes.dockBtns[panelTab]) nodes.dockBtns[panelTab].classList.remove('on');
        panelTab = tabId;
        const sec = meta(tab);
        const p = nodes.panel;
        p.dataset.nvc = sec.c;
        p.style.setProperty('--nv-c', sec.c);
        p.hidden = false;
        document.body.classList.add('nv-panel-open');
        if (nodes.dockBtns[tabId]) nodes.dockBtns[tabId].classList.add('on');
        panelControls = [];
        const body = p.querySelector('.nv-panel-body');
        body.innerHTML = '';
        p.querySelector('.nv-panel-title').innerHTML = ic(sec.icon) + '<span>' + esc(sec.name) + '</span><small>' + esc(tab.label) + '</small>';
        const into = { list: panelControls, autoClose: true };
        tab.groups.forEach(function (g) {
            const card = el('section', 'nv-card');
            card.appendChild(el('h3', null, esc(g.label || '')));
            const grid = el('div', 'nv-grid');
            g.items.forEach(function (it) { const n = buildItem(it, into); if (n) grid.appendChild(n); });
            card.appendChild(grid);
            body.appendChild(card);
        });
        body.scrollTop = 0;
        p.classList.remove('nv-in'); void p.offsetWidth; p.classList.add('nv-in');
        queueSync();
    }
    function setPinned(v) {
        pinned = !!v;
        try { localStorage.setItem('writeout_nova_pin', pinned ? '1' : '0'); } catch (e) {}
        document.body.classList.toggle('nv-pinned', pinned);
        if (nodes.pinBtn) nodes.pinBtn.classList.toggle('on', pinned);
    }

    /* ---------- the command palette ---------- */
    function commandIndex() {
        const out = [];
        cfg.tabs.forEach(function (t) {
            const sec = meta(t);
            flat(t.groups.reduce(function (a, g) { return a.concat(g.items); }, [])).forEach(function (it) {
                if (it.run && (it.label || it.title)) out.push({ label: it.title || itemLabel(it), icon: it.icon || 'sparkle', where: sec.name, it: it, c: sec.c });
                else if (it.menu && (it.label || it.title) && typeof it.menu === 'function') out.push({ label: it.title || itemLabel(it), icon: it.icon || 'sparkle', where: sec.name, open: it, c: sec.c });
                if (it.gallery && !it.noIndex) (typeof it.items === 'function' ? it.items() : it.items).forEach(function (gi) { if (gi.run) out.push({ label: gi.title || gi.label, icon: it.icon || 'sparkle', where: sec.name, it: gi, c: sec.c }); });
            });
        });
        [['office', 'Switch to the ' + (cfg.officeName || 'Office') + ' layout'], ['pool', 'Switch to the Poolside layout'], ['classic', 'Switch to Writeout Classic']].forEach(function (l) {
            out.push({ label: l[1], icon: 'layout', where: 'Layout', it: { run: function () { OS.setLayout(l[0]); } }, c: 'var(--nv-primary)' });
        });
        return out;
    }
    function closePalette() { if (!palEl) return; palEl.remove(); palEl = null; OS.restoreSelection(); }
    function openPalette() {
        if (palEl) { palEl.querySelector('input').focus(); return; }
        closePop(); if (!pinned) closePanel(true);
        const index = commandIndex();
        const back = el('div', 'nv nv-pal-back');
        const box = el('div', 'nv-pal');
        box.innerHTML = '<div class="nv-pal-in">' + ic('search') + '<input type="text" placeholder="Jump to anything: a tool, a page, a setting..." spellcheck="false" autocomplete="off" aria-label="Search"><kbd>esc</kbd></div><div class="nv-pal-res" role="listbox"></div>';
        back.appendChild(box);
        document.body.appendChild(back);
        palEl = back;
        const inp = box.querySelector('input'), res = box.querySelector('.nv-pal-res');
        let hits = [], idx = 0;
        const draw = function () {
            res.innerHTML = '';
            if (!hits.length) { res.appendChild(el('div', 'nv-pal-empty', 'Nothing matches that. Try another word!')); return; }
            hits.forEach(function (h, i) {
                const b = el('button', 'nv-pal-item' + (i === idx ? ' kb' : ''), '<span class="nv-pal-ic" style="--nv-c:' + (h.c || 'var(--nv-primary)') + '">' + ic(h.icon || 'sparkle') + '</span><span class="nv-pal-l">' + esc(h.label) + '</span><em>' + esc(h.where || '') + '</em>');
                b.type = 'button'; b.dataset.i = i;
                res.appendChild(b);
            });
        };
        const search = function () {
            const q = inp.value.trim().toLowerCase();
            let list = index;
            if (q) {
                const terms = q.split(/\s+/);
                list = index.map(function (c) {
                    const l = c.label.toLowerCase();
                    if (!terms.every(function (t) { return l.indexOf(t) !== -1 || (c.where || '').toLowerCase().indexOf(t) !== -1; })) return null;
                    return { c: c, s: (l.indexOf(q) === 0 ? 0 : l.indexOf(q) !== -1 ? 1 : 2) };
                }).filter(Boolean).sort(function (a, b) { return a.s - b.s; }).map(function (x) { return x.c; });
                try { if (cfg.searchExtra) list = (cfg.searchExtra(q) || []).concat(list); } catch (e) {}
            }
            hits = list.slice(0, 40); idx = 0; draw();
        };
        const go = function (i) {
            const h = hits[i]; if (!h) return;
            closePalette();
            if (h.open) { const sec = cfg.tabs.find(function (t) { return meta(t).name === h.where; }); if (sec) openPanel(sec.id); return; }
            if (h.it) setTimeout(function () { run(h.it); }, 30);
        };
        inp.addEventListener('input', search);
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
            else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!hits.length) return; idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; draw(); const k = res.querySelector('.kb'); if (k) k.scrollIntoView({ block: 'nearest' }); }
            else if (e.key === 'Enter') { e.preventDefault(); go(idx); }
        });
        res.addEventListener('mousedown', function (e) { e.preventDefault(); });
        res.addEventListener('click', function (e) { const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); });
        back.addEventListener('mousedown', function (e) { if (e.target === back) closePalette(); });
        search();
        inp.focus();
    }

    /* ---------- the format capsule: the tools you reach for while writing ---------- */
    function buildCapsule() {
        const items = flat(((cfg.tabs.find(function (t) { return t.id === 'home'; }) || { groups: [] }).groups).reduce(function (a, g) { return a.concat(g.items); }, []));
        const by = function (fn) { return items.find(fn); };
        const picks = [
            by(function (i) { return i.select && i.fontPreview; }),
            by(function (i) { return i.number && /Font Size/.test(i.title || ''); }),
            null,
            by(function (i) { return i.glyph === 'B' && /^Bold/.test(i.title || ''); }),
            by(function (i) { return i.glyph === 'I' && /^Italic/.test(i.title || ''); }),
            by(function (i) { return i.glyph === 'U' && /^Underline/.test(i.title || ''); }),
            by(function (i) { return /^Strikethrough/.test(i.title || ''); }),
            by(function (i) { return i.icon === 'fontColor'; }),
            by(function (i) { return /Highlight/.test(i.title || '') && !!i.run; }),
            null,
            by(function (i) { return i.icon === 'aLeft'; }), by(function (i) { return i.icon === 'aCenter'; }), by(function (i) { return i.icon === 'aRight'; }), by(function (i) { return i.icon === 'aJustify'; }),
            null,
            by(function (i) { return i.icon === 'bullets'; }), by(function (i) { return i.icon === 'numbers'; }), by(function (i) { return i.icon === 'outdent'; }), by(function (i) { return i.icon === 'indent'; })
        ];
        const cap = nodes.capsule;
        cap.innerHTML = '';
        const inner = el('div', 'nv-capsule-in');
        const into = { list: controls };
        picks.forEach(function (it) {
            if (it === null) { inner.appendChild(el('i', 'nv-csep')); return; }
            if (!it) return;
            const copy = Object.assign({}, it, { big: false, sm: false });
            const n = buildItem(copy, into);
            if (n) inner.appendChild(n);
        });
        const more = el('button', 'nv-t nv-ic nv-more', ic('sparkle'));
        more.type = 'button'; more.title = 'All the writing tools';
        more.addEventListener('click', function () { openPanel('home'); });
        inner.appendChild(el('i', 'nv-csep')); inner.appendChild(more);
        cap.appendChild(inner);
    }

    /* ---------- building and removing Nova ---------- */
    function dockButton(cls, iconName, label, title) {
        const b = el('button', 'nv-d ' + cls, ic(iconName) + '<span>' + esc(label) + '</span>');
        b.type = 'button'; b.title = title || label;
        return b;
    }
    function build() {
        nodes.dockBtns = {};
        // dock
        const dock = el('nav', 'nv nv-dock'); dock.id = 'nv-dock'; dock.setAttribute('aria-label', 'Tools');
        const logo = el('button', 'nv-logo', '<img src="' + esc(cfg.icon) + '" alt="">'); logo.type = 'button'; logo.title = 'Jump to anything (' + (/Mac/.test(navigator.platform) ? '⌘' : 'Ctrl+') + 'K)';
        logo.addEventListener('click', openPalette);
        dock.appendChild(logo);
        const main = el('div', 'nv-dock-main');
        cfg.tabs.forEach(function (t) {
            const sec = meta(t);
            const b = dockButton('', sec.icon, sec.name, sec.name + ': ' + t.label + ' tools');
            b.dataset.nvc = sec.c; b.style.setProperty('--nv-c', sec.c);
            if (t.contextual) b.hidden = !(t.visible ? t.visible() : true);
            b.addEventListener('click', function () { openPanel(t.id); });
            nodes.dockBtns[t.id] = b;
            main.appendChild(b);
        });
        dock.appendChild(main);
        const end = el('div', 'nv-dock-end');
        const file = dockButton('', 'doc', 'File', 'File: new, open, save, print and export'); file.style.setProperty('--nv-c', 'var(--nv-primary)'); file.addEventListener('click', function () { OS.openBackstage(); });
        const lay = dockButton('', 'layout', 'Layout', 'Switch layout'); lay.style.setProperty('--nv-c', 'var(--nv-primary)');
        lay.addEventListener('click', function (e) {
            const cur = OS.layout();
            openPop(lay, [
                { header: 'Layout' },
                { label: cfg.officeName || 'Office', icon: 'layout', checked: cur === 'office', run: function () { OS.setLayout('office'); } },
                { label: 'Poolside', icon: 'layout', checked: cur === 'pool', run: function () { OS.setLayout('pool'); } },
                { label: 'Nova', icon: 'sparkle', checked: cur === 'nova', run: function () { OS.setLayout('nova'); } },
                { label: cfg.app + ' Classic', icon: 'pen', checked: cur === 'classic', run: function () { OS.setLayout('classic'); } }
            ], { side: 'right' });
            e.stopPropagation();
        });
        const theme = dockButton('', document.body.classList.contains('nv-dark') ? 'sun' : 'moon', 'Theme', 'Light or dark Nova'); theme.style.setProperty('--nv-c', 'var(--nv-primary)');
        theme.addEventListener('click', function () { setDark(!document.body.classList.contains('nv-dark')); theme.querySelector('svg').outerHTML = ic(document.body.classList.contains('nv-dark') ? 'sun' : 'moon'); });
        const set = dockButton('', 'gear', 'More', 'Settings'); set.style.setProperty('--nv-c', '#64748b'); set.addEventListener('click', function () { OS.openBackstage('settings'); });
        [file, lay, theme, set].forEach(function (b) { end.appendChild(b); });
        dock.appendChild(end);
        nodes.dock = dock;
        // top bar
        const bar = el('header', 'nv nv-bar'); bar.id = 'nv-bar';
        const dn = el('input', 'nv-docname'); dn.spellcheck = false; dn.setAttribute('aria-label', 'Name'); nodes.docname = dn;
        dn.addEventListener('change', function () { if (cfg.rename) { try { cfg.rename(dn.value.trim() || 'Untitled'); } catch (e) { console.error(e); } } queueSync(); });
        dn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Escape') dn.value = OS.title(); dn.blur(); OS.restoreSelection(); } });
        if (!cfg.rename) dn.readOnly = true;
        const saved = el('span', 'nv-saved', ic('cloud') + '<span>Saved</span>'); nodes.saved = saved;
        const left = el('div', 'nv-bar-l'); left.appendChild(dn); left.appendChild(saved);
        const search = el('button', 'nv-search', ic('search') + '<span>Jump to anything</span><kbd>' + (/Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd>'); search.type = 'button';
        search.addEventListener('click', openPalette);
        const right = el('div', 'nv-bar-r');
        const mkBar = function (iconName, title, fn, label) { const b = el('button', 'nv-t nv-barbtn' + (label ? ' nv-withlab' : ''), ic(iconName) + (label ? '<span>' + esc(label) + '</span>' : '')); b.type = 'button'; b.title = title; b.addEventListener('click', fn); return b; };
        (cfg.qat || []).forEach(function (q) { const b = mkBar(q.icon, q.title || q.label, function (e) { run(q, e); }); b.dataset.nvc = 'var(--nv-primary)'; controls.push({ it: q, el: b }); right.appendChild(b); });
        const share = mkBar('share', 'Share and chat live', function () { if (window.RadiiCollab && window.RadiiCollab.open) window.RadiiCollab.open('people'); else OS.toast('Sharing is not ready yet!'); }, 'Share'); share.classList.add('nv-primary');
        right.appendChild(share);
        const paneItem = allItems().find(function (i) { return /Format Pane/i.test(i.title || itemLabel(i) || '') && !!i.run; });
        if (paneItem) { const pb = mkBar('brush', 'Format pane', function (e) { run(paneItem, e); }); pb._it = paneItem; nodes.paneBtn = pb; right.appendChild(pb); }
        if (cfg.views && cfg.views[0]) { const nb = mkBar('panelRight', 'Pages and outline', function (e) { run(cfg.views[0], e); }); nodes.navBtn = nb; right.appendChild(nb); }
        bar.appendChild(left); bar.appendChild(search); bar.appendChild(right);
        nodes.bar = bar;
        // capsule
        const cap = el('div', 'nv nv-capsule'); cap.id = 'nv-capsule'; nodes.capsule = cap;
        // panel
        const panel = el('aside', 'nv nv-panel'); panel.id = 'nv-panel'; panel.hidden = true;
        panel.innerHTML = '<header class="nv-panel-h"><div class="nv-panel-title"></div><button type="button" class="nv-t nv-ic nv-pin" title="Keep this panel open">' + ic('pin') + '</button><button type="button" class="nv-t nv-ic nv-x" title="Close">' + ic('close') + '</button></header><div class="nv-panel-body"></div>';
        nodes.panel = panel; nodes.pinBtn = panel.querySelector('.nv-pin');
        nodes.pinBtn.addEventListener('click', function () { setPinned(!pinned); });
        panel.querySelector('.nv-x').addEventListener('click', function () { closePanel(true); });
        // status pill
        const st = el('footer', 'nv nv-status'); st.id = 'nv-status';
        st.innerHTML = '<div class="nv-pill"><div class="nv-status-l"></div><i class="nv-csep"></i><div class="nv-views"></div><i class="nv-csep"></i><div class="nv-zoom"></div></div>';
        nodes.status = st; nodes.statusL = st.querySelector('.nv-status-l');
        nodes.views = [];
        const vbox = st.querySelector('.nv-views');
        const viewIcons = { navPane: 'panelRight', focus: 'focus', pages: 'pages', web: 'web' };
        (cfg.views || []).forEach(function (v) {
            const b = el('button', 'nv-t nv-ic nv-vb', ic(viewIcons[v.icon] || v.icon)); b.type = 'button'; b.title = v.title;
            b.addEventListener('click', function (e) { run(v, e); }); vbox.appendChild(b); nodes.views.push(b);
        });
        if (cfg.zoom) {
            const z = cfg.zoom, zb = st.querySelector('.nv-zoom');
            const mk = function (t, d, title) { const b = el('button', 'nv-t nv-ic nv-zb', ic(d)); b.type = 'button'; b.title = title; b.addEventListener('click', function () { const cur = Math.round(z.get() * 100); z.set(t === '-' ? Math.max(z.min || 50, cur - 10) / 100 : t === '+' ? Math.min(z.max || 200, cur + 10) / 100 : 1); queueSync(); }); return b; };
            const lab = el('button', 'nv-zlab', '100%'); lab.type = 'button'; lab.title = 'Back to 100%'; lab.addEventListener('click', function () { z.set(1); queueSync(); });
            nodes.zoomLab = lab;
            zb.appendChild(mk('-', 'minus', 'Zoom out')); zb.appendChild(lab); zb.appendChild(mk('+', 'plus', 'Zoom in'));
        }
        [dock, bar, cap, panel, st].forEach(function (n) { document.body.appendChild(n); });
        buildCapsule();
        // clicks on Nova buttons never steal the page's text selection
        [dock, bar, cap, panel, st].forEach(function (root) {
            root.addEventListener('mousedown', function (e) { if (e.target.closest('input, select, textarea, label.nv-check')) return; if (e.target.closest('button')) e.preventDefault(); });
        });
        setPinned(pinned);
    }
    function setDark(v) {
        document.body.classList.toggle('nv-dark', !!v);
        try { localStorage.setItem('writeout_nova_dark', v ? '1' : '0'); } catch (e) {}
    }
    // View / Visual / Source: icons instead of emoji, while Nova is on
    const MODE_ICON = { view: ['eye', 'View'], visual: ['pen', 'Visual'], source: ['code', 'Source'] };
    function paintModes(restore) {
        document.querySelectorAll('.kd-modes [data-m]').forEach(function (b) {
            if (restore) { if (b.dataset.orig) { b.innerHTML = b.dataset.orig; delete b.dataset.orig; } return; }
            const m = MODE_ICON[b.dataset.m]; if (!m || b.dataset.orig) return;
            b.dataset.orig = b.innerHTML;
            b.innerHTML = ic(m[0], 'nv-mic') + '<span>' + m[1] + '</span>';
        });
    }
    function enter() {
        if (on) return;
        cfg = OS.config();
        if (!cfg) return;
        on = true;
        const th = cfg.theme || {};
        document.body.style.setProperty('--nv-primary', th.accent || '#0284c7');
        document.body.style.setProperty('--nv-primary-d', th['accent-d'] || '#0369a1');
        document.body.style.setProperty('--nv-primary-l', th['accent-l'] || '#e0f2fe');
        controls = []; panelControls = []; panelTab = null;
        paintModes(); setTimeout(paintModes, 500); setTimeout(paintModes, 1500);
        let dark = null; try { dark = localStorage.getItem('writeout_nova_dark'); } catch (e) {}
        document.body.classList.toggle('nv-dark', dark === '1' || (dark === null && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches));
        document.body.classList.add('nv-on');
        build();
        sync();
        timer = setInterval(function () { if (!document.hidden) sync(); }, 1200);
    }
    function leave() {
        if (!on) return;
        on = false;
        clearInterval(timer);
        closePop(); closePalette(); paintModes(true);
        document.querySelectorAll('.nv').forEach(function (n) { n.remove(); });
        document.body.classList.remove('nv-on', 'nv-panel-open', 'nv-pinned', 'nv-dark');
        controls = []; panelControls = []; panelTab = null;
        Object.keys(nodes).forEach(function (k) { delete nodes[k]; });
    }

    window.addEventListener('os-layout', function (e) { if (e.detail === 'nova') enter(); else leave(); });
    document.addEventListener('mousedown', function (e) {
        if (popEl && !popEl.contains(e.target) && !(popAnchor && popAnchor.contains(e.target))) closePop();
        if (on && panelTab && !pinned && nodes.panel && !nodes.panel.contains(e.target) && !(nodes.dock && nodes.dock.contains(e.target)) && !(popEl && popEl.contains(e.target)) && !e.target.closest('.os-dlg-back, .nv-pal-back')) closePanel(true);
    }, true);
    document.addEventListener('keydown', function (e) {
        if (!on) return;
        if (e.key === 'Escape') { if (palEl) return; if (popEl) { closePop(); e.stopPropagation(); return; } if (panelTab && !document.querySelector('.os-dlg-back')) { closePanel(true); OS.restoreSelection(); } }
    }, true);
    document.addEventListener('selectionchange', queueSync);
    document.addEventListener('input', function (e) { if (on && !e.target.closest('.nv')) queueSync(); }, true);
    // the "Saved" chip follows the shell's own flash
    const origFlash = OS.flashSaved;
    OS.flashSaved = function (t) { try { origFlash.apply(this, arguments); } catch (e) {} if (on && nodes.saved) { nodes.saved.querySelector('span').textContent = t || 'Saved'; nodes.saved.classList.remove('blip'); void nodes.saved.offsetWidth; nodes.saved.classList.add('blip'); } };
    const origSync = OS.sync;
    OS.sync = function () { try { origSync.apply(this, arguments); } catch (e) {} queueSync(); };
    window.addEventListener('resize', function () { closePop(); });
    window.WriteoutNova = { openPalette: openPalette, enter: enter, leave: leave, open: openPanel, isOn: function () { return on; } };
    // if Nova was already the saved layout when this file loaded
    if (document.readyState !== 'loading') setTimeout(function () { if (OS.isNova && OS.isNova()) enter(); }, 0);
    else document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { if (OS.isNova && OS.isNova()) enter(); }, 0); });
})();
