// Radii Office documentation app: reads docs/nav.json, loads each page (Keydown text), and draws it with Dark Keydown (kd-dark.js)!
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const V = window.DOCS_V || '1';
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  // ---------- theme ----------
  const setTheme = (t) => { document.documentElement.setAttribute('data-theme', t); store.set('docs-theme', t); const m = $('meta[name=theme-color]'); if (m) m.content = t === 'light' ? '#f5f7fc' : '#0a0f1d'; };
  setTheme(store.get('docs-theme') === 'light' ? 'light' : 'dark'); // dark unless you chose light
  $('#theme-btn').addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
  $('#menu-btn').addEventListener('click', () => document.body.classList.toggle('menu'));

  let nav = [], flat = [], cur = null, seq = 0;
  const side = $('#side'), doc = $('#doc'), toc = $('#toc'), pn = $('#pn'), crumb = $('#crumb');

  async function getJSON(u) { const r = await fetch(u + '?v=' + V); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
  async function getText(u) { const r = await fetch(u + '?v=' + V); if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); }

  // ---------- sidebar ----------
  function drawSide() {
    side.innerHTML = nav.map((g) => '<h4>' + esc(g.group) + '</h4>' + g.pages.map((p) => '<a href="#/' + p.id + '" data-id="' + p.id + '">' + esc(p.title) + '</a>').join('')).join('');
  }
  function markSide() {
    side.querySelectorAll('a').forEach((a) => a.classList.toggle('on', cur && a.dataset.id === cur.id));
    const on = side.querySelector('a.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }

  // ---------- one page ----------
  const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  function decorate(root) {
    const used = new Set();
    const heads = [...root.querySelectorAll('h1, h2, h3')];
    for (const h of heads) {
      let id = slug(h.textContent), n = 2;
      while (used.has(id)) id = slug(h.textContent) + '-' + n++;
      used.add(id);
      h.id = id;
      if (h.localName !== 'h1') { const a = document.createElement('a'); a.className = 'anchor'; a.href = '#/' + (cur ? cur.id : '') + '/' + id; a.textContent = '#'; a.setAttribute('aria-label', 'Link to this section'); h.append(a); }
    }
    root.querySelectorAll('pre').forEach((pre) => {
      const b = document.createElement('button');
      b.className = 'copy'; b.type = 'button'; b.textContent = 'Copy';
      b.addEventListener('click', () => { const t = (pre.querySelector('code') || pre).textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = 'Copied!'; setTimeout(() => (b.textContent = 'Copy'), 1400); }, () => { b.textContent = 'Press Ctrl+C'; }); });
      pre.append(b);
    });
    root.querySelectorAll('table').forEach((t) => { if (!t.parentElement.classList.contains('tbl-wrap')) { const w = document.createElement('div'); w.className = 'tbl-wrap'; t.replaceWith(w); w.append(t); } });
    // Keydown has no numbered lists: lines that start with "1. " become a real ordered list
    for (const d of [...root.querySelectorAll(':scope > div')]) {
      if (!/^\d+\.\s/.test(d.textContent) || d.querySelector('br') || d.dataset.ol) continue;
      const run = [d]; let n = d.nextElementSibling;
      while (n && n.localName === 'div' && /^\d+\.\s/.test(n.textContent) && !n.querySelector('br')) { run.push(n); n = n.nextElementSibling; }
      const ol = document.createElement('ol');
      for (const r of run) { const li = document.createElement('li'); li.append(...r.childNodes); li.firstChild && li.firstChild.nodeType === 3 && (li.firstChild.data = li.firstChild.data.replace(/^\d+\.\s/, '')); ol.append(li); }
      run[0].replaceWith(ol); run.slice(1).forEach((r) => r.remove());
    }
    // the contrast fixer is for chips and highlights: headings, tables and code take the page's own colors
    root.querySelectorAll('h1,h2,h3,h4,h5,h6,th,td,pre,pre *').forEach((e) => { if (e.hasAttribute('data-kd-fix')) { e.style.removeProperty('color'); e.removeAttribute('data-kd-fix'); } });
    // links to other pages and to this site open in the same tab
    root.querySelectorAll('a[href]').forEach((a) => {
      let h = a.getAttribute('href');
      if (h.startsWith(SITE)) { h = h.slice(SITE.length) || '/'; a.setAttribute('href', h); }
      if (h[0] === '#' || (h[0] === '/' && h[1] !== '/')) { a.removeAttribute('target'); a.setAttribute('rel', 'noopener'); }
    });
    return heads.filter((h) => h.localName !== 'h1');
  }
  // Keydown Next blocks (callouts, accordions, cards, tabs...) have light backgrounds of their own. On the dark page their text would inherit light text, so wherever a light
  // background meets light text, the text turns dark. Runs after every page draw and whenever the theme changes.
  const rgbOf = (str) => {
    let m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/.exec(str);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    m = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/.exec(str);
    return m ? [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]] : null;
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  function fixBlocks() {
    doc.querySelectorAll('[data-blk]').forEach((e) => { e.style.removeProperty('color'); e.removeAttribute('data-blk'); });
    for (const el of doc.querySelectorAll('.kdx-block, .kdx-block *')) {
      const cs = getComputedStyle(el);
      const bg = rgbOf(cs.backgroundColor), fg = rgbOf(cs.color);
      if (bg && fg && bg[3] > 0.6 && lum(bg) > 0.6 && lum(fg) > 0.45) { el.style.setProperty('color', '#1e293b', 'important'); el.setAttribute('data-blk', ''); }
    }
  }
  new MutationObserver(() => requestAnimationFrame(fixBlocks)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  function drawToc(heads) {
    if (!heads.length) { toc.innerHTML = ''; return; }
    toc.innerHTML = '<h5>On this page</h5>' + heads.map((h) => '<a class="' + (h.localName === 'h3' ? 'l3' : 'l2') + '" href="#/' + cur.id + '/' + h.id + '" data-h="' + h.id + '">' + esc(h.textContent.replace(/#$/, '')) + '</a>').join('');
  }
  function spy() {
    const links = [...toc.querySelectorAll('a')];
    if (!links.length) return;
    let best = null;
    for (const a of links) { const h = document.getElementById(a.dataset.h); if (h && h.getBoundingClientRect().top < 120) best = a; }
    links.forEach((a) => a.classList.toggle('on', a === best));
  }
  addEventListener('scroll', spy, { passive: true });

  function drawPrevNext() {
    const i = flat.findIndex((p) => p.id === cur.id);
    const a = flat[i - 1], b = flat[i + 1];
    pn.innerHTML = (a ? '<a href="#/' + a.id + '"><small>Previous</small><b>← ' + esc(a.title) + '</b></a>' : '<span></span>') + (b ? '<a class="next" href="#/' + b.id + '"><small>Next</small><b>' + esc(b.title) + ' →</b></a>' : '');
  }

  async function show(id, anchor) {
    const page = flat.find((p) => p.id === id) || flat[0];
    const my = ++seq;
    cur = page;
    document.body.classList.remove('menu');
    markSide();
    const group = nav.find((g) => g.pages.includes(page));
    crumb.textContent = group ? group.group : '';
    document.title = page.title + ' | Radii Office Docs';
    if (!doc.dataset.id || doc.dataset.id !== page.id) doc.innerHTML = '<p class="loading">Loading…</p>';
    let out;
    try {
      if (page.kind === 'catalog') out = await catalog(page);
      else if (page.kind === 'sections') out = await sectionsPage(page);
      else if (page.kind === 'guide') out = await guidePage(page);
      else {
        const text = await getText('/docs/pages/' + page.id + '.kd');
        out = await KdLite.render(siteLinks(text));
      }
    } catch (e) {
      if (my === seq) doc.innerHTML = '<p class="err">This page could not be loaded: ' + esc(e.message) + '. Check your connection and try again!</p>';
      return;
    }
    if (my !== seq) return;
    doc.innerHTML = '';
    doc.dataset.id = page.id;
    doc.append(out);
    drawToc(decorate(out));
    fixBlocks();
    drawPrevNext();
    if (page.kind === 'catalog') wireCatalog(out);
    if (anchor) { const t = document.getElementById(anchor); if (t) t.scrollIntoView(); else scrollTo(0, 0); } else scrollTo(0, 0);
    spy();
  }

  // ---------- the Keydown catalog: every section of the full Keydown article, drawn on demand ----------
  let kdSections = null;
  async function loadSections() {
    if (kdSections) return kdSections;
    const raw = await getText('/opendb/data/entries/keydown.kd');
    const body = raw.replace(/^---[\s\S]*?\n---\n/, '');
    const parts = body.split(/^## /m);
    kdSections = [{ id: 'intro', title: 'Introduction', text: parts[0] }];
    for (const p of parts.slice(1)) { const nl = p.indexOf('\n'); const title = p.slice(0, nl).trim(); kdSections.push({ id: slug(title), title, text: p.slice(nl + 1) }); }
    return kdSections;
  }
  // a page made of an intro plus chosen sections of the full Keydown article
  async function optionalText(u) { try { return await getText(u); } catch (e) { return ''; } }
  async function sectionsPage(page) {
    const secs = await loadSections();
    const intro = await optionalText('/docs/pages/' + page.id + '.kd');
    const out = await KdLite.render(siteLinks(intro || '# ' + page.title));
    for (const sid of page.sections) {
      const s = secs.find((x) => x.id === sid);
      if (!s) continue;
      const o = await KdLite.render('## ' + s.title + '\n\n' + s.text);
      out.append(...o.childNodes);
    }
    return out;
  }
  // a page made of an intro plus a ready-made HTML guide (built from the app's own help by scripts/build_docs.mjs)
  async function guidePage(page) {
    const intro = await optionalText('/docs/pages/' + page.id + '.kd');
    const out = await KdLite.render(siteLinks(intro || '# ' + page.title));
    const html = await getText('/docs/generated/' + page.guide);
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    KdLite.clean(doc.body);
    const box = document.createElement('div');
    box.className = 'guide';
    box.append(...doc.body.childNodes);
    out.append(box);
    return out;
  }
  // Keydown only makes links from https:, mailto: and # addresses, so links to this site's own pages ("/writeout") are written with a stand-in address first
  // and turned back into same-tab links by decorate()
  const SITE = 'https://radii-office.invalid';
  const siteLinks = (t) => t.replace(/\]\((\/[^)\s]*)\)/g, '](' + SITE + '$1)');
  async function catalog(page) {
    const secs = await loadSections();
    const intro = await getText('/docs/pages/' + page.id + '.kd');
    const out = await KdLite.render(intro);
    const box = document.createElement('div');
    box.innerHTML = '<div class="cat-top"><input type="search" id="cat-q" placeholder="Filter the ' + secs.length + ' sections…" aria-label="Filter sections"></div><div class="cat-list" id="cat-list">' + secs.map((s) => '<a href="#/' + page.id + '/s-' + s.id + '" data-s="' + s.id + '">' + esc(s.title) + '</a>').join('') + '</div><div id="cat-body"></div>';
    out.append(box);
    return out;
  }
  async function wireCatalog(out) {
    const q = $('#cat-q', out), list = $('#cat-list', out), body = $('#cat-body', out);
    q.addEventListener('input', () => { const v = q.value.toLowerCase(); list.querySelectorAll('a').forEach((a) => (a.style.display = a.textContent.toLowerCase().includes(v) ? '' : 'none')); });
    const open = async (sid) => {
      list.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.s === sid));
      const s = kdSections.find((x) => x.id === sid);
      if (!s) { body.innerHTML = ''; return; }
      body.innerHTML = '<p class="loading">Drawing ' + esc(s.title) + '…</p>';
      const o = await KdLite.render('## ' + s.title + '\n\n' + s.text);
      body.innerHTML = '';
      const sec = document.createElement('div'); sec.className = 'cat-sec'; sec.append(o); body.append(sec);
      decorate(sec);
      fixBlocks();
    };
    wireCatalog.open = open;
    const m = /^#\/[^/]+\/s-(.+)$/.exec(location.hash);
    if (m) { await open(m[1]); const t = $('#cat-body'); if (t) t.scrollIntoView(); }
  }

  // ---------- routing ----------
  function route() {
    const m = /^#\/([^/]*)(?:\/(.*))?$/.exec(location.hash) || [];
    const id = m[1] || (flat[0] && flat[0].id), a = m[2] || '';
    if (cur && cur.id === id && doc.dataset.id === id) {
      if (a.startsWith('s-') && wireCatalog.open) { wireCatalog.open(a.slice(2)).then(() => { const t = $('#cat-body'); if (t) t.scrollIntoView(); }); return; }
      const t = a && document.getElementById(a); if (t) t.scrollIntoView(); else if (!a) scrollTo(0, 0);
      return;
    }
    show(id, a.startsWith('s-') ? '' : a);
  }
  addEventListener('hashchange', route);

  // ---------- search (Ctrl+K or /) ----------
  let index = null;
  const sm = $('#sm'), sq = $('#sq'), sr = $('#sr');
  async function openSearch() {
    sm.classList.add('open'); sq.value = ''; sq.focus(); sr.innerHTML = '<p class="sempty">Type to search every page!</p>';
    if (!index) { try { index = await getJSON('/docs/search.json'); } catch (e) { sr.innerHTML = '<p class="sempty">Search could not load. Try again in a moment!</p>'; } }
  }
  const closeSearch = () => sm.classList.remove('open');
  function runSearch() {
    if (!index) return;
    const terms = sq.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { sr.innerHTML = '<p class="sempty">Type to search every page!</p>'; return; }
    const hits = [];
    for (const e of index) {
      const t = e.t.toLowerCase(), h = (e.h || '').toLowerCase(), x = e.x.toLowerCase();
      let score = 0, ok = true;
      for (const w of terms) {
        let s = 0;
        if (t.includes(w)) s += 12; if (h.includes(w)) s += 8; if (x.includes(w)) s += 2;
        if (!s) { ok = false; break; }
        score += s;
      }
      if (ok) hits.push({ e, score });
    }
    hits.sort((a, b) => b.score - a.score);
    const mark = (s) => { let r = esc(s); for (const w of terms) r = r.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); return r; };
    sr.innerHTML = hits.length ? hits.slice(0, 30).map(({ e }, i) => {
      const at = e.x.toLowerCase().indexOf(terms[0]);
      const snip = at < 0 ? e.x.slice(0, 130) : (at > 50 ? '…' : '') + e.x.slice(Math.max(0, at - 50), at + 100) + '…';
      return '<a href="#/' + e.id + (e.a ? '/' + e.a : '') + '" class="' + (i ? '' : 'on') + '"><small>' + esc(e.g) + '</small><b>' + mark(e.h ? e.t + ' › ' + e.h : e.t) + '</b><span>' + mark(snip) + '</span></a>';
    }).join('') : '<p class="sempty">Nothing found for “' + esc(sq.value) + '”. Try a shorter word!</p>';
  }
  sq.addEventListener('input', runSearch);
  sq.addEventListener('keydown', (e) => {
    const items = [...sr.querySelectorAll('a')], i = items.findIndex((a) => a.classList.contains('on'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; items[i] && items[i].classList.remove('on'); const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[n].classList.add('on'); items[n].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { const a = items[i] || items[0]; if (a) { location.hash = a.getAttribute('href'); closeSearch(); } }
  });
  sr.addEventListener('click', (e) => { if (e.target.closest('a')) closeSearch(); });
  sm.addEventListener('mousedown', (e) => { if (e.target === sm) closeSearch(); });
  $('#search-btn').addEventListener('click', openSearch);
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); sm.classList.contains('open') ? closeSearch() : openSearch(); }
    else if (e.key === 'Escape') closeSearch();
    else if (e.key === '/' && !/input|textarea/i.test(document.activeElement.localName)) { e.preventDefault(); openSearch(); }
  });

  // ---------- start ----------
  (async () => {
    try { nav = await getJSON('/docs/nav.json'); } catch (e) { doc.innerHTML = '<p class="err">The documentation list could not be loaded. Check your connection and try again!</p>'; return; }
    flat = nav.flatMap((g) => g.pages);
    drawSide();
    route();
  })();
})();
