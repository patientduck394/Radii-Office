/* =====================================================================
   Keydown Guide! Opens the Keydown article from OpenDB (the same text, always
   up to date) in a window, drawn with Writeout's own Keydown, so every style
   in it looks the way it will in your page. Search it, jump by heading.
   The article is fetched from OpenDB (opendb/data/entries/keydown.kd, or from
   radii-office.com when this copy runs from a file or the desktop app) and
   kept on this device, so the Guide still opens offline after the first time!
   ===================================================================== */
(function () {
    'use strict';
    const REL = '../opendb/data/entries/keydown.kd';
    const ABS = 'https://radii-office.com/opendb/data/entries/keydown.kd';
    const CK = 'writeout_keydown_guide_v1';
    let text = null, back = null;

    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function strip(src) { return String(src).replace(/\r/g, '').replace(/^---\n[\s\S]*?\n---\n/, ''); }

    function load() {
        if (text) return Promise.resolve(text);
        const grab = (u) => fetch(u, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); });
        return grab(REL).catch(() => grab(ABS)).then((t) => {
            text = strip(t);
            try { localStorage.setItem(CK, text); } catch (e) { /* too big or blocked: fine */ }
            return text;
        }).catch((err) => {
            let kept = null;
            try { kept = localStorage.getItem(CK); } catch (e) {}
            if (kept) { text = kept; return text; }
            throw err;
        });
    }

    const CSS = '.kg-back{position:fixed;inset:0;z-index:2147482000;background:rgba(15,23,42,.5);display:grid;place-items:center;padding:14px;backdrop-filter:blur(3px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '.kg-dlg{color-scheme:light;width:min(1100px,100%);height:min(86vh,860px);display:flex;flex-direction:column;background:var(--kg-bg,#fff);color:var(--kg-ink,#10243a);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.4);overflow:hidden}' +
        '.kg-head{display:flex;align-items:center;gap:12px;padding:10px 14px;color:#fff;background:linear-gradient(180deg,var(--kg-a1,#38bdf8),var(--kg-a2,#0284c7));font-weight:800;font-size:15px}' +
        '.kg-head b{white-space:nowrap}.kg-head input{flex:1;min-width:0;border:0;border-radius:999px;padding:7px 14px;font:14px system-ui,sans-serif;color:#10243a;background:rgba(255,255,255,.95)}' +
        '.kg-x{border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:6px;width:28px;height:28px;font-size:15px;cursor:pointer}' +
        '.kg-main{flex:1;display:flex;min-height:0}.kg-toc{flex:0 0 220px;overflow:auto;padding:10px 6px;border-right:1px solid rgba(100,116,139,.25);font-size:13px}' +
        '.kg-toc a{display:block;padding:4px 10px;border-radius:6px;color:inherit;text-decoration:none;cursor:pointer;line-height:1.3}.kg-toc a:hover{background:rgba(2,132,199,.12)}' +
        '.kg-body{flex:1;overflow:auto;padding:6px 26px 30px;font-size:15px;line-height:1.55}' +
        '.kg-body h2{font-size:22px;margin:26px 0 8px;padding-bottom:4px;border-bottom:1px solid rgba(100,116,139,.3)}.kg-body ul{padding-left:22px}.kg-body li{margin:3px 0}' +
        '.kg-body code{font:12.5px ui-monospace,Menlo,Consolas,monospace;background:rgba(100,116,139,.16);border-radius:5px;padding:1px 5px}' +
        '.kg-msg{padding:40px;text-align:center;color:#64748b}.kg-foot{padding:6px 14px;font-size:11px;color:#64748b;border-top:1px solid rgba(100,116,139,.25)}.kg-foot a{color:inherit}' +
        '.kg-hide{display:none!important}' +
        '@media (max-width:760px){.kg-toc{display:none}.kg-body{padding:6px 16px 24px}}';

    function close() { if (back) { document.removeEventListener('keydown', onKey, true); back.remove(); back = null; } }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }

    // split the article at its "## " headings so each section can be searched and jumped to
    function sections(src) {
        const parts = [], lines = src.split('\n');
        let cur = { title: 'Introduction', lines: [] };
        let fence = false;
        lines.forEach((l) => {
            if (/^```/.test(l.trim())) fence = !fence;
            const m = !fence && /^##\s+(.+)/.exec(l);
            if (m) { parts.push(cur); cur = { title: m[1].trim(), lines: [] }; }
            cur.lines.push(l);
        });
        parts.push(cur);
        return parts.filter((p) => p.lines.join('').trim());
    }

    function draw(src, box, toc, q) {
        const secs = sections(src);
        box.innerHTML = '';
        toc.innerHTML = '';
        let shown = 0;
        secs.forEach((s, i) => {
            const body = s.lines.join('\n');
            if (q && body.toLowerCase().indexOf(q) === -1) return;
            shown++;
            const sec = document.createElement('section');
            sec.id = 'kg-s' + i;
            let html = '';
            try { html = window.kdDoc && kdDoc.textToHtml ? kdDoc.textToHtml(body, { notes: {} }) : '<pre>' + esc(body) + '</pre>'; } catch (e) { html = '<pre>' + esc(body) + '</pre>'; }
            sec.innerHTML = html;
            box.appendChild(sec);
            const a = document.createElement('a');
            a.textContent = s.title;
            a.addEventListener('click', () => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            toc.appendChild(a);
        });
        if (!shown) box.innerHTML = '<p class="kg-msg">Nothing in the Guide matches that! Try another word!</p>';
        // styles drawn in the page need their helpers (Unique Styles, Keydown Next blocks)
        try { if (typeof kdEnsureUniqueStyles === 'function') kdEnsureUniqueStyles(); } catch (e) {}
        try { if (window.KeydownNext && KeydownNext.run) KeydownNext.run(box); } catch (e) {}
    }

    function open(opts) {
        opts = opts || {};
        close();
        if (!document.getElementById('kg-css')) { const st = document.createElement('style'); st.id = 'kg-css'; st.textContent = CSS; document.head.appendChild(st); }
        back = document.createElement('div');
        back.className = 'kg-back';
        const acc = getComputedStyle(document.body).getPropertyValue('--os-accent').trim();
        if (acc) { back.style.setProperty('--kg-a2', acc); back.style.setProperty('--kg-a1', 'color-mix(in srgb,' + acc + ' 60%,#fff)'); }
        back.innerHTML = '<div class="kg-dlg" role="dialog" aria-label="Keydown Guide"><div class="kg-head"><b>Keydown Guide</b><input type="search" placeholder="Search every style, tag and rule" aria-label="Search the Guide"><button type="button" class="kg-x" title="Close">✕</button></div>' +
            '<div class="kg-main"><nav class="kg-toc"></nav><div class="kg-body kd-doc"><p class="kg-msg">Fetching the Guide from OpenDB!</p></div></div>' +
            '<div class="kg-foot">This is the OpenDB article <a href="../opendb/index.html#/e/keydown" target="_blank" rel="noopener">Keydown</a>, public domain (CC0), shown here with Writeout\'s own Keydown!</div></div>';
        document.body.appendChild(back);
        document.addEventListener('keydown', onKey, true);
        back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
        back.querySelector('.kg-x').addEventListener('click', close);
        const box = back.querySelector('.kg-body'), toc = back.querySelector('.kg-toc'), inp = back.querySelector('input');
        load().then((src) => {
            if (!back) return;
            draw(src, box, toc, '');
            let t;
            inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => draw(src, box, toc, inp.value.trim().toLowerCase()), 160); });
            if (opts.q) { inp.value = opts.q; draw(src, box, toc, String(opts.q).toLowerCase()); }
            inp.focus();
        }).catch(() => {
            if (box) box.innerHTML = '<p class="kg-msg">The Guide could not be fetched! It needs an internet connection the first time (it is kept for offline use after that). Close this and try again!</p>';
        });
    }

    window.openKeydownGuide = open;
    document.addEventListener('DOMContentLoaded', () => {
        const hb = document.getElementById('help-deck-btn');
        if (hb && !document.getElementById('keydown-guide-btn')) {
            const b = document.createElement('button');
            b.id = 'keydown-guide-btn'; b.className = hb.className; b.textContent = 'Keydown Guide';
            b.addEventListener('click', () => open());
            hb.insertAdjacentElement('afterend', b);
        }
    });
})();
