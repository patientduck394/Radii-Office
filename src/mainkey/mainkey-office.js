// Mainkey's Access-style layout! A purple ribbon (Home, Data, Share, Help), a File screen and a status bar,
// on top of Mainkey's own table and gallery. Mainkey Classic stays one click away!
// (The ribbon itself is the shared office-shell.js!)
(function () {
    'use strict';
    const OS = window.OfficeShell;
    if (!OS || typeof render !== 'function') return;

    const plural = (n, word) => n + ' ' + word + (n !== 1 ? 's' : '');
    const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
    const sync = () => OS.sync();
    const view = (mode) => { setViewMode(mode); sync(); };
    const cards = (items) => OS.bsCards(items);
    const openFile = () => document.getElementById('file-kb').click();
    const sortMenu = () => fields.map((f) => ({ label: f.name + (sortField === f.id ? (sortDir === 1 ? '  ↑' : '  ↓') : ''), icon: 'sorter', checked: sortField === f.id, run: () => { sortBy(f.id); sync(); } }));

    const backstage = [
        { id: 'home', label: 'Home', icon: 'home', render: (b) => {
            b.innerHTML = '<h1>' + greet() + '!</h1>';
            b.appendChild(cards([
                { label: 'Blank database', hint: 'Start over with no records!', icon: 'newDoc', run: () => { OS.closeBackstage(); clearDatabase(); sync(); } },
                { label: 'Demo database', hint: 'Bring back the sample records!', icon: 'sparkle', run: () => { OS.closeBackstage(); resetDemo(); sync(); } },
                { label: 'Open a .kb file', hint: 'A Mainkey database (or YAML)!', icon: 'folder', run: () => { OS.closeBackstage(); openFile(); } },
            ]));
            b.insertAdjacentHTML('beforeend', '<h2>This database</h2><div class="bb-bs-doc mk-bs-doc"><img src="favicon-96.png" alt=""><div><b>Mainkey database</b><span>'
                + plural(records.length, 'record') + ' · ' + plural(fields.length, 'field') + ' · saved automatically in this browser!</span></div></div>');
        } },
        { id: 'open', label: 'Open', icon: 'folder', render: (b) => {
            b.innerHTML = '<h1>Open</h1>';
            b.appendChild(cards([{ label: 'Browse…', hint: 'A .kb database, or a .yaml / .yml file!', icon: 'folder', run: () => { OS.closeBackstage(); openFile(); } }]));
        } },
        { id: 'export', label: 'Export', icon: 'export', render: (b) => {
            b.innerHTML = '<h1>Export</h1>';
            b.appendChild(cards([
                { label: 'Mainkey database (.kb)', hint: 'Everything, ready to open again!', icon: 'save', run: exportKB },
                { label: 'Spreadsheet (.csv)', hint: 'For Imbuer, Excel or anything else!', icon: 'table', run: exportCSV },
                { label: 'Website Kit', hint: 'Put this database on any website!', icon: 'web', run: () => { OS.closeBackstage(); openKitModal(); } },
            ]));
        } },
        { id: 'info', label: 'Info', icon: 'info', render: (b) => {
            b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Records</td><td><b>' + records.length + '</b></td></tr><tr><td>Fields</td><td><b>' + fields.length
                + '</b></td></tr><tr><td>View</td><td><b>' + (currentView === 'table' ? 'Table' : 'Gallery') + '</b></td></tr></table>';
        } },
    ];

    const tabs = [
        { id: 'home', label: 'Home', groups: [
            { label: 'Records', items: [
                { big: true, icon: 'plus', label: 'New\nRecord', title: 'Add a record!', run: () => openRecordModal() },
            ] },
            { label: 'Fields', items: [
                { big: true, icon: 'table', label: 'Add\nField', title: 'Text, numbers or status tags!', run: () => openFieldModal() },
            ] },
            { label: 'Views', items: [
                { big: true, icon: 'grid', label: 'Table', run: () => view('table'), checked: () => currentView === 'table' },
                { big: true, icon: 'cards', label: 'Gallery', run: () => view('cards'), checked: () => currentView === 'cards' },
            ] },
            { label: 'Sort', items: [{ big: true, icon: 'sorter', label: 'Sort\nBy', title: 'Click again to flip the order!', menu: sortMenu }] },
            { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: () => [
                { label: 'Database', checked: true, icon: 'layout', run: () => OS.setLayout('office') },
                { label: 'Mainkey Classic', icon: 'sparkle', run: () => OS.setLayout('classic') },
            ] }] },
        ] },
        { id: 'data', label: 'Data', groups: [
            { label: 'Import', items: [{ big: true, icon: 'import', label: 'Open\n.kb', run: openFile }] },
            { label: 'Export', items: [
                { big: true, icon: 'save', label: 'Save\n.kb', run: exportKB },
                { big: true, icon: 'export', label: 'Export\n.csv', run: exportCSV },
            ] },
            { label: 'Start over', items: [
                { big: true, icon: 'reset', label: 'Demo\nData', title: 'Bring back the sample records!', run: () => { resetDemo(); sync(); } },
                { big: true, icon: 'trash', label: 'Clear\nAll', title: 'Remove every record!', run: () => { clearDatabase(); sync(); } },
            ] },
        ] },
        { id: 'share', label: 'Share', groups: [
            { label: 'Website', items: [{ big: true, icon: 'web', label: 'Website\nKit', title: 'Put this database on any website!', run: () => openKitModal() }] },
            { label: 'Live', items: [{ big: true, icon: 'user', label: 'Host', title: 'Turn this tab into the database\'s server!', run: () => openHostModal() }] },
        ] },
        { id: 'help', label: 'Help', groups: [
            { label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: () => OS.dialog('Mainkey tips',
                '<p class="os-dlg-text">Add fields (text, numbers or status tags), then records! Click a column header to sort by it, search from the box above the table, and switch to Gallery for cards! Save a .kb file to keep a copy, or use the Website Kit to put the database on any site!</p>',
                [{ label: 'Got it!', primary: true, value: true }]) }] },
        ] },
    ];

    OS.init({
        app: 'Mainkey',
        officeName: 'Database',
        kind: 'word',
        key: 'mainkey',
        icon: 'favicon-96.png',
        officeHint: 'A purple ribbon with records, fields, views, sorting, a File screen and a status bar, like Access!',
        classicHint: 'The original Mainkey: a purple glass sidebar and gel buttons!',
        classicToast: 'Mainkey Classic: purple glass and gel!',
        theme: { accent: '#a305ff', 'accent-d': '#7e00cc', 'accent-l': '#f3e3ff', title: '#9b10f0', gel1: '#df9eff', gel2: '#a305ff',
            'gel-border': '#ecccff', 'gel-glow': 'rgba(163, 5, 255, 0.45)', glow: 'rgba(243, 227, 255, 0.9)', 'thumb-bg': '#1a022b' },
        editor: () => null,
        title: () => 'Mainkey database',
        qat: [
            { icon: 'save', title: 'Save .kb', run: () => { exportKB(); OS.flashSaved('Saved!'); } },
            { icon: 'plus', title: 'New record', run: () => openRecordModal() },
            { icon: 'cards', title: 'Table / Gallery', run: () => view(currentView === 'table' ? 'cards' : 'table') },
        ],
        tabs: tabs,
        backstage: backstage,
        status: () => [plural(records.length, 'record'), plural(fields.length, 'field'), '<b>' + (currentView === 'table' ? 'Table' : 'Gallery') + '</b>'],
        views: [
            { icon: 'grid', title: 'Table', run: () => view('table'), active: () => currentView === 'table' },
            { icon: 'cards', title: 'Gallery', run: () => view('cards'), active: () => currentView === 'cards' },
        ],
        onLayout: sync,
    });

    // the ribbon and status bar follow every change Mainkey draws
    const draw = window.render;
    window.render = function () { const r = draw.apply(this, arguments); sync(); return r; };
    // Mainkey Classic gets a Layout button too!
    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'action-btn mk-classic-layout';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', () => {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your database stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Database or Mainkey Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'mk-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
})();
