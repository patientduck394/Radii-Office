// OpenDB's Office layout! A glossy cyan ribbon (Home, Tools, Help), a File screen and a status bar with the
// entry counts, on top of OpenDB's own pages. OpenDB Classic (the Aero look) stays one click away!
// (The ribbon itself is the shared office-shell.js!)
(function () {
    'use strict';
    const app = window.OpenDB;
    const OS = window.OfficeShell;
    if (!app || !OS) return;

    const go = (h) => { location.hash = h; OS.closeBackstage && OS.closeBackstage(); };
    const plural = (n, w) => n + ' ' + w + (n !== 1 ? 's' : '');
    const counts = () => {
        const c = { article: 0, media: 0, paper: 0, lite: 0, total: 0 };
        app.entries().forEach((e) => { if (c[e.type] != null) c[e.type]++; c.total++; });
        return c;
    };
    const here = () => location.hash.replace(/^#\/?/, '').split('?')[0].split('/');
    const cards = (items) => OS.bsCards(items);

    const TYPES = [['article', 'Articles', 'page'], ['media', 'Media', 'image'], ['paper', 'Papers', 'notes'], ['lite', 'Lites', 'code']];
    const NEW = [['article', 'Article', 'page'], ['media', 'Media', 'image'], ['paper', 'Paper', 'notes'], ['lite', 'Lite', 'code']];

    const backstage = [
        { id: 'home', label: 'Home', icon: 'home', render: (b) => {
            const c = counts();
            b.innerHTML = '<h1>Welcome to OpenDB!</h1>';
            b.appendChild(cards([
                { label: 'Write an article', hint: 'Share what you know!', icon: 'page', run: () => go('#/new/article') },
                { label: 'Add media', hint: 'Pictures, sound and video!', icon: 'image', run: () => go('#/new/media') },
                { label: 'Random entry', hint: 'Surprise me!', icon: 'dice', run: () => go('#/random') },
            ]));
            b.insertAdjacentHTML('beforeend', '<h2>The database</h2><div class="bb-bs-doc"><img src="favicon.svg" alt=""><div><b>' + plural(c.total, 'entry').replace('entrys', 'entries')
                + '</b><span>' + c.article + ' articles · ' + c.media + ' media · ' + c.paper + ' papers · ' + c.lite + ' lites, all public domain!</span></div></div>');
        } },
        { id: 'about', label: 'About', icon: 'info', render: (b) => {
            b.innerHTML = '<h1>About OpenDB</h1>';
            b.appendChild(cards([
                { label: 'About OpenDB', hint: 'What it is and how to join in!', icon: 'info', run: () => go('#/e/opendb') },
                { label: 'Templates', hint: 'Notices and boxes for your entries!', icon: 'templates', run: () => go('#/templates') },
            ]));
        } },
        { id: 'device', label: 'On this device', icon: 'folder', render: (b) => {
            b.innerHTML = '<h1>On this device</h1>';
            b.appendChild(cards([{ label: 'Your drafts', hint: 'Entries saved in this browser!', icon: 'folder', run: () => go('#/mine') }]));
        } },
        { id: 'download', label: 'Download', icon: 'download', render: (b) => {
            b.innerHTML = '<h1>Download</h1>';
            b.appendChild(cards([{ label: 'Everything (JSON)', hint: 'The whole database, free to reuse!', icon: 'download', run: () => {
                const a = document.createElement('a'); a.href = 'data/index.json'; a.download = 'opendb.json'; document.body.appendChild(a); a.click(); a.remove();
            } }]));
        } },
    ];

    const tabs = [
        { id: 'home', label: 'Home', groups: [
            { label: 'Browse', items: [{ big: true, icon: 'home', label: 'Home', run: () => go('#/'), checked: () => here()[0] === '' }]
                .concat(TYPES.map(([t, l, i]) => ({ big: true, icon: i, label: l, run: () => go('#/browse/' + t), checked: () => here()[0] === 'browse' && here()[1] === t })))
                .concat([{ big: true, icon: 'dice', label: 'Random', run: () => go('#/random') }]) },
            { label: 'New', items: NEW.map(([t, l, i]) => ({ big: true, icon: i, label: 'New\n' + l, run: () => go('#/new/' + t) })) },
            { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: () => [
                { label: 'OpenDB Office', checked: true, icon: 'layout', run: () => OS.setLayout('office') },
                { label: 'OpenDB Classic', icon: 'sparkle', run: () => OS.setLayout('classic') },
            ] }] },
        ] },
        { id: 'tools', label: 'Tools', groups: [
            { label: 'Library', items: [
                { big: true, icon: 'templates', label: 'Templates', run: () => go('#/templates') },
                { big: true, icon: 'folder', label: 'On this\ndevice', run: () => go('#/mine') },
                { big: true, icon: 'download', label: 'Download\nJSON', run: () => { const a = document.createElement('a'); a.href = 'data/index.json'; a.download = 'opendb.json'; document.body.appendChild(a); a.click(); a.remove(); } },
            ] },
        ] },
        { id: 'help', label: 'Help', groups: [
            { label: 'Learn', items: [
                { big: true, icon: 'info', label: 'About', run: () => go('#/e/opendb') },
                { big: true, icon: 'help', label: 'Quick\nTips', run: () => OS.dialog('OpenDB tips',
                    '<p class="os-dlg-text">Everything here is public domain, so copy and reuse it freely! Search from the box above, write entries from the New group, and your drafts stay on this device until you propose them!</p>',
                    [{ label: 'Got it!', primary: true, value: true }]) },
            ] },
        ] },
    ];

    OS.init({
        app: 'OpenDB',
        officeName: 'OpenDB Office',
        kind: 'word',
        key: 'opendb',
        icon: 'favicon.svg',
        officeHint: 'A glossy cyan ribbon with tabs, a File screen and a status bar, like Word!',
        classicHint: 'The original OpenDB: frosted glass, gel buttons and a sunny sky!',
        classicToast: 'OpenDB Classic: frosted glass and gel!',
        theme: { accent: '#12b5ea', 'accent-d': '#0a8fbd', 'accent-l': '#d6f6ff', title: '#0b9fd0', gel1: '#9ce9ff', gel2: '#15cbfe',
            'gel-border': '#b5f0ff', 'gel-glow': 'rgba(21, 203, 254, 0.5)', glow: 'rgba(214, 246, 255, 0.9)', 'thumb-bg': '#06384a' },
        editor: () => null,
        title: () => 'OpenDB',
        qat: [
            { icon: 'page', title: 'New article', run: () => go('#/new/article') },
            { icon: 'dice', title: 'Random entry', run: () => go('#/random') },
        ],
        tabs: tabs,
        backstage: backstage,
        status: () => {
            const c = counts();
            return ['<b>' + c.total + '</b> entries', '<b>' + c.article + '</b> articles', '<b>' + c.media + '</b> media', '<b>' + c.paper + '</b> papers', '<b>' + c.lite + '</b> lites'];
        },
        views: [],
        searchExtra: (q) => app.entries()
            .filter((e) => (e.title || '').toLowerCase().includes(q))
            .slice(0, 8)
            .map((e) => ({ label: e.title, icon: e.type === 'media' ? 'image' : e.type === 'lite' ? 'code' : 'page', where: 'OpenDB', it: { run: () => { location.hash = '#/e/' + e.id; } } })),
    });

    // the pages scroll inside the page area now, so jump to the top on every move!
    window.addEventListener('hashchange', () => { const v = document.getElementById('view'); if (v) v.scrollTop = 0; OS.sync(); });
    // Classic gets a Layout link in the footer!
    const foot = document.querySelector('.foot-glass');
    if (foot) {
        const a = document.createElement('a');
        a.href = '#'; a.textContent = 'Layout';
        a.addEventListener('click', (ev) => {
            ev.preventDefault();
            const box = document.createElement('div');
            box.innerHTML = '<p class="os-dlg-text">Pick a layout! Every entry stays exactly the same!</p>';
            box.appendChild(OS.layoutCards());
            OS.dialog('Layout: OpenDB Office or Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'odb-layout-dlg' });
            setTimeout(OS.syncLayoutCards, 0);
        });
        foot.appendChild(document.createTextNode(' · '));
        foot.appendChild(a);
    }
    OS.sync();
})();
