/* =====================================================================
   Documents! Every office app can keep MANY saved documents, not just one!
   File > Documents lists them all (saved in this browser): open one, start a new one, make a copy, rename or delete.
   Under the hood each document is its own Radii file (the app's ?file=ID link, see radii-file.js), so nothing else in the
   app has to change. Load this right after office-shell.js (identical copy per app)!
   ===================================================================== */
(function () {
    'use strict';
    const RF = window.RadiiFile;
    // OfficeShell apps get a File > Documents page; apps without it (Imbuer, Zonerider, Inkpath) call RadiiDocs.mount(element) or RadiiDocs.openDialog()
    let OS = window.OfficeShell;
    if (!RF || !RF.ids || window.RadiiDocs) return;
    const shell = !!OS;
    const orig = shell ? OS.init : null;
    let cfgRef = shell ? null : { key: (location.pathname.split('/').filter(Boolean).slice(-2)[0] || 'app').replace(/\.html?$/, '') || 'app', title: null };
    if (!shell) {
        const svgs = {
            file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>', newDoc: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
            export: '<path d="M12 16V4m0 0l-4 4m4-4l4 4M5 14v6h14v-6"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
            trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/>'
        };
        OS = {
            ico: function (n) { return '<svg class="os-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' + (svgs[n] || svgs.file) + '</svg>'; },
            toast: function (m) {
                const t = document.createElement('div');
                t.textContent = m;
                t.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:#1f2937;color:#fff;padding:9px 16px;border-radius:10px;font:600 13px system-ui;z-index:2147483200;box-shadow:0 6px 20px rgba(0,0,0,.3)';
                document.body.appendChild(t);
                setTimeout(function () { t.remove(); }, 1800);
            },
            confirm: function (title, text) { return Promise.resolve(window.confirm(text)); }
        };
    }

    const lsGet = function (k, d) { try { const v = window.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
    const lsSet = function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    const regKey = function () { return 'radii_docs_' + (cfgRef ? cfgRef.key : 'app'); };
    // the library: { docs: { id: { name, auto, created, modified } } }, '' is the app's main document
    function load() { const r = lsGet(regKey(), null); return r && r.docs ? r : { docs: {} }; }
    function save(r) { lsSet(regKey(), r); }
    function appTitle() {
        try { const t = cfgRef && typeof cfgRef.title === 'function' ? String(cfgRef.title() || '').trim() : ''; return t && t !== 'Not signed in' ? t.slice(0, 60) : ''; } catch (e) { return ''; }
    }
    // makes sure the library knows the open document and every document that is in storage
    function sync() {
        const r = load();
        const now = Date.now();
        let changed = false;
        const ids = [''].concat(RF.ids());
        ids.forEach(function (id) {
            if (!r.docs[id]) {
                if (id && !RF.size(id)) return;
                r.docs[id] = { name: '', auto: true, created: now, modified: now };
                changed = true;
            }
        });
        const cur = r.docs[RF.id] || (r.docs[RF.id] = { name: '', auto: true, created: now, modified: now });
        const t = appTitle();
        if (cur.auto && t && cur.name !== t) { cur.name = t; changed = true; }
        if (RF.touched() > (cur._seen || 0)) { cur._seen = RF.touched(); cur.modified = RF.touched(); changed = true; }
        if (changed) save(r);
        return r;
    }
    const nameOf = function (r, id) {
        const d = r.docs[id];
        return (d && d.name) || (id ? 'Document ' + id.slice(0, 4) : 'Main document');
    };
    const kb = function (n) { return n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 102.4) / 10 + ' KB' : Math.round(n / 104857.6) / 10 + ' MB'; };
    const when = function (t) {
        if (!t) return 'not edited yet';
        const d = new Date(t), days = Math.floor((Date.now() - t) / 86400000);
        const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        return days < 1 && d.getDate() === new Date().getDate() ? 'today ' + time : days < 2 ? 'yesterday ' + time : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };
    // a name is read-only (so a click on the row switches to it) until it is double-clicked
    const renameOnDblClick = function (input) {
        input.addEventListener('dblclick', function () { input.readOnly = false; input.focus(); input.select(); });
        input.addEventListener('blur', function () { input.readOnly = true; });
    };
    const go = function (id) { try { window.localStorage.setItem('radii_last_doc_' + (cfgRef ? cfgRef.key : 'app'), id); } catch (e) {} setTimeout(function () { location.href = RF.link(id); }, 220); };

    function newDocument(r) {
        const id = RF.newId();
        const n = Object.keys(r.docs).length;
        r.docs[id] = { name: 'Untitled document ' + (n + 1), auto: false, created: Date.now(), modified: Date.now() };
        save(r);
        OS.toast('New document!');
        go(id);
    }
    // "New" in an app wipes the open document: this first stores the open one in File > Documents (so nothing is lost,
    // and both can be renamed or deleted there)
    function archive() {
        try {
            if (!RF.size(RF.id)) return false;
            const r = sync();
            const cur = r.docs[RF.id] || {};
            const nid = RF.newId();
            RF.copy(RF.id, nid);
            r.docs[nid] = { name: nameOf(r, RF.id) + (cur.auto ? '' : ' (earlier)'), auto: false, created: cur.created || Date.now(), modified: cur.modified || Date.now() };
            save(r);
            OS.toast('The earlier document is kept in File > Documents!');
            return true;
        } catch (e) { return false; }
    }
    function copyDocument(r, id) {
        const nid = RF.newId();
        RF.copy(id, nid);
        r.docs[nid] = { name: nameOf(r, id) + ' (copy)', auto: false, created: Date.now(), modified: Date.now() };
        save(r);
        OS.toast('Made a copy!');
    }

    function render(b) {
        const r = sync();
        b.innerHTML = '<h1>Documents</h1><p class="rd-hint">Every document you keep is saved in this browser. Open one, start a new one, make a copy, rename it or delete it. Download a copy from File &gt; Save As (or Export) to keep one anywhere else!</p>'
            + '<div class="rd-bar"><button type="button" class="rd-new">' + OS.ico('newDoc') + '<span>New document</span></button></div><div class="rd-list"></div>';
        const list = b.querySelector('.rd-list');
        const ids = Object.keys(r.docs).filter(function (id) { return id === RF.id || id === '' || RF.size(id); });
        ids.sort(function (a, c) { return (a === RF.id ? -1 : 0) - (c === RF.id ? -1 : 0) || (r.docs[c].modified || 0) - (r.docs[a].modified || 0); });
        ids.forEach(function (id) {
            const d = r.docs[id], cur = id === RF.id;
            const row = document.createElement('div');
            row.className = 'rd-row' + (cur ? ' rd-cur' : '');
            row.innerHTML = (b.classList.contains('rd-embed') ? '<img class="rd-fav" src="favicon-96.png" alt="">' : '<span class="rd-ico">' + OS.ico('file') + '</span>')
                + '<div class="rd-main"><input class="rd-name" readonly title="Double-click to rename" spellcheck="false" aria-label="Document name" value="' + esc(nameOf(r, id)) + '"><span class="rd-meta">' + (cur ? '<b class="rd-badge">Open now</b> ' : '') + 'Edited ' + esc(when(d.modified)) + ' · ' + esc(kb(RF.size(id))) + '</span></div>'
                + '<div class="rd-act">'
                + (cur ? '' : '<button type="button" class="rd-open">Open</button>')
                + '<button type="button" class="rd-tab" title="Open in a new tab">' + OS.ico('export') + '</button>'
                + '<button type="button" class="rd-copy" title="Make a copy">' + OS.ico('copy') + '</button>'
                + (cur ? '' : '<button type="button" class="rd-del" title="Delete this document">' + OS.ico('trash') + '</button>')
                + '</div>';
            const input = row.querySelector('.rd-name');
            const rename = function () {
                const v = input.value.trim().slice(0, 60) || nameOf(r, id);
                const rr = load();
                if (!rr.docs[id]) rr.docs[id] = { created: Date.now(), modified: Date.now() };
                if (rr.docs[id].name !== v) { rr.docs[id].name = v; rr.docs[id].auto = false; save(rr); }
                input.value = v;
            };
            input.addEventListener('change', rename);
            renameOnDblClick(input);
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
            const on = function (sel, fn) { const x = row.querySelector(sel); if (x) x.addEventListener('click', fn); };
            // clicking anywhere on a row (not its name box or buttons) switches to that document
            if (!cur) row.addEventListener('click', function (e) { if (!e.target.closest('button, input:not([readonly])')) go(id); });
            on('.rd-open', function () { go(id); });
            on('.rd-tab', function () { window.open(RF.link(id), '_blank', 'noopener'); });
            on('.rd-copy', function () { copyDocument(load(), id); render(b); });
            on('.rd-del', function () {
                OS.confirm('Delete document', 'Delete "' + nameOf(r, id) + '" for good? This cannot be undone!', 'Delete', true).then(function (ok) {
                    if (!ok) return;
                    RF.remove(id);
                    const rr = load();
                    delete rr.docs[id];
                    save(rr);
                    OS.toast('Deleted!');
                    render(b);
                });
            });
            list.appendChild(row);
        });
        b.querySelector('.rd-new').addEventListener('click', function () { newDocument(load()); });
    }

    // File > Tabs (Writeout) / File > Notes (Bitbook): change between the tabs of the open document, rename them, add and close them
    function tabsReady() { try { return typeof kdTabs !== 'undefined' && Array.isArray(kdTabs) && typeof kdActivateTab === 'function'; } catch (e) { return false; } }
    function renderTabs(b) {
        const word = cfgRef && cfgRef.key === 'bitbook' ? 'note' : 'tab';
        const Word = word[0].toUpperCase() + word.slice(1);
        b.innerHTML = '<h1>' + Word + 's</h1><p class="rd-hint">Change between the ' + word + 's of this document: click one to open it. Double-click a name to rename it.</p>'
            + '<div class="rd-bar"><button type="button" class="rd-new">' + OS.ico('newDoc') + '<span>New ' + word + '</span></button></div><div class="rd-list"></div>';
        const list = b.querySelector('.rd-list');
        const words = function (t) { return (String(t.html || '').replace(/<[^>]*>/g, ' ').match(/\S+/g) || []).length; };
        kdTabs.forEach(function (tab) {
            const cur = tab.id === kdActiveTabId;
            const row = document.createElement('div');
            row.className = 'rd-row' + (cur ? ' rd-cur' : '');
            row.innerHTML = '<span class="rd-ico">' + OS.ico('file') + '</span><div class="rd-main"><input class="rd-name" readonly title="Double-click to rename" spellcheck="false" aria-label="' + Word + ' name" value="' + esc(tab.name) + '"><span class="rd-meta">'
                + (cur ? '<b class="rd-badge">Open now</b> · ' : '') + words(tab).toLocaleString() + ' word' + (words(tab) === 1 ? '' : 's') + '</span></div>'
                + '<div class="rd-act">' + (cur ? '' : '<button type="button" class="rd-open">Open</button>') + (kdTabs.length > 1 ? '<button type="button" class="rd-del" title="Close this ' + word + '">' + OS.ico('trash') + '</button>' : '') + '</div>';
            const input = row.querySelector('.rd-name');
            const rename = function () { const v = input.value.trim().substring(0, 60); if (v && v !== tab.name) { tab.name = v; kdSaveTabs(); kdRenderTabs(); } else input.value = tab.name; };
            input.addEventListener('change', rename);
            renameOnDblClick(input);
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
            const open = function () { if (tab.id !== kdActiveTabId) kdActivateTab(tab.id); OS.closeBackstage(); setTimeout(function () { OS.sync(); }, 30); };
            const ob = row.querySelector('.rd-open');
            if (ob) ob.addEventListener('click', open);
            if (!cur) row.addEventListener('click', function (e) { if (!e.target.closest('button, input:not([readonly])')) open(); });
            const del = row.querySelector('.rd-del');
            if (del) del.addEventListener('click', function () {
                OS.confirm('Close ' + word, 'Delete ' + word + ' "' + tab.name + '" for good? This cannot be undone!', 'Delete', true).then(function (ok) {
                    if (!ok) return;
                    kdTabs = kdTabs.filter(function (t) { return t.id !== tab.id; });
                    try { delete kdExpandedTabs[tab.id]; } catch (e) {}
                    if (kdActiveTabId === tab.id) {
                        kdActiveTabId = kdTabs[0].id;
                        canvas.innerHTML = kdTabs[0].html || '';
                        try { kdHydrateInteractions(); kdRenderOutline(); } catch (e) {}
                    }
                    kdSaveTabs();
                    kdRenderTabs();
                    renderTabs(b);
                });
            });
            list.appendChild(row);
        });
        b.querySelector('.rd-new').addEventListener('click', function () {
            const add = document.getElementById('tabs-add-btn');
            if (add) add.click();
            setTimeout(function () { OS.closeBackstage(); OS.sync(); }, 60);
        });
    }

    // File > Home shows ALL the documents (click one to switch to it), not just the open one
    function enhanceHome(b) {
        const card = b.querySelector('.bb-bs-doc');
        if (!card) return;
        const h2 = card.previousElementSibling && /^H2$/i.test(card.previousElementSibling.tagName) ? card.previousElementSibling : null;
        const r = sync();
        const img = card.querySelector('img');
        const curMeta = card.querySelector('span') ? card.querySelector('span').innerHTML : '';
        const wrap = document.createElement('div');
        wrap.className = 'rd-home';
        const ids = Object.keys(r.docs).filter(function (id) { return id === RF.id || RF.size(id); });
        ids.sort(function (a, c) { return (a === RF.id ? -1 : 0) - (c === RF.id ? -1 : 0) || (r.docs[c].modified || 0) - (r.docs[a].modified || 0); });
        ids.slice(0, 8).forEach(function (id) {
            const cur = id === RF.id;
            const item = document.createElement(cur ? 'div' : 'button');
            if (!cur) item.type = 'button';
            item.className = 'bb-bs-doc rd-home-doc' + (cur ? ' rd-home-cur' : '');
            item.innerHTML = (img ? '<img src="' + esc(img.getAttribute('src')) + '" alt="">' : '') + '<div><b>' + esc(nameOf(r, id)) + '</b><span>'
                + (cur ? '<em class="rd-badge">Open now</em> · ' + curMeta : 'Edited ' + esc(when(r.docs[id].modified)) + ' · ' + esc(kb(RF.size(id))) + ' · click to switch') + '</span></div>';
            if (!cur) item.addEventListener('click', function () { go(id); });
            wrap.appendChild(item);
        });
        const bar = document.createElement('div');
        bar.className = 'rd-home-bar';
        bar.innerHTML = '<button type="button" class="rd-new">' + OS.ico('newDoc') + '<span>New document</span></button>' + (ids.length > 8 ? '<span class="rd-hint">…and ' + (ids.length - 8) + ' more in Documents</span>' : '');
        bar.querySelector('.rd-new').addEventListener('click', function () { newDocument(load()); });
        if (h2) h2.textContent = ids.length > 1 ? 'Your documents' : h2.textContent;
        card.replaceWith(wrap);
        wrap.after(bar);
    }

    function css() {
        if (document.getElementById('radii-docs-css')) return;
        const s = document.createElement('style');
        s.id = 'radii-docs-css';
        s.textContent = '.rd-hint{margin:-8px 0 16px;color:var(--os-dim);font-size:13px;line-height:1.5;max-width:640px}'
            + '.rd-bar{margin-bottom:14px}.rd-new{display:inline-flex;align-items:center;gap:8px;font:700 13px var(--os-font,system-ui);padding:9px 16px;border-radius:10px;border:1px solid var(--os-accent-d,#555);color:#fff !important;cursor:pointer;background:linear-gradient(180deg,var(--os-gel1,#6aa5ff),var(--os-gel2,var(--os-accent,#2563eb)));box-shadow:0 2px 8px var(--os-gel-glow,rgba(0,0,0,.2))}'
            + '.rd-new .os-ico{width:18px;height:18px}.rd-list{display:flex;flex-direction:column;gap:8px;max-width:720px}'
            + '.rd-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;border:1px solid var(--os-menu-line,#ddd);background:var(--os-menu,#fff);transition:box-shadow .15s,border-color .15s}'
            + '.rd-row:hover{border-color:var(--os-accent,#2563eb);box-shadow:0 2px 10px rgba(0,0,0,.08)}.rd-cur{border-color:var(--os-accent,#2563eb);background:var(--os-accent-l,var(--os-hover,#eef))}'
            + '.rd-ico{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;color:var(--os-accent,#2563eb);background:var(--os-hover,#eef);flex:none}.rd-ico .os-ico{width:20px;height:20px}'
            + '.rd-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rd-name{border:0;background:transparent;font:700 15px var(--os-font,system-ui);color:var(--os-text,#222);padding:2px 4px;margin:0 -4px;border-radius:6px;outline:none;width:100%}'
            + '.rd-name[readonly]{cursor:pointer}.rd-name:not([readonly]):hover{background:var(--os-hover,#eee)}.rd-name:focus{background:var(--os-field,#fff);box-shadow:0 0 0 2px var(--os-accent,#2563eb)}'
            + '.rd-meta{font-size:12px;color:var(--os-dim,#666)}.rd-badge{color:var(--os-accent,#2563eb)}'
            + '.rd-act{display:flex;gap:6px;flex:none}.rd-act button{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--os-menu-line,#ddd);background:var(--os-field,#fff);color:var(--os-text,#222);font:600 12.5px var(--os-font,system-ui);cursor:pointer}'
            + '.rd-act button:hover{border-color:var(--os-accent,#2563eb);color:var(--os-accent,#2563eb)}.rd-act .os-ico{width:16px;height:16px}.rd-del:hover{border-color:#dc2626!important;color:#dc2626!important}'
            + '.rd-home{display:flex;flex-direction:column;gap:8px;max-width:720px}.rd-home-doc{width:100%;text-align:left;font:inherit;color:inherit;cursor:default;margin:0;background:var(--os-menu,#fff)}button.rd-home-doc{cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s}'
            + 'button.rd-home-doc:hover{border-color:var(--os-accent,#2563eb);box-shadow:0 2px 10px rgba(0,0,0,.1);transform:translateY(-1px)}.rd-home-cur{border-color:var(--os-accent,#2563eb)!important;background:var(--os-accent-l,var(--os-hover,#eef))}'
            + '.rd-home-bar{margin-top:12px;display:flex;align-items:center;gap:12px}.rd-badge{font-style:normal;font-weight:700}'
            + '@media (max-width:600px){.rd-row{flex-wrap:wrap}.rd-act{width:100%;justify-content:flex-end}}';
        document.head.appendChild(s);
    }

    // for apps without the shell: put the Documents list into any element, or in its own window
    function openDialog() {
        css();
        const back = document.createElement('div');
        back.style.cssText = 'position:fixed;inset:0;z-index:2147483100;display:grid;place-items:center;padding:16px;background:rgba(10,20,40,.45);backdrop-filter:blur(4px)';
        const card = document.createElement('div');
        card.style.cssText = 'width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;color:#1f2937;border-radius:16px;padding:20px 24px;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:system-ui,sans-serif';
        const x = document.createElement('button');
        x.textContent = '×';
        x.setAttribute('aria-label', 'Close');
        x.style.cssText = 'float:right;border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#64748b';
        const body = document.createElement('div');
        card.appendChild(x);
        card.appendChild(body);
        back.appendChild(card);
        document.body.appendChild(back);
        const close = function () { back.remove(); document.removeEventListener('keydown', onKey, true); };
        const onKey = function (e) { if (e.key === 'Escape') close(); };
        x.addEventListener('click', close);
        back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
        document.addEventListener('keydown', onKey, true);
        render(body);
    }
    function standalone() {
        css();
        sync();
        setInterval(sync, 10000);
        window.addEventListener('pagehide', sync);
    }
    if (!shell) {
        window.RadiiDocs = { sync: sync, render: render, mount: function (el) { css(); render(el); }, openDialog: openDialog, archive: archive, create: function () { newDocument(load()); }, setTitle: function (fn) { cfgRef.title = fn; sync(); } };
        if (document.readyState !== 'loading') standalone(); else document.addEventListener('DOMContentLoaded', standalone);
        return;
    }
    OS.init = function (cfg) {
        cfgRef = cfg;
        try {
            css();
            const home = Array.isArray(cfg.backstage) && cfg.backstage.find(function (p) { return p.id === 'home' && typeof p.render === 'function'; });
            if (home && !home._rd) {
                const hr = home.render;
                home._rd = true;
                home.render = function (b) { const out = hr.apply(this, arguments); try { enhanceHome(b); } catch (e) {} return out; };
            }
            const newPg = Array.isArray(cfg.backstage) && cfg.backstage.find(function (p) { return p.id === 'new' && typeof p.render === 'function'; });
            if (newPg && !newPg._rd) {
                const nr = newPg.render;
                newPg._rd = true;
                newPg.render = function (b) {
                    const out = nr.apply(this, arguments);
                    try {
                        const cards = OS.bsCards([{ label: 'New document', hint: 'Keeps this one in File > Documents, where you can rename or delete any of them!', icon: 'newDoc', run: function () { newDocument(load()); } }]);
                        const h1 = b.querySelector('h1');
                        if (h1 && h1.nextSibling) b.insertBefore(cards, h1.nextSibling); else b.insertBefore(cards, b.firstChild);
                    } catch (e) {}
                    return out;
                };
            }
            if (cfg.key !== 'writeout' && Array.isArray(cfg.backstage) && !cfg.backstage.some(function (p) { return p.id === 'docs'; })) {
                const at = cfg.backstage.findIndex(function (p) { return p.id === 'new'; });
                cfg.backstage.splice(at < 0 ? Math.min(1, cfg.backstage.length) : at + 1, 0, { id: 'docs', label: 'Documents', icon: 'folder', render: render });
            }
            // Writeout and Bitbook: changing between tabs lives in the File menu (the side pane's Tabs list steps aside)
            if (cfg.key !== 'writeout' && Array.isArray(cfg.backstage) && tabsReady() && !cfg.backstage.some(function (p) { return p.id === 'tabs'; })) {
                const at = cfg.backstage.findIndex(function (p) { return p.id === 'docs'; });
                cfg.backstage.splice(at < 0 ? 1 : at + 1, 0, { id: 'tabs', label: cfg.key === 'bitbook' ? 'Notes' : 'Tabs', icon: 'folder', render: renderTabs });
            }
            sync();
            setInterval(sync, 10000);
            window.addEventListener('pagehide', sync);
        } catch (e) {}
        return orig.apply(this, arguments);
    };
    window.RadiiDocs = { sync: sync, render: render, mount: function (el) { css(); render(el); }, openDialog: openDialog, archive: archive, create: function () { newDocument(load()); } };
})();
