"use strict";
/* ========================================================
   ANTIMONY NOVA: the Nova layout for Antimony
   Antimony has no ribbon, so this layer is built for a Spaces app:
   a dock on the left (Spaces, Post, People, and quick switches),
   a top bar (the Space, its status, "Jump to anything", main actions),
   a floating Keydown capsule over the messages, flyout panels with tiles,
   and a status pill at the bottom.
   It drives the app's own functions and reads its own DOM, so every command still works.
   The layout is saved under localStorage "antimony_layout" ("nova" or anything else for the classic look).
   Icons: Vadivam first, then Gravity UI, then Lucide (see nova-icons.js for the notices).
   ======================================================== */
(function () {
    'use strict';
    const KEY = 'antimony_layout';
    const ICONS = window.NovaIcons || {};
    let on = false, panelId = '', pinned = false, palEl = null, popEl = null;
    let root = null, mo = null;

    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const $ = function (id) { return document.getElementById(id); };
    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

    /* ---------- icons ---------- */
    function ic(name, cls) {
        const d = ICONS[name];
        if (!d) return '<svg class="an-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
        if (d[0] === 'g') return '<svg class="an-ic an-g' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + d[1] + '</svg>';
        return '<svg class="an-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d[1] + '</svg>';
    }

    /* ---------- what the app can do (every item calls the app's own function) ---------- */
    function call(fn) { return function () { try { const f = window[fn]; if (typeof f === 'function') return f.apply(null, [].slice.call(arguments)); } catch (e) { console.error(e); } }; }
    const A = {
        post: function () { const f = window.openPostModal; if (f) f(); },
        space: function () { const f = window.openSpaceModal; if (f) f(); },
        join: function () { const f = window.openJoinModal; if (f) f(); },
        filter: function () { const f = window.openFilterModal; if (f) f(); },
        badges: function () { const f = window.toggleMentionBadges; if (f) f(); },
        docs: function () { try { window.RadiiDocs && window.RadiiDocs.openDialog(); } catch (e) {} },
        name: function () { const f = window.switchName; if (f) f(); },
        theme: function () { const f = window.toggleTheme; if (f) f(); sync(); },
        sound: function () { const f = window.toggleSound; if (f) f(); sync(); },
        invite: function () { const b = $('invite-code'); if (b) b.click(); toast('Invite link copied!'); },
        classic: function () { setLayout('classic'); }
    };
    function inSpace() { const c = $('chat-view'); return !!c && c.style.display !== 'none'; }
    function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }

    const KD = [
        { ic: 'bold', t: 'Bold', a: '**', b: '**' },
        { ic: 'italic', t: 'Italic', a: '*', b: '*' },
        { ic: 'code', t: 'Code', a: '`', b: '`' },
        { ic: 'orb', t: 'Gel orb', a: '=Y=', b: '=Y=' },
        { ic: 'chips', t: 'Chip', a: '#G#', b: '#' },
        { ic: 'sparkle', t: 'Glow', a: '~S~', b: '~S~' }
    ];
    // wrap the selection in the message box with Keydown marks (or drop a marked word in)
    function wrapInput(a, b) {
        const inp = $('send-input'); if (!inp) return;
        inp.focus();
        const s = inp.selectionStart || 0, e = inp.selectionEnd || 0, v = inp.value;
        const mid = e > s ? v.slice(s, e) : 'text';
        inp.value = v.slice(0, s) + a + mid + b + v.slice(e);
        const from = s + a.length;
        inp.setSelectionRange(from, from + mid.length);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /* ---------- a little toast ---------- */
    function toast(msg) {
        const t = el('div', 'an-toast', esc(msg)); document.body.appendChild(t);
        setTimeout(function () { t.classList.add('out'); }, 1500); setTimeout(function () { t.remove(); }, 1900);
    }

    /* ---------- the DOM ---------- */
    function btn(cls, icon, label, title, fn) {
        const b = el('button', cls, ic(icon) + (label ? '<span class="an-lab">' + esc(label) + '</span>' : ''));
        b.type = 'button'; if (title) b.title = title; b.addEventListener('click', function (e) { e.stopPropagation(); fn(e, b); });
        return b;
    }
    let dock, bar, capsule, status, panel, nameEl, metaEl, connEl, meEl, spaceBtns = {};

    function build() {
        const app = $('app-view'); if (!app || app.querySelector('.an')) return;
        root = el('div', 'an-root');
        // ----- dock -----
        dock = el('nav', 'an an-dock'); dock.id = 'an-dock'; dock.setAttribute('aria-label', 'Antimony');
        const logo = el('div', 'an-logo', '<img src="favicon.svg" alt="">'); logo.title = 'Antimony';
        const main = el('div', 'an-dock-main'), end = el('div', 'an-dock-end');
        [['spaces', 'bubble', 'Spaces', 'Your Spaces'], ['post', 'pen', 'Post', 'Posts and Keydown'], ['people', 'user', 'People', 'Mentions, filter and profiles']].forEach(function (g) {
            const d = btn('an-d', g[1], g[2], g[3], function () { togglePanel(g[0]); }); d.dataset.panel = g[0]; main.appendChild(d);
        });
        const soundB = btn('an-d an-soft', 'music', 'Sound', 'Sounds on or off', A.sound); soundB.id = 'an-sound';
        const themeB = btn('an-d an-soft', 'moon', 'Theme', 'Light or dark', A.theme); themeB.id = 'an-theme';
        const layB = btn('an-d an-soft', 'layout', 'Classic', 'Back to the classic layout', A.classic);
        end.appendChild(soundB); end.appendChild(themeB); end.appendChild(layB);
        dock.appendChild(logo); dock.appendChild(main); dock.appendChild(end);

        // ----- top bar -----
        bar = el('header', 'an an-bar'); bar.id = 'an-bar';
        const left = el('div', 'an-bar-l');
        nameEl = el('div', 'an-spacename', 'Pick a Space'); metaEl = el('span', 'an-chip an-meta'); connEl = el('span', 'an-chip an-conn', '<i class="an-dot"></i><span>Connecting</span>');
        left.appendChild(nameEl); left.appendChild(metaEl); left.appendChild(connEl);
        const search = el('button', 'an-search', ic('search') + '<span>Jump to anything</span><kbd>' + (/Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl ') + 'K</kbd>'); search.type = 'button'; search.addEventListener('click', openPalette);
        const right = el('div', 'an-bar-r');
        const newPost = btn('an-bb an-withlab an-primary', 'pen', 'New Post', 'Compose a post with Keydown formatting', A.post); newPost.id = 'an-newpost';
        const inv = btn('an-bb', 'link', '', 'Copy the invite link', A.invite); inv.id = 'an-invite';
        meEl = btn('an-bb an-withlab', 'user', '…', 'Switch name', A.name); meEl.id = 'an-me';
        right.appendChild(newPost); right.appendChild(inv); right.appendChild(meEl);
        bar.appendChild(left); bar.appendChild(search); bar.appendChild(right);

        // ----- capsule: Keydown helpers for the message box -----
        capsule = el('div', 'an an-capsule'); capsule.id = 'an-capsule';
        const cin = el('div', 'an-capsule-in');
        cin.appendChild(el('span', 'an-clabel', 'Keydown'));
        KD.forEach(function (k) { const b = btn('an-t an-tile-ic', k.ic, '', k.t + ': ' + k.a + 'text' + k.b, function () { wrapInput(k.a, k.b); }); cin.appendChild(b); });
        cin.appendChild(el('span', 'an-csep'));
        cin.appendChild(btn('an-t an-tile-sm', 'pen', 'New Post', 'Open the full post editor', A.post));
        capsule.appendChild(cin);
        capsule.addEventListener('mousedown', function (e) { e.preventDefault(); });

        // ----- status pill -----
        status = el('footer', 'an an-status'); status.id = 'an-status';

        // ----- panel -----
        panel = el('aside', 'an an-panel'); panel.id = 'an-panel'; panel.hidden = true;

        [dock, bar, capsule, status, panel].forEach(function (n) { app.appendChild(n); });
        document.addEventListener('mousedown', outside, true);
        document.addEventListener('keydown', keys, true);
    }

    /* ---------- panels ---------- */
    function tile(cls, icon, label, hint, fn) {
        const b = el('button', 'an-t ' + cls, ic(icon) + '<span class="an-tx"><b>' + esc(label) + '</b>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span>');
        b.type = 'button'; b.addEventListener('click', function (e) { e.stopPropagation(); fn(e); }); return b;
    }
    function section(title) { return el('div', 'an-sec', esc(title)); }

    function spaceRows() {
        const out = [];
        document.querySelectorAll('#space-list .space-row').forEach(function (row) {
            const b = row.querySelector('.space-btn'); if (!b) return;
            const sp = b.querySelector('span'); const small = sp && sp.querySelector('small');
            const code = small ? small.textContent : '';
            const name = sp ? sp.firstChild && sp.firstChild.textContent.replace(/^#\s*/, '') : b.textContent;
            const badge = b.querySelector('.mention-badge');
            out.push({ name: name || 'Space', code: code, active: b.classList.contains('active'), banned: b.classList.contains('banned'), badge: badge ? badge.textContent : '', open: function () { b.click(); }, leave: function () { const x = row.querySelector('.leave-btn'); if (x) x.click(); } });
        });
        return out;
    }
    function fillPanel() {
        if (!panelId) return;
        const titles = { spaces: ['Spaces', 'bubble', 'Everything you belong to'], post: ['Post', 'pen', 'Write and format'], people: ['People', 'user', 'Mentions and profiles'] };
        const t = titles[panelId];
        panel.innerHTML = '';
        const head = el('div', 'an-panel-h', ic(t[1]) + '<h3>' + esc(t[0]) + '</h3><small>' + esc(t[2]) + '</small>');
        const pin = btn('an-t an-tile-ic an-pinb' + (pinned ? ' on' : ''), 'pin', '', pinned ? 'Unpin the panel' : 'Keep the panel open', function () { pinned = !pinned; fillPanel(); });
        const cl = btn('an-t an-tile-ic', 'x', '', 'Close', closePanel);
        head.appendChild(pin); head.appendChild(cl); panel.appendChild(head);
        const body = el('div', 'an-panel-b'); panel.appendChild(body);
        if (panelId === 'spaces') {
            const rows = spaceRows();
            const wrap = el('div', 'an-card'); wrap.appendChild(section('Your Spaces'));
            if (!rows.length) wrap.appendChild(el('p', 'an-empty', 'No Spaces yet! Create one or join with a code!'));
            rows.forEach(function (r) {
                const line = el('div', 'an-srow');
                const b = el('button', 'an-t an-space' + (r.active ? ' on' : '') + (r.banned ? ' ban' : ''), ic('hash') + '<span class="an-tx"><b>' + esc(r.name) + '</b><small>' + esc(r.code) + '</small></span>' + (r.badge ? '<em class="an-badge">' + esc(r.badge) + '</em>' : ''));
                b.type = 'button'; b.addEventListener('click', function () { r.open(); if (!pinned) closePanel(); });
                const x = btn('an-t an-tile-ic an-leave', 'x', '', 'Leave ' + r.name, function () { r.leave(); setTimeout(fillPanel, 120); });
                line.appendChild(b); line.appendChild(x); wrap.appendChild(line);
            });
            body.appendChild(wrap);
            const acts = el('div', 'an-card'); acts.appendChild(section('Add'));
            const g = el('div', 'an-grid');
            g.appendChild(tile('an-tile-big', 'plus', 'Create a Space', 'Moderate your own', function () { A.space(); closeIfLoose(); }));
            g.appendChild(tile('an-tile-big', 'link', 'Join with a code', 'Look at a Space', function () { A.join(); closeIfLoose(); }));
            acts.appendChild(g); body.appendChild(acts);
        } else if (panelId === 'post') {
            const c1 = el('div', 'an-card'); c1.appendChild(section('Compose'));
            const g1 = el('div', 'an-grid');
            g1.appendChild(tile('an-tile-big', 'pen', 'New Post', 'The full post editor', function () { A.post(); closeIfLoose(); }));
            if (inSpace()) g1.appendChild(tile('an-tile-big', 'link', 'Copy invite', 'Share this Space', function () { A.invite(); }));
            c1.appendChild(g1); body.appendChild(c1);
            const c2 = el('div', 'an-card'); c2.appendChild(section('Keydown in your message'));
            const g2 = el('div', 'an-grid an-g3');
            KD.forEach(function (k) { g2.appendChild(tile('an-tile-sm', k.ic, k.t, k.a + 'text' + k.b, function () { wrapInput(k.a, k.b); })); });
            c2.appendChild(g2);
            c2.appendChild(el('p', 'an-note', 'Pick words in the message box first, then press a style. Posts take every Keydown style!'));
            body.appendChild(c2);
        } else {
            const c1 = el('div', 'an-card'); c1.appendChild(section('Mentions'));
            const g1 = el('div', 'an-grid');
            const bd = $('mention-toggle');
            g1.appendChild(tile('an-tile-big', 'hash', 'Mention badges', bd ? bd.textContent.trim().slice(0, 28) || 'Red counts on Spaces' : 'Red counts on Spaces', function () { A.badges(); setTimeout(fillPanel, 80); }));
            g1.appendChild(tile('an-tile-big', 'user', 'Mention filter', 'Hide names from @ suggestions', function () { A.filter(); closeIfLoose(); }));
            c1.appendChild(g1); body.appendChild(c1);
            const c2 = el('div', 'an-card'); c2.appendChild(section('You'));
            const g2 = el('div', 'an-grid');
            g2.appendChild(tile('an-tile-big', 'pencil', 'Switch name', 'Signed in as ' + (($('me-name') || {}).textContent || '…'), function () { A.name(); closeIfLoose(); }));
            g2.appendChild(tile('an-tile-big', 'folder', 'Saved profiles', 'Open, copy, rename, delete', function () { A.docs(); closeIfLoose(); }));
            c2.appendChild(g2); body.appendChild(c2);
        }
    }
    function closeIfLoose() { if (!pinned) closePanel(); }
    function togglePanel(id) { if (panelId === id) { closePanel(); return; } panelId = id; panel.hidden = false; document.body.classList.add('an-panel-open'); fillPanel(); sync(); }
    function closePanel() { panelId = ''; if (panel) panel.hidden = true; document.body.classList.remove('an-panel-open'); sync(); }
    function outside(e) {
        if (!on) return;
        if (panelId && !pinned && !e.target.closest('.an-panel, .an-dock, .modal-overlay, #post-dock')) closePanel();
        if (popEl && !e.target.closest('.an-pop')) { popEl.remove(); popEl = null; }
    }

    /* ---------- the palette (Jump to anything) ---------- */
    function commandIndex() {
        const out = [
            { l: 'New Post', i: 'pen', w: 'Post', run: A.post },
            { l: 'Create a Space', i: 'plus', w: 'Spaces', run: A.space },
            { l: 'Join a Space with a code', i: 'link', w: 'Spaces', run: A.join },
            { l: 'Mention filter', i: 'user', w: 'People', run: A.filter },
            { l: 'Toggle mention badges', i: 'hash', w: 'People', run: A.badges },
            { l: 'Saved profiles', i: 'folder', w: 'People', run: A.docs },
            { l: 'Switch name', i: 'pencil', w: 'People', run: A.name },
            { l: 'Light or dark theme', i: isLight() ? 'moon' : 'sun', w: 'View', run: A.theme },
            { l: 'Sounds on or off', i: 'music', w: 'View', run: A.sound },
            { l: 'Classic layout', i: 'layout', w: 'Layout', run: A.classic }
        ];
        if (inSpace()) out.push({ l: 'Copy invite link', i: 'link', w: 'This Space', run: A.invite });
        KD.forEach(function (k) { out.push({ l: k.t + ' ' + k.a + 'text' + k.b, i: k.ic, w: 'Keydown', run: function () { wrapInput(k.a, k.b); } }); });
        spaceRows().forEach(function (r) { out.push({ l: 'Open # ' + r.name, i: 'hash', w: 'Space ' + r.code, run: r.open }); });
        return out;
    }
    function openPalette() {
        if (palEl) { closePalette(); return; }
        palEl = el('div', 'an an-pal-wrap');
        const box = el('div', 'an-pal', '<div class="an-pal-in">' + ic('search') + '<input type="text" placeholder="Jump to anything: a command, a Space, a Keydown style" spellcheck="false" autocomplete="off"><kbd>Esc</kbd></div><div class="an-pal-list"></div>');
        palEl.appendChild(box); document.body.appendChild(palEl);
        const inp = box.querySelector('input'), list = box.querySelector('.an-pal-list'); let items = [], idx = 0;
        const all = commandIndex();
        function paint() {
            const q = inp.value.trim().toLowerCase(); const terms = q ? q.split(/\s+/) : [];
            items = all.filter(function (c) { const h = (c.l + ' ' + c.w).toLowerCase(); return terms.every(function (t) { return h.indexOf(t) !== -1; }); }).slice(0, 40);
            if (idx >= items.length) idx = Math.max(0, items.length - 1);
            list.innerHTML = '';
            if (!items.length) list.appendChild(el('div', 'an-pal-none', 'Nothing matches!'));
            items.forEach(function (c, n) {
                const b = el('button', 'an-pal-item' + (n === idx ? ' kb' : ''), '<span class="an-pal-ic">' + ic(c.i) + '</span><span class="an-pal-l">' + esc(c.l) + '</span><em>' + esc(c.w) + '</em>');
                b.type = 'button'; b.addEventListener('click', function () { go(c); }); list.appendChild(b);
            });
            const k = list.querySelector('.kb'); if (k && k.scrollIntoView) k.scrollIntoView({ block: 'nearest' });
        }
        function go(c) { closePalette(); setTimeout(function () { try { c.run(); } catch (e) { console.error(e); } }, 30); }
        inp.addEventListener('input', function () { idx = 0; paint(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); paint(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); paint(); e.preventDefault(); }
            else if (e.key === 'Enter') { if (items[idx]) go(items[idx]); e.preventDefault(); }
        });
        palEl.addEventListener('mousedown', function (e) { if (e.target === palEl) closePalette(); });
        paint(); inp.focus();
    }
    function closePalette() { if (palEl) { palEl.remove(); palEl = null; } }
    function keys(e) {
        if (!on) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); openPalette(); }
        else if (e.key === 'Escape') { if (palEl) { closePalette(); e.stopPropagation(); } else if (panelId && !pinned) closePanel(); }
    }

    /* ---------- keep the bars in step with the app ---------- */
    function sync() {
        if (!on || !bar) return;
        const inSp = inSpace();
        const cn = $('chat-name'), cm = $('chat-meta');
        nameEl.textContent = inSp && cn ? cn.textContent : 'Pick a Space';
        const meta = inSp && cm ? cm.textContent.trim() : '';
        metaEl.textContent = meta; metaEl.hidden = !meta;
        const dot = $('conn-dot'), lab = $('conn-label');
        const live = dot && !dot.classList.contains('off');
        connEl.classList.toggle('ok', !!live);
        connEl.querySelector('span').textContent = live ? 'Live' : (lab ? lab.textContent.trim().replace(/…$/, '') || 'Connecting' : 'Connecting');
        const me = $('me-name'); meEl.querySelector('.an-lab').textContent = me ? me.textContent : '…';
        $('an-newpost').hidden = !inSp; $('an-invite').hidden = !inSp;
        capsule.hidden = !inSp;
        document.body.classList.toggle('an-inspace', inSp);
        // status pill
        const code = ($('invite-code') || {}).textContent || '';
        status.innerHTML = '<span class="an-sp' + (live ? ' ok' : '') + '"><i class="an-dot"></i>' + esc(lab ? lab.textContent.trim() : '') + '</span>' +
            (inSp ? '<span class="an-sp">' + esc(code) + '</span>' : '') + '<span class="an-sp">' + esc(me ? me.textContent : '') + '</span>';
        // dock toggles
        dock.querySelectorAll('.an-d[data-panel]').forEach(function (d) { d.classList.toggle('on', d.dataset.panel === panelId); });
        const th = $('an-theme'); if (th) { th.querySelector('svg').outerHTML = ic(isLight() ? 'moon' : 'sun'); }
        const sd = $('an-sound'), snd = document.querySelector('.sound-toggle');
        if (sd) sd.classList.toggle('dim', !!(snd && /off|muted/i.test(snd.className + ' ' + (snd.title || '')) && !/Mute/i.test(snd.title || '')));
        if (panelId === 'spaces' && !pinned || panelId === 'spaces') { /* refreshed on mutation below */ }
    }

    /* ---------- on / off ---------- */
    function enter() {
        if (on) return;
        const app = $('app-view'); if (!app) return;
        on = true; build();
        document.body.classList.add('an-nova');
        sync();
        mo = new MutationObserver(function () { clearTimeout(enter._t); enter._t = setTimeout(function () { sync(); if (panelId === 'spaces') fillPanel(); }, 60); });
        ['space-list', 'chat-meta', 'chat-name', 'conn-label', 'conn-dot', 'me-name', 'chat-view', 'mention-toggle'].forEach(function (id) { const n = $(id); if (n) mo.observe(n, { childList: true, subtree: true, characterData: true, attributes: true }); });
        const th = document.documentElement; mo.observe(th, { attributes: true, attributeFilter: ['data-theme'] });
    }
    function leave() {
        if (!on) return; on = false;
        closePalette(); closePanel(); if (mo) mo.disconnect();
        document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', keys, true);
        document.querySelectorAll('.an').forEach(function (n) { n.remove(); });
        document.body.classList.remove('an-nova', 'an-inspace', 'an-panel-open');
    }
    function setLayout(l) {
        save(l === 'nova' ? 'nova' : 'classic');
        if (l === 'nova') enter(); else leave();
        classicSwitch();
    }
    // the way into Nova from the classic look: a button in the sidebar
    function classicSwitch() {
        const old = document.getElementById('an-to-nova');
        if (old) old.remove();
        if (on) return;
        const host = document.querySelector('.pad-selection-stack'); if (!host) return;
        const b = el('button', 'action-btn', '<svg class="btn-icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS.layout ? ICONS.layout[1] : '') + '</svg> Nova layout!');
        b.id = 'an-to-nova'; b.title = 'Switch to the Nova layout!'; b.type = 'button'; b.addEventListener('click', function () { setLayout('nova'); });
        const lab = $('conn-label'); host.insertBefore(b, lab || null);
    }

    function init() {
        classicSwitch();
        if (saved() === 'nova') enter();
    }
    window.AntimonyNova = { enter: function () { setLayout('nova'); }, leave: function () { setLayout('classic'); }, isOn: function () { return on; }, openPalette: openPalette };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
