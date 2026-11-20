// Licence checker for the whole suite (run: node scripts/licenses.mjs, or add --fix to repair what it can)!
//
//   Our own code is CC0 + Unlicense.  This script walks the site and the sister projects and checks that:
//     1. every project has a LICENSE file that says CC0 / Unlicense (not MIT, ISC or Apache)
//     2. package.json / Cargo.toml say "license": "Unlicense OR CC0-1.0" (the fix writes it in)
//     3. every page footer links CC0 and the Unlicense and has no MIT link (HTML and the Elm pages)
//     4. no leftover "MIT License" / "licensed under MIT" wording in our own text (third-party notices are left alone!)
//     5. bundled libraries with their own licence banner are listed in ATTRIBUTIONS.md (information only)
//
//   --fix     writes missing/old LICENSE files and the manifest license fields
//   --quiet   only prints problems
//   Exit code 1 when a problem is left, so publish scripts can stop on it!
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.resolve(ROOT, '..');
const FIX = process.argv.includes('--fix');
const QUIET = process.argv.includes('--quiet');

const SPDX = 'Unlicense OR CC0-1.0';
const OWNER = 'patientduck394 and contributors';
const YEAR = '2026';

const UNLICENSE = `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
`;

const DUAL = `Copyright (c) ${YEAR} ${OWNER}

This software is dedicated to the public domain, and you may use it under
the terms of EITHER of these two options (your choice):

  1. CC0 1.0 Universal Public Domain Dedication
     https://creativecommons.org/publicdomain/zero/1.0/legalcode
  2. The Unlicense (the full text is below)

-----------------------------------------------------------------------

${UNLICENSE}`;

// the projects checked (missing folders are skipped); "dual" means CC0 + Unlicense, "unlicense" means the plain Unlicense text
const PROJECTS = [
  { name: 'Radii Office site', dir: ROOT, file: 'LICENSE.txt', text: DUAL },
  { name: 'Radii desktop', dir: path.join(WEB, 'radii-desktop'), file: 'LICENSE', text: DUAL },
  { name: 'Suave', dir: path.join(WEB, 'Suave'), file: 'LICENSE', text: UNLICENSE },
  { name: 'Aquaforge AI', dir: path.join(WEB, 'Aquaforge AI'), file: 'LICENSE', text: UNLICENSE },
  { name: 'Mintcode', dir: path.join(WEB, 'mintcode'), file: 'LICENSE', text: UNLICENSE },
  { name: 'Beta', dir: path.join(WEB, 'beta'), file: 'LICENSE', text: UNLICENSE, optional: true },
  { name: 'Overshare', dir: path.join(WEB, 'overshare'), file: 'LICENSE', text: UNLICENSE },
];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'downloads', 'target', '.claude', '.idea', '.vscode', 'elm-stuff', 'dist', 'stage', '.wrangler', 'vendor', 'icon-src', 'src-tauri']);
// files that are about OTHER people's licences, so they may say MIT!
const THIRD_PARTY = /(^|\/)(ATTRIBUTIONS[^/]*\.md|LICENSE-[A-Z]+\.txt|package-lock\.json|[^/]*\.min\.(js|css)|nova-icons\.js|vadivam-icons\.js|sw\.js|SHA256SUMS[^/]*|licenses\.mjs)$/;
const TEXT = /\.(html?|md|txt|elm|mjs|json|toml)$/i;

const problems = [];
const notes = [];
const fixed = [];
const say = (s) => { if (!QUIET) console.log(s); };
const bad = (where, what) => problems.push(where + ': ' + what);

function walk(dir, rel = '') {
  const out = [];
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of ents) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) out.push(...walk(path.join(dir, e.name), rel + e.name + '/')); }
    else if (e.isFile()) out.push(rel + e.name);
  }
  return out;
}
const read = (f) => fs.readFileSync(f, 'utf8');

// 1 + 2 ---- licence files and manifests, project by project
for (const p of PROJECTS) {
  if (!fs.existsSync(p.dir)) { if (!p.optional) say('Skipped ' + p.name + ' (folder not found)'); continue; }
  const lf = path.join(p.dir, p.file);
  const want = /CC0/.test(p.text) ? ['CC0', 'Unlicense'] : ['free and unencumbered'];
  let have = fs.existsSync(lf) ? read(lf) : '';
  const ok = have && want.every((w) => have.includes(w)) && !/MIT License|Apache License|ISC License|Permission is hereby granted/i.test(have.split('-----')[0]);
  if (!ok) {
    if (FIX) { fs.writeFileSync(lf, p.text); fixed.push(p.name + ': wrote ' + p.file); }
    else bad(p.name, (have ? p.file + ' is not ' + want.join(' + ') + ' (found old text)' : 'no ' + p.file));
  }
  const manifests = walk(p.dir).filter((f) => /(^|\/)(package\.json|Cargo\.toml|deno\.json)$/.test(f) && !/(^|\/)(svelte\/node_modules)/.test(f));
  for (const m of manifests) {
    const mf = path.join(p.dir, m);
    const src = read(mf);
    if (/\.json$/.test(m)) {
      let j; try { j = JSON.parse(src); } catch (e) { continue; }
      if (m.endsWith('deno.json') && !('name' in j)) continue;
      if (j.private === true && !('license' in j) && !FIX) { /* private packages still carry the licence for tidy tooling */ }
      const cur = j.license;
      const okL = typeof cur === 'string' && /Unlicense|CC0/.test(cur) && !/MIT|ISC|Apache/.test(cur);
      if (!okL) {
        if (FIX) { j.license = SPDX; fs.writeFileSync(mf, JSON.stringify(j, null, src.includes('\n  "') ? 2 : 4) + '\n'); fixed.push(p.name + ': ' + m + ' license = ' + SPDX); }
        else bad(p.name + '/' + m, 'license is ' + (cur ? '"' + cur + '"' : 'missing') + ', want "' + SPDX + '"');
      }
    } else {
      if (!/\[package\]/.test(src)) continue;
      const mm = /^license\s*=\s*"([^"]*)"/m.exec(src);
      const okL = mm && /Unlicense|CC0/.test(mm[1]) && !/MIT|ISC|Apache/.test(mm[1]);
      if (!okL) {
        if (FIX) {
          const next = mm ? src.replace(/^license\s*=\s*"[^"]*"/m, 'license = "' + SPDX + '"') : src.replace(/(\[package\][^\n]*\n)/, '$1license = "' + SPDX + '"\n');
          fs.writeFileSync(mf, next); fixed.push(p.name + ': ' + m + ' license = ' + SPDX);
        } else bad(p.name + '/' + m, 'license is ' + (mm ? '"' + mm[1] + '"' : 'missing') + ', want "' + SPDX + '"');
      }
    }
  }
}

// 3 + 4 ---- footers and stale wording in the site's own text
const files = walk(ROOT);
for (const f of files) {
  if (!TEXT.test(f) || THIRD_PARTY.test(f)) continue;
  if (/^(opendb\/data|src\/|rust\/[^/]+\/target)/.test(f) || /\/mobile\/(new\/)?index\.html$/.test(f)) continue;
  let src; try { src = read(path.join(ROOT, f)); } catch (e) { continue; }
  if (src.length > 3e6) continue;
  if (/\.html$/.test(f) && /class="site-footer"/.test(src)) {
    if (!/creativecommons\.org\/publicdomain\/zero/.test(src) || !/unlicense\.org/.test(src)) bad(f, 'footer is missing the CC0 or Unlicense link');
    if (/opensource\.org\/licenses?\/MIT|LICENSE-MIT/.test(src)) bad(f, 'footer links the MIT licence');
  }
  if (/\.elm$/.test(f) && /siteFooter/.test(src) && /footer \[/.test(src)) {
    if (!/zero\/1\.0/.test(src) || !/unlicense\.org/.test(src)) bad(f, 'footer is missing the CC0 or Unlicense link');
    if (/opensource\.org\/licenses?\/MIT|LICENSE-MIT/.test(src)) bad(f, 'footer links the MIT licence');
  }
  src.split('\n').forEach((line, i) => {
    if (/(licen[sc]ed|released|available|distributed)\s+(for\s+use\s+)?under\s+(the\s+)?(MIT|ISC|Apache)|\bMIT\s+Licen[sc]e\b|opensource\.org\/licenses?\/(MIT|ISC)/i.test(line) && !/pdf-lib|html-to-image|Lucide|Boxicons|Gravity|MingCute|Feather|Phosphor Icons|third|bundled|vendored|library|libraries/i.test(line))
      bad(f + ':' + (i + 1), 'old licence wording: ' + line.trim().slice(0, 90));
  });
}
// the compiled Elm file is checked by link only (its text holds personal contact details, so it is never printed!)
const pagesJs = path.join(ROOT, 'elm/pages.js');
if (fs.existsSync(pagesJs)) {
  const s = read(pagesJs);
  if (/opensource\.org\/licenses?\/MIT|LICENSE-MIT/.test(s)) bad('elm/pages.js', 'compiled footer still links the MIT licence (rebuild Elm from elm/src)');
}

// 5 ---- bundled libraries with their own licence banner
const attr = ['ATTRIBUTIONS.md', 'ATTRIBUTIONS-FONTS.md'].map((a) => fs.existsSync(path.join(ROOT, a)) ? read(path.join(ROOT, a)).toLowerCase() : '').join('\n');
let libs = 0;
for (const f of files) {
  if (!/\.(js|css)$/.test(f) || THIRD_PARTY.test(f) || /^(src|downloads)\//.test(f)) continue;
  let head = ''; try { const fd = fs.openSync(path.join(ROOT, f), 'r'); const b = Buffer.alloc(900); const n = fs.readSync(fd, b, 0, 900, 0); fs.closeSync(fd); head = b.slice(0, n).toString('utf8'); } catch (e) { continue; }
  const m = /@license|Licensed under the (MIT|Apache)|\(c\)[^\n]*\n[^\n]*MIT|MIT License|Apache License|BSD \d-Clause|SPDX-License-Identifier:\s*([\w.-]+)/i.exec(head);
  if (!m) continue;
  libs++;
  const base = path.basename(f).replace(/(\.min)?\.(js|css)$/, '').toLowerCase();
  const dir = f.split('/').slice(-2, -1)[0] || '';
  if (!attr.includes(base) && !(dir && attr.includes(dir.toLowerCase()))) notes.push(f + ' has its own licence banner but is not named in ATTRIBUTIONS.md');
}

// ---- report
say('');
if (fixed.length) { say('Fixed:'); fixed.forEach((x) => say('  ' + x + '!')); say(''); }
say('Checked ' + PROJECTS.filter((p) => fs.existsSync(p.dir)).length + ' projects, ' + files.length + ' site files, ' + libs + ' bundled libraries with banners!');
if (notes.length) { say('\nFor your information (' + notes.length + '):'); notes.slice(0, 15).forEach((x) => say('  ' + x)); if (notes.length > 15) say('  ...and ' + (notes.length - 15) + ' more'); }
if (problems.length) {
  console.log('\nLicence problems (' + problems.length + '):');
  problems.forEach((x) => console.log('  ' + x));
  console.log('\nRun with --fix to repair licence files and manifests (footers and wording are fixed by hand)!');
  process.exitCode = 1;
} else say('\nEvery licence is in order!');
