// Builds KeydownBox.svelte: a Frutiger Aero textbox with Writeout's and Bitbook's live Keydown canvas, Skills included.
// Everything lives inside the one component: the Keydown engine in <script module>, every Keydown style in <style>!
// Run: node scripts/build_keydown_svelte.mjs [output file]   (default: ../KeydownBox.svelte, next to Keydown.js)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKeydown, KEYDOWN_CSS, cssItems } from './build_keydown_js.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'KeydownBox.svelte'));

// Svelte scopes styles to the component; Keydown's styles must reach the formatted text, so every rule is :global
// and every animation -global- (its rules already ask for it by its own name)
function splitTop(s) {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of s) {
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}
function globalCss(css) {
    return cssItems(css).map((it) => {
        if (/^@(media|supports|container|layer)\b/.test(it.head)) return it.head + '{' + globalCss(it.body) + '}';
        const kf = /^@(-webkit-)?keyframes\s+([\w-]+)/.exec(it.head);
        if (kf) return '@' + (kf[1] || '') + 'keyframes -global-' + kf[2] + '{' + it.body + '}';
        if (/^@/.test(it.head)) return it.head + '{' + it.body + '}';
        return splitTop(it.head).map((sel) => ':global(' + sel + ')').join(',') + '{' + it.body + '}';
    }).join('\n');
}

// the engine, without its style string (the styles are below, in <style>), and without drawing [data-keydown] on its own
// (a </script> anywhere in it would end Svelte's <script> block early: <\\/script> means the same thing to JavaScript)
const engine = buildKeydown(false).replace(/<\/(script)/gi, '<\\/$1')
    // (the Keydown class lives inside the browser check on purpose: it needs window)
    .replace('\nclass Keydown {', '\n// svelte-ignore perf_avoid_nested_class\nclass Keydown {');

const component = `<!--
  KeydownBox.svelte: a Frutiger Aero textbox with the same live canvas as Writeout and Bitbook!
  Type Keydown and it formats as you go (Enter, or Space after a tag): chips, gels, highlights, applets, tables,
  math, colors... and Bitbook's Skills (dice, timers, flashcards, time capsules, sprites, Programs and more).
  Everything is inside this one file: the Keydown engine and every Keydown style. No other files needed!

  <script>
    import KeydownBox from './KeydownBox.svelte';
    let text = $state('# Hello!\\n#G#Keydown# works **here**!');
  </script>
  <KeydownBox bind:value={text} title="My notes" />

  Connect it to a variable: bind:value={text} (Keydown text) and/or bind:html={html} (the formatted HTML).
  In a <form>: give it a name (name="notes") and the text is sent with the form like any other field;
  required asks for some text before the form can be sent, and the form's Reset button empties it again.

  Props: value (Keydown text, bindable), html (formatted HTML, bindable), name, required, title, placeholder,
         height, readonly, toolbar (true/false), sound (true/false), onchange(text). The editor itself is there too: bind:this={box} then box.editor() (insertSkill, unformat...).
  Built by scripts/build_keydown_svelte.mjs from the Radii Office site's Keydown sources (Svelte 5).
-->
<script module>
    // The Keydown engine (Keydown.js ${'${'}version}), set up once for every KeydownBox on the page
    if (typeof window !== 'undefined') {
        window.__KeydownNoAuto = true;
${engine.replace(/^/gm, '        ').replace(/\$\{version\}/g, '')}
    }
</script>

<script>
    import { onMount } from 'svelte';

    let {
        value = $bindable(''),
        html = $bindable(''),
        name = undefined,
        required = false,
        title = 'Keydown',
        placeholder = 'Type here! Keydown tags like #G#chip# or **bold** format when you press Space or Enter!',
        height = '340px',
        readonly = false,
        toolbar = true,
        sound = true,
        onchange = undefined,
    } = $props();

    let canvas;
    let field;
    const initial = value;          // what the form's Reset button goes back to
    let ed = null;
    let shown = value;             // the text the canvas holds right now
    let menu = $state('');         // which menu is open: '', 'skills' or 'highlight'
    let unformatted = $state(false);
    let words = $state(0);

    const HIGHLIGHTS = [['R', 'red'], ['O', 'orange'], ['Y', 'yellow'], ['L', 'lime'], ['G', 'green'], ['C', 'cyan'], ['B', 'blue'], ['PR', 'purple'], ['PK', 'pink'], ['SL', 'slate']];
    // the words you can see (not the Keydown tags or Skill codes behind them)
    const count = () => ((canvas ? canvas.innerText : '').replace(/\\u200B/g, '').match(/\\S+/g) || []).length;

    onMount(() => {
        const K = window.Keydown;
        K.sound = sound;
        ed = K.editor(canvas, {
            value,
            onChange: (t) => {
                shown = t;
                value = t;
                html = canvas.innerHTML;
                words = count();
                if (typeof onchange === 'function') onchange(t);
            },
        });
        words = count();
        html = canvas.innerHTML;
        // in a form: Reset empties it again, and a required box that is empty sends you to it
        const form = field && field.form;
        const onReset = () => setTimeout(() => { value = initial; }, 0);
        const onInvalid = (e) => { e.preventDefault(); canvas.focus(); };
        if (form) form.addEventListener('reset', onReset);
        if (field) field.addEventListener('invalid', onInvalid);
        return () => {
            if (form) form.removeEventListener('reset', onReset);
            if (field) field.removeEventListener('invalid', onInvalid);
            ed && ed.destroy(); ed = null;
        };
    });

    // a new value from outside (bind:value) redraws the canvas
    $effect(() => {
        const v = value;
        if (ed && v !== shown) { shown = v; ed.setText(v); words = count(); html = canvas.innerHTML; }
    });
    $effect(() => { if (window.Keydown) window.Keydown.sound = sound; });

    // the toolbar keeps the caret where it was in the text
    const keep = (e) => e.preventDefault();
    function cmd(name) { canvas.focus(); document.execCommand(name); }
    function highlight(code, color) {
        menu = '';
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed || !canvas.contains(sel.anchorNode)) return;
        const r = sel.getRangeAt(0);
        const mark = document.createElement('mark');
        mark.className = 'an-hl an-hl-' + color;
        mark.setAttribute('spellcheck', 'false');
        try { r.surroundContents(mark); } catch (e) { mark.appendChild(r.extractContents()); r.insertNode(mark); }
        ed.insertHtml('');
    }
    function skill(name) { menu = ''; canvas.focus(); ed.insertSkill(name); }
    function toggleFormat() {
        if (unformatted) ed.reformat(); else ed.unformat();
        unformatted = !unformatted;
    }
    // (for apps that want the whole editor: insertSkill, unformat, reformat, insertTable, getText, setText...)
    export function editor() { return ed; }
</script>

<div class="kdb" class:readonly style:--kdb-height={height}>
    <div class="kdb-title">
        <span class="kdb-orb" aria-hidden="true"></span>
        <span class="kdb-name">{title}</span>
        <span class="kdb-badge">Keydown</span>
    </div>
    {#if toolbar && !readonly}
        <div class="kdb-tools" role="toolbar" aria-label="Formatting">
            <button type="button" class="kdb-btn" title="Bold" onmousedown={keep} onclick={() => cmd('bold')}><b>B</b></button>
            <button type="button" class="kdb-btn" title="Italic" onmousedown={keep} onclick={() => cmd('italic')}><i>I</i></button>
            <button type="button" class="kdb-btn" title="Underline" onmousedown={keep} onclick={() => cmd('underline')}><u>U</u></button>
            <span class="kdb-pop">
                <button type="button" class="kdb-btn" title="Gel highlight (select some words first)" aria-expanded={menu === 'highlight'} onmousedown={keep} onclick={() => (menu = menu === 'highlight' ? '' : 'highlight')}>🖍️ Highlight</button>
                {#if menu === 'highlight'}
                    <div class="kdb-menu kdb-swatches">
                        {#each HIGHLIGHTS as [code, color] (code)}
                            <button type="button" class="kdb-swatch kdb-sw-{color}" title={color} aria-label={color} onmousedown={keep} onclick={() => highlight(code, color)}></button>
                        {/each}
                    </div>
                {/if}
            </span>
            <span class="kdb-pop">
                <button type="button" class="kdb-btn kdb-skills" title="Bitbook's Skills" aria-expanded={menu === 'skills'} onmousedown={keep} onclick={() => (menu = menu === 'skills' ? '' : 'skills')}>✨ Skills</button>
                {#if menu === 'skills'}
                    <div class="kdb-menu">
                        {#each (typeof window !== 'undefined' && window.Keydown ? window.Keydown.skills : []) as s (s.name)}
                            <button type="button" class="kdb-item" onmousedown={keep} onclick={() => skill(s.name)}>{s.label}</button>
                        {/each}
                    </div>
                {/if}
            </span>
            <button type="button" class="kdb-btn" title="Insert a table" onmousedown={keep} onclick={() => ed && ed.insertTable()}>▦ Table</button>
            <span class="kdb-gap"></span>
            <button type="button" class="kdb-btn" title={unformatted ? 'Turn the tags back into formatting' : 'Show the Keydown tags behind the formatting'} aria-pressed={unformatted} onmousedown={keep} onclick={toggleFormat}>{unformatted ? '✨ Re-format' : '🏷️ Un-format'}</button>
        </div>
    {/if}
    <div class="kdb-glass">
        <div bind:this={canvas} class="kdb-canvas keydown-doc" contenteditable={readonly ? 'false' : 'true'} role="textbox" aria-multiline="true" aria-label={title} data-placeholder={placeholder}></div>
    </div>
    <!-- the form field: always holds the Keydown text, so <form> sends it (and checks required) like any input -->
    <textarea bind:this={field} class="kdb-field" {name} {required} value={value} tabindex="-1" aria-hidden="true" readonly={readonly}></textarea>
    <div class="kdb-status">
        <span>{words} {words === 1 ? 'word' : 'words'}</span>
        <span class="kdb-hint">{readonly ? 'Read only' : 'Space or Enter formats your tags!'}</span>
    </div>
</div>

<style>
    /* ---------- KeydownBox's own Frutiger Aero look ---------- */
    .kdb {
        --kdb-sky: #0ea5e9;
        --kdb-deep: #0369a1;
        position: relative;
        display: flex;
        flex-direction: column;
        border-radius: 18px;
        padding: 4px;
        background: linear-gradient(180deg, #e0f7ff 0%, #9bdcfb 45%, #5cc2f2 55%, #b6ecff 100%);
        border: 1px solid rgba(3, 105, 161, 0.45);
        box-shadow: 0 14px 34px rgba(3, 105, 161, 0.28), 0 2px 4px rgba(3, 105, 161, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.95);
        font-family: 'Segoe UI', 'Frutiger', 'Myriad Pro', system-ui, sans-serif;
        color: #0f172a;
        overflow: visible;
    }
    .kdb::before {
        /* the glossy shine across the top half */
        content: '';
        position: absolute;
        inset: 1px 1px auto 1px;
        height: 38px;
        border-radius: 17px 17px 50% 50% / 17px 17px 10px 10px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.15));
        pointer-events: none;
    }
    .kdb-title {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px 7px;
        font-weight: 700;
        color: #053b5c;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
    }
    .kdb-orb {
        width: 16px; height: 16px; border-radius: 50%;
        background: radial-gradient(circle at 35% 30%, #fff 0 18%, #7dd3fc 40%, #0284c7 100%);
        box-shadow: 0 1px 3px rgba(2, 132, 199, 0.6), inset 0 -1px 2px rgba(0, 0, 0, 0.2);
    }
    .kdb-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .kdb-badge {
        font-size: 11px; font-weight: 800; letter-spacing: 0.4px; padding: 2px 9px; border-radius: 999px; color: #fff;
        background: linear-gradient(180deg, #4ade80 0%, #16a34a 52%, #15803d 53%, #22c55e 100%);
        border: 1px solid #15803d; box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.7);
        text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
    }
    .kdb-tools {
        position: relative;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        padding: 5px 6px 7px;
    }
    .kdb-gap { flex: 1; }
    .kdb-btn {
        font: inherit; font-size: 13px; font-weight: 600; color: #053b5c; cursor: pointer;
        min-width: 32px; height: 30px; padding: 0 10px; border-radius: 9px;
        background: linear-gradient(180deg, #ffffff 0%, #e6f6ff 48%, #c6e9fb 52%, #e9f8ff 100%);
        border: 1px solid rgba(3, 105, 161, 0.4);
        box-shadow: inset 0 1px 0 #fff, 0 1px 2px rgba(3, 105, 161, 0.25);
        transition: transform 0.12s, box-shadow 0.12s, filter 0.12s;
    }
    .kdb-btn:hover { filter: brightness(1.04); box-shadow: inset 0 1px 0 #fff, 0 3px 8px rgba(14, 165, 233, 0.4); transform: translateY(-1px); }
    .kdb-btn:active, .kdb-btn[aria-pressed='true'], .kdb-btn[aria-expanded='true'] {
        transform: translateY(0);
        background: linear-gradient(180deg, #7dd3fc 0%, #38bdf8 48%, #0ea5e9 52%, #7dd3fc 100%);
        color: #fff; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
    }
    .kdb-btn:focus-visible, .kdb-item:focus-visible, .kdb-swatch:focus-visible { outline: 2px solid var(--kdb-deep); outline-offset: 2px; }
    .kdb-skills {
        color: #fff; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3); border-color: #6d28d9;
        background: linear-gradient(180deg, #c4b5fd 0%, #8b5cf6 48%, #7c3aed 52%, #a78bfa 100%);
    }
    .kdb-pop { position: relative; }
    .kdb-menu {
        position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
        display: flex; flex-direction: column; min-width: 190px; padding: 6px; border-radius: 12px;
        background: rgba(255, 255, 255, 0.92);
        -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
        border: 1px solid rgba(3, 105, 161, 0.35);
        box-shadow: 0 12px 28px rgba(3, 105, 161, 0.3);
    }
    .kdb-item {
        font: inherit; font-size: 13px; text-align: left; padding: 7px 10px; border: 0; border-radius: 8px;
        background: transparent; color: #0f172a; cursor: pointer;
    }
    .kdb-item:hover { background: linear-gradient(180deg, #e0f2fe, #bae6fd); }
    .kdb-swatches { flex-direction: row; flex-wrap: wrap; gap: 6px; min-width: 0; width: 176px; }
    .kdb-swatch {
        width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0, 0, 0, 0.2);
        box-shadow: inset 0 2px 3px rgba(255, 255, 255, 0.8), 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .kdb-sw-red { background: radial-gradient(circle at 35% 30%, #fecaca, #ef4444); }
    .kdb-sw-orange { background: radial-gradient(circle at 35% 30%, #fed7aa, #f97316); }
    .kdb-sw-yellow { background: radial-gradient(circle at 35% 30%, #fef9c3, #eab308); }
    .kdb-sw-lime { background: radial-gradient(circle at 35% 30%, #ecfccb, #84cc16); }
    .kdb-sw-green { background: radial-gradient(circle at 35% 30%, #bbf7d0, #10b981); }
    .kdb-sw-cyan { background: radial-gradient(circle at 35% 30%, #cffafe, #22d3ee); }
    .kdb-sw-blue { background: radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6); }
    .kdb-sw-purple { background: radial-gradient(circle at 35% 30%, #e9d5ff, #a855f7); }
    .kdb-sw-pink { background: radial-gradient(circle at 35% 30%, #fbcfe8, #ec4899); }
    .kdb-sw-slate { background: radial-gradient(circle at 35% 30%, #e2e8f0, #64748b); }
    .kdb-glass {
        position: relative;
        border-radius: 13px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(240, 249, 255, 0.95) 100%);
        border: 1px solid rgba(3, 105, 161, 0.35);
        box-shadow: inset 0 2px 6px rgba(3, 105, 161, 0.18), 0 1px 0 rgba(255, 255, 255, 0.8);
    }
    .kdb-canvas {
        min-height: var(--kdb-height, 340px);
        max-height: 70vh;
        overflow: auto;
        padding: 14px 16px;
        outline: none;
        font-size: 15px;
        line-height: 1.6;
        caret-color: var(--kdb-deep);
    }
    .kdb-canvas:empty::before { content: attr(data-placeholder); color: #64748b; pointer-events: none; }
    .kdb-glass:focus-within { box-shadow: inset 0 2px 6px rgba(3, 105, 161, 0.18), 0 0 0 3px rgba(14, 165, 233, 0.35); }
    .kdb-status {
        position: relative;
        display: flex; justify-content: space-between; gap: 10px;
        padding: 5px 10px 3px; font-size: 12px; color: #053b5c;
    }
    .kdb-hint { opacity: 0.8; }
    .readonly .kdb-canvas { cursor: default; }
    /* (the form field is there for the form, never seen) */
    .kdb-field { position: absolute; left: 50%; bottom: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; resize: none; border: 0; padding: 0; }

    /* ---------- Every Keydown style (global, so the formatted text inside the box looks right) ---------- */
${globalCss(KEYDOWN_CSS)}
</style>
`;
fs.writeFileSync(OUT, component);
console.log('KeydownBox.svelte built!', OUT, (component.length / 1048576).toFixed(2) + ' MB');
