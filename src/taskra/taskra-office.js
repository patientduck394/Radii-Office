/* =====================================================================
   Taskra's To Do layout! An indigo ribbon (Home, View, Share, Help), a File
   screen for .TK files and a status bar with the task counts, on top of
   Taskra's own list. Taskra Classic stays one click away in Settings!
   Loaded after app.js and office-shell.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof tasks === 'undefined') return;
    const OS = window.OfficeShell;
    function $(id) { return document.getElementById(id); }
    function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
    function pickTk() { const f = $('file-tk'); if (f) f.click(); }
    const FILTERS = [['all', 'All Tasks', 'lines'], ['active', 'Active', 'play'], ['done', 'Done', 'check'], ['overdue', 'Overdue', 'clock']];
    function filterNow() { return typeof filterMode === 'string' ? filterMode : 'all'; }
    function setF(m) { setFilter(m); OS.sync(); }
    function clearDone() {
        if (!tasks.some(function (t) { return t.done; })) { OS.toast('No completed tasks to clear!'); return; }
        OS.confirm('Clear Completed', 'Delete all completed tasks?', 'Delete', true).then(function (ok) { if (ok) { clearCompleted(); OS.toast('Completed tasks cleared!'); } });
    }

    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'New task', hint: 'Add something to do!', icon: 'todo', run: function () { OS.closeBackstage(); openTaskModal(); } },
                    { label: 'Import .TK', hint: 'Open a Taskra file!', icon: 'folder', run: function () { OS.closeBackstage(); pickTk(); } },
                    { label: 'Export .TK', hint: 'Save a copy!', icon: 'save', run: exportTasks }
                ]));
                const c = counts();
                b.insertAdjacentHTML('beforeend', '<h2>Your list</h2><div class="bb-bs-doc tk-bs-doc"><img src="favicon-96.png" alt=""><div><b>' + c.total + ' task' + (c.total === 1 ? '' : 's') + '</b><span>' + c.done + ' done · ' + c.overdue + ' overdue · saved in this browser!</span></div></div>');
            }
        },
        { id: 'import', label: 'Import', icon: 'import', render: function (b) { b.innerHTML = '<h1>Import</h1>'; b.appendChild(OS.bsCards([{ label: '.TK file', hint: 'Replaces your list with the file\'s tasks!', icon: 'folder', run: function () { OS.closeBackstage(); pickTk(); } }])); } },
        { id: 'export', label: 'Export', icon: 'export', render: function (b) { b.innerHTML = '<h1>Export</h1>'; b.appendChild(OS.bsCards([{ label: '.TK file', hint: 'Every task, re-importable!', icon: 'save', run: exportTasks }])); } },
        { id: 'info', label: 'Info', icon: 'info', render: function (b) { const c = counts(); b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Tasks</td><td><b>' + c.total + '</b></td></tr><tr><td>Done</td><td><b>' + c.done + '</b></td></tr><tr><td>Overdue</td><td><b>' + c.overdue + '</b></td></tr></table>'; } }
    ];
    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'New', items: [{ big: true, icon: 'todo', label: 'New\nTask', run: function () { openTaskModal(); } }] },
                { label: 'Show', items: FILTERS.map(function (f) { return { big: true, icon: f[2], label: f[1].replace(' ', '\n'), run: function () { setF(f[0]); }, checked: function () { return filterNow() === f[0]; } }; }) },
                { label: 'Tidy Up', items: [{ big: true, icon: 'trash', label: 'Clear\nCompleted', run: clearDone }] },
                { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: function () { return [{ label: 'To Do', checked: true, icon: 'layout', run: function () { OS.setLayout('office'); } }, { label: 'Taskra Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }] }
            ]
        },
        {
            id: 'share', label: 'Share', groups: [
                { label: 'Live', items: [{ big: true, icon: 'user', label: 'Share &\nChat', title: 'Work through the list together, live!', run: function () { if (window.RadiiCollab) window.RadiiCollab.open('people'); } }] },
                { label: 'File', items: [{ big: true, icon: 'save', label: 'Export\n.TK', run: exportTasks }, { big: true, icon: 'folder', label: 'Import\n.TK', run: pickTk }] }
            ]
        },
        { id: 'help', label: 'Help', groups: [{ label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: function () { OS.dialog('Taskra tips', '<p class="os-dlg-text">Tick a task to finish it, edit it with the pencil, and search from the box above the list. Share &amp; Chat lets everyone tick and add tasks live!</p>', [{ label: 'Got it!', primary: true, value: true }]); } }] }] }
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
        theme: { accent: '#6366f1', 'accent-d': '#4f46e5', 'accent-l': '#e0e7ff', title: '#5558e3', gel1: '#a5b4fc', gel2: '#6366f1', 'gel-border': '#c7d2fe', 'gel-glow': 'rgba(99, 102, 241, 0.45)', glow: 'rgba(224, 231, 255, 0.9)', 'thumb-bg': '#1e1b4b' },
        editor: function () { return null; },
        title: function () { return 'My Tasks'; },
        qat: [
            { icon: 'save', title: 'Export .TK', run: function () { exportTasks(); OS.flashSaved('Saved!'); } },
            { icon: 'todo', title: 'New task', run: function () { openTaskModal(); } }
        ],
        tabs: tabs,
        backstage: backstage,
        status: function () { const c = counts(); return ['<b>' + c.total + '</b> task' + (c.total === 1 ? '' : 's'), '<b>' + c.done + '</b> done', '<b>' + c.overdue + '</b> overdue']; },
        views: FILTERS.map(function (f) { return { icon: f[2], title: f[1], run: function () { setF(f[0]); }, active: function () { return filterNow() === f[0]; } }; }),
        searchExtra: function (q) {
            const out = [];
            tasks.forEach(function (t) { if (t.title.toLowerCase().indexOf(q) !== -1) out.push({ label: 'Task "' + t.title + '"', icon: 'todo', where: 'Tasks', it: { run: function () { editTask(t.id); } } }); });
            return out.slice(0, 6);
        }
    });

    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'action-btn tk-classic-layout';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', function () {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your tasks stay exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — To Do or Taskra Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'tk-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
    const origRender = window.render;
    window.render = function () { const r = origRender.apply(this, arguments); OS.sync(); return r; };
})();
