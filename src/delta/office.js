// Delta's New layout! A pink ribbon (Home, Graph, LaTeX, Calculator, Share, Help), a File screen for
// opening and saving workspaces, a mode switcher in the status bar and the same graphing engine,
// LaTeX renderer and calculator underneath. Delta Classic stays one click away! (The ribbon itself is office-shell.js!)
(function () {
    'use strict';
    const D = window.Delta;
    const OS = window.OfficeShell;
    if (!D || !OS) return;

    // Delta's own line drawings
    OS.icons['dl-graph'] = '<path d="M3 3v18h18"/><path d="M6 16c3-9 6-9 8-4s4 3 6-5"/>';
    OS.icons['dl-calc'] = '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>';
    OS.icons['dl-grid'] = '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>';
    OS.icons['dl-slider'] = '<path d="M3 12h18"/><circle cx="9" cy="12" r="3" fill="var(--os-ribbon, #fff)"/>';
    OS.icons['dl-fraction'] = '<path d="M5 12h14"/><path d="M10 5h4M10 19h4"/>';
    OS.icons['dl-root'] = '<path d="M3 13l3 -1 3 7 5-15h7"/>';
    OS.icons['dl-integral'] = '<path d="M14 4c-2 0-3 1-3 3l-1 10c0 2-1 3-3 3"/>';
    OS.icons['dl-matrix'] = '<path d="M7 4H4v16h3M17 4h3v16h-3"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01"/>';
    OS.icons['dl-pi'] = '<path d="M4 7h16M9 7v11M15 7v9c0 2 1 2 3 2"/>';
    OS.icons['dl-backspace'] = '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M13 9.5l5 5M18 9.5l-5 5"/>';

    const MODES = [
        { id: 'home', label: 'Home', icon: 'home' },
        { id: 'graph', label: 'Graph', icon: 'dl-graph' },
        { id: 'latex', label: 'LaTeX', icon: 'sigma' },
        { id: 'calc', label: 'Calculator', icon: 'dl-calc' },
    ];
    const modeIs = (m) => D.mode() === m;
    const goTo = (m) => { D.switchMode(m); OS.sync(); };
    const sync = () => OS.sync();
    const cards = (items) => OS.bsCards(items);
    const plural = (n, w) => n + ' ' + w + (n !== 1 ? 's' : '');
    const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

    const fileInput = document.getElementById('delta-file');
    function openFile() { if (fileInput) fileInput.click(); }
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const f = fileInput.files && fileInput.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                if (D.importWorkspaceText(String(r.result))) OS.toast('Opened ' + f.name + '!');
                else OS.toast('That is not a Delta file!');
                fileInput.value = '';
                sync();
            };
            r.readAsText(f);
        });
    }
    function saveFile() { D.exportWorkspace(); OS.flashSaved('Saved!'); OS.toast('Saved workspace.delta!'); }
    const newOne = () => OS.confirm('New Workspace', 'Clear the functions, the formula and the calculator?', 'Start fresh', true)
        .then((ok) => { if (ok) { D.newWorkspace(); sync(); OS.toast('Fresh workspace!'); } });
    function copyText(text, msg) {
        const done = () => OS.toast(msg);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
        else done();
    }
    const exportImage = (kind) => { if (!D.exportGraph(kind)) { goTo('graph'); setTimeout(() => D.exportGraph(kind), 250); } };

    const latexMenu = (list) => () => list.map((x) => ({ label: x[0], run: () => { goTo('latex'); D.insertLatex(x[1]); } }));
    const GREEK = [['alpha', '\\alpha '], ['beta', '\\beta '], ['gamma', '\\gamma '], ['delta', '\\delta '], ['theta', '\\theta '], ['lambda', '\\lambda '], ['mu', '\\mu '], ['pi', '\\pi '], ['sigma', '\\sigma '], ['phi', '\\phi '], ['omega', '\\omega ']];
    const EXAMPLES = [
        ['Quadratic formula', 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'],
        ['Euler\'s identity', 'e^{i\\pi} + 1 = 0'],
        ['Gaussian integral', '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}'],
        ['Basel problem', '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}'],
        ['Schrödinger equation', 'i\\hbar \\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi'],
    ];
    const SAMPLE_FUNCS = [['Parabola', 'y=x^2'], ['Sine wave', 'y=sin(x)'], ['Cubic', 'y=x^3-3x'], ['Absolute value', 'y=abs(x)'], ['Circle-ish curve', 'y=sqrt(9-x^2)']];

    function addFunction(text) {
        goTo('graph');
        D.addExpressionRow();
        const list = D.expressions();
        const e = list[list.length - 1];
        e.fn = text; e.latex = text;
        window.renderExpressionRows();
        D.renderGraph();
        sync();
    }

    const backstage = [
        { id: 'home', label: 'Home', icon: 'home', render: (b) => {
            b.innerHTML = '<h1>' + greet() + '!</h1>';
            b.appendChild(cards([
                { label: 'Graph', hint: 'Plot functions, sliders and lists!', icon: 'dl-graph', run: () => { OS.closeBackstage(); goTo('graph'); } },
                { label: 'LaTeX', hint: 'Type a formula, see it typeset!', icon: 'sigma', run: () => { OS.closeBackstage(); goTo('latex'); } },
                { label: 'Calculator', hint: 'Quick arithmetic with the keyboard!', icon: 'dl-calc', run: () => { OS.closeBackstage(); goTo('calc'); } },
                { label: 'Open a .delta file', hint: 'A saved Delta workspace!', icon: 'folder', run: () => { OS.closeBackstage(); openFile(); } },
            ]));
            b.insertAdjacentHTML('beforeend', '<h2>This workspace</h2><div class="bb-bs-doc dl-bs-doc"><img src="favicon-96.png" alt=""><div><b>'
                + plural(D.expressions().length, 'function') + '</b><span>Saved automatically in this browser!</span></div></div>');
        } },
        { id: 'open', label: 'Open', icon: 'folder', render: (b) => {
            b.innerHTML = '<h1>Open</h1>';
            b.appendChild(cards([{ label: 'Open a .delta file', hint: 'Bring a workspace back!', icon: 'folder', run: () => { OS.closeBackstage(); openFile(); } }]));
        } },
        { id: 'save', label: 'Save', icon: 'save', render: (b) => {
            b.innerHTML = '<h1>Save</h1>';
            b.appendChild(cards([{ label: 'Save as .delta', hint: 'Functions, formula and graph settings!', icon: 'save', run: saveFile }]));
        } },
        { id: 'export', label: 'Export', icon: 'export', render: (b) => {
            b.innerHTML = '<h1>Export</h1>';
            b.appendChild(cards([
                { label: 'Graph as PNG', hint: 'A sharp picture of the graph!', icon: 'image', run: () => exportImage('png') },
                { label: 'Graph as SVG', hint: 'Vector graphics for papers and slides!', icon: 'dl-graph', run: () => exportImage('svg') },
                { label: 'Copy LaTeX', hint: 'The formula text, ready to paste!', icon: 'copy', run: () => copyText(D.latexText(), 'LaTeX copied!') },
            ]));
        } },
        { id: 'new', label: 'New Workspace', icon: 'newDoc', action: newOne },
    ];

    const tabs = [
        { id: 'home', label: 'Home', groups: [
            { label: 'Workspace', items: MODES.map((m) => ({
                big: true, icon: m.icon, label: m.label, run: () => goTo(m.id), checked: () => modeIs(m.id),
            })) },
            { label: 'File', items: [
                { big: true, icon: 'newDoc', label: 'New', run: newOne },
                { big: true, icon: 'folder', label: 'Open', run: openFile },
                { big: true, icon: 'save', label: 'Save', run: saveFile },
            ] },
            { label: 'Layout', items: [{ big: true, icon: 'layout', label: 'Layout', menu: () => [
                { label: 'New', checked: true, icon: 'layout', run: () => OS.setLayout('office') },
                { label: 'Delta Classic', icon: 'sparkle', run: () => OS.setLayout('classic') },
            ] }] },
        ] },
        { id: 'graph', label: 'Graph', groups: [
            { label: 'Functions', items: [
                { big: true, icon: 'plus', label: 'Add\nFunction', run: () => { goTo('graph'); D.addExpressionRow(); sync(); } },
                { big: true, icon: 'dl-slider', label: 'Add\nSlider', title: 'Adds a number you can drag, like a = 1',
                    run: () => { goTo('graph'); D.addSliderRow(D.nextFreeLetter()); sync(); } },
                { big: true, icon: 'arrowUp', label: 'Move\nUp', title: 'Move the selected function up: the top function is drawn on top!', run: () => { const id = D.focusedId(); if (id !== null) { D.moveExpression(id, D.expressions().findIndex((e) => e.id === id) - 1); sync(); } else OS.toast('Click a function first!'); } },
                { big: true, icon: 'arrowDown', label: 'Move\nDown', title: 'Move the selected function down', run: () => { const id = D.focusedId(); if (id !== null) { D.moveExpression(id, D.expressions().findIndex((e) => e.id === id) + 1); sync(); } else OS.toast('Click a function first!'); } },
                { big: true, icon: 'dl-graph', label: 'Samples', menu: () => SAMPLE_FUNCS.map((x) => ({ label: x[0] + '  (' + x[1] + ')', run: () => addFunction(x[1]) })) },
            ] },
            { label: 'View', items: [
                { big: true, icon: 'zoom', label: 'Zoom\nIn', run: () => D.zoomGraph(0.6) },
                { big: true, icon: 'zoomOut', label: 'Zoom\nOut', run: () => D.zoomGraph(1.6) },
                { big: true, icon: 'reset', label: 'Reset\nView', run: () => D.resetView() },
                { big: true, icon: 'dl-grid', label: 'Grid', run: () => { D.toggleGrid(); sync(); }, checked: () => D.grid() },
                { big: true, icon: 'keyboard', label: 'Keyboard', title: 'Symbol keyboard', run: () => { goTo('graph'); D.keyboard.toggle(); }, checked: () => D.keyboard.isOpen() },
            ] },
            { label: 'Export', items: [
                { big: true, icon: 'image', label: 'PNG', title: 'Save the graph as a picture', run: () => exportImage('png') },
                { big: true, icon: 'dl-graph', label: 'SVG', title: 'Save the graph as vector art', run: () => exportImage('svg') },
            ] },
        ] },
        { id: 'latex', label: 'LaTeX', groups: [
            { label: 'Insert', items: [
                { big: true, icon: 'dl-fraction', label: 'Fraction', run: () => { goTo('latex'); D.insertLatex('\\frac{@}{}'); } },
                { big: true, icon: 'dl-root', label: 'Root', run: () => { goTo('latex'); D.insertLatex('\\sqrt{@}'); } },
                { big: true, icon: 'dl-integral', label: 'Integral', run: () => { goTo('latex'); D.insertLatex('\\int_{a}^{b} @\\,dx'); } },
                { big: true, icon: 'sigma', label: 'Sum', run: () => { goTo('latex'); D.insertLatex('\\sum_{n=1}^{\\infty} @'); } },
                { big: true, icon: 'dl-matrix', label: 'Matrix', run: () => { goTo('latex'); D.insertLatex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'); } },
                { big: true, icon: 'dl-pi', label: 'Greek', menu: latexMenu(GREEK) },
            ] },
            { label: 'Formula', items: [
                { big: true, icon: 'sparkle', label: 'Examples', menu: () => EXAMPLES.map((x) => ({ label: x[0], run: () => { goTo('latex'); D.setLatex(x[1]); sync(); } })) },
                { big: true, icon: 'keyboard', label: 'Keyboard', title: 'Symbol keyboard', run: () => { goTo('latex'); D.keyboard.toggle(); }, checked: () => D.keyboard.isOpen() },
                { big: true, icon: 'copy', label: 'Copy\nLaTeX', run: () => copyText(D.latexText(), 'LaTeX copied!') },
                { big: true, icon: 'trash', label: 'Clear', run: () => { goTo('latex'); D.setLatex(''); sync(); } },
            ] },
        ] },
        { id: 'calc', label: 'Calculator', groups: [
            { label: 'Keys', items: [
                { big: true, icon: 'dl-calc', label: 'Open', run: () => goTo('calc') },
                { big: true, icon: 'dl-backspace', label: 'Backspace', run: () => { goTo('calc'); D.backCalc(); sync(); } },
                { big: true, icon: 'x', label: 'Clear', run: () => { goTo('calc'); D.clearCalc(); sync(); } },
                { big: true, icon: 'check', label: 'Equals', run: () => { goTo('calc'); D.solveCalc(); sync(); } },
            ] },
            { label: 'Result', items: [{ big: true, icon: 'copy', label: 'Copy\nResult', run: () => copyText(D.calc(), 'Result copied!') }] },
        ] },
        { id: 'share', label: 'Share', groups: [
            { label: 'File', items: [
                { big: true, icon: 'save', label: 'Save\n.delta', run: saveFile },
                { big: true, icon: 'folder', label: 'Open\n.delta', run: openFile },
            ] },
            { label: 'Export', items: [
                { big: true, icon: 'image', label: 'Graph\nPNG', run: () => exportImage('png') },
                { big: true, icon: 'dl-graph', label: 'Graph\nSVG', run: () => exportImage('svg') },
            ] },
        ] },
        { id: 'help', label: 'Help', groups: [
            { label: 'Tips', items: [{ big: true, icon: 'help', label: 'Quick\nTips', run: () => OS.dialog('Delta tips',
                '<p class="os-dlg-text">In Graph, write <b>y = x^2</b> or just <b>sin(x)</b>! Type <b>a = 1</b> to get a slider, <b>A = [(0,0),(1,0),(1,1)]</b> for a list of points and <b>polygon(A)</b> to draw it. In LaTeX, type a formula and watch it typeset. The calculator works with your keyboard too!</p>',
                [{ label: 'Got it!', primary: true, value: true }]) }] },
        ] },
    ];

    const statusFor = () => {
        if (modeIs('graph')) { const n = D.expressions().filter((e) => e.fn).length; return ['<b>' + n + '</b> ' + (n === 1 ? 'function' : 'functions'), 'Graph']; }
        if (modeIs('latex')) return ['<b>' + D.latexText().length + '</b> characters', 'LaTeX'];
        if (modeIs('calc')) return ['<b>' + OS.esc(D.calc()) + '</b>', 'Calculator'];
        return ['Delta', 'Pick a mode!'];
    };

    OS.init({
        app: 'Delta',
        officeName: 'Delta',
        kind: 'word',
        key: 'delta',
        icon: 'favicon-96.png',
        officeHint: 'A pink ribbon with Graph, LaTeX and Calculator tabs, a File screen and a status bar!',
        classicHint: 'The original Delta: pink glass sidebar and gel buttons!',
        classicToast: 'Delta Classic: pink glass and gel!',
        theme: { accent: '#ee0058', 'accent-d': '#bf0047', 'accent-l': '#ffe0ea', title: '#e00054', gel1: '#ff6f9f', gel2: '#ee0058',
            'gel-border': '#ff9fbf', 'gel-glow': 'rgba(238, 0, 88, 0.45)', glow: 'rgba(255, 224, 234, 0.9)', 'thumb-bg': '#3a0016' },
        editor: () => null,
        title: () => 'My Workspace',
        onLayout: () => setTimeout(() => { if (D.mode() === 'graph') D.renderGraph(); }, 120),
        qat: [
            { icon: 'save', title: 'Save .delta', run: saveFile },
            { icon: 'dl-graph', title: 'Graph', run: () => goTo('graph') },
            { icon: 'sigma', title: 'LaTeX', run: () => goTo('latex') },
        ],
        tabs: tabs,
        backstage: backstage,
        status: statusFor,
        views: MODES.map((m) => ({ icon: m.icon, title: m.label, run: () => goTo(m.id), active: () => modeIs(m.id) })),
        searchExtra: (q) => D.expressions()
            .filter((e) => (e.fn || '').toLowerCase().includes(q))
            .slice(0, 6)
            .map((e) => ({ label: 'Function "' + e.fn + '"', icon: 'dl-graph', where: 'Graph', it: { run: () => goTo('graph') } })),
    });

    // The Classic sidebar's Layout button opens this
    D.layoutDialog = () => {
        const box = document.createElement('div');
        box.innerHTML = '<p class="os-dlg-text">Pick a layout! Your workspace stays exactly the same!</p>';
        box.appendChild(OS.layoutCards());
        OS.dialog('Layout: New or Delta Classic', box, [{ label: 'Done', primary: true, value: true }], { cls: 'dl-layout-dlg' });
        setTimeout(OS.syncLayoutCards, 0);
    };
    // The graph needs a redraw once the window's size is known
    setTimeout(() => { if (D.mode() === 'graph') D.renderGraph(); }, 200);
})();
