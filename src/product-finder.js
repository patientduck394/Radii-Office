// The "Find an app" bar on the Products page! Plain JavaScript, no build step!
// It reads the product cards that are already on the page, so adding a card to products.html is all it takes.
(function () {
    'use strict';

    const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

    // Every word has to match somewhere; the title counts most, then the badge, then the description.
    function score(c, words) {
        let s = 0;
        for (const w of words) {
            if (c.title.includes(w)) s += 10;
            else if (c.badge.includes(w)) s += 5;
            else if (c.text.includes(w)) s += 1;
            else return null;
        }
        return s;
    }

    const CSS = `.rf-finder{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 auto 22px;max-width:1100px}
.rf-search{flex:1 1 260px;min-width:0;font:inherit;font-size:15px;padding:11px 16px;border-radius:999px;border:1px solid rgba(56,189,248,.45);background:rgba(15,23,42,.65);color:#e2e8f0;outline:none;box-shadow:inset 0 1px 3px rgba(0,0,0,.4)}
.rf-search::placeholder{color:#94a3b8}
.rf-search:focus{border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.25)}
.rf-count{font-size:13px;color:#bae6fd;white-space:nowrap}
.rf-chips{display:flex;flex-wrap:wrap;gap:6px;flex-basis:100%}
.rf-chip{font:inherit;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;border:1px solid rgba(56,189,248,.35);background:rgba(15,23,42,.6);color:#bae6fd;cursor:pointer}
.rf-chip:hover{border-color:#38bdf8}
.rf-chip[aria-pressed="true"]{background:linear-gradient(180deg,#38bdf8,#0369a1);color:#fff;border-color:transparent}
.rf-empty{grid-column:1/-1;text-align:center;padding:30px;color:#bae6fd}
.rf-hide{display:none!important}`;

    function start() {
        const grid = document.querySelector('.product-grid');
        if (!grid) return;
        const textOf = (el, sel) => { const e = el.querySelector(sel); return e ? e.textContent : ''; };
        // archived cards stay in the Archives dropdown; a search that finds one opens it!
        const archives = document.getElementById('archives');
        const cards = Array.from(document.querySelectorAll('.product-card')).map((el) => {
            const badge = textOf(el, '.badge-btn').trim();
            return { el: el, home: el.parentNode, title: norm(textOf(el, '.product-title')), badge: norm(badge), badgeLabel: badge, text: norm(el.textContent) };
        });

        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        const bar = document.createElement('div');
        bar.className = 'rf-finder';
        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'rf-search';
        search.placeholder = 'Find an app… (press / to search)';
        search.setAttribute('aria-label', 'Find an app');
        const count = document.createElement('span');
        count.className = 'rf-count';
        count.setAttribute('aria-live', 'polite');
        const chips = document.createElement('div');
        chips.className = 'rf-chips';
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'Filter by kind');
        bar.appendChild(search);
        bar.appendChild(count);
        bar.appendChild(chips);
        grid.parentNode.insertBefore(bar, grid);
        const empty = document.createElement('p');
        empty.className = 'rf-empty rf-hide';
        empty.textContent = 'No app matches that! Try another word!';
        grid.appendChild(empty);

        let chip = '';
        const labels = [''].concat(cards.map((c) => c.badgeLabel).filter((l, i, all) => l && all.indexOf(l) === i));
        const chipButtons = labels.map((label) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'rf-chip';
            b.textContent = label || 'All';
            b.setAttribute('aria-pressed', String(label === chip));
            chips.appendChild(b);
            return [label, b];
        });

        function render() {
            const words = norm(search.value).split(' ').filter(Boolean);
            const hits = [];
            cards.forEach((c) => {
                const s = score(c, words);
                if (s !== null && (!chip || c.badge === norm(chip))) hits.push([c, s]);
            });
            const shown = new Set(hits.map((h) => h[0]));
            cards.forEach((c) => c.el.classList.toggle('rf-hide', !shown.has(c)));
            // best matches first while searching; the page's own order otherwise
            const place = (c) => (c.home === grid ? grid.insertBefore(c.el, empty) : c.home.appendChild(c.el));
            if (words.length) hits.slice().sort((a, b) => b[1] - a[1]).forEach(([c]) => place(c));
            else cards.forEach(place);
            if (archives) {
                const archived = cards.filter((c) => c.home !== grid);
                archives.classList.toggle('rf-hide', archived.length > 0 && !archived.some((c) => shown.has(c)));
                if (words.length && archived.some((c) => shown.has(c))) archives.open = true;
            }
            empty.classList.toggle('rf-hide', shown.size > 0);
            count.textContent = shown.size === cards.length ? cards.length + ' apps' : shown.size + ' of ' + cards.length + ' apps';
            chipButtons.forEach(([label, b]) => b.setAttribute('aria-pressed', String(label === chip)));
        }

        chipButtons.forEach(([label, b]) => b.addEventListener('click', () => { chip = label; render(); }));
        search.addEventListener('input', render);
        search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { search.value = ''; render(); } });
        document.addEventListener('keydown', (e) => {
            const t = e.target;
            const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
            if (e.key === '/' && !typing) { e.preventDefault(); search.focus(); }
        });
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
