/* =====================================================================
   POOLSIDE STYLE LOOKUP (PSL)! Search every Poolside style (450 designs x 5 colorways = 2,250 styles) that used to live in the
   Style Gallery. Pick one to insert it; star the ones you love. Favorites are kept in ONE place for every Radii Office app on
   this address (Bitbook, Waterflow...), so a star in one shows up in the other right away!
     PSL.open({ insert(style) })   opens the lookup; insert gets { id, fam, famName, name, col, cls, kd, pk(words) }
     PSL.favs() / PSL.isFav(id) / PSL.toggle(id) / PSL.add(ids)   the shared favorites
     PSL.onChange(fn)              runs when favorites change here or in another app or tab
   Needs psl-data.js first. Written <id-N words> in Poolside Keydown, @id-N@words@ in Keydown.
   ===================================================================== */
(function (root) {
    'use strict';
    const DATA = root.PSL_DATA;
    if (!DATA) return;
    const KEY = 'radii_psl_favorites_v1';
    const SCRIPT = (document.currentScript && document.currentScript.src) || '';
    const STYLES = [];
    DATA.fams.forEach((f) => f[2].forEach((pal, i) => {
        const id = f[0] + '-' + (i + 1);
        STYLES.push({ id: id, fam: f[0], famName: f[1], name: pal, col: f[3], colName: DATA.cols[f[3]] || f[3], n: i + 1,
            cls: 'us-chip us-' + f[0] + ' us-' + id, kd: '@' + id + '@Text@', hay: (f[1] + ' ' + pal + ' ' + id + ' ' + (DATA.cols[f[3]] || '')).toLowerCase() });
    }));
    const BY_ID = {}; STYLES.forEach((s) => { BY_ID[s.id] = s; });

    /* ---------- favorites, shared by every app on this address ---------- */
    let favs = [];
    const listeners = [];
    function read() {
        try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter((id) => typeof id === 'string' && BY_ID[id]) : []; } catch (e) { return []; }
    }
    function write() { try { localStorage.setItem(KEY, JSON.stringify(favs)); } catch (e) {} }
    function fire() { listeners.forEach((f) => { try { f(favs.slice()); } catch (e) {} }); }
    favs = read();
    window.addEventListener('storage', (ev) => { if (ev.key === KEY || ev.key === null) { favs = read(); fire(); refresh(); } });

    const api = {
        styles: STYLES, find: (id) => BY_ID[id] || null,
        favs: () => favs.slice(),
        isFav: (id) => favs.indexOf(id) !== -1,
        toggle(id) {
            if (!BY_ID[id]) return false;
            favs = read();   // (pick up a star made in another app a moment ago)
            const i = favs.indexOf(id);
            if (i === -1) favs.push(id); else favs.splice(i, 1);
            write(); fire(); refresh();
            return i === -1;
        },
        add(ids) {
            favs = read();
            let changed = false;
            (ids || []).forEach((id) => { if (BY_ID[id] && favs.indexOf(id) === -1) { favs.push(id); changed = true; } });
            if (changed) { write(); fire(); refresh(); }
            return changed;
        },
        onChange(fn) { listeners.push(fn); },
        open: open, close: close
    };
    root.PSL = api;

    /* ---------- the lookup window ---------- */
    let box = null, opts = null, state = { q: '', col: 'all', shown: 72 };
    const PAGE = 72;
    function ensureCss() {
        if (!document.getElementById('psl-us-css')) {
            const l = document.createElement('link');
            l.id = 'psl-us-css'; l.rel = 'stylesheet';
            const v = /[?&]v=([\w]+)/.exec(SCRIPT);
            l.href = SCRIPT.replace(/psl\.js[^/]*$/, 'unique-styles.css') + (v ? '?v=' + v[1] : '');
            document.head.appendChild(l);
        }
        if (!document.getElementById('psl-style')) {
            const st = document.createElement('style');
            st.id = 'psl-style';
            st.textContent = [
                '.psl-back { position: fixed; inset: 0; z-index: 100000; display: grid; place-items: center; background: rgba(5, 40, 70, .45); padding: 14px; }',
                '.psl-box { width: min(860px, 100%); max-height: min(720px, 100%); display: flex; flex-direction: column; border-radius: 18px; border: 2px solid #36cdee; background: #f2fcff; color: #0b2a44; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 20px 60px rgba(0, 40, 80, .4); overflow: hidden; }',
                '.psl-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #d2f7fc; border-bottom: 2px solid #36cdee; }',
                '.psl-head h3 { margin: 0; font-size: 17px; flex: 1; }',
                '.psl-x { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #36cdee; background: #fff; color: #0a93b2; cursor: pointer; font-weight: 800; line-height: 1; }',
                '.psl-tools { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 16px 6px; }',
                '.psl-q { flex: 1 1 220px; min-width: 0; padding: 8px 14px; border-radius: 999px; border: 2px solid #36cdee; background: #fff; color: inherit; font: inherit; outline: none; }',
                '.psl-cols { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 8px; }',
                '.psl-col { padding: 4px 12px; border-radius: 999px; border: 2px solid #36cdee; background: #fff; color: #0a93b2; font: 700 12px system-ui, sans-serif; cursor: pointer; }',
                '.psl-col.on { background: #36cdee; color: #fff; }',
                '.psl-count { align-self: center; font-size: 12px; color: #4d6e89; margin-left: auto; }',
                '.psl-grid { flex: 1; min-height: 120px; overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; padding: 8px 16px 14px; align-content: start; }',
                '.psl-card { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 10px 10px 8px; border-radius: 12px; border: 2px solid #b9ecf7; background: #fff; text-align: left; cursor: pointer; font: inherit; color: inherit; }',
                '.psl-card:hover { border-color: #36cdee; background: #f2fcff; }',
                '.psl-stage { min-height: 38px; display: flex; align-items: center; font-size: 17px; overflow: hidden; }',
                '.psl-name { font-size: 12px; font-weight: 700; padding-right: 26px; }',
                '.psl-sub { font-size: 11px; color: #4d6e89; }',
                '.psl-star { position: absolute; right: 6px; bottom: 6px; width: 26px; height: 26px; display: grid; place-items: center; border: 0; background: none; color: #9bb7c6; cursor: pointer; border-radius: 50%; padding: 0; }',
                '.psl-star:hover { background: #d2f7fc; color: #ff8a1b; }',
                '.psl-star.on { color: #ff8a1b; }',
                '.psl-star svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; }',
                '.psl-star.on svg { fill: currentColor; }',
                '.psl-more, .psl-none { grid-column: 1 / -1; text-align: center; padding: 8px; }',
                '.psl-more button { padding: 7px 18px; border-radius: 999px; border: 2px solid #36cdee; background: #d2f7fc; color: #0a93b2; font: 700 13px system-ui, sans-serif; cursor: pointer; }',
                '.psl-foot { padding: 8px 16px 12px; font-size: 12px; color: #4d6e89; border-top: 1px solid #b9ecf7; }',
                '@media (prefers-color-scheme: dark) { body[data-theme="night"] .psl-box { background: #0d2640; color: #e6f4ff; } }',
                'body[data-theme="night"] .psl-box { background: #0d2640; color: #e6f4ff; border-color: #36cdee; } body[data-theme="night"] .psl-head { background: #12395e; } body[data-theme="night"] .psl-card, body[data-theme="night"] .psl-q, body[data-theme="night"] .psl-col:not(.on), body[data-theme="night"] .psl-x { background: #12395e; color: #e6f4ff; border-color: #2b5f8f; } body[data-theme="night"] .psl-sub, body[data-theme="night"] .psl-foot, body[data-theme="night"] .psl-count { color: #93b6d3; }'
            ].join('\n');
            document.head.appendChild(st);
        }
    }
    const STAR = '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>';
    function matches() {
        const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
        return STYLES.filter((s) => {
            if (state.col === 'fav') { if (favs.indexOf(s.id) === -1) return false; }
            else if (state.col !== 'all' && s.col !== state.col) return false;
            return words.every((w) => s.hay.indexOf(w) !== -1);
        });
    }
    function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
    function refresh() {
        if (!box) return;
        const list = matches();
        const cols = box.querySelector('.psl-cols');
        cols.innerHTML = '';
        [['all', 'All'], ['fav', 'Favorites (' + favs.length + ')']].concat(Object.keys(DATA.cols).map((k) => [k, DATA.cols[k]])).forEach((c) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'psl-col' + (state.col === c[0] ? ' on' : ''); b.textContent = (c[0] === 'fav' ? '★ ' : '') + c[1];
            b.addEventListener('click', () => { state.col = c[0]; state.shown = PAGE; refresh(); });
            cols.appendChild(b);
        });
        const count = document.createElement('span');
        count.className = 'psl-count'; count.textContent = list.length + ' style' + (list.length === 1 ? '' : 's');
        cols.appendChild(count);
        const grid = box.querySelector('.psl-grid');
        const keepScroll = grid.scrollTop;
        grid.innerHTML = '';
        list.slice(0, state.shown).forEach((s) => {
            const card = document.createElement('div');
            card.className = 'psl-card'; card.setAttribute('role', 'button'); card.tabIndex = 0;
            card.title = 'Insert: <' + s.id + ' words>';
            card.innerHTML = '<div class="psl-stage"><span class="' + s.cls + '">Text</span></div><div class="psl-name">' + esc(s.famName) + '</div><div class="psl-sub">' + esc(s.name) + ' · ' + esc(s.colName) + '</div>' +
                '<button type="button" class="psl-star' + (favs.indexOf(s.id) !== -1 ? ' on' : '') + '" title="' + (favs.indexOf(s.id) !== -1 ? 'Remove from favorites' : 'Add to favorites') + '" aria-label="Favorite">' + STAR + '</button>';
            const pick = () => { close(); if (opts && opts.insert) opts.insert(s); };
            card.addEventListener('click', (ev) => { if (ev.target.closest('.psl-star')) { api.toggle(s.id); ev.stopPropagation(); return; } pick(); });
            card.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.target.closest('.psl-star')) { ev.preventDefault(); pick(); } });
            grid.appendChild(card);
        });
        if (!list.length) {
            const n = document.createElement('div');
            n.className = 'psl-none';
            n.textContent = state.col === 'fav' ? 'No favorites yet! Press the star on a style to keep it here.' : 'No styles match that search!';
            grid.appendChild(n);
        } else if (list.length > state.shown) {
            const m = document.createElement('div');
            m.className = 'psl-more';
            m.innerHTML = '<button type="button">Show more (' + (list.length - state.shown) + ' left)</button>';
            m.firstChild.addEventListener('click', () => { state.shown += PAGE * 2; refresh(); });
            grid.appendChild(m);
        }
        grid.scrollTop = keepScroll;
    }
    function open(o) {
        opts = o || {};
        ensureCss();
        if (box) close();
        state = { q: '', col: favs.length ? 'fav' : 'all', shown: PAGE };
        box = document.createElement('div');
        box.className = 'psl-back';
        box.innerHTML = '<div class="psl-box" role="dialog" aria-modal="true" aria-label="Poolside Style Lookup"><div class="psl-head"><h3>Poolside Style Lookup</h3><button type="button" class="psl-x" aria-label="Close">×</button></div>' +
            '<div class="psl-tools"><input class="psl-q" type="search" placeholder="Search 2,250 Poolside styles (ripple, gold, tag, wave...)" autocomplete="off" spellcheck="false" aria-label="Search Poolside styles"></div>' +
            '<div class="psl-cols"></div><div class="psl-grid"></div>' +
            '<div class="psl-foot">Click a style to ' + (opts.verb || 'use it') + '. Star the ones you love: favorites are shared by every Radii Office app! In Poolside Keydown a style is written <b>&lt;style-id words&gt;</b>.</div></div>';
        document.body.appendChild(box);
        const q = box.querySelector('.psl-q');
        q.addEventListener('input', () => { state.q = q.value; state.shown = PAGE; refresh(); });
        box.querySelector('.psl-x').addEventListener('click', close);
        box.addEventListener('mousedown', (ev) => { if (ev.target === box) close(); });
        box.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } });
        refresh();
        setTimeout(() => q.focus(), 30);
    }
    function close() { if (box) { box.remove(); box = null; } }
})(window);
