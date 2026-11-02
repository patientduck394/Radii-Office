<script>
    import { untrack } from 'svelte';
    // The "Find an app" bar on the Products page! It reads the product cards already on the page,
    // so adding a card to products.html is all it takes! Every word has to match somewhere:
    // the title counts most, then the badge, then the description!
    // (the grid and the Archives dropdown are the page's own elements: they never change)
    const props = $props();
    const grid = untrack(() => props.grid), archives = untrack(() => props.archives);

    const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    const textOf = (el, sel) => { const e = el.querySelector(sel); return e ? e.textContent : ''; };
    const cards = Array.from(document.querySelectorAll('.product-card')).map((el) => {
        const badge = textOf(el, '.badge-btn').trim();
        return { el, home: el.parentNode, title: norm(textOf(el, '.product-title')), badge: norm(badge), badgeLabel: badge, text: norm(el.textContent) };
    });
    const labels = [''].concat(cards.map((c) => c.badgeLabel).filter((l, i, all) => l && all.indexOf(l) === i));

    let query = $state('');
    let chip = $state('');
    let search;

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

    const words = $derived(norm(query).split(' ').filter(Boolean));
    const hits = $derived(cards.map((c) => [c, score(c, words)]).filter(([c, s]) => s !== null && (!chip || c.badge === norm(chip))));
    const shown = $derived(new Set(hits.map((h) => h[0])));

    // An empty-results note at the end of the grid (the cards themselves stay plain HTML)!
    const empty = document.createElement('p');
    empty.className = 'rf-empty';
    empty.textContent = 'No app matches that! Try another word!';
    grid.appendChild(empty);

    // Show, hide and order the cards whenever the search or the chip changes!
    $effect(() => {
        cards.forEach((c) => { c.el.style.display = shown.has(c) ? '' : 'none'; });
        // best matches first while searching; the page's own order otherwise (archived cards stay in the Archives dropdown)
        const place = (c) => (c.home === grid ? grid.insertBefore(c.el, empty) : c.home.appendChild(c.el));
        if (words.length) hits.slice().sort((a, b) => b[1] - a[1]).forEach(([c]) => place(c));
        else cards.forEach(place);
        if (archives) {
            const archived = cards.filter((c) => c.home !== grid);
            archives.style.display = archived.length > 0 && !archived.some((c) => shown.has(c)) ? 'none' : '';
            // a search that finds an archived app opens the dropdown!
            if (words.length && archived.some((c) => shown.has(c))) archives.open = true;
        }
        empty.style.display = shown.size ? 'none' : '';
    });

    // Press / anywhere (outside a text box) to jump to the search!
    function onKey(e) {
        const t = e.target;
        const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (e.key === '/' && !typing) { e.preventDefault(); search.focus(); }
    }
</script>

<svelte:document onkeydown={onKey} />

<div class="rf-finder">
    <input type="search" class="rf-search" placeholder="Find an app… (press / to search)" aria-label="Find an app"
        bind:this={search} bind:value={query} onkeydown={(e) => { if (e.key === 'Escape') query = ''; }} />
    <span class="rf-count" aria-live="polite">{shown.size === cards.length ? cards.length + ' apps' : shown.size + ' of ' + cards.length + ' apps'}</span>
    <div class="rf-chips" role="group" aria-label="Filter by kind">
        {#each labels as label (label)}
            <button type="button" class="rf-chip" aria-pressed={label === chip} onclick={() => (chip = label)}>{label || 'All'}</button>
        {/each}
    </div>
</div>

<style>
    .rf-finder { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 0 auto 22px; max-width: 1100px; }
    .rf-search {
        flex: 1 1 260px; min-width: 0; font: inherit; font-size: 15px; padding: 11px 16px; border-radius: 999px;
        border: 1px solid rgba(56, 189, 248, 0.45); background: rgba(15, 23, 42, 0.65); color: #e2e8f0; outline: none;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
    }
    .rf-search::placeholder { color: #94a3b8; }
    .rf-search:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25); }
    .rf-count { font-size: 13px; color: #bae6fd; white-space: nowrap; }
    .rf-chips { display: flex; flex-wrap: wrap; gap: 6px; flex-basis: 100%; }
    .rf-chip {
        font: inherit; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px;
        border: 1px solid rgba(56, 189, 248, 0.35); background: rgba(15, 23, 42, 0.6); color: #bae6fd; cursor: pointer;
    }
    .rf-chip:hover { border-color: #38bdf8; }
    .rf-chip[aria-pressed='true'] { background: linear-gradient(180deg, #38bdf8, #0369a1); color: #fff; border-color: transparent; }
    /* the empty note sits in the page's grid, outside this component */
    :global(.rf-empty) { grid-column: 1 / -1; text-align: center; padding: 30px; color: #bae6fd; }
</style>
