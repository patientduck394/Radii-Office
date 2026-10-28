/* =====================================================================
   LaTeX math for Writeout, Bitbook and OpenDB! (Same file in each.)
   - No LaTeX needed: Insert > Equation opens a friendly box with buttons
     for fractions, powers, roots, Greek letters, ℝ ℕ ℤ, integrals and
     more, plus a live preview. Click a button, fill in the boxes, done!
   - Know LaTeX already? Type $x^2$ then Space for inline math, or
     $$...$$ then Space for a centered equation.
   - Double-click an equation to edit it in the same box.
   Equations are protected chips that remember their LaTeX (data-tex), so
   they save, export and reopen like any other part of the document!
   Drawn by KaTeX.
   ===================================================================== */
(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = '.kd-math{display:inline-block;padding:0 3px;border-radius:6px;cursor:pointer;vertical-align:middle;user-select:none}' +
        '.kd-math:hover{background:rgba(56,189,248,.15);outline:1px dashed #38bdf8}' +
        '.kd-math-display{display:block;text-align:center;margin:10px 0;padding:6px 4px;overflow-x:auto}' +
        '.kd-math-src{color:#7c3aed;font-family:ui-monospace,Menlo,monospace}' +
        '.kdm-back{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(8,30,52,.45);backdrop-filter:blur(4px)}' +
        '.kdm-card{width:min(640px,100%);max-height:92vh;display:flex;flex-direction:column;gap:10px;padding:16px 18px;border-radius:18px;background:linear-gradient(180deg,#f7fbff,#e6f2fc);border:1px solid #fff;box-shadow:0 24px 60px rgba(0,0,0,.35);font:14px "Segoe UI",system-ui,sans-serif;color:#10243a;overflow:auto}' +
        '.kdm-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.kdm-head b{font-size:17px}' +
        '.kdm-hint{font-size:12.5px;color:#3c5670;margin:0}' +
        '.kdm-seg{display:inline-flex;padding:3px;border-radius:999px;background:#dcecf9;gap:2px}' +
        '.kdm-seg button,.kdm-tabs button{font:700 12.5px "Segoe UI",system-ui,sans-serif;border:0;background:none;padding:5px 12px;border-radius:999px;cursor:pointer;color:#3c5670}' +
        '.kdm-seg button.on,.kdm-tabs button.on{color:#fff;background:linear-gradient(180deg,#8fd0ff,#1e8fe0 55%,#0b66b5)}' +
        '.kdm-tabs{display:flex;flex-wrap:wrap;gap:4px}' +
        '.kdm-pad{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px}' +
        '.kdm-pad button{min-height:42px;border-radius:10px;border:1px solid #b9d5ec;background:linear-gradient(180deg,#fff,#eaf4fc);cursor:pointer;font-size:15px;color:#10243a;box-shadow:inset 0 1px 0 #fff}' +
        '.kdm-pad button:hover{border-color:#1e8fe0;background:#fff}' +
        '.kdm-tex{width:100%;box-sizing:border-box;min-height:58px;resize:vertical;font:14px ui-monospace,Menlo,monospace;padding:8px 10px;border-radius:10px;border:1px solid #9cc9ec;background:#fff;color:#10243a}' +
        '.kdm-prev{min-height:64px;display:grid;place-items:center;padding:10px;border-radius:12px;background:#fff;border:1px dashed #9cc9ec;overflow-x:auto;font-size:18px}' +
        '.kdm-prev .kdm-empty{color:#7a93aa;font-size:13px}' +
        '.kdm-foot{display:flex;justify-content:flex-end;gap:8px}' +
        '.kdm-foot button{font:700 13.5px "Segoe UI",system-ui,sans-serif;padding:8px 18px;border-radius:999px;cursor:pointer;border:1px solid #b9d5ec;background:linear-gradient(180deg,#fff,#e8f3fc);color:#10243a}' +
        '.kdm-foot .go{color:#fff;border-color:#0b5a99;background:linear-gradient(180deg,#8fd0ff,#1e8fe0 50%,#0b66b5)}';
    document.head.appendChild(style);

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    // KaTeX HTML for some LaTeX (or the source itself until KaTeX has loaded)!
    function mathHTML(tex, display) {
        if (window.katex) {
            try { return window.katex.renderToString(tex, { displayMode: !!display, throwOnError: false, output: 'html' }); }
            catch (e) { /* show the source below */ }
        }
        return '<code class="kd-math-src">' + esc((display ? '$$' : '$') + tex + (display ? '$$' : '$')) + '</code>';
    }
    function paint(el) {
        el.innerHTML = mathHTML(el.getAttribute('data-tex') || '', el.getAttribute('data-display') === '1');
    }
    function makeMath(tex, display) {
        const el = document.createElement(display ? 'div' : 'span');
        el.className = 'kd-math' + (display ? ' kd-math-display' : '');
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-tex', tex);
        el.setAttribute('data-display', display ? '1' : '0');
        el.setAttribute('title', 'Double-click to edit this equation!');
        paint(el);
        return el;
    }
    function changed() {
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
        try { document.dispatchEvent(new CustomEvent('kd-math-changed')); } catch (e) {}
    }
    function sound(f, d) { try { if (typeof playAeroClickSound === 'function') playAeroClickSound(f, d); } catch (e) {} }

    /* ---------- The equation box: buttons for everything, so no LaTeX is needed ---------- */
    // [what the button shows (LaTeX), what it writes ("|" is where the cursor lands), tooltip]
    const PAD = {
        'Basics': [
            ['x^{2}', '^{|}', 'Power (to the power of)'], ['x_{n}', '_{|}', 'Subscript'], ['\\frac{a}{b}', '\\frac{|}{}', 'Fraction'],
            ['\\sqrt{x}', '\\sqrt{|}', 'Square root'], ['\\sqrt[3]{x}', '\\sqrt[3]{|}', 'Cube root'], ['\\left(x\\right)', '\\left(|\\right)', 'Brackets that grow'],
            ['\\pm', '\\pm ', 'Plus or minus'], ['\\times', '\\times ', 'Times'], ['\\div', '\\div ', 'Divided by'], ['\\cdot', '\\cdot ', 'Dot (times)'],
            ['\\neq', '\\neq ', 'Not equal'], ['\\approx', '\\approx ', 'About equal'], ['\\le', '\\le ', 'Less than or equal'], ['\\ge', '\\ge ', 'Greater than or equal'],
            ['\\infty', '\\infty ', 'Infinity'], ['\\%', '\\% ', 'Percent'], ['\\degree', '^{\\circ}', 'Degrees'], ['|x|', '\\left|{|}\\right|', 'Absolute value'],
        ],
        'Greek': [
            ['\\alpha', '\\alpha '], ['\\beta', '\\beta '], ['\\gamma', '\\gamma '], ['\\delta', '\\delta '], ['\\epsilon', '\\epsilon '], ['\\theta', '\\theta '],
            ['\\lambda', '\\lambda '], ['\\mu', '\\mu '], ['\\pi', '\\pi '], ['\\rho', '\\rho '], ['\\sigma', '\\sigma '], ['\\tau', '\\tau '],
            ['\\phi', '\\phi '], ['\\omega', '\\omega '], ['\\Delta', '\\Delta '], ['\\Sigma', '\\Sigma '], ['\\Pi', '\\Pi '], ['\\Omega', '\\Omega '],
        ],
        'Sets': [
            ['\\mathbb{R}', '\\mathbb{R}', 'Real numbers'], ['\\mathbb{N}', '\\mathbb{N}', 'Natural numbers'], ['\\mathbb{Z}', '\\mathbb{Z}', 'Integers'],
            ['\\mathbb{Q}', '\\mathbb{Q}', 'Rational numbers'], ['\\mathbb{C}', '\\mathbb{C}', 'Complex numbers'], ['\\{x\\}', '\\{|\\}', 'A set'],
            ['\\in', '\\in ', 'Is in'], ['\\notin', '\\notin ', 'Is not in'], ['\\subset', '\\subset ', 'Subset'], ['\\subseteq', '\\subseteq ', 'Subset or equal'],
            ['\\cup', '\\cup ', 'Union'], ['\\cap', '\\cap ', 'Intersection'], ['\\emptyset', '\\emptyset ', 'Empty set'], ['\\setminus', '\\setminus ', 'Minus (sets)'],
        ],
        'Calculus': [
            ['\\int', '\\int ', 'Integral'], ['\\int_a^b', '\\int_{|}^{} ', 'Integral from a to b'], ['\\sum_{i=1}^{n}', '\\sum_{|}^{} ', 'Sum'],
            ['\\prod', '\\prod_{|}^{} ', 'Product'], ['\\lim_{x\\to a}', '\\lim_{| \\to } ', 'Limit'], ['\\frac{d}{dx}', '\\frac{d}{dx}', 'Derivative'],
            ['\\frac{\\partial}{\\partial x}', '\\frac{\\partial |}{\\partial }', 'Partial derivative'], ['\\partial', '\\partial ', 'Partial'],
            ['\\nabla', '\\nabla ', 'Nabla'], ['\\to', '\\to ', 'Goes to'], ['\\log', '\\log ', 'Logarithm'], ['\\sin', '\\sin ', 'Sine'], ['\\cos', '\\cos ', 'Cosine'], ['\\tan', '\\tan ', 'Tangent'],
        ],
        'Logic': [
            ['\\Rightarrow', '\\Rightarrow ', 'Implies'], ['\\Leftrightarrow', '\\Leftrightarrow ', 'If and only if'], ['\\rightarrow', '\\rightarrow ', 'Arrow'],
            ['\\forall', '\\forall ', 'For all'], ['\\exists', '\\exists ', 'There exists'], ['\\neg', '\\neg ', 'Not'], ['\\land', '\\land ', 'And'], ['\\lor', '\\lor ', 'Or'],
            ['\\therefore', '\\therefore ', 'Therefore'], ['\\because', '\\because ', 'Because'],
        ],
        'Matrices': [
            ['\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', '\\begin{pmatrix} | & \\\\  & \\end{pmatrix}', '2 by 2 matrix'],
            ['\\begin{bmatrix}a\\\\b\\end{bmatrix}', '\\begin{bmatrix} | \\\\  \\end{bmatrix}', 'Column'],
            ['\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}', '\\begin{vmatrix} | & \\\\  & \\end{vmatrix}', 'Determinant'],
            ['\\begin{cases}a\\\\b\\end{cases}', '\\begin{cases} | & \\text{if } \\\\  & \\text{otherwise} \\end{cases}', 'Cases'],
        ],
    };

    // opts: { tex, display, onDone(tex, display) }
    function openBox(opts) {
        const back = document.createElement('div');
        back.className = 'kdm-back';
        let display = !!opts.display;
        let tab = 'Basics';
        back.innerHTML = '<div class="kdm-card" role="dialog" aria-label="Equation">' +
            '<div class="kdm-head"><b>Σ Equation</b><div class="kdm-seg"><button type="button" data-d="0">Inline</button><button type="button" data-d="1">Centered</button></div></div>' +
            '<p class="kdm-hint">Click the buttons to build your math, no LaTeX needed! Or type LaTeX in the box if you know it!</p>' +
            '<div class="kdm-tabs">' + Object.keys(PAD).map(function (t) { return '<button type="button" data-tab="' + t + '">' + t + '</button>'; }).join('') + '</div>' +
            '<div class="kdm-pad"></div>' +
            '<textarea class="kdm-tex" spellcheck="false" placeholder="Build it with the buttons above, or type here, like  x^2 + y^2 = r^2"></textarea>' +
            '<div class="kdm-prev"></div>' +
            '<div class="kdm-foot"><button type="button" class="no">Cancel</button><button type="button" class="go">' + (opts.tex ? 'Update' : 'Insert') + '</button></div></div>';
        document.body.appendChild(back);
        const box = back.querySelector('.kdm-tex'), prev = back.querySelector('.kdm-prev'), pad = back.querySelector('.kdm-pad');
        box.value = opts.tex || '';
        function preview() {
            const t = box.value.trim();
            prev.innerHTML = t ? mathHTML(t, display) : '<span class="kdm-empty">Your math shows up here!</span>';
            back.querySelectorAll('[data-d]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-d') === '1') === display); });
        }
        function drawPad() {
            back.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
            pad.innerHTML = PAD[tab].map(function (k, i) {
                return '<button type="button" data-i="' + i + '" title="' + esc(k[2] || k[0]) + '">' + (window.katex ? mathHTML(k[0], false) : esc(k[0])) + '</button>';
            }).join('');
        }
        function put(snippet) {
            const at = snippet.indexOf('|');
            const text = snippet.replace('|', '');
            const s = box.selectionStart, e = box.selectionEnd;
            // a selection goes inside the new piece (select "x", press Fraction: \frac{x}{})
            const chosen = box.value.slice(s, e);
            const filled = at >= 0 && chosen ? text.slice(0, at) + chosen + text.slice(at) : text;
            box.setRangeText(filled, s, e, 'end');
            const caret = s + (at >= 0 ? at + chosen.length : filled.length);
            box.focus();
            box.setSelectionRange(caret, caret);
            preview();
            sound(700, 0.05);
        }
        function close() { back.remove(); document.removeEventListener('keydown', onKey, true); }
        function done() {
            const t = box.value.trim();
            close();
            if (t && opts.onDone) opts.onDone(t, display);
        }
        function onKey(e) {
            if (e.key === 'Escape') { e.stopPropagation(); close(); }
            else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done(); }
        }
        document.addEventListener('keydown', onKey, true);
        back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
        back.querySelector('.kdm-tabs').addEventListener('click', function (e) { const b = e.target.closest('[data-tab]'); if (b) { tab = b.getAttribute('data-tab'); drawPad(); } });
        back.querySelector('.kdm-seg').addEventListener('click', function (e) { const b = e.target.closest('[data-d]'); if (b) { display = b.getAttribute('data-d') === '1'; preview(); } });
        pad.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep the box's cursor where it is
        pad.addEventListener('click', function (e) { const b = e.target.closest('[data-i]'); if (b) put(PAD[tab][+b.getAttribute('data-i')][1]); });
        box.addEventListener('input', preview);
        back.querySelector('.no').addEventListener('click', close);
        back.querySelector('.go').addEventListener('click', done);
        drawPad();
        preview();
        box.focus();
        box.setSelectionRange(box.value.length, box.value.length);
    }

    /* ---------- In the document editor ---------- */
    // Called by the typing engine on Space: "$...$" or "$$...$$" right before the caret becomes math!
    function tryConvert(e, lineText, textNode, range, selection) {
        let m = /\$\$([^$]+)\$\$$/.exec(lineText);
        let display = true;
        if (!m) {
            m = /(?:^|[^$\\\w])\$([^$\s](?:[^$]*[^$\s])?)\$$/.exec(lineText);
            display = false;
            if (!m) return false;
        }
        const tex = m[1].trim();
        if (!tex) return false;
        // a plain price like "$5 and $6" is not math: inline math needs a letter, \ or ^_{}=+
        if (!display && !/[a-zA-Z\\^_{}=+<>]/.test(tex)) return false;
        e.preventDefault();
        // where the opening $ sits (the inline pattern may also match one character before it)
        const start = m.index + (m[0][0] === '$' ? 0 : 1);
        const full = textNode.nodeValue;
        const mathEl = makeMath(tex, display);
        const tail = document.createTextNode(' ' + full.substring(lineText.length));
        textNode.nodeValue = full.substring(0, start);
        textNode.parentNode.insertBefore(tail, textNode.nextSibling);
        textNode.parentNode.insertBefore(mathEl, tail);
        const r = document.createRange();
        r.setStart(tail, 1);
        r.collapse(true);
        selection.removeAllRanges();
        selection.addRange(r);
        sound(820, 0.1);
        changed();
        return true;
    }

    let saved = null;
    document.addEventListener('selectionchange', function () {
        const sel = window.getSelection();
        const host = document.getElementById('wysiwyg-canvas');
        if (host && sel && sel.rangeCount && host.contains(sel.getRangeAt(0).startContainer)) saved = sel.getRangeAt(0).cloneRange();
    });
    // Insert > Equation: the equation box, then the math goes where the cursor was!
    function insert(display) {
        const host = document.getElementById('wysiwyg-canvas');
        if (!host) return;
        const where = saved && host.contains(saved.startContainer) ? saved.cloneRange() : null;
        openBox({ display: display, onDone: function (tex, disp) {
            const el = makeMath(tex, disp);
            let r = where;
            if (!r) { r = document.createRange(); r.selectNodeContents(host); r.collapse(false); }
            r.deleteContents();
            r.insertNode(el);
            const after = document.createTextNode(' ');
            el.parentNode.insertBefore(after, el.nextSibling);
            const cr = document.createRange();
            cr.setStart(after, 1);
            cr.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(cr);
            sound(820, 0.1);
            changed();
        } });
    }

    // Double-click an equation to edit it in the same box!
    document.addEventListener('dblclick', function (e) {
        const el = e.target.closest && e.target.closest('.kd-math');
        if (!el) return;
        e.preventDefault();
        openBox({ tex: el.getAttribute('data-tex') || '', display: el.getAttribute('data-display') === '1', onDone: function (tex, disp) {
            if ((el.getAttribute('data-display') === '1') !== disp) {
                const fresh = makeMath(tex, disp);
                el.replaceWith(fresh);
            } else { el.setAttribute('data-tex', tex); paint(el); }
            changed();
        } });
    });

    // Equations saved before KaTeX loaded (or pasted in) get drawn once it is ready!
    function refreshAll(root) {
        (root || document).querySelectorAll('.kd-math').forEach(function (el) {
            if (!el.querySelector('.katex') && window.katex) paint(el);
        });
    }
    window.addEventListener('load', function () { refreshAll(); });
    setTimeout(refreshAll, 1500);

    window.kdMathTryConvert = tryConvert;
    window.kdMathInsert = insert;
    window.kdMathBox = openBox;
    window.kdMathRefresh = refreshAll;
    window.kdMathHTML = mathHTML;
})();
