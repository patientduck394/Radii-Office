let slides = [
    {
        id: "slide-1",
        title: "Presentation Title",
        background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
        elements: [
            { id: "el-1", type: "text", content: "WELCOME TO SLIDES", top: 110, left: 160, width: 320, height: 50, zIndex: 1, fontSize: "32px", color: "#ffffff" },
            { id: "el-2", type: "text", content: "Native vector SVG shapes everywhere!", top: 180, left: 160, width: 400, height: 40, zIndex: 2, fontSize: "16px", color: "#ffffff" }
        ]
    }
];

let activeSlideIndex = 0;
let activeElementId = null;

let undoStack = [];
let redoStack = [];

let snapRules = { hCenter: true, vCenter: true, grid: false };

// Layout options (persisted)! Dual rounding handles adds a mirrored dot!
let layoutOpts = { dualHandles: false };
try {
    if (localStorage.getItem('amber_layout_dual_handles') === '1') layoutOpts.dualHandles = true;
} catch (e) {}

let draggedElement = null;
let dragOffsetX = 0, dragOffsetY = 0;
let dragSavePending = false;
let mouseDownActiveId = null;
let lastNudge = null;
let editingElementId = null;

let resizingElement = null;
let resizeHandleType = null;
let cornerResizing = null;
let resizeStartX = 0, resizeStartY = 0;
let resizeStartWidth = 0, resizeStartHeight = 0;
let resizeStartLeft = 0, resizeStartTop = 0;

// SVG Path Generator Engine for 3D Glossy Shapes
// strokeCss/strokeW override the synced stroke (null = synced with fill)!
// radius overrides corner rounding for roundable shapes (null = shape default)!
// inner = { blur, color, dx, dy } for inset shadows (null = off)!
function getSvgShapeMarkup(shapeType, fillHex, strokeCss, strokeW, radius, inner) {
    if (!fillHex) fillHex = "#38bdf8";
    const darkTone = adjustColorBrightness(fillHex, -35);
    const lightTone = adjustColorBrightness(fillHex, 35);
    const gradId = `grad-${Math.random().toString(36).substr(2, 9)}`;
    const sw = (strokeW === undefined || strokeW === null) ? 2 : strokeW;
    // Corner radii: {rx, ry} object for per-axis control, scalar for legacy linked!
    let rx, ry;
    if (radius && typeof radius === 'object') {
        const c48 = (v) => Math.max(0, Math.min(48, v));
        rx = c48(radius.rx);
        ry = c48(radius.ry);
    } else {
        const polyDefault = (shapeType === 'triangle' || shapeType === 'star' || shapeType === 'hexagon' || shapeType === 'diamond') ? 0 : 4;
        const r = (radius === undefined || radius === null)
            ? (shapeType === 'rounded' ? 20 : shapeType === 'chip' ? 24 : polyDefault)
            : Math.max(0, Math.min(48, radius));
        rx = ry = r;
    }
    // Classic inverted-alpha inset shadow filter!
    let innerDef = "", innerAttr = "";
    if (inner && inner.blur >= 0 && (inner.blur > 0 || inner.dx !== 0 || inner.dy !== 0)) {
        const ic = parseColorComponents(inner.color) || { r: 0, g: 0, b: 0, a: 0.45 };
        innerDef = `
                <filter id="inner-${gradId}" x="-40%" y="-40%" width="180%" height="180%">
                    <feComponentTransfer in="SourceAlpha" result="solidAlpha">
                        <feFuncA type="linear" slope="50" intercept="0" />
                    </feComponentTransfer>
                    <feComponentTransfer in="solidAlpha" result="invAlpha">
                        <feFuncA type="table" tableValues="1 0" />
                    </feComponentTransfer>
                    <feGaussianBlur in="invAlpha" stdDeviation="${inner.blur}" result="soft" />
                    <feOffset in="soft" dx="${inner.dx}" dy="${inner.dy}" result="placed" />
                    <feFlood flood-color="rgb(${ic.r}, ${ic.g}, ${ic.b})" flood-opacity="${ic.a}" result="tint" />
                    <feComposite in="tint" in2="placed" operator="in" result="shade" />
                    <feComposite in="shade" in2="solidAlpha" operator="in" result="clipped" />
                    <feMerge>
                        <feMergeNode in="SourceGraphic" />
                        <feMergeNode in="clipped" />
                    </feMerge>
                </filter>`;
        innerAttr = ` filter="url(#inner-${gradId})"`;
    }

    let pathD = "";
    let viewBox = "0 0 100 100";

    switch(shapeType) {
        case 'rect':
            pathD = '<rect x="2" y="2" width="96" height="96" rx="4" />';
            break;
        case 'rounded':
            pathD = '<rect x="2" y="2" width="96" height="96" rx="20" />';
            break;
        case 'circle':
            pathD = '<circle cx="50" cy="50" r="48" />';
            break;
        case 'diamond':
            pathD = '<polygon points="50,2 98,50 50,98 2,50" />';
            break;
        case 'triangle':
            pathD = '<polygon points="50,2 98,98 2,98" />';
            break;
        case 'star':
            pathD = '<polygon points="50,2 63,35 98,35 70,57 81,91 50,70 19,91 30,57 2,35 37,35" />';
            break;
        case 'heart':
            viewBox = "0 0 24 24";
            pathD = '<path d="M 12 21.35 l -1.45 -1.32 C 5.4 15.36 2 12.28 2 8.5 C 2 5.42 4.42 3 7.5 3 c 1.74 0 3.41 0.81 4.5 2.09 C 13.09 3.81 14.76 3 16.5 3 C 19.58 3 22 5.42 22 8.5 c 0 3.78 -3.4 6.86 -8.55 11.54 L 12 21.35 Z" />';
            break;
        case 'hexagon':
            pathD = '<polygon points="25,2 75,2 98,50 75,98 25,98 2,50" />';
            break;
        case 'arrow-right':
            pathD = '<polygon points="2,25 60,25 60,5 98,50 60,95 60,75 2,75" />';
            break;
        case 'arrow-left':
            pathD = '<polygon points="40,5 40,25 98,25 98,75 40,75 40,95 2,50" />';
            break;
        case 'speech':
            pathD = '<polygon points="2,2 98,2 98,70 40,70 15,98 20,70 2,70" />';
            break;
        case 'plus':
            pathD = '<polygon points="33,2 67,2 67,33 98,33 98,67 67,67 67,98 33,98 33,67 2,67 2,33 33,33" />';
            break;
        case 'chip':
            pathD = '<rect x="2" y="2" width="96" height="96" rx="24" />';
            break;
        case 'ring':
            pathD = '<path d="M 50 2 A 48 48 0 1 0 50 98 A 48 48 0 1 0 50 2 Z M 50 28 A 22 22 0 1 1 50 72 A 22 22 0 1 1 50 28 Z" fill-rule="evenodd" />';
            break;
        case 'pill':
            pathD = '<rect x="2" y="22" width="96" height="56" rx="28" />';
            break;
        case 'burst':
            pathD = '<polygon points="50,2 60,22 82,12 78,34 98,40 82,54 92,74 70,70 62,92 50,72 38,92 30,70 8,74 18,54 2,40 22,34 18,12 40,22" />';
            break;
        case 'shield':
            pathD = '<path d="M 50 2 L 90 18 L 90 50 C 90 74 70 90 50 98 C 30 90 10 74 10 50 L 10 18 Z" />';
            break;
        default:
            return '';
    }

    // Roundable rect-based shapes obey the live corner radii!
    if (shapeType === 'rect' || shapeType === 'rounded') {
        pathD = pathD.replace(/rx="[^"]*"/, `rx="${rx}" ry="${ry}"`);
    }

    // Roundable polygons get real curved corners (sharp when radii are 0)!
    if (shapeType === 'triangle' || shapeType === 'star' || shapeType === 'hexagon' || shapeType === 'diamond') {
        const pts = (pathD.match(/points="([^"]*)"/) || [])[1] || '';
        const rounded = roundedPolyPath(pts, rx, ry);
        if (rounded) pathD = `<path d="${rounded}" />`;
    }

    // Glassy transparent Aero badge: frosted translucent fill + crisp white rim!
    if (shapeType === 'chip') {
        const chipStroke = strokeCss || 'rgba(255,255,255,0.9)';
        return `
        <svg class="slide-svg-shape" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7" />
                    <stop offset="45%" stop-color="${fillHex}" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="${darkTone}" stop-opacity="0.5" />
                </linearGradient>
                <filter id="shadow-${gradId}" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.25" />
                </filter>${innerDef}
            </defs>
            <g filter="url(#shadow-${gradId})">
                <rect x="2" y="2" width="96" height="96" rx="${rx}" ry="${ry}" fill="url(#${gradId})" stroke="${chipStroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"${innerAttr} />
                <rect x="6" y="5" width="88" height="30" rx="${Math.max(2, Math.round(rx * 0.6))}" ry="${Math.max(2, Math.round(ry * 0.6))}" fill="#ffffff" opacity="0.22" />
            </g>
        </svg>
    `;
    }

    const shapeStroke = strokeCss || lightTone;
    return `
        <svg class="slide-svg-shape" viewBox="${viewBox}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="${fillHex}" />
                    <stop offset="100%" stop-color="${darkTone}" />
                </linearGradient>
                <filter id="shadow-${gradId}" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.3" />
                </filter>${innerDef}
            </defs>
            <g filter="url(#shadow-${gradId})">
                ${pathD.replace('/>', ` fill="url(#${gradId})" stroke="${shapeStroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"${innerAttr} />`)}
            </g>
        </svg>
    `;
}

function saveState() {
    undoStack.push(JSON.stringify(slides));
    redoStack = [];
    if (undoStack.length > 30) undoStack.shift();
}

function undo() {
    if (undoStack.length === 0) return;
    playAeroClickSound(500, 0.08);
    redoStack.push(JSON.stringify(slides));
    slides = JSON.parse(undoStack.pop());
    activeElementId = null;
    editingElementId = null;
    renderThumbnails();
    renderActiveSlide();
}

function redo() {
    if (redoStack.length === 0) return;
    playAeroClickSound(700, 0.08);
    undoStack.push(JSON.stringify(slides));
    slides = JSON.parse(redoStack.pop());
    activeElementId = null;
    editingElementId = null;
    renderThumbnails();
    renderActiveSlide();
}

function parseColorComponents(color) {
    if (typeof color !== 'string') return null;
    const c = color.trim().toLowerCase();
    // Hex: #rgb, #rrggbb, #rrggbbaa!
    let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(c);
    if (m) {
        let h = m[1];
        if (h.length === 3 || h.length === 4) h = h.split('').map(ch => ch + ch).join('');
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        const a = h.length === 8 ? Math.round(parseInt(h.slice(6, 8), 16) / 255 * 100) / 100 : 1;
        return { r, g, b, a };
    }
    // rgb() / rgba() — numbers or percentages!
    m = /^rgba?\(\s*([^)]+)\)$/.exec(c);
    if (m) {
        const parts = m[1].split(',').map(s => s.trim());
        if (parts.length < 3 || parts.length > 4) return null;
        const num = (v, max) => {
            if (v.endsWith('%')) return Math.round(parseFloat(v) / 100 * max);
            return Math.round(parseFloat(v));
        };
        const r = num(parts[0], 255), g = num(parts[1], 255), b = num(parts[2], 255);
        let a = 1;
        if (parts.length === 4) {
            const av = parts[3];
            a = av.endsWith('%') ? parseFloat(av) / 100 : parseFloat(av);
        }
        if ([r, g, b, a].some(v => isNaN(v))) return null;
        return {
            r: Math.max(0, Math.min(255, r)),
            g: Math.max(0, Math.min(255, g)),
            b: Math.max(0, Math.min(255, b)),
            a: Math.max(0, Math.min(1, Math.round(a * 100) / 100))
        };
    }
    // hsv() / hsva() — h: 0-360, s/v: percents, a: number or percent!
    m = /^hsva?\(\s*([^)]+)\)$/.exec(c);
    if (m) {
        const parts = m[1].split(',').map(s => s.trim());
        if (parts.length < 3 || parts.length > 4) return null;
        const pct = (v) => v.endsWith('%') ? parseFloat(v) : parseFloat(v);
        let h = parseFloat(parts[0]);
        let s = pct(parts[1]), v = pct(parts[2]);
        let a = 1;
        if (parts.length === 4) {
            const av = parts[3];
            a = av.endsWith('%') ? parseFloat(av) / 100 : parseFloat(av);
        }
        if ([h, s, v, a].some(x => isNaN(x))) return null;
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s));
        v = Math.max(0, Math.min(100, v));
        a = Math.max(0, Math.min(1, Math.round(a * 100) / 100));
        const rgb = hsvToRgb(h, s, v);
        return { r: rgb.r, g: rgb.g, b: rgb.b, a };
    }
    return null;
}

function rgbaString(s) {
    const a = Math.round(s.a * 100) / 100;
    return `rgba(${s.r}, ${s.g}, ${s.b}, ${a})`;
}

/* RGB <-> HSV converters (h: 0-360, s/v: 0-100)! */
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max * 100;
    return { h: Math.round(h) % 360, s: Math.round(s), v: Math.round(max * 100) };
}

function hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60) { rp = c; gp = x; }
    else if (h < 120) { rp = x; gp = c; }
    else if (h < 180) { gp = c; bp = x; }
    else if (h < 240) { gp = x; bp = c; }
    else if (h < 300) { rp = x; bp = c; }
    else { rp = c; bp = x; }
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255)
    };
}

function hsvaString(s) {
    const hsv = rgbToHsv(s.r, s.g, s.b);
    const a = Math.round(s.a * 100) / 100;
    return `hsva(${hsv.h}, ${hsv.s}%, ${hsv.v}%, ${a})`;
}

/* Stroke resolution: synced strokes derive from fill (legacy look),
   independent strokes use the element's own color + width! */
function computeStrokeFor(el) {
    const fill = (el && el.fillColor) || "#38bdf8";
    const width = (el && el.strokeWidth !== undefined && el.strokeWidth !== null) ? el.strokeWidth : 2;
    if (!el || el.strokeSync !== false) return { css: null, width };
    return { css: el.strokeColor || adjustColorBrightness(fill, 35), width };
}

function syncedStrokePreview(fillHex) {
    return adjustColorBrightness(fillHex || "#38bdf8", 35);
}

/* Corner rounding: rects, badges PLUS triangle, star, hexagon, diamond! */
function isRoundableShape(el) {
    return !!el && (el.shapeType === 'rect' || el.shapeType === 'rounded' || el.shapeType === 'chip' ||
        el.shapeType === 'triangle' || el.shapeType === 'star' ||
        el.shapeType === 'hexagon' || el.shapeType === 'diamond');
}
function cornerRadiusFor(el) {
    const R = cornerRadiiFor(el);
    return R ? R.rx : null;
}

function cornerDefaultFor(shapeType) {
    // Polygons default to razor sharp (legacy look); rects keep their baked rounding!
    if (shapeType === 'rounded') return 20;
    if (shapeType === 'chip') return 24;
    if (shapeType === 'rect') return 4;
    return 0;
}

/* Per-axis corner radii! Legacy scalar cornerRadius maps to both axes! */
function cornerRadiiFor(el) {
    if (!isRoundableShape(el)) return null;
    const clamp48 = (v) => Math.max(0, Math.min(48, v));
    const legacy = (el.cornerRadius === undefined || el.cornerRadius === null)
        ? cornerDefaultFor(el.shapeType) : clamp48(el.cornerRadius);
    const rx = (el.cornerRx === undefined || el.cornerRx === null) ? legacy : clamp48(el.cornerRx);
    const ry = (el.cornerRy === undefined || el.cornerRy === null) ? legacy : clamp48(el.cornerRy);
    return { rx, ry };
}

/* Rounded polygon paths: chamfer every corner with quadratic curves!
   Each axis auto-clamps to half the shortest edge so stars never invert! */
function roundedPolyPath(pointsStr, rx, ry) {
    const nums = String(pointsStr || '').trim().split(/[\s,]+/).map(Number);
    if (nums.length < 6 || nums.some(v => isNaN(v))) return null;
    const n = nums.length / 2;
    let minLen = Infinity;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        minLen = Math.min(minLen, Math.hypot(nums[2 * j] - nums[2 * i], nums[2 * j + 1] - nums[2 * i + 1]));
    }
    rx = Math.min(rx, minLen / 2 * 0.999);
    ry = Math.min(ry, minLen / 2 * 0.999);
    if (!(rx > 0.01) && !(ry > 0.01)) return null;
    const at = (i) => { const k = ((i % n) + n) % n; return [nums[2 * k], nums[2 * k + 1]]; };
    let d = '';
    for (let i = 0; i < n; i++) {
        const [x0, y0] = at(i - 1), [x1, y1] = at(i), [x2, y2] = at(i + 1);
        const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
        if (l1 < 1e-6 || l2 < 1e-6) continue;
        const ax = x1 - (x1 - x0) / l1 * rx, ay = y1 - (y1 - y0) / l1 * rx;
        const bx = x1 + (x2 - x1) / l2 * ry, by = y1 + (y2 - y1) / l2 * ry;
        d += (d === '' ? 'M ' : 'L ') + ax.toFixed(2) + ',' + ay.toFixed(2) + ' ';
        d += 'Q ' + x1 + ',' + y1 + ' ' + bx.toFixed(2) + ',' + by.toFixed(2) + ' ';
    }
    return d + 'Z';
}

/* Inner shadow: normalized options or null when disabled! */
function defaultInnerShadow() {
    return { enabled: false, blur: 6, color: 'rgba(0, 0, 0, 0.45)', dx: 0, dy: 2 };
}

function computeInnerFor(el) {
    const s = el && el.innerShadow;
    if (!s || s.enabled !== true) return null;
    return {
        blur: Math.max(0, Math.min(20, s.blur !== undefined && s.blur !== null ? s.blur : 6)),
        color: s.color || 'rgba(0, 0, 0, 0.45)',
        dx: Math.max(-12, Math.min(12, s.dx || 0)),
        dy: Math.max(-12, Math.min(12, s.dy || 0))
    };
}

/* Silhouette mask from the live shape geometry — drives shape-hugging frost!
   Recolors the rendered markup to solid white for mask duty! */
function shapeMaskUrl(el) {
    if (!el) return null;
    const markup = getSvgShapeMarkup(el.shapeType, el.fillColor || '#38bdf8', null, 2, cornerRadiiFor(el), null);
    if (!markup || markup.indexOf('<defs>') === -1) return null;
    let s = markup.replace(/<defs>[\s\S]*?<\/defs>/, '');
    s = s.replace(/ fill="url\(#[^)]*\)"/g, ' fill="#ffffff"');
    s = s.replace(/ stroke="[^"]*"/g, '');
    s = s.replace(/ stroke-width="[^"]*"/g, '');
    s = s.replace(/ filter="[^"]*"/g, '');
    s = s.replace(/ opacity="[^"]*"/g, '');
    s = s.replace('<svg ', "<svg xmlns='http://www.w3.org/2000/svg' ");
    s = s.split('"').join("'");
    if (s.indexOf('<rect') === -1 && s.indexOf('<polygon') === -1 && s.indexOf('<path') === -1 && s.indexOf('<circle') === -1) return null;
    return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
}

/* Background blur: frosted glass clipped to the TRUE silhouette (0 = off)!
   A dedicated frost layer sits behind the glyph so strokes stay razor sharp! */
function applyBgBlur(svgContainer, el) {
    if (!el || el.type !== 'shape') return;
    const glassBase = svgContainer.classList.contains('chip-glass');
    const b = el.bgBlur ? Math.max(0, Math.min(24, el.bgBlur)) : 0;
    if (!b && !glassBase) return;
    const frost = document.createElement('div');
    frost.className = 'frost-layer';
    const maskUrl = shapeMaskUrl(el);
    if (maskUrl) {
        frost.style.webkitMaskImage = maskUrl;
        frost.style.maskImage = maskUrl;
        frost.style.webkitMaskSize = '100% 100%';
        frost.style.maskSize = '100% 100%';
        frost.style.webkitMaskRepeat = 'no-repeat';
        frost.style.maskRepeat = 'no-repeat';
        frost.style.webkitMaskPosition = 'center';
        frost.style.maskPosition = 'center';
    }
    const total = b + (glassBase ? 3 : 0);
    const sat = glassBase ? ' saturate(1.3)' : '';
    frost.style.backdropFilter = `blur(${total}px)${sat}`;
    frost.style.webkitBackdropFilter = `blur(${total}px)${sat}`;
    svgContainer.insertBefore(frost, svgContainer.firstChild);
}

function adjustColorBrightness(color, percent) {
    const p = parseColorComponents(color);
    if (!p) return color;
    const amt = Math.round(2.55 * percent);
    const cl = (v) => Math.max(0, Math.min(255, v + amt));
    const r = cl(p.r), g = cl(p.g), b = cl(p.b);
    // Preserve translucency as rgba(); solid colors keep legacy hex output!
    if (p.a < 1) return `rgba(${r}, ${g}, ${b}, ${p.a})`;
    return '#' + (0x1000000 + (r * 0x10000) + (g * 0x100) + b).toString(16).slice(1);
}

function playAeroClickSound(frequency = 600, duration = 0.08) {
    try {
        const ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    renderThumbnails();
    renderActiveSlide();
    initTooltips();
    initRgbaPicker();
    const dualBox = document.getElementById("dual-handles-box");
    if (dualBox) dualBox.checked = layoutOpts.dualHandles;

    document.addEventListener("keydown", (e) => {
        if (e.key === "F5") {
            e.preventDefault();
            startPresentation();
        } else if (e.key === "Escape") {
            if (editingElementId !== null) {
                editingElementId = null;
                renderActiveSlide();
            }
            closeRgbaPicker();
            closeFillPopup();
            exitPresentation();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            if (e.shiftKey) redo();
            else undo();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            redo();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            exportKaFile();
        } else if (e.key.indexOf('Arrow') === 0) {
            // In presentation mode arrows flip slides; on canvas they nudge!
            const overlay = document.getElementById("presentation-overlay");
            if (overlay && overlay.style.display !== 'none') {
                e.preventDefault();
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextSlide();
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevSlide();
            } else if (activeElementId && editingElementId === null) {
                const t = e.target;
                const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
                if (!typing) {
                    const el = slides[activeSlideIndex].elements.find(item => item.id === activeElementId);
                    if (el) {
                        e.preventDefault();
                        // Shift-arrow leaps 10px; plain arrows step 1px!
                        const step = e.shiftKey ? 10 : 1;
                        // Coalesce key-repeat into one undo step per second!
                        const now = Date.now();
                        if (!lastNudge || lastNudge.id !== el.id || now - lastNudge.time > 1000) {
                            saveState();
                        }
                        lastNudge = { id: el.id, time: now };
                        if (e.key === 'ArrowLeft') el.left = el.left - step;
                        else if (e.key === 'ArrowRight') el.left = el.left + step;
                        else if (e.key === 'ArrowUp') el.top = el.top - step;
                        else if (e.key === 'ArrowDown') el.top = el.top + step;
                        renderActiveSlide();
                        renderThumbnails();
                    }
                }
            }
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && activeElementId && editingElementId === null) {
            const t = e.target;
            const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
            if (!typing) {
                e.preventDefault();
                deleteActiveElement();
            }
        }
    });

    document.addEventListener("mousemove", (e) => {
        handleDrag(e);
        handleResize(e);
        handleCornerResize(e);
    });

    document.addEventListener("mouseup", () => {
        stopDrag();
        stopResize();
        stopCornerResize();
    });

    document.addEventListener("click", (e) => {
        const isElement = e.target.closest('.slide-element');
        const isToolbar = e.target.closest('.slides-toolbar') || e.target.closest('.aero-sidebar') || e.target.closest('.aero-palette-menu') || e.target.closest('.marketplace-dialog');
        
        if (!isElement && !isToolbar && (activeElementId !== null || editingElementId !== null)) {
            activeElementId = null;
            editingElementId = null;
            renderActiveSlide();
        }

        hideContextMenu();
        const shapesPopup = document.getElementById("shapes-popup");
        if (shapesPopup) shapesPopup.classList.remove("show");
        const snapPopup = document.getElementById("snap-popup");
        if (snapPopup) snapPopup.classList.remove("show");
    });
});

function initTooltips() {
    const tooltip = document.getElementById("aero-tooltip");
    if (!tooltip) return;
    // Delegated hovering: dynamically added buttons (Marketplace shapes!) included!
    let hoveredEl = null;
    const showFor = (el) => {
        if (el === hoveredEl) return;
        hoveredEl = el;
        if (!el) {
            tooltip.classList.remove("show");
            return;
        }
        const text = el.getAttribute('data-tooltip');
        if (!text) {
            tooltip.classList.remove("show");
            return;
        }
        tooltip.innerText = text;
        const rect = el.getBoundingClientRect();
        tooltip.style.left = (rect.left + 10) + "px";
        tooltip.style.top = (rect.bottom + 8) + "px";
        tooltip.classList.add("show");
    };
    document.addEventListener('mouseover', (e) => {
        const el = e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null;
        showFor(el);
    });
    document.addEventListener('mouseout', (e) => {
        const el = e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null;
        if (el && hoveredEl === el && (!e.relatedTarget || !el.contains(e.relatedTarget))) {
            hoveredEl = null;
            tooltip.classList.remove("show");
        }
    });
    // Never leave a tooltip stranded after re-renders or drags!
    document.addEventListener('mousedown', () => {
        hoveredEl = null;
        tooltip.classList.remove("show");
    });
}

function handleCanvasContextMenu(e) {
    e.preventDefault();
    playAeroClickSound(750, 0.1);
    
    const menu = document.getElementById("context-menu");
    if (!menu) return;

    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";

    menu.classList.remove("hiding");
    menu.classList.add("show");
}

function hideContextMenu() {
    const menu = document.getElementById("context-menu");
    if (menu && menu.classList.contains("show")) {
        menu.classList.remove("show");
        menu.classList.add("hiding");
        setTimeout(() => menu.classList.remove("hiding"), 120);
    }
}

function renderThumbnails() {
    const strip = document.getElementById("thumbnail-strip");
    strip.innerHTML = "";

    // Virtual slide space: matches .slide-surface max 720x405 (16/9)!
    const V_W = 720, V_H = 405;

    slides.forEach((slide, idx) => {
        const thumb = document.createElement("div");
        thumb.className = `thumbnail-card ${idx === activeSlideIndex ? 'active' : ''}`;
        thumb.onclick = () => {
            playAeroClickSound(500, 0.06);
            activeSlideIndex = idx;
            activeElementId = null;
            editingElementId = null;
            renderThumbnails();
            renderActiveSlide();
        };

        const live = document.createElement("div");
        live.className = "thumbnail-live";
        live.style.background = slide.background;

        const sorted = [...slide.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        sorted.forEach(el => {
            const mini = document.createElement("div");
            mini.className = "thumbnail-live-el";
            const l = Math.max(-25, Math.min(100, (el.left || 0) / V_W * 100));
            const t = Math.max(-25, Math.min(100, (el.top || 0) / V_H * 100));
            const w = Math.max(2, (el.width || 60) / V_W * 100);
            const h = Math.max(3, (el.height || 24) / V_H * 100);
            mini.style.left = l + "%";
            mini.style.top = t + "%";
            mini.style.width = w + "%";
            mini.style.height = h + "%";
            mini.style.zIndex = el.zIndex || 1;
            if (el.type === 'shape') {
                // Real miniature: same vector SVG engine as the canvas!
                mini.classList.add("is-shape");
                const mStroke = computeStrokeFor(el);
                mini.innerHTML = getSvgShapeMarkup(el.shapeType, el.fillColor || "#38bdf8", mStroke.css, mStroke.width, cornerRadiiFor(el), computeInnerFor(el));
                const label = document.createElement("span");
                label.className = "thumb-mini-text";
                const fs = parseFloat(el.fontSize) || 14;
                label.style.fontSize = Math.max(2, fs * 0.19) + "px";
                label.style.color = el.color || "#ffffff";
                label.textContent = String(el.content || "").replace(/<[^>]*>/g, "").slice(0, 24);
                mini.appendChild(label);
                applyBgBlur(mini, el);
            } else {
                const fs = parseFloat(el.fontSize) || 18;
                mini.style.fontSize = Math.max(2, fs * 0.19) + "px";
                mini.style.color = el.color || "#ffffff";
                const plain = String(el.content || "").replace(/<[^>]*>/g, "").slice(0, 42);
                mini.textContent = plain || "Text";
            }
            live.appendChild(mini);
        });

        const num = document.createElement("span");
        num.className = "thumbnail-number";
        num.innerText = idx + 1;

        thumb.appendChild(live);
        thumb.appendChild(num);
        strip.appendChild(thumb);
    });

    const badge = document.querySelector(".presentation-title-badge .badge-label");
    if (badge) badge.innerText = `SLIDE ${activeSlideIndex + 1}`;
}

function renderActiveSlide() {
    const canvas = document.getElementById("slide-canvas");
    const currentSlide = slides[activeSlideIndex];
    canvas.style.background = currentSlide.background;
    
    const guideX = document.getElementById("guide-x");
    const guideY = document.getElementById("guide-y");
    canvas.innerHTML = "";
    if (guideX) canvas.appendChild(guideX);
    if (guideY) canvas.appendChild(guideY);

    document.getElementById("slide-title-input").value = currentSlide.title || `Slide ${activeSlideIndex + 1}`;

    currentSlide.elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    currentSlide.elements.forEach(el => {
        const div = document.createElement("div");
        const isSelected = el.id === activeElementId;
        const isEditing = el.id === editingElementId;
        div.dataset.elId = el.id;
        div.className = `slide-element ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`;
        div.style.top = el.top + "px";
        div.style.left = el.left + "px";
        if (el.width) div.style.width = el.width + "px";
        if (el.height) div.style.height = el.height + "px";
        div.style.zIndex = el.zIndex || 1;
        div.style.fontSize = el.fontSize || "18px";
        div.style.color = el.color || "#ffffff";

        // Render Native SVG shape background if shape element
        if (el.type === 'shape') {
            const svgContainer = document.createElement("div");
            svgContainer.className = "slide-svg-container";
            if (el.shapeType === 'chip') {
                svgContainer.classList.add("chip-glass");
                // Badge glass follows the live corner rounding!
                const chipR = cornerRadiiFor(el);
                svgContainer.style.borderRadius = chipR.rx + '% / ' + chipR.ry + '%';
            }
            const eStroke = computeStrokeFor(el);
            svgContainer.innerHTML = getSvgShapeMarkup(el.shapeType, el.fillColor || "#38bdf8", eStroke.css, eStroke.width, cornerRadiiFor(el), computeInnerFor(el));
            applyBgBlur(svgContainer, el);
            div.appendChild(svgContainer);
        }

        const textSpan = document.createElement("span");
        textSpan.className = "slide-text-content";
        // Only editable when selected AND double-clicked!
        textSpan.contentEditable = isEditing ? "true" : "false";
        textSpan.innerHTML = el.content;

        textSpan.oninput = () => {
            el.content = textSpan.innerHTML;
            renderThumbnails();
        };

        textSpan.onfocus = () => {
            activeElementId = el.id;
        };

        textSpan.onblur = () => {
            if (editingElementId === el.id) {
                el.content = textSpan.innerHTML;
                editingElementId = null;
                renderThumbnails();
                renderActiveSlide();
            }
        };

        div.onclick = (e) => {
            e.stopPropagation();
            // While editing this element, ALL mouse activity (caret moves,
            // highlighting text!) must never rebuild the DOM or blur focus!
            if (editingElementId === el.id) return;
            // Was this element already selected BEFORE mousedown?
            // New selections must render (shows highlight + handles)!
            // Repeat clicks skip render so dblclick never breaks!
            const wasSelectedBeforeMouseDown = mouseDownActiveId === el.id;
            if (editingElementId !== null && editingElementId !== el.id) {
                editingElementId = null;
            }
            activeElementId = el.id;
            mouseDownActiveId = null;
            if (!wasSelectedBeforeMouseDown) renderActiveSlide();
            else {
                // Already selected: ensure highlight without rebuilding DOM!
                document.querySelectorAll("#slide-canvas .slide-element").forEach(d => {
                    d.classList.toggle("selected", d.dataset.elId === el.id);
                });
            }
        };

        div.ondblclick = (e) => {
            e.stopPropagation();
            // Already editing? Let the browser handle word-selection natively!
            if (editingElementId === el.id) return;
            playAeroClickSound(700, 0.06);
            saveState();
            activeElementId = el.id;
            editingElementId = el.id;
            renderActiveSlide();
            // Focus the freshly rendered editable span for this exact element!
            requestAnimationFrame(() => {
                const target = document.querySelector(`#slide-canvas .slide-element[data-el-id="${el.id}"] .slide-text-content`);
                if (target) {
                    target.focus();
                    try {
                        const range = document.createRange();
                        range.selectNodeContents(target);
                        range.collapse(false);
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } catch (err) {}
                }
            });
        };

        div.onmousedown = (e) => {
            // When editing text, let the browser handle caret/selection!
            if (editingElementId === el.id) return;
            if (e.target.classList && e.target.classList.contains("resize-handle")) return;
            if (e.target.contentEditable === "true") return;
            // Remember selection state BEFORE this press for click logic!
            mouseDownActiveId = activeElementId;
            draggedElement = el;
            dragSavePending = true;
            activeElementId = el.id;
            const rect = div.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
        };

        if (el.id === activeElementId && editingElementId !== el.id) {
            ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(handleType => {
                const handle = document.createElement("div");
                handle.className = `resize-handle resize-${handleType}`;
                handle.onmousedown = (e) => {
                    e.stopPropagation();
                    // Committing any open text edit before resizing!
                    editingElementId = null;
                    saveState();
                    resizingElement = el;
                    resizeHandleType = handleType;
                    resizeStartX = e.clientX;
                    resizeStartY = e.clientY;
                    resizeStartWidth = el.width || div.offsetWidth;
                    resizeStartHeight = el.height || div.offsetHeight;
                    resizeStartLeft = el.left || 0;
                    resizeStartTop = el.top || 0;
                };
                div.appendChild(handle);
            });
            // Corner rounding handles: Y rides the left edge, X joins the top with dual!
            // No Shift = one axis, Shift = both!
            if (isRoundableShape(el)) {
                const R = cornerRadiiFor(el);
                const wPx = el.width || 120, hPx = el.height || 80;
                const defs = [{ axis: 'y', left: -6, top: Math.max(4, (R.ry / 100) * hPx - 6), cursor: 'ns-resize' }];
                if (layoutOpts.dualHandles) {
                    defs.push({ axis: 'x', left: Math.max(4, (R.rx / 100) * wPx - 6), top: -6, cursor: 'ew-resize' });
                }
                defs.forEach(def => {
                    const cHandle = document.createElement("div");
                    cHandle.className = "resize-handle corner-handle";
                    cHandle.title = `Corners ${R.rx} x ${R.ry} — drag an axis, Shift links both!`;
                    cHandle.style.left = def.left + "px";
                    cHandle.style.top = def.top + "px";
                    cHandle.style.cursor = def.cursor;
                    cHandle.onmousedown = (e) => {
                        e.stopPropagation();
                        // Committing any open text edit before rounding!
                        editingElementId = null;
                        saveState();
                        cornerResizing = { id: el.id, axis: def.axis };
                    };
                    div.appendChild(cHandle);
                });
            }
        }

        div.appendChild(textSpan);
        canvas.appendChild(div);
    });
    updatePickerDots();
}

function handleResize(e) {
    if (!resizingElement) return;
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;
    const MIN = 10;

    if (resizeHandleType === 'se') {
        // Drags down + right: grows width/height!
        resizingElement.width = Math.max(MIN, resizeStartWidth + dx);
        resizingElement.height = Math.max(MIN, resizeStartHeight + dy);
    } else if (resizeHandleType === 'sw') {
        // Drags down + left: left edge follows cursor, right edge stays!
        const newWidth = Math.max(MIN, resizeStartWidth - dx);
        const newHeight = Math.max(MIN, resizeStartHeight + dy);
        resizingElement.left = resizeStartLeft + (resizeStartWidth - newWidth);
        resizingElement.width = newWidth;
        resizingElement.height = newHeight;
    } else if (resizeHandleType === 'ne') {
        // Drags up + right: top edge follows cursor, bottom edge stays!
        const newWidth = Math.max(MIN, resizeStartWidth + dx);
        const newHeight = Math.max(MIN, resizeStartHeight - dy);
        resizingElement.width = newWidth;
        resizingElement.top = resizeStartTop + (resizeStartHeight - newHeight);
        resizingElement.height = newHeight;
    } else if (resizeHandleType === 'nw') {
        // Drags up + left: top-left corner follows cursor, bottom-right stays!
        const newWidth = Math.max(MIN, resizeStartWidth - dx);
        const newHeight = Math.max(MIN, resizeStartHeight - dy);
        resizingElement.left = resizeStartLeft + (resizeStartWidth - newWidth);
        resizingElement.top = resizeStartTop + (resizeStartHeight - newHeight);
        resizingElement.width = newWidth;
        resizingElement.height = newHeight;
    } else if (resizeHandleType === 'e') {
        // Drags right: width only, left edge stays!
        resizingElement.width = Math.max(MIN, resizeStartWidth + dx);
    } else if (resizeHandleType === 'w') {
        // Drags left: width only, right edge stays!
        const newWidth = Math.max(MIN, resizeStartWidth - dx);
        resizingElement.left = resizeStartLeft + (resizeStartWidth - newWidth);
        resizingElement.width = newWidth;
    } else if (resizeHandleType === 's') {
        // Drags down: height only, top edge stays!
        resizingElement.height = Math.max(MIN, resizeStartHeight + dy);
    } else if (resizeHandleType === 'n') {
        // Drags up: height only, bottom edge stays!
        const newHeight = Math.max(MIN, resizeStartHeight - dy);
        resizingElement.top = resizeStartTop + (resizeStartHeight - newHeight);
        resizingElement.height = newHeight;
    }
    // Shift-constrain: snap uneven shapes to even squares mid-drag!
    if (e.shiftKey && resizingElement) {
        const size = Math.max(resizingElement.width, resizingElement.height);
        const t = resizeHandleType;
        if (t === 'w' || t === 'nw' || t === 'sw') {
            resizingElement.left = resizeStartLeft + (resizeStartWidth - size);
        }
        if (t === 'n' || t === 'nw' || t === 'ne') {
            resizingElement.top = resizeStartTop + (resizeStartHeight - size);
        }
        resizingElement.width = size;
        resizingElement.height = size;
    }
    renderActiveSlide();
}

function stopResize() {
    if (resizingElement) renderThumbnails();
    resizingElement = null;
}

/* Corner rounding drag: each handle drives its own axis, Shift links both!
   X maps pointer distance from the left edge, Y from the top edge! */
function handleCornerResize(e) {
    if (!cornerResizing) return;
    const el = slides[activeSlideIndex].elements.find(item => item.id === cornerResizing.id);
    const node = document.querySelector(`#slide-canvas .slide-element[data-el-id="${cornerResizing.id}"]`);
    if (!el || !node || !isRoundableShape(el)) return;
    const rect = node.getBoundingClientRect();
    const axis = cornerResizing.axis === 'y' ? 'y' : 'x';
    const span = axis === 'y' ? rect.height : rect.width;
    if (span < 1) return;
    const distPx = axis === 'y' ? (e.clientY - rect.top) : (e.clientX - rect.left);
    const r = Math.max(0, Math.min(48, Math.round((distPx / span) * 100)));
    if (e.shiftKey) {
        el.cornerRx = r;
        el.cornerRy = r;
    } else if (axis === 'y') {
        el.cornerRy = r;
    } else {
        el.cornerRx = r;
    }
    renderActiveSlide();
}

function stopCornerResize() {
    if (cornerResizing) renderThumbnails();
    cornerResizing = null;
}

function changeActiveShapeColor(colorHex) {
    if (!activeElementId) return;
    saveState();
    const el = slides[activeSlideIndex].elements.find(item => item.id === activeElementId);
    if (el) {
        el.fillColor = colorHex;
        renderActiveSlide();
    }
}

function addShape(shapeType) {
    saveState();
    playAeroClickSound(750, 0.1);
    let defaultContent = "Shape";
    if (shapeType === "chip") defaultContent = "Aero Badge";

    const newId = `el-${Date.now()}`;
    const isBadge = shapeType === "chip";
    slides[activeSlideIndex].elements.push({
        id: newId,
        type: "shape",
        shapeType: shapeType,
        content: defaultContent,
        top: 100,
        left: 100,
        width: 120,
        height: 80,
        zIndex: slides[activeSlideIndex].elements.length + 1,
        fontSize: "14px",
        // Aero badges default to white glass with dark readable text!
        color: isBadge ? "#475569" : "#ffffff",
        fillColor: isBadge ? "#ffffff" : "#38bdf8",
        strokeSync: true,
        strokeColor: null,
        strokeWidth: 2,
        cornerRadius: null,
        cornerRx: null,
        cornerRy: null,
        bgBlur: 0,
        innerShadow: null
    });

    activeElementId = newId;
    editingElementId = null;
    document.getElementById("shapes-popup").classList.remove("show");
    renderThumbnails();
    renderActiveSlide();
}

function changeLayer(action) {
    saveState();
    playAeroClickSound(650, 0.08);
    if (!activeElementId) return;
    const elements = slides[activeSlideIndex].elements;
    const el = elements.find(item => item.id === activeElementId);
    if (!el) return;

    if (action === 'front') {
        const maxZ = Math.max(...elements.map(i => i.zIndex || 0), 0);
        el.zIndex = maxZ + 1;
    } else if (action === 'forward') {
        el.zIndex = (el.zIndex || 0) + 1;
    } else if (action === 'backward') {
        el.zIndex = Math.max(0, (el.zIndex || 0) - 1);
    } else if (action === 'back') {
        el.zIndex = 0;
    }
    renderActiveSlide();
}

function deleteActiveElement() {
    saveState();
    playAeroClickSound(450, 0.08);
    if (!activeElementId) return;
    slides[activeSlideIndex].elements = slides[activeSlideIndex].elements.filter(i => i.id !== activeElementId);
    activeElementId = null;
    editingElementId = null;
    renderThumbnails();
    renderActiveSlide();
}

function toggleShapesPopup(e) {
    e.stopPropagation();
    playAeroClickSound(750, 0.1);
    document.getElementById("shapes-popup").classList.toggle("show");
    document.getElementById("snap-popup").classList.remove("show");
    const mktThemesPopup = document.getElementById("mkt-themes-popup");
    if (mktThemesPopup) mktThemesPopup.classList.remove("show");
    closeRgbaPicker();
    closeFillPopup();
}

function toggleSnapPopup(e) {
    e.stopPropagation();
    playAeroClickSound(750, 0.1);
    document.getElementById("snap-popup").classList.toggle("show");
    document.getElementById("shapes-popup").classList.remove("show");
    const mktThemesPopup = document.getElementById("mkt-themes-popup");
    if (mktThemesPopup) mktThemesPopup.classList.remove("show");
    closeRgbaPicker();
    closeFillPopup();
}

function toggleSnapRule(ruleKey, isChecked) {
    playAeroClickSound(550, 0.06);
    snapRules[ruleKey] = isChecked;
}

function toggleLayoutOpt(optKey, isChecked) {
    playAeroClickSound(550, 0.06);
    layoutOpts[optKey] = isChecked;
    try {
        if (optKey === 'dualHandles') {
            if (isChecked) localStorage.setItem('amber_layout_dual_handles', '1');
            else localStorage.removeItem('amber_layout_dual_handles');
        }
    } catch (e) {}
    renderActiveSlide();
}

function updateSlideTitle(val) {
    slides[activeSlideIndex].title = val;
}

function handleDrag(e) {
    if (!draggedElement) return;
    // Push undo state once on first actual movement — plain clicks stay clean!
    if (dragSavePending) {
        saveState();
        dragSavePending = false;
    }
    const canvas = document.getElementById("slide-canvas");
    const guideX = document.getElementById("guide-x");
    const guideY = document.getElementById("guide-y");

    const canvasRect = canvas.getBoundingClientRect();

    let rawLeft = e.clientX - canvasRect.left - dragOffsetX;
    let rawTop = e.clientY - canvasRect.top - dragOffsetY;

    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    const snapTolerance = 12;

    let finalLeft = rawLeft;
    let finalTop = rawTop;

    if (snapRules.grid) {
        finalLeft = Math.round(rawLeft / 20) * 20;
        finalTop = Math.round(rawTop / 20) * 20;
    }

    let showGuideX = false;
    let showGuideY = false;

    if (snapRules.hCenter && Math.abs(rawLeft - (centerX - 60)) < snapTolerance) {
        finalLeft = centerX - 60;
        showGuideX = true;
    }

    if (snapRules.vCenter && Math.abs(rawTop - (centerY - 20)) < snapTolerance) {
        finalTop = centerY - 20;
        showGuideY = true;
    }

    finalLeft = Math.min(canvasRect.width - 20, finalLeft);
    finalTop = Math.min(canvasRect.height - 20, finalTop);

    draggedElement.left = finalLeft;
    draggedElement.top = finalTop;

    if (guideX) {
        guideX.style.display = showGuideX ? "block" : "none";
        guideX.style.left = centerX + "px";
    }
    if (guideY) {
        guideY.style.display = showGuideY ? "block" : "none";
        guideY.style.top = centerY + "px";
    }

    renderActiveSlide();
}

function stopDrag() {
    if (draggedElement && !dragSavePending) renderThumbnails();
    draggedElement = null;
    dragSavePending = false;
    const guideX = document.getElementById("guide-x");
    const guideY = document.getElementById("guide-y");
    if (guideX) guideX.style.display = "none";
    if (guideY) guideY.style.display = "none";
}

function addNewSlide() {
    saveState();
    playAeroClickSound(650, 0.08);
    slides.push({
        id: `slide-${slides.length + 1}`,
        title: `Slide ${slides.length + 1}`,
        background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
        elements: [
            { id: `el-${Date.now()}`, type: "text", content: "New Slide Header", top: 130, left: 180, width: 300, height: 40, zIndex: 1, fontSize: "28px", color: "#ffffff" }
        ]
    });
    activeSlideIndex = slides.length - 1;
    renderThumbnails();
    renderActiveSlide();
}

function deleteCurrentSlide() {
    saveState();
    playAeroClickSound(450, 0.08);
    if (slides.length <= 1) return;
    slides.splice(activeSlideIndex, 1);
    if (activeSlideIndex >= slides.length) activeSlideIndex = slides.length - 1;
    renderThumbnails();
    renderActiveSlide();
}

/* ========================================================
   .KA FILE FORMAT — portable Amber decks!
   { app:'amber', kind:'slides', version:1, savedAt, activeSlideIndex, slides }
   ======================================================== */
const KA_SHAPE_TYPES = ['rect','rounded','circle','diamond','triangle','star','heart','hexagon','arrow-right','arrow-left','speech','plus','chip','ring','pill','burst','shield'];

function sanitizeKaNumber(v, fallback) {
    return (typeof v === 'number' && isFinite(v)) ? v : fallback;
}

function sanitizeKaElement(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const type = raw.type === 'shape' ? 'shape' : 'text';
    const shapeType = KA_SHAPE_TYPES.includes(raw.shapeType) ? raw.shapeType : 'rect';
    return {
        id: typeof raw.id === 'string' ? raw.id : `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        shapeType,
        content: typeof raw.content === 'string' ? raw.content : '',
        top: sanitizeKaNumber(raw.top, 100),
        left: sanitizeKaNumber(raw.left, 100),
        width: Math.max(10, sanitizeKaNumber(raw.width, 120)),
        height: Math.max(10, sanitizeKaNumber(raw.height, 60)),
        zIndex: sanitizeKaNumber(raw.zIndex, 1),
        fontSize: typeof raw.fontSize === 'string' ? raw.fontSize : '18px',
        color: typeof raw.color === 'string' ? raw.color : '#ffffff',
        fillColor: typeof raw.fillColor === 'string' ? raw.fillColor : '#38bdf8',
        strokeSync: raw.strokeSync === false ? false : true,
        strokeColor: typeof raw.strokeColor === 'string' ? raw.strokeColor : null,
        strokeWidth: sanitizeKaNumber(raw.strokeWidth, 2),
        cornerRadius: (raw.cornerRadius === null || raw.cornerRadius === undefined) ? null : sanitizeKaNumber(raw.cornerRadius, null),
        cornerRx: (raw.cornerRx === null || raw.cornerRx === undefined) ? null : sanitizeKaNumber(raw.cornerRx, null),
        cornerRy: (raw.cornerRy === null || raw.cornerRy === undefined) ? null : sanitizeKaNumber(raw.cornerRy, null),
        bgBlur: sanitizeKaNumber(raw.bgBlur, 0),
        innerShadow: (raw.innerShadow && typeof raw.innerShadow === 'object') ? {
            enabled: raw.innerShadow.enabled === true,
            blur: sanitizeKaNumber(raw.innerShadow.blur, 6),
            color: typeof raw.innerShadow.color === 'string' ? raw.innerShadow.color : 'rgba(0, 0, 0, 0.45)',
            dx: sanitizeKaNumber(raw.innerShadow.dx, 0),
            dy: sanitizeKaNumber(raw.innerShadow.dy, 2)
        } : null
    };
}

function sanitizeKaSlide(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const elements = Array.isArray(raw.elements) ? raw.elements.map(sanitizeKaElement).filter(Boolean) : [];
    return {
        id: typeof raw.id === 'string' ? raw.id : `slide-${Date.now()}`,
        title: typeof raw.title === 'string' ? raw.title : 'Untitled Slide',
        background: typeof raw.background === 'string' ? raw.background : 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
        elements
    };
}

function exportKaFile() {
    playAeroClickSound(850, 0.12);
    const payload = {
        app: 'amber',
        kind: 'slides',
        version: 1,
        savedAt: new Date().toISOString(),
        activeSlideIndex,
        slides
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const rawTitle = (slides[activeSlideIndex] && slides[activeSlideIndex].title) || 'amber-deck';
    const slug = rawTitle.replace(/<[^>]*>/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'amber-deck';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + '.ka';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function importKaFile(e) {
    const input = e.target;
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            // Tolerate both full .ka documents and bare slide arrays!
            const deck = Array.isArray(data) ? data : data.slides;
            if (!Array.isArray(deck) || !deck.length) throw new Error('empty deck');
            const clean = deck.map(sanitizeKaSlide).filter(Boolean);
            if (!clean.length) throw new Error('empty deck');
            saveState();
            slides = clean;
            const wantIdx = (data && !Array.isArray(data)) ? data.activeSlideIndex : 0;
            activeSlideIndex = Math.max(0, Math.min(clean.length - 1, wantIdx | 0));
            activeElementId = null;
            editingElementId = null;
            renderThumbnails();
            renderActiveSlide();
            playAeroClickSound(850, 0.12);
        } catch (err) {
            playAeroClickSound(300, 0.15);
            alert('Could not open that .ka file!');
        }
    };
    reader.readAsText(f);
}

function addTextBox() {
    saveState();
    playAeroClickSound(750, 0.1);
    const newId = `el-${Date.now()}`;
    slides[activeSlideIndex].elements.push({
        id: newId,
        type: "text",
        content: "New Text Box",
        top: 80,
        left: 80,
        width: 180,
        height: 40,
        zIndex: slides[activeSlideIndex].elements.length + 1,
        fontSize: "18px",
        color: "#ffffff"
    });
    activeElementId = newId;
    editingElementId = null;
    renderThumbnails();
    renderActiveSlide();
}

function changeActiveFontSize(size) {
    if (!activeElementId) return;
    saveState();
    const el = slides[activeSlideIndex].elements.find(item => item.id === activeElementId);
    if (el) {
        el.fontSize = size;
        renderActiveSlide();
    }
}

function changeActiveTextColor(color) {
    if (!activeElementId) return;
    saveState();
    const el = slides[activeSlideIndex].elements.find(item => item.id === activeElementId);
    if (el) {
        el.color = color;
        renderActiveSlide();
    }
}

/* ========================================================
   CUSTOM RGBA COLOR PICKER — 4 sliders (R, G, B, A)!
   Each track previews its own channel ramp live!
   The RGBA tag is typable: copy it out, paste one in!
   ======================================================== */
let rgbaTarget = 'text';
let rgbaState = { r: 255, g: 255, b: 255, a: 1 };
let rgbaSavedThisOpen = false;
let pickerMode = 'rgba';
try {
    if (localStorage.getItem('amber_picker_mode') === 'hsva') pickerMode = 'hsva';
} catch (e) {}
// Remembers exact HSV slider positions so integer rounding never jitters the thumb!
let lastHsv = null;

function setPickerMode(mode) {
    if (mode !== 'rgba' && mode !== 'hsva') return;
    pickerMode = mode;
    lastHsv = null;
    try { localStorage.setItem('amber_picker_mode', mode); } catch (e) {}
    playAeroClickSound(550, 0.06);
    document.getElementById("rgba-mode-rgba").classList.toggle("active", mode === 'rgba');
    document.getElementById("rgba-mode-hsva").classList.toggle("active", mode === 'hsva');
    refreshRgbaUI(false);
}

function rgbaTargetDefaults() {
    if (rgbaTarget === 'stroke') return '#7dd3fc';
    if (rgbaTarget === 'innershadow') return 'rgba(0, 0, 0, 0.5)';
    if (rgbaTarget === 'fill') {
        const el = rgbaCurrentElement();
        if (el && el.shapeType === 'chip') return '#ffffff';
        return '#38bdf8';
    }
    return '#ffffff';
}

function rgbaCurrentElement() {
    if (!activeElementId) return null;
    return slides[activeSlideIndex].elements.find(item => item.id === activeElementId) || null;
}

function rgbaShapeElement() {
    const el = rgbaCurrentElement();
    return (el && el.type === 'shape') ? el : null;
}

function rgbaElementColor(el) {
    if (!el) return rgbaTargetDefaults();
    if (rgbaTarget === 'fill') return el.fillColor || el.color || rgbaTargetDefaults();
    if (rgbaTarget === 'stroke') {
        if (el.strokeSync === false && el.strokeColor) return el.strokeColor;
        return syncedStrokePreview(el.fillColor);
    }
    if (rgbaTarget === 'innershadow') {
        return (el.innerShadow && el.innerShadow.color) || rgbaTargetDefaults();
    }
    return el.color || rgbaTargetDefaults();
}

function toggleRgbaPicker(e, target) {
    if (e) e.stopPropagation();
    playAeroClickSound(750, 0.1);
    const popup = document.getElementById("rgba-picker-popup");
    if (!popup) return;
    ["shapes-popup", "snap-popup", "mkt-themes-popup", "fill-popup"].forEach(id => {
        const p = document.getElementById(id);
        if (p) p.classList.remove("show");
    });
    // Tapping the active target's button again closes the panel!
    if (popup.classList.contains("show") && rgbaTarget === target) {
        closeRgbaPicker();
        return;
    }
    rgbaTarget = target;
    rgbaSavedThisOpen = false;
    lastHsv = null;
    const parsed = parseColorComponents(rgbaElementColor(rgbaCurrentElement()));
    rgbaState = parsed || parseColorComponents(rgbaTargetDefaults());
    const titles = { text: 'TEXT COLOR', fill: 'FILL COLOR', stroke: 'STROKE COLOR', innershadow: 'INNER SHADOW' };
    document.getElementById("rgba-picker-title").innerText = titles[target] || 'TEXT COLOR';
    refreshRgbaUI(false);
    popup.classList.add("show");
}

function closeRgbaPicker() {
    const popup = document.getElementById("rgba-picker-popup");
    if (popup && popup.classList.contains("show")) {
        popup.classList.remove("show");
        renderThumbnails();
    }
}

function refreshRgbaUI(skipTag) {
    const s = rgbaState;
    const $ = (id) => document.getElementById(id);
    if (pickerMode === 'hsva') {
        const hsv = lastHsv || rgbToHsv(s.r, s.g, s.b);
        const aPct = Math.round(s.a * 100);
        // Relabel channels + ranges for HSV!
        const c0 = $("rgba-c0"), c1 = $("rgba-c1"), c2 = $("rgba-c2");
        c0.innerText = "H"; c0.className = "rgba-chan rgba-h";
        c1.innerText = "S"; c1.className = "rgba-chan rgba-s";
        c2.innerText = "V"; c2.className = "rgba-chan rgba-v";
        const rS = $("rgba-r"), gS = $("rgba-g"), bS = $("rgba-b");
        rS.max = 360; gS.max = 100; bS.max = 100;
        rS.value = hsv.h; gS.value = hsv.s; bS.value = hsv.v;
        $("rgba-a").value = aPct;
        $("rgba-r-val").innerText = hsv.h + "°";
        $("rgba-g-val").innerText = hsv.s + "%";
        $("rgba-b-val").innerText = hsv.v + "%";
        $("rgba-a-val").innerText = aPct;
        // Hue rainbow ramp, then saturation / value ramps for THIS hue!
        const at = (h2, s2, v2) => {
            const c = hsvToRgb(h2, s2, v2);
            return `rgb(${c.r}, ${c.g}, ${c.b})`;
        };
        rS.style.background = "linear-gradient(90deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))";
        gS.style.background = `linear-gradient(90deg, ${at(hsv.h, 0, hsv.v)}, ${at(hsv.h, 100, hsv.v)})`;
        bS.style.background = `linear-gradient(90deg, ${at(hsv.h, hsv.s, 0)}, ${at(hsv.h, hsv.s, 100)})`;
        $("rgba-a").style.background =
            `linear-gradient(90deg, rgba(${s.r}, ${s.g}, ${s.b}, 0), rgba(${s.r}, ${s.g}, ${s.b}, 1)), ` +
            `conic-gradient(#d4d4d4 25%, #ffffff 0 50%, #d4d4d4 0 75%, #ffffff 0) 0 0 / 14px 14px`;
        $("rgba-preview").style.background = rgbaString(s);
        if (!skipTag) {
            const tag = $("rgba-tag-input");
            // Tag mirrors the exact slider values (no rounding drift)!
            if (document.activeElement !== tag) tag.value = `hsva(${hsv.h}, ${hsv.s}%, ${hsv.v}%, ${Math.round(s.a * 100) / 100})`;
        }
    } else {
        const c0 = $("rgba-c0"), c1 = $("rgba-c1"), c2 = $("rgba-c2");
        c0.innerText = "R"; c0.className = "rgba-chan rgba-r";
        c1.innerText = "G"; c1.className = "rgba-chan rgba-g";
        c2.innerText = "B"; c2.className = "rgba-chan rgba-b";
        const rS = $("rgba-r"), gS = $("rgba-g"), bS = $("rgba-b");
        rS.max = 255; gS.max = 255; bS.max = 255;
        rS.value = s.r; gS.value = s.g; bS.value = s.b;
        $("rgba-a").value = Math.round(s.a * 100);
        $("rgba-r-val").innerText = s.r;
        $("rgba-g-val").innerText = s.g;
        $("rgba-b-val").innerText = s.b;
        $("rgba-a-val").innerText = Math.round(s.a * 100);
        // Live channel ramps: each track shows its own 0→max gradient!
        rS.style.background = `linear-gradient(90deg, rgba(0, ${s.g}, ${s.b}, 1), rgba(255, ${s.g}, ${s.b}, 1))`;
        gS.style.background = `linear-gradient(90deg, rgba(${s.r}, 0, ${s.b}, 1), rgba(${s.r}, 255, ${s.b}, 1))`;
        bS.style.background = `linear-gradient(90deg, rgba(${s.r}, ${s.g}, 0, 1), rgba(${s.r}, ${s.g}, 255, 1))`;
        $("rgba-a").style.background =
            `linear-gradient(90deg, rgba(${s.r}, ${s.g}, ${s.b}, 0), rgba(${s.r}, ${s.g}, ${s.b}, 1)), ` +
            `conic-gradient(#d4d4d4 25%, #ffffff 0 50%, #d4d4d4 0 75%, #ffffff 0) 0 0 / 14px 14px`;
        $("rgba-preview").style.background = rgbaString(s);
        if (!skipTag) {
            const tag = $("rgba-tag-input");
            if (document.activeElement !== tag) tag.value = rgbaString(s);
        }
    }
    updatePickerDots();
}

function applyRgbaState() {
    const el = rgbaCurrentElement();
    if (!el) return;
    // One undo step per picker visit — slider drags stay fluid!
    if (!rgbaSavedThisOpen) {
        saveState();
        rgbaSavedThisOpen = true;
    }
    const css = rgbaString(rgbaState);
    if (rgbaTarget === 'fill') el.fillColor = css;
    else if (rgbaTarget === 'stroke') {
        // Hand-picking a stroke breaks Sync (no visual jump — same color)!
        el.strokeSync = false;
        el.strokeColor = css;
    }
    else if (rgbaTarget === 'innershadow') {
        // Hand-picking a shadow color wakes the shadow up!
        if (!el.innerShadow) el.innerShadow = defaultInnerShadow();
        el.innerShadow.color = css;
        el.innerShadow.enabled = true;
        refreshFillPanel();
    }
    else el.color = css;
    renderActiveSlide();
    updatePickerDots();
}

function onRgbaSliderInput() {
    const aPct = parseInt(document.getElementById("rgba-a").value, 10);
    if (pickerMode === 'hsva') {
        const h = parseInt(document.getElementById("rgba-r").value, 10);
        const sv = parseInt(document.getElementById("rgba-g").value, 10);
        const vv = parseInt(document.getElementById("rgba-b").value, 10);
        lastHsv = { h, s: sv, v: vv };
        const rgb = hsvToRgb(h, sv, vv);
        rgbaState = { r: rgb.r, g: rgb.g, b: rgb.b, a: Math.round(aPct) / 100 };
    } else {
        rgbaState = {
            r: parseInt(document.getElementById("rgba-r").value, 10),
            g: parseInt(document.getElementById("rgba-g").value, 10),
            b: parseInt(document.getElementById("rgba-b").value, 10),
            a: Math.round(aPct) / 100
        };
    }
    applyRgbaState();
    refreshRgbaUI(false);
}

function onRgbaTagInput() {
    const tag = document.getElementById("rgba-tag-input");
    const parsed = parseColorComponents(tag.value);
    if (!parsed) return;
    // Keep the user's typed text intact while they type — just drive sliders!
    rgbaState = parsed;
    lastHsv = null;
    applyRgbaState();
    refreshRgbaUI(true);
}

function updatePickerDots() {
    const textDot = document.getElementById("text-color-dot");
    const el = rgbaCurrentElement();
    if (textDot) textDot.style.background = (el && el.color) || '#ffffff';
    refreshFillDots();
}

function refreshFillDots() {
    const el = rgbaCurrentElement();
    const fill = (el && (el.fillColor || el.color)) || '#38bdf8';
    const sync = !el || el.strokeSync !== false;
    const stroke = sync ? syncedStrokePreview(el && el.fillColor) : ((el && el.strokeColor) || syncedStrokePreview(el && el.fillColor));
    ["fill-btn-dot", "fill-dot"].forEach(id => {
        const d = document.getElementById(id);
        if (d) d.style.background = fill;
    });
    const sDot = document.getElementById("stroke-dot");
    if (sDot) sDot.style.background = stroke;
    const iDot2 = document.getElementById("inner-dot");
    if (iDot2) iDot2.style.background = (el && el.innerShadow && el.innerShadow.color) || 'rgba(0, 0, 0, 0.45)';
}

/* ========================================================
   FILL & STROKE DROPDOWN PANEL
   ======================================================== */
let fillSavedThisOpen = false;

function toggleFillPopup(e) {
    if (e) e.stopPropagation();
    playAeroClickSound(750, 0.1);
    const popup = document.getElementById("fill-popup");
    if (!popup) return;
    ["shapes-popup", "snap-popup", "mkt-themes-popup"].forEach(id => {
        const p = document.getElementById(id);
        if (p) p.classList.remove("show");
    });
    closeRgbaPicker();
    if (popup.classList.contains("show")) {
        popup.classList.remove("show");
        renderThumbnails();
        return;
    }
    fillSavedThisOpen = false;
    refreshFillPanel();
    popup.classList.add("show");
}

function closeFillPopup() {
    const popup = document.getElementById("fill-popup");
    if (popup && popup.classList.contains("show")) {
        popup.classList.remove("show");
        renderThumbnails();
    }
}

function refreshFillPanel() {
    const popup = document.getElementById("fill-popup");
    if (!popup) return;
    const el = rgbaShapeElement();
    popup.classList.toggle("no-shape", !el);
    const fill = (el && (el.fillColor || el.color)) || '#38bdf8';
    const sync = !el || el.strokeSync !== false;
    const stroke = sync ? syncedStrokePreview(el && el.fillColor) : ((el && el.strokeColor) || syncedStrokePreview(el && el.fillColor));
    const width = (el && el.strokeWidth !== undefined && el.strokeWidth !== null) ? el.strokeWidth : 2;
    const fillDot = document.getElementById("fill-dot");
    if (fillDot) fillDot.style.background = fill;
    const strokeDot = document.getElementById("stroke-dot");
    if (strokeDot) strokeDot.style.background = stroke;
    const syncBox = document.getElementById("stroke-sync-box");
    if (syncBox) syncBox.checked = sync;
    const strokeRow = document.getElementById("stroke-row");
    if (strokeRow) strokeRow.classList.toggle("synced", sync);
    const wSlider = document.getElementById("stroke-width");
    if (wSlider) wSlider.value = width;
    const wVal = document.getElementById("stroke-width-val");
    if (wVal) wVal.innerText = width;
    const blur = (el && el.bgBlur) || 0;
    const bSlider = document.getElementById("bg-blur");
    if (bSlider) bSlider.value = blur;
    const bVal = document.getElementById("bg-blur-val");
    if (bVal) bVal.innerText = blur;
    const inner = (el && el.innerShadow) || defaultInnerShadow();
    const iBox = document.getElementById("inner-shadow-box");
    if (iBox) iBox.checked = inner.enabled === true;
    const iOpts = document.getElementById("inner-shadow-opts");
    if (iOpts) iOpts.hidden = inner.enabled !== true;
    const iBlur = document.getElementById("inner-blur");
    if (iBlur) iBlur.value = inner.blur;
    const iBlurVal = document.getElementById("inner-blur-val");
    if (iBlurVal) iBlurVal.innerText = inner.blur;
    const iDot = document.getElementById("inner-dot");
    if (iDot) iDot.style.background = inner.color;
    const iDx = document.getElementById("inner-dx");
    if (iDx) iDx.value = inner.dx;
    const iDxVal = document.getElementById("inner-dx-val");
    if (iDxVal) iDxVal.innerText = inner.dx;
    const iDy = document.getElementById("inner-dy");
    if (iDy) iDy.value = inner.dy;
    const iDyVal = document.getElementById("inner-dy-val");
    if (iDyVal) iDyVal.innerText = inner.dy;
    refreshFillDots();
}

function openFillPicker(e, target) {
    if (e) e.stopPropagation();
    const el = rgbaShapeElement();
    if (!el) return;
    if (target === 'stroke' && el.strokeSync !== false) {
        // Slick: picking a stroke auto-breaks Sync with zero visual jump!
        saveState();
        fillSavedThisOpen = true;
        el.strokeSync = false;
        el.strokeColor = syncedStrokePreview(el.fillColor);
        renderActiveSlide();
        refreshFillPanel();
    }
    const popup = document.getElementById("fill-popup");
    if (popup) popup.classList.remove("show");
    toggleRgbaPicker(null, target);
}

function toggleStrokeSync(checked) {
    const el = rgbaShapeElement();
    if (!el) return;
    saveState();
    fillSavedThisOpen = true;
    el.strokeSync = checked;
    if (!checked && !el.strokeColor) el.strokeColor = syncedStrokePreview(el.fillColor);
    playAeroClickSound(checked ? 650 : 450, 0.08);
    renderActiveSlide();
    refreshFillPanel();
}

function onStrokeWidthInput() {
    const el = rgbaShapeElement();
    if (!el) return;
    if (!fillSavedThisOpen) {
        saveState();
        fillSavedThisOpen = true;
    }
    el.strokeWidth = parseInt(document.getElementById("stroke-width").value, 10);
    document.getElementById("stroke-width-val").innerText = el.strokeWidth;
    renderActiveSlide();
}

function onBgBlurInput() {
    const el = rgbaShapeElement();
    if (!el) return;
    if (!fillSavedThisOpen) {
        saveState();
        fillSavedThisOpen = true;
    }
    el.bgBlur = parseInt(document.getElementById("bg-blur").value, 10);
    document.getElementById("bg-blur-val").innerText = el.bgBlur;
    renderActiveSlide();
}

function ensureInnerShadow(el) {
    if (!el.innerShadow) el.innerShadow = defaultInnerShadow();
    return el.innerShadow;
}

function toggleInnerShadow(checked) {
    const el = rgbaShapeElement();
    if (!el) return;
    saveState();
    fillSavedThisOpen = true;
    ensureInnerShadow(el).enabled = checked;
    playAeroClickSound(checked ? 650 : 450, 0.08);
    renderActiveSlide();
    refreshFillPanel();
}

function onInnerBlurInput() {
    const el = rgbaShapeElement();
    if (!el) return;
    if (!fillSavedThisOpen) {
        saveState();
        fillSavedThisOpen = true;
    }
    ensureInnerShadow(el).blur = parseInt(document.getElementById("inner-blur").value, 10);
    document.getElementById("inner-blur-val").innerText = ensureInnerShadow(el).blur;
    renderActiveSlide();
}

function onInnerOffsetInput() {
    const el = rgbaShapeElement();
    if (!el) return;
    if (!fillSavedThisOpen) {
        saveState();
        fillSavedThisOpen = true;
    }
    const s = ensureInnerShadow(el);
    s.dx = parseInt(document.getElementById("inner-dx").value, 10);
    s.dy = parseInt(document.getElementById("inner-dy").value, 10);
    document.getElementById("inner-dx-val").innerText = s.dx;
    document.getElementById("inner-dy-val").innerText = s.dy;
    renderActiveSlide();
}

function initRgbaPicker() {
    document.getElementById("rgba-mode-rgba").classList.toggle("active", pickerMode === 'rgba');
    document.getElementById("rgba-mode-hsva").classList.toggle("active", pickerMode === 'hsva');
    ["rgba-r", "rgba-g", "rgba-b", "rgba-a"].forEach(id => {
        const slider = document.getElementById(id);
        if (slider) slider.addEventListener("input", onRgbaSliderInput);
    });
    const tag = document.getElementById("rgba-tag-input");
    if (tag) {
        tag.addEventListener("input", onRgbaTagInput);
        // Click-to-copy: select the whole tag for one-gesture copying!
        tag.addEventListener("focus", () => {
            try { tag.select(); } catch (e) {}
        });
        tag.addEventListener("keydown", (e) => {
            if (e.key === "Enter") tag.blur();
            e.stopPropagation();
        });
    }
    // Outside clicks close the panel (inside clicks keep sampling colors!)!
    document.addEventListener("click", (e) => {
        const popup = document.getElementById("rgba-picker-popup");
        if (!popup || !popup.classList.contains("show")) return;
        if (e.target.closest("#rgba-picker-popup")) return;
        if (e.target.closest("#text-color-btn")) return;
        closeRgbaPicker();
    });
    const wSlider = document.getElementById("stroke-width");
    if (wSlider) wSlider.addEventListener("input", onStrokeWidthInput);
    const bSlider = document.getElementById("bg-blur");
    if (bSlider) bSlider.addEventListener("input", onBgBlurInput);
    ["inner-blur"].forEach(id => {
        const s = document.getElementById(id);
        if (s) s.addEventListener("input", onInnerBlurInput);
    });
    ["inner-dx", "inner-dy"].forEach(id => {
        const s = document.getElementById(id);
        if (s) s.addEventListener("input", onInnerOffsetInput);
    });
    // Outside clicks close the Fill panel (inside clicks keep tweaking!)!
    document.addEventListener("click", (e) => {
        const popup = document.getElementById("fill-popup");
        if (!popup || !popup.classList.contains("show")) return;
        if (e.target.closest("#fill-popup")) return;
        if (e.target.closest("#fill-btn")) return;
        closeFillPopup();
    });
}

function changeBackground(gradientStr) {
    saveState();
    playAeroClickSound(650, 0.08);
    slides[activeSlideIndex].background = gradientStr;
    renderThumbnails();
    renderActiveSlide();
}

function toggleSidebar() {
    playAeroClickSound(450, 0.1);
    document.getElementById("sidebar").classList.toggle("collapsed");
}

function startPresentation() {
    playAeroClickSound(850, 0.12);
    document.getElementById("presentation-overlay").style.display = "flex";
    renderPresentationSlide();
}

function exitPresentation() {
    playAeroClickSound(450, 0.08);
    document.getElementById("presentation-overlay").style.display = "none";
}

function renderPresentationSlide() {
    const stage = document.getElementById("presentation-canvas");
    const currentSlide = slides[activeSlideIndex];
    stage.style.background = currentSlide.background;
    stage.innerHTML = "";

    currentSlide.elements.forEach(el => {
        const div = document.createElement("div");
        div.className = `slide-element`;
        div.style.top = el.top + "px";
        div.style.left = el.left + "px";
        if (el.width) div.style.width = el.width + "px";
        if (el.height) div.style.height = el.height + "px";
        div.style.zIndex = el.zIndex || 1;
        div.style.fontSize = el.fontSize || "18px";
        div.style.color = el.color || "#ffffff";
        div.style.border = "none";

        if (el.type === 'shape') {
            const svgContainer = document.createElement("div");
            svgContainer.className = "slide-svg-container";
            if (el.shapeType === 'chip') {
                svgContainer.classList.add("chip-glass");
                const chipR = cornerRadiiFor(el);
                svgContainer.style.borderRadius = chipR.rx + '% / ' + chipR.ry + '%';
            }
            const pStroke = computeStrokeFor(el);
            svgContainer.innerHTML = getSvgShapeMarkup(el.shapeType, el.fillColor || "#38bdf8", pStroke.css, pStroke.width, cornerRadiiFor(el), computeInnerFor(el));
            applyBgBlur(svgContainer, el);
            div.appendChild(svgContainer);
        }

        div.innerHTML += `<span class="slide-text-content">${el.content}</span>`;
        stage.appendChild(div);
    });

    document.getElementById("present-slide-counter").innerText = `Slide ${activeSlideIndex + 1} / ${slides.length}`;
}

function nextSlide() {
    playAeroClickSound(600, 0.06);
    if (activeSlideIndex < slides.length - 1) {
        activeSlideIndex++;
        renderPresentationSlide();
    }
}

function prevSlide() {
    playAeroClickSound(600, 0.06);
    if (activeSlideIndex > 0) {
        activeSlideIndex--;
        renderPresentationSlide();
    }
}

// Marketplace hooks — shared with amber marketplace engine!
window.Amber = window.Amber || {};
window.Amber.getSlides = () => slides;
window.Amber.getActiveSlideIndex = () => activeSlideIndex;
window.Amber.applyBackground = (bg) => changeBackground(bg);
window.Amber.insertSlide = (slide) => {
    saveState();
    const copy = JSON.parse(JSON.stringify(slide));
    copy.id = `slide-${Date.now()}`;
    copy.elements.forEach(el => { el.id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; });
    slides.splice(activeSlideIndex + 1, 0, copy);
    activeSlideIndex = activeSlideIndex + 1;
    activeElementId = null;
    editingElementId = null;
    renderThumbnails();
    renderActiveSlide();
};
window.Amber.addShapeType = (shapeType, def) => {
    if (typeof addShape === 'function') addShape(shapeType);
};
window.Amber.refresh = () => { renderThumbnails(); renderActiveSlide(); };