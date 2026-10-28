// OpenDB! A free, open-access database of articles, media and papers, all public domain (CC0).
// The site is static: data/index.json is built from data/entries/*.md (scripts/build_opendb.mjs),
// and new entries are saved on your device right away, then proposed to the public repository.
(function () {
    'use strict';

    const REPO = 'patientduck394/Radii-Office';
    const BRANCH = 'main';
    const REPO_DIR = 'src/opendb/data';
    const TYPES = { article: 'Article', media: 'Media', paper: 'Paper' };
    const PLURAL = { article: 'Articles', media: 'Media', paper: 'Papers' };

    const $ = (id) => document.getElementById(id);
    const view = $('view');
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    /* ---------- Data: the shared index + entries kept on this device ---------- */
    let shared = [];
    let local = [];
    let byId = new Map();
    let backlinks = new Map();
    let loadError = null;

    const LOCAL_KEY = 'opendb_local_v1';
    function loadLocal() {
        try { const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); local = Array.isArray(v) ? v : []; } catch (e) { local = []; }
    }
    function saveLocal() {
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); return true; }
        catch (e) { toast('Your browser storage is full! Remove some device entries first!'); return false; }
    }
    function reindex() {
        byId = new Map();
        shared.forEach((e) => byId.set(e.id, e));
        local.forEach((e) => byId.set(e.id, Object.assign({}, e, { local: true })));
        backlinks = new Map();
        byId.forEach((e) => {
            linksIn(e).forEach((to) => {
                if (to === e.id) return;
                if (!backlinks.has(to)) backlinks.set(to, new Set());
                backlinks.get(to).add(e.id);
            });
        });
    }
    function all() { return Array.from(byId.values()); }
    function linksIn(e) {
        const out = new Set();
        const text = (e.body || '') + '\n' + (e.abstract || '');
        let m;
        const re = /\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]|\]\(media:([a-z0-9-]+)\)/g;
        while ((m = re.exec(text))) out.add(m[1] || m[2]);
        return out;
    }
    function mediaSrc(e) {
        if (!e) return '';
        if (e.dataUrl) return e.dataUrl;
        return 'data/' + e.file;
    }

    /* ---------- Markdown (safe: everything is escaped first) ---------- */
    function inline(text, notes) {
        let s = esc(text);
        const codes = [];
        s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push('<code>' + c + '</code>'); return '\u0000' + (codes.length - 1) + '\u0000'; });
        s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
            const e = byId.get(id);
            const text = label || (e ? e.title : id);
            return e ? '<a href="#/e/' + id + '">' + text + '</a>' : '<a class="missing" href="#/new/article?id=' + id + '" title="No entry yet: write it!">' + text + '</a>';
        });
        s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|#)[^)\s]+)\)/g, (_, t, u) => '<a href="' + u + '"' + (u[0] === '#' ? '' : ' target="_blank" rel="noopener noreferrer"') + '>' + t + '</a>');
        s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, u) => pre + '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>');
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
        s = s.replace(/\[\^([\w-]+)\]/g, (_, n) => { if (!notes.order.includes(n)) notes.order.push(n); const k = notes.order.indexOf(n) + 1; return '<sup id="ref-' + esc(n) + '"><a href="#fn-' + esc(n) + '" data-scroll>[' + k + ']</a></sup>'; });
        s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
        return s;
    }
    function renderMd(src) {
        const lines = String(src || '').replace(/\r/g, '').split('\n');
        const notes = { order: [], defs: {} };
        const out = [];
        let i = 0;
        const para = [];
        const flush = () => { if (para.length) { out.push('<p>' + inline(para.join(' '), notes) + '</p>'); para.length = 0; } };
        while (i < lines.length) {
            const line = lines[i];
            let m;
            if (/^```/.test(line)) {
                flush();
                const body = [];
                i++;
                while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
                i++;
                out.push('<pre><code>' + esc(body.join('\n')) + '</code></pre>');
                continue;
            }
            if ((m = /^\[\^([\w-]+)\]:\s*(.*)$/.exec(line))) { flush(); notes.defs[m[1]] = m[2]; i++; continue; }
            if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
                flush();
                const level = Math.min(3, m[1].length + 1);
                const id = m[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                out.push('<h' + level + ' id="s-' + id + '">' + inline(m[2], notes) + '</h' + level + '>');
                i++;
                continue;
            }
            if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line))) {
                flush();
                const alt = m[1], target = m[2];
                let src = null, link = null;
                if (target.startsWith('media:')) { const e = byId.get(target.slice(6)); if (e && e.type === 'media') { src = mediaSrc(e); link = '#/e/' + e.id; } }
                else if (/^https:\/\//.test(target)) src = target;
                if (src) out.push('<figure>' + (link ? '<a href="' + link + '">' : '') + '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">' + (link ? '</a>' : '') + (alt ? '<figcaption>' + esc(alt) + '</figcaption>' : '') + '</figure>');
                else out.push('<p class="muted">[missing image: ' + esc(target) + ']</p>');
                i++;
                continue;
            }
            if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
                flush();
                const ordered = /^\s*\d+\./.test(line);
                const items = [];
                while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '')); i++; }
                out.push((ordered ? '<ol>' : '<ul>') + items.map((t) => '<li>' + inline(t, notes) + '</li>').join('') + (ordered ? '</ol>' : '</ul>'));
                continue;
            }
            if (/^>\s?/.test(line)) {
                flush();
                const q = [];
                while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
                out.push('<blockquote>' + inline(q.join(' '), notes) + '</blockquote>');
                continue;
            }
            if (!line.trim()) { flush(); i++; continue; }
            para.push(line.trim());
            i++;
        }
        flush();
        // footnotes become a numbered list where they were cited from
        const used = notes.order.filter((n) => notes.defs[n] !== undefined);
        if (used.length) {
            out.push('<ol class="refs">' + used.map((n) => '<li id="fn-' + esc(n) + '">' + inline(notes.defs[n], { order: [] }) + ' <a href="#ref-' + esc(n) + '" data-scroll title="Back to the text">↩</a></li>').join('') + '</ol>');
        }
        return out.join('\n');
    }
    function plain(src) { return String(src || '').replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([a-z0-9-]+)\]\]/g, '$1').replace(/\[\^[\w-]+\]:?/g, '').replace(/[#*`>]/g, '').replace(/\s+/g, ' '); }

    /* ---------- Search ---------- */
    function search(q) {
        const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
        if (!words.length) return [];
        return all().map((e) => {
            const title = e.title.toLowerCase(), tags = (e.tags || []).join(' ').toLowerCase(), sum = (e.summary || '').toLowerCase();
            const body = (plain(e.body) + ' ' + (e.abstract || '')).toLowerCase();
            let score = 0;
            for (const w of words) {
                let hit = false;
                if (title === w) { score += 30; hit = true; }
                if (title.includes(w)) { score += 12; hit = true; }
                if (tags.includes(w)) { score += 6; hit = true; }
                if (sum.includes(w)) { score += 4; hit = true; }
                const n = body.split(w).length - 1;
                if (n) { score += Math.min(6, n); hit = true; }
                if (!hit) return null; // every word must appear somewhere
            }
            return { e, score };
        }).filter(Boolean).sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title));
    }
    function snippet(e, q) {
        const text = plain(e.body) || e.summary || '';
        const w = q.toLowerCase().split(/\s+/).find((x) => x.length > 1 && text.toLowerCase().includes(x));
        if (!w) return esc(e.summary || text.slice(0, 180));
        const at = text.toLowerCase().indexOf(w);
        const a = Math.max(0, at - 70), b = Math.min(text.length, at + w.length + 110);
        const piece = text.slice(a, b);
        const re = new RegExp('(' + q.split(/\s+/).filter((x) => x.length > 1).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
        return (a ? '…' : '') + esc(piece).replace(re, '<mark>$1</mark>') + (b < text.length ? '…' : '');
    }

    /* ---------- Little pieces ---------- */
    const badge = (e) => '<span class="badge ' + e.type + '">' + TYPES[e.type] + '</span>' + (e.local ? '<span class="badge local" title="Saved on this device only, not published yet">On this device</span>' : '');
    const tagLinks = (tags) => '<div class="tags">' + (tags || []).map((t) => '<a class="tag" href="#/tag/' + encodeURIComponent(t) + '">' + esc(t) + '</a>').join('') + '</div>';
    function itemRow(e, q) {
        const thumb = e.type === 'media' ? '<img class="thumb" src="' + esc(mediaSrc(e)) + '" alt="" loading="lazy">' : '';
        return '<a class="item" href="#/e/' + e.id + '">' + thumb + '<div><span class="item-title">' + esc(e.title) + '</span>' + badge(e) +
            '<p>' + (q ? snippet(e, q) : esc(e.summary)) + '</p><div class="meta">' + (e.type === 'paper' ? esc((e.authors || []).join(', ')) + ' · ' + esc((e.categories || []).join(', ')) + ' · ' : '') + 'Updated ' + esc(e.updated || e.created) + '</div></div></a>';
    }
    function tile(e) { return '<a class="tile" href="#/e/' + e.id + '"><img src="' + esc(mediaSrc(e)) + '" alt="' + esc(e.title) + '" loading="lazy"><b>' + esc(e.title) + '</b>' + (e.local ? badge(e) : '') + '</a>'; }
    const byUpdated = (a, b) => String(b.updated || b.created).localeCompare(String(a.updated || a.created)) || a.title.localeCompare(b.title);

    /* ---------- Pages ---------- */
    function pageHome() {
        const list = all();
        const counts = { article: 0, media: 0, paper: 0 };
        list.forEach((e) => { counts[e.type]++; });
        const articles = list.filter((e) => e.type === 'article');
        const day = Math.floor(Date.now() / 86400000);
        const featured = articles.length ? articles.slice().sort((a, b) => a.id.localeCompare(b.id))[day % articles.length] : null;
        const tagCount = new Map();
        list.forEach((e) => (e.tags || []).forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
        const topTags = Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 24).map((x) => x[0]);
        const section = (type, icon) => {
            const items = list.filter((e) => e.type === type).sort(byUpdated).slice(0, 4);
            return '<div class="card collection"><h2>' + icon + ' <a href="#/browse/' + type + '">' + PLURAL[type] + '</a></h2><p class="muted">' +
                { article: 'Encyclopedia entries that explain a topic!', media: 'Images, diagrams and files that are free to reuse!', paper: 'Research papers and preprints, ready to cite!' }[type] +
                '</p><div class="list">' + (items.length ? items.map((e) => itemRow(e)).join('') : '<div class="empty">Nothing here yet!</div>') + '</div><a href="#/browse/' + type + '">See all ' + counts[type] + ' →</a></div>';
        };
        view.innerHTML =
            '<section class="hero"><h1>Knowledge with no strings attached!</h1><p>OpenDB is a free database of articles, media and papers. Every entry is in the public domain under CC0, so you can copy, change and reuse anything, for anything!</p>' +
            '<div class="stats"><span class="stat">' + counts.article + ' articles</span><span class="stat">' + counts.media + ' media files</span><span class="stat">' + counts.paper + ' papers</span><span class="stat">100% CC0</span></div></section>' +
            '<div class="grid3">' + section('article', '📖') + section('media', '🖼️') + section('paper', '📄') + '</div>' +
            '<div class="home-row"><div class="card featured"><h2>Featured article</h2>' + (featured ? '<h3><a href="#/e/' + featured.id + '">' + esc(featured.title) + '</a></h3><p class="lead">' + esc(featured.summary) + '</p><a class="gel small" href="#/e/' + featured.id + '">Read it!</a>' : '<p>No articles yet!</p>') + '</div>' +
            '<div class="card side-box"><h2>Explore by topic</h2>' + tagLinks(topTags) + '<p class="hint" style="margin-top:12px">Know something worth sharing? <a href="#/new/article">Write an entry</a> and give it to everyone!</p></div></div>';
    }

    function pageBrowse(type, params) {
        const sort = params.get('sort') || (type === 'media' ? 'title' : 'title');
        let list = all().filter((e) => e.type === type);
        list.sort(sort === 'updated' ? byUpdated : (a, b) => a.title.localeCompare(b.title));
        const head = '<h1 class="page">' + PLURAL[type] + '</h1><p class="muted">' + list.length + ' ' + (type === 'media' ? 'files' : PLURAL[type].toLowerCase()) + ', all public domain!</p>' +
            '<div class="filters"><label>Sort by <select id="sort"><option value="title"' + (sort === 'title' ? ' selected' : '') + '>Title</option><option value="updated"' + (sort === 'updated' ? ' selected' : '') + '>Recently updated</option></select></label><a class="gel small green" href="#/new/' + type + '">＋ Add ' + (type === 'media' ? 'a file' : 'a' + (type === 'article' ? 'n article' : ' paper')) + '</a></div>';
        const body = type === 'media' ? '<div class="media-grid">' + list.map(tile).join('') + '</div>' : '<div class="list">' + list.map((e) => itemRow(e)).join('') + '</div>';
        view.innerHTML = '<div class="card">' + head + (list.length ? body : '<div class="empty">Nothing here yet! Be the first to add one!</div>') + '</div>';
        $('sort').onchange = (ev) => { location.hash = '#/browse/' + type + '?sort=' + ev.target.value; };
    }

    function pageTag(tag) {
        const list = all().filter((e) => (e.tags || []).includes(tag)).sort((a, b) => a.title.localeCompare(b.title));
        view.innerHTML = '<div class="card"><h1 class="page">Tagged “' + esc(tag) + '”</h1><p class="muted">' + list.length + ' entr' + (list.length === 1 ? 'y' : 'ies') + '!</p><div class="list">' + list.map((e) => itemRow(e)).join('') + '</div></div>';
    }

    function pageSearch(q) {
        $('q').value = q;
        const results = search(q);
        const exact = byId.get(q.toLowerCase().trim().replace(/\s+/g, '-'));
        view.innerHTML = '<div class="card"><h1 class="page">Search</h1><p class="muted">' + (results.length ? results.length + ' result' + (results.length === 1 ? '' : 's') + ' for “' + esc(q) + '”!' : 'No results for “' + esc(q) + '”!') +
            (!exact && q.trim() ? ' You could <a href="#/new/article?title=' + encodeURIComponent(q.trim()) + '">write an article about it</a>!' : '') + '</p><div class="list">' + results.map((r) => itemRow(r.e, q)).join('') + '</div></div>';
    }

    function pageEntry(id) {
        const e = byId.get(id);
        if (!e) {
            view.innerHTML = '<div class="card empty"><h1 class="page">No entry called “' + esc(id) + '” yet!</h1><p>Would you like to <a href="#/new/article?id=' + encodeURIComponent(id) + '">write it</a>?</p></div>';
            return;
        }
        document.title = e.title + ' - OpenDB';
        const top = '<div class="crumbs"><a href="#/browse/' + e.type + '">' + PLURAL[e.type] + '</a> › ' + esc(e.title) + '</div>' +
            '<h1 class="page">' + esc(e.title) + badge(e) + '</h1>';
        let head = '';
        if (e.type === 'paper') {
            head = '<p class="authors">' + esc((e.authors || []).join(', ')) + ' · <span class="muted">' + esc((e.categories || []).join(', ')) + ' · ' + esc(e.created) + '</span></p>' +
                '<div class="abstract"><b>Abstract</b>' + esc(e.abstract) + '</div>';
        } else {
            head = '<p class="lead">' + esc(e.summary) + '</p>';
            if (e.type === 'media') {
                head += '<figure class="figure"><a href="' + esc(mediaSrc(e)) + '" target="_blank" rel="noopener"><img src="' + esc(mediaSrc(e)) + '" alt="' + esc(e.title) + '"></a><figcaption>' + esc(e.mime || '') + (e.width ? ' · ' + e.width + ' × ' + e.height : '') + ' · click to open full size</figcaption></figure>';
            }
        }
        const info = e.infobox && Object.keys(e.infobox).length ? '<div class="side-box infobox"><h2>' + esc(e.title) + '</h2><table>' + Object.entries(e.infobox).map(([k, v]) => '<tr><th>' + esc(k) + '</th><td>' + inline(v, { order: [] }) + '</td></tr>').join('') + '</table></div>' : '';
        const links = Array.from(backlinks.get(id) || []).map((x) => byId.get(x)).filter(Boolean);
        const side =
            info +
            '<div class="side-box cc0-box"><p><a class="cc0" href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0</a><b>No rights reserved!</b> Copy, change, translate and use this for anything, even commercially, with no credit needed!</p></div>' +
            '<div class="side-box"><div class="actions">' +
            (e.type === 'media' ? '<a class="gel small" href="' + esc(mediaSrc(e)) + '" download="' + esc(e.id + extOf(e)) + '">⬇ Download file</a>' : '') +
            '<button class="gel small plain" id="cite">❝ Cite</button><button class="gel small plain" id="dl-md">⬇ .md</button><button class="gel small plain" id="dl-json">⬇ JSON</button><a class="gel small plain" href="#/edit/' + e.id + '">✎ Edit</a>' +
            (e.local ? '<button class="gel small plain" id="del-local">🗑 Remove</button>' : '<a class="gel small plain" href="https://github.com/' + REPO + '/commits/' + BRANCH + '/' + REPO_DIR + '/entries/' + e.id + '.md" target="_blank" rel="noopener noreferrer">🕘 History</a>') +
            '</div></div>' +
            '<div class="side-box"><h2>Tags</h2>' + tagLinks(e.tags) + '<p class="hint" style="margin-top:10px">Created ' + esc(e.created) + (e.updated && e.updated !== e.created ? ' · updated ' + esc(e.updated) : '') + (e.authors && e.type !== 'paper' ? '<br>By ' + esc(e.authors.join(', ')) : '') + '</p></div>' +
            (links.length ? '<div class="side-box"><h2>What links here</h2><ul>' + links.map((l) => '<li><a href="#/e/' + l.id + '">' + esc(l.title) + '</a></li>').join('') + '</ul></div>' : '');
        view.innerHTML = '<div class="entry"><article class="card entry-main">' + top + head + '<div class="md">' + renderMd(e.body) + '</div></article><aside class="side">' + side + '</aside></div>';
        $('cite').onclick = () => showCite(e);
        $('dl-md').onclick = () => download(e.id + '.md', toMarkdownFile(e), 'text/markdown');
        $('dl-json').onclick = () => download(e.id + '.json', JSON.stringify(clean(e), null, 2), 'application/json');
        if ($('del-local')) $('del-local').onclick = () => {
            if (!confirm('Remove "' + e.title + '" from this device?')) return;
            local = local.filter((x) => x.id !== e.id);
            saveLocal(); reindex();
            toast('Removed from this device!');
            location.hash = '#/mine';
        };
    }
    function extOf(e) { const m = /\.([a-z0-9]+)$/i.exec(e.file || ''); return m ? '.' + m[1] : { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/svg+xml': '.svg', 'image/webp': '.webp', 'image/gif': '.gif' }[e.mime] || ''; }
    function clean(e) { const o = Object.assign({}, e); delete o.local; delete o.dataUrl; return o; }

    function showCite(e) {
        const year = String(e.created || today()).slice(0, 4);
        const url = location.href.split('#')[0] + '#/e/' + e.id;
        const authors = (e.authors && e.authors.length ? e.authors : ['OpenDB contributors']);
        const bib = '@' + (e.type === 'paper' ? 'misc' : 'misc') + '{opendb_' + e.id.replace(/-/g, '_') + ',\n  title = {' + e.title + '},\n  author = {' + authors.join(' and ') + '},\n  year = {' + year + '},\n  howpublished = {OpenDB},\n  url = {' + url + '},\n  note = {Public domain (CC0 1.0)' + (e.type === 'paper' ? ', ' + (e.categories || []).join(', ') : '') + '}\n}';
        const apa = authors.join(', ') + ' (' + year + '). ' + e.title + (e.type === 'paper' ? ' [Preprint]' : e.type === 'media' ? ' [' + (e.mime || 'File') + ']' : '') + '. OpenDB. ' + url;
        modal('Cite “' + e.title + '”', '<p class="hint">Citing is a kindness, not a rule: CC0 means no credit is required!</p><b>BibTeX</b><pre id="bib">' + esc(bib) + '</pre><button class="gel small plain" data-copy="bib">Copy BibTeX</button><b>APA style</b><pre id="apa">' + esc(apa) + '</pre><button class="gel small plain" data-copy="apa">Copy APA</button>');
    }

    function pageMine() {
        const list = local.slice().sort(byUpdated);
        view.innerHTML = '<div class="card"><h1 class="page">On this device</h1><p class="muted">Entries you saved here but have not published yet! They show up in OpenDB for you right away, and nobody else can see them until they are published!</p>' +
            (list.length ? '<div class="list">' + list.map((e) => itemRow(Object.assign({}, e, { local: true }))).join('') + '</div>' : '<div class="empty">Nothing saved on this device! <a href="#/new/article">Write something</a>!</div>') + '</div>';
    }

    /* ---------- Contributing ---------- */
    function slug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
    function yamlStr(v) { const s = String(v); return /^[\[\]"#]|:\s|^\s|\s$/.test(s) || s === '' ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
    function yamlList(a) { return '[' + (a || []).map((x) => String(x).replace(/[,\[\]]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean).join(', ') + ']'; }
    function toMarkdownFile(e) {
        const h = ['---', 'id: ' + e.id, 'type: ' + e.type, 'title: ' + yamlStr(e.title), 'summary: ' + yamlStr(e.summary)];
        if (e.type === 'paper') h.push('abstract: ' + yamlStr(String(e.abstract || '').replace(/\s*\n\s*/g, ' ')));
        h.push('tags: ' + yamlList(e.tags));
        if (e.type === 'paper') h.push('categories: ' + yamlList(e.categories));
        h.push('created: ' + e.created, 'updated: ' + (e.updated || e.created), 'authors: ' + yamlList(e.authors), 'license: CC0-1.0');
        if (e.type === 'media') { h.push('file: media/' + e.id + extOf(e), 'mime: ' + (e.mime || '')); if (e.width) h.push('width: ' + e.width, 'height: ' + e.height); }
        Object.entries(e.infobox || {}).forEach(([k, v]) => h.push('infobox.' + String(k).replace(/[:\n]/g, ' ').trim() + ': ' + yamlStr(String(v).replace(/\n/g, ' '))));
        h.push('---');
        return h.join('\n') + '\n' + String(e.body || '').trim() + '\n';
    }

    function pageEditor(type, params, editId) {
        const base = editId ? byId.get(editId) : null;
        if (editId && !base) { location.hash = '#/new/article?id=' + editId; return; }
        type = base ? base.type : (TYPES[type] ? type : 'article');
        const d = base ? JSON.parse(JSON.stringify(base)) : {
            id: params.get('id') || slug(params.get('title') || ''), type, title: params.get('title') || (params.get('id') ? params.get('id').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) : ''),
            summary: '', body: '', tags: [], authors: [], categories: [], abstract: '', infobox: {}, created: today(),
        };
        let idTouched = !!(base || params.get('id'));
        const infoboxText = Object.entries(d.infobox || {}).map(([k, v]) => k + ': ' + v).join('\n');
        view.innerHTML = '<div class="editor"><div class="card form" id="form">' +
            '<h1 class="page">' + (base ? 'Edit “' + esc(base.title) + '”' : 'Contribute') + '</h1>' +
            (base ? '' : '<div class="seg" id="types">' + Object.keys(TYPES).map((t) => '<button type="button" data-type="' + t + '" class="' + (t === type ? 'on' : '') + '">' + TYPES[t] + '</button>').join('') + '</div>') +
            '<label class="field">Title<input id="f-title" maxlength="140" value="' + esc(d.title) + '"></label>' +
            '<label class="field">Address <small>(lowercase letters, numbers and dashes; this becomes the link #/e/…)</small><input id="f-id" maxlength="60" value="' + esc(d.id) + '"' + (base ? ' disabled' : '') + '></label>' +
            '<label class="field">One-sentence summary<input id="f-summary" maxlength="300" value="' + esc(d.summary) + '"></label>' +
            '<div id="media-fields" hidden><label class="field">File <small>(images work best: PNG, JPEG, SVG, WebP or GIF, up to 2 MB)</small><input id="f-file" type="file" accept="image/*"></label><p class="hint" id="file-info"></p></div>' +
            '<div id="paper-fields" hidden><label class="field">Abstract<textarea id="f-abstract">' + esc(d.abstract) + '</textarea></label>' +
            '<label class="field">Categories <small>(comma separated, arXiv style like cs.PL, math.NT, q-bio.PE)</small><input id="f-categories" value="' + esc((d.categories || []).join(', ')) + '"></label></div>' +
            '<label class="field">' + (type === 'paper' ? 'Full text' : type === 'media' ? 'Description' : 'Article') + ' <small>(Markdown: ## Heading, **bold**, *italic*, - lists, [[other-entry]] links, ![caption](media:file-id), footnotes [^1])</small><textarea id="f-body" class="body">' + esc(d.body) + '</textarea></label>' +
            '<label class="field">Tags <small>(comma separated)</small><input id="f-tags" value="' + esc((d.tags || []).join(', ')) + '"></label>' +
            '<label class="field">Authors <small>(comma separated; any name you like, or leave it empty)</small><input id="f-authors" value="' + esc((d.authors || []).join(', ')) + '"></label>' +
            '<label class="field">Infobox <small>(optional, one “Label: value” per line)</small><textarea id="f-infobox" style="min-height:70px">' + esc(infoboxText) + '</textarea></label>' +
            '<label class="check"><input type="checkbox" id="f-cc0"><span>I dedicate this ' + (base ? 'change' : 'entry') + ' to the public domain under <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0 1.0</a>, and I made it myself or it is already in the public domain!</span></label>' +
            '<ul class="problems" id="problems"></ul>' +
            '<div class="actions"><button class="gel green" id="save-local">💾 Save on this device</button><button class="gel" id="publish">🌐 Publish for everyone</button><button class="gel plain" id="dl-file">⬇ Download file</button></div>' +
            '<p class="hint">Saving keeps it on this device and shows it in OpenDB for you right away! Publishing proposes it to the public repository, where a maintainer reviews it before everyone can see it!</p>' +
            '</div><div class="card preview-card"><p class="muted" style="margin-bottom:8px">Live preview</p><div id="preview"></div></div></div>';

        const get = (id) => $(id).value;
        const list = (id) => get(id).split(',').map((s) => s.trim()).filter(Boolean);
        let file = base && base.type === 'media' ? { dataUrl: base.dataUrl || null, mime: base.mime, width: base.width, height: base.height, file: base.file } : null;
        function current() {
            const info = {};
            get('f-infobox').split('\n').forEach((l) => { const m = /^\s*([^:]+):\s*(.+)$/.exec(l); if (m) info[m[1].trim()] = m[2].trim(); });
            const e = {
                id: get('f-id').trim(), type, title: get('f-title').trim(), summary: get('f-summary').trim(), body: get('f-body'),
                tags: list('f-tags'), authors: list('f-authors'), infobox: info,
                created: d.created || today(), updated: today(), license: 'CC0-1.0',
            };
            if (type === 'paper') { e.abstract = get('f-abstract').trim(); e.categories = list('f-categories'); }
            if (type === 'media' && file) Object.assign(e, { mime: file.mime, width: file.width, height: file.height }, file.dataUrl ? { dataUrl: file.dataUrl } : {}, file.file ? { file: file.file } : {});
            return e;
        }
        function problems(e, publishing) {
            const p = [];
            if (!e.title) p.push('Add a title!');
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) p.push('The address can only use lowercase letters, numbers and single dashes!');
            else if (!base && byId.has(e.id)) p.push('Another entry already uses the address “' + e.id + '”!');
            if (!e.summary) p.push('Add a one-sentence summary!');
            if (type === 'paper' && !e.abstract) p.push('Papers need an abstract!');
            if (type === 'media' && !(e.dataUrl || e.file)) p.push('Choose a file to share!');
            if (type === 'article' && e.body.trim().length < 40) p.push('Write a little more of the article (at least a couple of sentences)!');
            if (!$('f-cc0').checked) p.push('Tick the public domain (CC0) box: everything in OpenDB is free for everyone!');
            if (publishing && type === 'media' && !e.dataUrl) p.push('Choose the file again so it can be included!');
            return p;
        }
        function preview() {
            const e = current();
            const fake = Object.assign({}, e, { local: true });
            const img = type === 'media' && (e.dataUrl || e.file) ? '<figure class="figure"><img src="' + esc(e.dataUrl || mediaSrc(e)) + '" alt=""></figure>' : '';
            const head = type === 'paper' ? '<p class="authors">' + esc(e.authors.join(', ')) + '</p>' + (e.abstract ? '<div class="abstract"><b>Abstract</b>' + esc(e.abstract) + '</div>' : '') : '<p class="lead">' + esc(e.summary) + '</p>';
            $('preview').innerHTML = '<h1 class="page">' + esc(e.title || 'Untitled') + badge(fake) + '</h1>' + head + img + '<div class="md">' + renderMd(e.body) + '</div>';
        }
        function syncType() {
            $('media-fields').hidden = type !== 'media';
            $('paper-fields').hidden = type !== 'paper';
            preview();
        }
        $('form').addEventListener('input', (ev) => {
            if (ev.target.id === 'f-title' && !idTouched) $('f-id').value = slug(get('f-title'));
            if (ev.target.id === 'f-id') idTouched = true;
            $('problems').innerHTML = '';
            preview();
        });
        if ($('types')) $('types').onclick = (ev) => {
            const b = ev.target.closest('[data-type]');
            if (!b) return;
            type = b.dataset.type;
            history.replaceState(null, '', '#/new/' + type);
            $('types').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
            $('form').querySelector('#f-body').closest('label').firstChild.textContent = (type === 'paper' ? 'Full text' : type === 'media' ? 'Description' : 'Article') + ' ';
            syncType();
        };
        $('f-file').onchange = (ev) => {
            const f = ev.target.files[0];
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) { toast('That file is over 2 MB! Try a smaller one!'); ev.target.value = ''; return; }
            const r = new FileReader();
            r.onload = () => {
                const img = new Image();
                img.onload = () => {
                    file = { dataUrl: r.result, mime: f.type || 'application/octet-stream', width: img.naturalWidth, height: img.naturalHeight };
                    $('file-info').textContent = f.name + ' · ' + Math.round(f.size / 1024) + ' KB · ' + img.naturalWidth + ' × ' + img.naturalHeight;
                    if (!get('f-title')) { $('f-title').value = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '); if (!idTouched) $('f-id').value = slug(get('f-title')); }
                    preview();
                };
                img.onerror = () => { toast('That file could not be read as an image!'); };
                img.src = r.result;
            };
            r.readAsDataURL(f);
        };
        function showProblems(p) { $('problems').innerHTML = p.map((x) => '<li>' + esc(x) + '</li>').join(''); if (p.length) $('problems').scrollIntoView({ block: 'center', behavior: 'smooth' }); return !p.length; }
        $('save-local').onclick = () => {
            const e = current();
            if (!showProblems(problems(e, false))) return;
            local = local.filter((x) => x.id !== e.id).concat([e]);
            if (!saveLocal()) return;
            reindex();
            toast('Saved on this device!');
            location.hash = '#/e/' + e.id;
        };
        $('dl-file').onclick = () => {
            const e = current();
            if (!showProblems(problems(e, false))) return;
            download(e.id + '.md', toMarkdownFile(e), 'text/markdown');
            if (e.dataUrl) downloadUrl(e.id + extOf(e), e.dataUrl);
        };
        $('publish').onclick = () => {
            const e = current();
            if (!showProblems(problems(e, true))) return;
            publish(e, !!base && !base.local);
        };
        syncType();
    }

    // Publishing: GitHub opens with the new file filled in, ready to propose as a change!
    function publish(e, existing) {
        const md = toMarkdownFile(e);
        const entriesUrl = 'https://github.com/' + REPO + '/new/' + BRANCH + '/' + REPO_DIR + '/entries?filename=' + encodeURIComponent(e.id + '.md') + '&value=' + encodeURIComponent(md);
        const editUrl = 'https://github.com/' + REPO + '/edit/' + BRANCH + '/' + REPO_DIR + '/entries/' + e.id + '.md';
        const uploadMedia = 'https://github.com/' + REPO + '/upload/' + BRANCH + '/' + REPO_DIR + '/media';
        const uploadEntries = 'https://github.com/' + REPO + '/upload/' + BRANCH + '/' + REPO_DIR + '/entries';
        const short = entriesUrl.length < 7500;
        let steps;
        if (existing) {
            steps = '<ol><li>Your new version is copied below (and to your clipboard)!</li><li><a href="' + editUrl + '" target="_blank" rel="noopener noreferrer">Open the entry on GitHub</a>, select everything in the editor and paste!</li><li>Choose “Propose changes”. A maintainer reviews it, and then it is live for everyone!</li></ol>';
            copy(md);
        } else if (e.type === 'media') {
            download(e.id + '.md', md, 'text/markdown');
            downloadUrl(e.id + extOf(e), e.dataUrl);
            steps = '<ol><li>Two files were downloaded: <b>' + esc(e.id + extOf(e)) + '</b> (the file) and <b>' + esc(e.id) + '.md</b> (its description)!</li><li><a href="' + uploadMedia + '" target="_blank" rel="noopener noreferrer">Upload ' + esc(e.id + extOf(e)) + ' to the media folder</a> and choose “Propose changes”!</li><li>Then <a href="' + uploadEntries + '" target="_blank" rel="noopener noreferrer">upload ' + esc(e.id) + '.md to the entries folder</a> the same way!</li></ol>';
        } else if (short) {
            window.open(entriesUrl, '_blank', 'noopener');
            steps = '<ol><li>GitHub opened in a new tab with your entry already filled in! (<a href="' + entriesUrl + '" target="_blank" rel="noopener noreferrer">Open it again</a>)</li><li>Sign in if asked, then choose “Propose changes”!</li><li>A maintainer reviews it, and then it is live for everyone!</li></ol>';
        } else {
            download(e.id + '.md', md, 'text/markdown');
            steps = '<ol><li>Your entry is long, so it was downloaded as <b>' + esc(e.id) + '.md</b>!</li><li><a href="' + uploadEntries + '" target="_blank" rel="noopener noreferrer">Upload it to the entries folder on GitHub</a> and choose “Propose changes”!</li></ol>';
        }
        local = local.filter((x) => x.id !== e.id).concat([e]);
        saveLocal();
        reindex();
        modal('Publish “' + e.title + '”', '<p>Thank you for giving this to everyone!</p>' + steps + '<p class="hint">It is also saved on this device, so you can see it right away! You need a free GitHub account to propose changes!</p><b>The entry file</b><pre id="md-out">' + esc(md) + '</pre><button class="gel small plain" data-copy="md-out">Copy file</button>');
    }

    /* ---------- Helpers ---------- */
    function download(name, text, type) { downloadUrl(name, URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })), true); }
    function downloadUrl(name, url, revoke) {
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    function copy(text) { try { navigator.clipboard.writeText(text).then(() => toast('Copied!'), () => {}); } catch (e) { /* the text is shown to copy by hand */ } }
    function modal(title, html) {
        $('modal-title').textContent = title;
        $('modal-body').innerHTML = html;
        $('modal').hidden = false;
    }
    $('modal-x').onclick = () => { $('modal').hidden = true; };
    $('modal').onclick = (ev) => {
        if (ev.target.id === 'modal') $('modal').hidden = true;
        const c = ev.target.closest('[data-copy]');
        if (c) copy($(c.dataset.copy).textContent);
    };
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') $('modal').hidden = true; });
    let toastT = null;
    function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

    /* ---------- Router ---------- */
    function route() {
        const raw = location.hash.replace(/^#\/?/, '');
        const [pathPart, query] = raw.split('?');
        const parts = pathPart.split('/').map(decodeURIComponent);
        const params = new URLSearchParams(query || '');
        document.title = 'OpenDB - Radii Office';
        document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#/' + parts.slice(0, 2).join('/')));
        if (loadError && !all().length) {
            view.innerHTML = '<div class="card empty"><h1 class="page">OpenDB could not load its data!</h1><p>' + esc(loadError) + '</p></div>';
            return;
        }
        switch (parts[0]) {
            case '': pageHome(); break;
            case 'browse': TYPES[parts[1]] ? pageBrowse(parts[1], params) : pageHome(); break;
            case 'e': pageEntry(parts[1] || ''); break;
            case 'tag': pageTag(parts[1] || ''); break;
            case 'search': pageSearch(parts.slice(1).join('/')); break;
            case 'new': pageEditor(parts[1], params, null); break;
            case 'edit': pageEditor(null, params, parts[1]); break;
            case 'mine': pageMine(); break;
            case 'random': {
                const list = all();
                if (list.length) location.replace('#/e/' + list[Math.floor(Math.random() * list.length)].id);
                return;
            }
            default: pageEntry(parts[0]);
        }
        if (parts[0] !== 'search') $('q').value = '';
        window.scrollTo(0, 0);
    }
    // footnote links jump inside the page without changing the route
    view.addEventListener('click', (ev) => {
        const a = ev.target.closest('a[data-scroll]');
        if (!a) return;
        ev.preventDefault();
        const t = document.getElementById(a.getAttribute('href').slice(1));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('search-form').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const q = $('q').value.trim();
        if (q) location.hash = '#/search/' + encodeURIComponent(q);
    });
    let liveT = null;
    $('q').addEventListener('input', () => {
        clearTimeout(liveT);
        liveT = setTimeout(() => { const q = $('q').value.trim(); if (q.length > 1) history.replaceState(null, '', '#/search/' + encodeURIComponent(q)), pageSearch(q); }, 180);
    });
    window.addEventListener('hashchange', route);

    /* ---------- Start ---------- */
    loadLocal();
    fetch('data/index.json', { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error('data/index.json answered ' + r.status); return r.json(); })
        .then((data) => { shared = Array.isArray(data.entries) ? data.entries : []; })
        .catch((e) => { loadError = (location.protocol === 'file:' ? 'Browsers block reading files on file:// pages, so open OpenDB through a web server! ' : '') + e.message; })
        .then(() => { reindex(); route(); });

    window.OpenDB = { search: (q) => search(q).map((r) => r.e.id), entries: () => all(), toMarkdownFile, renderMd };
})();
