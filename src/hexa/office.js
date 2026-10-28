// Hexa's Outlook layout! A teal ribbon (Home, Boards, Share, Help), a File screen for .ICS / .KH
// import and export, a month navigator and a status bar, on top of Hexa's own calendar and
// boards. Hexa Classic stays one click away! (The ribbon itself is office-shell.js!)
(function () {
    'use strict';
    const app = window.Hexa;
    const OS = window.OfficeShell;
    if (!app || !OS) return;

    function greet() {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    }

    const plural = (n, word) => n + ' ' + word + (n !== 1 ? 's' : '');
    const pickFile = (id) => { const e = app.$(id); if (e) e.click(); };
    const boardCount = () => app.activeBoard().columns.reduce((n, c) => n + c.cards.length, 0);
    const viewIs = (v) => app.state.view === v;

    const sync = () => OS.sync();
    const cards = (items) => OS.bsCards(items);
    const newBoard = () => OS.prompt('New Board', 'Board name:', '', 'Create')
        .then((n) => { if (n && n.trim()) { app.addBoard(n.trim()); sync(); } });
    const newColumn = () => OS.prompt('New Column', 'Column name:', '', 'Add')
        .then((n) => { if (n && n.trim()) { app.addColumn(app.activeBoard().id, n.trim()); sync(); } });
    function dropBoard() {
        const b = app.activeBoard();
        if (app.boards().length <= 1) OS.toast('Keep at least one board!');
        else OS.confirm('Delete Board', 'Delete "' + b.name + '" and its cards?', 'Delete', true)
            .then((ok) => { if (ok) { app.deleteBoard(b.id); sync(); } });
    }
    const clearAll = () => OS.confirm('Clear Calendar', 'Delete every event? (Boards stay!)', 'Clear', true)
        .then((ok) => { if (ok) { app.clearCalendar(); OS.toast('Calendar cleared!'); } });
    const jumpMenu = () => app.MONTHS.map((m, i) => ({
        label: m, checked: app.state.month === i,
        run: () => { app.state.month = i; app.render(); sync(); },
    }));
    function yearMenu() {
        const y = new Date().getFullYear();
        const out = [];
        for (let k = y - 3; k < y + 6; k++) {
            out.push({ label: String(k), checked: app.state.year === k, run: () => { app.state.year = k; app.render(); sync(); } });
        }
        return out;
    }
    const setView = (v) => { app.setViewMode(v); sync(); };

    const backstage = [
        { id: 'home', label: 'Home', icon: 'home', render: (b) => {
            b.innerHTML = '<h1>' + greet() + '!</h1>';
            b.appendChild(cards([
                { label: 'New event', hint: 'Add something to the calendar!', icon: 'calendar', run: () => { OS.closeBackstage(); app.openEventModal(); } },
                { label: 'Import .ICS', hint: 'Bring in events from another calendar!', icon: 'import', run: () => { OS.closeBackstage(); pickFile('file-ics'); } },
                { label: 'Open a .KH file', hint: 'A Hexa calendar with boards!', icon: 'folder', run: () => { OS.closeBackstage(); pickFile('file-kh'); } },
            ]));
            b.insertAdjacentHTML('beforeend', '<h2>This calendar</h2><div class="bb-bs-doc hx-bs-doc"><img src="favicon-96.png" alt=""><div><b>'
                + plural(app.events().length, 'event') + ' · ' + plural(app.boards().length, 'board')
                + '</b><span>Saved automatically in this browser!</span></div></div>');
        } },
        { id: 'import', label: 'Import', icon: 'import', render: (b) => {
            b.innerHTML = '<h1>Import</h1>';
            b.appendChild(cards([
                { label: '.ICS calendar', hint: 'Events from Google, Apple, Outlook…', icon: 'calendar', run: () => { OS.closeBackstage(); pickFile('file-ics'); } },
                { label: '.KH file', hint: 'A full Hexa calendar with boards!', icon: 'folder', run: () => { OS.closeBackstage(); pickFile('file-kh'); } },
            ]));
        } },
        { id: 'export', label: 'Export', icon: 'export', render: (b) => {
            b.innerHTML = '<h1>Export</h1>';
            b.appendChild(cards([
                { label: '.ICS calendar', hint: 'Works in every calendar app!', icon: 'calendar', run: app.exportICS },
                { label: '.KH file', hint: 'Events + boards, re-importable!', icon: 'save', run: app.exportKH },
            ]));
        } },
        { id: 'clear', label: 'Clear Calendar', icon: 'trash', action: clearAll },
    ];

    const tabs = [
        { id: 'home', label: 'Home', groups: [
            { label: 'New', items: [
                { big: true, icon: 'calendar', label: 'New\nEvent', run: () => app.openEventModal() },
                { big: true, icon: 'pages', label: 'New\nCard', title: 'Add a card to the first column of this board',
                    run: () => { const b = app.activeBoard(); app.openCardModal(b.id, b.columns[0] && b.columns[0].id, null); } },
            ] },
            { label: 'Go To', items: [
                { big: true, icon: 'clock', label: 'Today', run: () => { app.goToday(); sync(); } },
                { stack: [
                    { sm: true, icon: 'chevLeft', label: 'Previous Month', run: () => { app.shiftMonth(-1); sync(); } },
                    { sm: true, icon: 'chevRight', label: 'Next Month', run: () => { app.shiftMonth(1); sync(); } },
                    { sm: true, icon: 'calendar', label: 'Jump to Month', menu: jumpMenu },
                ] },
                { big: true, icon: 'zoom', label: 'Year', menu: yearMenu },
            ] },
            { label: 'View', items: [
                { big: true, icon: 'calendar', label: 'Calendar', run: () => setView('calendar'), checked: () => viewIs('calendar') },
                { big: true, icon: 'cards', label: 'Boards', run: () => setView('boards'), checked: () => viewIs('boards') },
            ] },
            { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: () => [
                { label: 'Outlook', checked: true, icon: 'layout', run: () => OS.setLayout('office') },
                { label: 'Hexa Classic', icon: 'sparkle', run: () => OS.setLayout('classic') },
            ] }] },
        ] },
        { id: 'boards', label: 'Boards', groups: [
            { label: 'Board', items: [
                { big: true, icon: 'plus', label: 'New\nBoard', run: newBoard },
                { big: true, icon: 'trash', label: 'Delete\nBoard', run: dropBoard },
                { big: true, icon: 'cards', label: 'Switch\nBoard', menu: () => app.boards().map((b) => ({
                    label: b.name, checked: b.id === app.state.activeBoard, run: () => { app.switchBoard(b.id); sync(); },
                })) },
            ] },
            { label: 'Columns', items: [{ big: true, icon: 'table', label: 'New\nColumn', run: newColumn }] },
        ] },
        { id: 'share', label: 'Share', groups: [
            { label: 'Live', items: [{ big: true, icon: 'user', label: 'Share &\nChat', title: 'Plan together, live!',
                run: () => { if (window.RadiiCollab) window.RadiiCollab.open('people'); } }] },
            { label: 'Export', items: [
                { big: true, icon: 'save', label: 'Export\n.ICS', run: app.exportICS },
                { big: true, icon: 'download', label: 'Export\n.KH', run: app.exportKH },
            ] },
            { label: 'Import', items: [
                { big: true, icon: 'import', label: 'Import\n.ICS', run: () => pickFile('file-ics') },
                { big: true, icon: 'folder', label: 'Import\n.KH', run: () => pickFile('file-kh') },
            ] },
        ] },
        { id: 'help', label: 'Help', groups: [
            { label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: () => OS.dialog('Hexa tips',
                '<p class="os-dlg-text">Click a day to see its agenda, or Add Event to plan something! Cards with a due date show on the calendar too. Share &amp; Chat lets everyone edit the same calendar live!</p>',
                [{ label: 'Got it!', primary: true, value: true }]) }] },
        ] },
    ];

    OS.init({
        app: 'Hexa',
        officeName: 'Outlook',
        kind: 'word',
        key: 'hexa',
        icon: 'favicon-96.png',
        officeHint: 'A teal ribbon with Home, Boards and Share tabs, a File screen and a status bar, like Outlook!',
        classicHint: 'The original Hexa: teal glass sidebar and gel buttons!',
        classicToast: 'Hexa Classic: teal glass and gel!',
        theme: { accent: '#14b8a6', 'accent-d': '#0f8f82', 'accent-l': '#ccfbf1', title: '#0f9b8c', gel1: '#5eead4', gel2: '#14b8a6',
            'gel-border': '#99f6e4', 'gel-glow': 'rgba(20, 184, 166, 0.45)', glow: 'rgba(204, 251, 241, 0.9)', 'thumb-bg': '#042f2e' },
        editor: () => null,
        title: () => 'My Calendar',
        qat: [
            { icon: 'save', title: 'Export .KH', run: () => { app.exportKH(); OS.flashSaved('Saved!'); } },
            { icon: 'calendar', title: 'New event', run: () => app.openEventModal() },
            { icon: 'clock', title: 'Today', run: () => { app.goToday(); sync(); } },
        ],
        tabs: tabs,
        backstage: backstage,
        status: () => (viewIs('boards')
            ? ['<b>' + boardCount() + '</b> cards', 'Board <b>' + OS.esc(app.activeBoard().name) + '</b>']
            : ['<b>' + app.events().length + '</b> events', '<b>' + OS.esc(app.MONTHS[app.state.month] + ' ' + app.state.year) + '</b>']),
        views: [
            { icon: 'calendar', title: 'Calendar', run: () => setView('calendar'), active: () => viewIs('calendar') },
            { icon: 'cards', title: 'Boards', run: () => setView('boards'), active: () => viewIs('boards') },
        ],
        searchExtra: (q) => app.events()
            .filter((e) => (e.title || '').toLowerCase().includes(q))
            .slice(0, 6)
            .map((e) => ({ label: 'Event "' + e.title + '" (' + e.date + ')', icon: 'calendar', where: 'Events', it: { run: () => app.editEvent(e.id) } })),
    });

    // Hexa Classic gets a Layout button too!
    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'action-btn hx-classic-layout';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', () => {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your calendar stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Outlook or Hexa Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'hx-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
    // Month titles, counts and view buttons follow every redraw!
    app.renderHooks.push(sync);
    app.boardsHooks.push(sync);
    window.HexaOutlook = {};
})();
