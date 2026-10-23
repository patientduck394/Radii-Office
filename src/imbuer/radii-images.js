/* =====================================================================
   Radii Images! Search free pictures on Wikimedia Commons and insert
   them with the credit line each license asks for!
   Only CC0, CC BY and CC BY-SA files are shown, so every picture is free
   to reuse (BY and BY-SA need credit, which is added for you)!
   Each app keeps an identical copy of this file in its own folder!

   RadiiImages.open({ title, accent, onPick(res) })
   res = { url, dataUrl(), width, height, alt, title, author, license,
           licenseUrl, pageUrl, needsCredit, credit (plain text),
           creditHtml (with links) }
   ===================================================================== */
(function () {
    'use strict';
    const API = 'https://commons.wikimedia.org/w/api.php';
    const LICENSES = [['cc0', 'CC0', 'Public domain dedication'], ['by', 'CC BY', 'Credit the creator'], ['bysa', 'CC BY-SA', 'Credit + share alike']];
    let state = null;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function plain(html) { const d = document.createElement('div'); d.innerHTML = String(html || ''); return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
    function kindOf(short) {
        const s = String(short || '').trim();
        if (/^CC0\b/i.test(s) || /^Public domain dedication/i.test(s)) return 'cc0';
        if (/^CC[ -]BY[ -]SA\b/i.test(s)) return 'bysa';
        if (/^CC[ -]BY\b(?![ -](NC|ND))/i.test(s) && !/NC|ND/i.test(s)) return 'by';
        return null;
    }

    const CSS = '.ri-back{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:grid;place-items:center;padding:16px;backdrop-filter:blur(3px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '.ri-dlg{width:min(860px,100%);max-height:92vh;display:flex;flex-direction:column;background:#fff;color:#1e293b;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.4);overflow:hidden}' +
        '.ri-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;font-weight:800;font-size:15px;color:#fff;background:linear-gradient(180deg,var(--ri-a1,#38bdf8),var(--ri-a2,#0284c7))}' +
        '.ri-x{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:6px;width:28px;height:28px;font-size:16px;cursor:pointer}' +
        '.ri-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px 6px}' +
        '.ri-q{flex:1 1 240px;border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;font:inherit;font-size:14px;outline:none}' +
        '.ri-q:focus{border-color:var(--ri-a2,#0284c7);box-shadow:0 0 0 3px var(--ri-glow,rgba(2,132,199,.25))}' +
        '.ri-go{border:0;border-radius:9px;padding:9px 18px;font:inherit;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(180deg,var(--ri-a1,#38bdf8),var(--ri-a2,#0284c7));box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}' +
        '.ri-lic{display:flex;flex-wrap:wrap;gap:12px;padding:2px 16px 8px;font-size:12.5px;color:#475569}' +
        '.ri-lic label{display:flex;align-items:center;gap:5px;cursor:pointer}' +
        '.ri-body{flex:1;min-height:200px;overflow:auto;padding:4px 16px 12px}' +
        '.ri-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}' +
        '.ri-card{position:relative;border:2px solid transparent;border-radius:10px;overflow:hidden;background:#f1f5f9;padding:0;cursor:pointer;aspect-ratio:4/3;transition:transform .15s,box-shadow .15s}' +
        '.ri-card:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.18)}' +
        '.ri-card.on{border-color:var(--ri-a2,#0284c7);box-shadow:0 0 0 3px var(--ri-glow,rgba(2,132,199,.3))}' +
        '.ri-card img{width:100%;height:100%;object-fit:cover;display:block}' +
        '.ri-tag{position:absolute;left:6px;bottom:6px;font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;color:#fff;background:rgba(15,23,42,.75)}' +
        '.ri-msg{padding:36px 8px;text-align:center;color:#64748b;font-size:14px}' +
        '.ri-more{display:block;margin:12px auto 0;border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 18px;font:inherit;cursor:pointer}' +
        '.ri-foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid #e2e8f0;background:#f8fafc}' +
        '.ri-info{flex:1 1 280px;font-size:12px;color:#475569;line-height:1.4;min-height:34px}' +
        '.ri-info b{color:#0f172a}' +
        '.ri-info a{color:var(--ri-a2,#0284c7)}' +
        '.ri-act{display:flex;gap:8px;align-items:center}' +
        '.ri-act button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 16px;font:inherit;cursor:pointer}' +
        '.ri-act button.ri-ins{border:0;color:#fff;font-weight:700;background:linear-gradient(180deg,var(--ri-a1,#38bdf8),var(--ri-a2,#0284c7));box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}' +
        '.ri-act button:disabled{opacity:.45;cursor:default}' +
        '.ri-credit{display:flex;align-items:center;gap:5px;font-size:12px}' +
        '.ri-fine{padding:0 16px 10px;font-size:11px;color:#94a3b8}';

    function ensureCss() {
        if (document.getElementById('ri-css')) return;
        const s = document.createElement('style');
        s.id = 'ri-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function parse(page) {
        const ii = page.imageinfo && page.imageinfo[0];
        if (!ii || !ii.thumburl) return null;
        if (!/^image\/(jpeg|png|gif|webp)/.test(ii.mime || '')) return null;
        const m = ii.extmetadata || {};
        const short = (m.LicenseShortName && m.LicenseShortName.value) || '';
        const kind = kindOf(short);
        if (!kind) return null;
        const title = String(page.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
        const author = plain(m.Artist && m.Artist.value) || 'Unknown author';
        const lic = short.replace(/^CC[ -]BY/i, function (x) { return x.toUpperCase().replace(' ', ' '); });
        const licenseUrl = (m.LicenseUrl && m.LicenseUrl.value) || (kind === 'cc0' ? 'https://creativecommons.org/publicdomain/zero/1.0/' : '');
        const needs = kind !== 'cc0';
        const pageUrl = ii.descriptionurl || ('https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title));
        const credit = '"' + title + '" by ' + author + ' (Wikimedia Commons), ' + lic;
        const creditHtml = '&ldquo;<a href="' + esc(pageUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(title) + '</a>&rdquo; by ' + esc(author) + ' (Wikimedia Commons), ' +
            (licenseUrl ? '<a href="' + esc(licenseUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(lic) + '</a>' : esc(lic));
        const res = {
            thumb: ii.thumburl, url: ii.thumburl, width: ii.thumbwidth || 640, height: ii.thumbheight || 480,
            alt: plain(m.ImageDescription && m.ImageDescription.value).slice(0, 140) || title, title: title, author: author, license: lic, licenseUrl: licenseUrl,
            pageUrl: pageUrl, kind: kind, needsCredit: needs, credit: credit, creditHtml: creditHtml
        };
        // Embeds the picture so it still shows offline and in exports!
        res.dataUrl = function () {
            return fetch(res.url, { mode: 'cors' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(function (b) {
                return new Promise(function (ok, no) { const fr = new FileReader(); fr.onload = function () { ok(String(fr.result)); }; fr.onerror = no; fr.readAsDataURL(b); });
            }).catch(function () { return res.url; });
        };
        return res;
    }

    function search() {
        const st = state;
        const q = st.q.trim();
        if (!q) return;
        const kinds = st.kinds;
        const seq = ++st.seq;
        const url = API + '?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=50&gsroffset=' + st.offset +
            '&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') + '&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=640' +
            '&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|ImageDescription';
        st.busy = true;
        draw();
        fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
            if (seq !== st.seq || !state) return;
            const pages = Object.keys((j.query && j.query.pages) || {}).map(function (k) { return j.query.pages[k]; }).sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
            pages.forEach(function (p) { const r = parse(p); if (r && st.items.every(function (x) { return x.pageUrl !== r.pageUrl; })) st.items.push(r); });
            st.next = j.continue && j.continue.gsroffset != null ? j.continue.gsroffset : null;
            st.busy = false;
            st.err = '';
            st.searched = true;
            // A page of results with nothing reusable? Keep digging a little!
            if (!st.items.some(function (r) { return kinds[r.kind]; }) && st.next != null && st.auto++ < 3) { st.offset = st.next; search(); return; }
            draw();
        }).catch(function (e) {
            if (seq !== st.seq || !state) return;
            st.busy = false;
            st.err = 'Could not reach Wikimedia Commons (' + (e && e.message ? e.message : 'offline') + '). Check your connection and try again!';
            draw();
        });
    }

    function draw() {
        const st = state;
        if (!st) return;
        const body = st.el.querySelector('.ri-body');
        const shown = st.items.filter(function (r) { return st.kinds[r.kind]; });
        let h = '';
        if (st.err) h = '<p class="ri-msg">' + esc(st.err) + '</p>';
        else if (!st.searched && !st.busy) h = '<p class="ri-msg">Search for anything: &ldquo;sunset&rdquo;, &ldquo;red panda&rdquo;, &ldquo;city map&rdquo;!<br>Every result is CC0, CC BY or CC BY-SA!</p>';
        else if (st.busy && !shown.length) h = '<p class="ri-msg">Searching Wikimedia Commons…</p>';
        else if (!shown.length) h = '<p class="ri-msg">No reusable pictures matched that search! Try another word or turn on more licenses!</p>';
        else {
            h = '<div class="ri-grid">' + shown.map(function (r, i) {
                return '<button type="button" class="ri-card' + (st.sel === r ? ' on' : '') + '" data-i="' + st.items.indexOf(r) + '" title="' + esc(r.title) + '"><img loading="lazy" src="' + esc(r.thumb) + '" alt="' + esc(r.alt) + '"><span class="ri-tag">' + esc(r.license) + '</span></button>';
            }).join('') + '</div>';
            if (st.next != null) h += '<button type="button" class="ri-more">' + (st.busy ? 'Loading…' : 'Load more') + '</button>';
        }
        body.innerHTML = h;
        const r = st.sel;
        st.el.querySelector('.ri-info').innerHTML = r ? '<b>' + esc(r.title) + '</b><br>' + r.creditHtml : 'Click a picture to see who made it and how it is licensed!';
        const cr = st.el.querySelector('.ri-cr');
        cr.checked = r ? (r.needsCredit ? true : st.credit) : st.credit;
        cr.disabled = !!(r && r.needsCredit);
        st.el.querySelector('.ri-credit span').textContent = r && r.needsCredit ? 'Credit line (required by ' + r.license + ')' : 'Add a credit line';
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
        el.innerHTML = '<div class="ri-dlg" role="dialog" aria-label="Online pictures"><div class="ri-head"><span>' + esc(opts.title || 'Online Pictures') + '</span><button type="button" class="ri-x" title="Close">✕</button></div>' +
            '<form class="ri-bar"><input class="ri-q" type="search" placeholder="Search free pictures…" autocomplete="off" spellcheck="false"><button type="submit" class="ri-go">Search</button></form>' +
            '<div class="ri-lic">' + LICENSES.map(function (l) { return '<label title="' + l[2] + '"><input type="checkbox" data-k="' + l[0] + '" checked> ' + l[1] + '</label>'; }).join('') + '</div>' +
            '<div class="ri-body"></div><div class="ri-fine">Pictures come from Wikimedia Commons. Always check the license shown under a picture!</div>' +
            '<div class="ri-foot"><div class="ri-info"></div><div class="ri-act"><label class="ri-credit"><input type="checkbox" class="ri-cr" checked><span></span></label><button type="button" class="ri-cancel">Cancel</button><button type="button" class="ri-ins" disabled>Insert picture</button></div></div></div>';
        document.body.appendChild(el);
        state = { el: el, opts: opts, q: opts.query || '', kinds: { cc0: true, by: true, bysa: true }, items: [], offset: 0, next: null, seq: 0, auto: 0, sel: null, credit: true, busy: false, err: '', searched: false, inserting: false };
        const q = el.querySelector('.ri-q');
        q.value = state.q;
        state.key = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
        document.addEventListener('keydown', state.key, true);
        el.addEventListener('mousedown', function (e) { if (e.target === el) close(); });
        el.querySelector('.ri-x').addEventListener('click', close);
        el.querySelector('.ri-cancel').addEventListener('click', close);
        el.querySelector('.ri-bar').addEventListener('submit', function (e) {
            e.preventDefault();
            state.q = q.value;
            state.items = []; state.offset = 0; state.next = null; state.sel = null; state.auto = 0;
            search();
        });
        el.querySelector('.ri-lic').addEventListener('change', function (e) { state.kinds[e.target.dataset.k] = e.target.checked; if (state.sel && !state.kinds[state.sel.kind]) state.sel = null; draw(); });
        el.querySelector('.ri-cr').addEventListener('change', function (e) { state.credit = e.target.checked; });
        el.querySelector('.ri-body').addEventListener('click', function (e) {
            if (e.target.closest('.ri-more')) { if (!state.busy && state.next != null) { state.offset = state.next; state.auto = 0; search(); } return; }
            const c = e.target.closest('.ri-card');
            if (c) { state.sel = state.items[+c.dataset.i]; draw(); }
        });
        el.querySelector('.ri-body').addEventListener('dblclick', function (e) { if (e.target.closest('.ri-card')) el.querySelector('.ri-ins').click(); });
        el.querySelector('.ri-ins').addEventListener('click', function () {
            const r = state.sel;
            if (!r || state.inserting) return;
            state.inserting = true;
            draw();
            const withCredit = r.needsCredit || state.credit;
            const done = function (data) {
                const cb = state.opts.onPick;
                close();
                if (cb) cb(Object.assign({}, r, { dataUrl: function () { return Promise.resolve(data); }, loaded: data, withCredit: withCredit }));
            };
            if (state.opts.hotlink) done(r.url); else r.dataUrl().then(done);
        });
        draw();
        setTimeout(function () { q.focus(); }, 30);
        if (state.q) search();
    }

    window.RadiiImages = { open: open, close: close, kindOf: kindOf };
})();
