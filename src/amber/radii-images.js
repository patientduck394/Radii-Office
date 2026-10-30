/* =====================================================================
   Radii Images: OpenDB Images! Browse and search the pictures in OpenDB,
   Radii Office's own free database, and insert one!
   Everything in OpenDB is CC0 (public domain), so no credit is needed;
   a source line can still be added if you like.
   Each app keeps an identical copy of this file in its own folder!

   RadiiImages.open({ title, accent, accent2, glow, hotlink, query, onPick(res) })
   res = { url, dataUrl(), loaded, width, height, alt, title, author, license,
           licenseUrl, pageUrl, needsCredit (always false), withCredit,
           credit (plain text), creditHtml (with links) }
   ===================================================================== */
(function () {
    'use strict';
    // OpenDB sits next to the apps: /opendb/ beside /writeout/, /amber/ and the rest
    const BASE = new URL('../opendb/', (document.currentScript && document.currentScript.src) || location.href).href;
    const INDEX = BASE + 'data/index.json';
    const CC0_URL = 'https://creativecommons.org/publicdomain/zero/1.0/';
    let state = null;
    let cache = null;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    const norm = function (s) { return String(s || '').toLowerCase(); };

    const CSS = '.ri-back{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:grid;place-items:center;padding:16px;backdrop-filter:blur(3px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '.ri-dlg{width:min(860px,100%);max-height:92vh;display:flex;flex-direction:column;background:#fff;color:#1e293b;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.4);overflow:hidden}' +
        '.ri-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;font-weight:800;font-size:15px;color:#fff;background:linear-gradient(180deg,var(--ri-a1,#38bdf8),var(--ri-a2,#0284c7))}' +
        '.ri-x{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:6px;width:28px;height:28px;font-size:16px;cursor:pointer}' +
        '.ri-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px 6px}' +
        '.ri-q{flex:1 1 240px;border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;font:inherit;font-size:14px;outline:none}' +
        '.ri-q:focus{border-color:var(--ri-a2,#0284c7);box-shadow:0 0 0 3px var(--ri-glow,rgba(2,132,199,.25))}' +
        '.ri-go{border:0;border-radius:9px;padding:9px 18px;font:inherit;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(180deg,var(--ri-a1,#38bdf8),var(--ri-a2,#0284c7));box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}' +
        '.ri-tags{display:flex;flex-wrap:wrap;gap:6px;padding:2px 16px 8px}' +
        '.ri-tagbtn{border:1px solid #cbd5e1;background:#f8fafc;color:#475569;border-radius:999px;padding:3px 10px;font:inherit;font-size:12px;cursor:pointer}' +
        '.ri-tagbtn.on{border-color:transparent;color:#fff;background:linear-gradient(180deg,var(--ri-a1,#38bdf8),var(--ri-a2,#0284c7))}' +
        '.ri-body{flex:1;min-height:200px;overflow:auto;padding:4px 16px 12px}' +
        '.ri-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}' +
        '.ri-card{position:relative;border:2px solid transparent;border-radius:10px;overflow:hidden;background:#f1f5f9;padding:0;cursor:pointer;aspect-ratio:4/3;transition:transform .15s,box-shadow .15s}' +
        '.ri-card:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.18)}' +
        '.ri-card.on{border-color:var(--ri-a2,#0284c7);box-shadow:0 0 0 3px var(--ri-glow,rgba(2,132,199,.3))}' +
        '.ri-card img{width:100%;height:100%;object-fit:contain;display:block;background:#fff}' +
        '.ri-tag{position:absolute;left:6px;bottom:6px;max-width:calc(100% - 12px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;color:#fff;background:rgba(15,23,42,.75)}' +
        '.ri-msg{padding:36px 8px;text-align:center;color:#64748b;font-size:14px}' +
        '.ri-foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid #e2e8f0;background:#f8fafc}' +
        '.ri-info{flex:1 1 280px;font-size:12px;color:#475569;line-height:1.4;min-height:34px}' +
        '.ri-info b{color:#0f172a}' +
        '.ri-info a{color:var(--ri-a2,#0284c7)}' +
        '.ri-act{display:flex;gap:8px;align-items:center}' +
        '.ri-act button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 16px;font:inherit;cursor:pointer}' +
        '.ri-act button.ri-ins{border:0;color:#fff;font-weight:700;background:linear-gradient(180deg,var(--ri-a1,#38bdf8),var(--ri-a2,#0284c7));box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}' +
        '.ri-act button:disabled{opacity:.45;cursor:default}' +
        '.ri-credit{display:flex;align-items:center;gap:5px;font-size:12px}' +
        '.ri-fine{padding:0 16px 10px;font-size:11px;color:#94a3b8}' +
        '.ri-fine a{color:inherit}';

    function ensureCss() {
        if (document.getElementById('ri-css')) return;
        const s = document.createElement('style');
        s.id = 'ri-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    // One OpenDB picture entry -> what the apps get when it is picked
    function toResult(e) {
        const url = new URL('data/' + e.file, BASE).href;
        const pageUrl = BASE + 'index.html#/e/' + encodeURIComponent(e.id);
        const author = (e.authors && e.authors.length ? e.authors.join(', ') : 'OpenDB contributors');
        const res = {
            id: e.id, thumb: url, url: url, width: e.width || 800, height: e.height || 600,
            alt: e.summary || e.title, title: e.title, author: author, license: 'CC0', licenseUrl: CC0_URL,
            pageUrl: pageUrl, kind: 'cc0', needsCredit: false, tags: e.tags || [],
            credit: '"' + e.title + '" from OpenDB (CC0)',
            creditHtml: '&ldquo;<a href="' + esc(pageUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(e.title) + '</a>&rdquo; from OpenDB (<a href="' + CC0_URL + '" target="_blank" rel="noopener noreferrer">CC0</a>)',
            hay: norm([e.title, e.summary, (e.tags || []).join(' '), e.body].join(' '))
        };
        // Embeds the picture so it still shows offline and in exports!
        res.dataUrl = function () {
            return fetch(res.url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(function (b) {
                return new Promise(function (ok, no) { const fr = new FileReader(); fr.onload = function () { ok(String(fr.result)); }; fr.onerror = no; fr.readAsDataURL(b); });
            }).catch(function () { return res.url; });
        };
        return res;
    }
    const isPicture = function (e) {
        return e && e.type === 'media' && e.file && (/^image\//.test(e.mime || '') || /\.(png|jpe?g|gif|webp|svg)$/i.test(e.file));
    };

    function load() {
        if (cache) return Promise.resolve(cache);
        return fetch(INDEX).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
            cache = (j.entries || []).filter(isPicture).map(toResult).sort(function (a, b) { return a.title.localeCompare(b.title); });
            return cache;
        });
    }

    // every word has to match the title, summary, tags or description
    function shown() {
        const st = state;
        const words = norm(st.q).split(/\s+/).filter(Boolean);
        return st.items.filter(function (r) {
            return (!st.tag || r.tags.indexOf(st.tag) !== -1) && words.every(function (w) { return r.hay.indexOf(w) !== -1; });
        });
    }

    function draw() {
        const st = state;
        if (!st) return;
        const body = st.el.querySelector('.ri-body');
        const list = shown();
        let h = '';
        if (st.err) h = '<p class="ri-msg">' + esc(st.err) + '</p>';
        else if (st.busy) h = '<p class="ri-msg">Opening OpenDB…</p>';
        else if (!st.items.length) h = '<p class="ri-msg">OpenDB has no pictures yet! Add one at OpenDB and it will show up here!</p>';
        else if (!list.length) h = '<p class="ri-msg">No OpenDB picture matched that! Try another word!</p>';
        else h = '<div class="ri-grid">' + list.map(function (r) {
            return '<button type="button" class="ri-card' + (st.sel === r ? ' on' : '') + '" data-i="' + st.items.indexOf(r) + '" title="' + esc(r.title) + '"><img loading="lazy" src="' + esc(r.thumb) + '" alt="' + esc(r.alt) + '"><span class="ri-tag">' + esc(r.title) + '</span></button>';
        }).join('') + '</div>';
        body.innerHTML = h;
        // tag filters, from the tags the pictures use
        const tags = [];
        st.items.forEach(function (r) { r.tags.forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); }); });
        st.el.querySelector('.ri-tags').innerHTML = tags.length ? ['<button type="button" class="ri-tagbtn' + (!st.tag ? ' on' : '') + '" data-tag="">All</button>'].concat(tags.sort().map(function (t) {
            return '<button type="button" class="ri-tagbtn' + (st.tag === t ? ' on' : '') + '" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
        })).join('') : '';
        const r = st.sel;
        st.el.querySelector('.ri-info').innerHTML = r ? '<b>' + esc(r.title) + '</b><br>' + esc(r.alt) + '<br>' + r.creditHtml : 'Click a picture to see what it is! Everything in OpenDB is CC0: free to use, no credit needed!';
        st.el.querySelector('.ri-ins').disabled = !r || st.inserting;
        st.el.querySelector('.ri-ins').textContent = st.inserting ? 'Inserting…' : 'Insert picture';
    }

    function close() {
        if (!state) return;
        document.removeEventListener('keydown', state.key, true);
        state.el.remove();
        state = null;
    }

    function open(opts) {
        opts = opts || {};
        close();
        ensureCss();
        const el = document.createElement('div');
        el.className = 'ri-back';
        if (opts.accent) {
            el.style.setProperty('--ri-a2', opts.accent);
            el.style.setProperty('--ri-a1', opts.accent2 || opts.accent);
            el.style.setProperty('--ri-glow', opts.glow || 'rgba(100,100,100,.3)');
        }
        el.innerHTML = '<div class="ri-dlg" role="dialog" aria-label="OpenDB Images"><div class="ri-head"><span>' + esc(opts.title || 'OpenDB Images') + '</span><button type="button" class="ri-x" title="Close">✕</button></div>' +
            '<form class="ri-bar"><input class="ri-q" type="search" placeholder="Search OpenDB pictures…" autocomplete="off" spellcheck="false"><button type="submit" class="ri-go">Search</button></form>' +
            '<div class="ri-tags"></div>' +
            '<div class="ri-body"></div><div class="ri-fine">Pictures come from <a href="' + esc(BASE) + 'index.html#/browse/media" target="_blank" rel="noopener">OpenDB</a>, where everything is dedicated to the public domain under CC0!</div>' +
            '<div class="ri-foot"><div class="ri-info"></div><div class="ri-act"><label class="ri-credit" title="Optional: OpenDB pictures need no credit"><input type="checkbox" class="ri-cr"><span>Add a source line</span></label><button type="button" class="ri-cancel">Cancel</button><button type="button" class="ri-ins" disabled>Insert picture</button></div></div></div>';
        document.body.appendChild(el);
        state = { el: el, opts: opts, q: opts.query || '', tag: '', items: [], sel: null, credit: false, busy: true, err: '', inserting: false };
        const q = el.querySelector('.ri-q');
        q.value = state.q;
        state.key = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
        document.addEventListener('keydown', state.key, true);
        el.addEventListener('mousedown', function (e) { if (e.target === el) close(); });
        el.querySelector('.ri-x').addEventListener('click', close);
        el.querySelector('.ri-cancel').addEventListener('click', close);
        // the list filters as you type
        el.querySelector('.ri-bar').addEventListener('submit', function (e) { e.preventDefault(); state.q = q.value; draw(); });
        q.addEventListener('input', function () { state.q = q.value; if (state.sel && shown().indexOf(state.sel) === -1) state.sel = null; draw(); });
        el.querySelector('.ri-tags').addEventListener('click', function (e) {
            const b = e.target.closest('.ri-tagbtn');
            if (!b) return;
            state.tag = b.getAttribute('data-tag');
            if (state.sel && shown().indexOf(state.sel) === -1) state.sel = null;
            draw();
        });
        el.querySelector('.ri-cr').addEventListener('change', function (e) { state.credit = e.target.checked; });
        el.querySelector('.ri-body').addEventListener('click', function (e) {
            const c = e.target.closest('.ri-card');
            if (c) { state.sel = state.items[+c.dataset.i]; draw(); }
        });
        el.querySelector('.ri-body').addEventListener('dblclick', function (e) { if (e.target.closest('.ri-card')) el.querySelector('.ri-ins').click(); });
        el.querySelector('.ri-ins').addEventListener('click', function () {
            const r = state.sel;
            if (!r || state.inserting) return;
            state.inserting = true;
            draw();
            const withCredit = state.credit;
            const done = function (data) {
                const cb = state.opts.onPick;
                close();
                if (cb) cb(Object.assign({}, r, { dataUrl: function () { return Promise.resolve(data); }, loaded: data, withCredit: withCredit }));
            };
            if (state.opts.hotlink) done(r.url); else r.dataUrl().then(done);
        });
        draw();
        load().then(function (items) {
            if (!state || state.el !== el) return;
            state.items = items;
            state.busy = false;
            draw();
        }).catch(function (e) {
            if (!state || state.el !== el) return;
            state.busy = false;
            state.err = 'Could not reach OpenDB (' + (e && e.message ? e.message : 'offline') + '). Check your connection and try again!';
            draw();
        });
        setTimeout(function () { q.focus(); }, 30);
    }

    window.RadiiImages = { open: open, close: close };
})();
