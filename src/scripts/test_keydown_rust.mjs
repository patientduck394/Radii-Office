// test_keydown_rust.mjs: checks the Rust text engine against the JavaScript one on every OpenDB document, line by line and whole!
// A text the Rust engine hands back (null) is skipped; every text it DOES draw must be byte-for-byte what the JavaScript draws.
// Run from the repo root: node scripts/test_keydown_rust.mjs [--show N]   (build first: see rust/keydown-core/README.md)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const show = Number((process.argv.indexOf('--show') > 0 && process.argv[process.argv.indexOf('--show') + 1]) || 5);
// the JavaScript engine (needs no page: the text parts are plain string work)
const sandbox = { console, URL, TextEncoder, TextDecoder };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'writeout/keydown-doc.js'), 'utf8'), sandbox, { filename: 'keydown-doc.js' });
const JS = sandbox.kdDoc;
// the Rust engine
const require = createRequire(import.meta.url);
const rust = require(path.join(ROOT, 'writeout/keydown-rust.js'));
await rust.init(fs.readFileSync(path.join(ROOT, 'writeout/keydown-core.wasm')));

const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.kd$/.test(e.name)) files.push(p); });
walk(path.join(ROOT, 'opendb/data'));
const stats = { lines: { total: 0, rust: 0, same: 0 }, docs: { total: 0, rust: 0, same: 0 } };
const bad = [];
const check = (kind, text, label) => {
    stats[kind].total++;
    const r = kind === 'lines' ? rust.inlineHtml(text) : rust.textToHtml(text);
    if (r === null) return;
    stats[kind].rust++;
    const j = kind === 'lines' ? JS.inlineHtml(text) : JS.textToHtml(text);
    if (r === j) stats[kind].same++;
    else bad.push({ kind, label, text: text.slice(0, 160), rust: r.slice(0, 220), js: j.slice(0, 220) });
};
for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const body = text.replace(/^[\s\S]*?\n\n/, '');   // (the header is not Keydown)
    check('docs', body, path.relative(ROOT, f));
    body.split('\n').forEach((ln, i) => { if (ln.trim()) { check('lines', ln.trim(), path.relative(ROOT, f) + ':' + i); check('docs', ln, path.relative(ROOT, f) + ':' + i + ' (as a document)'); } });
}
// hand-made cases that stress the parser
const cases = ['**bold** and *it*', '`code **x**` then **y**', '++C~toast++ ++R+aero++ =B=orb=B=', '#R#hi## and #B#x#_ #Y#y#~ #R(ink) #B.halo(neon)', '@pfwavelet-3@unique@ and @nope@x@', 'a \\*not bold\\* and \\# marks',
    '[link](https://example.com) and [mail](mailto:a@b.co) and [here](#top)', 'note[^1] and [^two] and [^1] again', '# Title\n## Sub\n### Third\n#### Mega', '* one\n* two **b**\ntext\n* three', '> quote *it*', '|A line indented\n||Two steps',
    '{align=center} centered **x**', '| a | b |\n| --- | --- |\n| 1 | 2 |', '| a | b |\n| :--- | ---: |{green}\n| 1 | 2 |', '```\ncode **no**\n```\nafter', '[^1]: the note *text*', '=Y=a=Y= **b** ~H1~x~H1~', '**', '** **', '**a', '#R#x#', '#R#x#!', '\\', '`', '``', '```', 'a | b', '', '   ', '= = ='];
cases.forEach((c, i) => { check('docs', c, 'case ' + i); check('lines', c, 'case ' + i); });

// fuzz: random mixes of Keydown's own symbols, tags and words (the same seed every run), line by line and as documents
let seed = 20261105;
const rnd = (n) => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
const PIECES = ['**', '*', '`', '``', '```', '\\', '\\*', '\\#', '#', '##', '###', '#R#', '#B#', '#GL#', '#C(', '#R.halo(', '#PK.neon(', '(', ')', '[', ']', '[x](https://a.b)', '[y](#z)', '[^1]', '[^note]', '@', '@@', '@pfwavelet-2@', '@fam@', '@x-9@',
    '++C+', '++R~', '++GL=', '++PR*', '++', '=Y=', '=B=', '~H1~', '~', '_', '|', '||', ' ', '  ', '\t', 'word', 'a', 'Z', '1', '5', '-', ':', '.', '&', '<', '>', '"', "'", '{', '}', '{align=center}', '> ', '* ', '# ', '| a | b |', '| --- | --- |', '\u00e9', '\u200b', '\u00a0', '\ud83d\ude00'];
let fuzzed = 0, fuzzRust = 0, fuzzBad = [];
for (let n = 0; n < 60000; n++) {
    let t = '';
    const len = 1 + rnd(14);
    for (let k = 0; k < len; k++) t += PIECES[rnd(PIECES.length)];
    if (rnd(6) === 0) t += '\n' + PIECES[rnd(PIECES.length)] + PIECES[rnd(PIECES.length)];
    fuzzed++;
    for (const kind of ['lines', 'docs']) {
        const r = kind === 'lines' ? rust.inlineHtml(t) : rust.textToHtml(t);
        if (r === null) continue;
        fuzzRust++;
        const j = kind === 'lines' ? JS.inlineHtml(t) : JS.textToHtml(t);
        if (r !== j) fuzzBad.push({ kind: 'fuzz-' + kind, label: 'fuzz #' + n, text: t.slice(0, 160), rust: r.slice(0, 220), js: j.slice(0, 220) });
    }
}
console.log(`fuzz: ${fuzzed} random texts (x2 modes), Rust drew ${fuzzRust}, mismatches ${fuzzBad.length}`);
bad.push(...fuzzBad);

const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : 'n/a');
for (const k of ['lines', 'docs']) console.log(`${k}: ${stats[k].total} texts, Rust drew ${stats[k].rust} (${pct(stats[k].rust, stats[k].total)}), identical ${stats[k].same}/${stats[k].rust}`);
bad.slice(0, show).forEach((b) => console.log('\nMISMATCH', b.kind, b.label, '\n  text:', JSON.stringify(b.text), '\n  rust:', b.rust, '\n  js:  ', b.js));
if (bad.length) { console.log(`\n${bad.length} mismatches!`); process.exit(1); }
console.log('\nEvery text the Rust engine drew matches the JavaScript engine!');
