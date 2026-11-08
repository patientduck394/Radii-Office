// ==========================================
// STATE MANAGEMENT & COLOR PALETTE
// ==========================================
const plotColors = ['#EE0058', '#0284c7', '#059669', '#d97706', '#7e22ce', '#dc2626'];

let expressions = [
    { 
        id: 1, 
        fn: 'a * x^2', 
        latex: 'a\\cdot x^2',
        color: plotColors[0], 
        fillEnabled: false, 
        fillOpacity: 0.3, 
        strokeWidth: 4, 
        strokeOpacity: 1, 
        lineStyle: 'solid' 
    },
    { 
        id: 2, 
        fn: 'sin(x)', 
        latex: '\\sin\\left(x\\right)',
        color: plotColors[1], 
        fillEnabled: false, 
        fillOpacity: 0.3, 
        strokeWidth: 2, 
        strokeOpacity: 1, 
        lineStyle: 'solid' 
    },
    { 
        id: 3, 
        fn: 'a=1', 
        latex: 'a=1',
        color: plotColors[2], 
        fillEnabled: false, 
        fillOpacity: 0.3, 
        strokeWidth: 2, 
        strokeOpacity: 1, 
        lineStyle: 'solid' 
    }
];

// Rebuilt from the rows on every render:
let numberVars = {}; // a = 3        -> { a: 3 }
let listStore = {};  // A = [(1,1)]  -> { A: { kind: 'list', items: [[1,1]], points: true } }
let rowInfo = {};    // expression id -> what the row shows under it (slider, list chip, error...)
let activeExprIdForStyle = null;
let gridOn = true;
let focusedExprId = null; // the row you last clicked into
let currentMode = 'home';
const DEFAULT_LATEX = '\\int_{0}^{\\infty} x^2 e^{-x} dx = 2';
const SAVE_KEY = 'delta_workspace_v1';

// ==========================================
// SAVED WORKSPACE (this browser remembers your functions, formula and mode!)
// ==========================================
function workspaceData() {
    const latexEl = document.getElementById('latex-input');
    return {
        format: 'delta', version: 1,
        expressions: expressions,
        latex: latexEl ? latexEl.value : DEFAULT_LATEX,
        grid: gridOn,
        mode: currentMode
    };
}
function applyWorkspace(d) {
    if (!d || !Array.isArray(d.expressions) || !d.expressions.length) return false;
    expressions = d.expressions.map((e, i) => ({
        id: typeof e.id === 'number' ? e.id : Date.now() + i,
        fn: String(e.fn || ''), latex: String(e.latex !== undefined ? e.latex : e.fn || ''),
        color: e.color || plotColors[i % plotColors.length],
        fillEnabled: !!e.fillEnabled, fillOpacity: +e.fillOpacity || 0.3,
        strokeWidth: +e.strokeWidth || 2, strokeOpacity: e.strokeOpacity === undefined ? 1 : +e.strokeOpacity,
        lineStyle: ['solid', 'dashed', 'dotted'].includes(e.lineStyle) ? e.lineStyle : 'solid',
        slider: e.slider && typeof e.slider.min === 'number' ? { min: e.slider.min, max: e.slider.max } : undefined
    }));
    gridOn = d.grid !== false;
    const latexEl = document.getElementById('latex-input');
    if (latexEl && typeof d.latex === 'string') latexEl.value = d.latex;
    return true;
}
let saveTimer = 0;
function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(workspaceData())); } catch (e) {}
        if (window.OfficeShell) OfficeShell.flashSaved && OfficeShell.flashSaved('Saved!');
    }, 350);
}
(function loadSaved() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (applyWorkspace(d) || d) { /* mode is restored after the page loads */ window.__deltaMode = d.mode; window.__deltaLatex = d.latex; }
    } catch (e) {}
})();

// ==========================================
// NAVIGATION & MODE SWITCHER
// ==========================================
function switchMode(modeId) {
    currentMode = modeId;
    persist();
    if (window.OfficeShell) OfficeShell.sync();
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const selectedPanel = document.getElementById(`panel-${modeId}`);
    if (selectedPanel) selectedPanel.classList.add('active');

    const navButtons = document.querySelectorAll('.nav-btn');
    const modeIndex = ['home', 'graph', 'latex', 'calc'].indexOf(modeId);
    if (modeIndex !== -1 && navButtons[modeIndex]) {
        navButtons[modeIndex].classList.add('active');
    }

    if (modeId === 'graph') {
        setTimeout(renderGraph, 50);
    } else if (modeId === 'latex') {
        renderLaTeX();
    }
}

function updateExpression(id, value, latex) {
    const target = expressions.find(e => e.id === id);
    if (target) {
        target.fn = value;
        if (latex !== undefined) target.latex = latex;
        renderGraph();
    }
}

function addExpressionRow() {
    const newId = Date.now();
    const nextColor = plotColors[expressions.length % plotColors.length];
    expressions.push({ 
        id: newId, 
        fn: '', 
        latex: '',
        color: nextColor, 
        fillEnabled: false, 
        fillOpacity: 0.3, 
        strokeWidth: 2, 
        strokeOpacity: 1, 
        lineStyle: 'solid' 
    });
    renderExpressionRows();
    renderGraph();
    focusedExprId = newId; // the new function is the one the symbol keyboard types into
    if (mathFields[newId]) mathFields[newId].focus();
}

function removeExpressionRow(id) {
    if (expressions.length <= 1) return;
    expressions = expressions.filter(e => e.id !== id);
    renderExpressionRows();
    renderGraph();
}

// ==========================================
// DEFINITIONS: NUMBERS (SLIDERS), LISTS & SETS
// ==========================================
const PLAIN_NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)$/;

// "a = 3", "b = 3 + a", "A = [1,2]", "S = {0,1}" -> { name, rhs }. x and y are kept for functions.
function definitionOf(fn) {
    const match = (fn || '').match(/^\s*([a-zA-Z])\s*=\s*(.*)$/);
    if (!match || match[1] === 'x' || match[1] === 'y') return null;
    return { name: match[1], rhs: match[2].trim() };
}

// Split "1,(2,3),[4,5]" at top-level commas only
function splitTopLevel(str) {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if ('([{'.includes(c)) depth++;
        else if (')]}'.includes(c)) depth--;
        else if (c === ',' && depth === 0) {
            parts.push(str.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(str.slice(start));
    return parts.map(p => p.trim());
}

function evalNumber(expr, scope) {
    if (!expr.trim()) throw new Error('empty');
    const value = functionPlot.$eval.builtIn({ fn: normalizeMathNames(expr) }, 'fn', { ...scope });
    if (typeof value !== 'number' || !isFinite(value)) throw new Error('not a number');
    return value;
}

// "[1,2,3]", "[(1,1),(2,1)]" or "{0,1,2}" -> { kind, items, points }
function evalCollection(rhs, scope) {
    const isSet = rhs[0] === '{';
    const close = isSet ? '}' : ']';
    if (rhs[rhs.length - 1] !== close) throw new Error(isSet ? 'Close the set with }' : 'Close the list with ]');
    const inner = rhs.slice(1, -1).trim();
    let items = (inner ? splitTopLevel(inner) : []).map(part => {
        const point = part.match(/^\((.*)\)$/);
        if (point) {
            const xy = splitTopLevel(point[1]);
            if (xy.length === 2) return [evalNumber(xy[0], scope), evalNumber(xy[1], scope)];
        }
        return evalNumber(part, scope);
    });
    const pointCount = items.filter(Array.isArray).length;
    if (pointCount && pointCount !== items.length) throw new Error('Use all numbers or all points, not both');
    if (isSet) {
        // Sets keep each element once
        const seen = new Set();
        items = items.filter(item => {
            const key = JSON.stringify(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    return { kind: isSet ? 'set' : 'list', items, points: pointCount > 0 };
}

const undefinedSymbol = err => ((err && err.message || '').match(/symbol "([^"]+)" is undefined/) || [])[1];

function explainDefinitionError(err, name, defs, pendingErrors) {
    const sym = undefinedSymbol(err);
    if (!sym) return err && /^Close|^Use all/.test(err.message) ? err.message : `${name} isn't a number yet`;
    if (sym === name) return `${name} can't be defined using itself`;
    if (sym === 'x' || sym === 'y') return `${name} must be a number, so it can't use ${sym}`;
    const other = defs.find(d => d.name === sym);
    if (!other) return `${sym} is not defined`;
    if (/^[\[{]/.test(other.rhs)) return `${sym} is a ${other.rhs[0] === '[' ? 'list' : 'set'}, not a number`;
    if (undefinedSymbol(pendingErrors[sym]) === name) return `${name} and ${sym} depend on each other`;
    return `${sym} can't be worked out yet`;
}

// Work out every definition row, in whatever order they depend on each other
function evaluateDefinitions() {
    numberVars = {};
    listStore = {};
    rowInfo = {};

    const defs = [];
    expressions.forEach(e => {
        const def = definitionOf(e.fn);
        if (!def) return;
        if (!def.rhs) return; // still typing
        if (defs.some(d => d.name === def.name)) {
            rowInfo[e.id] = { kind: 'error', msg: `${def.name} is already defined above` };
            return;
        }
        defs.push({ expr: e, ...def });
    });

    const isCollection = d => /^[\[{]/.test(d.rhs);
    let pending = defs.filter(d => !isCollection(d));
    const errors = {};
    let progressed = true;
    while (pending.length && progressed) {
        progressed = false;
        pending = pending.filter(d => {
            try {
                const value = evalNumber(d.rhs, numberVars);
                numberVars[d.name] = value;
                rowInfo[d.expr.id] = { kind: 'number', name: d.name, value, literal: PLAIN_NUMBER_RE.test(d.rhs) };
                progressed = true;
                return false;
            } catch (err) {
                errors[d.name] = err;
                return true;
            }
        });
    }
    pending.forEach(d => {
        rowInfo[d.expr.id] = { kind: 'error', msg: explainDefinitionError(errors[d.name], d.name, defs, errors) };
    });

    defs.filter(isCollection).forEach(d => {
        try {
            listStore[d.name] = evalCollection(d.rhs, numberVars);
            rowInfo[d.expr.id] = { kind: 'collection', name: d.name, coll: listStore[d.name] };
        } catch (err) {
            rowInfo[d.expr.id] = { kind: 'error', msg: explainDefinitionError(err, d.name, defs, errors) };
        }
    });
}

const formatNumber = v => String(parseFloat(v.toPrecision(6)));
const formatItem = item => Array.isArray(item) ? `(${item.map(formatNumber).join(', ')})` : formatNumber(item);

// Slider range grows to fit the value (e.g. a = 37 -> -100..100)
function sliderRangeFor(expr, value) {
    const range = expr.slider || (expr.slider = { min: -10, max: 10 });
    while (value > range.max) range.max *= 10;
    while (value < range.min) range.min *= 10;
    range.min = Math.min(range.min, -range.max);
    range.max = Math.max(range.max, -range.min);
    return { ...range, step: Math.pow(10, Math.floor(Math.log10(range.max - range.min)) - 2) };
}

// Draw the slider / value / list chip / error under each row
function updateRowExtras() {
    expressions.forEach(expr => {
        const el = document.getElementById(`expr-extra-${expr.id}`);
        if (!el) return;
        const info = rowInfo[expr.id];
        const kind = !info ? 'none' : info.kind === 'number' ? (info.literal ? 'slider' : 'value') : info.kind;
        el.hidden = kind === 'none';

        if (kind === 'slider' || kind === 'value') {
            const range = sliderRangeFor(expr, info.value);
            if (el.dataset.kind !== kind) {
                el.innerHTML = `
                    <div class="expr-slider-row">
                        <span class="expr-slider-bound" data-bound="min"></span>
                        <input type="range" class="expr-slider" aria-label="${info.name} slider">
                        <span class="expr-slider-bound" data-bound="max"></span>
                    </div>
                    <div class="expr-computed"></div>`;
                const slider = el.querySelector('.expr-slider');
                slider.addEventListener('input', () => onRowSliderInput(expr.id, slider.value));
            }
            const slider = el.querySelector('.expr-slider');
            slider.min = range.min;
            slider.max = range.max;
            slider.step = range.step;
            slider.disabled = kind === 'value';
            if (parseFloat(slider.value) !== info.value) slider.value = info.value;
            el.querySelector('[data-bound="min"]').textContent = formatNumber(range.min);
            el.querySelector('[data-bound="max"]').textContent = formatNumber(range.max);
            el.querySelector('.expr-computed').textContent = kind === 'value' ? `${info.name} = ${formatNumber(info.value)}` : '';
            el.querySelector('.expr-computed').hidden = kind !== 'value';
        } else if (kind === 'collection') {
            const { coll } = info;
            const count = coll.items.length;
            const what = coll.kind === 'set'
                ? `Set · ${count} element${count === 1 ? '' : 's'}`
                : `List · ${count} ${coll.points ? 'point' : 'number'}${count === 1 ? '' : 's'}`;
            const open = coll.kind === 'set' ? '{' : '[';
            const close = coll.kind === 'set' ? '}' : ']';
            let preview = coll.items.slice(0, 8).map(formatItem).join(', ');
            if (count > 8) preview += ', …';
            el.innerHTML = `<span class="expr-chip expr-chip-${coll.kind}"></span><span class="expr-chip-preview"></span>`;
            el.firstChild.textContent = what;
            el.lastChild.textContent = `${info.name} = ${open}${preview}${close}`;
        } else if (kind === 'polygon') {
            el.innerHTML = `<span class="expr-chip expr-chip-polygon"></span>`;
            el.firstChild.textContent = `Polygon · ${info.n} vertices`;
        } else if (kind === 'error') {
            el.innerHTML = `<span class="expr-error"><svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/></svg><span></span></span>`;
            el.firstChild.lastChild.textContent = info.msg;
            if (info.addVar) {
                const btn = document.createElement('button');
                btn.className = 'expr-add-slider-btn';
                btn.textContent = `+ slider for ${info.addVar}`;
                btn.addEventListener('click', () => addSliderRow(info.addVar));
                el.appendChild(btn);
            }
        } else {
            el.innerHTML = '';
        }
        el.dataset.kind = kind;
    });
}

// Dragging a row's slider rewrites that row, e.g. "a=1" -> "a=2.4"
function onRowSliderInput(id, rawValue) {
    const expr = expressions.find(e => e.id === id);
    const info = rowInfo[id];
    if (!expr || !info || info.kind !== 'number') return;
    const text = `${info.name}=${formatNumber(parseFloat(rawValue))}`;
    expr.fn = text;
    expr.latex = text;
    const mathField = mathFields[id];
    if (mathField) {
        suppressMathEdit = true;
        mathField.latex(text);
        suppressMathEdit = false;
    }
    renderGraph();
}

function addSliderRow(name) {
    addExpressionRow();
    const expr = expressions[expressions.length - 1];
    expr.fn = `${name}=1`;
    expr.latex = `${name}=1`;
    renderExpressionRows();
    renderGraph();
}

// ==========================================
// STYLE POPOVER & MUTATION HANDLERS
// ==========================================
function openStylePopover(event, id) {
    event.stopPropagation();
    activeExprIdForStyle = id;
    const targetExpr = expressions.find(e => e.id === id);
    if (!targetExpr) return;

    const popover = document.getElementById('expr-style-popover');
    const badgeRect = event.target.getBoundingClientRect();
    const parentRect = document.querySelector('.graph-workspace').getBoundingClientRect();

    popover.style.top = `${badgeRect.bottom - parentRect.top + 8}px`;
    popover.style.left = `${badgeRect.left - parentRect.left}px`;

    document.getElementById('popover-color-input').value = targetExpr.color;
    document.getElementById('popover-fill-enable').checked = targetExpr.fillEnabled;
    document.getElementById('popover-opacity-input').value = targetExpr.fillOpacity;
    document.getElementById('popover-stroke-width').value = targetExpr.strokeWidth;
    document.getElementById('popover-stroke-opacity').value = targetExpr.strokeOpacity;
    document.getElementById('popover-line-style').value = targetExpr.lineStyle;

    popover.classList.remove('hidden');
}

function updateActiveExprColor(color) {
    if (!activeExprIdForStyle) return;
    const expr = expressions.find(e => e.id === activeExprIdForStyle);
    if (expr) {
        expr.color = color;
        renderExpressionRows();
        renderGraph();
    }
}

function applyPresetColor(color) {
    const colorInput = document.getElementById('popover-color-input');
    if (colorInput) colorInput.value = color;
    updateActiveExprColor(color);
}

function toggleActiveExprFill(enabled) {
    if (!activeExprIdForStyle) return;
    const expr = expressions.find(e => e.id === activeExprIdForStyle);
    if (expr) {
        expr.fillEnabled = enabled;
        renderGraph();
    }
}

function updateActiveExprFillOpacity(opacity) {
    if (!activeExprIdForStyle) return;
    const expr = expressions.find(e => e.id === activeExprIdForStyle);
    if (expr) {
        expr.fillOpacity = parseFloat(opacity);
        if (expr.fillOpacity > 0 && !expr.fillEnabled) {
            expr.fillEnabled = true;
            const fillCheckbox = document.getElementById('popover-fill-enable');
            if (fillCheckbox) fillCheckbox.checked = true;
        }
        renderGraph();
    }
}

function updateActiveExprStrokeWidth(width) {
    if (!activeExprIdForStyle) return;
    const expr = expressions.find(e => e.id === activeExprIdForStyle);
    if (expr) {
        expr.strokeWidth = parseInt(width);
        renderGraph();
    }
}

function updateActiveExprStrokeOpacity(opacity) {
    if (!activeExprIdForStyle) return;
    const expr = expressions.find(e => e.id === activeExprIdForStyle);
    if (expr) {
        expr.strokeOpacity = parseFloat(opacity);
        renderGraph();
    }
}

function updateActiveExprLineStyle(style) {
    if (!activeExprIdForStyle) return;
    const expr = expressions.find(e => e.id === activeExprIdForStyle);
    if (expr) {
        expr.lineStyle = style;
        renderGraph();
    }
}

// Dismiss style popover when clicking outside
document.addEventListener('click', (e) => {
    const popover = document.getElementById('expr-style-popover');
    if (popover && !popover.contains(e.target) && !e.target.classList.contains('expr-color-badge')) {
        popover.classList.add('hidden');
    }
});

// ==========================================
// NATIVE FUNCTION-PLOT POLYGON & STYLING ENGINE
// ==========================================
let instance = null;

// Expression shown by each entry in the plot's data array (function-plot draws entry N as path.line-N)
let plottedExprs = [];

function applyCustomStyles() {
    const svg = d3.select('#plotter svg');
    if (svg.empty() || !instance) return;

    plottedExprs.forEach((expr, index) => {
        let dashArray = 'none';
        if (expr.lineStyle === 'dashed') dashArray = `${expr.strokeWidth * 4},${expr.strokeWidth * 2}`;
        if (expr.lineStyle === 'dotted') dashArray = `0,${expr.strokeWidth * 2}`;

        svg.selectAll(`path.line-${index}`)
            .style('stroke', expr.color)
            .style('stroke-width', `${expr.strokeWidth}px`)
            .style('stroke-opacity', expr.strokeOpacity)
            .style('stroke-dasharray', dashArray)
            .style('stroke-linecap', expr.lineStyle === 'dotted' ? 'round' : 'butt')
            .style('fill', expr.fillEnabled ? expr.color : 'none')
            .style('fill-opacity', expr.fillEnabled ? expr.fillOpacity : 0);
    });
}

// Flipped functions are sampled over y, so after a zoom or pan, re-sample them over what's visible
function refitFlippedRanges() {
    if (!instance) return;
    const [lo, hi] = instance.meta.yScale.domain();
    const span = hi - lo;
    instance.options.data.forEach(datum => {
        if (datum.fnType !== 'parametric') return;
        const [rLo, rHi] = datum.range;
        const covers = rLo <= lo && rHi >= hi;
        const tooCoarse = rHi - rLo > span * 6; // zoomed far in: sample more densely
        if (!covers || tooCoarse) datum.range = [lo - span, hi + span];
    });
}

// "y = ..." and "f(x) = ..." define the function on the right-hand side
function functionBody(raw) {
    const match = raw.match(/^\s*(?:y|[a-zA-Z]\s*\(\s*x\s*\))\s*=\s*(.+)$/);
    return match ? match[1] : null;
}

// "x = ..." and "g(y) = ..." are flipped functions of y
function flippedFunctionBody(raw) {
    const match = raw.match(/^\s*(?:x|[a-zA-Z]\s*\(\s*y\s*\))\s*=\s*(.+)$/);
    return match ? match[1] : null;
}

// Can function-plot draw this? true, or a message for the row (null = still typing, say nothing).
// (Half-typed input like "sin()" doesn't throw, it just returns NaN everywhere and breaks the plot.)
// input is the variable the function uses: x normally, y for flipped functions.
function checkPlottableFn(fn, input = 'x') {
    try {
        const ok = [-2.3, -0.7, 0.5, 1.7, 3.1].some(v => {
            const out = functionPlot.$eval.builtIn({ fn }, 'fn', { [input]: v });
            return typeof out === 'number' && isFinite(out);
        });
        return ok || null;
    } catch (err) {
        const sym = undefinedSymbol(err);
        if (!sym) return null;
        if (sym === 'x' && input === 'y') return { msg: 'x = … can only use y (it\'s a flipped function)' };
        if (sym === 'y' && input === 'x') return { msg: 'y = … can only use x (try x = … for a function of y)' };
        if (listStore[sym]) return { msg: `${sym} is a ${listStore[sym].kind}; use polygon(${sym}) to draw points` };
        if (/^[a-zA-Z]$/.test(sym)) return { msg: `${sym} is not defined`, addVar: sym };
        return { msg: `${sym} is not defined` };
    }
}

function polygonPoints(inner) {
    const name = inner.trim();
    if (/^[a-zA-Z]$/.test(name)) {
        const coll = listStore[name];
        if (!coll) throw new Error(`${name} is not defined`);
        if (!coll.points) throw new Error(`polygon needs points, like ${name} = [(0,0),(1,0),(1,1)]`);
        return coll.items.map(p => [...p]);
    }
    // polygon((0,0),(1,0),(1,1)) or polygon([(0,0),...])
    const body = /^[\[{].*[\]}]$/.test(name) ? name : `[${name}]`;
    const coll = evalCollection(body, numberVars);
    if (!coll.points) throw new Error('polygon needs points, like polygon((0,0),(1,0),(1,1))');
    return coll.items;
}

function renderGraph() {
    const plotterEl = document.getElementById('plotter');
    if (!plotterEl) return;

    const funcData = [];
    plottedExprs = [];
    persist();
    evaluateDefinitions();

    expressions.forEach(e => {
        if (!e.fn || definitionOf(e.fn)) return; // definitions don't draw anything themselves
        let src = e.fn.trim();

        let flipped = false;
        if (src.includes('=')) {
            const body = functionBody(src);
            const flippedBody = body ? null : flippedFunctionBody(src);
            if (!body && !flippedBody) {
                rowInfo[e.id] = { kind: 'error', msg: 'Try y = …, f(x) = … or x = … to graph this' };
                return;
            }
            flipped = !!flippedBody;
            src = (body || flippedBody).trim();
        }

        const polygon = src.match(/^polygon\s*\((.*)\)$/i);
        if (polygon) {
            try {
                const points = polygonPoints(polygon[1]);
                if (points.length < 2) throw new Error('polygon needs at least 2 points');
                rowInfo[e.id] = { kind: 'polygon', n: points.length };
                points.push([...points[0]]);
                funcData.push({
                    points: points,
                    fnType: 'points',
                    graphType: 'polyline',
                    color: e.color
                });
                plottedExprs.push(e);
            } catch (err) {
                const sym = undefinedSymbol(err);
                rowInfo[e.id] = { kind: 'error', msg: sym ? `${sym} is not defined` : err.message };
            }
        } else if (flipped && !/[\[{]/.test(src)) {
            // x = f(y): drawn as the curve (f(t), t), sampled over the visible y range
            const fn = normalizeMathNames(substituteVariables(src));
            const check = checkPlottableFn(fn, 'y');
            if (check !== true) {
                if (check) rowInfo[e.id] = { kind: 'error', ...check };
                return;
            }
            funcData.push({
                fnType: 'parametric',
                x: fn.replace(/\by\b/g, 't'),
                y: 't',
                range: [-10, 10],
                sampler: 'builtIn',
                graphType: 'polyline',
                nSamples: 1000,
                color: e.color
            });
            plottedExprs.push(e);
        } else if (!/^polygon/i.test(src) && !/[\[{]/.test(src)) {
            // Drawn as real lines (not interval boxes) so width, opacity and dashes apply.
            const fn = normalizeMathNames(substituteVariables(src));
            const check = checkPlottableFn(fn);
            if (check !== true) {
                if (check) rowInfo[e.id] = { kind: 'error', ...check };
                return; // Unfinished or unknown: skip it, keep the rest
            }
            funcData.push({
                fn: fn,
                sampler: 'builtIn',
                graphType: 'polyline',
                nSamples: 1000,
                color: e.color
            });
            plottedExprs.push(e);
        }
    });

    // function-plot draws entry 0 first (at the bottom), so reverse them: the function at the top of the list is drawn on top!
    funcData.reverse();
    plottedExprs.reverse();

    updateRowExtras();
    if (!plotterEl.offsetWidth) return; // Graph mode isn't open yet

    try {
        instance = functionPlot({
            target: '#plotter',
            width: plotterEl.offsetWidth,
            height: plotterEl.offsetHeight || 450,
            grid: gridOn,
            ...(viewDomain ? { xAxis: { domain: viewDomain.x }, yAxis: { domain: viewDomain.y } } : {}),
            data: funcData.length > 0 ? funcData : [{ fn: '0', sampler: 'builtIn', graphType: 'polyline', color: 'transparent' }]
        });

        // Zooming and panning redraw the plot: re-sample flipped functions first, then restyle
        instance.on('before:draw', refitFlippedRanges);
        instance.on('after:draw', applyCustomStyles);
        refitFlippedRanges();
        instance.draw();
        
    } catch (e) {
        console.error("Function Plot Error:", e);
    }
}

// ==========================================
// LATEX LIVE RENDERER
// ==========================================
function renderLaTeX() {
    const inputEl = document.getElementById('latex-input');
    const target = document.getElementById('latex-render-target');
    if (!inputEl || !target) return;

    try {
        katex.render(inputEl.value, target, {
            throwOnError: false,
            displayMode: true
        });
    } catch (e) {
        target.innerText = "LaTeX Rendering Error";
    }
}

// ==========================================
// CALCULATOR LOGIC
// ==========================================
let calcExpr = "0";

function updateCalcDisplay() {
    const display = document.getElementById('calc-display');
    if (display) display.value = calcExpr;
}

function appendCalc(val) {
    if (calcExpr === "0" && val !== ".") {
        calcExpr = val;
    } else {
        calcExpr += val;
    }
    updateCalcDisplay();
}

function clearCalc() {
    calcExpr = "0";
    updateCalcDisplay();
}

function backCalc() {
    calcExpr = calcExpr.length > 1 && calcExpr !== 'Error' ? calcExpr.slice(0, -1) : '0';
    updateCalcDisplay();
}

function calcKey(e) {
    if (currentMode !== 'calc' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) && e.target.id !== 'calc-display') return;
    const k = e.key;
    if (/^[0-9.()+\-*\/]$/.test(k)) appendCalc(k);
    else if (k === 'Enter' || k === '=') { e.preventDefault(); solveCalc(); }
    else if (k === 'Backspace') backCalc();
    else if (k === 'Escape' || k === 'c' || k === 'C') clearCalc();
    else return;
}

function solveCalc() {
    try {
        const sanitized = calcExpr.replace(/[^0-9+\-*/().]/g, '');
        calcExpr = String(Function(`'use strict'; return (${sanitized})`)());
    } catch (e) {
        calcExpr = "Error";
    }
    updateCalcDisplay();
}

// ==========================================
// INITIALIZATION ON DOM LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const latexInput0 = document.getElementById('latex-input');
    if (latexInput0 && typeof window.__deltaLatex === 'string') latexInput0.value = window.__deltaLatex;
    renderExpressionRows();
    renderGraph();
    
    const latexInput = document.getElementById('latex-input');
    if (latexInput) {
        latexInput.addEventListener('input', () => { renderLaTeX(); persist(); if (window.OfficeShell) OfficeShell.sync(); });
    }
    if (window.__deltaMode && window.__deltaMode !== 'home') switchMode(window.__deltaMode);
    let resizeT = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (currentMode === 'graph') renderGraph(); }, 150); });
    document.addEventListener('keydown', calcKey);
    const listEl = document.getElementById('expressions-list');
    if (listEl) {
        listEl.addEventListener('focusin', (ev) => {
            const row = ev.target.closest('.expr-row');
            if (row) focusedExprId = +row.dataset.id;
        });
        listEl.addEventListener('keydown', (ev) => {
            if (!ev.altKey || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
            const row = ev.target.closest('.expr-row');
            if (!row) return;
            ev.preventDefault();
            const id = +row.dataset.id;
            moveExpression(id, expressions.findIndex(e => e.id === id) + (ev.key === 'ArrowUp' ? -1 : 1));
            setTimeout(() => { if (mathFields[id]) mathFields[id].focus(); }, 0);
        });
    }
});

const MQ = MathQuill.getInterface(2);

// Function names MathQuill turns into \name as you type them
const MQ_FN_NAMES = 'sin cos tan sec csc cot arcsin arccos arctan sinh cosh tanh ln log exp abs floor ceil sign min max polygon';

const mathFields = {};          // expression id -> MathQuill field
let suppressMathEdit = false;   // true while code (not the user) rewrites a field

function renderExpressionRows() {
    const listEl = document.getElementById('expressions-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';

    expressions.forEach((expr) => {
        const row = document.createElement('div');
        row.className = 'expr-row';
        row.dataset.id = expr.id;
        row.innerHTML = `
            <span class="expr-grip" title="Drag to reorder (the top function is drawn on top!)"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>
            <span class="expr-color-badge" style="background: ${expr.color}" onclick="openStylePopover(event, ${expr.id})"></span>
            <span id="mq-input-${expr.id}" class="mq-math-field" style="flex: 1; border: none; padding: 4px;"></span>
            ${expressions.length > 1 ? `<button class="expr-remove-btn" title="Remove" onclick="removeExpressionRow(${expr.id})"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}
            <div id="expr-extra-${expr.id}" class="expr-extra" hidden></div>
        `;
        listEl.appendChild(row);
        row.querySelector('.expr-grip').addEventListener('pointerdown', (ev) => startRowDrag(ev, row));

        const mathFieldEl = document.getElementById(`mq-input-${expr.id}`);
        const mathField = MQ.MathField(mathFieldEl, {
            autoCommands: 'pi sqrt',
            autoOperatorNames: MQ_FN_NAMES
        });
        mathField.latex(expr.latex !== undefined ? expr.latex : expr.fn);
        mathFields[expr.id] = mathField;
        // Attach the edit handler after filling the field so loading it doesn't count as an edit
        mathField.config({
            handlers: {
                edit: function(mf) {
                    if (suppressMathEdit) return;
                    const rawLatex = mf.latex();
                    updateExpression(expr.id, convertLatexToMath(rawLatex), rawLatex);
                }
            }
        });
    });
}

// LaTeX command -> function name the plotter knows
const LATEX_FN_MAP = {
    sin: 'sin', cos: 'cos', tan: 'tan',
    arcsin: 'asin', arccos: 'acos', arctan: 'atan',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
    ln: 'log', log: 'log10', exp: 'exp',
    abs: 'abs', floor: 'floor', ceil: 'ceil', sign: 'sign',
    min: 'min', max: 'max'
};
// Reciprocal trig functions the plotter lacks
const LATEX_RECIP_MAP = { sec: 'cos', csc: 'sin', cot: 'tan' };

// Turn MathQuill LaTeX (e.g. "\sin\left(2x\right)+\frac{1}{x}") into plain math ("sin(2x)+((1)/(x))")
function convertLatexToMath(latex) {
    const src = (latex || '').replace(/\$/g, '').replace(/\\operatorname\{([a-zA-Z]+)\}/g, '\\$1');
    let i = 0;

    const skipSpaces = () => { while (src[i] === ' ') i++; };

    // A {braced group} or a single token
    const readGroup = () => {
        skipSpaces();
        if (src[i] === '{') {
            i++;
            const out = parse('}');
            i++;
            return out;
        }
        if (src[i] === '\\') {
            const m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
            i += m[0].length;
            return command(m[1]);
        }
        return src[i++] || '';
    };

    // Argument of "\sin": "(...)" or a bare term like "2x" / "\pi"
    const readFnArg = () => {
        skipSpaces();
        if (src.startsWith('\\left(', i)) { i += 6; const out = parse(')'); i++; return out; }
        if (src[i] === '(') { i++; const out = parse(')'); i++; return out; }
        let out = '';
        while (i < src.length && /[0-9.]/.test(src[i])) out += src[i++];
        if (src[i] === '\\') out += readGroup();
        else if (/[a-zA-Z]/.test(src[i] || '')) out += src[i++];
        return out;
    };

    function command(name) {
        if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
            const num = readGroup();
            const den = readGroup();
            return `((${num})/(${den}))`;
        }
        if (name === 'sqrt') {
            let index = null;
            if (src[i] === '[') { i++; index = parse(']'); i++; }
            const radicand = readGroup();
            return index ? `nthRoot(${radicand},${index})` : `sqrt(${radicand})`;
        }
        if (name === 'left') {
            if (src[i] === '|') { i++; const out = parse('|'); i++; return `abs(${out})`; }
            if (src.startsWith('\\{', i)) { i += 2; return '{'; }
            return ''; // the delimiter itself follows
        }
        if (name === 'right') {
            if (src.startsWith('\\}', i)) { i += 2; return '}'; }
            return '';
        }
        if (LATEX_FN_MAP[name] || LATEX_RECIP_MAP[name]) {
            // "\sin^2 x" means (sin(x))^2
            let power = null;
            skipSpaces();
            if (src[i] === '^') { i++; power = readGroup(); }
            const arg = readFnArg();
            const call = LATEX_RECIP_MAP[name] ? `(1/${LATEX_RECIP_MAP[name]}(${arg}))` : `${LATEX_FN_MAP[name]}(${arg})`;
            return ' ' + (power ? `(${call})^(${power})` : call) + ' ';
        }
        if (name === 'cdot' || name === 'times' || name === 'ast') return '*';
        if (name === 'div') return '/';
        if (name === 'pi') return ' PI ';
        if (name === '{') return '{'; // \{ \} are set braces
        if (name === '}') return '}';
        if (name === ' ' || name === ',' || name === ';' || name === ':' || name === '!') return ' ';
        return name;
    }

    function parse(end) {
        let out = '';
        while (i < src.length && src[i] !== end) {
            const c = src[i];
            if (c === '\\') {
                const m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
                i += m[0].length;
                out += command(m[1]);
            } else if (c === '^') {
                i++;
                out += `^(${readGroup()})`;
            } else if (c === '{') {
                i++;
                out += `(${parse('}')})`;
                i++;
            } else if (c === '(') {
                i++;
                out += `(${parse(')')})`;
                i++;
            } else if (c === '|') {
                i++;
                out += `abs(${parse('|')})`;
                i++;
            } else {
                out += c;
                i++;
                // MathQuill letters are single-letter variables: "ax" means a·x
                if (/[a-zA-Z]/.test(c) && /[a-zA-Z]/.test(src[i] || '')) out += ' ';
            }
        }
        return out;
    }

    return parse(null)
        .replace(/\s+/g, ' ')
        .replace(/\s*([()+\-*/^,=])\s*/g, '$1')
        .trim();
}

// Spell constants and functions the way the plotter expects
function normalizeMathNames(fnStr) {
    return fnStr
        .replace(/(?<![a-zA-Z_])pi(?![a-zA-Z_(])/g, 'PI')
        .replace(/(?<![a-zA-Z_])e(?![a-zA-Z_(])/g, 'E')
        .replace(/(?<![a-zA-Z_])ln(?=\s*\()/g, 'log')
        .replace(/(?<![a-zA-Z_])arc(sin|cos|tan)(?=\s*\()/g, 'a$1');
}

function preprocessFractionalExponents(fnStr) {
    if (!fnStr) return '';

    let cleaned = fnStr;

    cleaned = cleaned.replace(/\^{?([0-9.]+)\/([0-9.]+)}?/g, '^($1/$2)');

    cleaned = cleaned.replace(/([a-zA-Z0-9_()]+)\^\(\(?([0-9.]+)\)?\/\(?([0-9.]+)\)?\)/g, (match, base, num, den) => {
        const n = parseFloat(num);
        const d = parseFloat(den);

        if (!isNaN(n) && !isNaN(d)) {
            return `((abs(${base}))^(1/${d}))^${n}`;
        }
        return match;
    });

    return cleaned;
}

function substituteVariables(fnStr) {
    if (!fnStr) return '';
    let substituted = fnStr.replace(/\$/g, '').trim();

    Object.entries(numberVars).forEach(([name, value]) => {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        substituted = substituted.replace(regex, `(${value})`);
    });

    substituted = preprocessFractionalExponents(substituted);

    return substituted;
}

// ==========================================
// THE DELTA API (the ribbon in office.js uses these!)
// ==========================================
let viewDomain = null; // { x: [lo, hi], y: [lo, hi] } while zoomed by the ribbon, null = the default view
function zoomGraph(factor) {
    if (!instance) return;
    const xs = instance.meta.xScale.domain(), ys = instance.meta.yScale.domain();
    const cx = (xs[0] + xs[1]) / 2, cy = (ys[0] + ys[1]) / 2;
    const hx = (xs[1] - xs[0]) / 2 * factor, hy = (ys[1] - ys[0]) / 2 * factor;
    viewDomain = { x: [cx - hx, cx + hx], y: [cy - hy, cy + hy] };
    renderGraph();
}
function resetView() { viewDomain = null; renderGraph(); }
function toggleGrid() { gridOn = !gridOn; renderGraph(); }

function nextFreeLetter() {
    const used = new Set(expressions.map(e => (definitionOf(e.fn) || {}).name).filter(Boolean));
    return 'abcdefghijklmnopqrstuvw'.split('').find(c => !used.has(c)) || 'a';
}

// Draw the graph as a picture: SVG text with the colors written into every shape
function graphSvgText() {
    const svg = document.querySelector('#plotter svg');
    if (!svg) return null;
    const clone = svg.cloneNode(true);
    const a = svg.querySelectorAll('*'), b = clone.querySelectorAll('*');
    const keys = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'font-size', 'font-family', 'opacity', 'shape-rendering'];
    a.forEach((el, i) => {
        const cs = getComputedStyle(el);
        keys.forEach(k => { const v = cs.getPropertyValue(k); if (v) b[i].style.setProperty(k, v); });
    });
    const w = svg.clientWidth || svg.getBoundingClientRect().width, h = svg.clientHeight || svg.getBoundingClientRect().height;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', w); clone.setAttribute('height', h);
    clone.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', w); bg.setAttribute('height', h); bg.setAttribute('fill', '#ffffff');
    clone.insertBefore(bg, clone.firstChild);
    return { text: new XMLSerializer().serializeToString(clone), w: w, h: h };
}
function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportGraph(kind) {
    const g = graphSvgText();
    if (!g) return false;
    if (kind === 'svg') { saveBlob(new Blob([g.text], { type: 'image/svg+xml' }), 'delta-graph.svg'); return true; }
    const img = new Image();
    img.onload = () => {
        const c = document.createElement('canvas');
        c.width = g.w * 2; c.height = g.h * 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(bl => bl && saveBlob(bl, 'delta-graph.png'), 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(g.text);
    return true;
}

// Files: a .delta file is the whole workspace as JSON
function exportWorkspace() {
    saveBlob(new Blob([JSON.stringify(workspaceData(), null, 2)], { type: 'application/json' }), 'workspace.delta');
}
function importWorkspaceText(text) {
    try {
        const d = JSON.parse(text);
        if (!applyWorkspace(d)) return false;
        renderExpressionRows(); renderGraph(); renderLaTeX();
        if (d.mode) switchMode(d.mode);
        persist();
        return true;
    } catch (e) { return false; }
}
function newWorkspace() {
    expressions = [{ id: Date.now(), fn: '', latex: '', color: plotColors[0], fillEnabled: false, fillOpacity: 0.3, strokeWidth: 2, strokeOpacity: 1, lineStyle: 'solid' }];
    gridOn = true;
    const latexEl = document.getElementById('latex-input');
    if (latexEl) latexEl.value = DEFAULT_LATEX;
    clearCalc();
    renderExpressionRows(); renderGraph(); renderLaTeX(); persist();
}

// LaTeX helpers
function insertLatex(snippet) {
    const t = document.getElementById('latex-input');
    if (!t) return;
    const a = t.selectionStart, b = t.selectionEnd;
    const chosen = t.value.slice(a, b);
    const text = snippet.replace('@', chosen || '');
    t.value = t.value.slice(0, a) + text + t.value.slice(b);
    const at = a + (snippet.indexOf('@') >= 0 && !chosen ? snippet.indexOf('@') : text.length);
    t.focus(); t.setSelectionRange(at, at);
    renderLaTeX(); persist();
}
function setLatex(text) {
    const t = document.getElementById('latex-input');
    if (t) { t.value = text; renderLaTeX(); persist(); }
}
function latexText() { const t = document.getElementById('latex-input'); return t ? t.value : ''; }

window.Delta = {
    mode: () => currentMode, switchMode, addExpressionRow, addSliderRow, nextFreeLetter, removeExpressionRow,
    expressions: () => expressions, renderGraph, zoomGraph, resetView, toggleGrid, grid: () => gridOn,
    exportGraph, exportWorkspace, importWorkspaceText, newWorkspace,
    insertLatex, setLatex, latexText, clearCalc, backCalc, appendCalc, solveCalc, calc: () => calcExpr,
    moveExpression, focusedId: () => focusedExprId, workspaceData, instance: () => instance
};


// ==========================================
// REORDERING (the function at the top of the list is drawn on top of the others!)
// ==========================================
function moveExpression(id, to) {
    const from = expressions.findIndex(e => e.id === id);
    if (from < 0) return false;
    to = Math.max(0, Math.min(expressions.length - 1, to));
    if (to === from) return false;
    const [item] = expressions.splice(from, 1);
    expressions.splice(to, 0, item);
    renderExpressionRows();
    renderGraph();
    return true;
}

// Drag a row by its grip: the row follows the pointer through the list, and the graph redraws when it lands
function startRowDrag(ev, row) {
    if (ev.button > 0) return;
    ev.preventDefault();
    const list = row.parentNode;
    row.classList.add('dragging');
    list.classList.add('dragging-list');
    const move = (e) => {
        const others = Array.from(list.children).filter(r => r !== row);
        let before = null;
        for (const r of others) {
            const b = r.getBoundingClientRect();
            if (e.clientY < b.top + b.height / 2) { before = r; break; }
        }
        if (before !== row.nextSibling) list.insertBefore(row, before);
        // scroll the list when the pointer nears its edge
        const box = list.parentNode.getBoundingClientRect();
        if (e.clientY < box.top + 24) list.parentNode.scrollTop -= 12;
        else if (e.clientY > box.bottom - 24) list.parentNode.scrollTop += 12;
    };
    const end = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', end);
        document.removeEventListener('pointercancel', end);
        row.classList.remove('dragging');
        list.classList.remove('dragging-list');
        const byId = new Map(expressions.map(e => [e.id, e]));
        const next = Array.from(list.children).map(r => byId.get(+r.dataset.id)).filter(Boolean);
        if (next.length === expressions.length && next.some((e, i) => e !== expressions[i])) {
            expressions = next;
            renderExpressionRows();
            renderGraph();
        }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
}
