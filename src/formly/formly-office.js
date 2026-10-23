/* =====================================================================
   Formly's Forms layout! A violet ribbon (Home, Share, Help), a File screen
   for .kfe / .kfv / .kfa files and a status bar, on top of Formly's own
   builder. Formly Classic stays one click away in Settings!
   Loaded after app.js and office-shell.js!
   ===================================================================== */
(function () {
    'use strict';
    if (!window.OfficeShell || typeof formState === 'undefined') return;
    const OS = window.OfficeShell;
    function $(id) { return document.getElementById(id); }
    function click(id) { const b = $(id); if (b) b.click(); }
    function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
    function builder() { return currentMode === 'builder'; }
    const FIELDS = [['text', 'Short Answer', 'pen'], ['textarea', 'Paragraph', 'page'], ['select', 'Dropdown', 'tag'], ['chip', 'Chip Choice', 'bubble'], ['rating', 'Star Rating', 'star'], ['checkbox', 'Checkbox', 'check']];
    function addField(type) { if (!builder()) { currentMode = 'builder'; renderForm(); } const b = document.querySelector('.add-field-btn[data-type="' + type + '"]'); if (b) b.click(); OS.sync(); setTimeout(function () { const l = $('form-fields-list'); if (l && l.lastElementChild) l.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30); }
    function fieldMenu() { return FIELDS.map(function (f) { return { label: f[1], icon: f[2], run: function () { addField(f[0]); } }; }); }
    function setMode(m) { currentMode = m; renderForm(); OS.sync(); }
    const ACCENTS = [['#9D84FF', 'Formly Purple'], ['#6bc702', 'Classic Aero Green'], ['#0284c7', 'Ocean Blue'], ['#ec4899', 'Bubblegum Pink'], ['#f59e0b', 'Amber Glow']];
    function resetForm() {
        OS.confirm('Reset Workspace', 'Clear this form and start over?', 'Reset', true).then(function (ok) { if (ok) { formState = { title: 'Untitled Form', description: 'Enter instructions here...', fields: [] }; currentMode = 'builder'; renderForm(); OS.toast('A fresh form!'); } });
    }
    function stats() { const n = formState.fields.length; const answered = formState.fields.filter(function (f) { return f.value !== '' && f.value !== false && f.value != null; }).length; return { n: n, answered: answered }; }
    const backstage = [
        {
            id: 'home', label: 'Home', icon: 'home', render: function (b) {
                b.innerHTML = '<h1>' + greet() + '!</h1>';
                b.appendChild(OS.bsCards([
                    { label: 'New form', hint: 'Start with a blank builder!', icon: 'newDoc', run: function () { OS.closeBackstage(); resetForm(); } },
                    { label: 'Open a form', hint: 'A .kfe, .kfv or .kfa file!', icon: 'folder', run: function () { OS.closeBackstage(); click('btn-upload-file'); } },
                    { label: 'Download editable', hint: 'A .kfe others can edit!', icon: 'save', run: function () { click('btn-download-kfe'); } }
                ]));
                const s = stats();
                b.insertAdjacentHTML('beforeend', '<h2>This form</h2><div class="bb-bs-doc fm-bs-doc"><img src="favicon.svg" alt=""><div><b>' + OS.esc(formState.title || 'Untitled Form') + '</b><span>' + s.n + ' field' + (s.n === 1 ? '' : 's') + ' · saved automatically in this browser!</span></div></div>');
            }
        },
        { id: 'open', label: 'Open', icon: 'folder', render: function (b) { b.innerHTML = '<h1>Open</h1>'; b.appendChild(OS.bsCards([{ label: 'Browse…', hint: '.kfe (editable), .kfv (viewable) or .kfa (answers)!', icon: 'folder', run: function () { OS.closeBackstage(); click('btn-upload-file'); } }])); } },
        { id: 'export', label: 'Export', icon: 'export', render: function (b) { b.innerHTML = '<h1>Export</h1>'; b.appendChild(OS.bsCards([{ label: 'Editable (.kfe)', hint: 'The full form, still editable!', icon: 'save', run: function () { click('btn-download-kfe'); } }, { label: 'Viewable (.kfv)', hint: 'Fill-in only, to send to people!', icon: 'download', run: function () { click('btn-download-kfv'); } }, { label: 'Answers (.kfa)', hint: 'The answers filled in so far!', icon: 'check', run: function () { const b2 = $('btn-export-kfa'); if (b2) b2.click(); } }])); } },
        { id: 'info', label: 'Info', icon: 'info', render: function (b) { const s = stats(); b.innerHTML = '<h1>Info</h1><table class="bb-wc"><tr><td>Fields</td><td><b>' + s.n + '</b></td></tr><tr><td>Answered</td><td><b>' + s.answered + '</b></td></tr><tr><td>Mode</td><td><b>' + OS.esc(currentMode) + '</b></td></tr></table>'; } }
    ];
    const tabs = [
        {
            id: 'home', label: 'Home', groups: [
                { label: 'Form', items: [
                    { big: true, icon: 'newDoc', label: 'New\nForm', run: resetForm },
                    { big: true, icon: 'plus', label: 'Add\nField', title: 'Short answer, paragraph, dropdown, chips, rating, checkbox!', run: function () { addField('text'); }, menu: fieldMenu }
                ] },
                { label: 'Fields', items: [{ rows: [
                    [{ sm: true, icon: 'pen', label: 'Short', run: function () { addField('text'); } }, { sm: true, icon: 'page', label: 'Paragraph', run: function () { addField('textarea'); } }, { sm: true, icon: 'tag', label: 'Dropdown', run: function () { addField('select'); } }],
                    [{ sm: true, icon: 'bubble', label: 'Chips', run: function () { addField('chip'); } }, { sm: true, icon: 'star', label: 'Rating', run: function () { addField('rating'); } }, { sm: true, icon: 'check', label: 'Checkbox', run: function () { addField('checkbox'); } }]
                ] }] },
                { label: 'Mode', items: [
                    { big: true, icon: 'pen', label: 'Builder', run: function () { setMode('builder'); }, checked: function () { return builder(); } },
                    { big: true, icon: 'eye', label: 'Preview', title: 'Fill the form out like a visitor!', run: function () { setMode('view'); }, checked: function () { return currentMode === 'view'; } }
                ] },
                { label: 'Theme', items: [{ custom: function (c) {
                    c.className += ' fm-accents';
                    ACCENTS.forEach(function (a) { const b = document.createElement('button'); b.type = 'button'; b.title = a[1]; b.style.background = a[0]; b.addEventListener('click', function () { setThemeColor(a[0]); }); c.appendChild(b); });
                    const pick = document.createElement('label');
                    pick.className = 'fm-custom';
                    pick.title = 'Custom color';
                    pick.innerHTML = '+<input type="color" value="#9D84FF">';
                    pick.querySelector('input').addEventListener('input', function (e) { setThemeColor(e.target.value); });
                    c.appendChild(pick);
                } }, { big: true, icon: 'reset', label: 'Reset\nTheme', run: function () { setThemeColor('#9D84FF'); } }] },
                { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: function () { return [{ label: 'Forms', checked: true, icon: 'layout', run: function () { OS.setLayout('office'); } }, { label: 'Formly Classic', icon: 'sparkle', run: function () { OS.setLayout('classic'); } }]; } }] }
            ]
        },
        {
            id: 'share', label: 'Share', groups: [
                { label: 'Live', items: [{ big: true, icon: 'user', label: 'Share &\nChat', title: 'Build the form together, live!', run: function () { if (window.RadiiCollab) window.RadiiCollab.open('people'); } }] },
                { label: 'Send', items: [
                    { big: true, icon: 'save', label: 'Editable\n.kfe', run: function () { click('btn-download-kfe'); } },
                    { big: true, icon: 'download', label: 'Viewable\n.kfv', run: function () { click('btn-download-kfv'); } },
                    { big: true, icon: 'check', label: 'Answers\n.kfa', run: function () { const b2 = $('btn-export-kfa'); if (b2) b2.click(); else OS.toast('Switch to Preview mode first!'); } }
                ] },
                { label: 'Open', items: [{ big: true, icon: 'folder', label: 'Open\nFile', run: function () { click('btn-upload-file'); } }] }
            ]
        },
        { id: 'help', label: 'Help', groups: [{ label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: function () { OS.dialog('Formly tips', '<p class="os-dlg-text">Add fields, type their questions, and use Keydown like <code>#G#Your Name#</code> for glossy labels! Preview shows what a visitor sees. Share &amp; Chat lets everyone build the form together, and each form has its own ID in the link (<code>?file=…</code>)!</p>', [{ label: 'Got it!', primary: true, value: true }]); } }] }] }
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
        theme: { accent: '#8b5cf6', 'accent-d': '#6d3fe0', 'accent-l': '#ede9fe', title: '#7c4ff0', gel1: '#c4b5fd', gel2: '#8b5cf6', 'gel-border': '#ddd6fe', 'gel-glow': 'rgba(139, 92, 246, 0.45)', glow: 'rgba(237, 233, 254, 0.9)', 'thumb-bg': '#2e1065' },
        editor: function () { return null; },
        title: function () { return formState.title || 'Untitled Form'; },
        rename: function (n) { formState.title = n; if (formTitleInput) formTitleInput.value = n; saveFormly(); },
        qat: [
            { icon: 'save', title: 'Download editable (.kfe)', run: function () { click('btn-download-kfe'); OS.flashSaved('Saved!'); } },
            { icon: 'plus', title: 'Add a field', run: function () { addField('text'); } },
            { icon: 'eye', title: 'Preview / Builder', run: function () { setMode(builder() ? 'view' : 'builder'); } }
        ],
        tabs: tabs,
        backstage: backstage,
        status: function () { const s = stats(); return [s.n + ' field' + (s.n === 1 ? '' : 's'), '<b>' + OS.esc(builder() ? 'Builder' : currentMode === 'view' ? 'Preview' : 'Answers') + '</b>', s.answered + ' answered']; },
        views: [
            { icon: 'pen', title: 'Builder', run: function () { setMode('builder'); }, active: function () { return builder(); } },
            { icon: 'eye', title: 'Preview', run: function () { setMode('view'); }, active: function () { return currentMode === 'view'; } }
        ],
        onLayout: function () { OS.sync(); }
    });

    const stack = document.querySelector('.aero-sidebar .pad-selection-stack');
    if (stack) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pad-toggle-btn fm-classic-layout';
        b.textContent = '🧩 Layout';
        b.addEventListener('click', function () {
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your form stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout — Forms or Formly Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'fm-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        stack.appendChild(b);
    }
    const origRender = window.renderForm;
    window.renderForm = function () { const r = origRender.apply(this, arguments); OS.sync(); return r; };
})();
