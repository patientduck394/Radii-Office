// Rebuilds the four app icons whose sharpest file is only 180 px (Imbuer, Mainkey, Inkpath, Phosphor) as
// 1024 px SVGs! Their tiles use the same recipe as the other icons (the Logo chip design): color from 37.5% down
// to a bright tint, a white gloss oval, corners rounded at 19% — and the white symbol from the app's own favicon.svg.
// Colors were measured from each app's apple-touch-icon.png. Run: node scripts/make-icons.mjs [site folder]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.resolve(process.argv[2] || path.join(HERE, '..', 'radii-office deployment'));
// the tile color at 44% and 90% of the height, measured from each 180 px icon
const MEASURED = {
    imbuer: [[15, 198, 0], [108, 245, 0]],
    mainkey: [[195, 45, 255], [237, 167, 255]],
    inkpath: [[255, 133, 213], [255, 200, 245]],
    phosphor: [[63, 213, 160], [143, 229, 209]],
};
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// the gradient is solid down to 37.5%, then runs to the tint at 100%: work both ends out from the two samples
const ends = ([a, b]) => [hex(a.map((v, i) => v - (b[i] - v) * (0.065 / 0.46))), hex(a.map((v, i) => v + (b[i] - v) * (0.56 / 0.46)))];

function glyph(id) {
    let s = fs.readFileSync(path.join(SITE, id, 'favicon.svg'), 'utf8');
    s = s.replace(/<\?xml[^>]*>/, '').replace(/<sodipodi:namedview[\s\S]*?\/>/, '').replace(/<defs[\s\S]*?(<\/defs>|\/>)/, '');
    const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(s)[1];
    return inner
        .replace(/<path\s+d="M0 0h24v24H0z"[^>]*\/>/g, '')
        .replace(/(stroke|fill):#[0-9a-fA-F]{3,8}/g, '$1:#ffffff')
        .replace(/(stroke|fill)="#[0-9a-fA-F]{3,8}"/g, '$1="#ffffff"')
        .replace(/\s(inkscape|sodipodi):[a-z-]+="[^"]*"/g, '');
}

for (const id of Object.keys(MEASURED)) {
    const [base, tint] = ends(MEASURED[id]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- ${id}: made by scripts/make-icons.mjs from ${id}/favicon.svg -->
  <defs>
    <clipPath id="tile"><rect width="1024" height="1024" rx="195" ry="195"/></clipPath>
    <linearGradient id="color" x1="0" y1="0" x2="0" y2="1"><stop offset="0.375" stop-color="${base}"/><stop offset="1" stop-color="${tint}"/></linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.4"/></linearGradient>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="1024" height="1024" fill="url(#color)"/>
    <ellipse cx="454.7" cy="148.5" rx="757.8" ry="322.6" fill="url(#gloss)"/>
  </g>
  <g color="#ffffff" transform="translate(184 210) scale(26.8)">${glyph(id)}</g>
</svg>
`;
    fs.writeFileSync(path.join(HERE, 'icon-src', id + '.svg'), svg);
    console.log('icon', id, base, '->', tint);
}
