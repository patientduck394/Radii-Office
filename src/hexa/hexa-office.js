/* =====================================================================
   Hexa's Outlook layout! A teal ribbon (Home, Boards, Share, Help), a File
   screen for .ICS / .KH import and export, a month navigator and a status
   bar, on top of Hexa's own calendar and boards. Hexa Classic stays one
   click away in Settings! Loaded after app.js and office-shell.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof events === 'undefined') return;
    const OS = window.OfficeShell;
    function $(id) { return document.getElementById(id); }
    function office() { return document.body.classList.contains('os-office'); }
    function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
    function boardCount() { const b = activeBoard(); return b.columns.reduce(function (n, c) { return n + c.cards.length; }, 0); }
    function pickFile(id) { const f = $(id); if (f) f.click(); }
    function newBoard() { OS.prompt('New Board', 'Board name:', '', 'Create').then(function (n) { if (n && n.trim()) { addBoard(n.trim()); OS.sync(); } }); }
    function newColumn() { OS.prompt('New Column', 'Column name:', '', 'Add').then(function (n) { if (n && n.trim()) { addColumn(activeBoard().id, n.trim()); OS.sync(); } }); }
    function dropBoard() {
        const b = activeBoard();
        if (boards.length <= 1) { OS.toast('Keep at least one board!'); return; }
        OS.confirm('Delete Board', 'Delete "' + b.name + '" and its cards?', 'Delete', true).then(function (ok) { if (ok) { deleteBoard(b.id); OS.sync(); } });
    }
    function clearAll() { OS.confirm('Clear Calendar', 'Delete every event? (Boards stay!)', 'Clear', true).then(function (ok) { if (ok) { clearCalendar(); OS.toast('Calendar cleared!'); } }); }
    function jumpMenu() {
        return MONTHS.map(function (m, i) { return { label: m, checked: cursorMonth === i, run: function () { cursorMonth = i; render(); OS.sync(); } }; });
    }
    function yearMenu() {
        const y = new Date().getFullYear();
        const out = [];
        for (let k = y - 3; k <= y + 5; k++) out.push({ label: String(k), checked: cursorYear === k, run: function () { cursorYear = k; render(); OS.sync(); } });
        return out;
    }
    function viewIs(v) { return typeof currentView !== 'undefined' && currentView === v; }

    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'New event', hint: 'Add something to the calendar!', icon: 'calendar', run: function () { OS.closeBackstage(); openEventModal(); } },
                    { label: 'Import .ICS', hint: 'Bring in events from another calendar!', icon: 'import', run: function () { OS.closeBackstage(); pickFile('file-ics'); } },
                    { label: 'Open a .KH file', hint: 'A Hexa calendar with boards!', icon: 'folder', run: function () { OS.closeBackstage(); pickFile('file-kh'); } }
                ]));
                b.insertAdjacentHTML('beforeend', '<h2>This calendar</h2><div class="bb-bs-doc hx-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + events.length + ' event' + (events.length === 1 ? '' : 's') + ' · ' + boards.length + ' board' + (boards.length === 1 ? '' : 's') + '</b><span>Saved automatically in this browser!</span></div></div>');
            }
        },
        { id: 'import', label: 'Import', icon: 'import', render: function (b) { b.innerHTML = '<h1>Import</h1>'; b.appendChild(OS.bsCards([{ label: '.ICS calendar', hint: 'Events from Google, Apple, Outlook…', icon: 'calendar', run: function () { OS.closeBackstage(); pickFile('file-ics'); } }, { label: '.KH file', hint: 'A full Hexa calendar with boards!', icon: 'folder', run: function () { OS.closeBackstage(); pickFile('file-kh'); } }])); } },
        { id: 'export', label: 'Export', icon: 'export', render: function (b) { b.innerHTML = '<h1>Export</h1>'; b.appendChild(OS.bsCards([{ label: '.ICS calendar', hint: 'Works in every calendar app!', icon: 'calendar', run: exportICS }, { label: '.KH file', hint: 'Events + boards, re-importable!', icon: 'save', run: exportKH }])); } },
        { id: 'clear', label: 'Clear Calendar', icon: 'trash', action: clearAll }
    ];
    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'New', items: [{ big: true, icon: 'calendar', label: 'New\nEvent', run: function () { openEventModal(); } }, { big: true, icon: 'pages', label: 'New\nCard', title: 'Add a card to the first column of this board', run: function () { const b = activeBoard(); openCardModal(b.id, b.columns[0].id, null); } }] },
                { label: 'Go To', items: [
                    { big: true, icon: 'clock', label: 'Today', run: function () { goToday(); OS.sync(); } },
                    { stack: [
                        { sm: true, icon: 'chevLeft', label: 'Previous Month', run: function () { shiftMonth(-1); OS.sync(); } },
                        { sm: true, icon: 'chevRight', label: 'Next Month', run: function () { shiftMonth(1); OS.sync(); } },
                        { sm: true, icon: 'calendar', label: 'Jump to Month', menu: jumpMenu }
                    ] },
                    { big: true, icon: 'zoom', label: 'Year', menu: yearMenu }
                ] },
                { label: 'View', items: [
                    { big: true, icon: 'calendar', label: 'Calendar', run: function () { setViewMode('calendar'); OS.sync(); }, checked: function () { return viewIs('calendar'); } },
                    { big: true, icon: 'cards', label: 'Boards', run: function () { setViewMode('boards'); OS.sync(); }, checked: function () { return viewIs('boards'); } }
                ] },
                { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: function () { return [{ label: 'Outlook', checked: true, icon: 'layout', run: function () { OS.setLayout('office'); } }, { label: 'Hexa Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }] }
            ]
        },
        {
            id: 'boards', label: 'Boards', groups: [
                { label: 'Board', items: [
                    { big: true, icon: 'plus', label: 'New\nBoard', run: newBoard },
                    { big: true, icon: 'trash', label: 'Delete\nBoard', run: dropBoard },
                    { big: true, icon: 'cards', label: 'Switch\nBoard', menu: function () { return boards.map(function (b) { return { label: b.name, checked: b.id === activeBoardId, run: function () { switchBoard(b.id); OS.sync(); } }; }); } }
                ] },
                { label: 'Columns', items: [{ big: true, icon: 'table', label: 'New\nColumn', run: newColumn }] }
            ]
        },
        {
            id: 'share', label: 'Share', groups: [
                { label: 'Live', items: [{ big: true, icon: 'user', label: 'Share &\nChat', title: 'Plan together, live!', run: function () { if (window.RadiiCollab) window.RadiiCollab.open('people'); } }] },
                { label: 'Export', items: [{ big: true, icon: 'save', label: 'Export\n.ICS', run: exportICS }, { big: true, icon: 'download', label: 'Export\n.KH', run: exportKH }] },
                { label: 'Import', items: [{ big: true, icon: 'import', label: 'Import\n.ICS', run: function () { pickFile('file-ics'); } }, { big: true, icon: 'folder', label: 'Import\n.KH', run: function () { pickFile('file-kh'); } }] }
            ]
        },
        { id: 'help', label: 'Help', groups: [{ label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: function () { OS.dialog('Hexa tips', '<p class="os-dlg-text">Click a day to see its agenda, or Add Event to plan something! Cards with a due date show on the calendar too. Share &amp; Chat lets everyone edit the same calendar live!</p>', [{ label: 'Got it!', primary: true, value: true }]); } }] }] }
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
        theme: { accent: '#14b8a6', 'accent-d': '#0f8f82', 'accent-l': '#ccfbf1', title: '#0f9b8c', gel1: '#5eead4', gel2: '#14b8a6', 'gel-border': '#99f6e4', 'gel-glow': 'rgba(20, 184, 166, 0.45)', glow: 'rgba(204, 251, 241, 0.9)', 'thumb-bg': '#042f2e' },
        editor: function () { return null; },
        title: function () { return 'My Calendar'; },
        qat: [
            { icon: 'save', title: 'Export .KH', run: function () { exportKH(); OS.flashSaved('Saved!'); } },
            { icon: 'calendar', title: 'New event', run: function () { openEventModal(); } },
            { icon: 'clock', title: 'Today', run: function () { goToday(); OS.sync(); } }
        ],
        tabs: tabs,
        backstage: backstage,
        status: function () { return [viewIs('boards') ? '<b>' + boardCount() + '</b> cards' : '<b>' + events.length + '</b> events', (viewIs('boards') ? 'Board <b>' + OS.esc(activeBoard().name) + '</b>' : '<b>' + OS.esc(MONTHS[cursorMonth] + ' ' + cursorYear) + '</b>')]; },
        views: [
            { icon: 'calendar', title: 'Calendar', run: function () { setViewMode('calendar'); OS.sync(); }, active: function () { return viewIs('calendar'); } },
            { icon: 'cards', title: 'Boards', run: function () { setViewMode('boards'); OS.sync(); }, active: function () { return viewIs('boards'); } }
        ],
        searchExtra: function (q) {
            const out = [];
            events.forEach(function (e) { if ((e.title || '').toLowerCase().indexOf(q) !== -1) out.push({ label: 'Event "' + e.title + '" (' + e.date + ')', icon: 'calendar', where: 'Events', it: { run: function () { editEvent(e.id); } } }); });
            return out.slice(0, 6);
        }
    });

    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'action-btn hx-classic-layout';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', function () {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your calendar stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Outlook or Hexa Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'hx-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
    // Month titles, counts and view buttons follow every redraw!
    const origRender = window.render;
    window.render = function () { const r = origRender.apply(this, arguments); OS.sync(); return r; };
    const origBoards = window.renderBoards;
    window.renderBoards = function () { const r = origBoards.apply(this, arguments); OS.sync(); return r; };
    window.HexaOutlook = {};
})();
