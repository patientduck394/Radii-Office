// Builds the generated parts of the documentation (docs.html):
//   docs/generated/bitlang-guide.html   the BitLang guide, taken from bitbook/bitlang.js (the same text the Bitbook Help button shows)
//   docs/pages/suave*.kd                the Suave pages, taken from ../Suave/README.md and ../Suave/docs/*.md (links rewritten for the docs)
//   docs/search.json                    the search index for every page, including the sections of the full Keydown article
// Run: node scripts/build_docs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUAVE = path.resolve(ROOT, '..', 'Suave');
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, t) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };

// ---------- BitLang guide ----------
{
  const src = read(path.join(ROOT, 'bitbook/bitlang.js'));
  const a = src.indexOf('const DOCS = `');
  if (a < 0) throw new Error('BitLang DOCS text not found');
  const start = a + 'const DOCS = `'.length;
  let end = start;
  while (end < src.length && !(src[end] === '`' && src[end - 1] !== '\\')) end++;
  let html = new Function('return `' + src.slice(start, end) + '`')();
  html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, '');
  write(path.join(ROOT, 'docs/generated/bitlang-guide.html'), html);
  console.log('BitLang guide:', html.length, 'characters');
}

// ---------- Suave pages ----------
const SUAVE_PAGES = {
  'README.md': 'suave', 'docs/LANGUAGE.md': 'suave-language', 'docs/STDLIB.md': 'suave-stdlib', 'docs/WEB.md': 'suave-web', 'docs/SUVL.md': 'suave-suvl',
  'docs/QUANTUM.md': 'suave-quantum', 'docs/POOLS.md': 'suave-pools', 'docs/PM.md': 'suave-pm', 'docs/LAKE.md': 'suave-lake', 'docs/LAKER.md': 'suave-laker',
};
if (fs.existsSync(SUAVE)) {
  const byFile = new Map(Object.entries(SUAVE_PAGES).map(([f, id]) => [path.basename(f), id]));
  for (const [file, id] of Object.entries(SUAVE_PAGES)) {
    let t = read(path.join(SUAVE, file)).replace(/\r/g, '');
    let inFence = false;
    t = t.split('\n').map((line) => {
      if (/^```/.test(line)) { inFence = !inFence; return line; }
      if (inFence) return line;
      line = line.replace(/^(\s*)- /, '$1* ');
      // links to other docs become links between pages; links to files in the source become plain code
      line = line.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
        if (/^(https?:|#|mailto:)/.test(url)) return m;
        const base = path.basename(url.split('#')[0]);
        if (byFile.has(base)) return '[' + text + '](#/' + byFile.get(base) + ')';
        return '`' + text.replace(/`/g, '') + '`';
      });
      return line;
    }).join('\n');
    if (id === 'suave') t += '\n\n## More guides\n\n* [Language reference](#/suave-language)\n* [Standard library](#/suave-stdlib)\n* [Web apps](#/suave-web)\n* [SUVL data format](#/suave-suvl)\n* [Quantum and complex numbers](#/suave-quantum)\n* [Pools](#/suave-pools)\n* [Packages](#/suave-pm)\n* [Lake](#/suave-lake) and [Laker](#/suave-laker)\n';
    write(path.join(ROOT, 'docs/pages', id + '.kd'), t);
  }
  console.log('Suave pages written:', Object.keys(SUAVE_PAGES).length);
} else console.log('Suave folder not found, kept the existing Suave pages');

// ---------- search index ----------
const nav = JSON.parse(read(path.join(ROOT, 'docs/nav.json')));
const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
const plain = (t) => t
  .replace(/```[\w{}|. -]*\n([\s\S]*?)```/g, ' $1 ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/^(::\w+.*|@item|@tab)/gm, (m) => m.replace(/^::?\w*/, ''))
  .replace(/\{(?:badge|key|chip|cite|fn|todo)\s+([^}|]*)[^}]*\}/g, '$1')
  .replace(/[*_`#>|=]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const index = [];
function addDoc(group, pageId, pageTitle, text, anchorPrefix = '') {
  let heading = '', anchor = '', buf = [];
  const flush = () => { const x = plain(buf.join('\n')); if (x) index.push({ id: pageId, g: group, t: pageTitle, h: heading, a: anchor, x: x.slice(0, 1400) }); buf = []; };
  const used = new Set();
  for (const line of text.split('\n')) {
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      heading = m[2].replace(/[*`]/g, '').trim();
      let id = slug(heading), n = 2;
      while (used.has(id)) id = slug(heading) + '-' + n++;
      used.add(id);
      anchor = anchorPrefix + id;
    } else buf.push(line);
  }
  flush();
}
const articleRaw = read(path.join(ROOT, 'opendb/data/entries/keydown.kd')).replace(/^---[\s\S]*?\n---\n/, '');
const parts = articleRaw.split(/^## /m);
const sections = [{ id: 'intro', title: 'Introduction', text: parts[0] }, ...parts.slice(1).map((p) => { const nl = p.indexOf('\n'); const title = p.slice(0, nl).trim(); return { id: slug(title), title, text: p.slice(nl + 1) }; })];
for (const g of nav) {
  for (const p of g.pages) {
    const file = path.join(ROOT, 'docs/pages', p.id + '.kd');
    if (fs.existsSync(file)) addDoc(g.group, p.id, p.title, read(file));
    if (p.kind === 'guide') {
      const h = read(path.join(ROOT, 'docs/generated', p.guide)).replace(/<h2[^>]*>(.*?)<\/h2>/g, (m, t) => '\n## ' + t.replace(/<[^>]+>/g, '') + '\n');
      addDoc(g.group, p.id, p.title, h);
    }
    if (p.kind === 'sections') for (const sid of p.sections) { const s = sections.find((x) => x.id === sid); if (s) addDoc(g.group, p.id, p.title, '## ' + s.title + '\n' + s.text); }
    if (p.kind === 'catalog') for (const s of sections) { const body = plain(s.text); if (body) index.push({ id: p.id, g: g.group, t: p.title, h: s.title, a: 's-' + s.id, x: body.slice(0, 1400) }); }
  }
}
write(path.join(ROOT, 'docs/search.json'), JSON.stringify(index));
console.log('Search index:', index.length, 'entries,', Math.round(JSON.stringify(index).length / 1024), 'KB');

// ---------- style pool and the Style gallery page ----------
// Every Keydown family in the article that has one example per color (text placeholder "text"), plus the Unique Styles families.
// docs/generated/style-pool.json feeds the one-off styling pass (scripts/style_docs.py); the gallery page shows one live sample of each family.
{
  const COLORS = ['R', 'O', 'GL', 'Y', 'L', 'G', 'TU', 'T', 'C', 'B', 'PR', 'PK', 'W', 'FG', 'SL', 'BK'];
  const pool = [];
  const gallery = [];
  const uniq = new Map();
  for (const s of sections) {
    if (s.id === 'intro') continue;
    if (s.id === 'unique-styles') {
      for (const m of s.text.matchAll(/^\* `@([a-z0-9]+)-N@text@` ([^:\n]+):/gm)) uniq.set(m[1], m[2].trim());
      continue;
    }
    const ex = [...s.text.matchAll(/^\* `([^`\n]*\btext\b[^`\n]*)` /gm)].map((m) => m[1]).filter((e) => !/::|\{|\||^-#|\\|color|COLOR/.test(e));
    if (ex.length >= 12) { pool.push({ name: s.title, tags: ex.slice(0, 16) }); }
  }
  const unique = [...uniq.entries()].map(([id, name]) => ({ id, name }));
  write(path.join(ROOT, 'docs/generated/style-pool.json'), JSON.stringify({ colors: COLORS, pool, unique }));
  // gallery: one row per family, the color rotating down the page so many colors show
  const withText = (tag, w) => { const i = tag.lastIndexOf('text'); return tag.slice(0, i) + w + tag.slice(i + 4); };
  let out = '# Style gallery\n\nOne live sample of every Keydown chip and mark family, drawn by the real engine, in a different color down the page. Write the tag in the middle column, with your own words where it says `text`. Every family comes in sixteen colors, and the [full reference](#/keydown-reference) lists them all!\n\n::tip Colors\nThe letters inside the tag pick the color, like R for red, B for blue and PK for pink. Swap them to recolor any sample!\n::end\n';
  const per = 40;
  for (let i = 0; i < pool.length; i += per) {
    const chunk = pool.slice(i, i + per);
    out += `\n## Families ${i + 1} to ${i + chunk.length}\n\n| Family | Write | You get |\n| --- | --- | --- |\n`;
    chunk.forEach((f, j) => {
      const tag = f.tags[(i + j) % Math.min(12, f.tags.length)];
      out += `| ${f.name.replace(/ chips?$/i, '')} | \`${tag}\` | ${withText(tag, 'Sample')} |\n`;
    });
  }
  out += '\n## Unique Styles\n\nThe Unique Styles are written `@family-N@text@`, where N is the colorway from 1 to 5. Here is a sample of each family!\n\n| Family | Write | You get |\n| --- | --- | --- |\n';
  unique.slice(0, 120).forEach((u, j) => { const n = (j % 5) + 1; out += `| ${u.name} | \`@${u.id}-${n}@text@\` | @${u.id}-${n}@Sample@ |\n`; });
  write(path.join(ROOT, 'docs/pages/keydown-gallery.kd'), out);
  console.log('Style pool:', pool.length, 'families,', unique.length, 'Unique Styles families; gallery page written');
}
