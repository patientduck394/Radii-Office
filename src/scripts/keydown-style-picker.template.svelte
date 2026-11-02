<!--
  KeydownStylePicker.svelte: browse every Keydown style, drawn for real, and pick one!
  The core styles (gel orbs, bubble chips, ticket, arrow, dogear, keycap, beacon, highlights, effects...) by category,
  and all __COUNT__ Unique Styles (Frutiger Aero 1-4, Poolside 1-4, Regular) with their 5 colorways each.

  <script>
    import KeydownStylePicker from './KeydownStylePicker.svelte';
    let style = $state('');                   // the tag to type, like '=Y=' or '@pfwavelet-3@'
  </script>
  <KeydownStylePicker bind:value={style} onpick={(s) => console.log(s.wrap('Hello'))} />
  <KeydownText text={style + 'Hello' + (style.startsWith('@') ? '@' : '')} />

  onpick receives { open, close, unique, label, wrap(text) }: wrap('Hi') gives the Keydown text with the style around
  it, ready for KeydownText / KeydownEditor (or to type into any Keydown editor).

  Props: value (bindable: the opening tag of the picked style, '@family-N@' for a Unique Style), onpick(style),
         sample (the words in each preview, default 'Aa'), height (default '460px'), class.
  Built by scripts/build_keydown_picker.mjs from the Radii Office site's style lists.
  Needs KeydownCore.js and KeydownBox.svelte in the same folder. Svelte 5.
-->
<script>
    import { onMount } from 'svelte';
    import { engine } from './KeydownCore.js';

    // [id, name, [5 colorway names], collection]
    const FAMILIES = __FAMILIES__;
    const COLLECTIONS = __COLLECTIONS__;

    let { value = $bindable(''), onpick = undefined, sample = 'Aa', height = '460px', class: className = '' } = $props();
    let K = $state(null);
    let tab = $state('core');          // 'core' or a collection key
    let q = $state('');
    let cat = $state(0);
    let openFam = $state('');          // the Unique Style family whose colorways are showing
    let cats = $state([]);

    onMount(() => {
        K = engine();
        cats = K.styleCategories();
    });

    const draw = (text) => (K ? K.render(text) : '');
    const need = (s) => s.toLowerCase();
    const shownCats = $derived(cats.map((c, i) => ({ name: c.name, i, n: c.styles.length })));
    const coreStyles = $derived.by(() => {
        if (!cats.length) return [];
        const query = need(q.trim());
        if (query) return cats.flatMap((c) => c.styles.filter((s) => need(s.label + ' ' + c.name + ' ' + s.open).includes(query)).map((s) => Object.assign({ group: c.name }, s))).slice(0, 240);
        return (cats[cat] || cats[0]).styles.map((s) => Object.assign({ group: (cats[cat] || cats[0]).name }, s));
    });
    const families = $derived.by(() => {
        const query = need(q.trim());
        return FAMILIES.filter((f) => (query ? need(f[1] + ' ' + f[0]).includes(query) : f[3] === tab));
    });
    const current = $derived(FAMILIES.find((f) => f[0] === openFam));

    function pick(info) {
        value = info.open;
        const wrap = (t) => info.open + t + (info.unique ? '@' : info.close);
        if (typeof onpick === 'function') onpick(Object.assign({ wrap }, info));
    }
    const pickCore = (s) => pick({ open: s.open, close: s.close, unique: false, label: s.label + ' (' + s.group + ')' });
    const pickUnique = (f, n) => pick({ open: '@' + f[0] + '-' + n + '@', close: '@', unique: true, label: f[1] + ' ' + f[2][n - 1] });
</script>

<div class="kdsp {className}" style:--kdsp-height={height}>
    <div class="kdsp-tabs" role="tablist">
        <button type="button" role="tab" class:on={tab === 'core'} aria-selected={tab === 'core'} onclick={() => { tab = 'core'; q = ''; }}>Core styles</button>
        {#each COLLECTIONS as c (c[0])}
            <button type="button" role="tab" class:on={tab === c[0]} aria-selected={tab === c[0]} onclick={() => { tab = c[0]; q = ''; openFam = ''; }}>{c[1]}</button>
        {/each}
    </div>
    <div class="kdsp-bar">
        <input type="search" placeholder={tab === 'core' ? 'Search every core style…' : 'Search the Unique Styles…'} bind:value={q} aria-label="Search styles" />
        {#if tab === 'core' && !q.trim()}
            <select bind:value={cat} aria-label="Category">
                {#each shownCats as c (c.i)}<option value={c.i}>{c.name} ({c.n})</option>{/each}
            </select>
        {/if}
        {#if value}<code class="kdsp-value" title="The tag you picked">{value}</code>{/if}
    </div>
    <div class="kdsp-body">
        {#if !K}
            <p class="kdsp-note">Loading the styles…</p>
        {:else if tab === 'core'}
            <div class="kdsp-grid">
                {#each coreStyles as s (s.open + s.cls)}
                    <button type="button" class="kdsp-tile" class:on={value === s.open} title={s.open + 'text' + s.close} onclick={() => pickCore(s)}>
                        <span class="kdsp-demo">{@html draw(s.open + sample + s.close)}</span>
                        <span class="kdsp-name">{s.label}</span>
                    </button>
                {/each}
            </div>
        {:else}
            <div class="kdsp-grid">
                {#each families as f (f[0])}
                    <button type="button" class="kdsp-tile" class:on={openFam === f[0] || value.startsWith('@' + f[0] + '-')} title={'@' + f[0] + '-N@text@'} onclick={() => { openFam = openFam === f[0] ? '' : f[0]; }}>
                        <span class="kdsp-demo">{@html draw('@' + f[0] + '-1@' + sample + '@')}</span>
                        <span class="kdsp-name">{f[1]}</span>
                    </button>
                {/each}
            </div>
            {#if families.length === 0}<p class="kdsp-note">No styles match that!</p>{/if}
        {/if}
    </div>
    {#if current}
        <div class="kdsp-colorways" aria-label={current[1] + ' colorways'}>
            <b>{current[1]}</b>
            {#each current[2] as name, i (i)}
                <button type="button" class="kdsp-tile kdsp-small" class:on={value === '@' + current[0] + '-' + (i + 1) + '@'} title={'@' + current[0] + '-' + (i + 1) + '@'} onclick={() => pickUnique(current, i + 1)}>
                    <span class="kdsp-demo">{@html draw('@' + current[0] + '-' + (i + 1) + '@' + sample + '@')}</span>
                    <span class="kdsp-name">{name}</span>
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .kdsp { display: flex; flex-direction: column; height: var(--kdsp-height, 460px); border-radius: 14px; overflow: hidden; border: 1px solid #0369a1; background: #ffffff; font-family: 'Segoe UI', 'Frutiger', system-ui, sans-serif; color: #0f172a; box-shadow: 0 10px 26px rgba(3, 105, 161, 0.2); }
    .kdsp-tabs { display: flex; gap: 4px; flex-wrap: wrap; padding: 8px 8px 0; background: linear-gradient(180deg, #e0f7ff, #9bdcfb); border-bottom: 1px solid #0369a1; }
    .kdsp-tabs button { font: 800 12px system-ui, sans-serif; padding: 5px 12px; border: 1px solid #0369a1; border-bottom: 0; border-radius: 9px 9px 0 0; cursor: pointer; background: linear-gradient(180deg, #ffffff, #d7effd); color: #075985; }
    .kdsp-tabs button.on { background: #ffffff; color: #0369a1; box-shadow: 0 2px 0 #ffffff; }
    .kdsp-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .kdsp-bar input { flex: 1; min-width: 0; padding: 6px 12px; border-radius: 999px; border: 1px solid #0369a1; font: 600 13px system-ui, sans-serif; outline: none; box-shadow: inset 0 2px 3px rgba(3, 105, 161, 0.15); }
    .kdsp-bar select { padding: 5px 8px; border-radius: 8px; border: 1px solid #0369a1; font: 600 12px system-ui, sans-serif; max-width: 190px; }
    .kdsp-value { font: 700 12px 'JetBrains Mono', ui-monospace, monospace; background: #e0f7ff; border: 1px solid #7dd3fc; border-radius: 6px; padding: 2px 8px; color: #075985; }
    .kdsp-body { flex: 1; min-height: 0; overflow: auto; padding: 10px; }
    .kdsp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 8px; }
    .kdsp-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; min-height: 64px; padding: 8px 4px 6px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer; }
    .kdsp-tile:hover { border-color: #38bdf8; background: #f0f9ff; }
    .kdsp-tile.on { border-color: #0284c7; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.35); background: #e0f7ff; }
    .kdsp-demo { font-size: 15px; line-height: 1.7; pointer-events: none; max-width: 100%; overflow: hidden; }
    .kdsp-name { font: 600 11px system-ui, sans-serif; color: #475569; text-align: center; line-height: 1.25; pointer-events: none; }
    .kdsp-note { color: #64748b; text-align: center; margin: 30px 0; }
    .kdsp-colorways { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 10px; border-top: 2px solid #7dd3fc; background: #f0f9ff; }
    .kdsp-small { min-width: 100px; min-height: 52px; background: #ffffff; }
</style>
