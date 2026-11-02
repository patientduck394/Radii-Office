// Builds KeydownStylePicker.svelte: browse and pick every Keydown style (core styles + all Unique Styles)!
// The Unique Styles catalog (family ids, names, colorway names, collections) comes straight from Bitbook's gallery list,
// so the picker always matches the site. Run: node scripts/build_keydown_picker.mjs [output file]   (default: ../KeydownStylePicker.svelte)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'KeydownStylePicker.svelte'));
const app = fs.readFileSync(path.join(ROOT, 'bitbook', 'app.js'), 'utf8');
const m = /var US_FAMILIES = (\[.*?\]);\n/s.exec(app);
const cols = /var CSF_GALLERY_COLS = (\{[^}]*\});/.exec(app);
if (!m || !cols) throw new Error('build_keydown_picker: the style lists are missing from bitbook/app.js');
const families = JSON.parse(m[1]);
// the collection tabs, in the gallery's order ({ regular: 'Regular', aero: 'Frutiger Aero', ... })
const labels = new Function('return ' + cols[1])();
const collections = Object.entries(labels).filter(([k]) => families.some((f) => (f[3] || 'regular') === k));
let tpl = fs.readFileSync(path.join(ROOT, 'scripts', 'keydown-style-picker.template.svelte'), 'utf8');
tpl = tpl.replace('__FAMILIES__', JSON.stringify(families.map((f) => [f[0], f[1], f[2], f[3] || 'regular']))).replace('__COLLECTIONS__', JSON.stringify(collections)).replace('__COUNT__', (families.length * 5).toLocaleString('en-US'));
fs.writeFileSync(OUT, tpl);
console.log('KeydownStylePicker.svelte built!', OUT, families.length + ' families,', collections.length + ' collections,', (tpl.length / 1024).toFixed(0) + ' KB');
