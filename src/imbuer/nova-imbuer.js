"use strict";
/* ========================================================
   IMBUER NOVA
   A flat, soft layout for Imbuer: a left dock of the ribbon's tabs, a top bar, a floating format capsule,
   a flyout panel with each tab's groups as tiles, and a status pill.
   It keeps Imbuer's own grid, formula bar and sheet tabs, and drives the very same commands:
   every tile carries the ribbon's own data-cmd / data-menu, so Imbuer's click handler runs it.
   Icons: Vadivam first, then Gravity UI, then Lucide (nova-icons.js), then Imbuer's own icons.
   Stored under localStorage key imbuer_layout = 'nova'.
   ======================================================== */
(function () {
    'use strict';
    if (typeof runCmd !== 'function' || !document.getElementById('ribbon')) return;

    const KEY = 'imbuer_layout';
    const PIN_KEY = 'imbuer_nova_pin';
    const NI = window.NovaIcons || {};
    let on = false, built = false, pinned = false, openTab = null;
    const moved = [];            // [node, parent, nextSibling] pairs, put back when Nova leaves
    const capSync = [], panelSync = [];   // functions that copy ribbon state into the capsule's and the panel's controls
    let cur = capSync;

    function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

    /* ---------- icons ---------- */
    function ic(name, cls) {
        const d = NI[name];
        if (d) {
            if (d[0] === 'g') return '<svg class="nvi-ic nvi-g' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + d[1] + '</svg>';
            return '<svg class="nvi-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d[1] + '</svg>';
        }
        try { if (typeof ico === 'function') return ico(name, 'nvi-ic' + (cls ? ' ' + cls : '')); } catch (e) {}
        return '';
    }
    // B / I / U / ab and friends are icons too
    const GLYPH = { B: 'bold', I: 'italic', U: 'underline', ab: 'strike', A: 'fontColor', $: 'currency', '%': 'percent', 'Σ': 'sigma' };

    /* ---------- reading the ribbon ---------- */
    function labelOf(btn) {
        const s = btn.querySelector(':scope > span');
        return s ? s.innerHTML.replace(/\s*[▾]\s*$/, '') : '';
    }
    function iconOf(btn) {
        const i = btn.querySelector('svg[data-n]');          // Imbuer's own icon keeps its name in data-n
        if (i) return ic(i.getAttribute('data-n'));
        const g = btn.querySelector('.glyph');
        if (g) {
            const t = g.textContent.trim();
            if (GLYPH[t]) return ic(GLYPH[t]);
            return '<b class="nvi-glyph">' + esc(t) + '</b>';
        }
        return '';
    }
    function tile(btn, size) {
        const b = el('button', 'nvi-t nvi-' + size);
        b.type = 'button';
        ['data-cmd', 'data-menu', 'title'].forEach(function (a) { if (btn.hasAttribute(a)) b.setAttribute(a, btn.getAttribute(a)); });
        const lab = size === 'ic' ? '' : labelOf(btn);
        let car = '';
        if (btn.hasAttribute('data-menu') && !btn.hasAttribute('data-cmd') && size !== 'ic') car = '<i class="nvi-car">' + ic('chevDown') + '</i>';
        b.innerHTML = iconOf(btn) + (lab ? '<span class="nvi-lab">' + lab + '</span>' : '') + car + (btn.querySelector('.cbar') ? '<i class="cbar nvi-cbar"></i>' : '');
        if (btn.classList.contains('kd-btn')) b.classList.add('nvi-kd');
        const bar = btn.querySelector('.cbar');
        if (bar) cur.push(function () { const x = b.querySelector('.cbar'); if (x && bar.style.background !== undefined) x.style.background = bar.style.background || bar.style.backgroundColor; });
        return b;
    }
    function sizeOf(btn) { return btn.classList.contains('big') ? 'big' : btn.classList.contains('sm') ? 'sm' : 'ic'; }
    function arrow(btn) {
        const b = el('button', 'nvi-t nvi-arrow', ic('chevDown'));
        b.type = 'button';
        b.setAttribute('data-menu', btn.getAttribute('data-menu'));
        b.title = (btn.title || 'More') + ' options';
        return b;
    }
    // a text field (font, size, number format) that stays in step with the ribbon's own
    function combo(c) {
        const orig = c.querySelector('input');
        const wrap = el('span', 'nvi-combo' + (c.classList.contains('wide') ? ' nvi-wide' : c.classList.contains('narrow') ? ' nvi-narrow' : ''));
        wrap.title = c.title || '';
        const inp = el('input', 'nvi-in');
        inp.spellcheck = false; inp.autocomplete = 'off';
        if (orig.readOnly) inp.readOnly = true;
        const ar = c.querySelector('[data-menu]');
        wrap.appendChild(inp);
        if (ar) { const a = el('button', 'nvi-t nvi-arrow', ic('chevDown')); a.type = 'button'; a.setAttribute('data-menu', ar.getAttribute('data-menu')); wrap.appendChild(a); }
        const id = orig.id;
        inp.addEventListener('focus', function () { try { if (isEditing()) commitEdit(0, 0); } catch (e) {} inp.select(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && id === 'font-name') {
                e.preventDefault();
                const v = inp.value.trim();
                const hit = FONT_LIST.find(function (f) { return f[0].toLowerCase() === v.toLowerCase(); });
                setFont(hit ? hit[1] : (v ? "'" + v.replace(/'/g, '') + "', sans-serif" : ''));
                focusGrid();
            } else if (e.key === 'Enter' && id === 'font-size') { e.preventDefault(); setFontSize(inp.value); focusGrid(); }
            else if (e.key === 'Escape') { sync(true); focusGrid(); }
        });
        cur.push(function () { if (document.activeElement !== inp) { inp.value = orig.value; inp.style.fontFamily = orig.style.fontFamily; } });
        return wrap;
    }
    function check(lab) {
        const cb = lab.querySelector('input[data-pref]');
        const key = cb.getAttribute('data-pref');
        const l = el('label', 'nvi-check');
        const box = el('input'); box.type = 'checkbox';
        box.addEventListener('change', function () { togglePref(key); sync(true); });
        l.appendChild(box);
        l.appendChild(el('span', 'nvi-sw'));
        const t = lab.querySelector('span, em'); l.appendChild(el('span', 'nvi-cl', t ? t.innerHTML : lab.textContent.trim()));
        l.title = lab.title || '';
        cur.push(function () { box.checked = !!prefs[key]; });
        return l;
    }
    // walk one ribbon container and rebuild it as tiles, keeping its rows and stacks
    function convert(src, into) { convertNodes(src.children, into); }
    function convertNodes(list, into) {
        Array.prototype.forEach.call(list, function (n) {
            if (n.classList.contains('rsep')) { into.appendChild(el('i', 'nvi-sep')); return; }
            if (n.matches('button.split-arrow')) return;                       // taken with its split
            if (n.classList.contains('split')) {
                const main = n.querySelector('button.rb'), ar = n.querySelector('.split-arrow');
                const sz = sizeOf(main);
                const w = el('span', 'nvi-split nvi-sp-' + sz);
                w.appendChild(tile(main, sz));
                if (ar) w.appendChild(arrow(ar));
                into.appendChild(w); return;
            }
            if (n.matches('button.rb')) { into.appendChild(tile(n, sizeOf(n))); return; }
            if (n.classList.contains('combo')) { into.appendChild(combo(n)); return; }
            if (n.classList.contains('rcheck')) { into.appendChild(check(n)); return; }
            if (n.classList.contains('row') || n.classList.contains('stack') || n.classList.contains('rg-body')) {
                const d = el('div', 'nvi-' + (n.classList.contains('row') ? 'row' : n.classList.contains('stack') ? 'stack' : (n.classList.contains('col') ? 'cols' : 'body')));
                convert(n, d); into.appendChild(d); return;
            }
            if (n.tagName === 'BUTTON' || n.tagName === 'LABEL' || n.tagName === 'INPUT') { into.appendChild(n.cloneNode(true)); return; }
            const d = el('div', 'nvi-body'); convert(n, d); into.appendChild(d);
        });
    }

    /* ---------- the tabs: name, icon ---------- */
    const TABS = [
        { id: 'home', name: 'Home', icon: 'home' },
        { id: 'insert', name: 'Insert', icon: 'plus' },
        { id: 'formulas', name: 'Formulae', icon: 'calc' },
        { id: 'data', name: 'Data', icon: 'sortFilter' },
        { id: 'view', name: 'View', icon: 'eye' },
        { id: 'help', name: 'Help', icon: 'help' }
    ];
    function tabLabel(id) { const t = document.querySelector('#ribbon-tabs [data-tab="' + id + '"]'); return t ? t.textContent.trim() : id; }

    /* ---------- building ---------- */
    let dock, bar, cap, panel, panelBody, panelTitle, pinBtn;
    function dockBtn(icon, label, title) {
        const b = el('button', 'nvi-d', ic(icon) + '<span>' + esc(label) + '</span>');
        b.type = 'button'; b.title = title || label;
        return b;
    }
    function build() {
        if (built) return; built = true;
        document.body.appendChild(dock = el('nav', 'nvi nvi-dock'));
        dock.id = 'nvi-dock'; dock.setAttribute('aria-label', 'Imbuer tabs');
        const logo = el('button', 'nvi-logo', '<img src="favicon-96.png" alt="">'); logo.type = 'button'; logo.title = 'Imbuer home';
        logo.addEventListener('click', function () { try { openBackstage('home'); } catch (e) {} });
        dock.appendChild(logo);
        const main = el('div', 'nvi-dock-main'); dock.appendChild(main);
        TABS.forEach(function (t) {
            const b = dockBtn(t.icon, tabLabel(t.id), tabLabel(t.id)); b.dataset.nvt = t.id;
            b.addEventListener('click', function () { toggleTab(t.id); });
            main.appendChild(b);
        });
        const end = el('div', 'nvi-dock-end'); dock.appendChild(end);
        const file = dockBtn('file', 'File', 'File: new, open, save and export'); file.classList.add('nvi-file');
        file.addEventListener('click', function () { closePanel(); try { openBackstage('home'); } catch (e) {} });
        const lay = dockBtn('layout', 'Layout', 'Switch layout'); lay.setAttribute('data-menu', 'layout'); lay.classList.add('nvi-slate');
        const theme = dockBtn('moon', 'Theme', 'Light or dark'); theme.addEventListener('click', function () { togglePref('dark'); paintTheme(); });
        theme.classList.add('nvi-theme');
        const more = dockBtn('gear', 'More', 'Settings'); more.setAttribute('data-cmd', 'settings'); more.classList.add('nvi-slate');
        [file, lay, theme, more].forEach(function (b) { end.appendChild(b); });

        // the top bar: Imbuer's own name box, saved chip, search and share buttons move in while Nova is on
        document.body.appendChild(bar = el('header', 'nvi nvi-bar'));
        bar.id = 'nvi-bar';
        bar.innerHTML = '<div class="nvi-bar-l"></div><div class="nvi-bar-m"></div><div class="nvi-bar-r"></div>';

        // the flyout panel
        document.body.appendChild(panel = el('aside', 'nvi nvi-panel'));
        panel.id = 'nvi-panel'; panel.hidden = true;
        panel.innerHTML = '<div class="nvi-panel-h"><b class="nvi-panel-t"></b><span class="nvi-grow"></span><button type="button" class="nvi-t nvi-ic nvi-pin" title="Keep this panel open"></button><button type="button" class="nvi-t nvi-ic nvi-x" title="Close (Esc)"></button></div><div class="nvi-panel-b"></div>';
        panelTitle = panel.querySelector('.nvi-panel-t'); panelBody = panel.querySelector('.nvi-panel-b'); pinBtn = panel.querySelector('.nvi-pin');
        pinBtn.innerHTML = ic('pin'); panel.querySelector('.nvi-x').innerHTML = ic('close');
        pinBtn.addEventListener('click', function () { setPinned(!pinned); });
        panel.querySelector('.nvi-x').addEventListener('click', function () { setPinned(false); closePanel(); });
        // running a command from the panel closes it, unless it is pinned (or Shift is held)
        panel.addEventListener('click', function (e) {
            const t = e.target.closest('[data-cmd]');
            if (t && !pinned && !e.shiftKey) setTimeout(closePanel, 0);
        });
        panel.addEventListener('mousedown', function (e) { if (!e.target.closest('input, select, textarea')) e.preventDefault(); });

        buildCapsule();
        document.addEventListener('mousedown', function (e) {
            if (!on || pinned || !openTab) return;
            if (e.target.closest('#nvi-panel, #nvi-dock, .menu, .dlg, #backstage')) return;
            closePanel();
        }, true);
        document.addEventListener('keydown', function (e) { if (on && e.key === 'Escape' && openTab && !document.querySelector('.menu.pop')) closePanel(); });
    }

    /* the floating format capsule */
    function buildCapsule() {
        cur = capSync;
        cap = el('div', 'nvi nvi-capsule'); cap.id = 'nvi-capsule';
        const inn = el('div', 'nvi-capsule-in'); cap.appendChild(inn);
        document.body.appendChild(cap);
        const src = document.querySelector('#ribbon [data-panel="home"]');
        const find = function (sel) { return src && src.querySelector(sel); };
        const add = function (n) { inn.appendChild(n); };
        const sep = function () { add(el('i', 'nvi-sep')); };
        const cmdBtn = function (cmd) { const b = find('[data-cmd="' + cmd + '"]'); return b ? tile(b, 'ic') : null; };
        const splitBtn = function (cmd) {
            const b = find('[data-cmd="' + cmd + '"]'); if (!b) return null;
            const sp = b.closest('.split'), ar = sp && sp.querySelector('.split-arrow');
            const w = el('span', 'nvi-split nvi-sp-ic'); w.appendChild(tile(b, 'ic')); if (ar) w.appendChild(arrow(ar)); return w;
        };
        const put2 = function (n) { if (n) add(n); };
        const fc = find('#font-combo'), sc = find('#size-combo');
        if (fc) add(combo(fc));
        if (sc) add(combo(sc));
        put2(cmdBtn('shrinkFont')); put2(cmdBtn('growFont'));
        sep();
        ['bold', 'italic', 'underline', 'strike'].forEach(function (c) { put2(cmdBtn(c)); });
        sep();
        put2(splitBtn('borderBottom')); put2(splitBtn('fillColor')); put2(splitBtn('fontColor'));
        sep();
        ['alignLeft', 'alignCenter', 'alignRight', 'wrap'].forEach(function (c) { put2(cmdBtn(c)); });
        sep();
        ['fmtCurrency', 'fmtPercent', 'fmtComma', 'decLess', 'decMore'].forEach(function (c) { put2(cmdBtn(c)); });
        sep();
        put2(cmdBtn('keydownCells'));
        // the wrap button shows an icon only in the capsule
        inn.querySelectorAll('.nvi-sm').forEach(function (b) { b.classList.remove('nvi-sm'); b.classList.add('nvi-ic'); const l = b.querySelector('.nvi-lab'); if (l) l.remove(); });
    }

    /* the flyout */
    function toggleTab(id) { if (openTab === id) { closePanel(); } else openPanel(id); }
    function openPanel(id) {
        openTab = id;
        // rebuild from the ribbon each time (pro.js and features.js add groups later); the ribbon itself is only read
        panelBody.innerHTML = '';
        panelSync.length = 0; cur = panelSync;
        const src = document.querySelector('#ribbon .rpanel[data-panel="' + id + '"]');
        if (src) {
            Array.prototype.forEach.call(src.querySelectorAll(':scope > .rgroup'), function (g) {
                const card = el('section', 'nvi-card');
                const label = g.querySelector('.rg-label');
                card.appendChild(el('h4', 'nvi-card-h', label ? esc(label.textContent) : ''));
                const body = el('div', 'nvi-card-b');
                Array.prototype.forEach.call(g.children, function (c) {
                    if (c.classList.contains('rg-label')) return;
                    if (c.classList.contains('rg-body')) {
                        const d = el('div', 'nvi-' + (c.classList.contains('col') ? 'cols' : 'body'));
                        convert(c, d); body.appendChild(d);
                    } else convertNodes([c], body);
                });
                card.appendChild(body); panelBody.appendChild(card);
            });
        }
        cur = capSync;
        panelBody.scrollTop = 0;
        panelTitle.textContent = tabLabel(id);
        panel.hidden = false;
        dock.querySelectorAll('.nvi-d[data-nvt]').forEach(function (b) { b.classList.toggle('on', b.dataset.nvt === id); });
        document.body.classList.add('nvi-panel-open');
        sync(true);
        if (pinned) shift();
    }
    function closePanel() {
        if (!panel) return;
        openTab = null; panel.hidden = true;
        dock.querySelectorAll('.nvi-d[data-nvt]').forEach(function (b) { b.classList.remove('on'); });
        document.body.classList.remove('nvi-panel-open');
        shift();
    }
    function setPinned(v) {
        pinned = !!v; put(PIN_KEY, pinned ? '1' : '0');
        pinBtn.classList.toggle('on', pinned);
        document.body.classList.toggle('nvi-pinned', pinned);
        shift();
    }
    // a pinned panel pushes the sheet over instead of covering it
    function shift() { setTimeout(function () { try { afterLayoutShift(0); } catch (e) { window.dispatchEvent(new Event('resize')); } }, 260); }

    /* ---------- keeping the controls in step with the sheet ---------- */
    let timer = 0;
    function sync() {
        if (!on) return;
        capSync.concat(panelSync).forEach(function (f) { try { f(); } catch (e) {} });
        const ss = document.querySelector('#save-state');
        document.body.classList.toggle('nvi-saving', !!ss && /Saving/.test(ss.textContent));
    }
    function paintTheme() {
        const t = dock && dock.querySelector('.nvi-theme');
        if (t) { t.innerHTML = ic(document.body.classList.contains('dark') ? 'sun' : 'moon') + '<span>Theme</span>'; }
    }

    /* ---------- moving Imbuer's own parts into the bar ---------- */
    function moveIn(node, to, before) {
        if (!node || node.dataset.nviMoved) return;
        moved.push([node, node.parentNode, node.nextSibling]);
        node.dataset.nviMoved = '1';
        if (before) to.insertBefore(node, before); else to.appendChild(node);
    }
    function fillBar() {
        const l = bar.querySelector('.nvi-bar-l'), m = bar.querySelector('.nvi-bar-m'), r = bar.querySelector('.nvi-bar-r');
        ['undo', 'redo', 'save'].forEach(function (c) {
            if (l.querySelector('[data-cmd="' + c + '"]')) return;
            const src = document.querySelector('#titlebar [data-cmd="' + c + '"]');
            const b = el('button', 'nvi-t nvi-ic nvi-qat', ic(c)); b.type = 'button'; b.setAttribute('data-cmd', c); b.title = src ? src.title : c;
            l.appendChild(b);
        });
        moveIn(document.querySelector('#titlebar .tb-title'), l);
        moveIn(document.querySelector('#titlebar .cmd-search'), m);
        document.querySelectorAll('#titlebar .tb-right > *').forEach(function (n) {
            if (n.matches('[data-cmd="settings"]') || n.classList.contains('cmd-search')) return;
            moveIn(n, r);
        });
    }
    function putBack() {
        while (moved.length) {
            const m = moved.pop();
            try { if (m[2] && m[2].parentNode === m[1]) m[1].insertBefore(m[0], m[2]); else m[1].appendChild(m[0]); } catch (e) {}
            delete m[0].dataset.nviMoved;
        }
    }

    /* ---------- on / off ---------- */
    let share = null;
    function enter() {
        if (on) return;
        if (window.innerWidth < 720) return;      // phones keep the ribbon
        build();
        on = true;
        document.body.classList.add('nvi-on');
        document.body.classList.remove('layout-classic');
        fillBar();
        // a Share button (or anything else) that Imbuer adds to the title bar later follows into Nova
        const tr = document.querySelector('#titlebar .tb-right');
        if (tr && !share) { share = new MutationObserver(function () { if (on) fillBar(); }); share.observe(tr, { childList: true }); }
        paintTheme();
        setPinned(get(PIN_KEY) === '1');
        sync();
        clearInterval(timer); timer = setInterval(sync, 400);
        try { afterLayoutShift(120); } catch (e) {}
    }
    function leave() {
        if (!on) return;
        on = false;
        clearInterval(timer);
        closePanel();
        putBack();
        document.body.classList.remove('nvi-on', 'nvi-pinned', 'nvi-panel-open');
        try { applyPrefs(); } catch (e) {}
        try { afterLayoutShift(120); } catch (e) {}
    }
    function setNova(v) {
        if (v) { put(KEY, 'nova'); enter(); } else { put(KEY, 'excel'); leave(); }
        syncCards();
    }

    /* ---------- the three-way layout switch ---------- */
    const origSetLayout = window.setLayout;
    window.setLayout = function (l) {
        if (on) {
            setNova(false);
            if (prefs.layout === l) { toast(l === 'classic' ? 'Imbuer Classic layout: glass, gel and orbs!' : 'Excel layout: clean and familiar!'); try { syncLayoutCards(); } catch (e) {} return; }
        } else put(KEY, 'excel');
        origSetLayout(l);
    };
    const origSync = window.syncLayoutCards;
    window.syncLayoutCards = function () { origSync(); syncCards(); };
    function syncCards() {
        document.querySelectorAll('[data-layout]').forEach(function (b) { b.classList.toggle('on', on ? b.dataset.layout === 'nova' : (b.dataset.layout !== 'nova' && b.classList.contains('on'))); });
    }
    registerCommands({ layoutNova: { label: 'Layout: Nova', icon: 'layout', run: function () { if (on) { toast('Already in Nova!'); return; } setNova(true); toast('Nova layout: flat, soft and floating!'); } } });
    // the View tab's Layout menu and the Settings page both list Nova
    const origMenu = MENUS.layout;
    if (origMenu) MENUS.layout = function (a) {
        const items = origMenu(a);
        if (Array.isArray(items)) {
            items.forEach(function (it) { if (it && on) it.checked = false; });
            const nv = { label: 'Nova', icon: 'layout', checked: on, run: function () { if (!on) { setNova(true); toast('Nova layout: flat, soft and floating!'); } } };
            let at = -1; items.forEach(function (it, i) { if (it && /Classic/.test(it.label || '')) at = i; });
            if (at >= 0) items.splice(at + 1, 0, nv); else items.push(nv);
        }
        return items;
    };
    function novaCard() {
        const b = el('button', 'lay-card' + (on ? ' on' : ''));
        b.setAttribute('data-layout', 'nova'); b.type = 'button';
        b.innerHTML = '<div class="lay-thumb lay-nova"><i class="nt-dock"></i><i class="nt-bar"></i><i class="nt-cap"></i><i class="nt-grid"></i></div><b>Nova</b><span>Flat, soft tiles: a dock, a floating format capsule and a flyout of tools!</span>';
        b.addEventListener('click', function (e) { e.stopImmediatePropagation(); if (!on) { setNova(true); toast('Nova layout: flat, soft and floating!'); } });
        return b;
    }
    const bs = document.getElementById('bs-body');
    if (bs) new MutationObserver(function () {
        const cards = bs.querySelector('.lay-cards');
        if (cards && !cards.querySelector('[data-layout="nova"]')) { cards.appendChild(novaCard()); syncCards(); }
    }).observe(bs, { childList: true });

    // phones keep the ribbon; a window that grows wide enough can use Nova again
    window.addEventListener('resize', function () {
        const want = get(KEY) === 'nova';
        if (on && window.innerWidth < 720) leave();
        else if (!on && want && window.innerWidth >= 720) enter();
    });

    window.ImbuerNova = { on: function () { return on; }, set: setNova, open: openPanel, close: closePanel };
    if (get(KEY) === 'nova') {
        // after Imbuer's own start-up (it builds the grid on load)
        const go = function () { enter(); };
        if (document.readyState === 'complete') setTimeout(go, 0); else window.addEventListener('load', function () { setTimeout(go, 0); });
    }
})();
