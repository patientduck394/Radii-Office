"use strict";
/* ========================================================
   PHOSPHOR NOVA
   A second layout for Phosphor, drawn from scratch (its own DOM and CSS, no shared components):
   a dock of Spaces on the left, a top bar, a Keydown capsule over the composer, flyout panels and a status pill.
   It drives the chat with the app's own buttons and functions, so every command still works.
   Stored under localStorage phosphor_layout ('nova'); icons come from nova-icons.js (Vadivam, then Gravity UI, then Lucide).
   ======================================================== */
(function () {
    'use strict';
    const KEY = 'phosphor_layout';
    const ICONS = window.NovaIcons || {};
    const $ = function (id) { return document.getElementById(id); };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
    function ic(name, cls) {
        const d = ICONS[name] || ICONS.sparkle;
        if (!d) return '';
        if (d[0] === 'g') return '<svg class="phn-ic phn-g' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + d[1] + '</svg>';
        return '<svg class="phn-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d[1] + '</svg>';
    }
    function call(fn) { const a = Array.prototype.slice.call(arguments, 1); try { if (typeof window[fn] === 'function') return window[fn].apply(window, a); } catch (e) { console.error(e); } }
    function clickId(id) { const n = $(id); if (n) n.click(); }

    let built = false, root = null, flyName = '', flyEl = null, palEl = null;
    const refs = {};

    /* ---------- Keydown snippets: every tag here is one Phosphor already understands ---------- */
    const SNIPS = [
        { g: 'Text', items: [
            ['Bold', '**', '**', 'bold'], ['Italic', '*', '*', 'italic'], ['Code', '`', '`', 'code'], ['Spark', '&&', '&&', 'sparkle'],
            ['Underline', '__', '__', 'underline'], ['Wavy', '~_', '_~', 'underline'], ['Strike', '-_', '_-', 'strike']] },
        { g: 'Gel orbs', items: [['Yellow', '=Y=', '=Y='], ['Red', '=R=', '=R='], ['Green', '=G=', '=G='], ['Cyan', '=C=', '=C='], ['Blue', '=B=', '=B=']] },
        { g: 'Effects', items: [['Green flash', '~G~', '~G~'], ['Liquid underline', '~U~', '~U~'], ['Glossy badge', '~B~', '~B~'], ['Cyber glow', '~S~', '~S~'], ['Liquid glow', '~L~', '~L~'], ['Embossed', '~E~', '~E~'], ['Neon ribbon', '~NE~', '~NE~'], ['Holo chip', '~HOLO~', '~HOLO~']] },
        { g: 'Chips', items: [['Wax red', '~~R~', '~~'], ['Wax blue', '~~B~', '~~'], ['Tape red', '==R^', '=='], ['Tape blue', '==B^', '=='], ['Aero red', '++R+', '++'], ['Aero green', '++G+', '++'], ['Jelly red', '#/R/', '/'], ['Jelly blue', '#/B/', '/'], ['Tag red', '!#R#', '#'], ['Tag blue', '!#B#', '#']] }
    ];
    function insertKd(open, close) {
        const inp = $('send-input');
        if (!inp) return;
        const a = inp.selectionStart == null ? inp.value.length : inp.selectionStart, b = inp.selectionEnd == null ? a : inp.selectionEnd;
        const v = inp.value, picked = v.slice(a, b), inner = picked || 'text';
        inp.value = v.slice(0, a) + open + inner + close + v.slice(b);
        inp.focus();
        const s = a + open.length;
        inp.setSelectionRange(s, s + inner.length);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /* ---------- the commands (also what the search palette lists) ---------- */
    function commands() {
        const out = [];
        spaceRows().forEach(function (s) { out.push({ label: s.name, where: 'Space ' + s.code, icon: 'hash', run: function () { s.go(); } }); });
        out.push({ label: 'New Space', where: 'Spaces', icon: 'plus', run: function () { call('openSpaceModal'); } });
        out.push({ label: 'Join a Space', where: 'Spaces', icon: 'link', run: function () { call('openJoinModal'); } });
        out.push({ label: 'Share a file', where: 'Share', icon: 'attach', run: function () { clickId('file-input'); } });
        out.push({ label: 'Share a folder as ZIP', where: 'Share', icon: 'folder', run: function () { clickId('folder-input'); } });
        out.push({ label: 'Copy invite link', where: 'Space', icon: 'copy', run: function () { clickId('invite-code'); } });
        out.push({ label: 'Light or dark', where: 'Settings', icon: document.body.classList.contains('light-theme') ? 'moon' : 'sun', run: function () { call('toggleTheme'); } });
        out.push({ label: 'Sound on or off', where: 'Settings', icon: 'music', run: function () { call('toggleSound'); } });
        out.push({ label: 'Mention badges on or off', where: 'Settings', icon: 'tag', run: function () { call('toggleMentionBadges'); } });
        out.push({ label: 'Mention filter', where: 'Settings', icon: 'user', run: function () { call('openFilterModal'); } });
        out.push({ label: 'Switch name', where: 'Settings', icon: 'pencil', run: function () { call('switchName'); } });
        out.push({ label: 'Saved profiles', where: 'Settings', icon: 'doc', run: function () { try { window.RadiiDocs.openDialog(); } catch (e) {} } });
        out.push({ label: 'Classic layout', where: 'Layout', icon: 'layout', run: function () { setLayout('classic'); } });
        SNIPS.forEach(function (g) { g.items.forEach(function (it) { out.push({ label: it[0] + '  ' + it[1] + 'text' + it[2], where: 'Keydown ' + g.g, icon: it[3] || 'sparkle', run: function () { insertKd(it[1], it[2]); } }); }); });
        return out;
    }

    /* ---------- the Spaces, read from the app's own list ---------- */
    function spaceRows() {
        const rows = [];
        document.querySelectorAll('#space-list .space-row').forEach(function (r) {
            const b = r.querySelector('.space-btn'), x = r.querySelector('.leave-btn');
            if (!b) return;
            const sp = b.querySelector('span'), sm = b.querySelector('small');
            const code = sm ? (sm.firstChild ? sm.firstChild.textContent.trim() : '') : '';
            const name = sp ? Array.prototype.filter.call(sp.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join('').replace(/^#\s*/, '').trim() : b.textContent.trim();
            const bd = b.querySelector('.mention-badge');
            rows.push({ name: name || code, code: code, active: b.classList.contains('active'), banned: b.classList.contains('banned'), badge: bd ? bd.textContent : '', go: function () { b.click(); }, leave: function () { if (x) x.click(); } });
        });
        return rows;
    }
    function initials(n) { const w = String(n).trim().split(/\s+/); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '')[1] || '')).toUpperCase(); }
    function hue(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }

    /* ---------- build ---------- */
    function dockBtn(icon, label, title, fn) {
        const b = el('button', 'phn-d', ic(icon) + '<span>' + esc(label) + '</span>');
        b.type = 'button'; b.title = title || label;
        b.addEventListener('click', function (e) { e.stopPropagation(); fn(b); });
        return b;
    }
    function barBtn(icon, title, fn, label) {
        const b = el('button', 'phn-t phn-bb' + (label ? ' phn-wl' : ''), ic(icon) + (label ? '<span>' + esc(label) + '</span>' : ''));
        b.type = 'button'; b.title = title;
        b.addEventListener('click', function (e) { e.stopPropagation(); fn(b); });
        return b;
    }
    function build() {
        if (built) return;
        const app = $('app-view');
        if (!app) return;
        built = true;
        root = el('div', 'phn');
        // dock
        const dock = el('aside', 'phn-dock');
        const logo = el('button', 'phn-logo', '<img src="favicon-96.png" alt="">'); logo.type = 'button'; logo.title = 'Phosphor';
        logo.addEventListener('click', function () { closeFly(); });
        refs.spaces = el('div', 'phn-spaces');
        refs.dockEnd = el('div', 'phn-dock-end');
        refs.dockEnd.appendChild(dockBtn('sparkle', 'Keydown', 'Keydown styles for your message', function (b) { toggleFly('keydown', b); }));
        refs.dockEnd.appendChild(dockBtn('attach', 'Share', 'Share a file or a folder', function (b) { toggleFly('share', b); }));
        refs.themeBtn = dockBtn('moon', 'Theme', 'Light or dark', function () { call('toggleTheme'); setTimeout(sync, 60); });
        refs.dockEnd.appendChild(refs.themeBtn);
        const more = dockBtn('gear', 'More', 'Settings and layout', function (b) { toggleFly('more', b); });
        more.classList.add('phn-d-gray');
        refs.dockEnd.appendChild(more);
        dock.appendChild(logo); dock.appendChild(refs.spaces); dock.appendChild(refs.dockEnd);
        // top bar
        const bar = el('header', 'phn-bar');
        const left = el('div', 'phn-bar-l');
        refs.title = el('div', 'phn-title', 'Phosphor');
        refs.meta = el('div', 'phn-meta', 'Pick a Space to start talking!');
        const tb = el('div', 'phn-tb'); tb.appendChild(refs.title); tb.appendChild(refs.meta);
        refs.dot = el('span', 'phn-dot'); refs.dot.title = 'Connection! Click to retry!';
        refs.dot.addEventListener('click', function () { call('reconnectNow'); });
        left.appendChild(refs.dot); left.appendChild(tb);
        refs.invite = el('button', 'phn-chip', ic('link') + '<span>Invite</span>'); refs.invite.type = 'button'; refs.invite.title = 'Copy invite link!';
        refs.invite.addEventListener('click', function () { clickId('invite-code'); });
        refs.net = el('button', 'phn-chip phn-chip-b', ''); refs.net.type = 'button'; refs.net.hidden = true;
        refs.net.addEventListener('click', function () { call('editSpaceNet'); });
        const search = el('button', 'phn-search', ic('search') + '<span>Jump to anything</span><kbd>⌘K</kbd>'); search.type = 'button';
        search.addEventListener('click', function () { openPalette(); });
        const right = el('div', 'phn-bar-r');
        right.appendChild(barBtn('plus', 'New Space', function () { call('openSpaceModal'); }, 'New'));
        right.appendChild(barBtn('link', 'Join a Space with a code', function () { call('openJoinModal'); }, 'Join'));
        refs.me = el('button', 'phn-me', '?'); refs.me.type = 'button'; refs.me.title = 'Switch name';
        refs.me.addEventListener('click', function () { call('switchName'); });
        right.appendChild(refs.me);
        bar.appendChild(left); bar.appendChild(refs.invite); bar.appendChild(refs.net); bar.appendChild(search); bar.appendChild(right);
        // status pill
        refs.status = el('div', 'phn-status', '<span class="phn-st-dot"></span><span class="phn-st-t">Connecting…</span>');
        refs.status.addEventListener('click', function () { call('reconnectNow'); });
        root.appendChild(dock); root.appendChild(bar); root.appendChild(refs.status);
        app.insertBefore(dock, app.firstChild);
        app.insertBefore(bar, dock.nextSibling);
        app.appendChild(refs.status);
        root = app;
        buildCapsule();
        wire();
        sync();
    }
    function buildCapsule() {
        const cv = $('chat-view'), anchor = cv && cv.querySelector('.composer-anchor');
        if (!cv || !anchor) return;
        const cap = el('div', 'phn-cap');
        const quick = [['bold', '**', '**', 'Bold'], ['italic', '*', '*', 'Italic'], ['code', '`', '`', 'Code'], ['strike', '-_', '_-', 'Strike'], ['sparkle', '&&', '&&', 'Spark']];
        quick.forEach(function (q) { const b = el('button', 'phn-t phn-ci', ic(q[0])); b.type = 'button'; b.title = q[3] + '  ' + q[1] + 'text' + q[2]; b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', function () { insertKd(q[1], q[2]); }); cap.appendChild(b); });
        cap.appendChild(el('i', 'phn-sep'));
        [['=Y=', '=Y=', 'Yellow orb', '#eab308'], ['=R=', '=R=', 'Red orb', '#ef4444'], ['=G=', '=G=', 'Green orb', '#22c55e'], ['=C=', '=C=', 'Cyan orb', '#06b6d4'], ['=B=', '=B=', 'Blue orb', '#3b82f6']].forEach(function (o) {
            const b = el('button', 'phn-t phn-ci phn-orb', '<i style="background:' + o[3] + '"></i>'); b.type = 'button'; b.title = o[2] + '  ' + o[0] + 'text' + o[1];
            b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', function () { insertKd(o[0], o[1]); }); cap.appendChild(b);
        });
        cap.appendChild(el('i', 'phn-sep'));
        const all = el('button', 'phn-t phn-wl phn-ci', ic('chips') + '<span>All styles</span>'); all.type = 'button';
        all.addEventListener('click', function (e) { e.stopPropagation(); toggleFly('keydown', all); });
        cap.appendChild(all);
        const f1 = el('button', 'phn-t phn-ci', ic('attach')); f1.type = 'button'; f1.title = 'Share a file'; f1.addEventListener('click', function () { clickId('file-input'); });
        const f2 = el('button', 'phn-t phn-ci', ic('folder')); f2.type = 'button'; f2.title = 'Share a folder as ZIP'; f2.addEventListener('click', function () { clickId('folder-input'); });
        cap.appendChild(el('i', 'phn-sep')); cap.appendChild(f1); cap.appendChild(f2);
        cv.insertBefore(cap, anchor);
        refs.cap = cap;
    }

    /* ---------- flyouts ---------- */
    function closeFly() { if (flyEl) { flyEl.remove(); flyEl = null; } flyName = ''; document.querySelectorAll('.phn-d.on').forEach(function (n) { n.classList.remove('on'); }); }
    function toggleFly(name, anchor) {
        if (flyName === name) { closeFly(); return; }
        closeFly();
        flyName = name;
        const f = el('div', 'phn-fly');
        if (name === 'keydown') {
            f.innerHTML = '<div class="phn-fh">' + ic('sparkle') + '<b>Keydown</b><small>Tap a style to wrap your selection, or add it to the message</small></div>';
            SNIPS.forEach(function (g) {
                const card = el('section', 'phn-card', '<h4>' + esc(g.g) + '</h4>');
                const grid = el('div', 'phn-grid');
                g.items.forEach(function (it) {
                    const t = el('button', 'phn-t phn-tile', '<b>' + esc(it[0]) + '</b><code>' + esc(it[1] + 'text' + it[2]) + '</code>'); t.type = 'button';
                    t.addEventListener('click', function () { insertKd(it[1], it[2]); });
                    grid.appendChild(t);
                });
                card.appendChild(grid); f.appendChild(card);
            });
        } else if (name === 'share') {
            f.innerHTML = '<div class="phn-fh">' + ic('attach') + '<b>Share</b><small>Files up to 8 MB</small></div>';
            const card = el('section', 'phn-card'), grid = el('div', 'phn-grid phn-grid1');
            [['attach', 'Share a file', 'Instant up to 2 MB, streaming to 8 MB', 'file-input'], ['folder', 'Share a folder', 'Zipped on the spot, 8 MB max', 'folder-input']].forEach(function (r) {
                const t = el('button', 'phn-t phn-row', ic(r[0]) + '<span><b>' + r[1] + '</b><small>' + r[2] + '</small></span>'); t.type = 'button';
                t.addEventListener('click', function () { closeFly(); clickId(r[3]); }); grid.appendChild(t);
            });
            card.appendChild(grid); f.appendChild(card);
        } else if (name === 'more') {
            f.innerHTML = '<div class="phn-fh">' + ic('gear') + '<b>More</b><small>Settings and layout</small></div>';
            const card = el('section', 'phn-card'), grid = el('div', 'phn-grid phn-grid1');
            [['moon', 'Light or dark', 'Switch the look', function () { call('toggleTheme'); }],
             ['music', 'Sounds', 'Mute or unmute the UI sounds', function () { call('toggleSound'); }],
             ['tag', 'Mention badges', 'Red counts on Spaces', function () { call('toggleMentionBadges'); }],
             ['user', 'Mention filter', 'Hide people from @ suggestions', function () { call('openFilterModal'); }],
             ['pencil', 'Switch name', 'Pick a different display name', function () { call('switchName'); }],
             ['doc', 'Saved profiles', 'Open, copy, rename, delete', function () { try { window.RadiiDocs.openDialog(); } catch (e) {} }],
             ['layout', 'Classic layout', 'Go back to the original Phosphor', function () { setLayout('classic'); }]].forEach(function (r) {
                const t = el('button', 'phn-t phn-row', ic(r[0]) + '<span><b>' + r[1] + '</b><small>' + r[2] + '</small></span>'); t.type = 'button';
                t.addEventListener('click', function () { closeFly(); r[3](); setTimeout(sync, 80); }); grid.appendChild(t);
            });
            card.appendChild(grid); f.appendChild(card);
        }
        f.addEventListener('click', function (e) { e.stopPropagation(); });
        document.body.appendChild(f);
        flyEl = f;
        if (anchor && anchor.classList.contains('phn-d')) anchor.classList.add('on');
        const r = anchor ? anchor.getBoundingClientRect() : { left: 80, bottom: 100, top: 100, right: 80 };
        const w = f.offsetWidth, h = f.offsetHeight;
        let x = r.right + 10, y = r.top;
        if (anchor && !anchor.classList.contains('phn-d')) { x = Math.min(window.innerWidth - w - 10, Math.max(10, r.left)); y = r.top - h - 8; }
        if (y + h > window.innerHeight - 10) y = Math.max(10, window.innerHeight - h - 10);
        if (y < 10) y = 10;
        f.style.left = x + 'px'; f.style.top = y + 'px';
    }

    /* ---------- the search palette (⌘K) ---------- */
    function closePalette() { if (palEl) { palEl.remove(); palEl = null; } }
    function openPalette() {
        closePalette(); closeFly();
        const all = commands();
        const wrap = el('div', 'phn-pal-back');
        const box = el('div', 'phn-pal', '<div class="phn-pal-in">' + ic('search') + '<input type="text" placeholder="Jump to a Space, a command, a Keydown style…" aria-label="Jump to anything"><kbd>esc</kbd></div><div class="phn-pal-list"></div>');
        wrap.appendChild(box); document.body.appendChild(wrap); palEl = wrap;
        const inp = box.querySelector('input'), list = box.querySelector('.phn-pal-list');
        let idx = 0, shown = [];
        function paint() {
            const q = inp.value.trim().toLowerCase();
            shown = all.filter(function (c) { return !q || (c.label + ' ' + c.where).toLowerCase().indexOf(q) !== -1; }).slice(0, 40);
            if (idx >= shown.length) idx = Math.max(0, shown.length - 1);
            list.innerHTML = '';
            if (!shown.length) list.appendChild(el('div', 'phn-pal-none', 'Nothing matches yet!'));
            shown.forEach(function (c, i) {
                const b = el('button', 'phn-pal-item' + (i === idx ? ' kb' : ''), '<span class="phn-pal-ic">' + ic(c.icon) + '</span><span class="phn-pal-l">' + esc(c.label) + '</span><em>' + esc(c.where) + '</em>'); b.type = 'button';
                b.addEventListener('click', function () { run(c); }); b.addEventListener('mousemove', function () { idx = i; paintSel(); });
                list.appendChild(b);
            });
        }
        function paintSel() { Array.prototype.forEach.call(list.children, function (n, i) { n.classList.toggle('kb', i === idx); }); const k = list.querySelector('.kb'); if (k && k.scrollIntoView) k.scrollIntoView({ block: 'nearest' }); }
        function run(c) { closePalette(); try { c.run(); } catch (e) { console.error(e); } setTimeout(sync, 80); }
        inp.addEventListener('input', function () { idx = 0; paint(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { idx = Math.min(shown.length - 1, idx + 1); paintSel(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); paintSel(); e.preventDefault(); }
            else if (e.key === 'Enter') { if (shown[idx]) run(shown[idx]); e.preventDefault(); }
            else if (e.key === 'Escape') { closePalette(); }
        });
        wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) closePalette(); });
        paint(); inp.focus();
    }

    /* ---------- keep Nova in step with the app ---------- */
    let queued = false;
    function sync() {
        if (!built) return;
        queued = false;
        const light = document.body.classList.contains('light-theme');
        // spaces
        const rows = spaceRows();
        const sig = rows.map(function (r) { return r.code + r.name + r.active + r.badge + r.banned; }).join('|');
        if (refs.sig !== sig) {
            refs.sig = sig;
            refs.spaces.innerHTML = '';
            rows.forEach(function (r) {
                const b = el('button', 'phn-sp' + (r.active ? ' on' : '') + (r.banned ? ' ban' : ''), '<b style="--h:' + hue(r.code + r.name) + '">' + esc(initials(r.name)) + '</b>' + (r.badge ? '<i class="phn-badge">' + esc(r.badge) + '</i>' : '')); b.type = 'button';
                b.title = r.name + '  ·  ' + r.code + '\nRight-click to leave';
                b.addEventListener('click', function () { closeFly(); r.go(); setTimeout(sync, 60); });
                b.addEventListener('contextmenu', function (e) { e.preventDefault(); r.leave(); setTimeout(sync, 60); });
                refs.spaces.appendChild(b);
            });
            const add = el('button', 'phn-sp phn-sp-add', ic('plus')); add.type = 'button'; add.title = 'New Space';
            add.addEventListener('click', function () { call('openSpaceModal'); });
            const join = el('button', 'phn-sp phn-sp-add', ic('link')); join.type = 'button'; join.title = 'Join a Space with a code';
            join.addEventListener('click', function () { call('openJoinModal'); });
            refs.spaces.appendChild(add); refs.spaces.appendChild(join);
        }
        // title and meta
        const cv = $('chat-view'), live = cv && cv.style.display !== 'none';
        const nm = $('chat-name'), mt = $('chat-meta');
        refs.title.textContent = live && nm ? nm.textContent : 'Phosphor';
        refs.meta.textContent = live && mt ? mt.textContent : 'Pick a Space on the left, or make one!';
        refs.meta.title = refs.meta.textContent;
        refs.invite.style.display = live ? '' : 'none';
        const inv = $('invite-code');
        if (inv && live) refs.invite.querySelector('span').textContent = inv.textContent.replace(/^Invite:\s*/, '') ? 'Invite ' + inv.textContent.replace(/^Invite:\s*/, '') : 'Invite';
        const nc = $('net-chip');
        refs.net.hidden = !(live && nc && !nc.hidden);
        if (!refs.net.hidden) refs.net.textContent = nc.textContent;
        // connection
        const dot = $('conn-dot'), on = dot ? dot.classList.contains('on') : false;
        refs.dot.classList.toggle('on', on);
        const lab = $('conn-label');
        refs.status.classList.toggle('on', on);
        refs.status.querySelector('.phn-st-t').textContent = (lab ? lab.textContent : '') + (live && nm ? '  ·  ' + nm.textContent : '');
        const me = $('me-name');
        refs.me.textContent = me ? initials(me.textContent) : '?'; refs.me.title = 'You are ' + (me ? me.textContent : '?') + ' (tap to switch name)';
        // theme button
        const tb = refs.themeBtn;
        tb.innerHTML = ic(light ? 'moon' : 'sun') + '<span>Theme</span>';
        if (refs.cap) refs.cap.style.display = live ? '' : 'none';
    }
    function queue() { if (queued) return; queued = true; requestAnimationFrame(sync); }
    function wire() {
        const watch = function (id, opts) { const n = $(id); if (n) new MutationObserver(queue).observe(n, opts); };
        watch('space-list', { childList: true, subtree: true, attributes: true, characterData: true });
        watch('chat-name', { childList: true, characterData: true, subtree: true });
        watch('chat-meta', { childList: true, characterData: true, subtree: true });
        watch('invite-code', { childList: true, characterData: true, subtree: true });
        watch('conn-dot', { attributes: true });
        watch('conn-label', { childList: true, characterData: true, subtree: true });
        watch('me-name', { childList: true, characterData: true, subtree: true });
        watch('chat-view', { attributes: true, attributeFilter: ['style'] });
        watch('net-chip', { attributes: true, childList: true, characterData: true, subtree: true });
        new MutationObserver(queue).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        document.addEventListener('click', function () { if (flyEl) closeFly(); });
        document.addEventListener('keydown', function (e) {
            if (!document.body.classList.contains('ph-nova')) return;
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (palEl) closePalette(); else openPalette(); }
            else if (e.key === 'Escape') { closeFly(); closePalette(); }
        });
        setInterval(sync, 1500);
    }

    /* ---------- the layout switch ---------- */
    function getLayout() { try { return localStorage.getItem(KEY) === 'nova' ? 'nova' : 'classic'; } catch (e) { return 'classic'; } }
    function setLayout(l) {
        try { localStorage.setItem(KEY, l); } catch (e) {}
        apply(l);
    }
    function apply(l) {
        document.body.classList.toggle('ph-nova', l === 'nova');
        if (l === 'nova') { build(); sync(); } else { closeFly(); closePalette(); }
        const sw = document.getElementById('phn-switch');
        if (sw) sw.querySelector('span').textContent = l === 'nova' ? 'Classic layout' : 'Nova layout';
    }
    // a button in the classic sidebar, so the new layout can be found (and left again)
    function addSwitch() {
        const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
        if (!stack || document.getElementById('phn-switch')) return;
        const b = el('button', 'action-btn', '<span>Nova layout</span>'); b.id = 'phn-switch'; b.type = 'button'; b.title = 'Switch between the Nova layout and the classic one';
        b.addEventListener('click', function () { setLayout(getLayout() === 'nova' ? 'classic' : 'nova'); });
        const lab = document.getElementById('conn-label');
        stack.insertBefore(b, lab);
    }
    function boot() { addSwitch(); apply(getLayout()); }
    window.PhosphorNova = { set: setLayout, get: getLayout, openPalette: openPalette };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
