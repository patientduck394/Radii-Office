// Builds opendb/data/index.json from the entry files in opendb/data/entries (run: node scripts/build_opendb.mjs)!
// Each entry is Markdown with a small header of facts between --- lines. Every entry must be CC0!
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'opendb', 'data');
const ENTRIES = path.join(ROOT, 'entries');
const TYPES = new Set(['article', 'media', 'paper']);
const LISTS = new Set(['tags', 'authors', 'categories']);

function parseValue(raw) {
    const v = raw.trim();
    if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map((s) => s.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean);
    if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\"/g, '"');
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
}

export function parseEntry(text, file) {
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
    if (!m) throw new Error(file + ': the header between --- lines is missing');
    const entry = { infobox: {} };
    m[1].split(/\r?\n/).forEach((line, i) => {
        if (!line.trim() || line.trim().startsWith('#')) return;
        const kv = /^([A-Za-z][\w .-]*?):\s?(.*)$/.exec(line);
        if (!kv) throw new Error(file + ': header line ' + (i + 2) + ' should look like "key: value"');
        const key = kv[1].trim();
        const value = parseValue(kv[2]);
        if (key.startsWith('infobox.')) entry.infobox[key.slice(8)] = String(value);
        else entry[key] = LISTS.has(key) && !Array.isArray(value) ? [String(value)] : value;
    });
    entry.body = m[2].trim();
    return entry;
}

function check(entry, file) {
    const problems = [];
    const base = path.basename(file, '.md');
    if (entry.id !== base) problems.push('id "' + entry.id + '" must match the file name "' + base + '"');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(entry.id))) problems.push('id must use lowercase letters, digits and dashes');
    if (!TYPES.has(entry.type)) problems.push('type must be article, media or paper');
    ['title', 'summary', 'created'].forEach((k) => { if (!entry[k]) problems.push(k + ' is missing'); });
    if (entry.license !== 'CC0-1.0') problems.push('license must be CC0-1.0 (everything in OpenDB is public domain)');
    if (entry.type === 'media') {
        if (!entry.file) problems.push('media entries need a file');
        else if (!fs.existsSync(path.join(ROOT, entry.file))) problems.push('the file ' + entry.file + ' does not exist');
    }
    if (entry.type === 'paper' && !entry.abstract) problems.push('papers need an abstract');
    if (problems.length) throw new Error(file + ':\n  - ' + problems.join('\n  - '));
}

export function build() {
    const files = fs.readdirSync(ENTRIES).filter((f) => f.endsWith('.md')).sort();
    const entries = files.map((f) => {
        const e = parseEntry(fs.readFileSync(path.join(ENTRIES, f), 'utf8'), f);
        check(e, f);
        if (!Object.keys(e.infobox).length) delete e.infobox;
        e.updated = e.updated || e.created;
        return e;
    });
    const out = { name: 'OpenDB', license: 'CC0-1.0', generated: new Date().toISOString(), count: entries.length, entries };
    fs.writeFileSync(path.join(ROOT, 'index.json'), JSON.stringify(out));
    return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const out = build();
        const by = out.entries.reduce((m, e) => { m[e.type] = (m[e.type] || 0) + 1; return m; }, {});
        console.log('OpenDB index built! ' + out.count + ' entries (' + Object.entries(by).map(([k, v]) => v + ' ' + (k === 'media' ? 'media files' : k + (v === 1 ? '' : 's'))).join(', ') + ')!');
    } catch (e) {
        console.error('OpenDB build failed!\n' + e.message);
        process.exit(1);
    }
}
