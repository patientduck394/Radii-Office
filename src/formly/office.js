// Formly's Forms layout! A violet ribbon (Home, Share, Help), a File screen for .kfe / .kfv / .kfa
// files and a status bar, on top of Formly's own builder. Formly Classic stays one click away!
// (The ribbon itself is the shared office-shell.js!)
(function () {
    'use strict';
    const app = window.Formly;
    const OS = window.OfficeShell;
    if (!app || !OS) return;

    function greet() {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    }

    const FIELD_KINDS = [['text', 'Short Answer', 'pen'], ['textarea', 'Paragraph', 'page'], ['select', 'Dropdown', 'tag'],
        ['chip', 'Chip Choice', 'bubble'], ['rating', 'Star Rating', 'star'], ['checkbox', 'Checkbox', 'check']];
    const ACCENTS = [['#9D84FF', 'Formly Purple'], ['#6bc702', 'Classic Aero Green'], ['#0284c7', 'Ocean Blue'], ['#ec4899', 'Bubblegum Pink'], ['#f59e0b', 'Amber Glow']];

    function stats() {
        const fs = app.fields();
        return { n: fs.length, answered: fs.filter((f) => f.value !== undefined && f.value !== null && f.value !== '' && f.value !== false).length };
    }
    const plural = (n, word) => n + ' ' + word + (n !== 1 ? 's' : '');

    const sync = () => OS.sync();
    function addField(type) {
        if (!app.builder()) app.setMode('builder');
        app.addField(type);
        sync();
        setTimeout(() => {
            const last = app.$('form-fields-list') && app.$('form-fields-list').lastElementChild;
            if (last) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 30);
    }
    const fieldMenu = () => FIELD_KINDS.map(([t, label, icon]) => ({ label: label, icon: icon, run: () => addField(t) }));
    const setMode = (m) => { app.setMode(m); sync(); };
    const askReset = () => OS.confirm('Reset Workspace', 'Clear this form and start over?', 'Reset', true)
        .then((ok) => { if (ok) { app.resetForm(); OS.toast('A fresh form!'); } });
    const cards = (items) => OS.bsCards(items);
    const openFile = () => app.$('btn-upload-file').click();

    const backstage = [
        { id: 'home', label: 'Home', icon: 'home', render: (b) => {
            b.innerHTML = '<h1>' + greet() + '!</h1>';
            b.appendChild(cards([
                { label: 'New form', hint: 'Start with a blank builder!', icon: 'newDoc', run: () => { OS.closeBackstage(); askReset(); } },
                { label: 'Open a form', hint: 'A .kfe, .kfv or .kfa file!', icon: 'folder', run: () => { OS.closeBackstage(); openFile(); } },
                { label: 'Download editable', hint: 'A .kfe others can edit!', icon: 'save', run: app.downloadKfe },
            ]));
            b.insertAdjacentHTML('beforeend', '<h2>This form</h2><div class="bb-bs-doc fm-bs-doc"><img src="favicon.svg" alt=""><div><b>'
                + OS.esc(app.form().title || 'Untitled Form') + '</b><span>' + plural(stats().n, 'field') + ' · saved automatically in this browser!</span></div></div>');
        } },
        { id: 'open', label: 'Open', icon: 'folder', render: (b) => {
            b.innerHTML = '<h1>Open</h1>';
            b.appendChild(cards([{ label: 'Browse…', hint: '.kfe (editable), .kfv (viewable) or .kfa (answers)!', icon: 'folder', run: () => { OS.closeBackstage(); openFile(); } }]));
        } },
        { id: 'export', label: 'Export', icon: 'export', render: (b) => {
            b.innerHTML = '<h1>Export</h1>';
            b.appendChild(cards([
                { label: 'Editable (.kfe)', hint: 'The full form, still editable!', icon: 'save', run: app.downloadKfe },
                { label: 'Viewable (.kfv)', hint: 'Fill-in only, to send to people!', icon: 'download', run: app.downloadKfv },
                { label: 'Answers (.kfa)', hint: 'The answers filled in so far!', icon: 'check', run: app.exportKfa },
            ]));
        } },
        { id: 'info', label: 'Info', icon: 'info', render: (b) => {
            const s = stats();
            b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Fields</td><td><b>' + s.n + '</b></td></tr><tr><td>Answered</td><td><b>' + s.answered
                + '</b></td></tr><tr><td>Mode</td><td><b>' + OS.esc(app.mode()) + '</b></td></tr></table>';
        } },
    ];

    const tabs = [
        { id: 'home', label: 'Home', groups: [
            { label: 'Form', items: [
                { big: true, icon: 'newDoc', label: 'New\nForm', run: askReset },
                { big: true, icon: 'plus', label: 'Add\nField', title: 'Short answer, paragraph, dropdown, chips, rating, checkbox!', run: () => addField('text'), menu: fieldMenu },
            ] },
            { label: 'Fields', items: [{ rows: [
                [{ sm: true, icon: 'pen', label: 'Short', run: () => addField('text') },
                 { sm: true, icon: 'page', label: 'Paragraph', run: () => addField('textarea') },
                 { sm: true, icon: 'tag', label: 'Dropdown', run: () => addField('select') }],
                [{ sm: true, icon: 'bubble', label: 'Chips', run: () => addField('chip') },
                 { sm: true, icon: 'star', label: 'Rating', run: () => addField('rating') },
                 { sm: true, icon: 'check', label: 'Checkbox', run: () => addField('checkbox') }],
            ] }] },
            { label: 'Mode', items: [
                { big: true, icon: 'pen', label: 'Builder', run: () => setMode('builder'), checked: app.builder },
                { big: true, icon: 'eye', label: 'Preview', title: 'Fill the form out like a visitor!', run: () => setMode('view'), checked: () => app.mode() === 'view' },
            ] },
            { label: 'Theme', items: [
                { custom: (c) => {
                    c.className += ' fm-accents';
                    ACCENTS.forEach(([color, name]) => {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.title = name;
                        b.style.background = color;
                        b.addEventListener('click', () => app.setThemeColor(color));
                        c.appendChild(b);
                    });
                    const pick = document.createElement('label');
                    pick.className = 'fm-custom';
                    pick.title = 'Custom color';
                    pick.innerHTML = '+<input type="color" value="#9D84FF">';
                    pick.querySelector('input').addEventListener('input', (e) => app.setThemeColor(e.target.value));
                    c.appendChild(pick);
                } },
                { big: true, icon: 'reset', label: 'Reset\nTheme', run: () => app.setThemeColor(app.DEFAULT_THEME) },
            ] },
            { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: () => [
                { label: 'Forms', checked: true, icon: 'layout', run: () => OS.setLayout('office') },
                { label: 'Formly Classic', icon: 'sparkle', run: () => OS.setLayout('classic') },
            ] }] },
        ] },
        { id: 'share', label: 'Share', groups: [
            { label: 'Live', items: [{ big: true, icon: 'user', label: 'Share &\nChat', title: 'Build the form together, live!',
                run: () => { if (window.RadiiCollab) window.RadiiCollab.open('people'); } }] },
            { label: 'Send', items: [
                { big: true, icon: 'save', label: 'Editable\n.kfe', run: app.downloadKfe },
                { big: true, icon: 'download', label: 'Viewable\n.kfv', run: app.downloadKfv },
                { big: true, icon: 'check', label: 'Answers\n.kfa', run: app.exportKfa },
            ] },
            { label: 'Open', items: [{ big: true, icon: 'folder', label: 'Open\nFile', run: openFile }] },
        ] },
        { id: 'help', label: 'Help', groups: [
            { label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: () => OS.dialog('Formly tips',
                '<p class="os-dlg-text">Add fields, type their questions, and use Keydown like <code>#G#Your Name#</code> for glossy labels! Preview shows what a visitor sees. Share &amp; Chat lets everyone build the form together, and each form has its own ID in the link (<code>?file=…</code>)!</p>',
                [{ label: 'Got it!', primary: true, value: true }]) }] },
        ] },
    ];

    OS.init({
        app: 'Formly',
        officeName: 'Forms',
        kind: 'word',
        key: 'formly',
        icon: 'favicon.svg',
        officeHint: 'A violet ribbon with fields, preview and theme colors, a File screen and a status bar, like Forms!',
        classicHint: 'The original Formly: violet glass sidebar and gel buttons!',
        classicToast: 'Formly Classic: violet glass and gel!',
        theme: { accent: '#8b5cf6', 'accent-d': '#6d3fe0', 'accent-l': '#ede9fe', title: '#7c4ff0', gel1: '#c4b5fd', gel2: '#8b5cf6',
            'gel-border': '#ddd6fe', 'gel-glow': 'rgba(139, 92, 246, 0.45)', glow: 'rgba(237, 233, 254, 0.9)', 'thumb-bg': '#2e1065' },
        editor: () => null,
        title: () => app.form().title || 'Untitled Form',
        rename: (n) => {
            app.state.form = Object.assign({}, app.state.form, { title: n });
            const input = app.$('form-title-input');
            if (input) input.value = n;
            app.save();
        },
        qat: [
            { icon: 'save', title: 'Download editable (.kfe)', run: () => { app.downloadKfe(); OS.flashSaved('Saved!'); } },
            { icon: 'plus', title: 'Add a field', run: () => addField('text') },
            { icon: 'eye', title: 'Preview / Builder', run: () => setMode(app.builder() ? 'view' : 'builder') },
        ],
        tabs: tabs,
        backstage: backstage,
        status: () => {
            const s = stats();
            return [plural(s.n, 'field'),
                '<b>' + OS.esc(app.builder() ? 'Builder' : app.mode() === 'view' ? 'Preview' : 'Answers') + '</b>',
                s.answered + ' answered'];
        },
        views: [
            { icon: 'pen', title: 'Builder', run: () => setMode('builder'), active: app.builder },
            { icon: 'eye', title: 'Preview', run: () => setMode('view'), active: () => app.mode() === 'view' },
        ],
        onLayout: sync,
    });

    // Formly Classic gets a Layout button too!
    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pad-toggle-btn fm-classic-layout';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', () => {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your form stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Forms or Formly Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'fm-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
    app.renderHooks.push(sync);
})();
