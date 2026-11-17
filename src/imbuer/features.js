// features.js — Imbuer's bigger features: conditional formatting, charts,
// sparklines, sorting & filtering, notes, data tools, style galleries,
// freeze panes and templates! (Loaded after app.js and ribbon.js.)

// ==========================================
// CONDITIONAL FORMATTING
// ==========================================
const CF_PRESETS = {
    red: { label: 'Light Red Fill with Dark Red Text', fill: '#ffc7ce', color: '#9c0006' },
    yellow: { label: 'Yellow Fill with Dark Yellow Text', fill: '#ffeb9c', color: '#9c5700' },
    green: { label: 'Green Fill with Dark Green Text', fill: '#c6efce', color: '#006100' },
    lightRed: { label: 'Light Red Fill', fill: '#ffc7ce' },
    redText: { label: 'Red Text', color: '#c00000' },
    boldBlue: { label: 'Bold Blue Text', color: '#1f4e9a', b: true },
};
const CF_BARS = { Blue: '#638ec6', Green: '#63be7b', Red: '#f8696b', Orange: '#ffb628', 'Light Blue': '#5a8ac6', Purple: '#b17ed8' };
const CF_SCALES = {
    'Green - Yellow - Red': ['#63be7b', '#ffeb84', '#f8696b'],
    'Red - Yellow - Green': ['#f8696b', '#ffeb84', '#63be7b'],
    'Green - White': ['#ffffff', '#63be7b'],
    'White - Red': ['#ffffff', '#f8696b'],
    'Blue - White - Red': ['#5a8ac6', '#fcfcff', '#f8696b'],
    'Yellow - Green': ['#ffef9c', '#63be7b'],
};
const CF_ICONS = {
    Arrows: [{ ch: '▲', color: '#21a366' }, { ch: '▶', color: '#e6a100' }, { ch: '▼', color: '#d13438' }],
    'Traffic Lights': [{ ch: '●', color: '#21a366' }, { ch: '●', color: '#f2b600' }, { ch: '●', color: '#d13438' }],
    Stars: [{ ch: '★', color: '#f2b600' }, { ch: '★', color: '#c9c9c9' }, { ch: '☆', color: '#b0b0b0' }],
    Flags: [{ ch: '⚑', color: '#21a366' }, { ch: '⚑', color: '#f2b600' }, { ch: '⚑', color: '#d13438' }],
    Ratings: [{ ch: '▰▰▰', color: '#2f6fcf' }, { ch: '▰▰▱', color: '#2f6fcf' }, { ch: '▰▱▱', color: '#2f6fcf' }],
};

let cfStats = new Map();

function cfPrepare() {
    cfStats = new Map();
    book.sheets.forEach((s, si) => {
        for (const rule of s.cf || []) {
            const nums = [], texts = new Map();
            for (let r = rule.r0; r <= Math.min(rule.r1, s.rows); r++) {
                for (let c = rule.c0; c <= Math.min(rule.c1, s.cols - 1); c++) {
                    const v = (calc.values[si] || {})[idOf(r, c)];
                    if (v === undefined || v === null || v === '') continue;
                    if (typeof v === 'number') nums.push(v);
                    const key = String(isErrVal(v) ? v.code : v).toLowerCase();
                    texts.set(key, (texts.get(key) || 0) + 1);
                }
            }
            const sorted = nums.slice().sort((a, b) => a - b);
            const st = {
                min: sorted.length ? sorted[0] : 0, max: sorted.length ? sorted[sorted.length - 1] : 0,
                avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0, sorted, texts,
            };
            if (rule.type === 'top' || rule.type === 'bottom') {
                const n = rule.pct ? Math.max(1, Math.round(sorted.length * rule.n / 100)) : rule.n;
                st.cut = rule.type === 'top' ? sorted[Math.max(0, sorted.length - n)] : sorted[Math.min(sorted.length - 1, n - 1)];
            }
            cfStats.set(rule.id, st);
        }
    });
}

function cfMatch(rule, st, v) {
    const num = typeof v === 'number' ? v : null;
    const txt = v === null || v === undefined ? '' : String(isErrVal(v) ? v.code : v);
    switch (rule.type) {
        case 'cell': {
            const a = parseFloat(rule.a), b = parseFloat(rule.b);
            if (rule.op === 'contains') return txt !== '' && txt.toLowerCase().includes(String(rule.a).toLowerCase());
            if (rule.op === 'eq') return isFinite(a) && num !== null ? num === a : txt !== '' && txt.toLowerCase() === String(rule.a).toLowerCase();
            if (num === null) return false;
            if (rule.op === 'gt') return num > a;
            if (rule.op === 'lt') return num < a;
            if (rule.op === 'between') return num >= Math.min(a, b) && num <= Math.max(a, b);
            return false;
        }
        case 'dup': return txt !== '' && (st.texts.get(txt.toLowerCase()) || 0) > 1;
        case 'unique': return txt !== '' && (st.texts.get(txt.toLowerCase()) || 0) === 1;
        case 'top': return num !== null && st.cut !== undefined && num >= st.cut;
        case 'bottom': return num !== null && st.cut !== undefined && num <= st.cut;
        case 'above': return num !== null && num > st.avg;
        case 'below': return num !== null && num < st.avg;
    }
    return false;
}

// What every rule covering a cell adds (earlier rules win, like Excel)!
function cfFor(r, c, v) {
    const s = sh();
    if (!s.cf || !s.cf.length) return null;
    let out = null;
    for (let i = s.cf.length - 1; i >= 0; i--) {
        const rule = s.cf[i];
        if (r < rule.r0 || r > rule.r1 || c < rule.c0 || c > rule.c1) continue;
        const st = cfStats.get(rule.id);
        if (!st) continue;
        out = out || {};
        if (rule.type === 'bar') {
            if (typeof v !== 'number') continue;
            const lo = Math.min(0, st.min), hi = st.max;
            const frac = hi > lo ? Math.max(0, (v - lo) / (hi - lo)) : (v > 0 ? 1 : 0);
            out.bar = `linear-gradient(90deg, ${rule.color}, ${mixHex(rule.color, '#ffffff', 0.72)})`;
            out.barSize = `calc((100% - 4px) * ${frac.toFixed(4)})`;
        } else if (rule.type === 'scale') {
            if (typeof v !== 'number') continue;
            const t = st.max > st.min ? (v - st.min) / (st.max - st.min) : 0.5;
            const cs = rule.colors;
            out.fill = cs.length === 3 ? (t < 0.5 ? mixHex(cs[0], cs[1], t * 2) : mixHex(cs[1], cs[2], (t - 0.5) * 2)) : mixHex(cs[0], cs[1], t);
        } else if (rule.type === 'icons') {
            if (typeof v !== 'number') continue;
            const t = st.max > st.min ? (v - st.min) / (st.max - st.min) : 1;
            const set = CF_ICONS[rule.set] || CF_ICONS.Arrows;
            out.icon = t >= 2 / 3 ? set[0] : t >= 1 / 3 ? set[1] : set[2];
        } else if (cfMatch(rule, st, v)) {
            const p = CF_PRESETS[rule.preset] || CF_PRESETS.red;
            if (p.fill) out.fill = p.fill;
            if (p.color) out.color = p.color;
            if (p.b) out.b = true;
        }
    }
    return out;
}

function cfTargetRange() {
    const R = rng();
    if (rangeSize(R) > 1) return R;
    if (hasData(R.r0, R.c0)) return currentRegion(R.r0, R.c0);
    return R;
}

function addCfRule(rule) {
    const R = cfTargetRange();
    rule = Object.assign({ id: uid() }, R, rule);
    change(() => { sh().cf.push(rule); });
    // Sweep the new rule across its cells!
    let n = 0;
    for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) if (n++ < 400) animCell(r, c, 'pop', Math.min(600, ((r - R.r0) + (c - R.c0)) * 18));
    toast('Conditional formatting added to ' + rangeText(R) + '!');
}

async function cfRuleDialog(op) {
    const titles = { gt: 'Greater Than', lt: 'Less Than', between: 'Between', eq: 'Equal To', contains: 'Text that Contains', dup: 'Duplicate Values', top: 'Top 10 Items', bottom: 'Bottom 10 Items' };
    const v = valueAt(sel.act.r, sel.act.c);
    const def = typeof v === 'number' ? v : (cfStats.size ? '' : '');
    let fields = '';
    if (op === 'between') fields = `<div class="dlg-row"><input class="dlg-input" id="cf-a" value="${escapeHtml(String(def))}" placeholder="From"><span>and</span><input class="dlg-input" id="cf-b" placeholder="To"></div>`;
    else if (op === 'top' || op === 'bottom') fields = `<div class="dlg-row"><input class="dlg-input" id="cf-a" type="number" value="10" min="1" style="width:90px"><label class="dlg-check"><input type="checkbox" id="cf-pct"> %</label></div>`;
    else if (op !== 'dup') fields = `<input class="dlg-input" id="cf-a" value="${escapeHtml(String(def))}">`;
    const presets = Object.keys(CF_PRESETS).map(k => `<option value="${k}">${CF_PRESETS[k].label}</option>`).join('');
    const r = await openDialog({
        title: titles[op], width: 420,
        body: `<p class="dlg-text">Format cells that ${op === 'dup' ? 'are <b>duplicates</b>' : op === 'contains' ? 'contain the text' : op === 'top' ? 'rank in the <b>top</b>' : op === 'bottom' ? 'rank in the <b>bottom</b>' : 'are <b>' + titles[op].toUpperCase() + '</b>'}:</p>${fields}
            <label class="dlg-field"><span>with</span><select id="cf-preset">${presets}</select></label>
            <div class="cf-preview" id="cf-prev">AaBbCc 123</div>`,
        onOpen: (d) => {
            const sel2 = d.querySelector('#cf-preset');
            const upd = () => { const p = CF_PRESETS[sel2.value]; const pv = d.querySelector('#cf-prev'); pv.style.background = p.fill || ''; pv.style.color = p.color || ''; pv.style.fontWeight = p.b ? 700 : 400; };
            sel2.addEventListener('change', upd);
            upd();
        },
    });
    if (r.value !== 'ok') return;
    const d = r.el;
    const a = d.querySelector('#cf-a') ? d.querySelector('#cf-a').value : '';
    const b = d.querySelector('#cf-b') ? d.querySelector('#cf-b').value : '';
    const preset = d.querySelector('#cf-preset').value;
    if (op === 'dup') addCfRule({ type: 'dup', preset });
    else if (op === 'top' || op === 'bottom') addCfRule({ type: op, n: Math.max(1, parseInt(a, 10) || 10), pct: d.querySelector('#cf-pct').checked, preset });
    else addCfRule({ type: 'cell', op, a, b, preset });
}

function cfDescribe(rule) {
    const R = rangeText(rule);
    switch (rule.type) {
        case 'bar': return ['Data Bar', R, `<span class="cf-sw" style="background:linear-gradient(90deg,${rule.color},#fff)"></span>`];
        case 'scale': return ['Color Scale', R, `<span class="cf-sw" style="background:linear-gradient(90deg,${rule.colors.join(',')})"></span>`];
        case 'icons': return ['Icon Set: ' + rule.set, R, (CF_ICONS[rule.set] || []).map(i => `<b style="color:${i.color}">${i.ch}</b>`).join('')];
        case 'cell': return [({ gt: 'Value > ', lt: 'Value < ', eq: 'Value = ', between: 'Between ', contains: 'Contains ' }[rule.op] || '') + rule.a + (rule.op === 'between' ? ' and ' + rule.b : ''), R, presetSwatch(rule.preset)];
        case 'dup': return ['Duplicate values', R, presetSwatch(rule.preset)];
        case 'unique': return ['Unique values', R, presetSwatch(rule.preset)];
        case 'top': return ['Top ' + rule.n + (rule.pct ? '%' : ''), R, presetSwatch(rule.preset)];
        case 'bottom': return ['Bottom ' + rule.n + (rule.pct ? '%' : ''), R, presetSwatch(rule.preset)];
        case 'above': return ['Above average', R, presetSwatch(rule.preset)];
        case 'below': return ['Below average', R, presetSwatch(rule.preset)];
    }
    return [rule.type, R, ''];
}

function presetSwatch(k) {
    const p = CF_PRESETS[k] || CF_PRESETS.red;
    return `<span class="cf-sw txt" style="background:${p.fill || 'transparent'};color:${p.color || 'inherit'};font-weight:${p.b ? 700 : 400}">Aa</span>`;
}

async function cfManage() {
    const s = sh();
    const draw = (d) => {
        const list = d.querySelector('#cf-list');
        list.innerHTML = s.cf.length ? s.cf.map((rule, i) => { const [a, b, c] = cfDescribe(rule); return `<div class="cf-row"><span class="cf-prev">${c}</span><b>${escapeHtml(a)}</b><em>${b}</em><button data-up="${i}" title="Higher priority"${i === 0 ? ' disabled' : ''}>▲</button><button data-del="${i}" title="Delete rule">${ico('trash')}</button></div>`; }).join('') : '<p class="dlg-hint">This sheet has no rules yet! Try Home → Conditional Formatting!</p>';
    };
    await openDialog({
        title: 'Conditional Formatting Rules', width: 520, body: '<div id="cf-list" class="cf-list"></div>',
        buttons: [{ label: 'Done', value: 'ok', primary: true }],
        onOpen: (d) => {
            draw(d);
            d.querySelector('#cf-list').addEventListener('click', (e) => {
                const del = e.target.closest('[data-del]');
                const up = e.target.closest('[data-up]');
                if (del) { change(() => s.cf.splice(+del.dataset.del, 1)); draw(d); }
                if (up) { const i = +up.dataset.up; change(() => { const [x] = s.cf.splice(i, 1); s.cf.splice(i - 1, 0, x); }); draw(d); }
            });
        },
    });
}

function cfClear(all) {
    const s = sh();
    const R = rng();
    change(() => {
        if (all) s.cf = [];
        else s.cf = s.cf.filter(rule => rule.r1 < R.r0 || rule.r0 > R.r1 || rule.c1 < R.c0 || rule.c0 > R.c1);
    });
    toast(all ? 'Cleared every rule on this sheet!' : 'Cleared rules from the selection!');
}

// ==========================================
// CELL STYLES & TABLE STYLES
// ==========================================
const CELL_STYLES = [
    { group: 'Good, Bad and Neutral', items: [
        ['Normal', {}], ['Good', { fill: '#c6efce', color: '#006100' }], ['Bad', { fill: '#ffc7ce', color: '#9c0006' }], ['Neutral', { fill: '#ffeb9c', color: '#9c5700' }],
    ] },
    { group: 'Data and Model', items: [
        ['Calculation', { fill: '#f2f2f2', color: '#fa7d00', b: true, bt: 'thin #7f7f7f', bb: 'thin #7f7f7f', bl: 'thin #7f7f7f', br: 'thin #7f7f7f' }],
        ['Check Cell', { fill: '#a5a5a5', color: '#ffffff', b: true, bt: 'thick #3f3f3f', bb: 'thick #3f3f3f', bl: 'thick #3f3f3f', br: 'thick #3f3f3f' }],
        ['Explanatory', { color: '#7f7f7f', i: true }],
        ['Input', { fill: '#ffcc99', color: '#3f3f76', bt: 'thin #7f7f7f', bb: 'thin #7f7f7f', bl: 'thin #7f7f7f', br: 'thin #7f7f7f' }],
        ['Linked Cell', { color: '#fa7d00', bb: 'double #ff8001' }],
        ['Note', { fill: '#ffffcc', bt: 'thin #b2b2b2', bb: 'thin #b2b2b2', bl: 'thin #b2b2b2', br: 'thin #b2b2b2' }],
        ['Output', { fill: '#f2f2f2', color: '#3f3f3f', b: true, bt: 'thin #3f3f3f', bb: 'thin #3f3f3f', bl: 'thin #3f3f3f', br: 'thin #3f3f3f' }],
        ['Warning Text', { color: '#ff0000' }],
    ] },
    { group: 'Titles and Headings', items: [
        ['Title', { size: 20, b: true, color: '#44546a' }],
        ['Heading 1', { size: 16, b: true, color: '#44546a', bb: 'thick #4472c4' }],
        ['Heading 2', { size: 14, b: true, color: '#44546a', bb: 'thick #a2b8e1' }],
        ['Heading 3', { b: true, color: '#44546a', bb: 'thin #8ea9db' }],
        ['Total', { b: true, bt: 'thin #4472c4', bb: 'double #4472c4' }],
    ] },
    { group: 'Themed Cell Styles', items: ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'].map((c, i) => [`Accent ${i + 1}`, { fill: c, color: '#ffffff' }]).concat(
        ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'].map((c, i) => [`20% - Accent ${i + 1}`, { fill: mixHex(c, '#ffffff', 0.8) }])) },
    { group: 'Imbuer Gel', items: [
        ['Gel Lime', { fill: GEL_COLORS[0], color: '#1f4d00', b: true }], ['Gel Sky', { fill: GEL_COLORS[1], color: '#073b66', b: true }],
        ['Gel Rose', { fill: GEL_COLORS[2], color: '#6b0f2f', b: true }], ['Gel Amber', { fill: GEL_COLORS[3], color: '#5a3d00', b: true }],
        ['Gel Grape', { fill: GEL_COLORS[4], color: '#3a1670', b: true }], ['Gel Mint', { fill: GEL_COLORS[5], color: '#0b4a3c', b: true }],
        ['Gel Tangerine', { fill: GEL_COLORS[6], color: '#5c2600', b: true }], ['Gel Glass', { fill: GEL_COLORS[7], color: '#2d3a4a', b: true }],
    ] },
];

function previewStyle(st) {
    let css = '';
    if (st.fill) css += `background:${st.fill};`;
    if (st.color) css += `color:${st.color};`;
    if (st.b) css += 'font-weight:700;';
    if (st.i) css += 'font-style:italic;';
    if (st.size) css += `font-size:${Math.min(16, st.size)}px;`;
    const edge = (k, side) => { if (st[k]) { const [kind, col] = st[k].split(' '); css += `border-${side}:${kind === 'thick' ? 2 : kind === 'double' ? 3 : 1}px ${kind === 'double' ? 'double' : 'solid'} ${col};`; } };
    edge('bt', 'top'); edge('bb', 'bottom'); edge('bl', 'left'); edge('br', 'right');
    return css;
}

function applyCellStyle(st) {
    const s = sh();
    change(() => {
        forEachSelected((r, c) => {
            const id = idOf(r, c);
            const cur = s.styles[id] || {};
            const keep = {};
            ['fmt', 'dec', 'sep', 'check', 'wrap', 'align', 'valign', 'indent'].forEach(k => { if (cur[k] !== undefined) keep[k] = cur[k]; });
            const next = Object.assign(keep, JSON.parse(JSON.stringify(st)));
            if (Object.keys(next).length) s.styles[id] = next; else delete s.styles[id];
        });
    });
    pulseSelection();
}

function galleryHtml(groups, cls) {
    return `<div class="gal ${cls || ''}">${groups.map((g, gi) => `<div class="gal-head">${escapeHtml(g.group)}</div><div class="gal-grid">${g.items.map((it, ii) => `<button class="gal-item" data-g="${gi}" data-i="${ii}" style="${previewStyle(it[1])}" title="${escapeHtml(it[0])}">${escapeHtml(it[0])}</button>`).join('')}</div>`).join('')}</div>`;
}

const TABLE_STYLES = [
    ['Blue', '#4472c4'], ['Orange', '#ed7d31'], ['Gray', '#7f7f7f'], ['Gold', '#bf8f00'], ['Sky', '#2e86c1'],
    ['Green', '#548235'], ['Lime', '#5fa700'], ['Purple', '#7030a0'], ['Rose', '#c2185b'], ['Teal', '#00897b'],
];

function tableThumb(color, light) {
    let h = `<span class="tt" style="--tc:${color}">`;
    for (let r = 0; r < 5; r++) {
        h += '<i>';
        for (let c = 0; c < 4; c++) h += `<b style="background:${r === 0 ? (light ? mixHex(color, '#ffffff', 0.55) : color) : (r % 2 ? mixHex(color, '#ffffff', light ? 0.92 : 0.8) : '#fff')}"></b>`;
        h += '</i>';
    }
    return h + '</span>';
}

function applyTableStyle(color, light) {
    const R = cfTargetRange();
    if (R.r0 === R.r1) { toast('Select a block of data with a header row first!'); return; }
    const s = sh();
    const band = mixHex(color, '#ffffff', light ? 0.92 : 0.8);
    const line = mixHex(color, '#ffffff', 0.45);
    change(() => {
        for (let r = R.r0; r <= R.r1; r++) {
            for (let c = R.c0; c <= R.c1; c++) {
                const id = idOf(r, c);
                const st = Object.assign({}, s.styles[id] || {});
                delete st.fill; delete st.color; delete st.bt; delete st.bb; delete st.bl; delete st.br;
                if (r === R.r0) {
                    st.fill = light ? mixHex(color, '#ffffff', 0.55) : color;
                    st.color = light ? '#1f1f1f' : '#ffffff';
                    st.b = true;
                    st.bb = 'thin ' + color;
                } else {
                    if ((r - R.r0) % 2 === 1) st.fill = band;
                    st.bb = 'thin ' + line;
                }
                if (r === R.r1) st.bb = 'thin ' + color;
                s.styles[id] = st;
            }
        }
        s.filter = { r0: R.r0, c0: R.c0, r1: R.r1, c1: R.c1, cols: {} };
        sel.anchor = { r: R.r0, c: R.c0 };
        sel.focus = { r: R.r1, c: R.c1 };
    }, { rebuild: true });
    for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) animCell(r, c, 'pop', ((r - R.r0) * 30 + (c - R.c0) * 12));
    drawSel({ shine: true });
    toast('Formatted ' + rangeText(R) + ' as a table, with filters!');
}

// ==========================================
// CHARTS (SVG, animated, draggable)
// ==========================================
let selectedChart = null;
const animateChartIds = new Set();

function chartSheetIndex(ch) {
    const i = book.sheets.findIndex(s => s.charts.includes(ch));
    return i < 0 ? book.active : i;
}

function chartData(ch) {
    const si = chartSheetIndex(ch);
    const R = ch.src;
    const vals = calc.values[si] || {};
    const val = (r, c) => { const v = vals[idOf(r, c)]; return v === undefined ? null : v; };
    const isText = (v) => typeof v === 'string' && v !== '';
    const num = (v) => typeof v === 'number' ? v : (typeof v === 'boolean' ? +v : null);
    const rows = R.r1 - R.r0 + 1, cols = R.c1 - R.c0 + 1;
    let headRow = false;
    if (rows > 1) for (let c = R.c0; c <= R.c1; c++) if (isText(val(R.r0, c))) headRow = true;
    let catCol = false;
    if (cols > 1) for (let r = R.r0 + (headRow ? 1 : 0); r <= R.r1; r++) if (isText(val(r, R.c0))) catCol = true;
    if (cols > 1 && headRow && val(R.r0, R.c0) === null) catCol = true;
    const dr0 = R.r0 + (headRow ? 1 : 0), dc0 = R.c0 + (catCol ? 1 : 0);
    const nR = R.r1 - dr0 + 1, nC = R.c1 - dc0 + 1;
    const label = (r, c) => { const v = val(r, c); return v === null ? '' : (si === book.active ? displayText(r, c) : String(plainValue(v))); };
    const byCol = ch.type === 'scatter' || nR >= nC;
    const cats = [], series = [];
    if (byCol) {
        for (let r = dr0; r <= R.r1; r++) cats.push(catCol ? label(r, R.c0) : String(r - dr0 + 1));
        for (let c = dc0; c <= R.c1; c++) {
            const vs = [];
            for (let r = dr0; r <= R.r1; r++) vs.push(num(val(r, c)));
            series.push({ name: headRow ? label(R.r0, c) : 'Series ' + (c - dc0 + 1), vals: vs });
        }
    } else {
        for (let c = dc0; c <= R.c1; c++) cats.push(headRow ? label(R.r0, c) : String(c - dc0 + 1));
        for (let r = dr0; r <= R.r1; r++) {
            const vs = [];
            for (let c = dc0; c <= R.c1; c++) vs.push(num(val(r, c)));
            series.push({ name: catCol ? label(r, R.c0) : 'Series ' + (r - dr0 + 1), vals: vs });
        }
    }
    return { cats, series: series.slice(0, 12) };
}

function niceScale(lo, hi, ticks) {
    if (lo === hi) { if (lo === 0) hi = 1; else if (lo > 0) lo = 0; else hi = 0; }
    const span = hi - lo;
    const raw = span / Math.max(1, ticks);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
    const min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
    const out = [];
    for (let v = min; v <= max + step / 2; v += step) out.push(Math.round(v / step) * step);
    return { min, max, step, ticks: out };
}

function shortNum(v) {
    const a = Math.abs(v);
    if (a >= 1e9) return parseFloat((v / 1e9).toFixed(1)) + 'B';
    if (a >= 1e6) return parseFloat((v / 1e6).toFixed(1)) + 'M';
    if (a >= 1e4) return parseFloat((v / 1e3).toFixed(1)) + 'K';
    return fmtGeneral(Math.round(v * 1000) / 1000);
}

function arcPath(cx, cy, r0, r1, a0, a1) {
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
    if (r0 <= 0) return `M${cx} ${cy} L${p(r1, a0)} A${r1} ${r1} 0 ${big} 1 ${p(r1, a1)} Z`;
    return `M${p(r1, a0)} A${r1} ${r1} 0 ${big} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${big} 0 ${p(r0, a0)} Z`;
}

function chartSvg(ch, W, H) {
    if (ch.type === 'image') return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><image href="${escapeHtml(ch.img || '')}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet"/></svg>`;
    const { cats, series } = chartData(ch);
    const esc = escapeHtml;
    const dark = document.body.classList.contains('dark');
    const ink = dark ? '#c8c8c8' : '#595959', grid = dark ? '#3a3a3a' : '#e4e4e4';
    if (!series.length || !cats.length) return `<svg viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${ink}" font-size="12">No data to chart!</text></svg>`;
    const color = (i) => CHART_COLORS[i % CHART_COLORS.length];
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-size="11" fill="${ink}">`;
    const pie = ch.type === 'pie' || ch.type === 'doughnut';
    // Legend: centered rows that wrap to fit the card!
    const legendItems = (pie ? cats.map((c, i) => ({ name: c, color: color(i) })) : series.map((s, i) => ({ name: s.name, color: color(i) }))).slice(0, 16);
    const rowsL = [[]];
    let lx = 0;
    legendItems.forEach(it => {
        const name = it.name.length > 16 ? it.name.slice(0, 15) + '…' : it.name;
        const w = 18 + name.length * 6.1;
        if (lx + w > W - 16 && rowsL[rowsL.length - 1].length) { rowsL.push([]); lx = 0; }
        rowsL[rowsL.length - 1].push({ ...it, name, x: lx, w });
        lx += w + 10;
    });
    const showLegend = pie || series.length > 1;
    const legendH = showLegend ? rowsL.length * 16 + 8 : 0;
    const legendSvg = `<g class="legend">${rowsL.map((row, ri) => {
        const width = row.reduce((a, it) => a + it.w + 10, -10);
        const x0 = Math.max(4, (W - width) / 2), y = H - legendH + 14 + ri * 16;
        return row.map(it => `<rect x="${(x0 + it.x).toFixed(1)}" y="${y - 8}" width="9" height="9" rx="2" fill="${it.color}"/><text x="${(x0 + it.x + 13).toFixed(1)}" y="${y}">${esc(it.name)}</text>`).join('');
    }).join('')}</g>`;
    const bottom = legendH;

    if (pie) {
        const vals = series[0].vals.map(v => (v && v > 0 ? v : 0));
        const total = vals.reduce((a, b) => a + b, 0);
        const cx = W / 2, cy = (H - bottom) / 2 + 2;
        const R = Math.max(10, Math.min(W, H - bottom) / 2 - 12);
        const inner = ch.type === 'doughnut' ? R * 0.55 : 0;
        const mid = `m${ch.id}${Math.random().toString(36).slice(2, 6)}`;
        svg += `<defs><mask id="${mid}"><circle class="sweep" cx="${cx}" cy="${cy}" r="${R / 2 + 4}" fill="none" stroke="#fff" stroke-width="${R + 10}" pathLength="1" transform="rotate(-90 ${cx} ${cy})"/></mask></defs><g mask="url(#${mid})">`;
        let a = -Math.PI / 2;
        vals.forEach((v, i) => {
            if (!total || !v) return;
            const a1 = a + (v / total) * Math.PI * 2;
            svg += `<path class="slice" d="${arcPath(cx, cy, inner, R, a, a1)}" fill="${color(i)}" stroke="${dark ? '#262626' : '#fff'}" stroke-width="1.5"><title>${esc(cats[i])}: ${esc(shortNum(v))} (${(v / total * 100).toFixed(1)}%)</title></path>`;
            const am = (a + a1) / 2, lr = inner ? (inner + R) / 2 : R * 0.64;
            if (v / total > 0.06) svg += `<text class="slice-lbl" x="${(cx + lr * Math.cos(am)).toFixed(1)}" y="${(cy + lr * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-weight="700">${Math.round(v / total * 100)}%</text>`;
            a = a1;
        });
        svg += '</g>';
        if (!total) svg += `<text x="${cx}" y="${cy}" text-anchor="middle">No positive values!</text>`;
        return svg + legendSvg + '</svg>';
    }

    const all = [];
    series.forEach(s => s.vals.forEach(v => { if (v !== null) all.push(v); }));
    let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
    if (ch.type === 'scatter') { lo = Math.min(...all); hi = Math.max(...all); }
    const sc = niceScale(lo, hi, 5);
    const labW = Math.max(26, ...sc.ticks.map(t => shortNum(t).length * 6.4)) + 10;
    const horiz = ch.type === 'bar';
    const catLabW = horiz ? Math.min(110, Math.max(30, ...cats.map(c => c.length * 6.2)) + 8) : 0;
    const L = horiz ? catLabW : labW, T = 10, Rm = 14, B = 24 + bottom;
    const pw = Math.max(10, W - L - Rm), ph = Math.max(10, H - T - B);
    const vy = (v) => T + ph - ((v - sc.min) / (sc.max - sc.min)) * ph;
    const vx = (v) => L + ((v - sc.min) / (sc.max - sc.min)) * pw;
    // Gridlines + value axis!
    sc.ticks.forEach(t => {
        if (horiz) svg += `<line x1="${vx(t)}" x2="${vx(t)}" y1="${T}" y2="${T + ph}" stroke="${grid}"/><text x="${vx(t)}" y="${T + ph + 15}" text-anchor="middle">${esc(shortNum(t))}</text>`;
        else svg += `<line x1="${L}" x2="${L + pw}" y1="${vy(t)}" y2="${vy(t)}" stroke="${grid}"/><text x="${L - 6}" y="${vy(t) + 4}" text-anchor="end">${esc(shortNum(t))}</text>`;
    });
    const n = cats.length;
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((horiz ? ph : pw) / (horiz ? 16 : 54)))));
    if (ch.type === 'scatter') {
        // x = first series, y = the rest!
        const xs = series[0].vals;
        const xsN = xs.filter(v => v !== null);
        const xsc = niceScale(Math.min(...xsN), Math.max(...xsN), 5);
        const sx = (v) => L + ((v - xsc.min) / (xsc.max - xsc.min)) * pw;
        xsc.ticks.forEach(t => { svg += `<text x="${sx(t)}" y="${T + ph + 15}" text-anchor="middle">${esc(shortNum(t))}</text>`; });
        const ys = series.length > 1 ? series.slice(1) : [{ name: series[0].name, vals: xs.map((v, i) => i + 1) }];
        let k = 0;
        ys.forEach((s, si) => s.vals.forEach((v, i) => {
            if (v === null || xs[i] === null) return;
            svg += `<circle class="dot" style="--i:${k++}" cx="${sx(xs[i]).toFixed(1)}" cy="${vy(v).toFixed(1)}" r="4.5" fill="${color(si)}" fill-opacity=".85"><title>(${esc(shortNum(xs[i]))}, ${esc(shortNum(v))})</title></circle>`;
        }));
    } else if (ch.type === 'column' || ch.type === 'bar') {
        const groupW = (horiz ? ph : pw) / n;
        const bw = Math.max(1, (groupW * 0.72) / series.length);
        let k = 0;
        cats.forEach((cat, i) => {
            const g0 = (horiz ? T : L) + i * groupW + groupW * 0.14;
            series.forEach((s, j) => {
                const v = s.vals[i];
                if (v === null) return;
                const neg = v < 0;
                if (horiz) {
                    const x0 = vx(0), x1 = vx(v);
                    svg += `<rect class="bar h${neg ? ' neg' : ''}" style="--i:${k++}" x="${Math.min(x0, x1).toFixed(1)}" y="${(g0 + j * bw).toFixed(1)}" width="${Math.abs(x1 - x0).toFixed(1)}" height="${(bw - 1).toFixed(1)}" rx="1.5" fill="${color(j)}"><title>${esc(s.name)} · ${esc(cat)}: ${esc(shortNum(v))}</title></rect>`;
                } else {
                    const y0 = vy(0), y1 = vy(v);
                    svg += `<rect class="bar${neg ? ' neg' : ''}" style="--i:${k++}" x="${(g0 + j * bw).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${Math.abs(y1 - y0).toFixed(1)}" rx="1.5" fill="${color(j)}"><title>${esc(s.name)} · ${esc(cat)}: ${esc(shortNum(v))}</title></rect>`;
                }
            });
            if (i % every === 0) {
                const lbl = cat.length > 12 ? cat.slice(0, 11) + '…' : cat;
                if (horiz) svg += `<text x="${L - 6}" y="${(T + i * groupW + groupW / 2 + 4).toFixed(1)}" text-anchor="end">${esc(lbl)}</text>`;
                else svg += `<text x="${(L + i * groupW + groupW / 2).toFixed(1)}" y="${T + ph + 15}" text-anchor="middle">${esc(lbl)}</text>`;
            }
        });
        if (horiz) svg += `<line x1="${vx(0)}" x2="${vx(0)}" y1="${T}" y2="${T + ph}" stroke="${ink}" stroke-opacity=".5"/>`;
        else svg += `<line x1="${L}" x2="${L + pw}" y1="${vy(0)}" y2="${vy(0)}" stroke="${ink}" stroke-opacity=".5"/>`;
    } else {
        // line & area
        const step = n > 1 ? pw / (n - 1) : 0;
        const px = (i) => n > 1 ? L + i * step : L + pw / 2;
        cats.forEach((cat, i) => { if (i % every === 0) svg += `<text x="${px(i).toFixed(1)}" y="${T + ph + 15}" text-anchor="middle">${esc(cat.length > 12 ? cat.slice(0, 11) + '…' : cat)}</text>`; });
        const order = ch.type === 'area' ? series.map((s, j) => j).reverse() : series.map((s, j) => j);
        order.forEach((j) => {
            const s = series[j];
            const pts = s.vals.map((v, i) => v === null ? null : [px(i), vy(v)]);
            const segs = [];
            let cur = [];
            pts.forEach(p => { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } });
            if (cur.length) segs.push(cur);
            segs.forEach(seg => {
                const d = seg.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
                if (ch.type === 'area') svg += `<path class="area" d="${d} L${seg[seg.length - 1][0].toFixed(1)} ${vy(Math.max(sc.min, 0)).toFixed(1)} L${seg[0][0].toFixed(1)} ${vy(Math.max(sc.min, 0)).toFixed(1)} Z" fill="${color(j)}" fill-opacity=".55"/>`;
                svg += `<path class="ln" d="${d}" pathLength="1" fill="none" stroke="${color(j)}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
            });
            if (ch.type === 'line') pts.forEach((p, i) => { if (p) svg += `<circle class="dot" style="--i:${i}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.4" fill="${dark ? '#262626' : '#fff'}" stroke="${color(j)}" stroke-width="2"><title>${esc(s.name)} · ${esc(cats[i])}: ${esc(shortNum(s.vals[i]))}</title></circle>`; });
        });
    }
    return svg + (showLegend ? legendSvg : '') + '</svg>';
}

const CHART_TYPES = [['column', 'chartColumn', 'Column'], ['bar', 'chartBar', 'Bar'], ['line', 'chartLine', 'Line'], ['area', 'chartArea', 'Area'], ['pie', 'chartPie', 'Pie'], ['doughnut', 'chartDoughnut', 'Doughnut'], ['scatter', 'chartScatter', 'Scatter']];

function renderCharts() {
    const layer = document.getElementById('charts-layer');
    if (!layer) return;
    const s = sh();
    const z = zf();
    const keep = new Set(s.charts.map(c => c.id));
    layer.querySelectorAll('.chart-obj').forEach(el => { if (!keep.has(el.dataset.id)) el.remove(); });
    s.charts.forEach(ch => {
        let el = layer.querySelector(`.chart-obj[data-id="${ch.id}"]`);
        if (!el) {
            el = document.createElement('div');
            el.className = 'chart-obj';
            el.dataset.id = ch.id;
            el.innerHTML = `<div class="chart-head"><span class="chart-title"></span></div><div class="chart-body"></div><div class="chart-stats" hidden></div>
                <div class="chart-tools">${CHART_TYPES.map(t => `<button data-ct="${t[0]}" title="${t[2]}">${ico(t[1])}</button>`).join('')}<span class="ct-sep"></span><button data-ca="data" title="Use the selected cells as data">${ico('table')}</button><button data-ca="title" title="Edit title">${ico('pencil')}</button><button data-ca="del" title="Delete chart">${ico('trash')}</button></div>
                <i class="chart-rz"></i>`;
            layer.appendChild(el);
        }
        el.style.left = (ch.x * z) + 'px';
        el.style.top = (ch.y * z) + 'px';
        el.style.width = (ch.w * z) + 'px';
        el.style.height = (ch.h * z) + 'px';
        el.classList.toggle('sel', selectedChart === ch);
        el.dataset.kind = ch.type;
        el.querySelectorAll('[data-ct]').forEach(b => b.classList.toggle('on', b.dataset.ct === ch.type));
        el.querySelector('.chart-title').textContent = ch.title;
        const animate = animateChartIds.has(ch.id) && prefs.anim;
        animateChartIds.delete(ch.id);
        el.classList.toggle('animate', animate);
        const body = el.querySelector('.chart-body');
        const statsEl = el.querySelector('.chart-stats');
        statsEl.hidden = !ch.stats;
        if (ch.stats) renderChartStats(ch, statsEl);
        const W = Math.max(60, ch.w - 16), H = Math.max(40, ch.h - 44 - (ch.stats ? 20 : 0));
        const svg = chartSvg(ch, W, H);
        if (body._svg !== svg || animate) { body.innerHTML = svg; body._svg = svg; }
        if (animate) { el.classList.remove('animate'); void el.offsetWidth; el.classList.add('animate'); }
    });
}

function insertChart(type) {
    let R = rng();
    if (rangeSize(R) === 1) {
        if (!hasData(R.r0, R.c0)) { toast('Select some numbers to chart first!'); return; }
        R = currentRegion(R.r0, R.c0);
    }
    const s = sh();
    const z = zf();
    const x = Math.round(layout.colX[Math.min(s.cols, R.c1 + 1)] / z + 24);
    const y = Math.round(layout.rowY[R.r0] / z);
    const ch = { id: uid(), type, src: { r0: R.r0, c0: R.c0, r1: R.r1, c1: R.c1 }, x, y, w: 460, h: 290, title: '' };
    const data = chartData(ch);
    if (!data.series.some(se => se.vals.some(v => v !== null))) { toast('That range has no numbers to chart!'); return; }
    ch.title = data.series.length === 1 ? data.series[0].name : (type === 'pie' || type === 'doughnut' ? data.series[0].name : 'Chart Title');
    animateChartIds.add(ch.id);
    change(() => { s.charts.push(ch); });
    selectedChart = ch;
    renderCharts();
    const sc = scroller();
    if (x * z + 470 * z > sc.scrollLeft + sc.clientWidth) sc.scrollTo({ left: Math.max(0, x * z - 60), behavior: prefs.anim ? 'smooth' : 'auto' });
    toast('Chart added! Drag it around, or pick another type from its toolbar!');
}

function deleteChart(ch) {
    const s = book.sheets[chartSheetIndex(ch)];
    if (!s) return;
    const el = document.querySelector(`.chart-obj[data-id="${ch.id}"]`);
    const run = () => { change(() => { s.charts = s.charts.filter(c => c !== ch); }); selectedChart = null; };
    if (el && prefs.anim) { el.classList.add('leaving'); setTimeout(run, 200); } else run();
}

function selectChart(ch) {
    selectedChart = ch;
    document.querySelectorAll('.chart-obj').forEach(el => el.classList.toggle('sel', !!ch && el.dataset.id === ch.id));
}

function wireCharts() {
    const layer = document.getElementById('charts-layer');
    layer.addEventListener('mousedown', (e) => {
        const el = e.target.closest('.chart-obj');
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        if (isEditing()) commitEdit(0, 0);
        const ch = sh().charts.find(c => c.id === el.dataset.id);
        if (!ch) return;
        selectChart(ch);
        const tb = e.target.closest('[data-ct], [data-ca]');
        if (tb) {
            if (tb.dataset.ct) { change(() => { ch.type = tb.dataset.ct; }); animateChartIds.add(ch.id); renderCharts(); playAeroClickSound(700, 0.06); }
            else if (tb.dataset.ca === 'del') deleteChart(ch);
            else if (tb.dataset.ca === 'title') editChartTitle(ch);
            else if (tb.dataset.ca === 'data') {
                const R = rng();
                if (rangeSize(R) < 2) { toast('Select the new data on the sheet first!'); return; }
                change(() => { ch.src = { r0: R.r0, c0: R.c0, r1: R.r1, c1: R.c1 }; });
                animateChartIds.add(ch.id);
                renderCharts();
            }
            return;
        }
        const resize = e.target.closest('.chart-rz');
        const z = zf();
        const start = { x: e.clientX, y: e.clientY, cx: ch.x, cy: ch.y, w: ch.w, h: ch.h };
        let moved = false;
        el.classList.add(resize ? 'resizing' : 'dragging');
        const move = (ev) => {
            const dx = (ev.clientX - start.x) / z, dy = (ev.clientY - start.y) / z;
            if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
            if (resize) {
                el.style.width = (Math.max(180, start.w + dx) * z) + 'px';
                el.style.height = (Math.max(140, start.h + dy) * z) + 'px';
            } else {
                el.style.left = (Math.max(0, start.cx + dx) * z) + 'px';
                el.style.top = (Math.max(0, start.cy + dy) * z) + 'px';
            }
        };
        const up = (ev) => {
            document.removeEventListener('mousemove', move);
            el.classList.remove('resizing', 'dragging');
            if (!moved) return;
            const dx = (ev.clientX - start.x) / z, dy = (ev.clientY - start.y) / z;
            change(() => {
                if (resize) { ch.w = Math.round(Math.max(180, start.w + dx)); ch.h = Math.round(Math.max(140, start.h + dy)); }
                else { ch.x = Math.round(Math.max(0, start.cx + dx)); ch.y = Math.round(Math.max(0, start.cy + dy)); }
            }, { animate: false });
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up, { once: true });
    });
    layer.addEventListener('dblclick', (e) => {
        const el = e.target.closest('.chart-obj');
        if (!el || !e.target.closest('.chart-head')) return;
        const ch = sh().charts.find(c => c.id === el.dataset.id);
        if (ch) editChartTitle(ch);
    });
    layer.addEventListener('contextmenu', (e) => {
        const el = e.target.closest('.chart-obj');
        if (!el) return;
        e.preventDefault();
        const ch = sh().charts.find(c => c.id === el.dataset.id);
        if (!ch) return;
        selectChart(ch);
        openMenu(null, [
            { label: 'Change Chart Type', icon: 'chartColumn', sub: () => CHART_TYPES.map(t => ({ label: t[2], icon: t[1], checked: ch.type === t[0], run: () => { change(() => { ch.type = t[0]; }); animateChartIds.add(ch.id); renderCharts(); } })) },
            { label: 'Edit Title', icon: 'pencil', run: () => editChartTitle(ch) },
            { label: 'Select Source Data', icon: 'table', run: () => selectRange(ch.src, { shine: true }) },
            { label: 'Show Statistics', icon: 'calc', checked: !!ch.stats, title: 'Median, standard deviation and trend of the first series!', run: () => change(() => { ch.stats = !ch.stats; }) },
            { label: 'Replay Animation', icon: 'sparkle', run: () => { animateChartIds.add(ch.id); renderCharts(); } },
            { sep: true },
            { label: 'Delete Chart', icon: 'trash', run: () => deleteChart(ch) },
        ], { point: { x: e.clientX, y: e.clientY } });
    });
    document.addEventListener('mousedown', (e) => {
        if (selectedChart && !e.target.closest('.chart-obj') && !e.target.closest('.menu')) selectChart(null);
    });
}

// Median, stdev and trend of the first series!
function renderChartStats(ch, el) {
    if (typeof RadiiStats === 'undefined') { el.hidden = true; return; }
    const data = chartData(ch);
    const nums = (data.series[0] ? data.series[0].vals : []).filter(v => v !== null);
    const sig = nums.join(',');
    if (el._sig === sig) return;
    el._sig = sig;
    const fmt = (v) => (v === null || v === undefined ? 'n/a' : shortNum(Math.round(v * 10000) / 10000));
    const r = RadiiStats.summary(nums);
    el.textContent = `median ${fmt(r.median)} · stdev ${fmt(r.stdev)} · trend ${fmt(r.slope)}/pt + ${fmt(r.intercept)}`;
}

async function editChartTitle(ch) {
    const v = await promptDialog('Chart Title', 'Title', ch.title);
    if (v === null) return;
    change(() => { ch.title = v; });
}

// ==========================================
// SPARKLINES (tiny charts inside cells)
// ==========================================
function sparkValues(spec) {
    const refs = FormulaEngine.refsIn('=' + spec.src);
    if (!refs.length) return [];
    const x = refs[0].ref;
    const s = sh();
    const out = [];
    for (let r = x.r0; r <= Math.min(x.r1, s.rows); r++) for (let c = x.c0; c <= Math.min(x.c1, s.cols - 1); c++) {
        const v = valueAt(r, c);
        out.push(typeof v === 'number' ? v : null);
    }
    return out;
}

function sparkSvg(spec, r, c) {
    const vals = sparkValues(spec);
    const nums = vals.filter(v => v !== null);
    const w = Math.max(10, Math.round(colWidth(c) * zf()) - 8), h = Math.max(8, Math.round(rowHeight(r) * zf()) - 7);
    if (!nums.length) return '';
    const lo = Math.min(...nums), hi = Math.max(...nums);
    const color = spec.color || '#2f6fcf';
    let body = '';
    if (spec.type === 'line') {
        const n = vals.length;
        const y = (v) => hi === lo ? h / 2 : 2 + (h - 4) * (1 - (v - lo) / (hi - lo));
        const x = (i) => n > 1 ? 2 + (w - 4) * i / (n - 1) : w / 2;
        const pts = vals.map((v, i) => v === null ? null : [x(i), y(v)]).filter(Boolean);
        body = `<polyline class="spk-ln" pathLength="1" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
        const last = pts[pts.length - 1];
        if (last) body += `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.2" fill="#d13438"/>`;
    } else {
        const n = vals.length;
        const bw = (w - 2) / n;
        const base = spec.type === 'winloss' ? h / 2 : (lo < 0 ? h * hi / (hi - lo) : h);
        vals.forEach((v, i) => {
            if (v === null) return;
            let y, hh;
            if (spec.type === 'winloss') { hh = h / 2 - 1; y = v >= 0 ? 1 : h / 2; if (v === 0) return; }
            else {
                const span = Math.max(hi, 0) - Math.min(lo, 0) || 1;
                hh = Math.max(1, Math.abs(v) / span * (h - 1));
                y = v >= 0 ? base - hh : base;
            }
            body += `<rect x="${(1 + i * bw + bw * 0.12).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.76).toFixed(1)}" height="${hh.toFixed(1)}" fill="${v < 0 ? '#d13438' : color}"/>`;
        });
    }
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

async function insertSparkline(type) {
    const R = rng();
    const multi = rangeSize(R) > 1;
    const dataDef = multi ? rangeText(R) : '';
    const s = sh();
    const locDef = multi ? (R.r0 === R.r1 ? idOf(R.r0, Math.min(s.cols - 1, R.c1 + 1)) : rangeText({ r0: R.r0, r1: R.r1, c0: Math.min(s.cols - 1, R.c1 + 1), c1: Math.min(s.cols - 1, R.c1 + 1) })) : idOf(R.r0, R.c0);
    const r = await openDialog({
        title: 'Create Sparklines', width: 400,
        body: `<label class="dlg-field"><span>Data Range</span><input class="dlg-input" id="sp-data" value="${dataDef}" placeholder="like B2:G2"></label>
            <label class="dlg-field"><span>Location Range</span><input class="dlg-input" id="sp-loc" value="${locDef}"></label>
            <p class="dlg-hint">Several rows of data with a matching column of locations makes one sparkline per row!</p>`,
    });
    if (r.value !== 'ok') return;
    const dataTxt = r.el.querySelector('#sp-data').value.trim().toUpperCase();
    const locTxt = r.el.querySelector('#sp-loc').value.trim().toUpperCase();
    const D = FormulaEngine.refsIn('=' + dataTxt)[0], Lc = FormulaEngine.refsIn('=' + locTxt)[0];
    if (!D || !Lc) { toast("Those ranges don't look right!"); return; }
    const d = D.ref, l = Lc.ref;
    const locCells = [];
    for (let rr = l.r0; rr <= l.r1; rr++) for (let cc = l.c0; cc <= l.c1; cc++) locCells.push({ r: rr, c: cc });
    const rowsData = d.r1 - d.r0 + 1;
    change(() => {
        if (locCells.length > 1 && locCells.length === rowsData) {
            locCells.forEach((p, i) => { s.sparks[idOf(p.r, p.c)] = { type, src: rangeText({ r0: d.r0 + i, r1: d.r0 + i, c0: d.c0, c1: d.c1 }) }; });
        } else {
            s.sparks[idOf(locCells[0].r, locCells[0].c)] = { type, src: rangeText({ r0: d.r0, r1: d.r1, c0: d.c0, c1: d.c1 }) };
        }
    });
    locCells.forEach((p, i) => animCell(p.r, p.c, 'pop', i * 40));
}

// ==========================================
// SORT
// ==========================================
function sortTarget() {
    const R = rng();
    if (rangeSize(R) > 1) return R;
    if (!hasData(R.r0, R.c0)) return null;
    return currentRegion(R.r0, R.c0);
}

function guessHeader(R) {
    if (R.r1 === R.r0) return false;
    for (let c = R.c0; c <= R.c1; c++) { const v = valueAt(R.r0, c); if (v !== null && typeof v !== 'string') return false; }
    for (let c = R.c0; c <= R.c1; c++) { const v = valueAt(R.r0 + 1, c); if (typeof v === 'number') return true; }
    const st = sh().styles[idOf(R.r0, R.c0)];
    return !!(st && (st.b || st.fill));
}

function sortCompare(a, b) {
    const blank = (v) => v === null || v === undefined || v === '';
    if (blank(a) && blank(b)) return 0;
    if (blank(a)) return 1;
    if (blank(b)) return -1;
    const rank = (v) => typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 3;
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return a - b;
    if (ra === 1) return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    if (ra === 2) return (a ? 1 : 0) - (b ? 1 : 0);
    return 0;
}

// Sorts rows of a block; rows fly to their new spots!
function sortRows(R, keys, header) {
    const s = sh();
    const top = R.r0 + (header ? 1 : 0);
    if (top >= R.r1 + 1) return;
    const rows = [];
    for (let r = top; r <= R.r1; r++) {
        const cells = [];
        for (let c = R.c0; c <= R.c1; c++) {
            const id = idOf(r, c);
            cells.push({ raw: s.data[id], st: s.styles[id], note: s.notes[id], spark: s.sparks[id] });
        }
        rows.push({ r, cells, keys: keys.map(k => valueAt(r, k.c)) });
    }
    const sorted = rows.slice().sort((a, b) => {
        for (let i = 0; i < keys.length; i++) {
            const bothBlankish = [a.keys[i], b.keys[i]].some(v => v === null || v === '');
            let d = sortCompare(a.keys[i], b.keys[i]);
            if (keys[i].desc && !bothBlankish) d = -d;
            if (d) return d;
        }
        return a.r - b.r;
    });
    const moves = sorted.map((row, i) => ({ from: row.r, to: top + i })).filter(m => m.from !== m.to);
    if (!moves.length) { toast('Already sorted!'); return; }
    const ghosts = prefs.anim ? captureRows(R, moves) : null;
    change(() => {
        sorted.forEach((row, i) => {
            const r = top + i;
            row.cells.forEach((cell, j) => {
                const c = R.c0 + j;
                const id = idOf(r, c);
                let raw = cell.raw;
                if (raw && raw[0] === '=' && row.r !== r) raw = FormulaEngine.shiftFormula(raw, r - row.r, 0);
                setRaw(s, r, c, raw);
                if (cell.st) s.styles[id] = cell.st; else delete s.styles[id];
                if (cell.note) s.notes[id] = cell.note; else delete s.notes[id];
                if (cell.spark) s.sparks[id] = cell.spark; else delete s.sparks[id];
            });
        });
    });
    if (ghosts) flyRows(R, ghosts);
    playAeroClickSound(680, 0.08);
}

function captureRows(R, moves) {
    return moves.slice(0, 160).map(m => {
        let html = '';
        for (let c = R.c0; c <= Math.min(R.c1, R.c0 + 30); c++) {
            const td = cellEls[m.from][c];
            const left = layout.colX[c] - layout.colX[R.c0];
            html += `<div class="fly-cell" style="left:${left}px;top:0;width:${layout.colX[c + 1] - layout.colX[c]}px;height:${layout.rowY[m.from + 1] - layout.rowY[m.from]}px;${td.style.cssText.replace(/position:\s*sticky;?|top:[^;]+;|left:[^;]+;|z-index:[^;]+;/g, '')}">${td.innerHTML}</div>`;
        }
        return { from: m.from, to: m.to, html };
    });
}

function flyRows(R, ghosts) {
    const ov = document.getElementById('ov');
    const w = layout.colX[R.c1 + 1] - layout.colX[R.c0];
    ghosts.forEach((g, i) => {
        const el = document.createElement('div');
        el.className = 'fly-block row';
        el.style.left = layout.colX[R.c0] + 'px';
        el.style.top = layout.rowY[g.from] + 'px';
        el.style.width = w + 'px';
        el.style.height = (layout.rowY[g.from + 1] - layout.rowY[g.from]) + 'px';
        el.innerHTML = g.html;
        ov.appendChild(el);
        const cells = cellEls[g.to].slice(R.c0, R.c1 + 1);
        cells.forEach(td => td.classList.add('ghosted'));
        requestAnimationFrame(() => {
            el.style.transitionDelay = Math.min(240, i * 6) + 'ms';
            el.style.transform = `translateY(${layout.rowY[g.to] - layout.rowY[g.from]}px)`;
            el.classList.add('go');
        });
        setTimeout(() => { el.remove(); cells.forEach(td => td.classList.remove('ghosted')); }, 560 + Math.min(240, i * 6));
    });
}

function quickSort(desc) {
    const R = sortTarget();
    if (!R) { toast('Pick a cell inside your data first!'); return; }
    const header = guessHeader(R);
    const c = Math.max(R.c0, Math.min(R.c1, sel.act.c));
    sortRows(R, [{ c, desc }], header);
}

async function customSortDialog() {
    const R = sortTarget();
    if (!R) { toast('Pick a cell inside your data first!'); return; }
    const header = guessHeader(R);
    const colOpts = (hdr) => range(R.c0, R.c1).map(c => `<option value="${c}">${escapeHtml(hdr && displayText(R.r0, c) ? displayText(R.r0, c) : 'Column ' + getColumnName(c))}</option>`).join('');
    const r = await openDialog({
        title: 'Sort', width: 440,
        body: `<label class="dlg-check"><input type="checkbox" id="cs-head"${header ? ' checked' : ''}> My data has headers</label>
            <div class="sort-row"><span>Sort by</span><select id="cs-c1">${colOpts(header)}</select><select id="cs-o1"><option value="0">A → Z (smallest first)</option><option value="1">Z → A (largest first)</option></select></div>
            <div class="sort-row"><span>Then by</span><select id="cs-c2"><option value="-1">(none)</option>${colOpts(header)}</select><select id="cs-o2"><option value="0">A → Z</option><option value="1">Z → A</option></select></div>
            <p class="dlg-hint">Sorting ${rangeText(R)}!</p>`,
        onOpen: (d) => {
            d.querySelector('#cs-c1').value = Math.max(R.c0, Math.min(R.c1, sel.act.c));
            d.querySelector('#cs-head').addEventListener('change', (e) => {
                const v1 = d.querySelector('#cs-c1').value, v2 = d.querySelector('#cs-c2').value;
                d.querySelector('#cs-c1').innerHTML = colOpts(e.target.checked);
                d.querySelector('#cs-c2').innerHTML = '<option value="-1">(none)</option>' + colOpts(e.target.checked);
                d.querySelector('#cs-c1').value = v1;
                d.querySelector('#cs-c2').value = v2;
            });
        },
    });
    if (r.value !== 'ok') return;
    const d = r.el;
    const keys = [{ c: +d.querySelector('#cs-c1').value, desc: d.querySelector('#cs-o1').value === '1' }];
    const c2 = +d.querySelector('#cs-c2').value;
    if (c2 >= 0) keys.push({ c: c2, desc: d.querySelector('#cs-o2').value === '1' });
    sortRows(R, keys, d.querySelector('#cs-head').checked);
}

// ==========================================
// FILTER
// ==========================================
function computeFilterHidden() {
    filterHidden = {};
    const f = sh().filter;
    if (!f || !f.cols) return;
    const cols = Object.keys(f.cols).filter(k => f.cols[k] && f.cols[k].length);
    if (!cols.length) return;
    for (let r = f.r0 + 1; r <= f.r1; r++) {
        for (const k of cols) {
            if (f.cols[k].includes(displayText(r, +k))) { filterHidden[r] = 1; break; }
        }
    }
}

function toggleFilter() {
    const s = sh();
    if (s.filter) {
        change(() => { s.filter = null; }, { rebuild: true });
        toast('Filter removed!');
        return;
    }
    let R = rng();
    if (rangeSize(R) === 1) {
        if (!hasData(R.r0, R.c0)) { toast('Pick a cell inside your data first!'); return; }
        R = currentRegion(R.r0, R.c0);
    }
    if (R.r0 === R.r1) { const u = usedBounds(); R = Object.assign({}, R, { r1: Math.max(R.r1, u.r1) }); }
    change(() => { s.filter = { r0: R.r0, c0: R.c0, r1: R.r1, c1: R.c1, cols: {} }; }, { rebuild: true });
    for (let c = R.c0; c <= R.c1; c++) animCell(R.r0, c, 'pop', (c - R.c0) * 40);
    toast('Filter on! Use the arrows in the header row!');
}

function applyFilterCol(c, excluded) {
    const s = sh();
    const before = Object.assign({}, filterHidden);
    change(() => {
        if (!s.filter.cols) s.filter.cols = {};
        if (excluded && excluded.length) s.filter.cols[c] = excluded; else delete s.filter.cols[c];
    }, { rebuild: true });
    // Rows coming back slide in!
    let n = 0;
    for (const k of Object.keys(before)) if (!filterHidden[k] && n < 60) { const r = +k; for (let cc = s.filter.c0; cc <= s.filter.c1; cc++) animCell(r, cc, 'in', n * 20); n++; }
}

function openFilterMenu(c, btn) {
    const s = sh();
    const f = s.filter;
    if (!f) return;
    if (isEditing()) commitEdit(0, 0);
    // Values visible under the other columns' filters!
    const others = Object.keys(f.cols || {}).filter(k => +k !== c && f.cols[k] && f.cols[k].length);
    const counts = new Map();
    for (let r = f.r0 + 1; r <= f.r1; r++) {
        if (others.some(k => f.cols[k].includes(displayText(r, +k)))) continue;
        const t = displayText(r, c);
        counts.set(t, (counts.get(t) || 0) + 1);
    }
    const vals = [...counts.keys()].sort((a, b) => a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, undefined, { numeric: true }));
    const excluded = new Set((f.cols && f.cols[c]) || []);
    const head = displayText(f.r0, c) || 'Column ' + getColumnName(c);
    const node = document.createElement('div');
    node.className = 'flt-menu';
    node.innerHTML = `<button class="m-item" data-fs="asc"><span class="m-ico">${ico('sortAsc')}</span><span class="m-label">Sort A to Z</span></button>
        <button class="m-item" data-fs="desc"><span class="m-ico">${ico('sortDesc')}</span><span class="m-label">Sort Z to A</span></button>
        <div class="m-sep"></div>
        <button class="m-item" data-fs="clear"${excluded.size ? '' : ' disabled'}><span class="m-ico">${ico('funnelX')}</span><span class="m-label">Clear Filter From "${escapeHtml(head.slice(0, 24))}"</span></button>
        <div class="m-sep"></div>
        <input class="flt-search" placeholder="Search" spellcheck="false">
        <div class="flt-list"><label class="flt-all"><input type="checkbox" data-all="1"> <b>(Select All)</b></label>${vals.map((v, i) => `<label><input type="checkbox" data-v="${i}"${excluded.has(v) ? '' : ' checked'}> ${v === '' ? '<em>(Blanks)</em>' : escapeHtml(v)} <small>${counts.get(v)}</small></label>`).join('')}</div>
        <div class="flt-foot"><button class="dlg-btn primary" data-fs="ok">OK</button><button class="dlg-btn" data-fs="cancel">Cancel</button></div>`;
    const syncAll = () => {
        const boxes = [...node.querySelectorAll('[data-v]')].filter(b => b.closest('label').style.display !== 'none');
        const all = node.querySelector('[data-all]');
        all.checked = boxes.every(b => b.checked);
        all.indeterminate = !all.checked && boxes.some(b => b.checked);
    };
    node.addEventListener('mousedown', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
    node.addEventListener('change', (e) => {
        if (e.target.dataset.all) node.querySelectorAll('[data-v]').forEach(b => { if (b.closest('label').style.display !== 'none') b.checked = e.target.checked; });
        syncAll();
    });
    node.querySelector('.flt-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        node.querySelectorAll('[data-v]').forEach(b => { const v = vals[+b.dataset.v]; b.closest('label').style.display = !q || v.toLowerCase().includes(q) ? '' : 'none'; });
        syncAll();
    });
    node.addEventListener('click', (e) => {
        const b = e.target.closest('[data-fs]');
        if (!b) return;
        const act = b.dataset.fs;
        closeMenus(0);
        if (act === 'asc' || act === 'desc') sortRows({ r0: f.r0, r1: f.r1, c0: f.c0, c1: f.c1 }, [{ c, desc: act === 'desc' }], true);
        if (act === 'clear') applyFilterCol(c, null);
        if (act === 'ok') {
            const q = node.querySelector('.flt-search').value;
            const ex = [];
            node.querySelectorAll('[data-v]').forEach(cb => {
                const hiddenBySearch = q && cb.closest('label').style.display === 'none';
                if (!cb.checked || hiddenBySearch) ex.push(vals[+cb.dataset.v]);
            });
            if (ex.length === vals.length) { toast('Keep at least one value!'); return; }
            applyFilterCol(c, ex);
        }
        focusGrid();
    });
    syncAll();
    openMenu(btn, [{ node }], { cls: 'flt-pop' });
    setTimeout(() => node.querySelector('.flt-search').focus(), 30);
}

function filterByValue() {
    const s = sh();
    const { r, c } = sel.act;
    if (!s.filter) {
        if (!hasData(r, c)) { toast('Pick a cell with a value first!'); return; }
        const R = currentRegion(r, c);
        if (R.r0 === r) { toast('Pick a value below the header row!'); return; }
        s.filter = { r0: R.r0, c0: R.c0, r1: R.r1, c1: R.c1, cols: {} };
    }
    const f = s.filter;
    if (c < f.c0 || c > f.c1 || r <= f.r0 || r > f.r1) { toast('That cell is outside the filtered data!'); return; }
    const keep = displayText(r, c);
    const ex = new Set();
    for (let rr = f.r0 + 1; rr <= f.r1; rr++) { const t = displayText(rr, c); if (t !== keep) ex.add(t); }
    applyFilterCol(c, [...ex]);
    toast('Showing rows where ' + (displayText(f.r0, c) || getColumnName(c)) + ' is "' + keep + '"!');
}

// ==========================================
// NOTES
// ==========================================
let noteEdit = null;

function notePop() {
    return document.getElementById('note-pop');
}

function placeNote(r, c) {
    const pop = notePop();
    const td = cellEls[r] && cellEls[r][c];
    if (!td) return;
    const rect = td.getBoundingClientRect();
    let x = rect.right + 14, y = rect.top - 4;
    if (x + 230 > window.innerWidth) x = rect.left - 244;
    pop.style.left = Math.max(6, x) + 'px';
    pop.style.top = Math.max(6, Math.min(window.innerHeight - 150, y)) + 'px';
}

function editNote(r, c) {
    if (isEditing()) commitEdit(0, 0);
    selectCell(r, c, { scroll: true });
    const pop = notePop();
    const ta = document.getElementById('note-text');
    noteEdit = { r, c, sheet: sh().id };
    ta.value = sh().notes[idOf(r, c)] || '';
    ta.readOnly = false;
    pop.hidden = false;
    pop.classList.add('editing');
    placeNote(r, c);
    restartAnim(pop, 'pop');
    setTimeout(() => ta.focus(), 20);
}

function closeNoteEdit() {
    if (!noteEdit) return;
    const pop = notePop();
    const { r, c, sheet } = noteEdit;
    noteEdit = null;
    pop.hidden = true;
    pop.classList.remove('editing');
    const s = book.sheets.find(x => x.id === sheet);
    if (!s) return;
    const id = idOf(r, c);
    const text = document.getElementById('note-text').value.trim();
    if ((s.notes[id] || '') === text) { focusGrid(); return; }
    change(() => { if (text) s.notes[id] = text; else delete s.notes[id]; });
    focusGrid();
}

function wireNotes() {
    const ta = document.getElementById('note-text');
    ta.addEventListener('blur', () => setTimeout(closeNoteEdit, 0));
    ta.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); ta.blur(); }
    });
    let hoverT = null, hoverCell = null;
    const inner = document.getElementById('grid-inner');
    inner.addEventListener('mousemove', (e) => {
        if (noteEdit || drag) return;
        const td = e.target.closest('td.has-note');
        const key = td ? td.dataset.r + ':' + td.dataset.c : null;
        if (key === hoverCell) return;
        hoverCell = key;
        clearTimeout(hoverT);
        const pop = notePop();
        if (!td) { pop.hidden = true; return; }
        hoverT = setTimeout(() => {
            const r = +td.dataset.r, c = +td.dataset.c;
            ta.value = sh().notes[idOf(r, c)] || '';
            ta.readOnly = true;
            pop.hidden = false;
            placeNote(r, c);
            restartAnim(pop, 'pop');
        }, 280);
    });
    inner.addEventListener('mouseleave', () => { clearTimeout(hoverT); hoverCell = null; if (!noteEdit) notePop().hidden = true; });
}

// ==========================================
// FREEZE PANES
// ==========================================
function setFreeze(r, c) {
    change(() => { sh().freeze = { r, c }; }, { rebuild: true });
    toast(r || c ? 'Panes frozen! Scroll to see them stay put!' : 'Panes unfrozen!');
}

// ==========================================
// DATA TOOLS
// ==========================================
async function textToColumns() {
    const R = rng();
    if (R.c0 !== R.c1) { toast('Select cells in just one column!'); return; }
    const r = await openDialog({
        title: 'Text to Columns', width: 380,
        body: `<p class="dlg-text">Split each cell of ${rangeText(R)} at:</p>
            <div class="radio-col">
                <label><input type="radio" name="ttc" value="," checked> Comma</label>
                <label><input type="radio" name="ttc" value="&#9;"> Tab</label>
                <label><input type="radio" name="ttc" value=";"> Semicolon</label>
                <label><input type="radio" name="ttc" value=" "> Space</label>
                <label><input type="radio" name="ttc" value="other"> Other: <input class="dlg-input tiny" id="ttc-other" maxlength="3"></label>
            </div>`,
    });
    if (r.value !== 'ok') return;
    let d = r.el.querySelector('input[name=ttc]:checked').value;
    if (d === 'other') d = r.el.querySelector('#ttc-other').value || ',';
    const s = sh();
    let maxParts = 1;
    const splits = [];
    for (let rr = R.r0; rr <= R.r1; rr++) {
        const raw = s.data[idOf(rr, R.c0)];
        const parts = raw === undefined || raw[0] === '=' ? null : (d === ' ' ? raw.trim().split(/\s+/) : raw.split(d)).map(x => x.trim());
        splits.push(parts);
        if (parts) maxParts = Math.max(maxParts, parts.length);
    }
    if (maxParts < 2) { toast("Nothing to split with that separator!"); return; }
    let covers = false;
    for (let rr = R.r0; rr <= R.r1; rr++) for (let cc = R.c0 + 1; cc < R.c0 + maxParts; cc++) if (hasData(rr, cc)) covers = true;
    if (covers && !(await confirmDialog('Replace Data?', 'There is already data in the columns to the right! Replace it?', 'Replace'))) return;
    let grew = false;
    change(() => {
        grew = ensureSize(s, R.r1, R.c0 + maxParts);
        splits.forEach((parts, i) => { if (parts) parts.forEach((p, j) => { setRaw(s, R.r0 + i, R.c0 + j, p); autoFormat(s, R.r0 + i, R.c0 + j, p); }); });
    }, { rebuild: grew });
    cascadeIn({ r0: R.r0, r1: R.r1, c0: R.c0, c1: R.c0 + maxParts - 1 });
}

async function removeDuplicates() {
    const R = sortTarget();
    if (!R) { toast('Pick a cell inside your data first!'); return; }
    const header = guessHeader(R);
    const r = await openDialog({
        title: 'Remove Duplicates', width: 380,
        body: `<label class="dlg-check"><input type="checkbox" id="rd-head"${header ? ' checked' : ''}> My data has headers</label><p class="dlg-text">Columns to compare:</p>
            <div class="radio-col">${range(R.c0, R.c1).map(c => `<label><input type="checkbox" data-rc="${c}" checked> ${escapeHtml((header && displayText(R.r0, c)) || 'Column ' + getColumnName(c))}</label>`).join('')}</div>`,
    });
    if (r.value !== 'ok') return;
    const cols = [...r.el.querySelectorAll('[data-rc]:checked')].map(b => +b.dataset.rc);
    if (!cols.length) return;
    const hasHead = r.el.querySelector('#rd-head').checked;
    const s = sh();
    const top = R.r0 + (hasHead ? 1 : 0);
    const seen = new Set();
    const keepRows = [];
    for (let rr = top; rr <= R.r1; rr++) {
        const key = cols.map(c => displayText(rr, c).toLowerCase()).join('\u0001');
        if (seen.has(key)) continue;
        seen.add(key);
        keepRows.push(rr);
    }
    const removed = R.r1 - top + 1 - keepRows.length;
    if (!removed) { toast('No duplicates found!'); return; }
    change(() => {
        const rows = keepRows.map(rr => range(R.c0, R.c1).map(c => ({ raw: s.data[idOf(rr, c)], st: s.styles[idOf(rr, c)], from: rr })));
        for (let rr = top; rr <= R.r1; rr++) for (let c = R.c0; c <= R.c1; c++) { delete s.data[idOf(rr, c)]; delete s.styles[idOf(rr, c)]; }
        rows.forEach((row, i) => row.forEach((cell, j) => {
            const raw = cell.raw && cell.raw[0] === '=' ? FormulaEngine.shiftFormula(cell.raw, top + i - cell.from, 0) : cell.raw;
            setRaw(s, top + i, R.c0 + j, raw);
            if (cell.st) s.styles[idOf(top + i, R.c0 + j)] = cell.st;
        }));
    });
    poof({ r0: top + keepRows.length, r1: R.r1, c0: R.c0, c1: R.c1 });
    toast(`Removed ${removed} duplicate row${removed === 1 ? '' : 's'}! ${keepRows.length} unique row${keepRows.length === 1 ? '' : 's'} left!`);
}

function trimSpaces() {
    const s = sh();
    let n = 0;
    change(() => {
        forEachSelected((r, c) => {
            const id = idOf(r, c);
            const v = s.data[id];
            if (!v || v[0] === '=') return;
            const t = v.replace(/\s+/g, ' ').trim();
            if (t !== v) { setRaw(s, r, c, t); n++; }
        });
    });
    toast(n ? `Trimmed ${n} cell${n === 1 ? '' : 's'}!` : 'Nothing needed trimming!');
}

async function fillSeriesDialog() {
    const R = rng();
    const startV = valueAt(sel.act.r, sel.act.c);
    const r = await openDialog({
        title: 'Series', width: 360,
        body: `<div class="radio-row"><label><input type="radio" name="sd" value="col"${R.r1 > R.r0 || R.c0 === R.c1 ? ' checked' : ''}> Columns (down)</label><label><input type="radio" name="sd" value="row"${R.r1 === R.r0 && R.c1 > R.c0 ? ' checked' : ''}> Rows (across)</label></div>
            <div class="radio-row"><label><input type="radio" name="st" value="lin" checked> Linear</label><label><input type="radio" name="st" value="grow"> Growth</label></div>
            <label class="dlg-field inline"><span>Start value</span><input class="dlg-input" id="sr-start" value="${typeof startV === 'number' ? startV : 1}"></label>
            <label class="dlg-field inline"><span>Step value</span><input class="dlg-input" id="sr-step" value="1"></label>
            <label class="dlg-field inline"><span>Stop value</span><input class="dlg-input" id="sr-stop" placeholder="(fill the selection)"></label>`,
    });
    if (r.value !== 'ok') return;
    const d = r.el;
    const down = d.querySelector('input[name=sd]:checked').value === 'col';
    const growth = d.querySelector('input[name=st]:checked').value === 'grow';
    const start = parseFloat(d.querySelector('#sr-start').value) || 0;
    const step = parseFloat(d.querySelector('#sr-step').value) || 1;
    const stopTxt = d.querySelector('#sr-stop').value.trim();
    const stop = stopTxt === '' ? null : parseFloat(stopTxt);
    const s = sh();
    const cells = [];
    if (stop !== null) {
        let v = start, i = 0;
        while ((step > 0 || growth ? v <= stop : v >= stop) && i < 5000) {
            cells.push(down ? { r: R.r0 + i, c: R.c0 } : { r: R.r0, c: R.c0 + i });
            i++;
            v = growth ? v * step : v + step;
            if (growth && (step <= 1 && step >= -1)) break;
        }
    } else {
        const n = down ? R.r1 - R.r0 + 1 : R.c1 - R.c0 + 1;
        for (let i = 0; i < Math.max(n, 2); i++) cells.push(down ? { r: R.r0 + i, c: R.c0 } : { r: R.r0, c: R.c0 + i });
    }
    let grew = false;
    change(() => {
        const last = cells[cells.length - 1];
        grew = ensureSize(s, last.r, last.c + 1);
        let v = start;
        cells.forEach((p) => { setRaw(s, p.r, p.c, String(parseFloat(v.toPrecision(12)))); v = growth ? v * step : v + step; });
    }, { rebuild: grew });
    cells.slice(0, 300).forEach((p, i) => animCell(p.r, p.c, 'in', i * 18));
}

async function randomFill() {
    const r = await openDialog({
        title: 'Random Numbers', width: 340,
        body: `<label class="dlg-field inline"><span>Smallest</span><input class="dlg-input" id="rn-lo" value="1"></label>
            <label class="dlg-field inline"><span>Largest</span><input class="dlg-input" id="rn-hi" value="100"></label>
            <label class="dlg-check"><input type="checkbox" id="rn-int" checked> Whole numbers only</label>
            <p class="dlg-hint">Fills every selected cell with a fixed random value!</p>`,
    });
    if (r.value !== 'ok') return;
    const lo = parseFloat(r.el.querySelector('#rn-lo').value) || 0, hi = parseFloat(r.el.querySelector('#rn-hi').value) || 0;
    const ints = r.el.querySelector('#rn-int').checked;
    const s = sh();
    change(() => forEachSelected((rr, c) => {
        const v = ints ? Math.floor(Math.min(lo, hi) + Math.random() * (Math.abs(hi - lo) + 1)) : Math.min(lo, hi) + Math.random() * Math.abs(hi - lo);
        setRaw(s, rr, c, String(ints ? v : Math.round(v * 100) / 100));
    }));
    forEachSelected((rr, c) => animCell(rr, c, 'in', Math.random() * 300));
}

// ==========================================
// TEMPLATES
// ==========================================
function put(s, ref, val, st) {
    if (val !== null && val !== undefined && val !== '') s.data[ref] = String(val);
    if (st) s.styles[ref] = Object.assign({}, s.styles[ref] || {}, st);
}

function putRow(s, ref, vals, st) {
    const p = rcOf(ref);
    vals.forEach((v, i) => put(s, idOf(p.r, p.c + i), v, typeof st === 'function' ? st(i) : st));
}

function styleRange(s, R, st) {
    for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) s.styles[idOf(r, c)] = Object.assign({}, s.styles[idOf(r, c)] || {}, st);
}

function tableLook(s, R, color) {
    const band = mixHex(color, '#ffffff', 0.85), line = mixHex(color, '#ffffff', 0.5);
    for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) {
        const id = idOf(r, c);
        const st = Object.assign({}, s.styles[id] || {});
        if (r === R.r0) Object.assign(st, { fill: color, color: '#ffffff', b: true });
        else { if ((r - R.r0) % 2 === 0) st.fill = band; st.bb = 'thin ' + line; }
        s.styles[id] = st;
    }
}

const TITLE = { size: 20, b: true, color: '#1e5631' };

function tplBudget() {
    const s = newSheet('Budget', 60, 14);
    put(s, 'A1', 'Monthly Budget', TITLE);
    put(s, 'A2', 'Change the blue numbers and everything else updates!', { color: '#7f7f7f', i: true });
    putRow(s, 'A4', ['Income', 'Amount']);
    [['Salary', 4200], ['Side gig', 650], ['Other', 120]].forEach((x, i) => putRow(s, idOf(5 + i, 0), x));
    putRow(s, 'A8', ['Total Income', '=SUM(B5:B7)'], { b: true });
    tableLook(s, { r0: 4, r1: 7, c0: 0, c1: 1 }, '#548235');
    styleRange(s, { r0: 8, r1: 8, c0: 0, c1: 1 }, { bt: 'thin #548235', bb: 'double #548235' });
    putRow(s, 'D4', ['Category', 'Budget', 'Actual', 'Difference', '% of Income']);
    const rows = [['Rent', 1400, 1400], ['Groceries', 450, 512], ['Utilities', 180, 164], ['Transport', 220, 198], ['Fun', 250, 310], ['Savings', 800, 800], ['Health', 120, 95], ['Subscriptions', 60, 72]];
    rows.forEach((x, i) => {
        const r = 5 + i;
        putRow(s, idOf(r, 3), [x[0], x[1], x[2], `=E${r}-F${r}`, `=F${r}/$B$8`]);
    });
    putRow(s, 'D13', ['Total', '=SUM(E5:E12)', '=SUM(F5:F12)', '=SUM(G5:G12)', '=SUM(H5:H12)'], { b: true });
    tableLook(s, { r0: 4, r1: 12, c0: 3, c1: 7 }, '#2e75b6');
    styleRange(s, { r0: 13, r1: 13, c0: 3, c1: 7 }, { bt: 'thin #2e75b6', bb: 'double #2e75b6' });
    styleRange(s, { r0: 5, r1: 7, c0: 1, c1: 1 }, { color: '#1f4e9a' });
    styleRange(s, { r0: 5, r1: 12, c0: 4, c1: 5 }, { color: '#1f4e9a' });
    styleRange(s, { r0: 5, r1: 8, c0: 1, c1: 1 }, { fmt: 'currency', dec: 0 });
    styleRange(s, { r0: 5, r1: 13, c0: 4, c1: 6 }, { fmt: 'currency', dec: 0 });
    styleRange(s, { r0: 5, r1: 13, c0: 7, c1: 7 }, { fmt: 'percent', dec: 1 });
    put(s, 'A10', 'Left Over', { b: true, size: 14 });
    put(s, 'B10', '=B8-F13', { b: true, size: 14, fmt: 'currency', dec: 0, fill: GEL_COLORS[0] });
    put(s, 'A11', '=IF(B10>=0,"=G=On track!=G=","=R=Over budget!=R=")');
    s.colW = { 0: 120, 1: 96, 2: 24, 3: 120, 4: 90, 5: 90, 6: 96, 7: 96 };
    s.rowH = { 1: 34, 10: 28 };
    s.cf.push({ id: uid(), r0: 5, r1: 12, c0: 5, c1: 5, type: 'bar', color: CF_BARS.Blue });
    s.cf.push({ id: uid(), r0: 5, r1: 12, c0: 6, c1: 6, type: 'cell', op: 'lt', a: '0', preset: 'red' });
    s.cf.push({ id: uid(), r0: 5, r1: 12, c0: 6, c1: 6, type: 'cell', op: 'gt', a: '0', preset: 'green' });
    s.charts.push({ id: uid(), type: 'doughnut', src: { r0: 4, r1: 12, c0: 3, c1: 5 }, x: 800, y: 60, w: 380, h: 300, title: 'Where the money goes' });
    return s;
}

function tplSales() {
    const s = newSheet('Sales', 60, 16);
    put(s, 'A1', 'Sales Tracker', TITLE);
    put(s, 'A2', 'First half of the year, by region!', { color: '#7f7f7f', i: true });
    putRow(s, 'A4', ['Region', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Total', 'Trend', 'Best Month']);
    const data = [['North', 18, 22, 25, 24, 29, 33], ['South', 26, 24, 21, 23, 27, 25], ['East', 12, 15, 19, 22, 21, 28], ['West', 30, 28, 33, 35, 38, 41], ['Central', 9, 14, 13, 17, 16, 20]];
    data.forEach((x, i) => {
        const r = 5 + i;
        putRow(s, idOf(r, 0), x.map(v => typeof v === 'number' ? v * 1000 : v).concat([`=SUM(B${r}:G${r})`, '', `=INDEX($B$4:$G$4,MATCH(MAX(B${r}:G${r}),B${r}:G${r},0))`]));
        s.sparks[idOf(r, 8)] = { type: 'line', src: `B${r}:G${r}` };
    });
    putRow(s, 'A10', ['Total', '=SUM(B5:B9)', '=SUM(C5:C9)', '=SUM(D5:D9)', '=SUM(E5:E9)', '=SUM(F5:F9)', '=SUM(G5:G9)', '=SUM(H5:H9)'], { b: true });
    tableLook(s, { r0: 4, r1: 9, c0: 0, c1: 9 }, '#c55a11');
    styleRange(s, { r0: 10, r1: 10, c0: 0, c1: 9 }, { bt: 'thin #c55a11', bb: 'double #c55a11' });
    styleRange(s, { r0: 5, r1: 10, c0: 1, c1: 7 }, { fmt: 'currency', dec: 0 });
    styleRange(s, { r0: 4, r1: 10, c0: 9, c1: 9 }, { align: 'center' });
    put(s, 'A12', 'Top region', { b: true });
    put(s, 'B12', '=INDEX(A5:A9,MATCH(MAX(H5:H9),H5:H9,0))', { b: true, color: '#c55a11' });
    put(s, 'A13', 'Growth Jan→Jun', { b: true });
    put(s, 'B13', '=G10/B10-1', { fmt: 'percent', dec: 1, b: true });
    s.colW = { 0: 110, 8: 110, 9: 96 };
    s.rowH = { 1: 34 };
    s.cf.push({ id: uid(), r0: 5, r1: 9, c0: 1, c1: 6, type: 'scale', colors: CF_SCALES['Red - Yellow - Green'] });
    s.cf.push({ id: uid(), r0: 5, r1: 9, c0: 7, c1: 7, type: 'icons', set: 'Arrows' });
    s.freeze = { r: 4, c: 1 };
    s.charts.push({ id: uid(), type: 'column', src: { r0: 4, r1: 9, c0: 0, c1: 6 }, x: 40, y: 360, w: 560, h: 300, title: 'Monthly sales by region' });
    return s;
}

function tplGrades() {
    const s = newSheet('Grades', 60, 14);
    put(s, 'A1', 'Gradebook', TITLE);
    put(s, 'A2', 'Averages, letter grades and class stats fill themselves in!', { color: '#7f7f7f', i: true });
    putRow(s, 'A4', ['Student', 'Quiz 1', 'Quiz 2', 'Midterm', 'Project', 'Final', 'Average', 'Grade', 'Submitted']);
    const names = ['Avery', 'Blake', 'Casey', 'Devon', 'Emerson', 'Finley', 'Harper', 'Jordan', 'Kai', 'Logan'];
    const scores = [[92, 88, 95, 90, 94], [78, 82, 74, 88, 80], [65, 70, 58, 72, 68], [88, 91, 85, 93, 90], [55, 62, 60, 70, 58], [97, 99, 94, 98, 96], [82, 79, 88, 84, 86], [71, 68, 75, 80, 73], [90, 85, 89, 87, 92], [60, 74, 66, 65, 71]];
    names.forEach((n, i) => {
        const r = 5 + i;
        putRow(s, idOf(r, 0), [n].concat(scores[i], [`=ROUND(AVERAGE(B${r}:F${r}),1)`, `=IFS(G${r}>=90,"A",G${r}>=80,"B",G${r}>=70,"C",G${r}>=60,"D",TRUE,"F")`, i % 4 === 3 ? 'FALSE' : 'TRUE']));
        s.styles[idOf(r, 8)] = { check: true };
    });
    tableLook(s, { r0: 4, r1: 14, c0: 0, c1: 8 }, '#7030a0');
    styleRange(s, { r0: 4, r1: 14, c0: 7, c1: 8 }, { align: 'center' });
    styleRange(s, { r0: 5, r1: 14, c0: 7, c1: 7 }, { b: true });
    putRow(s, 'A16', ['Class average', '=AVERAGE(B5:B14)', '=AVERAGE(C5:C14)', '=AVERAGE(D5:D14)', '=AVERAGE(E5:E14)', '=AVERAGE(F5:F14)', '=AVERAGE(G5:G14)'], { b: true, fmt: 'number', dec: 1 });
    put(s, 'A16', 'Class average', { b: true });
    put(s, 'A17', 'Highest', { b: true }); put(s, 'G17', '=MAX(G5:G14)');
    put(s, 'A18', 'Lowest', { b: true }); put(s, 'G18', '=MIN(G5:G14)');
    put(s, 'A19', "A's", { b: true }); put(s, 'G19', '=COUNTIF(H5:H14,"A")');
    put(s, 'A20', 'Submitted', { b: true }); put(s, 'G20', '=COUNTIF(I5:I14,TRUE)&" of "&ROWS(I5:I14)');
    s.colW = { 0: 110, 6: 90 };
    s.rowH = { 1: 34 };
    s.cf.push({ id: uid(), r0: 5, r1: 14, c0: 1, c1: 5, type: 'cell', op: 'lt', a: '70', preset: 'red' });
    s.cf.push({ id: uid(), r0: 5, r1: 14, c0: 6, c1: 6, type: 'icons', set: 'Traffic Lights' });
    s.cf.push({ id: uid(), r0: 5, r1: 14, c0: 6, c1: 6, type: 'bar', color: CF_BARS.Purple });
    s.filter = { r0: 4, c0: 0, r1: 14, c1: 8, cols: {} };
    // Chart data lives in K:L so the chart gets names and averages side by side!
    putRow(s, 'K4', ['Student', 'Average'], { b: true, color: '#7f7f7f' });
    names.forEach((n, i) => putRow(s, idOf(5 + i, 10), [`=A${5 + i}`, `=G${5 + i}`], { color: '#7f7f7f' }));
    s.charts.push({ id: uid(), type: 'bar', src: { r0: 4, r1: 14, c0: 10, c1: 11 }, x: 60, y: 560, w: 520, h: 320, title: 'Average by student' });
    return s;
}

function tplTasks() {
    const s = newSheet('Tasks', 60, 12);
    put(s, 'A1', 'To-Do List', TITLE);
    put(s, 'A2', 'Tick the boxes as you go! Due dates count down from today!', { color: '#7f7f7f', i: true });
    putRow(s, 'A4', ['Done', 'Task', 'Priority', 'Due', 'Days Left', 'Status']);
    const tasks = [['TRUE', 'Plan the week', '#G#Low#', 0], ['FALSE', 'Finish the report', '#R#High#', 1], ['FALSE', 'Call the bank', '#Y#Medium#', 3], ['FALSE', 'Book flights', '#R#High#', -1], ['TRUE', 'Water the plants', '#G#Low#', 2], ['FALSE', 'Update the budget', '#Y#Medium#', 6], ['FALSE', 'Gym session', '#G#Low#', 1]];
    tasks.forEach((t, i) => {
        const r = 5 + i;
        putRow(s, idOf(r, 0), [t[0], t[1], t[2], `=TODAY()${t[3] >= 0 ? '+' : '-'}${Math.abs(t[3])}`, `=D${r}-TODAY()`, `=IF(A${r},"Done",IF(E${r}<0,"Overdue",IF(E${r}<=2,"Due soon","On track")))`]);
        s.styles[idOf(r, 0)] = { check: true };
        s.styles[idOf(r, 3)] = { fmt: 'date' };
    });
    tableLook(s, { r0: 4, r1: 11, c0: 0, c1: 5 }, '#00897b');
    styleRange(s, { r0: 4, r1: 11, c0: 0, c1: 0 }, { align: 'center' });
    styleRange(s, { r0: 4, r1: 11, c0: 2, c1: 2 }, { align: 'center' });
    put(s, 'H4', 'Done', { b: true }); put(s, 'I4', '=COUNTIF(A5:A11,TRUE)&" / "&COUNTA(B5:B11)', { b: true });
    put(s, 'H5', 'Progress', { b: true }); put(s, 'I5', '=COUNTIF(A5:A11,TRUE)/COUNTA(B5:B11)', { fmt: 'percent', b: true });
    s.colW = { 0: 56, 1: 170, 2: 96, 3: 96, 7: 80, 8: 90 };
    s.rowH = { 1: 34, 5: 28, 6: 28, 7: 28, 8: 28, 9: 28, 10: 28, 11: 28 };
    s.cf.push({ id: uid(), r0: 5, r1: 11, c0: 5, c1: 5, type: 'cell', op: 'contains', a: 'Overdue', preset: 'red' });
    s.cf.push({ id: uid(), r0: 5, r1: 11, c0: 5, c1: 5, type: 'cell', op: 'contains', a: 'Due soon', preset: 'yellow' });
    s.cf.push({ id: uid(), r0: 5, r1: 11, c0: 5, c1: 5, type: 'cell', op: 'contains', a: 'Done', preset: 'green' });
    s.cf.push({ id: uid(), r0: 5, r1: 5, c0: 8, c1: 8, type: 'bar', color: CF_BARS.Green });
    s.filter = { r0: 4, c0: 0, r1: 11, c1: 5, cols: {} };
    return s;
}

const THUMB_COL = '<svg viewBox="0 0 60 36"><rect x="6" y="18" width="8" height="14" fill="#fff" opacity=".9"/><rect x="18" y="10" width="8" height="22" fill="#fff" opacity=".9"/><rect x="30" y="14" width="8" height="18" fill="#fff" opacity=".9"/><rect x="42" y="6" width="8" height="26" fill="#fff" opacity=".9"/></svg>';
const TEMPLATES = [
    { name: 'Monthly Budget', desc: 'Income, spending, data bars and a doughnut chart!', color: '#2e75b6', thumb: '<svg viewBox="0 0 60 36"><circle cx="30" cy="18" r="12" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="40 36"/><circle cx="30" cy="18" r="12" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-dasharray="36 40" stroke-dashoffset="-40"/></svg>', build: () => [tplBudget()] },
    { name: 'Sales Tracker', desc: 'Color scales, sparklines and a column chart!', color: '#c55a11', thumb: THUMB_COL, build: () => [tplSales()] },
    { name: 'Gradebook', desc: 'Averages, letter grades, icons and checkboxes!', color: '#7030a0', thumb: '<svg viewBox="0 0 60 36"><text x="30" y="27" font-size="22" font-weight="800" text-anchor="middle" fill="#fff">A+</text></svg>', build: () => [tplGrades()] },
    { name: 'To-Do List', desc: 'Checkboxes, due dates and Keydown chips!', color: '#00897b', thumb: '<svg viewBox="0 0 60 36" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M10 12l3 3 6-6M26 12h24M10 25l3 3 6-6M26 25h18"/></svg>', build: () => [tplTasks()] },
];

async function loadTemplate(i, asShowcase) {
    const t = TEMPLATES[i];
    const sheets = asShowcase ? TEMPLATES.flatMap(x => x.build()) : t.build();
    const hasData = book.sheets.some(s => Object.keys(s.data).length);
    if (hasData) {
        const r = await openDialog({
            title: asShowcase ? 'Sample Workbook' : t.name,
            body: `<p class="dlg-text">Where should ${asShowcase ? 'the samples' : 'this template'} go?</p>`,
            buttons: [{ label: 'Add as New Sheets', value: 'add', primary: true }, { label: 'Replace Workbook', value: 'replace' }, { label: 'Cancel', value: null }],
        });
        if (!r.value) return;
        if (r.value === 'add') {
            sheets.forEach(s => { s.name = uniqueSheetName(s.name); });
            pushUndo();
            const at = book.sheets.length;
            book.sheets.push(...sheets);
            recalc();
            animateTemplate(sheets);
            switchSheet(at);
            drawSheetTabs();
            persistSheets();
            return;
        }
    }
    pushUndo();
    book = { name: asShowcase ? 'Imbuer Samples' : t.name, sheets, active: 0 };
    resetTransient();
    recalc();
    animateTemplate(sheets);
    initGrid();
    drawSheetTabs();
    syncBookName();
    persistSheets();
    cascadeIn({ r0: 1, r1: 20, c0: 0, c1: 9 });
}

function animateTemplate(sheets) {
    sheets.forEach(s => s.charts.forEach(ch => animateChartIds.add(ch.id)));
}

// ==========================================
// COMMANDS & MENUS
// ==========================================
// OpenDB pictures live on the sheet as chart-style objects (drag, resize, delete)!
function insertPicture(r) {
    const s = sh();
    const z = zf();
    const sc = scroller();
    const w = 360;
    const h = Math.round(w * ((r.height || 3) / (r.width || 4))) + 44;
    const ch = { id: uid(), type: 'image', img: r.loaded, x: Math.round(sc.scrollLeft / z + 60), y: Math.round(sc.scrollTop / z + 50), w: w, h: h, title: r.withCredit ? r.credit : (r.title || '') };
    animateChartIds.add(ch.id);
    change(() => { s.charts.push(ch); });
    selectedChart = ch;
    renderCharts();
    toast(r.withCredit ? 'Picture added, with its source as the title! Edit the title any time!' : 'Picture added!');
}
function openOnlinePictures() {
    if (!window.RadiiImages) return;
    RadiiImages.open({ title: 'OpenDB Images', accent: '#6bc702', accent2: '#a3e635', glow: 'rgba(107,199,2,.3)', onPick: insertPicture });
}

registerCommands({
    onlinePicture: { label: 'OpenDB Images', icon: 'search', run: () => openOnlinePictures() },
    chartColumn: { label: 'Insert Column Chart', icon: 'chartColumn', run: () => insertChart('column') },
    chartBar: { label: 'Insert Bar Chart', icon: 'chartBar', run: () => insertChart('bar') },
    chartLine: { label: 'Insert Line Chart', icon: 'chartLine', run: () => insertChart('line') },
    chartArea: { label: 'Insert Area Chart', icon: 'chartArea', run: () => insertChart('area') },
    chartPie: { label: 'Insert Pie Chart', icon: 'chartPie', run: () => insertChart('pie') },
    chartDoughnut: { label: 'Insert Doughnut Chart', icon: 'chartDoughnut', run: () => insertChart('doughnut') },
    chartScatter: { label: 'Insert Scatter Chart', icon: 'chartScatter', run: () => insertChart('scatter') },
    sparkLine: { label: 'Line Sparkline', icon: 'sparkLine', run: () => insertSparkline('line') },
    sparkColumn: { label: 'Column Sparkline', icon: 'sparkColumn', run: () => insertSparkline('column') },
    sparkWinLoss: { label: 'Win/Loss Sparkline', icon: 'sparkWin', run: () => insertSparkline('winloss') },
    sortAsc: { label: 'Sort A to Z', icon: 'sortAsc', run: () => quickSort(false) },
    sortDesc: { label: 'Sort Z to A', icon: 'sortDesc', run: () => quickSort(true) },
    customSort: { label: 'Custom Sort', icon: 'sortFilter', run: customSortDialog },
    filter: { label: 'Filter', icon: 'funnel', run: toggleFilter },
    clearFilter: { label: 'Clear Filters', icon: 'funnelX', run: () => { const s = sh(); if (!s.filter) return; change(() => { s.filter.cols = {}; }, { rebuild: true }); toast('Every row is showing again!'); } },
    reapplyFilter: { label: 'Reapply Filter', icon: 'refresh', run: () => { initGrid(); toast('Filter reapplied!'); } },
    filterByValue: { label: 'Filter by Selected Value', icon: 'funnel', run: filterByValue },
    textToColumns: { label: 'Text to Columns', icon: 'split', run: textToColumns },
    removeDupes: { label: 'Remove Duplicates', icon: 'dedupe', run: removeDuplicates },
    trimSpaces: { label: 'Trim Spaces', icon: 'eraser', run: trimSpaces },
    fillSeries: { label: 'Fill Series', icon: 'fillDown', run: fillSeriesDialog },
    randomFill: { label: 'Random Numbers', icon: 'dice', run: randomFill },
    importCsv: { label: 'Import CSV', icon: 'import', run: () => document.getElementById('file-loader-gate').click() },
    exportCsv: { label: 'Export CSV', icon: 'export', run: () => exportDelimited(',') },
    tour: { label: 'Sample Workbook', icon: 'sparkle', run: () => loadTemplate(0, true) },
    manageRules: { label: 'Manage Conditional Formatting Rules', icon: 'condFormat', run: cfManage },
    freezePanes: { label: 'Freeze Panes', icon: 'freeze', run: () => setFreeze(sel.act.r - 1, sel.act.c) },
    freezeTop: { label: 'Freeze Top Row', icon: 'freeze', run: () => setFreeze(1, 0) },
    freezeFirst: { label: 'Freeze First Column', icon: 'freeze', run: () => setFreeze(0, 1) },
    unfreeze: { label: 'Unfreeze Panes', icon: 'freeze', run: () => setFreeze(0, 0) },
    newBlank: { label: 'New Workbook', icon: 'newDoc', run: () => openBackstage('new') },
    openFile: { label: 'Open', icon: 'folder', run: () => openBackstage('open') },
    saveCopy: { label: 'Save a Copy', icon: 'save', run: exportSheetsFile },
});

registerMenus({
    condFormat: () => [
        { label: 'Highlight Cells Rules', icon: 'condFormat', sub: () => [
            { label: 'Greater Than…', run: () => cfRuleDialog('gt') },
            { label: 'Less Than…', run: () => cfRuleDialog('lt') },
            { label: 'Between…', run: () => cfRuleDialog('between') },
            { label: 'Equal To…', run: () => cfRuleDialog('eq') },
            { label: 'Text that Contains…', run: () => cfRuleDialog('contains') },
            { label: 'Duplicate Values…', run: () => cfRuleDialog('dup') },
        ] },
        { label: 'Top/Bottom Rules', icon: 'sortDesc', sub: () => [
            { label: 'Top 10 Items…', run: () => cfRuleDialog('top') },
            { label: 'Bottom 10 Items…', run: () => cfRuleDialog('bottom') },
            { label: 'Above Average', run: () => addCfRule({ type: 'above', preset: 'green' }) },
            { label: 'Below Average', run: () => addCfRule({ type: 'below', preset: 'red' }) },
        ] },
        { sep: true },
        { label: 'Data Bars', icon: 'chartBar', sub: () => Object.keys(CF_BARS).map(k => ({ html: `<span class="cf-sw wide" style="background:linear-gradient(90deg,${CF_BARS[k]},#fff)"></span>${k}`, label: k, run: () => addCfRule({ type: 'bar', color: CF_BARS[k] }) })) },
        { label: 'Color Scales', icon: 'cellStyles', sub: () => Object.keys(CF_SCALES).map(k => ({ html: `<span class="cf-sw wide" style="background:linear-gradient(90deg,${CF_SCALES[k].join(',')})"></span>${k}`, label: k, run: () => addCfRule({ type: 'scale', colors: CF_SCALES[k] }) })) },
        { label: 'Icon Sets', icon: 'sparkle', sub: () => Object.keys(CF_ICONS).map(k => ({ html: `<span class="cf-icons">${CF_ICONS[k].map(i => `<b style="color:${i.color}">${i.ch}</b>`).join('')}</span>${k}`, label: k, run: () => addCfRule({ type: 'icons', set: k }) })) },
        { sep: true },
        { label: 'Clear Rules', icon: 'eraser', sub: () => [
            { label: 'Clear Rules from Selected Cells', run: () => cfClear(false) },
            { label: 'Clear Rules from Entire Sheet', run: () => cfClear(true) },
        ] },
        { label: 'Manage Rules…', icon: 'format', run: cfManage },
    ],
    cellStyles: (el) => {
        openMenu(el, [{
            html: galleryHtml(CELL_STYLES),
            wire: (d) => {
                d.addEventListener('mousedown', (e) => e.preventDefault());
                d.addEventListener('click', (e) => {
                    const b = e.target.closest('.gal-item');
                    if (!b) return;
                    closeMenus(0);
                    applyCellStyle(CELL_STYLES[+b.dataset.g].items[+b.dataset.i][1]);
                });
            },
        }], { cls: 'gal-menu' });
    },
    tableStyles: (el) => {
        const html = `<div class="gal"><div class="gal-head">Medium</div><div class="gal-grid tbl">${TABLE_STYLES.map((t, i) => `<button class="tbl-item" data-t="${i}" title="${t[0]}">${tableThumb(t[1], false)}</button>`).join('')}</div>
            <div class="gal-head">Light</div><div class="gal-grid tbl">${TABLE_STYLES.map((t, i) => `<button class="tbl-item" data-t="${i}" data-light="1" title="${t[0]} Light">${tableThumb(t[1], true)}</button>`).join('')}</div></div>`;
        openMenu(el, [{
            html, wire: (d) => {
                d.addEventListener('mousedown', (e) => e.preventDefault());
                d.addEventListener('click', (e) => {
                    const b = e.target.closest('.tbl-item');
                    if (!b) return;
                    closeMenus(0);
                    applyTableStyle(TABLE_STYLES[+b.dataset.t][1], !!b.dataset.light);
                });
            },
        }], { cls: 'gal-menu' });
    },
    freeze: () => {
        const f = sh().freeze;
        return [
            { label: 'Freeze Panes', icon: 'freeze', title: 'Keep rows above and columns left of the active cell visible!', run: () => runCmd('freezePanes') },
            { label: 'Freeze Top Row', icon: 'freeze', checked: f.r === 1 && !f.c, run: () => runCmd('freezeTop') },
            { label: 'Freeze First Column', icon: 'freeze', checked: f.c === 1 && !f.r, run: () => runCmd('freezeFirst') },
            { sep: true },
            { label: 'Unfreeze Panes', icon: 'freeze', disabled: !f.r && !f.c, run: () => runCmd('unfreeze') },
        ];
    },
});

function wireFeatures() {
    wireCharts();
    wireNotes();
}
