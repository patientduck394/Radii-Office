/* =====================================================================
   Cabinet's Explorer layout! A coral ribbon (Home, Share, View, Help), a
   drawer list on the left, a File screen with the drawer's export options
   and a status bar, on top of Cabinet's own file grid. Cabinet Classic
   (the glass sidebar) stays one click away in Settings!
   Loaded after cabinet.js and office-shell.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || !window.RadiiCabinet) return;
    const OS = window.OfficeShell;
    const C = window.RadiiCabinet;
    const PREF_KEY = 'cabinet_explorer_prefs';
    const prefs = Object.assign({ drawers: true }, (function () { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; } })());
    function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }
    function office() { return document.body.classList.contains('os-office'); }
    function $(id) { return document.getElementById(id); }
    function click(id) { const b = $(id); if (b) b.click(); }
    function txt(id) { const e = $(id); return e ? e.textContent.trim() : ''; }

    /* ---------- Actions (they reuse Cabinet's own buttons and API) ---------- */
    const KINDS = [
        ['folder', 'Standard Folder', 'Lightweight storage for files!', 'folder'],
        ['node', 'Node Folder', 'Notes, clone, export, power!', 'duplicate'],
        ['connector', 'Connector Folder', 'Hold files + connect them!', 'link'],
        ['linker', 'Linker Folder', 'Only links, never holds!', 'attach'],
        ['log', 'Log Folder', 'Timestamped entries + files!', 'clock'],
        ['branch', 'Branch Folder', 'Cloneable, recolorable!', 'tag'],
        ['merge', 'Merge Folder', 'Absorbs Branches + Nodes!', 'cards']
    ];
    function newFolder(kind) {
        const k = KINDS.find(function (x) { return x[0] === kind; }) || KINDS[0];
        OS.prompt(k[1], 'Name:', '', 'Create').then(function (n) { if (n && n.trim()) { C.createFolder(n.trim(), kind); OS.toast(k[1] + ' created!'); } });
    }
    function kindsMenu() { return KINDS.map(function (k) { return { label: k[1], hint: k[2], icon: k[3], run: function () { newFolder(k[0]); } }; }); }
    function upload() { click('drawer-upload-btn'); }
    function newDrawer() { C.newDrawer(); OS.toast('A fresh drawer, ready for files!'); }
    function openDrawerFile() { click('drawer-import-btn'); }
    function shareAs(fmt) { const o = document.querySelector('[data-share-format="' + fmt + '"]'); if (o) o.click(); else if (fmt === 'kc') C.exportDrawer(); else C.exportZip(); }
    function setView(mode) { click(mode === 'list' ? 'view-list-btn' : 'view-cards-btn'); OS.sync(); }
    function tagOptions() {
        const sel = $('tag-filter');
        return sel ? [].map.call(sel.options, function (o) { return [o.value, o.textContent]; }) : [['', 'All Files']];
    }
    function stats() {
        const d = C.drawers().find(function (x) { return x.id === C.activeId(); });
        return { name: C.name(), files: txt('drawer-foot-count'), size: txt('drawer-total') };
    }
    function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

    /* ---------- File screen ---------- */
    function drawersPage(b) {
        b.innerHTML = '<h1>Drawers</h1>';
        const list = C.drawers();
        const cards = list.map(function (d) { return { label: d.name, hint: d.files.length + ' file' + (d.files.length === 1 ? '' : 's') + (d.id === C.activeId() ? ' · open now!' : ''), icon: 'folder', run: function () { C.switchDrawer(d.id); OS.closeBackstage(); } }; });
        cards.push({ label: 'New drawer', hint: 'Start a fresh one!', icon: 'plus', run: function () { newDrawer(); OS.closeBackstage(); } });
        b.appendChild(OS.bsCards(cards));
        const del = document.createElement('div');
        del.className = 'os-opts';
        b.appendChild(OS.bsCards([{ label: 'Delete this drawer', hint: 'Removes "' + C.name() + '" for good!', icon: 'trash', run: function () { OS.confirm('Delete Drawer', 'Delete "' + C.name() + '" and everything inside it?', 'Delete', true).then(function (ok) { if (ok) { C.deleteDrawer(C.activeId()); OS.closeBackstage(); OS.toast('Drawer deleted!'); } }); } }]));
    }
    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'Upload files', hint: 'Add files to this drawer!', icon: 'import', run: function () { OS.closeBackstage(); upload(); } },
                    { label: 'New drawer', hint: 'Start a fresh one!', icon: 'newDoc', run: function () { newDrawer(); OS.closeBackstage(); } },
                    { label: 'Open a drawer file', hint: 'A .kc, or a legacy .drawer!', icon: 'folder', run: function () { OS.closeBackstage(); openDrawerFile(); } }
                ]));
                const s = stats();
                b.insertAdjacentHTML('beforeend', '<h2>This drawer</h2><div class="bb-bs-doc cb-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + OS.esc(s.name) + '</b><span>' + OS.esc(s.files) + ' · ' + OS.esc(s.size) + ' · saved in this browser!</span></div></div>');
            }
        },
        { id: 'drawers', label: 'Drawers', icon: 'folder', render: drawersPage },
        { id: 'open', label: 'Open', icon: 'import', render: function (b) { b.innerHTML = '<h1>Open</h1>'; b.appendChild(OS.bsCards([{ label: 'Browse…', hint: 'Open a .kc or .drawer file!', icon: 'folder', run: function () { OS.closeBackstage(); openDrawerFile(); } }])); } },
        { id: 'export', label: 'Share as a file', icon: 'export', render: function (b) { b.innerHTML = '<h1>Share as a file</h1>'; b.appendChild(OS.bsCards([{ label: '.kc file', hint: 'A readable YAML bundle, re-importable!', icon: 'save', run: function () { shareAs('kc'); } }, { label: '.zip file', hint: 'Plain files and folders!', icon: 'download', run: function () { shareAs('zip'); } }])); } },
        { id: 'info', label: 'Info', icon: 'info', render: function (b) { const s = stats(); b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Drawer</td><td><b>' + OS.esc(s.name) + '</b></td></tr><tr><td>Files</td><td><b>' + OS.esc(s.files) + '</b></td></tr><tr><td>Size</td><td><b>' + OS.esc(s.size) + '</b></td></tr><tr><td>Drawers</td><td><b>' + C.drawers().length + '</b></td></tr></table>'; } }
    ];
    function settingsExtra(b) {
        b.insertAdjacentHTML('beforeend', '<h2>Cabinet</h2>');
        const o = document.createElement('div');
        o.className = 'os-opts';
        o.appendChild(OS.optRow('Drawer list', 'Show the list of drawers on the left!', function () { return prefs.drawers; }, function (v) { prefs.drawers = v; savePrefs(); applyView(); }));
        b.appendChild(o);
    }

    /* ---------- View ---------- */
    function applyView() {
        document.body.classList.toggle('cb-no-drawers', !prefs.drawers);
        OS.sync();
    }

    /* ---------- Ribbon ---------- */
    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'New', items: [
                    { big: true, icon: 'newDoc', label: 'New\nDrawer', run: newDrawer },
                    { big: true, icon: 'folder', label: 'New\nFolder', title: 'Standard folder (the arrow picks a kind)!', run: function () { newFolder('folder'); }, menu: kindsMenu },
                    { big: true, icon: 'import', label: 'Upload\nFiles', run: upload }
                ] },
                { label: 'Open', items: [{ big: true, icon: 'folder', label: 'Open\nDrawer', title: 'Open a shared .kc file', run: openDrawerFile }] },
                { label: 'Find', items: [
                    { custom: function (c) {
                        c.className += ' cb-tagbox';
                        const l = document.createElement('label');
                        l.innerHTML = '<span>Tag</span>';
                        const s = document.createElement('select');
                        l.appendChild(s);
                        const fill = function () { const cur = $('tag-filter') ? $('tag-filter').value : ''; s.innerHTML = tagOptions().map(function (o) { return '<option value="' + OS.esc(o[0]) + '">' + OS.esc(o[1]) + '</option>'; }).join(''); s.value = cur; };
                        fill();
                        s.addEventListener('mousedown', fill);
                        s.addEventListener('change', function () { const t = $('tag-filter'); if (t) { t.value = s.value; t.dispatchEvent(new Event('change', { bubbles: true })); } });
                        c.appendChild(l);
                        c._fill = fill;
                    }, sync: true }
                ] },
                { label: 'Drawer', items: [{ stack: [
                    { sm: true, icon: 'pen', label: 'Rename', run: function () { OS.prompt('Rename Drawer', 'Drawer name:', C.name(), 'Rename').then(function (v) { if (v && v.trim()) C.rename(v.trim()); }); } },
                    { sm: true, icon: 'trash', label: 'Delete', run: function () { OS.confirm('Delete Drawer', 'Delete "' + C.name() + '" and everything inside it?', 'Delete', true).then(function (ok) { if (ok) { C.deleteDrawer(C.activeId()); OS.toast('Drawer deleted!'); } }); } }
                ] }] }
            ]
        },
        {
            id: 'share', label: 'Share', groups: [
                { label: 'Live', items: [{ big: true, icon: 'user', label: 'Share &\nChat', title: 'Work on this drawer together, live!', run: function () { if (window.RadiiCollab) window.RadiiCollab.open('people'); } }] },
                { label: 'As a file', items: [
                    { big: true, icon: 'save', label: '.kc\nFile', title: 'A readable YAML bundle', run: function () { shareAs('kc'); } },
                    { big: true, icon: 'download', label: '.zip\nFile', title: 'Plain files and folders', run: function () { shareAs('zip'); } }
                ] }
            ]
        },
        {
            id: 'view', label: 'View', groups: [
                { label: 'Layout', items: [
                    { big: true, icon: 'cards', label: 'Cards', run: function () { setView('cards'); }, checked: function () { return C.viewMode() !== 'list'; } },
                    { big: true, icon: 'lines', label: 'List', run: function () { setView('list'); }, checked: function () { return C.viewMode() === 'list'; } }
                ] },
                { label: 'Show', items: [{ stack: [{ check: true, label: 'Drawer List', get: function () { return prefs.drawers; }, set: function (v) { prefs.drawers = v; savePrefs(); applyView(); } }] }] },
                { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: function () { return [{ label: 'Explorer', checked: true, icon: 'layout', run: function () { OS.setLayout('office'); } }, { label: 'Cabinet Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }] }
            ]
        },
        { id: 'help', label: 'Help', groups: [{ label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: function () { OS.dialog('Cabinet tips', '<p class="os-dlg-text">Drop files anywhere to add them! Drag a file onto a folder to move it, right-click or two-finger drag to reorder, and use Share & Chat to work on a drawer together live!</p>', [{ label: 'Got it!', primary: true, value: true }]); } }] }] }
    ];

    /* ---------- Boot ---------- */
    OS.init({
        app: 'Cabinet',
        officeName: 'Explorer',
        kind: 'onenote',
        key: 'cabinet',
        icon: 'favicon-96.png',
        officeHint: 'A coral ribbon, a drawer list, a File screen and a status bar, like a file explorer!',
        classicHint: 'The original Cabinet: coral glass sidebar and gel buttons!',
        classicToast: 'Cabinet Classic: coral glass and gel!',
        theme: { accent: '#FF6B5E', 'accent-d': '#e5483a', 'accent-l': '#ffe4e1', title: '#e5483a', gel1: '#ff9a8f', gel2: '#FF6B5E', 'gel-border': '#ffc2bb', 'gel-glow': 'rgba(255, 107, 94, 0.45)', glow: 'rgba(255, 228, 225, 0.9)', 'thumb-bg': '#3b1210' },
        editor: function () { return null; },
        title: function () { return C.name(); },
        rename: function (n) { C.rename(n); },
        qat: [
            { icon: 'save', title: 'Share as a .kc file', run: function () { shareAs('kc'); OS.flashSaved('Saved!'); } },
            { icon: 'import', title: 'Upload files', run: upload },
            { icon: 'newDoc', title: 'New drawer', run: newDrawer }
        ],
        tabs: tabs,
        backstage: backstage,
        settings: settingsExtra,
        status: function () { const s = stats(); return [OS.esc(s.files), OS.esc(s.size), 'Drawer <b>' + OS.esc(s.name) + '</b>']; },
        views: [
            { icon: 'cards', title: 'Cards', run: function () { setView('cards'); }, active: function () { return C.viewMode() !== 'list'; } },
            { icon: 'lines', title: 'List', run: function () { setView('list'); }, active: function () { return C.viewMode() === 'list'; } }
        ],
        searchExtra: function (q) {
            const out = [];
            C.drawers().forEach(function (d) { if (d.name.toLowerCase().indexOf(q) !== -1) out.push({ label: 'Open drawer "' + d.name + '"', icon: 'folder', where: 'Drawers', it: { run: function () { C.switchDrawer(d.id); } } }); });
            return out.slice(0, 6);
        },
        onLayout: function () { applyView(); }
    });

    // Cabinet Classic gets a Layout button (with the layout cards) too!
    const stack = document.querySelector('#sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pad-toggle-btn cb-classic-layout';
        b.title = 'Pick Explorer or Cabinet Classic';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', function () {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your drawers stay exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Explorer or Cabinet Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'cb-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
    // The status bar follows every change!
    const grid = $('file-grid');
    if (grid) new MutationObserver(function () { OS.sync(); }).observe(grid, { childList: true });
    applyView();
    window.CabinetExplorer = { prefs: prefs, applyView: applyView };
})();
