// Yuzu's Outlook-style layout! A blue ribbon (Home, View, Help), a File screen for compose/export/import,
// a folder count status bar, and search — right on top of Yuzu's own inbox! Yuzu Classic stays one click away!
(function () {
    'use strict';
    const app = window.Yuzu;
    const OS = window.OfficeShell;
    if (!app || !OS) return;

    const sync = () => OS.sync();
    const cards = (items) => OS.bsCards(items);
    const inFolderOrAll = (f) => (f === 'starred' ? app.emails().filter((m) => m.starred && m.folder !== 'trash') : app.inFolder(f));
    const folderIs = (f) => app.state.folder === f && !app.state.query;

    const backstage = [
        { id: 'new', label: 'New Message', icon: 'newDoc', action: () => app.openCompose() },
        { id: 'account', label: 'Accounts', icon: 'user', action: () => { OS.closeBackstage(); app.openAccounts(); } },
        { id: 'home', label: 'Home', icon: 'home', render: (b) => {
            const h = new Date().getHours();
            const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
            b.innerHTML = '<h1>' + greet + '!</h1>';
            b.appendChild(cards([
                { label: 'New message', hint: 'Write someone a message!', icon: 'newDoc', run: () => { OS.closeBackstage(); app.openCompose(); } },
                { label: 'Export .YZ', hint: 'Back up your whole mailbox!', icon: 'save', run: () => { OS.closeBackstage(); app.exportYZ(); } },
                { label: 'Import .YZ', hint: 'Bring in messages from another Yuzu mailbox!', icon: 'import', run: () => { OS.closeBackstage(); app.$('yz-import-input').click(); } },
            ]));
            b.insertAdjacentHTML('beforeend', '<h2>This mailbox</h2><div class="bb-bs-doc yz-bs-doc"><img src="favicon-96.png" alt=""><div><b>'
                + app.inFolder('inbox').length + ' in Inbox · ' + app.unreadCount('inbox') + ' unread</b><span>Saved automatically in this browser!</span></div></div>');
        } },
        { id: 'export', label: 'Export', icon: 'export', render: (b) => {
            b.innerHTML = '<h1>Export</h1>';
            b.appendChild(cards([
                { label: 'Whole mailbox (.YZ)', hint: 'Every folder, every message, re-importable!', icon: 'save', run: app.exportYZ },
                { label: 'This message (.eml)', hint: 'Opens the reading message, as a standard email file!', icon: 'download', run: () => { if (app.state.activeId) app.exportEML(app.state.activeId); else OS.toast('Open a message first!'); } },
            ]));
        } },
        { id: 'import', label: 'Import', icon: 'import', action: () => app.$('yz-import-input').click() },
        { id: 'empty', label: 'Empty Trash', icon: 'trash', action: () => OS.confirm('Empty Trash', 'Delete every message in Trash for good? This cannot be undone!', 'Empty Trash', true).then((ok) => { if (ok) app.emptyTrash(); }) },
    ];

    const tabs = [
        { id: 'home', label: 'Home', groups: [
            { label: 'New', items: [
                { big: true, icon: 'newDoc', label: 'New\nMessage', run: () => app.openCompose() },
            ] },
            { label: 'Account', items: [
                { big: true, icon: 'user', label: 'Account', menu: () => app.state.account ? [
                    { label: app.state.account.email, icon: 'user', run: () => app.openAccounts() },
                    { label: 'Sync now', icon: 'reset', run: () => app.sync() },
                    { label: 'Sign out', icon: 'x', run: () => app.disconnect() },
                ] : [
                    { label: 'Get a @radii-office.com address', icon: 'mail', run: () => (window.YuzuMail.configured('yuzu') ? app.openYuzu('create') : app.openSetup('yuzu')) },
                    { label: 'Sign in with a Yuzu address', icon: 'user', run: () => (window.YuzuMail.configured('yuzu') ? app.openYuzu('login') : app.openSetup('yuzu')) },
                    { label: 'Sign in with Google', icon: 'user', run: () => app.connect('google') },
                    { label: 'Sign in with Microsoft', icon: 'user', run: () => app.connect('microsoft') },
                    { label: 'Set up sign-in…', icon: 'gear', run: () => app.openSetup() },
                ] },
                { big: true, icon: 'reset', label: 'Sync', run: () => app.sync() },
            ] },
            { label: 'Respond', items: [
                { big: true, icon: 'reply', label: 'Reply', run: () => { if (app.state.activeId) app.reply(app.state.activeId); else OS.toast('Open a message first!'); } },
                { stack: [
                    { sm: true, icon: 'export', label: 'Forward', run: () => { if (app.state.activeId) app.forward(app.state.activeId); else OS.toast('Open a message first!'); } },
                ] },
            ] },
            { label: 'Manage', items: [
                { big: true, icon: 'star', label: 'Star', run: () => { if (app.state.activeId) app.toggleStar(app.state.activeId); } },
                { big: true, icon: 'trash', label: 'Delete', run: () => { if (app.state.activeId) app.deleteEmail(app.state.activeId); else OS.toast('Open a message first!'); } },
            ] },
            { label: 'Folders', items: [{ big: true, icon: 'folder', label: 'Folder', menu: () => Object.keys(app.FOLDERS).map((f) => ({
                label: app.FOLDERS[f], checked: folderIs(f), icon: 'folder', run: () => { app.setFolder(f); sync(); },
            })) }] },
            { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: () => [
                { label: 'Outlook', checked: true, icon: 'layout', run: () => OS.setLayout('office') },
                { label: 'Yuzu Classic', icon: 'sparkle', run: () => OS.setLayout('classic') },
            ] }] },
        ] },
        { id: 'view', label: 'View', groups: [
            { label: 'Show', items: Object.keys(app.FOLDERS).map((f) => ({
                big: true, icon: 'folder', label: app.FOLDERS[f], run: () => { app.setFolder(f); sync(); }, checked: () => folderIs(f),
            })) },
        ] },
        { id: 'help', label: 'Help', groups: [
            { label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: () => OS.dialog('Yuzu tips',
                '<p class="os-dlg-text">Every message supports Keydown, so **bold**, =B=gel orbs=B= and #R(color ink) all work right in the body! Star a message to find it fast later, and Export .YZ any time to back up your whole mailbox! Reply, Forward and Delete work from the reading pane too!</p>',
                [{ label: 'Got it!', primary: true, value: true }]) }] },
        ] },
    ];

    OS.init({
        app: 'Yuzu',
        officeName: 'Outlook',
        kind: 'mail',
        key: 'yuzu',
        icon: 'favicon-96.png',
        officeHint: 'A blue ribbon with Home, View and Help tabs, a File screen and search, like Outlook!',
        classicHint: 'The original Yuzu: a blue glass sidebar, gel buttons and a simple inbox!',
        classicToast: 'Yuzu Classic: blue glass and gel!',
        theme: { accent: '#0065ff', 'accent-d': '#0048bf', 'accent-l': '#dbe9ff', title: '#0052cc', gel1: '#4d94ff', gel2: '#0065ff',
            'gel-border': '#a3c7ff', 'gel-glow': 'rgba(0, 101, 255, 0.45)', glow: 'rgba(219, 233, 255, 0.9)', 'thumb-bg': '#001a4d' },
        editor: () => null,
        title: () => (app.state.account ? app.state.account.email : 'Not signed in'),
        qat: [
            { icon: 'newDoc', title: 'New message', run: () => app.openCompose() },
            { icon: 'save', title: 'Export .YZ', run: () => { app.exportYZ(); OS.flashSaved('Saved!'); } },
        ],
        tabs: tabs,
        backstage: backstage,
        status: () => [app.state.account ? '<b>' + OS.esc(app.state.account.email) + '</b>' + (app.online() ? '' : ' (sign in again)') : 'Not signed in', '<b>' + app.inFolder('inbox').length + '</b> in Inbox', '<b>' + app.unreadCount('inbox') + '</b> unread', 'Folder <b>' + OS.esc(app.FOLDERS[app.state.folder]) + '</b>'],
        views: Object.keys(app.FOLDERS).map((f) => ({ icon: 'folder', title: app.FOLDERS[f], run: () => { app.setFolder(f); sync(); }, active: () => folderIs(f) })),
        searchExtra: (q) => app.emails()
            .filter((m) => m.folder !== 'trash')
            .filter((m) => (m.subject || '').toLowerCase().includes(q) || (m.from || '').toLowerCase().includes(q))
            .slice(0, 6)
            .map((m) => ({ label: '"' + (m.subject || '(No subject)') + '" from ' + app.nameOf(m.from), icon: 'mail', where: 'Messages', it: { run: () => { app.setFolder(m.folder); app.openEmail(m.id); sync(); } } })),
    });

    // Yuzu Classic gets a Layout button too, right in its sidebar!
    const stack = document.querySelector('.yz-sidebar .yz-sidebar-actions');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'yz-btn yz-layout-btn';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', () => {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your mailbox stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Outlook or Yuzu Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'yz-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }

    // The folder list, the subject line, the star and the counts all follow every redraw!
    app.renderHooks.push(sync);
    window.YuzuOutlook = {};
})();
