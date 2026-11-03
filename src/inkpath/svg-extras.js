/* =====================================================================
   Inkpath SVG extras: the parts of SVG that Inkpath didn't have yet!
     Stroke      line caps (butt/round/square), line joins (miter/round/bevel), miter limit,
                 dash patterns (dashed, dotted, dash-dot, long, or your own numbers) and the dash offset
     Markers     arrowheads and other line ends (arrow, open arrow, dot, square, diamond, bar) on lines and paths
     Fill        the fill rule (nonzero / even-odd), Pattern fills (20 patterns, from stripes to honeycomb),
                 gradient size and repeat (pad / reflect / repeat)
     Appearance  blend modes (multiply, screen, overlay...), paint order (stroke behind the fill), flip across and down
     Text        italic, underline, strike-through, letter spacing
     Structure   Group / Ungroup (a real <g>), Images (<image>, from a picture file), a name for each shape (<title>)
   Everything is saved with the drawing (.kv) and written out in the exported SVG and PNG.
   app.js calls inkpathExtras.apply() for every shape, applyGroup() for groups, and sync() after every redraw.
   ===================================================================== */
(function () {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const $ = (id) => document.getElementById(id);
    const make = (tag, attrs, text) => {
        const e = document.createElement(tag);
        if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
        if (text !== undefined) e.textContent = text;
        return e;
    };
    const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };

    /* ---------- drawing the extras onto a shape ---------- */
    const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
    const DASHES = [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted'], ['dashdot', 'Dash-dot'], ['long', 'Long dash'], ['custom', 'Custom…']];
    const MARKERS = [['none', 'None'], ['arrow', 'Arrow'], ['open', 'Open arrow'], ['dot', 'Dot'], ['square', 'Square'], ['diamond', 'Diamond'], ['bar', 'Bar']];
    const PATTERNS = [['stripes', 'Stripes'], ['pinstripes', 'Pinstripes'], ['dots', 'Dots'], ['staggered', 'Staggered dots'], ['grid', 'Grid'], ['plaid', 'Plaid'], ['checker', 'Checker'], ['tiles', 'Rounded tiles'], ['bricks', 'Bricks'], ['hexagons', 'Honeycomb'], ['diamonds', 'Diamonds'], ['triangles', 'Triangles'], ['hatch', 'Cross-hatch'], ['crosses', 'Plus signs'], ['stars', 'Sparkles'], ['rings', 'Rings'], ['dashes', 'Dashes'], ['zigzag', 'Zigzag'], ['chevrons', 'Chevrons'], ['waves', 'Waves']];

    function dashArray(obj) {
        const w = Math.max(0.5, num(obj.strokeWidth, 2));
        switch (obj.dashPreset) {
            case 'dashed': return (w * 3) + ' ' + (w * 2);
            case 'dotted': return '0.01 ' + (w * 2);
            case 'dashdot': return (w * 4) + ' ' + (w * 2) + ' ' + w + ' ' + (w * 2);
            case 'long': return (w * 8) + ' ' + (w * 3);
            case 'custom': { const n = String(obj.dashCustom || '').split(/[\s,]+/).map(parseFloat).filter((v) => isFinite(v) && v >= 0); return n.length && n.some((v) => v > 0) ? n.join(' ') : ''; }
            default: return '';
        }
    }
    function strokeColorOf(obj) {
        if ((obj.strokeType || 'color') === 'none') return '#ffffffff';
        if ((obj.strokeType === 'linear' || obj.strokeType === 'radial') && typeof getStrokeStops === 'function') { const s = getStrokeStops(obj); if (s && s[0]) return s[0].c; }
        return obj.stroke || '#ffffffff';
    }
    function markerEl(kind, color, id, size) {
        const m = svgEl('marker', { id: id, viewBox: '0 0 10 10', refX: kind === 'arrow' ? 8 : 5, refY: 5, markerWidth: size, markerHeight: size, orient: 'auto-start-reverse', markerUnits: 'strokeWidth', overflow: 'visible' });
        let s;
        if (kind === 'arrow') s = svgEl('path', { d: 'M0 0L10 5L0 10z', fill: color });
        else if (kind === 'open') s = svgEl('path', { d: 'M1 1L9 5L1 9', fill: 'none', stroke: color, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        else if (kind === 'dot') s = svgEl('circle', { cx: 5, cy: 5, r: 4, fill: color });
        else if (kind === 'square') s = svgEl('rect', { x: 1, y: 1, width: 8, height: 8, fill: color });
        else if (kind === 'diamond') s = svgEl('path', { d: 'M5 0L10 5L5 10L0 5z', fill: color });
        else s = svgEl('rect', { x: 4, y: 0, width: 2, height: 10, fill: color });
        m.appendChild(s);
        return m;
    }
    function patternEl(obj, id, over) {
        const size = Math.max(3, num(obj.patternSize, 12)), ang = num(obj.patternAngle, 0);
        const c1 = (over && over.c1) || obj.fill || '#a305ffff', c2 = (over && over.c2 !== undefined) ? over.c2 : (obj.patternBg || obj.fill2 || '#ffffff00');
        const k = obj.patternKind || 'stripes';
        const s = size, h = size / 2, q = size / 4;
        // (most tiles are square; the honeycomb needs a tile as wide as one hexagon and as tall as three of its sides)
        const hex = k === 'hexagons', A = h, W = hex ? Math.sqrt(3) * A : s, H = hex ? 3 * A : s;
        const p = svgEl('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: W, height: H, patternTransform: 'rotate(' + ang + ')' });
        p.appendChild(svgEl('rect', { width: W, height: H, fill: c2 }));
        const add = (tag, attrs) => p.appendChild(svgEl(tag, attrs));
        const line = (d, w, extra) => add('path', Object.assign({ d: d, stroke: c1, 'stroke-width': Math.max(0.6, w), fill: 'none' }, extra || {}));
        const f = (v) => Math.round(v * 100) / 100;
        const t = Math.max(1, s * 0.14);
        if (k === 'stripes') add('rect', { width: h, height: s, fill: c1 });
        else if (k === 'pinstripes') { const w = Math.max(1, s * 0.07); add('rect', { width: w, height: s, fill: c1 }); add('rect', { x: h, width: w, height: s, fill: c1 }); }
        else if (k === 'dots') add('circle', { cx: h, cy: h, r: s * 0.22, fill: c1 });
        else if (k === 'staggered') { add('circle', { cx: q, cy: q, r: s * 0.15, fill: c1 }); add('circle', { cx: 3 * q, cy: 3 * q, r: s * 0.15, fill: c1 }); }
        else if (k === 'grid') { add('rect', { width: s, height: Math.max(1, s * 0.14), fill: c1 }); add('rect', { width: Math.max(1, s * 0.14), height: s, fill: c1 }); }
        else if (k === 'plaid') { add('rect', { width: s * 0.4, height: s, fill: c1, opacity: 0.55 }); add('rect', { width: s, height: s * 0.4, fill: c1, opacity: 0.55 }); }
        else if (k === 'checker') { add('rect', { width: h, height: h, fill: c1 }); add('rect', { x: h, y: h, width: h, height: h, fill: c1 }); }
        else if (k === 'tiles') add('rect', { x: s * 0.1, y: s * 0.1, width: s * 0.8, height: s * 0.8, rx: s * 0.2, fill: c1 });
        else if (k === 'bricks') { const w = Math.max(1, s * 0.1); line('M0 0H' + s + 'M0 ' + h + 'H' + s, w); line('M0 0V' + h + 'M' + h + ' ' + h + 'V' + s, w); }
        else if (k === 'hexagons') {
            const hexAt = (cx, cy) => [[cx, cy - A], [cx + W / 2, cy - A / 2], [cx + W / 2, cy + A / 2], [cx, cy + A], [cx - W / 2, cy + A / 2], [cx - W / 2, cy - A / 2]];
            [[W / 2, A], [0, 2.5 * A], [W, 2.5 * A], [0, -0.5 * A], [W, -0.5 * A]].forEach(([cx, cy]) => line('M' + hexAt(cx, cy).map((v) => f(v[0]) + ' ' + f(v[1])).join('L') + 'Z', Math.max(1, s * 0.09), { 'stroke-linejoin': 'round' }));
        }
        else if (k === 'diamonds') add('path', { d: 'M' + h + ' ' + f(s * 0.1) + 'L' + f(s * 0.9) + ' ' + h + 'L' + h + ' ' + f(s * 0.9) + 'L' + f(s * 0.1) + ' ' + h + 'Z', fill: c1 });
        else if (k === 'triangles') add('path', { d: 'M0 ' + s + 'L' + h + ' 0L' + s + ' ' + s + 'Z', fill: c1 });
        else if (k === 'hatch') {
            const w = Math.max(1, s * 0.12);
            ['M0 ' + s + 'L' + s + ' 0', 'M-1 1L1 -1', 'M' + (s - 1) + ' ' + (s + 1) + 'L' + (s + 1) + ' ' + (s - 1), 'M0 0L' + s + ' ' + s, 'M-1 ' + (s - 1) + 'L1 ' + (s + 1), 'M' + (s - 1) + ' -1L' + (s + 1) + ' 1'].forEach((d) => line(d, w));
        }
        else if (k === 'crosses') { const w = Math.max(1, s * 0.14); add('rect', { x: h - w / 2, y: s * 0.22, width: w, height: s * 0.56, fill: c1 }); add('rect', { x: s * 0.22, y: h - w / 2, width: s * 0.56, height: w, fill: c1 }); }
        else if (k === 'stars') { const a = s * 0.1; add('path', { d: 'M' + h + ' ' + f(s * 0.12) + 'L' + f(h + a) + ' ' + f(h - a) + 'L' + f(s * 0.88) + ' ' + h + 'L' + f(h + a) + ' ' + f(h + a) + 'L' + h + ' ' + f(s * 0.88) + 'L' + f(h - a) + ' ' + f(h + a) + 'L' + f(s * 0.12) + ' ' + h + 'L' + f(h - a) + ' ' + f(h - a) + 'Z', fill: c1 }); }
        else if (k === 'rings') { add('circle', { cx: h, cy: h, r: s * 0.36, fill: 'none', stroke: c1, 'stroke-width': Math.max(1, s * 0.09) }); add('circle', { cx: h, cy: h, r: s * 0.1, fill: c1 }); }
        else if (k === 'dashes') { add('rect', { x: 0, y: s * 0.18, width: h, height: Math.max(1, s * 0.13), rx: s * 0.06, fill: c1 }); add('rect', { x: h, y: s * 0.68, width: h, height: Math.max(1, s * 0.13), rx: s * 0.06, fill: c1 }); }
        else if (k === 'zigzag') line('M0 ' + f(s * 0.7) + 'L' + h + ' ' + f(s * 0.25) + 'L' + s + ' ' + f(s * 0.7), t, { 'stroke-linejoin': 'miter' });
        else if (k === 'chevrons') { const w = Math.max(1, s * 0.1); line('M0 ' + f(s * 0.1) + 'L' + h + ' ' + f(s * 0.4) + 'L' + s + ' ' + f(s * 0.1), w); line('M0 ' + f(s * 0.6) + 'L' + h + ' ' + f(s * 0.9) + 'L' + s + ' ' + f(s * 0.6), w); }
        else line('M0 ' + h + 'Q' + q + ' 0 ' + h + ' ' + h + 'T' + s + ' ' + h, Math.max(1, s * 0.13));
        return p;
    }
    // a gradient for a pattern's lines or background (linear, with an angle, or radial): color 1, any steps between, color 2
    function gradientFor(kind, id, a, b, angle, mids) {
        const g = svgEl(kind === 'radial' ? 'radialGradient' : 'linearGradient', { id: id });
        if (kind !== 'radial' && typeof applyGradientAngle === 'function') applyGradientAngle(g, angle || 0, 1);
        [[0, a]].concat(cleanSteps(mids).map((m) => [m.o, m.c]), [[1, b]]).forEach(([o, c]) => { const st = stopStyle(c, '#000000ff'); g.appendChild(svgEl('stop', { offset: o, 'stop-color': st.color, 'stop-opacity': st.opacity })); });
        return g;
    }
    // the steps between a pattern gradient's two colors: [{ o: 0..1, c: '#rrggbbaa' }], sorted, bad ones dropped
    function cleanSteps(list) {
        return (Array.isArray(list) ? list : []).filter((m) => m && isFinite(m.o) && typeof m.c === 'string').map((m) => ({ o: Math.min(0.99, Math.max(0.01, +m.o)), c: m.c })).sort((x, y) => x.o - y.o);
    }
    // A pattern whose lines and/or background fade from one color to another across the WHOLE shape.
    // (A gradient inside an ordinary pattern would start over in every tile, so the pattern is ONE tile the size of the shape:
    // the background is a gradient rectangle, and the lines are the small pattern used as a mask over a gradient rectangle.)
    function layeredPattern(obj, id) {
        const fgG = obj.patternFgGrad, bgG = obj.patternBgGrad;
        if (!fgG && !bgG) return false;
        const bb = shapeBBox(obj);
        if (!(bb.w > 0 && bb.h > 0)) return false;
        const c1 = obj.fill || '#a305ffff', c1b = obj.patternFg2 || '#38bdf8ff';
        const c2 = obj.patternBg || obj.fill2 || '#ffffff00', c2b = obj.patternBg2 || '#bae6fdff';
        const W = bb.w, H = bb.h;
        const outer = svgEl('pattern', { id: id, patternUnits: 'userSpaceOnUse', x: bb.x, y: bb.y, width: W, height: H });
        if (bgG) { defs.appendChild(gradientFor(bgG, id + '-bg', c2, c2b, obj.patternBgAngle, obj.patternBgStops)); outer.appendChild(svgEl('rect', { width: W, height: H, fill: 'url(#' + id + '-bg)' })); }
        else outer.appendChild(svgEl('rect', { width: W, height: H, fill: c2 }));
        if (fgG) {
            defs.appendChild(patternEl(obj, id + '-in', { c1: '#ffffff', c2: '#00000000' }));
            const mk = svgEl('mask', { id: id + '-mk', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H });
            mk.appendChild(svgEl('rect', { width: W, height: H, fill: 'url(#' + id + '-in)' }));
            defs.appendChild(mk);
            defs.appendChild(gradientFor(fgG, id + '-fg', c1, c1b, obj.patternFgAngle, obj.patternFgStops));
            outer.appendChild(svgEl('rect', { width: W, height: H, fill: 'url(#' + id + '-fg)', mask: 'url(#' + id + '-mk)' }));
        } else {
            defs.appendChild(patternEl(obj, id + '-in', { c1: c1, c2: '#00000000' }));
            outer.appendChild(svgEl('rect', { width: W, height: H, fill: 'url(#' + id + '-in)' }));
        }
        defs.appendChild(outer);
        return true;
    }
    // called for every shape app.js draws (el: the SVG element, obj: its data, idp: an id that is unique to it)
    function apply(el, obj, idp) {
        if (!el || !obj) return;
        const t = obj.type, id = String(idp);
        if (t !== 'image') {
            const dash = dashArray(obj);
            const cap = obj.linecap || (obj.dashPreset === 'dotted' ? 'round' : '');
            if (cap && cap !== 'butt') el.setAttribute('stroke-linecap', cap);
            if (obj.linejoin && obj.linejoin !== 'miter') el.setAttribute('stroke-linejoin', obj.linejoin);
            if (obj.miterlimit && obj.miterlimit !== 4) el.setAttribute('stroke-miterlimit', obj.miterlimit);
            if (dash) el.setAttribute('stroke-dasharray', dash);
            if (dash && obj.dashOffset) el.setAttribute('stroke-dashoffset', obj.dashOffset);
            if (obj.fillRule === 'evenodd') { el.setAttribute('fill-rule', 'evenodd'); el.setAttribute('clip-rule', 'evenodd'); }
            if (obj.paintOrder === 'stroke') el.setAttribute('paint-order', 'stroke fill markers');
            // gradients: size and repeat
            if (obj.gradSpread && obj.gradSpread !== 'pad') { const g = document.getElementById('grad-' + id); if (g) g.setAttribute('spreadMethod', obj.gradSpread); }
            // line ends
            if ((t === 'line' || t === 'path') && ((obj.markerStart && obj.markerStart !== 'none') || (obj.markerEnd && obj.markerEnd !== 'none'))) {
                const col = strokeColorOf(obj), size = Math.max(1, num(obj.markerSize, 3));
                [['markerStart', 's', 'marker-start'], ['markerEnd', 'e', 'marker-end']].forEach(([prop, tag, attr]) => {
                    if (!obj[prop] || obj[prop] === 'none') return;
                    const mid = 'mk-' + id + '-' + tag;
                    defs.appendChild(markerEl(obj[prop], col, mid, size));
                    el.setAttribute(attr, 'url(#' + mid + ')');
                });
            }
            // pattern fill
            if (obj.fillType === 'pattern') {
                const pid = 'pat-' + id;
                if (!layeredPattern(obj, pid)) defs.appendChild(patternEl(obj, pid));
                el.setAttribute('fill', 'url(#' + pid + ')');
            }
            if (t === 'text') {
                if (obj.italic) el.setAttribute('font-style', 'italic');
                const deco = [obj.underline ? 'underline' : '', obj.strike ? 'line-through' : ''].filter(Boolean).join(' ');
                if (deco) el.setAttribute('text-decoration', deco);
                if (obj.letterSpacing) el.setAttribute('letter-spacing', obj.letterSpacing);
            }
        }
        common(el, obj);
    }
    // what every shape and group can have: blend mode, flips, a name
    function common(el, obj) {
        if (obj.blend && obj.blend !== 'normal') el.style.mixBlendMode = obj.blend;
        if (obj.flipX || obj.flipY) {
            const bb = shapeBBox(obj), c = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 }, sx = obj.flipX ? -1 : 1, sy = obj.flipY ? -1 : 1; // (the middle of what you see, text included)
            const flip = 'translate(' + c.x + ' ' + c.y + ') scale(' + sx + ' ' + sy + ') translate(' + (-c.x) + ' ' + (-c.y) + ')';
            el.setAttribute('transform', ((el.getAttribute('transform') || '') + ' ' + flip).trim());
        }
        if (obj.name) { const ti = document.createElementNS(NS, 'title'); ti.textContent = obj.name; el.insertBefore(ti, el.firstChild); }
    }
    function applyGroup(g, obj) { if (g && obj) common(g, obj); }

    /* ---------- changing the selection ---------- */
    const picked = () => (typeof selectedIndices !== 'undefined' ? selectedIndices : []).map((i) => objects[i]).filter(Boolean);
    const isBox = (o) => o && Array.isArray(o.children);
    function leaves(o, out) { out = out || []; if (isBox(o)) { o.children.forEach((c) => leaves(c, out)); if (o.clip) leaves(o.clip, out); if (o.mask) leaves(o.mask, out); } else out.push(o); return out; }
    // deep: a group passes style props down to everything inside it
    function setProp(prop, value, deep) {
        const list = picked();
        if (!list.length) return;
        pushHistory(false);
        list.forEach((o) => { (deep ? leaves(o) : [o]).forEach((x) => { if (value === undefined || value === '' || value === false) delete x[prop]; else x[prop] = value; }); });
        render();
    }
    const first = () => picked()[0];
    const getAll = (prop, deep) => { const v = picked().flatMap((o) => (deep ? leaves(o) : [o])).map((o) => o[prop]); return v.length ? v[0] : undefined; };

    /* ---------- the inspector controls ---------- */
    const ui = {};
    const group = (label, node, id) => { const g = make('div', { class: 'control-group', id: id || '' }); if (label) g.appendChild(make('label', null, label)); g.appendChild(node); return g; };
    function select(options, onchange) { const s = make('select'); options.forEach(([v, l]) => s.appendChild(make('option', { value: v }, l))); s.addEventListener('change', () => onchange(s.value)); return s; }
    function seg(options, onpick) {
        const box = make('div', { class: 'segmented-control mini-seg', role: 'group' });
        box.style.cssText = 'display:grid;grid-template-columns:repeat(' + options.length + ',1fr);';
        options.forEach(([v, l]) => { const b = make('button', { type: 'button', class: 'seg-btn', 'data-v': v }, l); b.addEventListener('click', () => onpick(v)); box.appendChild(b); });
        return box;
    }
    function range(min, max, step, oninput) { const r = make('input', { type: 'range', class: 'prop-slider', min: min, max: max, step: step }); r.style.cssText = 'width:100%;min-width:0;box-sizing:border-box;'; r.addEventListener('input', () => oninput(parseFloat(r.value))); return r; }
    function toggleBtn(label, title, onclick) { const b = make('button', { type: 'button', class: 'action-btn', title: title }, label); b.addEventListener('click', onclick); return b; }
    const markSeg = (box, val) => box.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-v') === val));

    function build() {
        const design = $('panel-design'), stroke = $('subpanel-stroke'), fill = $('subpanel-fill');
        if (!design || !stroke || !fill || ui.built) return;
        ui.built = true;

        /* Design tab: appearance, flips, name, text styling */
        design.appendChild(make('span', { class: 'section-label', id: 'lbl-extras' }, 'SVG Extras'));
        ui.blend = select(BLENDS.map((b) => [b, b.replace(/-/g, ' ')]), (v) => setProp('blend', v === 'normal' ? '' : v));
        design.appendChild(group('Blend Mode', ui.blend, 'grp-blend'));
        const flips = make('div', { class: 'layer-buttons' });
        ui.flipX = toggleBtn('⇆ Flip across', 'Mirror left to right', () => setProp('flipX', first() && first().flipX ? '' : true));
        ui.flipY = toggleBtn('⇅ Flip down', 'Mirror top to bottom', () => setProp('flipY', first() && first().flipY ? '' : true));
        flips.appendChild(ui.flipX); flips.appendChild(ui.flipY);
        design.appendChild(group('Flip', flips, 'grp-flip'));
        ui.name = make('input', { type: 'text', placeholder: 'Shown as the shape\'s SVG <title>' });
        ui.name.addEventListener('change', () => setProp('name', ui.name.value.trim()));
        design.appendChild(group('Name (title)', ui.name, 'grp-name'));
        // text
        const tx = make('div', { id: 'grp-extras-text' });
        tx.appendChild(make('span', { class: 'section-label' }, 'Text Style'));
        const tb = make('div', { class: 'layer-buttons' });
        ui.italic = toggleBtn('𝘐 Italic', 'Italic', () => setProp('italic', first() && first().italic ? '' : true));
        ui.underline = toggleBtn('U̲ Underline', 'Underline', () => setProp('underline', first() && first().underline ? '' : true));
        ui.strike = toggleBtn('S̶ Strike', 'Strike-through', () => setProp('strike', first() && first().strike ? '' : true));
        [ui.italic, ui.underline, ui.strike].forEach((b) => tb.appendChild(b));
        tx.appendChild(tb);
        ui.spacing = make('input', { type: 'number', step: '0.5', min: '-5', max: '40', value: '0' });
        ui.spacing.addEventListener('change', () => setProp('letterSpacing', num(ui.spacing.value, 0) || ''));
        tx.appendChild(group('Letter spacing (px)', ui.spacing));
        design.appendChild(tx); ui.textBox = tx;

        /* Stroke tab */
        const sx = make('div', { id: 'grp-extras-stroke' });
        sx.appendChild(make('span', { class: 'section-label' }, 'Stroke Style'));
        ui.cap = seg([['butt', 'Butt'], ['round', 'Round'], ['square', 'Square']], (v) => setProp('linecap', v === 'butt' ? '' : v, true));
        sx.appendChild(group('Line cap', ui.cap));
        ui.join = seg([['miter', 'Miter'], ['round', 'Round'], ['bevel', 'Bevel']], (v) => setProp('linejoin', v === 'miter' ? '' : v, true));
        sx.appendChild(group('Line join', ui.join));
        ui.miter = range(1, 20, 0.5, (v) => setProp('miterlimit', v === 4 ? '' : v, true));
        ui.miterLbl = make('label', null, 'Miter limit (4)');
        const mg = make('div', { class: 'control-group' }); mg.appendChild(ui.miterLbl); mg.appendChild(ui.miter); sx.appendChild(mg);
        ui.dash = select(DASHES, (v) => setProp('dashPreset', v === 'solid' ? '' : v, true));
        sx.appendChild(group('Dash pattern', ui.dash));
        ui.dashCustom = make('input', { type: 'text', placeholder: 'e.g. 12 4 2 4', spellcheck: 'false' });
        ui.dashCustom.addEventListener('change', () => setProp('dashCustom', ui.dashCustom.value.trim(), true));
        ui.dashCustomGrp = group('Custom dashes (dash gap …)', ui.dashCustom); sx.appendChild(ui.dashCustomGrp);
        ui.dashOff = range(0, 100, 1, (v) => setProp('dashOffset', v || '', true));
        ui.dashOffLbl = make('label', null, 'Dash offset (0)');
        ui.dashOffGrp = make('div', { class: 'control-group' }); ui.dashOffGrp.appendChild(ui.dashOffLbl); ui.dashOffGrp.appendChild(ui.dashOff); sx.appendChild(ui.dashOffGrp);
        ui.order = toggleBtn('Stroke behind fill', 'Paint the stroke first, so the fill sits on top of it (paint-order)', () => setProp('paintOrder', getAll('paintOrder', true) === 'stroke' ? '' : 'stroke', true));
        sx.appendChild(group('Paint order', ui.order));
        // markers
        const mk = make('div', { id: 'grp-extras-markers' });
        mk.appendChild(make('span', { class: 'section-label' }, 'Line Ends (Markers)'));
        ui.mStart = select(MARKERS, (v) => setProp('markerStart', v === 'none' ? '' : v));
        mk.appendChild(group('Start', ui.mStart));
        ui.mEnd = select(MARKERS, (v) => setProp('markerEnd', v === 'none' ? '' : v));
        mk.appendChild(group('End', ui.mEnd));
        ui.mSize = range(1, 8, 0.5, (v) => setProp('markerSize', v === 3 ? '' : v));
        ui.mSizeLbl = make('label', null, 'Marker size (3)');
        const msg = make('div', { class: 'control-group' }); msg.appendChild(ui.mSizeLbl); msg.appendChild(ui.mSize); mk.appendChild(msg);
        sx.appendChild(mk); ui.markerBox = mk;
        stroke.appendChild(sx);

        /* Fill tab */
        const fx = make('div', { id: 'grp-extras-fill' });
        fx.appendChild(make('span', { class: 'section-label' }, 'Fill Extras'));
        ui.rule = seg([['nonzero', 'Nonzero'], ['evenodd', 'Even-odd']], (v) => setProp('fillRule', v === 'nonzero' ? '' : v, true));
        fx.appendChild(group('Fill rule (overlapping paths)', ui.rule));
        // pattern fill controls
        const pt = make('div', { id: 'grp-extras-pattern' });
        ui.pKind = select(PATTERNS, (v) => setProp('patternKind', v, true));
        pt.appendChild(group('Pattern', ui.pKind));
        ui.pSize = range(4, 60, 1, (v) => setProp('patternSize', v, true));
        ui.pSizeLbl = make('label', null, 'Pattern size (12px)');
        const psg = make('div', { class: 'control-group' }); psg.appendChild(ui.pSizeLbl); psg.appendChild(ui.pSize); pt.appendChild(psg);
        ui.pAngle = range(0, 180, 1, (v) => setProp('patternAngle', v || '', true));
        ui.pAngleLbl = make('label', null, 'Pattern angle (0°)');
        const pag = make('div', { class: 'control-group' }); pag.appendChild(ui.pAngleLbl); pag.appendChild(ui.pAngle); pt.appendChild(pag);
        // The pattern's colors: the lines use Fill Color 1 (its button gets a gradient toggle, below), the background has its own button.
        // The toggle next to a color button cycles Full (one plain color) > Linear > Radial; a gradient shows a second color (and an angle).
        ui.fgToggle = gradToggle('fg');
        const fillSwatch = $('fill-swatch');
        if (fillSwatch && fillSwatch.parentNode) { const row = make('div', { class: 'pgrad-row' }); fillSwatch.parentNode.insertBefore(row, fillSwatch); row.appendChild(fillSwatch); row.appendChild(ui.fgToggle); }
        ui.fg2 = colorPicker('pfg2', 'patternFg2', 'Lines color 2 (the lines fade to this)', 'Pick the second color of the lines gradient');
        pt.appendChild(ui.fg2.group);
        ui.fgSteps = stepTrack('fg');
        pt.appendChild(ui.fgSteps.group);
        ui.fgAngle = range(0, 360, 1, (v) => setProp('patternFgAngle', v || '', true));
        ui.fgAngleLbl = make('label', null, 'Lines gradient angle (0°)');
        ui.fgAngleGrp = make('div', { class: 'control-group' }); ui.fgAngleGrp.appendChild(ui.fgAngleLbl); ui.fgAngleGrp.appendChild(ui.fgAngle); pt.appendChild(ui.fgAngleGrp);
        ui.bg = colorPicker('pbg', 'patternBg', 'Pattern background', 'Pick the pattern background color');
        ui.bgToggle = gradToggle('bg'); ui.bg.row.appendChild(ui.bgToggle);
        pt.appendChild(ui.bg.group);
        ui.bg2 = colorPicker('pbg2', 'patternBg2', 'Background color 2 (the background fades to this)', 'Pick the second color of the background gradient');
        pt.appendChild(ui.bg2.group);
        ui.bgSteps = stepTrack('bg');
        pt.appendChild(ui.bgSteps.group);
        ui.bgAngle = range(0, 360, 1, (v) => setProp('patternBgAngle', v || '', true));
        ui.bgAngleLbl = make('label', null, 'Background gradient angle (0°)');
        ui.bgAngleGrp = make('div', { class: 'control-group' }); ui.bgAngleGrp.appendChild(ui.bgAngleLbl); ui.bgAngleGrp.appendChild(ui.bgAngle); pt.appendChild(ui.bgAngleGrp);
        fx.appendChild(pt); ui.patternBox = pt;
        // gradient size and repeat
        const gd = make('div', { id: 'grp-extras-gradient' });
        ui.gSize = range(10, 100, 1, (v) => { const list = picked(); if (!list.length) return; pushHistory(false); list.forEach((o) => leaves(o).forEach((x) => { if (x.fillType === 'linear') { if (v >= 100) delete x.fillScale; else x.fillScale = v / 100; } else if (x.fillType === 'radial') { if (v >= 100) delete x.fillRadial; else x.fillRadial = { cx: 0.5, cy: 0.5, rx: v / 200, ry: v / 200 }; } })); render(); });
        ui.gSizeLbl = make('label', null, 'Gradient size (100%)');
        const gsg = make('div', { class: 'control-group' }); gsg.appendChild(ui.gSizeLbl); gsg.appendChild(ui.gSize); gd.appendChild(gsg);
        ui.spread = seg([['pad', 'Pad'], ['reflect', 'Reflect'], ['repeat', 'Repeat']], (v) => setProp('gradSpread', v === 'pad' ? '' : v, true));
        gd.appendChild(group('Gradient repeat (shrink the size to see it)', ui.spread));
        fx.appendChild(gd); ui.gradBox = gd;
        fill.appendChild(fx);
        // the Pattern button in the Fill Style row
        const row = document.querySelector('#grp-fill-type .fill-style-seg');
        if (row) {
            const b = make('button', { type: 'button', id: 'filltype-pattern', class: 'fill-seg-btn', 'data-tooltip': 'Pattern fill', 'aria-label': 'Pattern fill' });
            b.innerHTML = '<svg viewBox="0 0 16 16" width="26" height="26"><defs><pattern id="ft-pat" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="4" fill="currentColor"/></pattern></defs><rect x="2" y="2" width="12" height="12" rx="3" fill="url(#ft-pat)"/></svg>';
            b.addEventListener('click', () => { const list = picked(); if (!list.length) return; pushHistory(true); list.forEach((o) => leaves(o).forEach((x) => { x.fillType = 'pattern'; if (!x.patternKind) x.patternKind = 'stripes'; })); render(); });
            const none = $('filltype-none'); row.insertBefore(b, none || null); ui.patternBtn = b;
        }
    }

    // a color button that opens Inkpath's own color picker popup (H, S, V, A sliders, hex, Pick from canvas), the same as Fill Color
    function colorPicker(prefix, prop, label, hint) {
        const group = make('div', { class: 'control-group', style: 'position:relative;' });
        group.appendChild(make('label', null, label));
        const row = make('div', { class: 'pgrad-row' });
        const holder = make('div');
        holder.innerHTML =
            '<button type="button" id="' + prefix + '-swatch" class="color-swatch" title="' + hint + '">--</button>' +
            '<div id="' + prefix + '-popup" class="color-popup" style="display:none;">' +
            ['h|H|0|360|0|°', 's|S|0|100|0|%', 'v|V|0|100|100|%', 'a|A|0|100|100|%'].map((r) => { const [k, l, mn, mx, val, u] = r.split('|'); return '<div class="popup-row"><label>' + l + ' <span id="val-' + prefix + '-' + k + '">' + val + '</span>' + u + '</label><input type="range" id="insp-' + prefix + '-' + k + '" min="' + mn + '" max="' + mx + '" step="1" value="' + val + '"></div>'; }).join('') +
            '<div class="popup-preview-row"><span id="' + prefix + '-preview" class="popup-preview"></span><input id="' + prefix + '-hex" class="popup-hex-input" value="#ffffffff" spellcheck="false" autocomplete="off" maxlength="9"></div>' +
            '<button type="button" class="popup-pick-btn" id="' + prefix + '-pick">Pick from canvas</button></div>';
        const swatch = holder.firstElementChild;
        row.appendChild(swatch); group.appendChild(row);
        while (holder.firstChild) group.appendChild(holder.firstChild);
        swatch.addEventListener('click', (e) => toggleColorPopup(prefix + '-popup', e));
        ['h', 's', 'v', 'a'].forEach((k) => group.querySelector('#insp-' + prefix + '-' + k).addEventListener('input', () => colorChanged(prefix, prop)));
        group.querySelector('#' + prefix + '-hex').addEventListener('change', () => setColorFromHex(prefix, prop));
        group.querySelector('#' + prefix + '-pick').addEventListener('click', (e) => pickFromCanvas(prefix, prop, e));
        return { group: group, row: row, swatch: swatch };
    }
    function colorChanged(prefix, prop) {
        const c = updateColorFromHSVA(prefix, prop);
        if (c === null) return;
        picked().forEach((o) => deep(o, prop, c));
        render();
        const pop = $(prefix + '-popup'); if (pop) pop.style.display = 'flex';
    }
    // the gradient toggle next to a color button: an icon shows the current kind, a click goes to the next one
    const GRAD_NAMES = { '': 'Full (one plain color)', linear: 'Linear gradient', radial: 'Radial gradient' };
    const GRAD_NEXT = { '': 'linear', linear: 'radial', radial: '' };
    function gradIcon(mode, slot) {
        const head = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true">';
        if (mode === 'linear') return head + '<defs><linearGradient id="pgi-' + slot + '-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF60C5"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><rect x="2" y="2" width="12" height="12" rx="3" fill="url(#pgi-' + slot + '-l)"/></svg>';
        if (mode === 'radial') return head + '<defs><radialGradient id="pgi-' + slot + '-r"><stop offset="0" stop-color="#FF60C5"/><stop offset="1" stop-color="#38bdf8"/></radialGradient></defs><circle cx="8" cy="8" r="6" fill="url(#pgi-' + slot + '-r)"/></svg>';
        return head + '<rect x="2" y="2" width="12" height="12" rx="3" fill="currentColor"/></svg>';
    }
    // Gradient steps: a bar showing the gradient, a marker for each step between color 1 and color 2
    // (drag to move it, click the bar to add one there), + Step / - Step, and a color picker for the selected step
    const STEP_KEY = { fg: 'patternFgStops', bg: 'patternBgStops' };
    function stepTrack(slot) {
        const key = STEP_KEY[slot], what = slot === 'fg' ? 'Lines' : 'Background';
        if (!ui.stepSel) ui.stepSel = { fg: -1, bg: -1 };
        const grp = make('div', { class: 'control-group pstep-group' });
        grp.appendChild(make('label', null, what + ' gradient steps'));
        const track = make('div', { class: 'pstep-track', title: 'Click the bar to add a step there; drag a step to move it', role: 'group', 'aria-label': what + ' gradient steps' });
        track.style.cssText = 'position:relative;height:22px;border-radius:8px;border:1px solid rgba(0,0,0,.35);margin:4px 8px 6px;cursor:copy;box-shadow:inset 0 1px 2px rgba(0,0,0,.25);';
        grp.appendChild(track);
        const btns = make('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;' });
        const add = make('button', { type: 'button', class: 'action-btn pstep-add', title: 'Add a step in the widest gap' }, '+ Step');
        const del = make('button', { type: 'button', class: 'action-btn pstep-del', title: 'Remove the selected step' }, '− Step');
        [add, del].forEach((b) => { b.style.cssText = 'flex:1;min-width:0;padding:4px 8px;'; btns.appendChild(b); });
        grp.appendChild(btns);
        const pick = colorPicker(slot === 'fg' ? 'pfgs' : 'pbgs', slot === 'fg' ? 'patternFgStep' : 'patternBgStep', 'Selected step color', 'Pick the selected step\'s color');
        grp.appendChild(pick.group);
        const ends = () => { const f = leaves(first())[0] || {}; return slot === 'fg' ? [f.fill || '#a305ffff', f.patternFg2 || '#38bdf8ff'] : [f.patternBg || f.fill2 || '#ffffff00', f.patternBg2 || '#bae6fdff']; };
        const colorAt = (t) => {
            const f = leaves(first())[0] || {}, e = ends();
            const all = [{ o: 0, c: e[0] }].concat(cleanSteps(f[key]), [{ o: 1, c: e[1] }]);
            return typeof sampleGradientAt === 'function' ? sampleGradientAt(all, t) : e[0];
        };
        const change = (fn, history) => { const list = picked(); if (!list.length) return; if (history !== false) pushHistory(false); list.forEach((o) => leaves(o).forEach((x) => { x[key] = Array.isArray(x[key]) ? x[key] : []; fn(x[key]); if (!x[key].length) delete x[key]; })); render(); };
        const addAt = (t) => {
            const c = colorAt(t);
            change((st) => st.push({ o: t, c: c }));
            const f = leaves(first())[0] || {};
            ui.stepSel[slot] = (f[key] || []).length - 1;
            render();
        };
        add.addEventListener('click', () => {
            const f = leaves(first())[0] || {};
            const pts = [0].concat(cleanSteps(f[key]).map((m) => m.o), [1]);
            let best = 0.5, gap = -1;
            for (let i = 1; i < pts.length; i++) if (pts[i] - pts[i - 1] > gap) { gap = pts[i] - pts[i - 1]; best = (pts[i] + pts[i - 1]) / 2; }
            addAt(Math.round(best * 1000) / 1000);
        });
        del.addEventListener('click', () => {
            const i = ui.stepSel[slot];
            if (i < 0) { if (typeof showToast === 'function') showToast('Pick a step on the bar first!'); return; }
            change((st) => st.splice(i, 1));
            ui.stepSel[slot] = -1;
            render();
        });
        track.addEventListener('click', (e) => {
            if (e.target !== track) return;
            const r = track.getBoundingClientRect();
            addAt(Math.round(Math.min(0.99, Math.max(0.01, (e.clientX - r.left) / r.width)) * 1000) / 1000);
        });
        track.addEventListener('pointerdown', (e) => {
            const m = e.target.closest && e.target.closest('.pstep-marker');
            if (!m) return;
            e.preventDefault();
            const i = +m.dataset.i;
            ui.stepSel[slot] = i;
            pushHistory(false);
            const r = track.getBoundingClientRect();
            const move = (ev) => { const o = Math.round(Math.min(0.99, Math.max(0.01, (ev.clientX - r.left) / r.width)) * 1000) / 1000; change((st) => { if (st[i]) st[i].o = o; }, false); };
            const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); render(); };
            window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
            render();
        });
        return { group: grp, track: track, picker: pick, del: del, slot: slot };
    }
    function paintSteps(t, f) {
        if (!t) return;
        const show = (node, on) => { if (node) node.style.display = on ? '' : 'none'; };
        const key = STEP_KEY[t.slot], list = Array.isArray(f[key]) ? f[key] : [];
        const e = t.slot === 'fg' ? [f.fill || '#a305ffff', f.patternFg2 || '#38bdf8ff'] : [f.patternBg || f.fill2 || '#ffffff00', f.patternBg2 || '#bae6fdff'];
        const all = [{ o: 0, c: e[0] }].concat(cleanSteps(list), [{ o: 1, c: e[1] }]);
        // (a checkerboard under the bar shows see-through colors)
        t.track.style.background = 'linear-gradient(to right, ' + all.map((m) => m.c + ' ' + Math.round(m.o * 1000) / 10 + '%').join(', ') + '), repeating-conic-gradient(#cbd5e1 0 25%, #ffffff 0 50%) 0 0 / 10px 10px';
        let sel = ui.stepSel[t.slot];
        if (sel >= list.length) sel = ui.stepSel[t.slot] = -1;
        t.track.innerHTML = list.map((m, i) => '<button type="button" class="pstep-marker" data-i="' + i + '" title="Step ' + (i + 1) + ' (' + Math.round(m.o * 100) + '%)" aria-label="Gradient step ' + (i + 1) + '" style="position:absolute;top:50%;left:' + (m.o * 100) + '%;width:14px;height:26px;margin:-13px 0 0 -7px;padding:0;border-radius:6px;cursor:ew-resize;background:' + m.c + ';border:2px solid ' + (i === sel ? '#0ea5e9' : '#ffffff') + ';box-shadow:0 0 0 1px rgba(0,0,0,.55)' + (i === sel ? ',0 0 0 4px rgba(14,165,233,.35)' : '') + ';"></button>').join('');
        show(t.picker.group, sel >= 0);
        t.del.disabled = sel < 0;
        if (sel >= 0) syncColorPopup(t.slot === 'fg' ? 'pfgs' : 'pbgs', list[sel].c, '#ffffffff');
    }
    function gradToggle(slot) {
        const key = slot === 'fg' ? 'patternFgGrad' : 'patternBgGrad', key2 = slot === 'fg' ? 'patternFg2' : 'patternBg2', dflt = slot === 'fg' ? '#38bdf8ff' : '#bae6fdff';
        const b = make('button', { type: 'button', class: 'pgrad-btn', 'data-slot': slot });
        b.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            const f = leaves(first())[0] || {}, next = GRAD_NEXT[f[key] || ''];
            if (next) picked().forEach((o) => leaves(o).forEach((x) => { if (!x[key2]) x[key2] = dflt; }));
            setProp(key, next, true);
        });
        paintToggle(b, '');
        return b;
    }
    function paintToggle(b, mode) {
        if (!b) return;
        const slot = b.getAttribute('data-slot'), what = slot === 'fg' ? 'Lines' : 'Background';
        b.innerHTML = gradIcon(mode, slot);
        b.classList.toggle('on', !!mode);
        b.title = what + ' color: ' + GRAD_NAMES[mode] + ' (click for ' + GRAD_NAMES[GRAD_NEXT[mode]].toLowerCase() + ')';
        b.setAttribute('aria-label', b.title);
    }
    // a style value goes to every shape inside a group, too (app.js calls this when a color is picked)
    function deep(o, prop, value) {
        if (prop === 'patternFgStep' || prop === 'patternBgStep') {
            const slot = prop === 'patternFgStep' ? 'fg' : 'bg', key = STEP_KEY[slot], i = ui.stepSel ? ui.stepSel[slot] : -1;
            leaves(o).forEach((x) => { if (Array.isArray(x[key]) && x[key][i]) x[key][i].c = value; });
            return;
        }
        leaves(o).forEach((x) => { x[prop] = value; });
    }

    // bring the controls in line with what is selected
    function sync() {
        if (!ui.built) return;
        const list = picked(), has = list.length > 0;
        const o = list[0];
        const show = (node, on) => { if (node) node.style.display = on ? '' : 'none'; };
        const all = list.flatMap((x) => leaves(x));
        const hasText = all.length && all.every((x) => x.type === 'text');
        const hasOpen = all.length && all.every((x) => x.type === 'line' || x.type === 'path');
        const hasImage = all.length && all.every((x) => x.type === 'image');
        show($('lbl-extras'), has); show($('grp-blend'), has); show($('grp-flip'), has); show($('grp-name'), has);
        show(ui.textBox, hasText);
        show($('grp-extras-stroke'), has && !hasImage);
        show($('grp-extras-fill'), has && !hasImage);
        show(ui.markerBox, hasOpen);
        if (!has) return;
        if (document.activeElement !== ui.blend) ui.blend.value = o.blend || 'normal';
        ui.flipX.classList.toggle('active', !!o.flipX); ui.flipY.classList.toggle('active', !!o.flipY);
        if (document.activeElement !== ui.name) ui.name.value = o.name || '';
        if (hasText) {
            ui.italic.classList.toggle('active', !!o.italic); ui.underline.classList.toggle('active', !!o.underline); ui.strike.classList.toggle('active', !!o.strike);
            if (document.activeElement !== ui.spacing) ui.spacing.value = o.letterSpacing || 0;
        }
        const f = all[0];
        if (!f || hasImage) return;
        markSeg(ui.cap, f.linecap || 'butt'); markSeg(ui.join, f.linejoin || 'miter');
        ui.miter.value = f.miterlimit || 4; ui.miterLbl.textContent = 'Miter limit (' + (f.miterlimit || 4) + ')';
        show(ui.miter.parentNode, (f.linejoin || 'miter') === 'miter');
        ui.dash.value = f.dashPreset || 'solid';
        show(ui.dashCustomGrp, f.dashPreset === 'custom');
        if (document.activeElement !== ui.dashCustom) ui.dashCustom.value = f.dashCustom || '';
        const dashed = !!f.dashPreset && f.dashPreset !== 'solid';
        show(ui.dashOffGrp, dashed);
        ui.dashOff.value = f.dashOffset || 0; ui.dashOffLbl.textContent = 'Dash offset (' + (f.dashOffset || 0) + ')';
        ui.order.classList.toggle('active', f.paintOrder === 'stroke');
        if (hasOpen) {
            ui.mStart.value = f.markerStart || 'none'; ui.mEnd.value = f.markerEnd || 'none';
            ui.mSize.value = f.markerSize || 3; ui.mSizeLbl.textContent = 'Marker size (' + (f.markerSize || 3) + ')';
        }
        markSeg(ui.rule, f.fillRule || 'nonzero');
        const isPattern = f.fillType === 'pattern', isGrad = f.fillType === 'linear' || f.fillType === 'radial';
        show(ui.patternBox, isPattern); show(ui.gradBox, isGrad);
        if (ui.patternBtn) ui.patternBtn.classList.toggle('active', isPattern);
        show(ui.fgToggle, isPattern);
        if (isPattern) {
            ui.pKind.value = f.patternKind || 'stripes';
            ui.pSize.value = f.patternSize || 12; ui.pSizeLbl.textContent = 'Pattern size (' + (f.patternSize || 12) + 'px)';
            ui.pAngle.value = f.patternAngle || 0; ui.pAngleLbl.textContent = 'Pattern angle (' + (f.patternAngle || 0) + '°)';
            syncColorPopup('pbg', f.patternBg || f.fill2 || '#ffffffff', '#ffffffff');
            syncColorPopup('pfg2', f.patternFg2 || '#38bdf8ff', '#38bdf8ff');
            syncColorPopup('pbg2', f.patternBg2 || '#bae6fdff', '#bae6fdff');
            paintToggle(ui.fgToggle, f.patternFgGrad || ''); paintToggle(ui.bgToggle, f.patternBgGrad || '');
            show(ui.fg2.group, !!f.patternFgGrad); show(ui.fgAngleGrp, f.patternFgGrad === 'linear');
            show(ui.bg2.group, !!f.patternBgGrad); show(ui.bgAngleGrp, f.patternBgGrad === 'linear');
            show(ui.fgSteps.group, !!f.patternFgGrad); show(ui.bgSteps.group, !!f.patternBgGrad);
            if (f.patternFgGrad) paintSteps(ui.fgSteps, f);
            if (f.patternBgGrad) paintSteps(ui.bgSteps, f);
            ui.fgAngle.value = f.patternFgAngle || 0; ui.fgAngleLbl.textContent = 'Lines gradient angle (' + (f.patternFgAngle || 0) + '°)';
            ui.bgAngle.value = f.patternBgAngle || 0; ui.bgAngleLbl.textContent = 'Background gradient angle (' + (f.patternBgAngle || 0) + '°)';
            const fl = $('fill-color-label'); if (fl) fl.innerText = f.patternFgGrad ? 'Lines Color 1' : 'Lines Color';
        }
        if (isGrad) {
            const size = f.fillType === 'linear' ? Math.round((f.fillScale || 1) * 100) : Math.round(((f.fillRadial && f.fillRadial.rx) ? f.fillRadial.rx * 200 : 100));
            ui.gSize.value = size; ui.gSizeLbl.textContent = 'Gradient size (' + size + '%)';
            markSeg(ui.spread, f.gradSpread || 'pad');
        }
        // (the Pattern button also needs the other fill-type buttons to let go)
        if (isPattern) ['color', 'linear', 'radial', 'none'].forEach((t) => { const b = $('filltype-' + t); if (b) b.classList.remove('active'); });
    }

    /* ---------- Group, Ungroup, Images ---------- */
    function groupSelected() {
        const idx = [...selectedIndices].sort((a, b) => a - b);
        if (idx.length < 2) { if (typeof playUISound === 'function') playUISound('delete'); closeOpsPopup(); return; }
        const copies = idx.map((i) => JSON.parse(JSON.stringify(objects[i])));
        replaceSelectedWith({ type: 'boolean', op: 'group', children: copies, opacity: 1, rotation: 0, blur: 0 });
        playUISound('snap'); closeOpsPopup(); render();
    }
    function addImageFile(file) {
        if (!file || !/^image\//.test(file.type)) { alert('Pick a picture file (PNG, JPG, GIF, WebP or SVG)!'); return; }
        const reader = new FileReader();
        reader.onload = () => {
            const href = String(reader.result || '');
            const img = new Image();
            img.onload = () => {
                const W = CANVAS_BOUNDS.width, H = CANVAS_BOUNDS.height;
                const nw = img.naturalWidth || 200, nh = img.naturalHeight || 200;
                const k = Math.min(1, (W * 0.6) / nw, (H * 0.6) / nh);
                const w = Math.round(nw * k), h = Math.round(nh * k);
                pushHistory(true);
                objects.push({ type: 'image', x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), width: w, height: h, href: href, aspect: 'xMidYMid meet', name: file.name.replace(/\.[^.]+$/, ''), opacity: 1, rotation: 0, blur: 0 });
                selectedIndices = [objects.length - 1];
                playUISound('snap'); render();
            };
            img.onerror = () => alert('That picture could not be opened!');
            img.src = href;
        };
        reader.readAsDataURL(file);
    }
    function wireActions() {
        // Operations: Group / Ungroup
        const pop = $('ops-popup');
        if (pop && !$('ops-group')) {
            const anchor = Array.from(pop.querySelectorAll('.ops-title')).find((t) => /PATH/i.test(t.textContent));
            const title = make('div', { class: 'ops-title' }, 'GROUP');
            const g = make('button', { type: 'button', id: 'ops-group', class: 'action-btn ops-item', 'data-tooltip': 'Keep the selected shapes together as one group' }, 'Group');
            g.innerHTML = 'Group <span class="ops-kbd">⌘G</span>';
            g.addEventListener('click', groupSelected);
            const u = make('button', { type: 'button', class: 'action-btn ops-item', 'data-tooltip': 'Split a group back into its shapes' });
            u.innerHTML = 'Ungroup <span class="ops-kbd">⇧⌘G</span>';
            u.addEventListener('click', () => releaseOp());
            [title, g, u].forEach((n) => pop.insertBefore(n, anchor || null));
        }
        // File options: Add Image
        const svgBtn = Array.from(document.querySelectorAll('button.action-btn')).find((b) => /Import SVG/.test(b.textContent));
        if (svgBtn && !$('btn-add-image')) {
            const b = make('button', { type: 'button', id: 'btn-add-image', class: 'action-btn', title: 'Place a picture on the canvas (it is saved inside the drawing and exported as an SVG <image>)' }, '🖼️ Add Image');
            const inp = make('input', { type: 'file', accept: 'image/*', style: 'display:none', id: 'file-image' });
            inp.addEventListener('change', () => { if (inp.files && inp.files[0]) addImageFile(inp.files[0]); inp.value = ''; });
            b.addEventListener('click', () => inp.click());
            svgBtn.parentNode.insertBefore(b, svgBtn.nextSibling); svgBtn.parentNode.insertBefore(inp, b.nextSibling);
        }
        // ⌘G groups (⇧⌘G already releases)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key || '').toLowerCase() === 'g') {
                const t = e.target, tag = t && t.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                e.preventDefault(); groupSelected();
            }
        });
    }

    window.inkpathExtras = { deep: deep, apply: apply, applyGroup: applyGroup, sync: sync, groupSelected: groupSelected, addImageFile: addImageFile, dashArray: dashArray };
    const start = () => { try { build(); wireActions(); if (typeof render === 'function') render(); } catch (e) { console.error('Inkpath extras:', e); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
