// Delta's symbol keyboard! In Graph it types into the equation box you last clicked (numbers, powers, roots,
// pi, functions, lists), and in LaTeX it inserts commands at the cursor (math, Greek letters, logic and sets).
// Pressing a key never steals focus from the box you are typing in!
(function () {
    'use strict';
    const D = window.Delta;
    const kb = document.getElementById('dl-kb');
    if (!D || !kb) return;

    const ICON = {
        left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
        right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
        back: '<svg viewBox="0 0 24 24"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M13 9.5l5 5M18 9.5l-5 5"/></svg>',
    };
    // [label, action]. In Graph the action is typed into the MathQuill box: a string, or a list of strings
    // and {k:'Key'} keystrokes. In LaTeX the action is the text to insert ('@' marks where the cursor goes).
    const key = (label, act, extra) => Object.assign({ label: label, act: act }, extra || {});
    const T = (txt) => key(txt, txt);                     // types its own label
    const FN = (name) => key(name, name + '(', { fn: true });
    const SEQ = (label, list, extra) => key(label, list, extra || {});
    const K = (name) => ({ k: name });

    const GRAPH_TABS = [
        { id: 'num', label: '123', cols: 10, keys: [
            T('x'), T('y'), T('a'), T('b'), T('7'), T('8'), T('9'), key('÷', '/'), T('('), T(')'),
            SEQ('x²', ['^', '2', K('Right')], { tex: 'x^2' }), SEQ('xⁿ', ['^'], { tex: 'x^n' }), key('√', 'sqrt', { tex: '\\sqrt{x}' }), key('π', 'pi', { tex: '\\pi' }), T('e'), T('4'), T('5'), T('6'), key('×', '*'), key('|x|', '|'),
            T('['), T(']'), T('{'), T('}'), T(','), T('1'), T('2'), T('3'), key('−', '-'), T('='),
            key(ICON.left, [K('Left')], { html: true, title: 'Move left' }), key(ICON.right, [K('Right')], { html: true, title: 'Move right' }),
            key(ICON.back, [K('Backspace')], { html: true, title: 'Delete' }), key('C', 'CLEAR', { title: 'Clear this function' }), T('0'), T('.'), T('+'), key('a⁄b', '/', { tex: '\\frac{a}{b}' }), FN('polygon'), FN('abs'),
        ] },
        { id: 'fn', label: 'f(x)', cols: 8, keys: [
            FN('sin'), FN('cos'), FN('tan'), FN('sec'), FN('csc'), FN('cot'), FN('sinh'), FN('cosh'),
            FN('arcsin'), FN('arccos'), FN('arctan'), FN('tanh'), FN('ln'), FN('log'), FN('exp'), FN('abs'),
            FN('floor'), FN('ceil'), FN('sign'), FN('min'), FN('max'), FN('polygon'),
            key(ICON.back, [K('Backspace')], { html: true, title: 'Delete' }), key('C', 'CLEAR', { title: 'Clear this function' }),
        ] },
    ];

    const GREEK_LOWER = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'];
    const GREEK_UPPER = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega'];
    const tex = (cmd, ins) => key('\\' + cmd, ins || ('\\' + cmd + ' '), { tex: '\\' + cmd });
    const texOf = (shown, ins) => key(shown, ins, { tex: shown.replace('@', '\\square') });
    const LATEX_TABS = [
        { id: 'math', label: 'Math', cols: 10, keys: [
            texOf('\\frac{@}{\\square}', '\\frac{@}{}'), texOf('\\sqrt{@}', '\\sqrt{@}'), texOf('x^{@}', '^{@}'), texOf('x_{@}', '_{@}'), texOf('\\sum_{n}^{@}', '\\sum_{n=1}^{@}'),
            texOf('\\int_a^b', '\\int_{a}^{b} @\\,dx'), texOf('\\lim_{x\\to a}', '\\lim_{x \\to a} @'), texOf('\\prod', '\\prod_{n=1}^{@}'), tex('infty'), tex('partial'),
            tex('nabla'), tex('pm'), tex('times'), tex('div'), tex('cdot'), tex('le'), tex('ge'), tex('ne'), tex('approx'), tex('equiv'),
            tex('to'), tex('Rightarrow'), tex('Leftrightarrow'), tex('mapsto'), tex('degree', '^\\circ '), texOf('\\vec{@}', '\\vec{@}'), texOf('\\hat{@}', '\\hat{@}'), texOf('\\bar{@}', '\\bar{@}'), texOf('\\dot{@}', '\\dot{@}'), texOf('|@|', '\\left| @ \\right|'),
            texOf('(@)', '\\left( @ \\right)'), texOf('[@]', '\\left[ @ \\right]'), texOf('\\{@\\}', '\\left\\{ @ \\right\\}'), texOf('\\langle @\\rangle', '\\langle @ \\rangle'), key('M', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', { tex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}' }),
            texOf('\\sin', '\\sin '), texOf('\\cos', '\\cos '), texOf('\\ln', '\\ln '), texOf('\\log', '\\log '), texOf('\\exp', '\\exp '),
        ] },
        { id: 'greek', label: 'αβγ', cols: 12, keys: GREEK_LOWER.map((g) => tex(g)).concat(GREEK_UPPER.map((g) => tex(g)), [tex('hbar'), tex('ell'), tex('varepsilon'), tex('varphi')]) },
        { id: 'logic', label: 'Sets', cols: 10, keys: [
            tex('in'), tex('notin'), tex('subset'), tex('subseteq'), tex('supset'), tex('cup'), tex('cap'), tex('emptyset'), tex('setminus'), tex('forall'),
            tex('exists'), tex('nexists'), tex('neg'), tex('land'), tex('lor'), tex('implies'), tex('iff'), tex('therefore'), tex('because'), tex('top'),
            texOf('\\mathbb{R}', '\\mathbb{R}'), texOf('\\mathbb{N}', '\\mathbb{N}'), texOf('\\mathbb{Z}', '\\mathbb{Z}'), texOf('\\mathbb{Q}', '\\mathbb{Q}'), texOf('\\mathbb{C}', '\\mathbb{C}'),
            tex('perp'), tex('parallel'), tex('angle'), tex('triangle'), tex('propto'), tex('sim'), tex('cong'), tex('oplus'), tex('otimes'), tex('ldots'),
        ] },
    ];

    let open = false, tab = { graph: 'num', latex: 'math' };
    try { open = localStorage.getItem('delta_keyboard') === '1'; } catch (e) {}

    const mode = () => D.mode();
    const tabsFor = () => (mode() === 'latex' ? LATEX_TABS : GRAPH_TABS);
    const keyboardMode = () => mode() === 'graph' || mode() === 'latex';

    // The equation box keys go into: the one you last clicked, or else the last function in the list
    function targetField() {
        const id = D.focusedId();
        const rows = D.expressions();
        const chosen = rows.find((e) => e.id === id) || rows[rows.length - 1];
        return chosen ? { id: chosen.id, mf: mathFields[chosen.id] } : null;
    }
    function press(def) {
        if (mode() === 'latex') { D.insertLatex(def.act); return; }
        const t = targetField();
        if (!t || !t.mf) return;
        if (def.act === 'CLEAR') { t.mf.latex(''); window.updateExpression(t.id, '', ''); t.mf.focus(); return; }
        (Array.isArray(def.act) ? def.act : [def.act]).forEach((p) => {
            if (typeof p === 'string') t.mf.typedText(p); else t.mf.keystroke(p.k);
        });
        t.mf.focus();
    }

    function label(def) {
        if (def.html) return def.label;
        if (def.tex && window.katex) {
            try { return window.katex.renderToString(def.tex, { throwOnError: false }); } catch (e) { /* plain text below */ }
        }
        return null;
    }

    function build() {
        const tabs = tabsFor();
        const cur = tabs.find((t) => t.id === tab[mode()]) || tabs[0];
        kb.innerHTML = '';
        const head = document.createElement('div');
        head.className = 'dl-kb-head';
        tabs.forEach((t) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'dl-kb-tab' + (t === cur ? ' active' : ''); b.textContent = t.label;
            b.addEventListener('click', () => { tab[mode()] = t.id; build(); });
            head.appendChild(b);
        });
        const hint = document.createElement('span');
        hint.className = 'dl-kb-hint';
        hint.textContent = mode() === 'latex' ? 'Inserts at the cursor' : 'Types into the selected function';
        head.appendChild(hint);
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'dl-kb-close'; close.title = 'Hide the keyboard';
        close.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
        close.addEventListener('click', () => api.show(false));
        head.appendChild(close);
        kb.appendChild(head);

        const grid = document.createElement('div');
        grid.className = 'dl-kb-grid' + (mode() === 'latex' ? ' dl-kb-tex' : '');
        grid.style.setProperty('--cols', cur.cols);
        cur.keys.forEach((def) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'dl-key' + (def.fn ? ' dl-key-fn' : '');
            if (def.title) b.title = def.title;
            b.dataset.key = def.html ? (def.title || '') : def.label;
            const html = label(def);
            if (html !== null) b.innerHTML = html; else b.textContent = def.label;
            b.addEventListener('click', () => press(def));
            grid.appendChild(b);
        });
        kb.appendChild(grid);
    }

    // The keyboard lives under the graph or the formula, whichever mode is open
    function place() {
        const want = mode() === 'latex' ? document.querySelector('#panel-latex .panel-card') : mode() === 'graph' ? document.querySelector('#panel-graph .panel-card') : null;
        const show = open && !!want;
        kb.hidden = !show;
        document.body.classList.toggle('dl-kb-on', show);
        if (!want) return;
        if (kb.parentNode !== want) want.appendChild(kb);
        if (show) build();
        document.querySelectorAll('.dl-kb-toggle').forEach((b) => b.classList.toggle('active', show));
    }

    // Keys must not take focus away from the box being typed in
    kb.addEventListener('pointerdown', (ev) => { if (ev.target.closest('button')) ev.preventDefault(); });
    kb.addEventListener('mousedown', (ev) => { if (ev.target.closest('button')) ev.preventDefault(); });

    document.querySelectorAll('.dl-kb-toggle').forEach((b) => b.addEventListener('click', () => api.toggle()));

    const api = {
        isOpen: () => open && keyboardMode(),
        show(v) {
            open = !!v;
            try { localStorage.setItem('delta_keyboard', open ? '1' : '0'); } catch (e) {}
            place();
            if (window.OfficeShell) OfficeShell.sync();
            // the graph got shorter or taller: redraw it to fit
            if (mode() === 'graph') setTimeout(() => D.renderGraph(), 30);
        },
        toggle() { if (!keyboardMode()) D.switchMode('graph'); api.show(!open); },
        place: place,
    };
    D.keyboard = api;
    // follow mode changes
    const origSwitch = window.switchMode;
    window.switchMode = function (m) { origSwitch(m); place(); };
    D.switchMode = window.switchMode;
    place();
})();
