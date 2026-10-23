// ribbon.js — Imbuer's Excel-style chrome: icons, ribbon commands, menus,
// color palettes, dialogs, clipboard, Keydown toolbar, formula autocomplete,
// sheet tabs, status bar, find & replace and the File backstage!
// (Grid, selection and editing live in app.js; charts, conditional
// formatting, sort/filter and templates live in features.js!)

// ==========================================
// ICONS (24×24 strokes)
// ==========================================
const ICONS = {
    save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    chevUp: '<path d="M6 15l6-6 6 6"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9z"/><path d="M8.5 11h7M8.5 15h4.5"/>',
    cut: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.2 16L18 3M15.8 16L6 3"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/>',
    brush: '<path d="M18.4 2.6l3 3-9.2 9.2-3-3z"/><path d="M9.2 11.8c-2.9 0-4.7 2-4.7 4.6 0 1.6-1 3-2 3.1 2.2 1.2 6 .9 7.9-1 1.4-1.4 1.8-2.8 1.8-3.7"/>',
    growFont: '<path d="M2.5 19L8 5l5.5 14M4.6 14h6.8"/><path d="M16 10l3-3 3 3M19 7v9"/>',
    shrinkFont: '<path d="M2.5 19L8 5l5.5 14M4.6 14h6.8"/><path d="M16 13l3 3 3-3M19 16V7"/>',
    borders: '<rect x="3.5" y="3.5" width="17" height="17" stroke-dasharray="1.5 2.5"/><path d="M3 20.5h18" stroke-width="2.6"/>',
    bucket: '<path d="M4.5 12.5l7-7 7.5 7.5-7 7z"/><path d="M11.5 5.5L8.5 2.5"/><path d="M4.5 12.5h14.5"/><path d="M20.5 15.5s1.8 2.3 1.8 3.6a1.8 1.8 0 0 1-3.6 0c0-1.3 1.8-3.6 1.8-3.6z"/>',
    vTop: '<path d="M4 3.5h16M12 21V8M8 12l4-4 4 4"/>',
    vMid: '<path d="M4 12h16M12 3v5.5M12 21v-5.5M9 5.5l3 3 3-3M9 18.5l3-3 3 3"/>',
    vBot: '<path d="M4 20.5h16M12 3v13M8 12l4 4 4-4"/>',
    wrap: '<path d="M3 6h18M3 12h14.5a3.5 3.5 0 0 1 0 7H13M3 18h6"/><path d="M15 16.5L12.5 19l2.5 2.5"/>',
    aLeft: '<path d="M3 5h18M3 10h12M3 15h18M3 20h12"/>',
    aCenter: '<path d="M3 5h18M6 10h12M3 15h18M6 20h12"/>',
    aRight: '<path d="M3 5h18M9 10h12M3 15h18M9 20h12"/>',
    indent: '<path d="M3 5h18M11 10h10M11 15h10M3 20h18M3 9l4 3-4 3"/>',
    outdent: '<path d="M3 5h18M11 10h10M11 15h10M3 20h18M7 9l-4 3 4 3"/>',
    checkbox: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M7.5 12.5l3 3 6-7"/>',
    decMore: '<text x="1" y="10" font-size="9" font-weight="700" fill="currentColor" stroke="none">.0</text><text x="7" y="21" font-size="9" font-weight="700" fill="currentColor" stroke="none">.00</text><path d="M3 15.5h3l-1.5-1.5M6 15.5L4.5 17"/>',
    decLess: '<text x="1" y="10" font-size="9" font-weight="700" fill="currentColor" stroke="none">.00</text><text x="10" y="21" font-size="9" font-weight="700" fill="currentColor" stroke="none">.0</text><path d="M8 15.5H5l1.5-1.5M5 15.5L6.5 17"/>',
    condFormat: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/><rect x="11" y="4.8" width="8" height="2.6" rx=".6" fill="#ed7d31" stroke="none"/><rect x="11" y="10.8" width="5" height="2.6" rx=".6" fill="#4472c4" stroke="none"/><rect x="11" y="16.8" width="7" height="2.6" rx=".6" fill="#70ad47" stroke="none"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 14.8h18M9 9.5V20M15 9.5V20"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3.5H3z" fill="currentColor" opacity=".3" stroke="none"/>',
    cellStyles: '<rect x="3" y="5" width="8" height="6" rx="1.2" fill="#c6efce" stroke="#2e7d32"/><rect x="13" y="5" width="8" height="6" rx="1.2" fill="#ffc7ce" stroke="#9c0006"/><rect x="3" y="13" width="8" height="6" rx="1.2" fill="#ffeb9c" stroke="#9c5700"/><rect x="13" y="13" width="8" height="6" rx="1.2"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>',
    insertRow: '<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M3 9.5h13M9.5 3v13"/><circle cx="17.5" cy="17.5" r="4.5"/><path d="M17.5 15.3v4.4M15.3 17.5h4.4"/>',
    deleteRow: '<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M3 9.5h13M9.5 3v13"/><circle cx="17.5" cy="17.5" r="4.5"/><path d="M15.8 15.8l3.4 3.4M19.2 15.8l-3.4 3.4"/>',
    format: '<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M3 9.5h13M9.5 3v13"/><path d="M14 21l1.2-3.6 4.6-4.6a1.7 1.7 0 0 1 2.4 2.4l-4.6 4.6z"/>',
    fillDown: '<path d="M12 3v13M6.5 10.5L12 16l5.5-5.5M4 21h16"/>',
    eraser: '<path d="M20 20H9.5l-5.3-5.3a2 2 0 0 1 0-2.8l8.4-8.4a2 2 0 0 1 2.8 0l4.9 4.9a2 2 0 0 1 0 2.8L12.5 20"/><path d="M8 9l7 7"/>',
    sortFilter: '<path d="M4 6h9M4 12h6M4 18h3"/><path d="M18 4v16M14.5 16.5L18 20l3.5-3.5"/>',
    find: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    chartColumn: '<path d="M3.5 20.5h17"/><rect x="5" y="11" width="3.5" height="9" rx=".6" fill="#4472c4" stroke="none"/><rect x="10.3" y="5" width="3.5" height="15" rx=".6" fill="#ed7d31" stroke="none"/><rect x="15.6" y="8.5" width="3.5" height="11.5" rx=".6" fill="#70ad47" stroke="none"/>',
    chartBar: '<path d="M3.5 3.5v17"/><rect x="4" y="5" width="9" height="3.5" rx=".6" fill="#4472c4" stroke="none"/><rect x="4" y="10.3" width="15" height="3.5" rx=".6" fill="#ed7d31" stroke="none"/><rect x="4" y="15.6" width="11.5" height="3.5" rx=".6" fill="#70ad47" stroke="none"/>',
    chartLine: '<path d="M3.5 3.5v17h17"/><path d="M5 16l4.5-5.5 4 3L20 6" stroke="#4472c4" stroke-width="2.2"/><path d="M5 19l4.5-3 4 1L20 12" stroke="#ed7d31" stroke-width="2.2"/>',
    chartPie: '<path d="M11 3.5a8.5 8.5 0 1 0 8.5 8.5H11z" fill="#4472c4" stroke="none"/><path d="M13 1.5a8.5 8.5 0 0 1 8.5 8.5H13z" fill="#ed7d31" stroke="none"/>',
    chartArea: '<path d="M3.5 20.5V14l5-5 4 4 8-8v15.5z" fill="#4472c4" opacity=".8" stroke="none"/><path d="M3.5 20.5V17l5-3 4 2 8-5v9.5z" fill="#ed7d31" opacity=".85" stroke="none"/><path d="M3.5 20.5h17"/>',
    chartDoughnut: '<circle cx="12" cy="12" r="7" stroke="#4472c4" stroke-width="4" stroke-dasharray="28 16"/><circle cx="12" cy="12" r="7" stroke="#ed7d31" stroke-width="4" stroke-dasharray="16 28" stroke-dashoffset="-28"/>',
    chartScatter: '<path d="M3.5 3.5v17h17"/><circle cx="8" cy="15" r="1.6" fill="#4472c4" stroke="none"/><circle cx="11" cy="10" r="1.6" fill="#4472c4" stroke="none"/><circle cx="14" cy="13" r="1.6" fill="#ed7d31" stroke="none"/><circle cx="17" cy="7" r="1.6" fill="#ed7d31" stroke="none"/><circle cx="18.5" cy="11" r="1.6" fill="#4472c4" stroke="none"/>',
    sparkLine: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 15l3-4.5 3 2.5 3-5 3 3.5 2-2"/>',
    sparkColumn: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 16v-3M9.5 16V9M13 16v-5M16.5 16V8"/>',
    sparkWin: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 12V8.5M9.5 12v3.5M13 12V8.5M16.5 12V8.5M5 12h14"/>',
    note: '<path d="M4 4h16v11.5L15.5 20H4z"/><path d="M15.5 20v-4.5H20"/><path d="M8 9h8M8 12.5h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11.5h.01M12 11.5h.01M16 11.5h.01M8 15.5h.01M12 15.5h.01M16 15.5h.01"/>',
    logic: '<circle cx="5.5" cy="6" r="2.2"/><circle cx="5.5" cy="18" r="2.2"/><circle cx="18.5" cy="12" r="2.2"/><path d="M7.7 6h2.8a3 3 0 0 1 3 3v0a3 3 0 0 0 2.8 3M7.7 18h2.8a3 3 0 0 0 3-3 3 3 0 0 1 2.8-3"/>',
    showFormulas: '<rect x="3" y="4" width="18" height="16" rx="2"/><text x="6.5" y="16" font-size="9" font-style="italic" font-weight="700" fill="currentColor" stroke="none">fx</text>',
    trace: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><rect x="15" y="9" width="6" height="6" rx="1"/><path d="M7 7l8 3.5M7 17l8-3.5"/>',
    import: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    export: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
    sortAsc: '<text x="2" y="10" font-size="8.5" font-weight="700" fill="currentColor" stroke="none">A</text><text x="2" y="21" font-size="8.5" font-weight="700" fill="currentColor" stroke="none">Z</text><path d="M17 4v16M13.5 16.5L17 20l3.5-3.5"/>',
    sortDesc: '<text x="2" y="10" font-size="8.5" font-weight="700" fill="currentColor" stroke="none">Z</text><text x="2" y="21" font-size="8.5" font-weight="700" fill="currentColor" stroke="none">A</text><path d="M17 4v16M13.5 16.5L17 20l3.5-3.5"/>',
    funnel: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
    funnelX: '<path d="M3 4h14l-5.5 7v6L8 19v-8z"/><path d="M16 15l5 5M21 15l-5 5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16" stroke-dasharray="2 2"/><path d="M5.5 12h3.5M9 12l-1.5-1.5M9 12l-1.5 1.5M18.5 12H15M15 12l1.5-1.5M15 12l1.5 1.5"/>',
    dedupe: '<rect x="3" y="3" width="12" height="12" rx="2"/><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M12.5 15h5"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="16" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="16" r="1.3" fill="currentColor"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6M11 8v6"/>',
    zoomSel: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    freeze: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18" stroke-width="2.6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    home: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-6h6v6"/>',
    newDoc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M13 12v6M10 15h6"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M9 10h12"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c5 0 9 4 10 7a11.8 11.8 0 0 1-2.4 3.6M6.6 6.6A11.8 11.8 0 0 0 2 12c1 3 5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    rowH: '<path d="M3 4h18M3 20h18M12 7.5v9M9 10l3-3 3 3M9 14l3 3 3-3"/>',
    colW: '<path d="M4 3v18M20 3v18M7.5 12h9M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    arrowL: '<path d="M15 6l-6 6 6 6"/>',
    arrowR: '<path d="M9 6l6 6-6 6"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/><path d="M14 11v6M11 14h6"/>',
    goto: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sigma: '<path d="M18 4H6l6 8-6 8h12"/>',
};

function ico(name, cls) {
    return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// ==========================================
// PALETTES & PRESETS
// ==========================================
const THEME_COLORS = ['#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'];
const STANDARD_COLORS = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];
const GEL_COLORS = ['linear-gradient(180deg,#d9fca8,#8be03a)', 'linear-gradient(180deg,#c8ecff,#5cb8f5)', 'linear-gradient(180deg,#ffd6e3,#ff7aa5)', 'linear-gradient(180deg,#fff1b8,#ffc533)', 'linear-gradient(180deg,#eadcff,#a77bf5)', 'linear-gradient(180deg,#d4fff4,#3fd6b5)', 'linear-gradient(180deg,#ffe0c7,#ff9a4d)', 'linear-gradient(180deg,#f4f7fb,#c9d3e0)'];
const CHART_COLORS = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47', '#264478', '#9e480e', '#636363', '#997300'];

function hexToRgb(h) {
    const m = /^#?([0-9a-f]{6})$/i.exec(h);
    if (!m) return [0, 0, 0];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

function mixHex(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// Excel's theme grid: each theme color with 4 tints and 2 shades!
function themeGrid() {
    const rows = [THEME_COLORS];
    const whites = ['#f2f2f2', '#d9d9d9', '#bfbfbf', '#a6a6a6', '#808080'];
    const blacks = ['#7f7f7f', '#595959', '#404040', '#262626', '#0d0d0d'];
    [0.8, 0.6, 0.4, -0.25, -0.5].forEach((t, k) => {
        rows.push(THEME_COLORS.map((c, i) => {
            if (i === 0) return whites[k];
            if (i === 1) return blacks[k];
            return t > 0 ? mixHex(c, '#ffffff', t) : mixHex(c, '#000000', -t);
        }));
    });
    return rows;
}

const FONT_LIST = [
    ['Aptos (Default)', ''],
    ['Arial', 'Arial, Helvetica, sans-serif'],
    ['Calibri', 'Calibri, Carlito, sans-serif'],
    ['Cambria', 'Cambria, Georgia, serif'],
    ['Comic Neue', "'Comic Neue', 'Comic Sans MS', cursive"],
    ['Courier New', "'Courier New', Courier, monospace"],
    ['Georgia', 'Georgia, serif'],
    ['Helvetica', 'Helvetica, Arial, sans-serif'],
    ['JetBrains Mono', "'JetBrains Mono', monospace"],
    ['Roboto', 'Roboto, sans-serif'],
    ['Space Grotesk', "'Space Grotesk', sans-serif"],
    ['Tahoma', 'Tahoma, Verdana, sans-serif'],
    ['Times New Roman', "'Times New Roman', Times, serif"],
    ['Trebuchet MS', "'Trebuchet MS', sans-serif"],
    ['Verdana', 'Verdana, sans-serif'],
];
const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

function fontLabel(css) {
    if (!css) return FONT_LIST[0][0].replace(' (Default)', '');
    const hit = FONT_LIST.find(f => f[1] === css);
    if (hit) return hit[0];
    return css.split(',')[0].replace(/['"]/g, '').trim();
}

let lastFill = '#ffff00';
let lastFontColor = '#c00000';
let lastBorder = 'bottom';

// ==========================================
// MENUS (dropdowns, context menus, submenus)
// ==========================================
let menuStack = [];

function menuOpen() {
    return menuStack.length > 0;
}

function closeMenus(level) {
    level = level || 0;
    while (menuStack.length > level) {
        const m = menuStack.pop();
        m.el.classList.add('closing');
        const el = m.el;
        setTimeout(() => el.remove(), 110);
        if (m.anchor) m.anchor.classList.remove('menu-on');
        if (m.onClose) m.onClose();
    }
}

function placeFloating(el, anchor, opts) {
    opts = opts || {};
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = el.offsetWidth, h = el.offsetHeight;
    let x, y;
    if (opts.point) { x = opts.point.x; y = opts.point.y; }
    else if (anchor) {
        const r = anchor.getBoundingClientRect();
        if (opts.side) { x = r.right - 2; y = r.top - 5; if (x + w > vw - 6) x = r.left - w + 2; }
        else { x = opts.alignRight ? r.right - w : r.left; y = r.bottom + 2; if (y + h > vh - 6 && r.top - h - 2 > 6) y = r.top - h - 2; }
    } else { x = (vw - w) / 2; y = (vh - h) / 2; }
    x = Math.max(6, Math.min(x, vw - w - 6));
    y = Math.max(6, Math.min(y, vh - h - 6));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transformOrigin = (opts.point ? '0 0' : (y < (anchor ? anchor.getBoundingClientRect().top : 0) ? '0 100%' : '0 0'));
}

// items: {label, icon, kbd, run, sub, sep, header, checked, disabled, html, title, cls, keep}
function openMenu(anchor, items, opts) {
    opts = opts || {};
    const level = opts.level || 0;
    closeMenus(level);
    const el = document.createElement('div');
    el.className = 'menu pop' + (opts.cls ? ' ' + opts.cls : '');
    el.setAttribute('role', 'menu');
    const host = document.getElementById('menus');
    let focusIdx = -1;
    const btns = [];
    items.forEach((it) => {
        if (!it) return;
        if (it.sep) { el.insertAdjacentHTML('beforeend', '<div class="m-sep"></div>'); return; }
        if (it.header) { el.insertAdjacentHTML('beforeend', `<div class="m-head">${escapeHtml(it.header)}</div>`); return; }
        if (it.node) { el.appendChild(it.node); return; }
        if (it.html && !it.label) { const d = document.createElement('div'); d.className = 'm-html'; d.innerHTML = it.html; el.appendChild(d); if (it.wire) it.wire(d); return; }
        const b = document.createElement('button');
        b.className = 'm-item' + (it.cls ? ' ' + it.cls : '') + (it.checked ? ' checked' : '');
        b.disabled = !!it.disabled;
        if (it.title) b.title = it.title;
        const iconHtml = it.icon ? (ICONS[it.icon] ? ico(it.icon) : it.icon) : (it.checked ? '<span class="m-check">✓</span>' : '');
        b.innerHTML = `<span class="m-ico">${iconHtml}</span><span class="m-label"${it.style ? ` style="${it.style}"` : ''}>${it.html || escapeHtml(it.label)}</span>${it.kbd ? `<span class="m-kbd">${it.kbd}</span>` : ''}${it.sub ? '<span class="m-arrow">›</span>' : ''}`;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        if (it.sub) {
            const openSub = () => {
                if (menuStack[level + 1] && menuStack[level + 1].anchor === b) return;
                const sub = typeof it.sub === 'function' ? it.sub() : it.sub;
                openMenu(b, sub, { level: level + 1, side: true, cls: it.subCls });
            };
            b.addEventListener('mouseenter', () => { clearTimeout(b._t); b._t = setTimeout(openSub, 120); });
            b.addEventListener('mouseleave', () => clearTimeout(b._t));
            b.addEventListener('click', openSub);
            b._openSub = openSub;
        } else {
            b.addEventListener('mouseenter', () => { if (menuStack.length > level + 1) closeMenus(level + 1); });
            b.addEventListener('click', () => {
                if (!it.keep) closeMenus(0);
                playAeroClickSound(620, 0.05);
                if (it.run) it.run(b);
            });
        }
        btns.push(b);
        el.appendChild(b);
    });
    host.appendChild(el);
    placeFloating(el, anchor, opts);
    const entry = { el, anchor, onClose: opts.onClose, btns, level };
    menuStack.push(entry);
    if (anchor && level === 0) anchor.classList.add('menu-on');
    el.addEventListener('keydown', (e) => {
        const list = btns.filter(b => !b.disabled);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            focusIdx = (focusIdx + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
            list[focusIdx].focus();
        } else if (e.key === 'ArrowRight' && document.activeElement && document.activeElement._openSub) {
            document.activeElement._openSub();
        } else if (e.key === 'ArrowLeft' && level > 0) {
            closeMenus(level);
            if (anchor) anchor.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeMenus(0);
            focusGrid();
        }
    });
    if (opts.focus) setTimeout(() => { const f = btns.find(b => !b.disabled); if (f) f.focus(); }, 0);
    return el;
}

// Escape closes open menus even when focus stayed on the grid!
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuStack.length && !(document.activeElement && document.activeElement.closest('.menu'))) {
        e.preventDefault();
        e.stopPropagation();
        closeMenus(0);
    }
}, true);

document.addEventListener('mousedown', (e) => {
    if (!menuStack.length) return;
    if (e.target.closest('.menu') || e.target.closest('.menu-on')) return;
    closeMenus(0);
});

// Color palette dropdown (theme grid + standard + gel + custom)!
function paletteMenu(anchor, opts) {
    const grid = themeGrid();
    let html = `<div class="pal">`;
    if (opts.auto) html += `<button class="pal-auto" data-c="">${opts.auto === 'No Fill' ? '<span class="pal-none"></span>' : '<span class="pal-sw" style="background:#000"></span>'}${opts.auto}</button>`;
    html += `<div class="pal-head">Theme Colors</div><div class="pal-grid">`;
    grid.forEach((row, ri) => {
        row.forEach(c => { html += `<button class="pal-sw${ri === 0 ? ' top' : ''}" data-c="${c}" style="background:${c}" title="${c}"></button>`; });
    });
    html += `</div><div class="pal-head">Standard Colors</div><div class="pal-grid one">`;
    STANDARD_COLORS.forEach(c => { html += `<button class="pal-sw" data-c="${c}" style="background:${c}" title="${c}"></button>`; });
    html += '</div>';
    if (opts.gel) {
        html += `<div class="pal-head">Gel Fills</div><div class="pal-grid gel">`;
        GEL_COLORS.forEach(c => { html += `<button class="pal-sw gelsw" data-c="${c}" style="background:${c}"></button>`; });
        html += '</div>';
    }
    html += `<label class="pal-more"><span class="pal-rain"></span>More Colors…<input type="color" value="#4472c4"></label></div>`;
    openMenu(anchor, [{
        html, wire: (d) => {
            d.addEventListener('mousedown', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
            d.addEventListener('click', (e) => {
                const b = e.target.closest('[data-c]');
                if (!b) return;
                closeMenus(0);
                opts.onPick(b.dataset.c || null);
            });
            d.querySelector('input[type=color]').addEventListener('change', (e) => { closeMenus(0); opts.onPick(e.target.value); });
        },
    }], { cls: 'pal-menu' });
}

// ==========================================
// DIALOGS
// ==========================================
function openDialog(o) {
    return new Promise((resolve) => {
        const host = document.getElementById('dlg-host');
        const back = document.createElement('div');
        back.className = 'dlg-back';
        const btns = (o.buttons || [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: null }]);
        back.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" style="${o.width ? 'width:' + o.width + 'px' : ''}">
            <div class="dlg-head"><span>${escapeHtml(o.title || '')}</span><button class="dlg-x" data-v="__x" title="Close">${ico('x')}</button></div>
            <div class="dlg-body">${o.body || ''}</div>
            <div class="dlg-foot">${btns.map((b, i) => `<button class="dlg-btn${b.primary ? ' primary' : ''}${b.danger ? ' danger' : ''}" data-i="${i}">${escapeHtml(b.label)}</button>`).join('')}</div>
        </div>`;
        host.appendChild(back);
        const dlg = back.querySelector('.dlg');
        const done = (val) => {
            if (o.validate && val !== null && val !== undefined && o.validate(dlg, val) === false) return;
            back.classList.add('closing');
            setTimeout(() => back.remove(), 160);
            document.removeEventListener('keydown', onKey, true);
            resolve({ value: val, el: dlg });
            setTimeout(focusGrid, 0);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); }
            if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && !e.target.closest('.dlg-btn')) {
                const p = btns.find(b => b.primary);
                if (p) { e.preventDefault(); e.stopPropagation(); done(p.value); }
            }
        };
        document.addEventListener('keydown', onKey, true);
        back.addEventListener('mousedown', (e) => { if (e.target === back) done(null); });
        dlg.querySelector('.dlg-x').addEventListener('click', () => done(null));
        dlg.querySelectorAll('.dlg-btn').forEach(b => b.addEventListener('click', () => done(btns[+b.dataset.i].value)));
        if (o.onOpen) o.onOpen(dlg, done);
        const first = dlg.querySelector('input:not([type=checkbox]):not([type=radio]), select, textarea');
        setTimeout(() => { if (first) { first.focus(); if (first.select) first.select(); } else { const p = dlg.querySelector('.dlg-btn.primary'); if (p) p.focus(); } }, 30);
    });
}

async function confirmDialog(title, text, okLabel, danger) {
    const r = await openDialog({ title, body: `<p class="dlg-text">${escapeHtml(text)}</p>`, buttons: [{ label: okLabel || 'OK', value: 'ok', primary: true, danger }, { label: 'Cancel', value: null }] });
    return r.value === 'ok';
}

async function promptDialog(title, label, value, hint) {
    const r = await openDialog({
        title,
        body: `<label class="dlg-field"><span>${escapeHtml(label)}</span><input class="dlg-input" value="${escapeHtml(value || '')}" spellcheck="false"></label>${hint ? `<p class="dlg-hint">${escapeHtml(hint)}</p>` : ''}`,
    });
    if (r.value !== 'ok') return null;
    return r.el.querySelector('.dlg-input').value;
}

// ==========================================
// COMMANDS
// ==========================================
function curStyle() {
    return sh().styles[idOf(sel.act.r, sel.act.c)] || {};
}

function styleAll(key, value) {
    change(() => { for (const R of allRanges()) setStyleProp(R, key, value); }, { animate: false });
}

function toggleStyleKey(key) {
    const on = !curStyle()[key];
    styleAll(key, on || null);
    pulseSelection();
}

function pulseSelection() {
    if (!prefs.anim) return;
    const ov = document.getElementById('ov');
    for (const R of allRanges()) {
        const el = document.createElement('div');
        el.className = 'fx-pulse';
        placeBox(el, rangeRect(R));
        ov.appendChild(el);
        setTimeout(() => el.remove(), 520);
    }
}

function setBorders(kind, color) {
    color = color || '#000000';
    const s = sh();
    const thick = kind === 'thickOutside' || kind === 'thickBottom';
    change(() => {
        for (const R of allRanges()) {
            for (let r = R.r0; r <= R.r1; r++) {
                for (let c = R.c0; c <= R.c1; c++) {
                    const id = idOf(r, c);
                    const st = Object.assign({}, s.styles[id] || {});
                    const set = (edge, k) => { st[edge] = (k || 'thin') + ' ' + color; };
                    const top = r === R.r0, bot = r === R.r1, left = c === R.c0, right = c === R.c1;
                    switch (kind) {
                        case 'none': delete st.bt; delete st.bb; delete st.bl; delete st.br; break;
                        case 'all': set('bt'); set('bb'); set('bl'); set('br'); break;
                        case 'outside': case 'thickOutside':
                            if (top) set('bt', thick ? 'thick' : 'thin');
                            if (bot) set('bb', thick ? 'thick' : 'thin');
                            if (left) set('bl', thick ? 'thick' : 'thin');
                            if (right) set('br', thick ? 'thick' : 'thin');
                            break;
                        case 'bottom': if (bot) set('bb'); break;
                        case 'top': if (top) set('bt'); break;
                        case 'left': if (left) set('bl'); break;
                        case 'right': if (right) set('br'); break;
                        case 'thickBottom': if (bot) set('bb', 'thick'); break;
                        case 'doubleBottom': if (bot) set('bb', 'double'); break;
                        case 'topBottom': if (top) set('bt'); if (bot) set('bb'); break;
                    }
                    if (Object.keys(st).length) s.styles[id] = st; else delete s.styles[id];
                }
            }
        }
    }, { animate: false });
    lastBorder = kind;
    pulseSelection();
}

function setNumFormat(fmt, dec) {
    change(() => {
        for (const R of allRanges()) {
            setStyleProp(R, 'fmt', fmt === 'general' ? null : fmt);
            setStyleProp(R, 'dec', dec === undefined ? null : dec);
        }
    }, { animate: false });
    pulseSelection();
}

function bumpDecimals(delta) {
    const st = curStyle();
    let fmt = st.fmt;
    const v = valueAt(sel.act.r, sel.act.c);
    let dec = st.dec;
    if (dec === undefined) {
        if (!fmt || fmt === 'general') {
            const t = typeof v === 'number' ? fmtGeneral(v) : '';
            dec = t.includes('.') ? t.split('.')[1].length : 0;
            fmt = 'number';
        } else dec = fmt === 'percent' ? 0 : (FORMATS[fmt] && FORMATS[fmt].dec !== undefined ? FORMATS[fmt].dec : 2);
    }
    dec = Math.max(0, Math.min(12, dec + delta));
    change(() => {
        for (const R of allRanges()) {
            for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) {
                const id = idOf(r, c);
                const cur = Object.assign({}, sh().styles[id] || {});
                cur.fmt = cur.fmt && cur.fmt !== 'general' ? cur.fmt : fmt;
                cur.dec = dec;
                sh().styles[id] = cur;
            }
        }
    }, { animate: false });
}

function setFontSize(sz) {
    sz = Math.max(4, Math.min(200, Math.round(+sz * 2) / 2));
    if (!isFinite(sz)) return;
    change(() => {
        for (const R of allRanges()) setStyleProp(R, 'size', sz === 13 ? null : sz);
        // Bigger text gets taller rows (like Excel)!
        const s = sh();
        for (const R of allRanges()) for (let r = R.r0; r <= R.r1; r++) {
            let need = DEF_H;
            for (let c = 0; c < s.cols; c++) { const st = s.styles[idOf(r, c)]; if (st && st.size) need = Math.max(need, Math.ceil(st.size * 1.5 + 4)); }
            if (need > DEF_H) s.rowH[r] = Math.max(need, s.rowH[r] || 0);
        }
    }, { rebuild: true });
}

function growFont(dir) {
    const cur = curStyle().size || 13;
    let next;
    if (dir > 0) next = FONT_SIZES.find(s => s > cur) || cur + 8;
    else next = [...FONT_SIZES].reverse().find(s => s < cur) || Math.max(4, cur - 1);
    setFontSize(next);
}

function setFont(css) {
    styleAll('font', css || null);
    pulseSelection();
}

function needSingleRange() {
    if (extras.length) { toast("That command can't be used on multiple selections!"); return false; }
    return true;
}

const CMD = {
    save: { label: 'Save', icon: 'save', run: () => { saveNow(); flashSaved(); toast('Saved in this browser! Use File → Save a Copy for a file!'); } },
    undo: { label: 'Undo', icon: 'undo', run: undo, edit: true },
    redo: { label: 'Redo', icon: 'redo', run: redo },
    paste: { label: 'Paste', icon: 'paste', run: () => pasteFromButton('all') },
    cut: { label: 'Cut', icon: 'cut', run: () => doCopy(true) },
    copy: { label: 'Copy', icon: 'copy', run: () => doCopy(false) },
    painter: { label: 'Format Painter', icon: 'brush', run: (el, e) => startPainter(e && e.detail === 2) },
    growFont: { label: 'Increase Font Size', icon: 'growFont', run: () => growFont(1) },
    shrinkFont: { label: 'Decrease Font Size', icon: 'shrinkFont', run: () => growFont(-1) },
    bold: { label: 'Bold', run: () => toggleStyleKey('b') },
    italic: { label: 'Italic', run: () => toggleStyleKey('i') },
    underline: { label: 'Underline', run: () => toggleStyleKey('u') },
    strike: { label: 'Strikethrough', run: () => toggleStyleKey('s') },
    borderBottom: { label: 'Borders', icon: 'borders', run: () => setBorders(lastBorder) },
    fillColor: { label: 'Fill Color', icon: 'bucket', run: () => { styleAll('fill', lastFill); pulseSelection(); } },
    fontColor: { label: 'Font Color', run: () => { styleAll('color', lastFontColor); pulseSelection(); } },
    alignTop: { label: 'Top Align', icon: 'vTop', run: () => styleAll('valign', curStyle().valign === 'top' ? null : 'top') },
    alignMiddle: { label: 'Middle Align', icon: 'vMid', run: () => styleAll('valign', curStyle().valign === 'middle' ? null : 'middle') },
    alignBottom: { label: 'Bottom Align', icon: 'vBot', run: () => styleAll('valign', null) },
    alignLeft: { label: 'Align Left', icon: 'aLeft', run: () => styleAll('align', curStyle().align === 'left' ? null : 'left') },
    alignCenter: { label: 'Center', icon: 'aCenter', run: () => styleAll('align', curStyle().align === 'center' ? null : 'center') },
    alignRight: { label: 'Align Right', icon: 'aRight', run: () => styleAll('align', curStyle().align === 'right' ? null : 'right') },
    wrap: { label: 'Wrap Text', icon: 'wrap', run: () => { toggleStyleKey('wrap'); const R = rng(); for (let r = R.r0; r <= Math.min(R.r1, R.r0 + 200); r++) autoGrowRowAll(r); } },
    indent: { label: 'Increase Indent', icon: 'indent', run: () => styleAll('indent', Math.min(15, (curStyle().indent || 0) + 1)) },
    outdent: { label: 'Decrease Indent', icon: 'outdent', run: () => styleAll('indent', Math.max(0, (curStyle().indent || 0) - 1) || null) },
    checkbox: { label: 'Insert Checkboxes', icon: 'checkbox', run: insertCheckboxes },
    fmtCurrency: { label: 'Currency Format', run: () => setNumFormat('currency', 2) },
    fmtPercent: { label: 'Percent Style', run: () => setNumFormat('percent', 0) },
    fmtComma: { label: 'Comma Style', run: () => setNumFormat('comma', 2) },
    decMore: { label: 'Increase Decimal', icon: 'decMore', run: () => bumpDecimals(1) },
    decLess: { label: 'Decrease Decimal', icon: 'decLess', run: () => bumpDecimals(-1) },
    formatCellsDialog: { label: 'Format Cells…', icon: 'format', run: () => formatCellsDialog() },
    keydownCells: { label: 'Keydown Styles', icon: 'sparkle', run: (el) => showKeydownBarForCells(el), edit: true },
    autoSum: { label: 'AutoSum', icon: 'sigma', run: () => autoSum('SUM') },
    insertFunction: { label: 'Insert Function', run: () => insertFunctionDialog(), edit: true },
    showFormulas: { label: 'Show Formulas', icon: 'showFormulas', run: () => togglePref('showFormulas') },
    calcNow: { label: 'Calculate Now', icon: 'calc', run: () => { evaluateFormulas(); toast('Recalculated!'); } },
    traceRefs: { label: 'Trace Precedents', icon: 'trace', run: tracePrecedents },
    newNote: { label: 'New Note', icon: 'note', run: () => editNote(sel.act.r, sel.act.c) },
    insertDate: { label: 'Insert Today\'s Date', icon: 'calendar', run: () => insertNowValue('date') },
    insertTime: { label: 'Insert Current Time', icon: 'clock', run: () => insertNowValue('time') },
    find: { label: 'Find', icon: 'find', run: () => openFind(false) },
    replace: { label: 'Replace', icon: 'find', run: () => openFind(true) },
    goTo: { label: 'Go To', icon: 'goto', run: goToDialog },
    addSheet: { label: 'New Sheet', icon: 'plus', run: () => addSheet() },
    prevSheet: { label: 'Previous Sheet', icon: 'arrowL', run: () => switchSheet(Math.max(0, book.active - 1)) },
    nextSheet: { label: 'Next Sheet', icon: 'arrowR', run: () => switchSheet(Math.min(book.sheets.length - 1, book.active + 1)) },
    zoomIn: { label: 'Zoom In', icon: 'zoom', run: () => setZoom(Math.round((zf() + 0.1) * 100) / 100) },
    zoomOut: { label: 'Zoom Out', icon: 'zoom', run: () => setZoom(Math.round((zf() - 0.1) * 100) / 100) },
    zoom100: { label: 'Zoom to 100%', run: () => setZoom(1) },
    zoomSel: { label: 'Zoom to Selection', icon: 'zoomSel', run: zoomToSelection },
    toggleRibbon: { label: 'Collapse the Ribbon', icon: 'chevUp', run: () => document.body.classList.toggle('ribbon-min') },
    help: { label: 'Help Deck', icon: 'help', run: () => helpDialog('overview') },
    shortcuts: { label: 'Keyboard Shortcuts', icon: 'keyboard', run: () => helpDialog('keys') },
    functionList: { label: 'Function List', run: () => helpDialog('functions') },
    insertRows: { label: 'Insert Sheet Rows', icon: 'insertRow', run: () => insertRowsAtSel() },
    insertCols: { label: 'Insert Sheet Columns', icon: 'insertRow', run: () => insertColsAtSel() },
    deleteRows: { label: 'Delete Sheet Rows', icon: 'deleteRow', run: () => deleteRowsAtSel() },
    deleteCols: { label: 'Delete Sheet Columns', icon: 'deleteRow', run: () => deleteColsAtSel() },
    clearAll: { label: 'Clear All', icon: 'eraser', run: () => { allRanges().forEach(poof); change(() => clearContents(null, 'all')); } },
    clearFormats: { label: 'Clear Formats', icon: 'eraser', run: () => change(() => clearContents(null, 'formats')) },
    clearContents: { label: 'Clear Contents', icon: 'eraser', run: deleteSelection },
    fillDown: { label: 'Fill Down', icon: 'fillDown', run: () => fillDir('down') },
    fillRight: { label: 'Fill Right', icon: 'fillDown', run: () => fillDir('right') },
    fillUp: { label: 'Fill Up', icon: 'fillDown', run: () => fillDir('up') },
    fillLeft: { label: 'Fill Left', icon: 'fillDown', run: () => fillDir('left') },
    selectAll: { label: 'Select All', run: selectAllSmart },
    settings: { label: 'Settings', icon: 'gear', run: () => openBackstage('options') },
    templates: { label: 'Templates', icon: 'sparkle', run: () => openBackstage('new') },
    layoutExcel: { label: 'Layout: Excel', icon: 'layout', run: () => setLayout('excel') },
    layoutClassic: { label: 'Layout: Imbuer Classic', icon: 'layout', run: () => setLayout('classic') },
    toggleSide: { label: 'Collapse the Sidebar', icon: 'arrowL', run: () => { prefs.sideCollapsed = !prefs.sideCollapsed; savePrefs(); applyPrefs(); afterLayoutShift(380); } },
};

// Two looks, one Imbuer: the Excel layout, or the original glassy Imbuer Classic!
function setLayout(l) {
    if (prefs.layout === l) { toast(l === 'classic' ? 'Already in Imbuer Classic!' : 'Already in the Excel layout!'); return; }
    prefs.layout = l;
    savePrefs();
    const swap = () => {
        applyPrefs();
        syncLayoutCards();
        afterLayoutShift(0);
        if (document.getElementById('backstage').hidden && !isEditing()) focusGrid();
        toast(l === 'classic' ? 'Imbuer Classic layout: glass, gel and orbs!' : 'Excel layout: clean and familiar!');
    };
    if (!prefs.anim) { swap(); return; }
    const app = document.getElementById('app');
    app.classList.add('layout-out');
    setTimeout(() => {
        swap();
        app.classList.remove('layout-out');
        restartAnim(app, 'layout-in');
    }, 200);
}

// The grid area changed size, so re-measure everything that tracks it!
function afterLayoutShift(delay) {
    const run = () => { window.dispatchEvent(new Event('resize')); drawSel({ animate: false }); };
    run();
    if (delay) setTimeout(run, delay);
}

function syncLayoutCards() {
    document.querySelectorAll('[data-layout]').forEach(b => b.classList.toggle('on', b.dataset.layout === prefs.layout));
}

// The rest of the commands come from features.js (charts, sorting, filters...)!
function registerCommands(more) {
    Object.assign(CMD, more);
}

function runCmd(id, el, e) {
    const c = CMD[id];
    if (!c) return;
    if (isEditing() && !c.edit) commitEdit(0, 0);
    playAeroClickSound(600, 0.06);
    try {
        c.run(el, e);
    } catch (err) {
        console.error(err);
        toast('Something went wrong: ' + err.message);
    }
    if (!isEditing() && !(document.activeElement && document.activeElement.closest('.dlg, .menu, #find-panel, #backstage, .note-pop'))) focusGrid();
}

function togglePref(key) {
    prefs[key] = !prefs[key];
    savePrefs();
    applyPrefs();
    syncPrefChecks();
    if (key === 'headings' || key === 'showFormulas') initGrid();
    if (key === 'dark') renderAll(false);
    if (key === 'showFormulas') toast(prefs.showFormulas ? 'Showing formulas!' : 'Showing values!');
}

function syncPrefChecks() {
    document.querySelectorAll('[data-pref]').forEach(cb => { cb.checked = !!prefs[cb.dataset.pref]; });
    const sf = document.querySelector('[data-cmd="showFormulas"]');
    if (sf) sf.classList.toggle('on', !!prefs.showFormulas);
}

function setZoom(z) {
    z = Math.max(0.25, Math.min(3, z));
    const sc = scroller();
    const old = zf();
    const cx = (sc.scrollLeft + sc.clientWidth / 2) / old, cy = (sc.scrollTop + sc.clientHeight / 2) / old;
    prefs.zoom = z;
    savePrefs();
    initGrid();
    sc.scrollLeft = cx * z - sc.clientWidth / 2;
    sc.scrollTop = cy * z - sc.clientHeight / 2;
    document.getElementById('zoom-slider').value = Math.round(z * 100);
    document.getElementById('zoom-label').textContent = Math.round(z * 100) + '%';
    drawSel({ animate: false });
}

function zoomToSelection() {
    const R = rng();
    const sc = scroller();
    const w = (layout.colX[R.c1 + 1] - layout.colX[R.c0]) / zf();
    const h = (layout.rowY[R.r1 + 1] - layout.rowY[R.r0]) / zf();
    const z = Math.min((sc.clientWidth - ROWHDR_W - 20) / w, (sc.clientHeight - HDR_H - 20) / h);
    setZoom(Math.round(Math.max(0.25, Math.min(3, z)) * 20) / 20);
    scrollIntoView(R.r0, R.c0);
}

function flashSaved() {
    const s = document.getElementById('save-state');
    if (!s) return;
    s.textContent = 'Saved';
    restartAnim(s, 'blip');
}

function insertNowValue(kind) {
    const d = new Date();
    const val = kind === 'date' ? `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
        : `${(d.getHours() + 11) % 12 + 1}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
    if (isEditing()) {
        const inp = activeInput();
        const a = inp.selectionStart;
        inp.value = inp.value.slice(0, a) + val + inp.value.slice(inp.selectionEnd);
        inp.setSelectionRange(a + val.length, a + val.length);
        edInput(inp.id === 'formula-input');
        return;
    }
    const s = sh();
    change(() => { setRaw(s, sel.act.r, sel.act.c, val); autoFormat(s, sel.act.r, sel.act.c, val); });
    animCell(sel.act.r, sel.act.c, 'in');
}

function insertCheckboxes() {
    const s = sh();
    change(() => {
        forEachSelected((r, c) => {
            const id = idOf(r, c);
            const st = Object.assign({}, s.styles[id] || {});
            st.check = true;
            s.styles[id] = st;
            const v = s.data[id];
            if (v === undefined || !/^(true|false)$/i.test(v)) { if (v === undefined || v === '') s.data[id] = 'FALSE'; }
        });
    });
    forEachSelected((r, c) => animCell(r, c, 'pop', ((r - rng().r0) + (c - rng().c0)) * 25));
}

function autoGrowRowAll(r) {
    const s = sh();
    let need = DEF_H;
    for (let c = 0; c < s.cols; c++) {
        const st = s.styles[idOf(r, c)];
        const t = displayText(r, c);
        if (!t || !st || !st.wrap) continue;
        need = Math.max(need, Math.ceil(measureText(t, st) / Math.max(20, colWidth(c) - 10)) * (st.size || 13) * 1.45 + 6);
    }
    if (need > DEF_H) s.rowH[r] = Math.ceil(need);
    initGrid();
}

function selectAllSmart() {
    const R = rng();
    const cur = hasData(sel.act.r, sel.act.c) ? currentRegion(sel.act.r, sel.act.c) : null;
    if (cur && rangeSize(cur) > 1 && !(R.r0 === cur.r0 && R.r1 === cur.r1 && R.c0 === cur.c0 && R.c1 === cur.c1)) {
        sel = { anchor: { r: cur.r0, c: cur.c0 }, focus: { r: cur.r1, c: cur.c1 }, act: { ...sel.act } };
        extras = [];
        drawSel({ shine: true });
    } else selectRange({ r0: 1, r1: sh().rows, c0: 0, c1: sh().cols - 1 }, { scroll: false, shine: true });
}

function fillDir(dir) {
    if (!needSingleRange()) return;
    const R = rng();
    if (dir === 'down' || dir === 'up') {
        if (R.r0 === R.r1) {
            if (dir === 'down' && R.r0 > 1) { applyFill({ r0: R.r0 - 1, r1: R.r0 - 1, c0: R.c0, c1: R.c1 }, { r0: R.r0 - 1, r1: R.r0, c0: R.c0, c1: R.c1 }); }
            return;
        }
        const src = dir === 'down' ? { r0: R.r0, r1: R.r0, c0: R.c0, c1: R.c1 } : { r0: R.r1, r1: R.r1, c0: R.c0, c1: R.c1 };
        copyFill(src, R);
    } else {
        if (R.c0 === R.c1) {
            if (dir === 'right' && R.c0 > 0) applyFill({ r0: R.r0, r1: R.r1, c0: R.c0 - 1, c1: R.c0 - 1 }, { r0: R.r0, r1: R.r1, c0: R.c0 - 1, c1: R.c0 });
            return;
        }
        const src = dir === 'right' ? { r0: R.r0, r1: R.r1, c0: R.c0, c1: R.c0 } : { r0: R.r0, r1: R.r1, c0: R.c1, c1: R.c1 };
        copyFill(src, R);
    }
}

// Ctrl+D / Ctrl+R copy (never series), shifting formulas!
function copyFill(src, R) {
    const s = sh();
    change(() => {
        for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) {
            if (inRange(src, r, c)) continue;
            const sr = src.r0 === src.r1 ? src.r0 : r, scc = src.c0 === src.c1 ? src.c0 : c;
            const raw = s.data[idOf(sr, scc)];
            setRaw(s, r, c, raw && raw[0] === '=' ? FormulaEngine.shiftFormula(raw, r - sr, c - scc) : raw);
            const st = s.styles[idOf(sr, scc)];
            if (st) s.styles[idOf(r, c)] = JSON.parse(JSON.stringify(st)); else delete s.styles[idOf(r, c)];
        }
    });
    for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) if (!inRange(src, r, c)) animCell(r, c, 'in', (Math.abs(r - src.r0) + Math.abs(c - src.c0)) * 25);
}

// ==========================================
// FORMAT PAINTER
// ==========================================
function startPainter(sticky) {
    const R = rng();
    const s = sh();
    const m = [];
    for (let r = R.r0; r <= R.r1; r++) {
        const row = [];
        for (let c = R.c0; c <= R.c1; c++) row.push(s.styles[idOf(r, c)] ? JSON.parse(JSON.stringify(s.styles[idOf(r, c)])) : null);
        m.push(row);
    }
    painterApply.pending = { m, sticky };
    document.body.classList.add('painting');
    document.querySelector('[data-cmd="painter"]').classList.add('on');
    showAnts(R);
    toast(sticky ? 'Format Painter is on until you press Esc!' : 'Pick the cells to paint!');
}

function painterApply() {
    const p = painterApply.pending;
    if (!p) return;
    const R = rng();
    const s = sh();
    const h = p.m.length, w = p.m[0].length;
    change(() => {
        const rows = Math.max(R.r1 - R.r0 + 1, h), cols = Math.max(R.c1 - R.c0 + 1, w);
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
            const id = idOf(R.r0 + i, R.c0 + j);
            if (R.r0 + i > s.rows || R.c0 + j >= s.cols) continue;
            const st = p.m[i % h][j % w];
            if (st) s.styles[id] = JSON.parse(JSON.stringify(st)); else delete s.styles[id];
        }
    });
    pulseSelection();
    playAeroClickSound(820, 0.08);
    if (!p.sticky) endPainter();
}

function endPainter() {
    painterApply.pending = null;
    document.body.classList.remove('painting');
    const b = document.querySelector('[data-cmd="painter"]');
    if (b) b.classList.remove('on');
    if (!clip) hideAnts();
}

// ==========================================
// CLIPBOARD
// ==========================================
let clip = null;

function showAnts(R) {
    const a = document.getElementById('copy-ants');
    a.hidden = false;
    placeBox(a, rangeRect(R), 1);
    a._R = R;
    a._sheet = sh().id;
}

function hideAnts() {
    const a = document.getElementById('copy-ants');
    if (a) a.hidden = true;
}

function clearClip() {
    clip = null;
    hideAnts();
    if (painterApply.pending) endPainter();
    setStatusInfo('');
}

function onGridScroll() {
    const a = document.getElementById('copy-ants');
    if (a && !a.hidden && a._R && a._sheet === sh().id) placeBox(a, rangeRect(a._R), 1);
}

function clipFromSelection(cut) {
    const R = rng();
    const s = sh();
    const cells = [];
    const lines = [];
    let html = '<table>';
    for (let r = R.r0; r <= R.r1; r++) {
        const row = [], txt = [];
        html += '<tr>';
        for (let c = R.c0; c <= R.c1; c++) {
            const id = idOf(r, c);
            row.push({ raw: s.data[id], st: s.styles[id] ? JSON.parse(JSON.stringify(s.styles[id])) : null, note: s.notes[id], v: valueAt(r, c) });
            const t = displayText(r, c);
            txt.push(/[\t\n"]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t);
            html += `<td>${escapeHtml(t)}</td>`;
        }
        html += '</tr>';
        cells.push(row);
        lines.push(txt.join('\t'));
    }
    html += '</table>';
    const tsv = lines.join('\n');
    return { sheetId: s.id, R, cells, cut, tsv, html };
}

function onCopy(e, cut) {
    if (extras.length) { e.preventDefault(); toast("That command can't be used on multiple selections!"); return; }
    clip = clipFromSelection(cut);
    e.clipboardData.setData('text/plain', clip.tsv);
    e.clipboardData.setData('text/html', clip.html);
    e.preventDefault();
    showAnts(clip.R);
    setStatusInfo('Select destination and press ENTER or choose Paste!');
    toast(cut ? 'Cut! Pick a spot and paste!' : 'Copied!');
}

function doCopy(cut) {
    if (!needSingleRange()) return;
    clip = clipFromSelection(cut);
    showAnts(clip.R);
    setStatusInfo('Select destination and press ENTER or choose Paste!');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(clip.tsv).catch(() => {});
    toast(cut ? 'Cut! Pick a spot and paste!' : 'Copied!');
}

function onPaste(e) {
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (clip && (text === clip.tsv || !text)) pasteClip('all');
    else if (text) pasteExternal(text);
}

async function pasteFromButton(modeName) {
    if (clip) { pasteClip(modeName); return; }
    try {
        const text = await navigator.clipboard.readText();
        if (text) pasteExternal(text);
    } catch (err) {
        toast('Press ⌘V to paste from other apps!');
    }
}

function parseDelimited(text, delim) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (q) {
            if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
            else cell += ch;
        } else if (ch === '"' && cell === '') q = true;
        else if (ch === delim) { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

function ensureSize(s, rows, cols) {
    let grew = false;
    if (rows > s.rows) { s.rows = Math.min(MAX_ROWS, rows + 20); grew = true; }
    if (cols > s.cols) { s.cols = Math.min(MAX_COLS, cols + 2); grew = true; }
    return grew;
}

function pasteExternal(text) {
    const delim = text.includes('\t') ? '\t' : (text.split('\n')[0].includes(',') && text.split('\n').length > 1 ? ',' : '\t');
    const rows = parseDelimited(text.replace(/\n$/, ''), delim);
    if (!rows.length) return;
    const s = sh();
    const r0 = rng().r0, c0 = rng().c0;
    let grew = false;
    change(() => {
        grew = ensureSize(s, r0 + rows.length - 1, c0 + Math.max(...rows.map(r => r.length)));
        rows.forEach((row, i) => row.forEach((v, j) => {
            if (r0 + i > s.rows || c0 + j >= s.cols) return;
            setRaw(s, r0 + i, c0 + j, v);
            autoFormat(s, r0 + i, c0 + j, v);
        }));
        sel.anchor = { r: r0, c: c0 };
        sel.focus = clampCell({ r: r0 + rows.length - 1, c: c0 + Math.max(...rows.map(r => r.length)) - 1 });
    }, { rebuild: grew });
    cascadeIn(rng());
}

function cascadeIn(R) {
    let n = 0;
    for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) if (n++ < 400) animCell(r, c, 'in', Math.min(500, ((r - R.r0) + (c - R.c0)) * 22));
}

function pasteClip(modeName) {
    if (!clip) return;
    const s = sh();
    const src = book.sheets.find(x => x.id === clip.sheetId);
    const D = rng();
    let h = clip.cells.length, w = clip.cells[0].length;
    const transpose = modeName === 'transpose';
    if (transpose) { const t = h; h = w; w = t; }
    // Tile when the destination is a whole multiple of the copied block!
    const dh = D.r1 - D.r0 + 1, dw = D.c1 - D.c0 + 1;
    const tilesR = dh % h === 0 ? dh / h : 1, tilesC = dw % w === 0 ? dw / w : 1;
    const target = { r0: D.r0, c0: D.c0, r1: D.r0 + h * tilesR - 1, c1: D.c0 + w * tilesC - 1 };
    let grew = false;
    change(() => {
        grew = ensureSize(s, target.r1, target.c1 + 1);
        if (clip.cut && src) {
            for (let r = clip.R.r0; r <= clip.R.r1; r++) for (let c = clip.R.c0; c <= clip.R.c1; c++) {
                const id = idOf(r, c);
                delete src.data[id]; delete src.styles[id]; delete src.notes[id];
            }
        }
        for (let tr = 0; tr < tilesR; tr++) for (let tc = 0; tc < tilesC; tc++) {
            for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
                const cell = transpose ? clip.cells[j][i] : clip.cells[i][j];
                const r = target.r0 + tr * h + i, c = target.c0 + tc * w + j;
                if (r > s.rows || c >= s.cols) continue;
                const srcR = clip.R.r0 + (transpose ? j : i), srcC = clip.R.c0 + (transpose ? i : j);
                const id = idOf(r, c);
                if (modeName !== 'formats') {
                    let raw = cell.raw;
                    if (modeName === 'values') {
                        const v = cell.v;
                        raw = v === null || v === undefined ? undefined : (typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : isErrVal(v) ? v.code : String(v));
                    } else if (raw && raw[0] === '=' && !clip.cut) raw = FormulaEngine.shiftFormula(raw, r - srcR, c - srcC);
                    setRaw(s, r, c, raw);
                    if (cell.note && modeName === 'all') s.notes[id] = cell.note;
                }
                if (modeName !== 'values' && modeName !== 'formulas') {
                    if (cell.st) s.styles[id] = JSON.parse(JSON.stringify(cell.st)); else delete s.styles[id];
                }
            }
        }
        if (clip.cut && src === s && !transpose && tilesR === 1 && tilesC === 1) followMove(src, clip.R, target.r0 - clip.R.r0, target.c0 - clip.R.c0);
        sel.anchor = { r: target.r0, c: target.c0 };
        sel.focus = clampCell({ r: target.r1, c: target.c1 });
        sel.act = { r: target.r0, c: target.c0 };
    }, { rebuild: grew });
    cascadeIn(target);
    if (clip.cut) { clearClip(); }
    playAeroClickSound(720, 0.07);
}

// ==========================================
// RIBBON STATE & COMBOS
// ==========================================
function syncRibbonState() {
    if (!document.getElementById('ribbon')) return;
    const st = curStyle();
    const on = (cmd, v) => document.querySelectorAll(`[data-cmd="${cmd}"]`).forEach(b => b.classList.toggle('on', !!v));
    on('bold', st.b); on('italic', st.i); on('underline', st.u); on('strike', st.s);
    on('alignLeft', st.align === 'left'); on('alignCenter', st.align === 'center'); on('alignRight', st.align === 'right');
    on('alignTop', st.valign === 'top'); on('alignMiddle', st.valign === 'middle'); on('alignBottom', !st.valign || st.valign === 'bottom');
    on('wrap', st.wrap);
    on('filter', !!sh().filter);
    const fn = document.getElementById('font-name');
    if (fn && document.activeElement !== fn) { fn.value = fontLabel(st.font); fn.style.fontFamily = st.font || ''; }
    const fs = document.getElementById('font-size');
    if (fs && document.activeElement !== fs) fs.value = st.size || 13;
    const fm = document.getElementById('fmt-name');
    if (fm) fm.value = (FORMATS[st.fmt || 'general'] || FORMATS.general).label;
}

function wireCombos() {
    const fn = document.getElementById('font-name');
    fn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const v = fn.value.trim();
            const hit = FONT_LIST.find(f => f[0].toLowerCase() === v.toLowerCase());
            setFont(hit ? hit[1] : (v ? `'${v.replace(/'/g, '')}', sans-serif` : ''));
            focusGrid();
        }
        if (e.key === 'Escape') { syncRibbonState(); focusGrid(); }
    });
    fn.addEventListener('focus', () => { if (isEditing()) commitEdit(0, 0); fn.select(); });
    const fs = document.getElementById('font-size');
    fs.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); setFontSize(fs.value); focusGrid(); }
        if (e.key === 'Escape') { syncRibbonState(); focusGrid(); }
    });
    fs.addEventListener('focus', () => { if (isEditing()) commitEdit(0, 0); fs.select(); });

    const nb = document.getElementById('name-box');
    nb.addEventListener('focus', () => { if (isEditing()) commitEdit(0, 0); nb.select(); });
    nb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); goToRef(nb.value); nb.blur(); focusGrid(); }
        if (e.key === 'Escape') { nb.blur(); updateNameBox(); focusGrid(); }
    });
    nb.addEventListener('blur', () => setTimeout(updateNameBox, 0));

    document.getElementById('fx-cancel').addEventListener('mousedown', (e) => { e.preventDefault(); cancelEdit(); });
    document.getElementById('fx-enter').addEventListener('mousedown', (e) => { e.preventDefault(); if (isEditing()) commitEdit(0, 0); });
    document.getElementById('fbar-expand').addEventListener('click', () => document.body.classList.toggle('fbar-tall'));

    const bn = document.getElementById('book-name');
    syncBookName();
    bn.addEventListener('input', () => { bn.size = Math.max(6, bn.value.length + 1); });
    bn.addEventListener('change', () => { book.name = bn.value.trim() || 'Book1'; syncBookName(); persistSheets(); });
    bn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') { bn.blur(); focusGrid(); } });
    document.title = book.name + ' - Imbuer';
}

function syncBookName() {
    const bn = document.getElementById('book-name');
    bn.value = book.name;
    bn.size = Math.max(6, book.name.length + 1);
    document.title = book.name + ' - Imbuer';
}

// Loading a different workbook drops the old clipboard marquee!
function resetTransient() {
    clip = null;
    hideAnts();
    setStatusInfo('');
    selectedChart = null;
    filterHidden = {};
}

// Go to "C10", "A1:D5", "Sheet2!B3" or a whole column/row!
function goToRef(text) {
    text = String(text || '').trim();
    if (!text) return false;
    let sheetName = null, ref = text;
    const bang = text.lastIndexOf('!');
    if (bang > 0) { sheetName = text.slice(0, bang).replace(/^'|'$/g, '').replace(/''/g, "'"); ref = text.slice(bang + 1); }
    if (sheetName) {
        const i = book.sheets.findIndex(s => s.name.toLowerCase() === sheetName.toLowerCase());
        if (i < 0) { toast('There is no sheet named ' + sheetName + '!'); return false; }
        switchSheet(i);
    }
    const refs = FormulaEngine.refsIn('=' + ref.toUpperCase());
    if (!refs.length) { toast("That isn't a cell or range!"); return false; }
    const x = refs[0].ref;
    const s = sh();
    const R = { r0: x.r0, r1: Math.min(x.r1, s.rows), c0: x.c0, c1: Math.min(x.c1, s.cols - 1) };
    if (R.r0 > s.rows || R.c0 >= s.cols) {
        if (ensureSize(s, R.r1, R.c1 + 1)) initGrid();
    }
    if (R.r0 === R.r1 && R.c0 === R.c1) selectCell(R.r0, R.c0);
    else selectRange(R, { shine: true });
    return true;
}

async function goToDialog() {
    const v = await promptDialog('Go To', 'Reference (like C10, A1:D5 or Sheet2!B3)', idOf(sel.act.r, sel.act.c));
    if (v) goToRef(v);
}

// ==========================================
// MENU DEFINITIONS
// ==========================================
function fnMenu(cat) {
    return FormulaEngine.functionList().filter(f => f.cat === cat).map(f => ({
        label: f.name, title: f.sig + ' — ' + f.desc, run: () => insertFunctionName(f.name),
    }));
}

const MENUS = {
    layout: () => [
        { label: 'Excel', icon: 'layout', checked: prefs.layout !== 'classic', run: () => setLayout('excel') },
        { label: 'Imbuer Classic', icon: 'sparkle', checked: prefs.layout === 'classic', run: () => setLayout('classic') },
        { sep: true },
        { label: 'Settings…', icon: 'gear', run: () => openBackstage('options') },
    ],
    paste: () => [
        { label: 'Paste', icon: 'paste', kbd: '⌘V', run: () => pasteFromButton('all') },
        { label: 'Paste Values', icon: 'paste', run: () => pasteFromButton('values') },
        { label: 'Paste Formulas', icon: 'paste', run: () => pasteFromButton('formulas') },
        { label: 'Paste Formatting', icon: 'brush', run: () => pasteFromButton('formats') },
        { label: 'Transpose', icon: 'refresh', run: () => pasteFromButton('transpose') },
    ],
    fonts: () => FONT_LIST.map(f => ({ label: f[0], style: `font-family:${f[1] || 'inherit'}`, checked: (curStyle().font || '') === f[1], run: () => setFont(f[1]) })),
    sizes: () => FONT_SIZES.map(sz => ({ label: String(sz), checked: (curStyle().size || 13) === sz, run: () => setFontSize(sz) })),
    borders: () => {
        const b = (label, kind) => ({ label, icon: 'borders', run: () => setBorders(kind) });
        return [
            b('Bottom Border', 'bottom'), b('Top Border', 'top'), b('Left Border', 'left'), b('Right Border', 'right'),
            { sep: true },
            b('No Border', 'none'), b('All Borders', 'all'), b('Outside Borders', 'outside'), b('Thick Outside Borders', 'thickOutside'),
            { sep: true },
            b('Bottom Double Border', 'doubleBottom'), b('Thick Bottom Border', 'thickBottom'), b('Top and Bottom Border', 'topBottom'),
            { sep: true },
            { label: 'Border Color…', icon: 'droplet', run: () => paletteMenu(document.querySelector('[data-menu="borders"]'), { onPick: (c) => setBorders(lastBorder === 'none' ? 'all' : lastBorder, c || '#000000') }) },
        ];
    },
    numFormats: () => Object.keys(FORMATS).map(k => ({
        html: `<span class="nf-name">${FORMATS[k].label}</span><span class="nf-sample">${escapeHtml(sampleFor(k))}</span>`,
        label: FORMATS[k].label, checked: (curStyle().fmt || 'general') === k, run: () => setNumFormat(k),
    })).concat([{ sep: true }, { label: 'More Number Formats…', icon: 'format', run: () => formatCellsDialog() }]),
    autoSum: () => [
        { html: '<b class="glyph sigma">Σ</b> Sum', label: 'Sum', run: () => autoSum('SUM') },
        { label: 'Average', run: () => autoSum('AVERAGE') },
        { label: 'Count Numbers', run: () => autoSum('COUNT') },
        { label: 'Max', run: () => autoSum('MAX') },
        { label: 'Min', run: () => autoSum('MIN') },
        { sep: true },
        { label: 'More Functions…', run: () => insertFunctionDialog() },
    ],
    fill: () => [
        { label: 'Down', icon: 'fillDown', kbd: '⌘D', run: () => fillDir('down') },
        { label: 'Right', icon: 'arrowR', kbd: '⌘R', run: () => fillDir('right') },
        { label: 'Up', icon: 'chevUp', run: () => fillDir('up') },
        { label: 'Left', icon: 'arrowL', run: () => fillDir('left') },
        { sep: true },
        { label: 'Series…', icon: 'fillDown', run: () => runCmd('fillSeries') },
    ],
    clear: () => [
        { label: 'Clear All', icon: 'eraser', run: () => runCmd('clearAll') },
        { label: 'Clear Formats', icon: 'eraser', run: () => runCmd('clearFormats') },
        { label: 'Clear Contents', icon: 'eraser', kbd: 'Del', run: () => runCmd('clearContents') },
        { label: 'Clear Notes', icon: 'note', run: () => change(() => clearContents(null, 'notes')) },
    ],
    findSelect: () => [
        { label: 'Find…', icon: 'find', kbd: '⌘F', run: () => openFind(false) },
        { label: 'Replace…', icon: 'refresh', kbd: '⌃H', run: () => openFind(true) },
        { label: 'Go To…', icon: 'goto', kbd: '⌘G', run: goToDialog },
        { sep: true },
        { label: 'Select Formulas', icon: 'showFormulas', run: () => selectWhere(raw => raw[0] === '=') },
        { label: 'Select Notes', icon: 'note', run: () => selectWhere((raw, id) => !!sh().notes[id], true) },
        { label: 'Select Constants', icon: 'calc', run: () => selectWhere(raw => raw[0] !== '=') },
    ],
    insertCells: () => [
        { label: 'Insert Sheet Rows', icon: 'insertRow', run: () => runCmd('insertRows') },
        { label: 'Insert Sheet Columns', icon: 'insertRow', run: () => runCmd('insertCols') },
        { sep: true },
        { label: 'Insert Sheet', icon: 'plus', kbd: '⇧F11', run: () => addSheet() },
    ],
    deleteCells: () => [
        { label: 'Delete Sheet Rows', icon: 'deleteRow', run: () => runCmd('deleteRows') },
        { label: 'Delete Sheet Columns', icon: 'deleteRow', run: () => runCmd('deleteCols') },
        { sep: true },
        { label: 'Delete Sheet', icon: 'trash', run: () => deleteSheet(book.active) },
    ],
    formatCells: () => [
        { header: 'Cell Size' },
        { label: 'Row Height…', icon: 'rowH', run: rowHeightDialog },
        { label: 'AutoFit Row Height', icon: 'rowH', run: () => { const R = rng(); change(() => { for (let r = R.r0; r <= R.r1; r++) autoFit('row', r, true); }, { rebuild: true }); } },
        { label: 'Column Width…', icon: 'colW', run: colWidthDialog },
        { label: 'AutoFit Column Width', icon: 'colW', run: () => { const R = rng(); change(() => { for (let c = R.c0; c <= R.c1; c++) autoFit('col', c, true); }, { rebuild: true }); } },
        { label: 'Default Width…', icon: 'colW', run: colWidthDialog },
        { header: 'Visibility' },
        { label: 'Hide & Unhide', icon: 'eyeOff', sub: () => [
            { label: 'Hide Rows', icon: 'eyeOff', run: () => hideRows(true) },
            { label: 'Hide Columns', icon: 'eyeOff', run: () => hideCols(true) },
            { label: 'Unhide Rows', icon: 'eye', run: () => hideRows(false) },
            { label: 'Unhide Columns', icon: 'eye', run: () => hideCols(false) },
        ] },
        { header: 'Organize Sheets' },
        { label: 'Rename Sheet', icon: 'pencil', run: () => renameSheetInline(book.active) },
        { label: 'Tab Color', icon: 'droplet', run: () => paletteMenu(document.querySelector('[data-menu="formatCells"]'), { auto: 'No Color', onPick: (c) => setTabColor(book.active, c) }) },
        { sep: true },
        { label: 'Format Cells…', icon: 'format', kbd: '⌘1', run: () => formatCellsDialog() },
    ],
    fillColor: (el) => paletteMenu(el, { auto: 'No Fill', gel: true, onPick: (c) => { if (c) lastFill = c; updateColorBars(); styleAll('fill', c); pulseSelection(); } }),
    fontColor: (el) => paletteMenu(el, { auto: 'Automatic', onPick: (c) => { if (c) lastFontColor = c; updateColorBars(); styleAll('color', c); pulseSelection(); } }),
    zoom: () => [25, 50, 75, 100, 125, 150, 200, 300].map(z => ({ label: z + '%', checked: Math.round(zf() * 100) === z, run: () => setZoom(z / 100) })).concat([{ sep: true }, { label: 'Zoom to Selection', icon: 'zoomSel', run: zoomToSelection }]),
    goto: () => [{ label: 'Go To…', icon: 'goto', kbd: '⌘G', run: goToDialog }, { sep: true }].concat(book.sheets.map((s, i) => ({ label: s.name, icon: 'table', checked: i === book.active, run: () => switchSheet(i) }))),
    symbols: () => {
        const sy = ['©', '®', '™', '°', '±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '√', 'π', 'Σ', 'Δ', 'µ', '€', '£', '¥', '¢', '§', '¶', '•', '→', '←', '↑', '↓', '★', '☆', '✓', '✗', '♥', '☀', '☁', '⚡'];
        return [{
            html: `<div class="sym-grid">${sy.map(c => `<button data-sym="${c}">${c}</button>`).join('')}</div>`,
            wire: (d) => d.addEventListener('click', (e) => { const b = e.target.closest('[data-sym]'); if (!b) return; closeMenus(); insertSymbol(b.dataset.sym); }),
        }];
    },
    fnMath: () => fnMenu('Math'),
    fnStatistical: () => fnMenu('Statistical'),
    fnLogical: () => fnMenu('Logical').concat([{ sep: true }], fnMenu('Information')),
    fnText: () => fnMenu('Text'),
    fnLookup: () => fnMenu('Lookup'),
    fnDate: () => fnMenu('Date'),
};

function registerMenus(more) {
    Object.assign(MENUS, more);
}

function sampleFor(fmt) {
    const v = valueAt(sel.act.r, sel.act.c);
    const n = typeof v === 'number' ? v : 1234.5;
    if (fmt === 'general') return typeof v === 'number' ? fmtGeneral(v) : (v === null ? '' : String(v)).slice(0, 14);
    if (fmt === 'text') return typeof v === 'number' ? String(v) : 'Abc';
    return formatValue(n, { fmt, dec: FORMATS[fmt].dec }).slice(0, 26);
}

function insertSymbol(ch) {
    if (isEditing()) {
        const inp = activeInput();
        const a = inp.selectionStart;
        inp.value = inp.value.slice(0, a) + ch + inp.value.slice(inp.selectionEnd);
        inp.setSelectionRange(a + ch.length, a + ch.length);
        inp.focus();
        edInput(inp.id === 'formula-input');
    } else startEdit({ initial: (sh().data[idOf(sel.act.r, sel.act.c)] || '') + ch });
}

function selectWhere(test, includeEmpty) {
    const s = sh();
    const hits = [];
    const keys = new Set(Object.keys(s.data));
    if (includeEmpty) Object.keys(s.notes).forEach(k => keys.add(k));
    for (const k of keys) {
        const raw = s.data[k] || '';
        if ((raw !== '' || includeEmpty) && test(raw, k)) hits.push(rcOf(k));
    }
    if (!hits.length) { toast('No cells were found!'); return; }
    hits.sort((a, b) => a.r - b.r || a.c - b.c);
    const first = hits[0];
    sel = { anchor: { ...first }, focus: { ...first }, act: { ...first } };
    extras = hits.slice(1, 400).map(p => ({ r0: p.r, r1: p.r, c0: p.c, c1: p.c }));
    drawSel({ scroll: true });
    toast(hits.length + ' cell' + (hits.length === 1 ? '' : 's') + ' selected!');
}

function updateColorBars() {
    const fb = document.getElementById('fill-bar');
    const tb = document.getElementById('font-bar');
    if (fb) fb.style.background = lastFill;
    if (tb) tb.style.background = lastFontColor;
}

// ==========================================
// FORMAT CELLS DIALOG
// ==========================================
async function formatCellsDialog() {
    const st = curStyle();
    const cur = st.fmt || 'general';
    const v = valueAt(sel.act.r, sel.act.c);
    const body = `<div class="fc-grid">
        <div class="fc-list" role="listbox">${Object.keys(FORMATS).map(k => `<button class="fc-opt${k === cur ? ' on' : ''}" data-f="${k}">${FORMATS[k].label}</button>`).join('')}</div>
        <div class="fc-side">
            <div class="fc-sample-label">Sample</div>
            <div class="fc-sample" id="fc-sample"></div>
            <label class="dlg-field inline"><span>Decimal places</span><input type="number" id="fc-dec" min="0" max="12" value="${st.dec !== undefined ? st.dec : (FORMATS[cur].dec !== undefined ? (cur === 'percent' ? 0 : FORMATS[cur].dec) : 2)}"></label>
            <label class="dlg-check"><input type="checkbox" id="fc-sep"${st.sep ? ' checked' : ''}> Use 1000 separator (,)</label>
            <p class="dlg-hint" id="fc-desc"></p>
        </div>
    </div>`;
    let chosen = cur;
    const DESC = {
        general: 'General cells have no specific number format!', number: 'For general display of numbers!', currency: 'For money values, with a $ sign!',
        accounting: 'Lines up currency symbols and decimal points!', date: 'Shows date serial numbers as dates!', longdate: 'Dates with the weekday spelled out!',
        time: 'Shows the time of day!', percent: 'Multiplies by 100 and adds a % sign!', comma: 'Thousands separators and decimals!',
        fraction: 'Shows decimals as the nearest fraction!', scientific: 'Exponent notation for really big or tiny numbers!', text: 'Treats the cell as text, even numbers!',
    };
    const r = await openDialog({
        title: 'Format Cells', body, width: 470,
        onOpen: (d) => {
            const upd = () => {
                const dec = +d.querySelector('#fc-dec').value;
                const sep = d.querySelector('#fc-sep').checked;
                const sample = typeof v === 'number' ? v : 1234.5678;
                d.querySelector('#fc-sample').textContent = chosen === 'text' ? String(v === null ? 'Abc' : v) : formatValue(sample, { fmt: chosen, dec, sep });
                d.querySelector('#fc-desc').textContent = DESC[chosen] || '';
                const decOk = ['number', 'currency', 'accounting', 'percent', 'comma', 'scientific'].includes(chosen);
                d.querySelector('#fc-dec').disabled = !decOk;
                d.querySelector('#fc-sep').disabled = chosen !== 'number';
            };
            d.querySelectorAll('.fc-opt').forEach(b => b.addEventListener('click', () => {
                d.querySelectorAll('.fc-opt').forEach(x => x.classList.remove('on'));
                b.classList.add('on');
                chosen = b.dataset.f;
                if (FORMATS[chosen].dec !== undefined && st.fmt !== chosen) d.querySelector('#fc-dec').value = chosen === 'percent' ? 0 : FORMATS[chosen].dec;
                upd();
            }));
            d.querySelector('#fc-dec').addEventListener('input', upd);
            d.querySelector('#fc-sep').addEventListener('change', upd);
            upd();
        },
    });
    if (r.value !== 'ok') return;
    const dec = +r.el.querySelector('#fc-dec').value;
    const sep = r.el.querySelector('#fc-sep').checked;
    change(() => {
        for (const R of allRanges()) {
            setStyleProp(R, 'fmt', chosen === 'general' ? null : chosen);
            setStyleProp(R, 'dec', FORMATS[chosen].dec !== undefined ? dec : null);
            setStyleProp(R, 'sep', chosen === 'number' && sep ? true : null);
        }
    });
    pulseSelection();
}

// ==========================================
// ROWS & COLUMNS (insert/delete keep formulas pointing at the right cells)
// ==========================================
function shiftKeyed(obj, axis, at, n) {
    const out = {};
    for (const k of Object.keys(obj)) {
        const p = rcOf(k);
        let { r, c } = p;
        if (axis === 'row') {
            if (n < 0 && r >= at && r < at - n) continue;
            if (r >= at) r += n;
        } else {
            if (n < 0 && c >= at && c < at - n) continue;
            if (c >= at) c += n;
        }
        if (r < 1 || c < 0) continue;
        out[idOf(r, c)] = obj[k];
    }
    return out;
}

function shiftIndexed(obj, at, n) {
    const out = {};
    for (const k of Object.keys(obj)) {
        let i = +k;
        if (n < 0 && i >= at && i < at - n) continue;
        if (i >= at) i += n;
        out[i] = obj[k];
    }
    return out;
}

function shiftRangeObj(R, axis, at, n) {
    if (!R) return R;
    const a = axis === 'row' ? 'r0' : 'c0', b = axis === 'row' ? 'r1' : 'c1';
    const X = Object.assign({}, R);
    if (n > 0) {
        if (X[a] >= at) X[a] += n;
        if (X[b] >= at) X[b] += n;
    } else {
        const cnt = -n, end = at + cnt - 1;
        if (X[a] >= at && X[b] <= end) return null;
        if (X[a] > end) X[a] -= cnt; else if (X[a] >= at) X[a] = at;
        if (X[b] > end) X[b] -= cnt; else if (X[b] >= at) X[b] = at - 1;
    }
    return X;
}

function structuralChange(axis, at, n) {
    const s = sh();
    s.data = shiftKeyed(s.data, axis, at, n);
    s.styles = shiftKeyed(s.styles, axis, at, n);
    s.notes = shiftKeyed(s.notes, axis, at, n);
    s.sparks = shiftKeyed(s.sparks, axis, at, n);
    if (axis === 'row') {
        s.rowH = shiftIndexed(s.rowH, at, n);
        s.hiddenRows = shiftIndexed(s.hiddenRows, at, n);
        s.rows = Math.max(1, Math.min(MAX_ROWS, s.rows + n));
    } else {
        s.colW = shiftIndexed(s.colW, at, n);
        s.hiddenCols = shiftIndexed(s.hiddenCols, at, n);
        s.cols = Math.max(1, Math.min(MAX_COLS, s.cols + n));
    }
    // Every formula in the workbook that points here follows the move!
    for (const other of book.sheets) {
        for (const k of Object.keys(other.data)) {
            const v = other.data[k];
            if (typeof v === 'string' && v[0] === '=') {
                other.data[k] = FormulaEngine.adjustFormula(v, { axis, at, count: n, sheet: s.name, formulaSheet: other.name });
            }
        }
    }
    for (const id of Object.keys(s.sparks)) {
        const sp = s.sparks[id];
        const moved = FormulaEngine.adjustFormula('=' + sp.src, { axis, at, count: n, sheet: s.name, formulaSheet: s.name }).slice(1);
        if (/#REF!/.test(moved)) delete s.sparks[id]; else sp.src = moved;
    }
    s.cf = s.cf.map(rule => { const R = shiftRangeObj(rule, axis, at, n); return R ? Object.assign(rule, R) : null; }).filter(Boolean);
    s.charts.forEach(ch => { const R = shiftRangeObj(ch.src, axis, at, n); if (R) ch.src = R; });
    if (s.filter) {
        const R = shiftRangeObj(s.filter, axis, at, n);
        if (!R) s.filter = null;
        else {
            if (axis === 'col' && s.filter.cols) {
                const cols = {};
                for (const k of Object.keys(s.filter.cols)) { let c = +k; if (n < 0 && c >= at && c < at - n) continue; if (c >= at) c += n; cols[c] = s.filter.cols[k]; }
                R.cols = cols;
            }
            s.filter = Object.assign(s.filter, R);
        }
    }
    if (axis === 'row' && s.freeze.r >= at) s.freeze.r = Math.max(0, s.freeze.r + (n > 0 ? n : Math.max(n, at - 1 - s.freeze.r)));
    if (axis === 'col' && s.freeze.c > at) s.freeze.c = Math.max(0, s.freeze.c + (n > 0 ? n : Math.max(n, at - s.freeze.c)));
}

function insertRowsAtSel() {
    const R = rng();
    const n = R.r1 - R.r0 + 1;
    if (sh().rows + n > MAX_ROWS) { toast('That would go past ' + MAX_ROWS + ' rows!'); return; }
    change(() => structuralChange('row', R.r0, n), { rebuild: true });
    for (let r = R.r0; r < R.r0 + n; r++) for (let c = 0; c < Math.min(sh().cols, 30); c++) animCell(r, c, 'in', c * 12);
    toast('Inserted ' + n + ' row' + (n > 1 ? 's' : '') + '!');
}

function insertColsAtSel() {
    const R = rng();
    const n = R.c1 - R.c0 + 1;
    if (sh().cols + n > MAX_COLS) { toast('That would go past ' + MAX_COLS + ' columns!'); return; }
    change(() => structuralChange('col', R.c0, n), { rebuild: true });
    for (let c = R.c0; c < R.c0 + n; c++) for (let r = 1; r <= Math.min(sh().rows, 40); r++) animCell(r, c, 'in', r * 10);
    toast('Inserted ' + n + ' column' + (n > 1 ? 's' : '') + '!');
}

function deleteRowsAtSel() {
    const R = rng();
    const s = sh();
    const n = R.r1 - R.r0 + 1;
    if (n >= s.rows) { toast("You can't delete every row!"); return; }
    poof({ r0: R.r0, r1: R.r1, c0: 0, c1: s.cols - 1 });
    setTimeout(() => {
        change(() => structuralChange('row', R.r0, -n), { rebuild: true });
        selectCell(Math.min(R.r0, sh().rows), sel.act.c, { scroll: false });
    }, prefs.anim ? 160 : 0);
}

function deleteColsAtSel() {
    const R = rng();
    const s = sh();
    const n = R.c1 - R.c0 + 1;
    if (n >= s.cols) { toast("You can't delete every column!"); return; }
    poof({ r0: 1, r1: s.rows, c0: R.c0, c1: R.c1 });
    setTimeout(() => {
        change(() => structuralChange('col', R.c0, -n), { rebuild: true });
        selectCell(sel.act.r, Math.min(R.c0, sh().cols - 1), { scroll: false });
    }, prefs.anim ? 160 : 0);
}

function hideRows(hide) {
    const R = rng();
    const s = sh();
    change(() => {
        if (hide) { for (let r = R.r0; r <= R.r1; r++) s.hiddenRows[r] = 1; }
        else if (R.r0 === R.r1) { s.hiddenRows = {}; }
        else for (let r = R.r0; r <= R.r1; r++) delete s.hiddenRows[r];
    }, { rebuild: true });
    toast(hide ? 'Rows hidden! Select around them and Unhide to bring them back!' : 'Rows unhidden!');
}

function hideCols(hide) {
    const R = rng();
    const s = sh();
    if (hide && R.c1 - R.c0 + 1 >= s.cols) { toast("You can't hide every column!"); return; }
    change(() => {
        if (hide) { for (let c = R.c0; c <= R.c1; c++) s.hiddenCols[c] = 1; }
        else if (R.c0 === R.c1) { s.hiddenCols = {}; }
        else for (let c = R.c0; c <= R.c1; c++) delete s.hiddenCols[c];
    }, { rebuild: true });
    toast(hide ? 'Columns hidden!' : 'Columns unhidden!');
}

async function rowHeightDialog() {
    const R = rng();
    const v = await promptDialog('Row Height', 'Row height (pixels)', sh().rowH[R.r0] || DEF_H);
    if (v === null || !(+v > 0)) return;
    change(() => { for (let r = R.r0; r <= R.r1; r++) sh().rowH[r] = Math.min(400, Math.round(+v)); }, { rebuild: true });
}

async function colWidthDialog() {
    const R = rng();
    const v = await promptDialog('Column Width', 'Column width (pixels)', colWidth(R.c0));
    if (v === null || !(+v > 0)) return;
    change(() => { for (let c = R.c0; c <= R.c1; c++) sh().colW[c] = Math.min(800, Math.round(+v)); }, { rebuild: true });
}

// ==========================================
// SHEET TABS
// ==========================================
function drawSheetTabs() {
    const host = document.getElementById('sheet-tabs');
    if (!host) return;
    const ink = document.getElementById('sheet-ink');
    // Same tabs? Just move the highlight (so double-click to rename still lands)!
    const existing = [...host.querySelectorAll('.stab')];
    if (existing.length === book.sheets.length && existing.every((b, i) => b.textContent === book.sheets[i].name && (b.style.getPropertyValue('--tab') || '') === (book.sheets[i].tabColor || ''))) {
        existing.forEach((b, i) => b.classList.toggle('on', i === book.active));
        requestAnimationFrame(moveSheetInk);
        return;
    }
    existing.forEach(b => b.remove());
    host.querySelectorAll('.stab-edit').forEach(b => b.remove());
    book.sheets.forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'stab' + (i === book.active ? ' on' : '');
        b.dataset.i = i;
        b.textContent = s.name;
        if (s.tabColor) b.style.setProperty('--tab', s.tabColor);
        host.insertBefore(b, ink);
    });
    requestAnimationFrame(moveSheetInk);
}

function moveSheetInk() {
    const host = document.getElementById('sheet-tabs');
    const ink = document.getElementById('sheet-ink');
    const on = host.querySelector('.stab.on');
    if (!on) return;
    ink.style.left = on.offsetLeft + 'px';
    ink.style.width = on.offsetWidth + 'px';
    if (on.offsetLeft < host.scrollLeft || on.offsetLeft + on.offsetWidth > host.scrollLeft + host.clientWidth) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function uniqueSheetName(base) {
    let i = 1, name = base;
    const taken = new Set(book.sheets.map(s => s.name.toLowerCase()));
    if (/\d+$/.test(base)) { const m = /^(.*?)(\d+)$/.exec(base); base = m[1]; i = +m[2]; }
    while (taken.has(name.toLowerCase())) name = base + (++i);
    return name;
}

function addSheet(sheet, at) {
    if (isEditing()) commitEdit(0, 0);
    pushUndo();
    let n = book.sheets.length + 1;
    while (book.sheets.some(s => s.name.toLowerCase() === 'sheet' + n)) n++;
    const s = sheet || newSheet('Sheet' + n);
    const idx = Math.max(0, Math.min(book.sheets.length, at === undefined ? book.active + 1 : at));
    book.sheets.splice(idx, 0, s);
    if (idx <= book.active) book.active++;
    recalc();
    switchSheet(idx);
    const tab = document.querySelector(`.stab[data-i="${idx}"]`);
    if (tab) restartAnim(tab, 'tab-in');
    persistSheets();
    return s;
}

async function deleteSheet(i) {
    if (book.sheets.length <= 1) { toast('A workbook needs at least one sheet!'); return; }
    const s = book.sheets[i];
    if (Object.keys(s.data).length) {
        const ok = await confirmDialog('Delete Sheet', `Delete "${s.name}"? Formulas that use it will show #REF!.`, 'Delete', true);
        if (!ok) return;
    }
    const tab = document.querySelector(`.stab[data-i="${i}"]`);
    if (tab && prefs.anim) { tab.classList.add('tab-out'); await new Promise(r => setTimeout(r, 180)); }
    pushUndo();
    book.sheets.splice(i, 1);
    book.active = Math.min(book.active > i ? book.active - 1 : book.active, book.sheets.length - 1);
    filterHidden = {};
    recalc();
    initGrid();
    drawSheetTabs();
    persistSheets();
}

function duplicateSheet(i) {
    const copy = JSON.parse(JSON.stringify(book.sheets[i]));
    copy.id = uid();
    copy.name = uniqueSheetName(book.sheets[i].name.replace(/ \(\d+\)$/, '') + ' (2)');
    addSheet(copy, i + 1);
}

function validSheetName(name, except) {
    if (!name || name.length > 31) return 'Sheet names need 1 to 31 characters!';
    if (/[\\/?*[\]:]/.test(name)) return 'Sheet names can\'t use \\ / ? * [ ] or :!';
    if (book.sheets.some((s, i) => i !== except && s.name.toLowerCase() === name.toLowerCase())) return 'That name is already taken!';
    return null;
}

function renameSheet(i, name) {
    const err = validSheetName(name, i);
    if (err) { toast(err); return false; }
    const old = book.sheets[i].name;
    if (old === name) return true;
    pushUndo();
    book.sheets[i].name = name;
    for (const s of book.sheets) {
        for (const k of Object.keys(s.data)) {
            const v = s.data[k];
            if (typeof v === 'string' && v[0] === '=' && v.includes('!')) s.data[k] = FormulaEngine.renameSheetInFormula(v, old, name);
        }
    }
    recalc();
    renderAll(false);
    drawSheetTabs();
    persistSheets();
    return true;
}

function renameSheetInline(i) {
    const tab = document.querySelector(`.stab[data-i="${i}"]`);
    if (!tab) return;
    const inp = document.createElement('input');
    inp.className = 'stab-edit';
    inp.value = book.sheets[i].name;
    inp.style.width = Math.max(60, tab.offsetWidth) + 'px';
    tab.replaceWith(inp);
    inp.focus();
    inp.select();
    let done = false;
    const finish = (save) => {
        if (done) return;
        done = true;
        const name = inp.value.trim();
        inp.remove();
        if (save) renameSheet(i, name);
        drawSheetTabs();
        focusGrid();
    };
    inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
    });
    inp.addEventListener('blur', () => finish(true));
}

function setTabColor(i, c) {
    pushUndo();
    book.sheets[i].tabColor = c || null;
    drawSheetTabs();
    persistSheets();
}

function moveSheet(from, to) {
    if (to < 0 || to >= book.sheets.length || from === to) return;
    pushUndo();
    const activeId = sh().id;
    const [s] = book.sheets.splice(from, 1);
    book.sheets.splice(to, 0, s);
    book.active = book.sheets.findIndex(x => x.id === activeId);
    recalc();
    renderAll(false);
    // FLIP: tabs slide to their new spots!
    const host = document.getElementById('sheet-tabs');
    const before = {};
    host.querySelectorAll('.stab').forEach(t => { before[book.sheets[+t.dataset.i] ? t.textContent : ''] = t.getBoundingClientRect().left; });
    drawSheetTabs();
    if (prefs.anim) {
        host.querySelectorAll('.stab').forEach(t => {
            const was = before[t.textContent];
            if (was === undefined) return;
            const dx = was - t.getBoundingClientRect().left;
            if (!dx) return;
            t.style.transform = `translateX(${dx}px)`;
            t.style.transition = 'none';
            requestAnimationFrame(() => { t.style.transition = ''; t.style.transform = ''; });
        });
    }
    persistSheets();
}

function sheetTabMenu(i, point) {
    openMenu(null, [
        { label: 'Insert Sheet', icon: 'plus', run: () => addSheet(undefined, i + 1) },
        { label: 'Delete', icon: 'trash', disabled: book.sheets.length <= 1, run: () => deleteSheet(i) },
        { label: 'Rename', icon: 'pencil', run: () => renameSheetInline(i) },
        { label: 'Duplicate', icon: 'duplicate', run: () => duplicateSheet(i) },
        { sep: true },
        { label: 'Move Left', icon: 'arrowL', disabled: i === 0, run: () => moveSheet(i, i - 1) },
        { label: 'Move Right', icon: 'arrowR', disabled: i === book.sheets.length - 1, run: () => moveSheet(i, i + 1) },
        { sep: true },
        { label: 'Tab Color', icon: 'droplet', run: () => paletteMenu(document.querySelector(`.stab[data-i="${i}"]`), { auto: 'No Color', onPick: (c) => setTabColor(i, c) }) },
    ], { point });
}

function wireSheetTabs() {
    const host = document.getElementById('sheet-tabs');
    let tdrag = null;
    host.addEventListener('mousedown', (e) => {
        const t = e.target.closest('.stab');
        if (!t || e.button !== 0) return;
        const i = +t.dataset.i;
        if (i !== book.active) {
            if (isEditing() && canPoint()) { switchSheet(i, true); e.preventDefault(); return; }
            switchSheet(i);
        }
        tdrag = { i, x: e.clientX, moved: false };
        const move = (ev) => {
            if (!tdrag) return;
            if (Math.abs(ev.clientX - tdrag.x) > 6) tdrag.moved = true;
            if (!tdrag.moved) return;
            document.body.classList.add('tab-dragging');
            const tabs = [...host.querySelectorAll('.stab')];
            let to = tabs.length - 1;
            for (let k = 0; k < tabs.length; k++) { const r = tabs[k].getBoundingClientRect(); if (ev.clientX < r.left + r.width / 2) { to = k; break; } }
            host.querySelectorAll('.stab').forEach(x => x.classList.toggle('drop-here', +x.dataset.i === to && to !== tdrag.i));
            tdrag.to = to;
        };
        const up = () => {
            document.removeEventListener('mousemove', move);
            document.body.classList.remove('tab-dragging');
            host.querySelectorAll('.drop-here').forEach(x => x.classList.remove('drop-here'));
            if (tdrag && tdrag.moved && tdrag.to !== undefined) moveSheet(tdrag.i, tdrag.to);
            tdrag = null;
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up, { once: true });
    });
    host.addEventListener('dblclick', (e) => {
        const t = e.target.closest('.stab');
        if (t) renameSheetInline(+t.dataset.i);
    });
    host.addEventListener('contextmenu', (e) => {
        const t = e.target.closest('.stab');
        if (!t) return;
        e.preventDefault();
        sheetTabMenu(+t.dataset.i, { x: e.clientX, y: e.clientY });
    });
}

// ==========================================
// STATUS BAR
// ==========================================
function setStatusInfo(t) {
    const el = document.getElementById('status-info');
    if (el) el.textContent = t;
}

function fmtStat(n) {
    if (!isFinite(n)) return '';
    const st = curStyle();
    if (st.fmt && st.fmt !== 'general' && st.fmt !== 'text') return formatValue(n, st);
    return fmtGeneral(Math.round(n * 1e10) / 1e10);
}

let lastStats = '';
function updateStatus() {
    const el = document.getElementById('status-stats');
    if (!el) return;
    const s = sh();
    let count = 0, ncount = 0, sum = 0, min = Infinity, max = -Infinity;
    let cells = 0;
    outer:
    for (const R of allRanges()) {
        const r1 = Math.min(R.r1, Math.max(usedBounds(s).r1, R.r0));
        for (let r = R.r0; r <= r1; r++) {
            if (isRowHidden(r)) continue;
            for (let c = R.c0; c <= R.c1; c++) {
                if (++cells > 200000) break outer;
                const raw = s.data[idOf(r, c)];
                if (raw === undefined || raw === '') continue;
                count++;
                const v = valueAt(r, c);
                if (typeof v === 'number') { ncount++; sum += v; if (v < min) min = v; if (v > max) max = v; }
            }
        }
    }
    let html = '';
    if (count > 1) {
        if (ncount) html += `<span>Average: <b>${escapeHtml(fmtStat(sum / ncount))}</b></span>`;
        html += `<span>Count: <b>${count}</b></span>`;
        if (ncount) {
            html += `<span class="opt">Min: <b>${escapeHtml(fmtStat(min))}</b></span><span class="opt">Max: <b>${escapeHtml(fmtStat(max))}</b></span>`;
            html += `<span>Sum: <b>${escapeHtml(fmtStat(sum))}</b></span>`;
        }
    }
    if (html !== lastStats) {
        el.innerHTML = html;
        lastStats = html;
        if (html) restartAnim(el, 'blip');
    }
    if (s.filter) {
        let shown = 0, total = 0;
        for (let r = s.filter.r0 + 1; r <= s.filter.r1; r++) { total++; if (!filterHidden[r]) shown++; }
        if (!clip) setStatusInfo(shown === total ? '' : `${shown} of ${total} records found!`);
    }
}

// ==========================================
// KEYDOWN TOOLBAR (text styles in the editor, or whole cells)
// ==========================================
let kdMode = null;

function kdBar() {
    return document.getElementById('aero-selection-toolbar');
}

function hideKeydownBar() {
    const bar = kdBar();
    if (!bar) return;
    bar.classList.remove('show');
    bar.querySelectorAll('.aero-dropdown').forEach(d => d.classList.remove('active'));
    kdMode = null;
}

function checkKeydownBar() {
    if (!isEditing()) { if (kdMode === 'text') hideKeydownBar(); return; }
    const inp = activeInput();
    const has = inp.selectionEnd > inp.selectionStart && !FormulaEngine.isFormulaText(inp.value);
    if (!has) { if (kdMode === 'text') hideKeydownBar(); return; }
    const bar = kdBar();
    kdMode = 'text';
    bar.classList.add('show');
    const box = (inp.id === 'formula-input' ? document.getElementById('fbar-wrap') : document.getElementById('editor-wrap')).getBoundingClientRect();
    const w = bar.offsetWidth, h = bar.offsetHeight;
    let y = box.top - h - 8;
    if (y < 8) y = box.bottom + 8;
    bar.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, box.left)) + 'px';
    bar.style.top = y + 'px';
}

function showKeydownBarForCells(anchor) {
    if (isEditing()) { checkKeydownBar(); if (kdMode === 'text') return; }
    const bar = kdBar();
    if (kdMode === 'cells') { hideKeydownBar(); return; }
    kdMode = 'cells';
    bar.classList.add('show', 'cells');
    const r = (anchor || document.getElementById('ribbon')).getBoundingClientRect();
    bar.style.left = Math.max(8, Math.min(window.innerWidth - bar.offsetWidth - 8, r.left)) + 'px';
    bar.style.top = (r.bottom + 6) + 'px';
    restartAnim(bar, 'pop');
}

function wrapEditorSelection(open, close) {
    const inp = activeInput();
    const a = inp.selectionStart, b = inp.selectionEnd;
    if (b <= a || FormulaEngine.isFormulaText(inp.value)) return false;
    const v = inp.value;
    const inner = v.slice(a, b);
    // Toggle off when the selection is already wrapped!
    if (v.slice(a - open.length, a) === open && v.slice(b, b + close.length) === close) {
        inp.value = v.slice(0, a - open.length) + inner + v.slice(b + close.length);
        inp.setSelectionRange(a - open.length, b - open.length);
    } else {
        inp.value = v.slice(0, a) + open + inner + close + v.slice(b);
        inp.setSelectionRange(a + open.length, b + open.length);
    }
    edInput(inp.id === 'formula-input');
    return true;
}

function wrapCells(open, close) {
    const s = sh();
    let n = 0;
    change(() => {
        forEachSelected((r, c) => {
            const id = idOf(r, c);
            const raw = s.data[id];
            if (raw === undefined || raw === '' || FormulaEngine.isFormulaText(raw)) return;
            if (raw.startsWith(open) && raw.endsWith(close) && raw.length >= open.length + close.length) s.data[id] = raw.slice(open.length, raw.length - close.length);
            else s.data[id] = open + raw + close;
            n++;
        });
    });
    if (!n) toast('Type some text into the cells first!');
    else forEachSelected((r, c) => animCell(r, c, 'pop', ((r - rng().r0) + (c - rng().c0)) * 20));
}

function markersForButton(btn) {
    const style = btn.getAttribute('data-style');
    if (style) {
        return {
            bold: ['**', '**'], italic: ['*', '*'], underline: ['~U~', '~U~'], code: ['`', '`'],
            strike: ['<span class="kd-strike">', '</span>'],
        }[style];
    }
    const cls = btn.getAttribute('data-class');
    if (!cls) return null;
    const m = keydownMarkersFor(cls);
    return m ? [m.open, m.close] : [`<span class="${cls}">`, '</span>'];
}

function wireKeydownBar() {
    const bar = kdBar();
    if (!bar) return;
    bar.addEventListener('mousedown', (e) => e.preventDefault());
    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .color-swatch-item, .chip-swatch-item, .effect-swatch-item');
        if (!btn) return;
        if (btn.classList.contains('dropdown-toggle')) {
            e.stopPropagation();
            playAeroClickSound(500, 0.05);
            const parent = btn.parentElement;
            bar.querySelectorAll('.aero-dropdown').forEach(d => { if (d !== parent) d.classList.remove('active'); });
            parent.classList.toggle('active');
            return;
        }
        playAeroClickSound(600, 0.08);
        const marks = markersForButton(btn);
        if (!marks) return;
        if (kdMode === 'text') {
            wrapEditorSelection(marks[0], marks[1]);
        } else {
            const style = btn.getAttribute('data-style');
            if (style && style !== 'code') toggleStyleKey({ bold: 'b', italic: 'i', underline: 'u', strike: 's' }[style]);
            else wrapCells(marks[0], marks[1]);
        }
        bar.querySelectorAll('.aero-dropdown').forEach(d => d.classList.remove('active'));
    });
    document.addEventListener('mousedown', (e) => {
        if (kdMode === 'cells' && !e.target.closest('#aero-selection-toolbar') && !e.target.closest('.kd-btn')) {
            if (!e.target.closest('#grid-inner')) hideKeydownBar();
        }
    });
}

// ==========================================
// FORMULA AUTOCOMPLETE + ARGUMENT TIPS
// ==========================================
let acState = { items: [], idx: 0, inp: null, start: 0, end: 0 };

function hideAutocomplete() {
    const l = document.getElementById('ac-list');
    if (l) l.hidden = true;
    const t = document.getElementById('arg-tip');
    if (t) t.hidden = true;
    acState.items = [];
}

function enclosingCall(text, caret) {
    const toks = FormulaEngine.tokensOf(text).filter(t => t.s < caret);
    const stack = [];
    for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (t.t === 'lp') stack.push({ name: toks[i - 1] && toks[i - 1].t === 'ident' ? toks[i - 1].v : null, arg: 0 });
        else if (t.t === 'rp') stack.pop();
        else if (t.t === 'comma' && stack.length) stack[stack.length - 1].arg++;
    }
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name) return stack[i];
    return null;
}

function updateAutocomplete(inp) {
    const list = document.getElementById('ac-list');
    const tip = document.getElementById('arg-tip');
    const text = inp.value;
    if (text[0] !== '=' || isKdText(text) || !isEditing()) { hideAutocomplete(); return; }
    const caret = inp.selectionStart;
    const before = text.slice(0, caret);
    const m = /(^|[=(,;+\-*/^&<>:\s])([A-Za-z][A-Za-z0-9.]*)$/.exec(before);
    const box = (inp.id === 'formula-input' ? document.getElementById('fbar-wrap') : document.getElementById('editor-wrap')).getBoundingClientRect();
    const fns = FormulaEngine.functionList();
    if (m && !/^[A-Za-z]{1,3}\d+$/.test(m[2]) && !/^[A-Za-z0-9.]/.test(text.slice(caret))) {
        const pre = m[2].toUpperCase();
        const items = fns.filter(f => f.name.startsWith(pre)).slice(0, 9);
        if (items.length && !(items.length === 1 && items[0].name === pre && text[caret] === '(')) {
            const keep = acState.inp === inp && acState.items.length && acState.items[acState.idx] && items.find(x => x.name === acState.items[acState.idx].name);
            acState = { items, idx: keep ? items.indexOf(keep) : 0, inp, start: caret - m[2].length, end: caret };
            list.innerHTML = items.map((f, i) => `<button class="ac-item${i === acState.idx ? ' on' : ''}" data-i="${i}"><b>${f.name}</b><span>${escapeHtml(f.desc)}</span></button>`).join('') + '<div class="ac-foot">Tab to insert!</div>';
            list.hidden = false;
            list.style.left = Math.min(window.innerWidth - 330, box.left) + 'px';
            list.style.top = (box.bottom + 2) + 'px';
            tip.hidden = true;
            return;
        }
    }
    list.hidden = true;
    acState.items = [];
    const call = enclosingCall(text, caret);
    if (call) {
        const f = fns.find(x => x.name === call.name);
        if (f) {
            const sig = f.sig;
            const open = sig.indexOf('(');
            const args = sig.slice(open + 1, sig.lastIndexOf(')')).split(/,\s*/);
            const repeat = args[args.length - 1] === '...';
            let idx = call.arg;
            if (repeat && idx >= args.length - 1) idx = args.length - 2;
            tip.innerHTML = `<b>${f.name}</b>(${args.map((a, i) => i === idx ? `<u>${escapeHtml(a)}</u>` : escapeHtml(a)).join(', ')})`;
            tip.hidden = false;
            tip.style.left = Math.min(window.innerWidth - 320, box.left) + 'px';
            tip.style.top = (box.bottom + 2) + 'px';
            return;
        }
    }
    tip.hidden = true;
}

function acceptAutocomplete(i) {
    const f = acState.items[i === undefined ? acState.idx : i];
    if (!f) return;
    const inp = acState.inp;
    const v = inp.value;
    const insert = f.name + '(';
    const after = v.slice(acState.end);
    const skipParen = after[0] === '(';
    inp.value = v.slice(0, acState.start) + insert + (skipParen ? after.slice(1) : after);
    const pos = acState.start + insert.length;
    inp.setSelectionRange(pos, pos);
    inp.focus();
    edInput(inp.id === 'formula-input');
}

function autocompleteKey(e) {
    const list = document.getElementById('ac-list');
    if (list.hidden || !acState.items.length) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        acState.idx = (acState.idx + (e.key === 'ArrowDown' ? 1 : -1) + acState.items.length) % acState.items.length;
        list.querySelectorAll('.ac-item').forEach((b, i) => b.classList.toggle('on', i === acState.idx));
        return true;
    }
    if (e.key === 'Tab') { e.preventDefault(); acceptAutocomplete(); return true; }
    if (e.key === 'Escape') { e.preventDefault(); hideAutocomplete(); return true; }
    return false;
}

function insertFunctionName(name) {
    if (!isEditing()) {
        startEdit({ initial: '=' + name + '(' });
        return;
    }
    const inp = activeInput();
    const a = inp.selectionStart;
    let v = inp.value;
    let pre = name + '(';
    if (!v.length) pre = '=' + pre;
    else if (v[0] !== '=') { inp.value = '=' + name + '('; inp.setSelectionRange(inp.value.length, inp.value.length); edInput(inp.id === 'formula-input'); return; }
    inp.value = v.slice(0, a) + pre + v.slice(inp.selectionEnd);
    inp.setSelectionRange(a + pre.length, a + pre.length);
    inp.focus();
    edInput(inp.id === 'formula-input');
}

async function insertFunctionDialog() {
    const fns = FormulaEngine.functionList();
    const cats = ['All', ...new Set(fns.map(f => f.cat))];
    let chosen = fns.find(f => f.name === 'SUM');
    const r = await openDialog({
        title: 'Insert Function', width: 520,
        body: `<div class="if-top"><input class="dlg-input" id="if-q" placeholder="Search for a function (like average, lookup, date)…" spellcheck="false"><select id="if-cat">${cats.map(c => `<option>${c}</option>`).join('')}</select></div>
            <div class="if-list" id="if-list"></div><div class="if-desc" id="if-desc"></div>`,
        buttons: [{ label: 'Insert', value: 'ok', primary: true }, { label: 'Cancel', value: null }],
        onOpen: (d, done) => {
            const q = d.querySelector('#if-q'), cat = d.querySelector('#if-cat'), list = d.querySelector('#if-list'), desc = d.querySelector('#if-desc');
            const show = () => { desc.innerHTML = chosen ? `<code>${escapeHtml(chosen.sig)}</code><p>${escapeHtml(chosen.desc)}</p>` : ''; };
            const draw = () => {
                const t = q.value.trim().toLowerCase();
                const items = fns.filter(f => (cat.value === 'All' || f.cat === cat.value) && (!t || f.name.toLowerCase().includes(t) || f.desc.toLowerCase().includes(t)));
                list.innerHTML = items.map(f => `<button class="if-item${chosen && f.name === chosen.name ? ' on' : ''}" data-n="${f.name}"><b>${f.name}</b><span>${f.cat}</span></button>`).join('') || '<p class="dlg-hint">Nothing matches!</p>';
                if (items.length && (!chosen || !items.includes(chosen))) { chosen = items[0]; list.firstChild.classList.add('on'); }
                show();
            };
            list.addEventListener('click', (e) => {
                const b = e.target.closest('.if-item');
                if (!b) return;
                chosen = fns.find(f => f.name === b.dataset.n);
                list.querySelectorAll('.if-item').forEach(x => x.classList.toggle('on', x === b));
                show();
            });
            list.addEventListener('dblclick', (e) => { if (e.target.closest('.if-item')) done('ok'); });
            q.addEventListener('input', draw);
            cat.addEventListener('change', draw);
            draw();
        },
    });
    if (r.value === 'ok' && chosen) insertFunctionName(chosen.name);
}

// ==========================================
// AUTOSUM
// ==========================================
function autoSum(fn) {
    if (!needSingleRange()) return;
    const s = sh();
    const R = rng();
    const isNum = (r, c) => typeof valueAt(r, c) === 'number' && !(typeof s.data[idOf(r, c)] === 'string' && /^=(SUM|AVERAGE|COUNT|MAX|MIN)\(/i.test(s.data[idOf(r, c)]));
    if (rangeSize(R) > 1) {
        // Totals under each column of a block, right away!
        const row = R.r1 + 1;
        if (row > s.rows) { toast('There is no room below the selection!'); return; }
        change(() => {
            for (let c = R.c0; c <= R.c1; c++) setRaw(s, row, c, `=${fn}(${idOf(R.r0, c)}:${idOf(R.r1, c)})`);
        });
        for (let c = R.c0; c <= R.c1; c++) animCell(row, c, 'in', (c - R.c0) * 40);
        return;
    }
    const { r, c } = sel.act;
    let src = null;
    let r0 = r - 1;
    while (r0 >= 1 && !isNum(r0, c) && !hasData(r0, c) && r0 > r - 2) r0--;
    if (r0 >= 1 && isNum(r0, c)) {
        let top = r0;
        while (top - 1 >= 1 && isNum(top - 1, c)) top--;
        src = { r0: top, r1: r0, c0: c, c1: c };
    } else if (c > 0 && isNum(r, c - 1)) {
        let left = c - 1;
        while (left - 1 >= 0 && isNum(r, left - 1)) left--;
        src = { r0: r, r1: r, c0: left, c1: c - 1 };
    }
    const txt = src ? rangeText(src) : '';
    startEdit({ initial: `=${fn}(${txt})` });
    if (src) {
        const inp = activeInput();
        const s0 = fn.length + 2;
        inp.setSelectionRange(s0, s0 + txt.length);
        pointRef = { s: s0, e: s0 + txt.length, R: src, si: book.active, anchor: { r: src.r0, c: src.c0 }, focus: { r: src.r1, c: src.c1 } };
        inp.setSelectionRange(s0 + txt.length, s0 + txt.length);
        setMode('point');
        drawRefBoxes();
    }
}

// ==========================================
// TRACE PRECEDENTS
// ==========================================
function tracePrecedents() {
    const raw = sh().data[idOf(sel.act.r, sel.act.c)];
    const layer = document.getElementById('trace-boxes');
    layer.innerHTML = '';
    if (!raw || raw[0] !== '=') { toast('Pick a cell with a formula first!'); return; }
    const refs = formulaRefs(raw).filter(x => !x.ref.sheet || x.ref.sheet.toLowerCase() === sh().name.toLowerCase());
    if (!refs.length) { toast('That formula doesn\'t use any cells on this sheet!'); return; }
    const to = cellRect(sel.act.r, sel.act.c);
    let svg = `<svg class="trace-svg" width="${layout.colX[sh().cols]}" height="${layout.rowY[sh().rows + 1]}">`;
    refs.forEach((x, i) => {
        const R = { r0: x.ref.r0, r1: Math.min(sh().rows, x.ref.r1), c0: x.ref.c0, c1: Math.min(sh().cols - 1, x.ref.c1) };
        const rr = rangeRect(R);
        const el = document.createElement('div');
        el.className = 'trace-box';
        el.style.setProperty('--rc', x.color);
        el.style.animationDelay = (i * 90) + 'ms';
        placeBox(el, rr);
        layer.appendChild(el);
        const fx = rr.x + Math.min(rr.w, 40) / 2, fy = rr.y + Math.min(rr.h, 24) / 2;
        const tx = to.x + 8, ty = to.y + to.h / 2;
        svg += `<path d="M${fx} ${fy} C ${(fx + tx) / 2} ${fy}, ${(fx + tx) / 2} ${ty}, ${tx} ${ty}" stroke="${x.color}" style="animation-delay:${i * 90}ms" pathLength="1"/><circle cx="${fx}" cy="${fy}" r="3" fill="${x.color}"/>`;
    });
    svg += `<path d="M${to.x + 8} ${to.y + to.h / 2} l-7 -4 v8z" fill="#444"/></svg>`;
    layer.insertAdjacentHTML('beforeend', svg);
    clearTimeout(tracePrecedents.t);
    tracePrecedents.t = setTimeout(() => { layer.innerHTML = ''; }, 6000);
}

// ==========================================
// FIND & REPLACE
// ==========================================
let findState = { open: false, replace: false };

function closeFind() {
    const p = document.getElementById('find-panel');
    if (!p || p.hidden) return;
    p.classList.add('closing');
    setTimeout(() => { p.hidden = true; p.classList.remove('closing'); }, 150);
    findState.open = false;
}

function openFind(replace) {
    if (isEditing()) commitEdit(0, 0);
    const p = document.getElementById('find-panel');
    findState = { open: true, replace };
    p.hidden = false;
    p.innerHTML = `<div class="fp-head"><div class="fp-tabs"><button data-ft="find" class="${replace ? '' : 'on'}">Find</button><button data-ft="replace" class="${replace ? 'on' : ''}">Replace</button></div><button class="fp-x" title="Close">${ico('x')}</button></div>
        <label class="fp-row"><span>Find what</span><input id="fp-find" spellcheck="false"></label>
        <label class="fp-row" ${replace ? '' : 'hidden'} id="fp-rep-row"><span>Replace with</span><input id="fp-rep" spellcheck="false"></label>
        <div class="fp-opts">
            <label><input type="checkbox" id="fp-case"> Match case</label>
            <label><input type="checkbox" id="fp-whole"> Entire cell</label>
            <label><input type="checkbox" id="fp-book"> Whole workbook</label>
            <label><input type="checkbox" id="fp-formulas"> Look in formulas</label>
        </div>
        <div class="fp-btns">
            <button id="fp-all">Find All</button>
            <button id="fp-next" class="primary">Find Next</button>
            <span class="fp-rep-btns" ${replace ? '' : 'hidden'}><button id="fp-one">Replace</button><button id="fp-rall">Replace All</button></span>
        </div>
        <div id="fp-results"></div>`;
    restartAnim(p, 'pop');
    const q = p.querySelector('#fp-find');
    const cur = displayText(sel.act.r, sel.act.c);
    if (findState.lastQuery) q.value = findState.lastQuery;
    else if (cur && cur.length < 40) q.value = '';
    q.focus();
    q.select();
    p.querySelector('.fp-x').addEventListener('click', closeFind);
    p.querySelectorAll('[data-ft]').forEach(b => b.addEventListener('click', () => {
        const rep = b.dataset.ft === 'replace';
        p.querySelectorAll('[data-ft]').forEach(x => x.classList.toggle('on', x === b));
        p.querySelector('#fp-rep-row').hidden = !rep;
        p.querySelector('.fp-rep-btns').hidden = !rep;
    }));
    p.querySelector('#fp-next').addEventListener('click', () => findNext());
    p.querySelector('#fp-all').addEventListener('click', findAll);
    p.querySelector('#fp-one').addEventListener('click', replaceOne);
    p.querySelector('#fp-rall').addEventListener('click', replaceAll);
    p.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); findNext(e.shiftKey ? -1 : 1); }
        if (e.key === 'Escape') { closeFind(); focusGrid(); }
    });
}

function findOpts() {
    const p = document.getElementById('find-panel');
    const q = p.querySelector('#fp-find').value;
    findState.lastQuery = q;
    return {
        q, rep: p.querySelector('#fp-rep').value,
        matchCase: p.querySelector('#fp-case').checked, whole: p.querySelector('#fp-whole').checked,
        book: p.querySelector('#fp-book').checked, formulas: p.querySelector('#fp-formulas').checked,
    };
}

function cellMatches(si, r, c, o) {
    const s = book.sheets[si];
    const raw = s.data[idOf(r, c)];
    if (raw === undefined || raw === '') return false;
    let text = o.formulas ? String(raw) : (si === book.active ? displayText(r, c) : formatValue((calc.values[si] || {})[idOf(r, c)], s.styles[idOf(r, c)]));
    let q = o.q;
    if (!o.matchCase) { text = text.toLowerCase(); q = q.toLowerCase(); }
    return o.whole ? text === q : text.includes(q);
}

function allMatches(o) {
    const out = [];
    const sheets = o.book ? book.sheets.map((s, i) => i) : [book.active];
    for (const si of sheets) {
        const s = book.sheets[si];
        const keys = Object.keys(s.data).map(rcOf).sort((a, b) => a.r - b.r || a.c - b.c);
        for (const p of keys) if (cellMatches(si, p.r, p.c, o)) out.push({ si, r: p.r, c: p.c });
    }
    return out;
}

function findNext(dir) {
    dir = dir || 1;
    const o = findOpts();
    if (!o.q) return;
    const hits = allMatches(o);
    const res = document.getElementById('fp-results');
    if (!hits.length) { res.innerHTML = '<p class="fp-none">We couldn\'t find what you were looking for!</p>'; restartAnim(res, 'shake'); return; }
    const cur = { si: book.active, r: sel.act.r, c: sel.act.c };
    const key = (h) => h.si * 1e9 + h.r * 1e4 + h.c;
    const ck = key(cur);
    let hit = dir > 0 ? hits.find(h => key(h) > ck) || hits[0] : [...hits].reverse().find(h => key(h) < ck) || hits[hits.length - 1];
    if (hit.si !== book.active) switchSheet(hit.si);
    selectCell(hit.r, hit.c);
    res.innerHTML = `<p class="fp-count">${hits.indexOf(hit) + 1} of ${hits.length} match${hits.length === 1 ? '' : 'es'}!</p>`;
}

function findAll() {
    const o = findOpts();
    if (!o.q) return;
    const hits = allMatches(o);
    const res = document.getElementById('fp-results');
    if (!hits.length) { res.innerHTML = '<p class="fp-none">We couldn\'t find what you were looking for!</p>'; return; }
    res.innerHTML = `<p class="fp-count">${hits.length} cell${hits.length === 1 ? '' : 's'} found!</p><div class="fp-list">${hits.slice(0, 300).map((h, i) => `<button data-h="${i}"><span>${escapeHtml(book.sheets[h.si].name)}</span><b>${idOf(h.r, h.c)}</b><em>${escapeHtml(String(book.sheets[h.si].data[idOf(h.r, h.c)]).slice(0, 60))}</em></button>`).join('')}</div>`;
    res.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => {
        const h = hits[+b.dataset.h];
        if (h.si !== book.active) switchSheet(h.si);
        selectCell(h.r, h.c);
    }));
}

function replaceIn(raw, o) {
    if (o.whole) return o.rep;
    const re = new RegExp(escapeRegExp(o.q), o.matchCase ? 'g' : 'gi');
    return String(raw).replace(re, () => o.rep);
}

function replaceOne() {
    const o = findOpts();
    if (!o.q) return;
    const s = sh();
    const o2 = Object.assign({}, o, { formulas: true });
    if (cellMatches(book.active, sel.act.r, sel.act.c, o2)) {
        const id = idOf(sel.act.r, sel.act.c);
        change(() => { s.data[id] = replaceIn(s.data[id], o2); });
        animCell(sel.act.r, sel.act.c, 'pop');
    }
    findNext(1);
}

function replaceAll() {
    const o = Object.assign(findOpts(), { formulas: true });
    if (!o.q) return;
    const hits = allMatches(o);
    if (!hits.length) { document.getElementById('fp-results').innerHTML = '<p class="fp-none">Nothing to replace!</p>'; return; }
    change(() => { for (const h of hits) { const s = book.sheets[h.si]; const id = idOf(h.r, h.c); s.data[id] = replaceIn(s.data[id], o); } });
    hits.filter(h => h.si === book.active).slice(0, 300).forEach((h, i) => animCell(h.r, h.c, 'pop', i * 15));
    document.getElementById('fp-results').innerHTML = `<p class="fp-count">All done! We made ${hits.length} replacement${hits.length === 1 ? '' : 's'}!</p>`;
}

// ==========================================
// CONTEXT MENUS
// ==========================================
function cellContextMenu(e) {
    tabStartCol = null;
    const s = sh();
    const id = idOf(sel.act.r, sel.act.c);
    const hasNote = !!s.notes[id];
    const R = rng();
    const fullRows = R.c0 === 0 && R.c1 === s.cols - 1;
    const fullCols = R.r0 === 1 && R.r1 === s.rows;
    const items = [
        { label: 'Cut', icon: 'cut', kbd: '⌘X', run: () => doCopy(true) },
        { label: 'Copy', icon: 'copy', kbd: '⌘C', run: () => doCopy(false) },
        { label: 'Paste', icon: 'paste', kbd: '⌘V', run: () => pasteFromButton('all') },
        { label: 'Paste Special', icon: 'paste', sub: () => MENUS.paste().slice(1) },
        { sep: true },
    ];
    if (fullCols && !fullRows) {
        items.push(
            { label: 'Insert Columns', icon: 'insertRow', run: insertColsAtSel },
            { label: 'Delete Columns', icon: 'deleteRow', run: deleteColsAtSel },
            { label: 'Clear Contents', icon: 'eraser', run: deleteSelection },
            { sep: true },
            { label: 'Column Width…', icon: 'colW', run: colWidthDialog },
            { label: 'AutoFit Width', icon: 'colW', run: () => change(() => { for (let c = R.c0; c <= R.c1; c++) autoFit('col', c, true); }, { rebuild: true }) },
            { label: 'Hide', icon: 'eyeOff', run: () => hideCols(true) },
            { label: 'Unhide', icon: 'eye', run: () => hideCols(false) },
        );
    } else if (fullRows) {
        items.push(
            { label: 'Insert Rows', icon: 'insertRow', run: insertRowsAtSel },
            { label: 'Delete Rows', icon: 'deleteRow', run: deleteRowsAtSel },
            { label: 'Clear Contents', icon: 'eraser', run: deleteSelection },
            { sep: true },
            { label: 'Row Height…', icon: 'rowH', run: rowHeightDialog },
            { label: 'AutoFit Height', icon: 'rowH', run: () => change(() => { for (let r = R.r0; r <= R.r1; r++) autoFit('row', r, true); }, { rebuild: true }) },
            { label: 'Hide', icon: 'eyeOff', run: () => hideRows(true) },
            { label: 'Unhide', icon: 'eye', run: () => hideRows(false) },
        );
    } else {
        items.push(
            { label: 'Insert', icon: 'insertRow', sub: () => [
                { label: 'Rows Above', icon: 'insertRow', run: insertRowsAtSel },
                { label: 'Columns Left', icon: 'insertRow', run: insertColsAtSel },
            ] },
            { label: 'Delete', icon: 'deleteRow', sub: () => [
                { label: 'Rows', icon: 'deleteRow', run: deleteRowsAtSel },
                { label: 'Columns', icon: 'deleteRow', run: deleteColsAtSel },
            ] },
            { label: 'Clear Contents', icon: 'eraser', kbd: 'Del', run: deleteSelection },
            { sep: true },
            { label: 'Sort', icon: 'sortFilter', sub: () => [
                { label: 'Sort A to Z', icon: 'sortAsc', run: () => runCmd('sortAsc') },
                { label: 'Sort Z to A', icon: 'sortDesc', run: () => runCmd('sortDesc') },
                { label: 'Custom Sort…', icon: 'sortFilter', run: () => runCmd('customSort') },
            ] },
            { label: 'Filter by This Value', icon: 'funnel', run: () => runCmd('filterByValue') },
            { sep: true },
            hasNote ? { label: 'Edit Note', icon: 'note', run: () => editNote(sel.act.r, sel.act.c) } : { label: 'New Note', icon: 'note', run: () => editNote(sel.act.r, sel.act.c) },
            hasNote ? { label: 'Delete Note', icon: 'trash', run: () => change(() => { delete s.notes[id]; }) } : null,
            { sep: true },
            { label: 'Format Cells…', icon: 'format', kbd: '⌘1', run: formatCellsDialog },
            { label: 'Keydown Styles…', icon: 'sparkle', run: () => showKeydownBarForCells(null) },
            { label: 'Insert Chart', icon: 'chartColumn', sub: () => [
                { label: 'Column', icon: 'chartColumn', run: () => runCmd('chartColumn') },
                { label: 'Line', icon: 'chartLine', run: () => runCmd('chartLine') },
                { label: 'Pie', icon: 'chartPie', run: () => runCmd('chartPie') },
                { label: 'Bar', icon: 'chartBar', run: () => runCmd('chartBar') },
            ] },
        );
    }
    openMenu(null, items, { point: { x: e.clientX, y: e.clientY } });
}

// ==========================================
// SHORTCUTS
// ==========================================
function handleShortcut(e) {
    const mod = modKey(e);
    const k = e.key.toLowerCase();
    if (e.key === 'Escape' && painterApply.pending) { endPainter(); return true; }
    if (typeof selectedChart !== 'undefined' && selectedChart && (e.key === 'Delete' || e.key === 'Backspace')) { deleteChart(selectedChart); return true; }
    if (e.key === 'Enter' && !mod && !e.shiftKey && clip && !document.getElementById('copy-ants').hidden) { pasteClip('all'); clearClip(); return true; }
    if (mod && !e.altKey) {
        if (k === 'z' && !e.shiftKey) { undo(); return true; }
        if ((k === 'z' && e.shiftKey) || k === 'y') { redo(); return true; }
        if (k === 'b') { runCmd('bold'); return true; }
        if (k === 'i') { runCmd('italic'); return true; }
        if (k === 'u') { runCmd('underline'); return true; }
        if (k === '5' || (k === 'x' && e.shiftKey)) { runCmd('strike'); return true; }
        if (k === 'd') { fillDir('down'); return true; }
        if (k === 'r') { fillDir('right'); return true; }
        if (e.key === ';' || e.code === 'Semicolon') { insertNowValue(e.shiftKey ? 'time' : 'date'); return true; }
        if (k === 'f') { openFind(false); return true; }
        if (k === 'h' && !isMac()) { openFind(true); return true; }
        if (k === 'g') { goToDialog(); return true; }
        if (k === 'a') { selectAllSmart(); return true; }
        if (e.code === 'Backquote') { togglePref('showFormulas'); return true; }
        if (k === 's') { runCmd('save'); return true; }
        if (k === 'k') { document.getElementById('cmd-search').focus(); return true; }
        if (k === '1') { formatCellsDialog(); return true; }
        if (k === 'l' && e.shiftKey) { runCmd('filter'); return true; }
        if (e.key === '%' || (e.shiftKey && e.code === 'Digit5')) { runCmd('fmtPercent'); return true; }
        if (e.key === '$' || (e.shiftKey && e.code === 'Digit4')) { runCmd('fmtCurrency'); return true; }
        if (e.key === 'PageDown') { runCmd('nextSheet'); return true; }
        if (e.key === 'PageUp') { runCmd('prevSheet'); return true; }
    }
    if (e.ctrlKey && isMac() && (e.key === 'PageDown' || e.key === 'PageUp')) { runCmd(e.key === 'PageDown' ? 'nextSheet' : 'prevSheet'); return true; }
    if (e.ctrlKey && k === 'h') { openFind(true); return true; }
    if (e.altKey && e.code === 'Equal') { autoSum('SUM'); return true; }
    if (e.key === 'F5') { goToDialog(); return true; }
    if (e.key === 'F9') { runCmd('calcNow'); return true; }
    if (e.key === 'F11' && e.shiftKey) { addSheet(); return true; }
    if (e.key === 'F3' && e.shiftKey) { insertFunctionDialog(); return true; }
    return false;
}

// ==========================================
// COMMAND SEARCH (title bar)
// ==========================================
function wireCommandSearch() {
    const inp = document.getElementById('cmd-search');
    const res = document.getElementById('cmd-results');
    let items = [], idx = 0;
    const draw = () => {
        const q = inp.value.trim().toLowerCase();
        if (!q) { res.hidden = true; return; }
        const cmds = Object.keys(CMD).filter(k => CMD[k].label && CMD[k].label.toLowerCase().includes(q)).map(k => ({ label: CMD[k].label, icon: CMD[k].icon, run: () => runCmd(k) }));
        const fns = FormulaEngine.functionList().filter(f => f.name.toLowerCase().startsWith(q)).slice(0, 4).map(f => ({ label: 'Insert ' + f.name + '()', sub: f.desc, icon: 'calc', run: () => insertFunctionName(f.name) }));
        const sheets = book.sheets.map((s, i) => ({ s, i })).filter(x => x.s.name.toLowerCase().includes(q)).map(x => ({ label: 'Go to sheet ' + x.s.name, icon: 'table', run: () => switchSheet(x.i) }));
        const ref = /^('?[^!]+'?!)?\$?[a-z]{1,3}\$?\d+(:\$?[a-z]{1,3}\$?\d+)?$/i.test(q) ? [{ label: 'Go to ' + q.toUpperCase(), icon: 'goto', run: () => goToRef(q) }] : [];
        items = ref.concat(cmds.slice(0, 8), sheets.slice(0, 3), fns);
        idx = 0;
        res.innerHTML = items.length ? items.map((it, i) => `<button class="m-item${i === 0 ? ' kb' : ''}" data-i="${i}"><span class="m-ico">${it.icon && ICONS[it.icon] ? ico(it.icon) : ''}</span><span class="m-label">${escapeHtml(it.label)}${it.sub ? `<small>${escapeHtml(it.sub)}</small>` : ''}</span></button>`).join('') : '<div class="m-head">No matching tools!</div>';
        res.hidden = false;
    };
    const go = (i) => { const it = items[i]; if (!it) return; inp.value = ''; res.hidden = true; inp.blur(); it.run(); };
    inp.addEventListener('input', draw);
    inp.addEventListener('focus', () => { if (isEditing()) commitEdit(0, 0); draw(); });
    inp.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
    inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length);
            res.querySelectorAll('.m-item').forEach((b, i) => b.classList.toggle('kb', i === idx));
        }
        if (e.key === 'Enter') { e.preventDefault(); go(idx); }
        if (e.key === 'Escape') { inp.value = ''; res.hidden = true; inp.blur(); focusGrid(); }
    });
    res.addEventListener('mousedown', (e) => e.preventDefault());
    res.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); });
}

// ==========================================
// BUILD UI
// ==========================================
function buildUi() {
    document.querySelectorAll('[data-ico]').forEach(el => { el.outerHTML = ico(el.dataset.ico); });
    // Ribbon tabs with a sliding ink bar!
    const tabs = document.getElementById('ribbon-tabs');
    const ink = document.getElementById('tab-ink');
    const moveInk = () => {
        const on = tabs.querySelector('.rtab.on');
        if (!on) return;
        ink.style.left = on.offsetLeft + 'px';
        ink.style.width = on.offsetWidth + 'px';
    };
    tabs.addEventListener('click', (e) => {
        const t = e.target.closest('.rtab');
        if (!t) return;
        playAeroClickSound(560, 0.05);
        if (t.dataset.tab === 'file') { openBackstage('home'); return; }
        if (document.body.classList.contains('ribbon-min')) document.body.classList.remove('ribbon-min');
        tabs.querySelectorAll('.rtab').forEach(x => x.classList.toggle('on', x === t));
        document.querySelectorAll('.rpanel').forEach(p => {
            const on = p.dataset.panel === t.dataset.tab;
            p.classList.toggle('on', on);
            if (on) restartAnim(p, 'panel-in');
        });
        moveInk();
        try { localStorage.setItem('imbuer-tab', t.dataset.tab); } catch (err) {}
    });
    try {
        const saved = localStorage.getItem('imbuer-tab');
        if (saved && saved !== 'file') {
            const t = tabs.querySelector(`[data-tab="${saved}"]`);
            if (t) { tabs.querySelectorAll('.rtab').forEach(x => x.classList.toggle('on', x === t)); document.querySelectorAll('.rpanel').forEach(p => p.classList.toggle('on', p.dataset.panel === saved)); }
        }
    } catch (err) {}
    requestAnimationFrame(moveInk);
    window.addEventListener('resize', () => { moveInk(); moveSheetInk(); });

    // Buttons → commands, arrows → menus!
    document.addEventListener('mousedown', (e) => {
        const b = e.target.closest('[data-cmd], [data-menu]');
        if (b && !b.closest('.dlg') && !b.matches('input')) e.preventDefault();
    });
    document.addEventListener('click', (e) => {
        const m = e.target.closest('[data-menu]');
        if (m && !m.closest('.menu')) {
            const id = m.dataset.menu;
            if (menuStack.length && menuStack[0].anchor === m) { closeMenus(0); return; }
            if (isEditing() && !['fonts', 'sizes'].includes(id)) commitEdit(0, 0);
            playAeroClickSound(540, 0.05);
            const def = MENUS[id];
            if (!def) return;
            const items = def(m);
            if (Array.isArray(items)) openMenu(m, items, { cls: 'menu-' + id });
            return;
        }
        const c = e.target.closest('[data-cmd]');
        if (c && !c.closest('.menu') && !c.disabled) runCmd(c.dataset.cmd, c, e);
    });
    document.querySelectorAll('[data-pref]').forEach(cb => cb.addEventListener('change', () => togglePref(cb.dataset.pref)));
    syncPrefChecks();
    wireCombos();
    updateColorBars();
    wireSheetTabs();
    wireKeydownBar();
    wireCommandSearch();
    if (typeof wireFeatures === 'function') wireFeatures();

    const ac = document.getElementById('ac-list');
    ac.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const b = e.target.closest('.ac-item');
        if (b) acceptAutocomplete(+b.dataset.i);
    });

    // Right-click menus on cells and headers!
    document.getElementById('grid-inner').addEventListener('contextmenu', (e) => {
        if (e.target.closest('.chart-obj')) return;
        e.preventDefault();
        if (isEditing()) return;
        cellContextMenu(e);
    });

    // Zoom: slider, and Ctrl/⌘ + wheel over the grid!
    const zs = document.getElementById('zoom-slider');
    zs.value = Math.round(zf() * 100);
    document.getElementById('zoom-label').textContent = Math.round(zf() * 100) + '%';
    zs.addEventListener('input', () => setZoom(+zs.value / 100));
    scroller().addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        setZoom(Math.round((zf() * (e.deltaY < 0 ? 1.08 : 1 / 1.08)) * 100) / 100);
    }, { passive: false });

    // Saved-state chip in the title bar!
    const origPersist = persistSheets;
    persistSheets = function () {
        const s = document.getElementById('save-state');
        if (s) s.textContent = 'Saving…';
        origPersist();
        clearTimeout(persistSheets.t2);
        persistSheets.t2 = setTimeout(flashSaved, 400);
    };
    wireBackstage();
}

// ==========================================
// BACKSTAGE (File tab)
// ==========================================
function openBackstage(page) {
    if (isEditing()) commitEdit(0, 0);
    const bs = document.getElementById('backstage');
    bs.hidden = false;
    restartAnim(bs, 'bs-in');
    showBackstagePage(page || 'home');
}

function closeBackstage() {
    const bs = document.getElementById('backstage');
    bs.classList.add('bs-out');
    setTimeout(() => { bs.hidden = true; bs.classList.remove('bs-out'); focusGrid(); }, 200);
}

function showBackstagePage(page) {
    document.querySelectorAll('.bs-nav [data-bs]').forEach(b => b.classList.toggle('on', b.dataset.bs === page));
    const body = document.getElementById('bs-body');
    const tpl = (typeof TEMPLATES !== 'undefined' ? TEMPLATES : []);
    const tplCards = tpl.map((t, i) => `<button class="tpl" data-tpl="${i}"><div class="tpl-thumb" style="--a:${t.color}">${t.thumb || ''}</div><b>${escapeHtml(t.name)}</b><span>${escapeHtml(t.desc)}</span></button>`).join('');
    const blank = `<button class="tpl" data-new="1"><div class="tpl-thumb blank"><div class="tpl-grid"></div></div><b>Blank workbook</b><span>Start fresh!</span></button>`;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    let html = '';
    if (page === 'home' || page === 'new') {
        html = `<h1>${page === 'home' ? greet + '!' : 'New'}</h1><div class="tpl-row">${blank}${tplCards}</div>`;
        if (page === 'home') {
            const s = book.sheets.reduce((n, x) => n + Object.keys(x.data).length, 0);
            html += `<h2>This workbook</h2><div class="bs-card"><img src="favicon.svg" alt=""><div><b>${escapeHtml(book.name)}</b><span>${book.sheets.length} sheet${book.sheets.length > 1 ? 's' : ''} · ${s} filled cell${s === 1 ? '' : 's'} · saves automatically in this browser!</span></div></div>`;
        }
    } else if (page === 'open') {
        html = `<h1>Open</h1><div class="bs-actions"><button class="bs-big" data-act="browse">${ico('folder')}<b>Browse…</b><span>Open an Imbuer .ks workbook (old and new), or a CSV/TSV file as a new sheet!</span></button></div><p class="bs-note">Tip: you can also drag a .ks or .csv file anywhere onto Imbuer!</p>`;
    } else if (page === 'save') {
        html = `<h1>Save a Copy</h1><div class="bs-actions">
            <button class="bs-big" data-act="saveKs">${ico('save')}<b>Imbuer Workbook (.ks)</b><span>Every sheet, style, chart, note and rule!</span></button>
            <button class="bs-big" data-act="exportCsv">${ico('export')}<b>CSV (this sheet)</b><span>Plain values for other spreadsheet apps!</span></button>
        </div><p class="bs-note">Your work also saves automatically in this browser, every time you make a change!</p>`;
    } else if (page === 'export') {
        html = `<h1>Export</h1><div class="bs-actions">
            <button class="bs-big" data-act="exportCsv">${ico('export')}<b>CSV</b><span>Comma-separated values of this sheet!</span></button>
            <button class="bs-big" data-act="exportTsv">${ico('export')}<b>TSV</b><span>Tab-separated values of this sheet!</span></button>
            <button class="bs-big" data-act="exportHtml">${ico('table')}<b>HTML Table</b><span>A web page of this sheet, with its colors!</span></button>
        </div>`;
    } else if (page === 'options') {
        const opt = (k, label, hint) => `<label class="bs-opt"><input type="checkbox" data-pref="${k}"${prefs[k] ? ' checked' : ''}><span><b>${label}</b><em>${hint}</em></span></label>`;
        const card = (id, name, hint) => `<button class="lay-card${prefs.layout === id || (id === 'excel' && prefs.layout !== 'classic') ? ' on' : ''}" data-layout="${id}">
            <div class="lay-thumb lay-${id}"><i class="lt-side"></i><i class="lt-bar"></i><i class="lt-grid"></i><i class="lt-orb"></i></div>
            <b>${name}</b><span>${hint}</span></button>`;
        html = `<h1>Settings</h1><h2 class="first">Layout</h2><div class="lay-cards">
            ${card('excel', 'Excel', 'A ribbon, a title bar and a clean grid, like the spreadsheet you know!')}
            ${card('classic', 'Imbuer Classic', 'The original Imbuer: a glass sidebar, lime gel headers and drifting orbs!')}
        </div><h2>Options</h2><div class="bs-opts">
            ${opt('anim', 'Animations', 'The gliding selection box, ripples, cascades and chart animations!')}
            ${opt('sound', 'Sounds', 'Soft Aero clicks on buttons!')}
            ${opt('dark', 'Dark Mode', 'Easy on the eyes at night!')}
            ${opt('gridlines', 'Gridlines', 'The light lines between cells!')}
            ${opt('headings', 'Headings', 'Column letters and row numbers!')}
            ${opt('formulaBar', 'Formula Bar', 'The name box and fx bar above the grid!')}
            ${opt('showFormulas', 'Show Formulas', 'Cells show formulas instead of results!')}
        </div><h2>Danger zone</h2><button class="bs-danger" data-act="reset">${ico('trash')} Erase this workbook</button>`;
    } else if (page === 'about') {
        html = `<h1>About Imbuer</h1><div class="bs-about"><img src="favicon.svg" alt=""><div><b>Imbuer</b><span>Radii Office's spreadsheet, now with ${FormulaEngine.functionList().length} functions, charts, sparklines, conditional formatting, filters, multiple sheets and Keydown styles!</span><span>Formulas run in a TypeScript engine (with a silent Lua cross-check)!</span></div></div>`;
    }
    body.innerHTML = html;
    restartAnim(body, 'panel-in');
    body.querySelectorAll('[data-pref]').forEach(cb => cb.addEventListener('change', () => togglePref(cb.dataset.pref)));
    body.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => setLayout(b.dataset.layout)));
}

function wireBackstage() {
    const bs = document.getElementById('backstage');
    bs.querySelector('.bs-nav').addEventListener('click', (e) => {
        const b = e.target.closest('[data-bs]');
        if (!b) return;
        if (b.dataset.bs === 'close') closeBackstage();
        else showBackstagePage(b.dataset.bs);
    });
    bs.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBackstage(); });
    document.getElementById('bs-body').addEventListener('click', async (e) => {
        const t = e.target.closest('[data-tpl]');
        if (t) { closeBackstage(); loadTemplate(+t.dataset.tpl); return; }
        if (e.target.closest('[data-new]')) {
            closeBackstage();
            const hasData = book.sheets.some(s => Object.keys(s.data).length);
            if (hasData && !(await confirmDialog('New Workbook', 'Start a new blank workbook? You can undo this!', 'Start New'))) return;
            pushUndo();
            book = newBook();
            resetTransient();
            recalc();
            initGrid();
            drawSheetTabs();
            syncBookName();
            persistSheets();
            return;
        }
        const a = e.target.closest('[data-act]');
        if (!a) return;
        const act = a.dataset.act;
        if (act === 'browse') document.getElementById('file-loader-gate').click();
        if (act === 'saveKs') { exportSheetsFile(); }
        if (act === 'exportCsv') { exportDelimited(','); }
        if (act === 'exportTsv') { exportDelimited('\t'); }
        if (act === 'exportHtml') { exportHtmlTable(); }
        if (act === 'reset') {
            if (await confirmDialog('Erase Workbook', 'Erase every sheet in this workbook? You can still undo this right after!', 'Erase', true)) {
                pushUndo();
                book = newBook();
                resetTransient();
                recalc(); initGrid(); drawSheetTabs(); syncBookName(); persistSheets();
                closeBackstage();
            }
        }
    });
    document.getElementById('file-loader-gate').addEventListener('change', (e) => { importSheetsFile(e); closeBackstage(); });
    // Drag & drop files onto the app!
    document.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('drop-on'); } });
    document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('drop-on'); });
    document.addEventListener('drop', (e) => {
        document.body.classList.remove('drop-on');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f) return;
        e.preventDefault();
        readFileIntoBook(f);
    });
}

function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function safeFileName(n) {
    return (n || 'Book1').replace(/[\\/:*?"<>|]+/g, '_');
}

function exportSheetsFile() {
    playAeroClickSound(750, 0.12);
    const payload = { imbuer: 2, book };
    download(safeFileName(book.name) + '.ks', JSON.stringify(payload), 'application/json');
    toast('Saved a copy!');
}

function exportDelimited(delim) {
    const s = sh();
    const u = usedBounds(s);
    const lines = [];
    for (let r = 1; r <= u.r1; r++) {
        const row = [];
        for (let c = 0; c <= u.c1; c++) {
            const t = displayText(r, c);
            row.push(/["\n\r]/.test(t) || t.includes(delim) ? '"' + t.replace(/"/g, '""') + '"' : t);
        }
        lines.push(row.join(delim));
    }
    download(safeFileName(book.name + ' - ' + s.name) + (delim === ',' ? '.csv' : '.tsv'), lines.join('\n'), delim === ',' ? 'text/csv' : 'text/tab-separated-values');
    toast('Exported ' + s.name + '!');
}

function exportHtmlTable() {
    const s = sh();
    const u = usedBounds(s);
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(book.name)} - ${escapeHtml(s.name)}</title><style>body{font-family:Aptos,Calibri,Segoe UI,Arial,sans-serif;padding:20px}table{border-collapse:collapse}td{border:1px solid #d4d4d4;padding:4px 8px;font-size:13px}</style></head><body><h2>${escapeHtml(s.name)}</h2><table>`;
    for (let r = 1; r <= u.r1; r++) {
        html += '<tr>';
        for (let c = 0; c <= u.c1; c++) {
            const v = cellView(r, c);
            html += `<td style="${v.style.replace(/position:sticky;|top:[^;]+;|left:[^;]+;|z-index:[^;]+;/g, '')}">${escapeHtml(displayText(r, c))}</td>`;
        }
        html += '</tr>';
    }
    html += '</table></body></html>';
    download(safeFileName(book.name + ' - ' + s.name) + '.html', html, 'text/html');
    toast('Exported an HTML table!');
}

function importSheetsFile(event) {
    playAeroClickSound(850, 0.15);
    const file = event.target.files[0];
    if (!file) return;
    readFileIntoBook(file);
    event.target.value = '';
}

function readFileIntoBook(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = String(e.target.result || '');
        const name = file.name.replace(/\.[^.]+$/, '');
        if (/\.(csv|tsv|txt)$/i.test(file.name)) {
            const delim = /\.tsv$/i.test(file.name) || (text.includes('\t') && !text.split('\n')[0].includes(',')) ? '\t' : ',';
            importDelimitedSheet(text, delim, name);
            return;
        }
        try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.imbuer === 2 && parsed.book && Array.isArray(parsed.book.sheets)) {
                if (!(await confirmDialog('Open Workbook', `Open "${parsed.book.name || name}"? It replaces this workbook (you can undo)!`, 'Open'))) return;
                pushUndo();
                book = parsed.book;
                book.sheets.forEach(fixSheet);
                book.active = Math.min(book.active | 0, book.sheets.length - 1);
            } else {
                // Classic .ks: { data, styles } (or a bare cell map)!
                const legacy = parsed.data ? { cellData: parsed.data, cellStyles: parsed.styles || {} } : { cellData: parsed, cellStyles: {} };
                const b = migrateLegacy(legacy);
                const s = b.sheets[0];
                s.name = uniqueSheetName(name.slice(0, 31).replace(/[\\/?*[\]:]/g, '') || 'Imported');
                addSheet(s, book.sheets.length);
                toast('Opened ' + file.name + ' as a new sheet!');
                return;
            }
            resetTransient();
            recalc();
            initGrid();
            drawSheetTabs();
            syncBookName();
            persistSheets();
            toast('Opened ' + file.name + '!');
        } catch (err) {
            toast("That file isn't a workbook Imbuer can read!");
        }
    };
    reader.readAsText(file);
}

function importDelimitedSheet(text, delim, name) {
    const rows = parseDelimited(text.replace(/\r?\n$/, ''), delim);
    const s = newSheet(uniqueSheetName((name || 'Imported').slice(0, 31).replace(/[\\/?*[\]:]/g, '') || 'Imported'));
    s.rows = Math.max(100, Math.min(MAX_ROWS, rows.length + 20));
    s.cols = Math.max(26, Math.min(MAX_COLS, Math.max(...rows.map(r => r.length)) + 2));
    rows.forEach((row, i) => row.forEach((v, j) => { if (i + 1 <= s.rows && j < s.cols && v !== '') { s.data[idOf(i + 1, j)] = v; autoFormat(s, i + 1, j, v); } }));
    if (rows.length > 1 && rows[0].every(v => v && typeof FormulaEngine.parseLiteral(v).value === 'string')) {
        rows[0].forEach((v, j) => { s.styles[idOf(1, j)] = Object.assign({}, s.styles[idOf(1, j)] || {}, { b: true }); });
        s.freeze = { r: 1, c: 0 };
    }
    addSheet(s, book.sheets.length);
    for (let c = 0; c < Math.min(s.cols, 30); c++) { if (Object.keys(s.data).some(k => rcOf(k).c === c)) autoFit('col', c, true); }
    initGrid();
    toast('Imported ' + rows.length + ' rows!');
}

// ==========================================
// HELP
// ==========================================
function helpDialog(tab) {
    const fns = FormulaEngine.functionList();
    const keys = [
        ['Move around', 'Arrows, Tab, Enter'], ['Jump to the edge of data', '⌘ + Arrow'], ['Select a range', 'Shift + Arrow, or drag'],
        ['Add another range', '⌘ + click'], ['Edit the cell', 'F2 or double-click'], ['Fill the whole selection', '⌘ + Enter while typing'],
        ['New line in a cell', '⌥ + Enter'], ['Absolute reference ($A$1)', 'F4 while typing'], ['Insert a function name', 'Tab in the suggestions'],
        ['Undo / Redo', '⌘Z / ⌘⇧Z'], ['Cut / Copy / Paste', '⌘X / ⌘C / ⌘V'], ['Bold / Italic / Underline', '⌘B / ⌘I / ⌘U'],
        ['Fill Down / Right', '⌘D / ⌘R'], ['Today / Now', '⌘; / ⌘⇧;'], ['Find / Replace', '⌘F / ⌃H'], ['Go To', '⌘G or F5'],
        ['AutoSum', '⌥='], ['Show formulas', '⌘`'], ['Filter', '⌘⇧L'], ['Format Cells', '⌘1'], ['Select all / region', '⌘A'],
        ['Whole row / column', '⇧Space / ⌃Space'], ['Next / previous sheet', '⌘PgDn / ⌘PgUp'], ['New sheet', '⇧F11'],
        ['Zoom', '⌘ + scroll'], ['Search tools', '⌘K'], ['Move a block', 'Drag the selection border (⌥ to copy)'], ['Series fill', 'Drag the little square'],
    ];
    const tabs = { overview: 'Overview', keys: 'Shortcuts', functions: 'Functions', keydown: 'Keydown' };
    const body = `<div class="help-tabs">${Object.keys(tabs).map(k => `<button data-ht="${k}" class="${k === tab ? 'on' : ''}">${tabs[k]}</button>`).join('')}</div>
    <div class="help-page" data-hp="overview" ${tab === 'overview' ? '' : 'hidden'}>
        <div class="help-cards">
            <div><b>Formulas</b><span>Start with =, like <code>=SUM(A1:A5)</code> or <code>=IF(B2&gt;10,"big","small")</code>! Click cells while typing to drop in references!</span></div>
            <div><b>Fill handle</b><span>Drag the square on the selection corner to continue 1, 2, 3…, Jan, Feb…, Mon, Tue… or copy formulas!</span></div>
            <div><b>Many sheets</b><span>Use + at the bottom! Reference other sheets like <code>=Sheet2!A1</code>!</span></div>
            <div><b>Charts &amp; sparklines</b><span>Select data, then Insert → Column, Line, Pie and more! Drag charts around!</span></div>
            <div><b>Conditional formatting</b><span>Data bars, color scales, icon sets and highlight rules in Home!</span></div>
            <div><b>Keydown styles</b><span>Select text while editing a cell to style it with gel orbs, chips and effects!</span></div>
        </div>
    </div>
    <div class="help-page" data-hp="keys" ${tab === 'keys' ? '' : 'hidden'}><table class="help-keys">${keys.map(k => `<tr><td>${k[0]}</td><td><kbd>${escapeHtml(k[1])}</kbd></td></tr>`).join('')}</table></div>
    <div class="help-page" data-hp="functions" ${tab === 'functions' ? '' : 'hidden'}><input class="dlg-input" id="help-fq" placeholder="Search ${fns.length} functions…"><div class="help-fns" id="help-fns"></div></div>
    <div class="help-page" data-hp="keydown" ${tab === 'keydown' ? '' : 'hidden'}>
        <p class="dlg-hint">Type these markers around text in any cell, or select text while editing and pick a style!</p>
        <table class="help-keys">${[['**bold**', '**'], ['*italic*', '*'], ['`code`', '`'], ['=Y=gel orb=Y=', '=Y='], ['#C#bubble chip#', '#C#'], ['~GL~glow tube~GL~', '~GL~'], ['&&sparkle&&', '&&'], ['~H1~header~H1~', '~H1~']].map(x => `<tr><td><code>${escapeHtml(x[0])}</code></td><td>${applyKeydownFormatting(x[0])}</td></tr>`).join('')}</table>
    </div>`;
    openDialog({
        title: 'Imbuer Help Deck', body, width: 640, buttons: [{ label: 'Dismiss', value: 'ok', primary: true }],
        onOpen: (d) => {
            d.querySelectorAll('[data-ht]').forEach(b => b.addEventListener('click', () => {
                d.querySelectorAll('[data-ht]').forEach(x => x.classList.toggle('on', x === b));
                d.querySelectorAll('[data-hp]').forEach(p => { p.hidden = p.dataset.hp !== b.dataset.ht; if (!p.hidden) restartAnim(p, 'panel-in'); });
            }));
            const q = d.querySelector('#help-fq');
            const list = d.querySelector('#help-fns');
            const draw = () => {
                const t = q.value.trim().toLowerCase();
                list.innerHTML = fns.filter(f => !t || f.name.toLowerCase().includes(t) || f.desc.toLowerCase().includes(t)).map(f => `<div><code>${escapeHtml(f.sig)}</code><span>${escapeHtml(f.desc)}</span><em>${f.cat}</em></div>`).join('');
            };
            q.addEventListener('input', draw);
            draw();
        },
    });
}

// Legacy entry points (old buttons and scripts) still work!
function toggleModal(show) {
    if (show) helpDialog('overview');
}

function addNewRow() {
    change(() => { sh().rows = Math.min(MAX_ROWS, sh().rows + 1); }, { rebuild: true });
}

function addNewColumn() {
    change(() => { sh().cols = Math.min(MAX_COLS, sh().cols + 1); }, { rebuild: true });
}

function deleteLastRow() {
    if (sh().rows <= 1) return;
    change(() => structuralChange('row', sh().rows, -1), { rebuild: true });
}

function deleteLastColumn() {
    if (sh().cols <= 1) return;
    change(() => structuralChange('col', sh().cols - 1, -1), { rebuild: true });
}

if (typeof globalThis !== 'undefined') {
    Object.assign(globalThis, {
        persistSheets, restoreSheets, deleteLastRow, deleteLastColumn,
        addNewRow, addNewColumn, initGrid, evaluateFormulas, computeFormula,
    });
}
