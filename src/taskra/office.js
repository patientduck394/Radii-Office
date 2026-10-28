// Taskra's To Do layout! An indigo ribbon (Home, Share, Help), a File screen for .TK files and a
// status bar with the task counts, on top of Taskra's own list.
// Taskra Classic stays one click away! (The ribbon itself is the shared office-shell.js!)
(function () {
    'use strict';
    const app = window.Taskra;
    const OS = window.OfficeShell;
    if (!app || !OS) return;

    function greet() {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    }

    const plural = (n, word) => n + ' ' + word + (n !== 1 ? 's' : '');
    const pickTk = () => { const e = app.$('file-tk'); if (e) e.click(); };

    const FILTER_LIST = [['all', 'All Tasks', 'lines'], ['active', 'Active', 'play'], ['done', 'Done', 'check'], ['overdue', 'Overdue', 'clock']];

    const setF = (m) => { app.setFilter(m); OS.sync(); };
    const filterNow = () => app.state.filter;
    function clearDone() {
        if (!app.tasks().some((t) => t.done)) OS.toast('No completed tasks to clear!');
        else OS.confirm('Clear Completed', 'Delete all completed tasks?', 'Delete', true)
            .then((ok) => { if (ok) { app.clearCompleted(); OS.toast('Completed tasks cleared!'); } });
    }
    const cards = (items) => OS.bsCards(items);

    const backstage = [
        { id: 'home', label: 'Home', icon: 'home', render: (b) => {
            b.innerHTML = '<h1>' + greet() + '!</h1>';
            b.appendChild(cards([
                { label: 'New task', hint: 'Add something to do!', icon: 'todo', run: () => { OS.closeBackstage(); app.openTaskModal(); } },
                { label: 'Import .TK', hint: 'Open a Taskra file!', icon: 'folder', run: () => { OS.closeBackstage(); pickTk(); } },
                { label: 'Export .TK', hint: 'Save a copy!', icon: 'save', run: app.exportTasks },
            ]));
            const c = app.counts();
            b.insertAdjacentHTML('beforeend', '<h2>Your list</h2><div class="bb-bs-doc tk-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + plural(c.total, 'task')
                + '</b><span>' + c.done + ' done · ' + c.overdue + ' overdue · saved in this browser!</span></div></div>');
        } },
        { id: 'import', label: 'Import', icon: 'import', render: (b) => {
            b.innerHTML = '<h1>Import</h1>';
            b.appendChild(cards([{ label: '.TK file', hint: "Replaces your list with the file's tasks!", icon: 'folder', run: () => { OS.closeBackstage(); pickTk(); } }]));
        } },
        { id: 'export', label: 'Export', icon: 'export', render: (b) => {
            b.innerHTML = '<h1>Export</h1>';
            b.appendChild(cards([{ label: '.TK file', hint: 'Every task, re-importable!', icon: 'save', run: app.exportTasks }]));
        } },
        { id: 'info', label: 'Info', icon: 'info', render: (b) => {
            const c = app.counts();
            b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Tasks</td><td><b>' + c.total + '</b></td></tr><tr><td>Done</td><td><b>' + c.done
                + '</b></td></tr><tr><td>Overdue</td><td><b>' + c.overdue + '</b></td></tr></table>';
        } },
    ];

    const tabs = [
        { id: 'home', label: 'Home', groups: [
            { label: 'New', items: [{ big: true, icon: 'todo', label: 'New\nTask', run: () => app.openTaskModal() }] },
            { label: 'Show', items: FILTER_LIST.map(([id, label, icon]) => ({
                big: true, icon: icon, label: label.replace(' ', '\n'), run: () => setF(id), checked: () => filterNow() === id,
            })) },
            { label: 'Tidy Up', items: [{ big: true, icon: 'trash', label: 'Clear\nCompleted', run: clearDone }] },
            { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: () => [
                { label: 'To Do', checked: true, icon: 'layout', run: () => OS.setLayout('office') },
                { label: 'Taskra Classic', icon: 'sparkle', run: () => OS.setLayout('classic') },
            ] }] },
        ] },
        { id: 'share', label: 'Share', groups: [
            { label: 'Live', items: [{ big: true, icon: 'user', label: 'Share &\nChat', title: 'Work through the list together, live!',
                run: () => { if (window.RadiiCollab) window.RadiiCollab.open('people'); } }] },
            { label: 'File', items: [
                { big: true, icon: 'save', label: 'Export\n.TK', run: app.exportTasks },
                { big: true, icon: 'folder', label: 'Import\n.TK', run: pickTk },
            ] },
        ] },
        { id: 'help', label: 'Help', groups: [
            { label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: () => OS.dialog('Taskra tips',
                '<p class="os-dlg-text">Tick a task to finish it, edit it with the pencil, and search from the box above the list. Share &amp; Chat lets everyone tick and add tasks live!</p>',
                [{ label: 'Got it!', primary: true, value: true }]) }] },
        ] },
    ];

    OS.init({
        app: 'Taskra',
        officeName: 'To Do',
        kind: 'onenote',
        key: 'taskra',
        icon: 'favicon-96.png',
        officeHint: 'An indigo ribbon with filters, a File screen and a status bar, like To Do!',
        classicHint: 'The original Taskra: indigo glass sidebar and gel buttons!',
        classicToast: 'Taskra Classic: indigo glass and gel!',
        theme: { accent: '#6366f1', 'accent-d': '#4f46e5', 'accent-l': '#e0e7ff', title: '#5558e3', gel1: '#a5b4fc', gel2: '#6366f1',
            'gel-border': '#c7d2fe', 'gel-glow': 'rgba(99, 102, 241, 0.45)', glow: 'rgba(224, 231, 255, 0.9)', 'thumb-bg': '#1e1b4b' },
        editor: () => null,
        title: () => 'My Tasks',
        qat: [
            { icon: 'save', title: 'Export .TK', run: () => { app.exportTasks(); OS.flashSaved('Saved!'); } },
            { icon: 'todo', title: 'New task', run: () => app.openTaskModal() },
        ],
        tabs: tabs,
        backstage: backstage,
        status: () => {
            const c = app.counts();
            return ['<b>' + c.total + '</b> task' + (c.total !== 1 ? 's' : ''), '<b>' + c.done + '</b> done', '<b>' + c.overdue + '</b> overdue'];
        },
        views: FILTER_LIST.map(([id, label, icon]) => ({ icon: icon, title: label, run: () => setF(id), active: () => filterNow() === id })),
        searchExtra: (q) => app.tasks()
            .filter((t) => t.title.toLowerCase().includes(q))
            .slice(0, 6)
            .map((t) => ({ label: 'Task "' + t.title + '"', icon: 'todo', where: 'Tasks', it: { run: () => app.editTask(t.id) } })),
    });

    // Taskra Classic gets a Layout button too!
    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'action-btn tk-classic-layout';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', () => {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your tasks stay exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — To Do or Taskra Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'tk-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
    app.renderHooks.push(() => OS.sync());
})();
