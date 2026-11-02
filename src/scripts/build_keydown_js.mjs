// Builds Keydown.js: ALL of Keydown in one file, styles included (no second CSS file needed)!
// It is stitched together from the site's own Keydown sources, so it always matches Writeout, Bitbook and OpenDB:
//   writeout/keydown-doc.js   documents: lines, headings, lists, tables, math, footnotes, links, pictures, files,
//                             colors/fonts/alignment, Skills (@@dice, @@timer...), live formatting, Keydown <-> HTML
//   phosphor/keydown.js       the applets' working insides (clocks, gauges, switches...), ::blocks, marketplace tags
//   writeout/latex.js         $math$ and $$equations$$ (KaTeX, loaded from a CDN the first time math shows up)
//   bitbook/annotate-ink.js   @@ink drawings
//   bitbook/mobile/skills-lite.js + bitbook/bb-lite.js + bitbook/bitlang.js   the Skills that do things when clicked
//   bitbook/radii-table.js    tables (and their floating toolbar while editing)
//   + every Keydown style: keydown.css, the marketplace tags, gel highlights, the 4,050 Unique Styles and the Skills
// Run: node scripts/build_keydown_js.mjs [output file]   (default: ../Keydown.js, next to this project)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://radii-office.pages.dev/';
const VERSION = '2.0.0';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const must = (s, a, b) => { if (!s.includes(a)) throw new Error('build_keydown_js: missing ' + a.slice(0, 60)); return s.replace(a, b); };

/* ---------- CSS ---------- */
// a tiny CSS reader: top-level rules, @media blocks (filtered inside) and @keyframes
export function cssItems(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const items = [];
    let i = 0;
    while (i < css.length) {
        const open = css.indexOf('{', i);
        if (open === -1) break;
        // (one-line statements like @charset "UTF-8"; or @import ...; before a rule are not part of it)
        const head = css.slice(i, open).trim().replace(/^(?:@[^{;]*;\s*)+/, '');
        let depth = 1, j = open + 1, q = null;
        for (; j < css.length && depth; j++) {
            const ch = css[j];
            if (q) { if (ch === q && css[j - 1] !== '\\') q = null; continue; }
            if (ch === '"' || ch === "'") q = ch;
            else if (ch === '{') depth++;
            else if (ch === '}') depth--;
        }
        items.push({ head, body: css.slice(open + 1, j - 1) });
        i = j;
    }
    return items;
}
// the rules of a stylesheet whose selectors match `test`, plus the @keyframes they use
function pickRules(css, test) {
    const keep = [];
    const anims = new Set();
    const walk = (items, wrap) => {
        for (const it of items) {
            if (/^@media|^@supports/.test(it.head)) { const inner = []; walkInto(cssItems(it.body), inner); if (inner.length) keep.push(it.head + '{' + inner.join('') + '}'); continue; }
            if (/^@/.test(it.head)) continue;
            if (test(it.head)) { (wrap || keep).push(it.head + '{' + it.body + '}'); (it.body.match(/animation(?:-name)?\s*:[^;]+/g) || []).forEach((a) => a.split(/[\s,:]+/).forEach((w) => anims.add(w))); }
        }
    };
    const walkInto = (items, out) => walk(items, out);
    walk(cssItems(css));
    for (const it of cssItems(css)) {
        const m = /^@(?:-webkit-)?keyframes\s+([\w-]+)/.exec(it.head);
        if (m && anims.has(m[1])) keep.push(it.head + '{' + it.body + '}');
    }
    return keep.join('\n');
}
const minify = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').replace(/\s*([{};])\s*/g, '$1').trim();
// url(...) pointing at the site's own files works from anywhere
const absUrls = (css, base) => css.replace(/url\((['"]?)(?!data:|https?:|#|%23)([^'")]+)\1\)/g, (m, q, u) => 'url(' + q + new URL(u, SITE + base).href + q + ')');

const SKILL_SEL = /\.(bb-chip|bl-prog|bl-|dc-|tc-|pm-|fl-|px-chip|px-(?:sm|md|lg)|uni-chip|cc-chip|cc-s\d|bbcss-|jumper-|file-chip|img-resize|tag-check|tag-drop)/;
const EXTRA_CSS = `
.keydown-doc{position:relative;line-height:1.6;word-wrap:break-word}
.kd-ink-wrap>svg.an-ink-layer{width:100%;height:100%}
.kd-figure{margin:12px 0;text-align:center}.kd-figure img,.kd-figure video{max-width:100%;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.15)}.kd-figure audio{width:100%}.kd-figure figcaption{font-size:.85em;opacity:.75;margin-top:6px}
.kd-tpl{display:inline-block;padding:1px 8px;border-radius:999px;background:linear-gradient(180deg,#fff7ed,#fde68a);border:1px solid #f59e0b;color:#78350f;font-size:.85em;font-weight:700}
.kd-tpl-block{display:block;margin:10px 0;padding:10px 14px;border-radius:12px;font-size:.95em}
.kd-math-display{display:block;text-align:center;margin:10px 0}.kd-math{cursor:default}
.kd-link{color:#0369a1;text-decoration:underline;text-decoration-color:rgba(3,105,161,.4)}
.kd-footnote-def{font-size:.9em;opacity:.85}
.img-resize{display:inline-block;vertical-align:middle;resize:horizontal;overflow:hidden;min-width:24px;max-width:100%}.img-resize img{display:block;width:100%;height:auto}
.kd-unknown-applet{font-weight:700;color:var(--aero-primary,#9D84FF)}`;

export const KEYDOWN_CSS = [
    absUrls(read('writeout/keydown.css'), 'writeout/'),
    absUrls(read('phosphor/keydown-marketplace.css'), 'phosphor/'),
    absUrls(read('writeout/annotate-hl.css'), 'writeout/'),
    absUrls(read('writeout/unique-styles.css'), 'writeout/'),
    absUrls(read('bitbook/mobile/skills-lite.css'), 'bitbook/mobile/'),
    absUrls(pickRules(read('bitbook/style.css'), (sel) => SKILL_SEL.test(sel)), 'bitbook/'),
    EXTRA_CSS,
].map(minify).join('\n');
const css = KEYDOWN_CSS;

/* ---------- the engine's pieces ---------- */
// the portable renderer (applets, ::blocks, marketplace): its styles ride in this file, so it never fetches a sheet
let portable = must(read('phosphor/keydown.js'), 'function kdEnsureUniqueStyles() {', 'function kdEnsureUniqueStyles() { return;');
// the document engine: OpenDB lives at the site, and the marketplace tags join its tag list (so they save back as Keydown too)
let docEngine = read('writeout/keydown-doc.js');
docEngine = must(docEngine, "const OPENDB = SCRIPT ? new URL('../opendb/', SCRIPT).href : '../opendb/';", "const OPENDB = '" + SITE + "opendb/';");
docEngine = must(docEngine, '    const ORDER = TRIGGERS.slice()', '    (root.__KD_EXTRA_TRIGGERS || []).forEach((t) => TRIGGERS.push(t));\n    const ORDER = TRIGGERS.slice()');
// the Skills that act when clicked (dice, timer, flashcard, capsule): the chip makers + actions, without the phone sheets
const skillsAll = read('bitbook/mobile/skills-lite.js');
const skills = skillsAll.slice(0, skillsAll.indexOf('// THE PHONE PART'));
const table = read('bitbook/radii-table.js').replace(/(['"])\/imbuer\/formula_engine\.js/g, '$1' + SITE + 'imbuer/formula_engine.js');
const sprite = (() => {
    const app = read('bitbook/app.js');
    const pal = /var PX_PALETTE = \[[^\]]*\];/.exec(app);
    if (!pal) throw new Error('build_keydown_js: PX_PALETTE missing');
    return 'var PX_SIZE = 16;\n' + pal[0] + '\n' +
        'function pxDecode(str) { const a = []; for (let i = 0; i < PX_SIZE * PX_SIZE; i++) a.push(-1); if (typeof str !== "string") return a; for (let i = 0; i < a.length && i < str.length; i++) { const v = parseInt(str[i], 16); a[i] = isNaN(v) ? -1 : v; } return a; }\n' +
        'function pxToDataUrl(cells) { const c = document.createElement("canvas"); c.width = PX_SIZE; c.height = PX_SIZE; const g = c.getContext("2d"); cells.forEach(function (v, i) { if (v < 0) return; g.fillStyle = PX_PALETTE[v] || "#000000"; g.fillRect(i % PX_SIZE, Math.floor(i / PX_SIZE), 1, 1); }); return c.toDataURL("image/png"); }\n';
})();

const header = `/*!
 * Keydown.js ${VERSION} — all of Keydown in one file: every tag, chip, gel, applet, block, Unique Style and Skill,
 * plus every style they need (no second CSS file!). The formatting language of Radii Office:
 * ${SITE}opendb/#/e/keydown
 *
 * Use it:
 *   <script src="Keydown.js"></script>
 *   <div data-keydown>#G#Hello# **world**! =B=Gel orb=B=</div>     <- drawn automatically
 *   <div data-keydown contenteditable></div>                       <- a live editor: tags format as you type
 *   Keydown.render('# Title\\n#R#highlight##')   -> HTML      Keydown.toText(html or element) -> Keydown text
 *   Keydown.editor(element)                     -> a live editor (Enter or Space formats, Skills, Un-format...)
 *   new Keydown({ selector, sound, definitions }) and its parse(), registerApplet(), bindElement() still work!
 *
 * Built by scripts/build_keydown_js.mjs from the Radii Office site (keydown-doc.js, keydown.js, latex.js,
 * annotate-ink.js, skills-lite.js, bb-lite.js, bitlang.js, radii-table.js and their stylesheets). Edit those, then rebuild!
 */
`;

const api = fs.readFileSync(path.join(ROOT, 'scripts', 'keydown-js-api.js'), 'utf8');

// withCss: false leaves the styles out (KeydownBox.svelte carries them in its own <style>)
export function buildKeydown(withCss = true) {
return header + `(function () {
'use strict';
if (typeof window === 'undefined' || window.__KeydownJS) return;
window.__KeydownJS = '${VERSION}';
const KEYDOWN_CSS = ${withCss ? JSON.stringify(css) : "''"};
// The styles go in once, the first time anything needs them (Keydown.injectStyles() does it by hand)
function injectStyles(doc) {
    doc = doc || document;
    if (!KEYDOWN_CSS) return;
    if (!doc.head || doc.getElementById('keydown-js-styles')) return;
    const st = doc.createElement('style');
    st.id = 'keydown-js-styles';
    st.textContent = KEYDOWN_CSS;
    doc.head.insertBefore(st, doc.head.firstChild);
}
// Writeout's Aero click, for applets and Skills (off with Keydown.sound = false)
if (typeof window.playAeroClickSound !== 'function') {
    window.playAeroClickSound = function (frequency, duration) {
        if (window.Keydown && window.Keydown.sound === false) return;
        try {
            const ctx = window.__kdAudio || (window.__kdAudio = new (window.AudioContext || window.webkitAudioContext)());
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = frequency || 600;
            g.gain.setValueAtTime(0.04, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.08));
            o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + (duration || 0.08));
        } catch (e) {}
    };
}
window.BB_SYNTH_URL = window.BB_SYNTH_URL || '${SITE}bitbook/abyssbox_synth.min.js';

/* ===== The portable renderer: applets, ::blocks, marketplace tags (from phosphor/keydown.js) ===== */
const Portable = (function () {
${portable}
return { kdRender, kdRenderBlock, kdAppletInner, kdKindFor, kdBuildGuideHTML, KD_ALL, KD_MKT, kdHandleAppletClick };
})();
window.__KD_EXTRA_TRIGGERS = Portable.KD_MKT.map((d) => [d.o, d.c, 'span', d.cls]);
window.kdRender = window.kdRender || Portable.kdRender;

/* ===== Math (from writeout/latex.js) ===== */
${read('writeout/latex.js')}

/* ===== Drawings: @@ink (from bitbook/annotate-ink.js) ===== */
${read('bitbook/annotate-ink.js')}

/* ===== Skills that act when clicked: dice, timer, flashcard, time capsule (from bitbook/mobile/skills-lite.js) ===== */
${skills}
/* sprites, and the Skills that only need to be drawn */
${sprite}
function uniApplyStyle() {}
function ccApplyStyle() {}
function cscPaintChip(el, css) { el.setAttribute('style', css || ''); }
function jumperJumpToId(id) { const a = id && document.querySelector('.jumper-anchor[data-jumper-id="' + id + '"]'); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
Object.assign(window, { tcBuildChip, tcToggleChip, tcSweep, flBuildChip, flFlip, pmBuildChip, pmToggle, pmSweep, dcBuildChip, dcRollChip, pxDecode, pxToDataUrl, uniApplyStyle, ccApplyStyle, cscPaintChip, jumperJumpToId });

/* ===== BeepBox songs (from bitbook/bb-lite.js) ===== */
${read('bitbook/bb-lite.js')}

/* ===== Programs: BitLang (from bitbook/bitlang.js) ===== */
${read('bitbook/bitlang.js')}

/* ===== Tables (from bitbook/radii-table.js) ===== */
${table}

/* ===== The document engine (from writeout/keydown-doc.js) ===== */
${docEngine}

/* ===== Keydown.js: the friendly front door ===== */
${api}
})();
`;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'Keydown.js'));
const out = buildKeydown(true);
fs.writeFileSync(OUT, out);
console.log('Keydown.js built!', OUT, (out.length / 1048576).toFixed(2) + ' MB (' + (css.length / 1048576).toFixed(2) + ' MB of styles)');
}
