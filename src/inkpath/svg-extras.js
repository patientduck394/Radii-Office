/* =====================================================================
   Inkpath SVG extras: the parts of SVG that Inkpath didn't have yet!
     Stroke      line caps (butt/round/square), line joins (miter/round/bevel), miter limit,
                 dash patterns (dashed, dotted, dash-dot, long, or your own numbers) and the dash offset
     Markers     arrowheads and other line ends (arrow, open arrow, dot, square, diamond, bar) on lines and paths
     Fill        the fill rule (nonzero / even-odd), Pattern fills (stripes, dots, grid, checker, hatch, waves),
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
    const PATTERNS = [['stripes', 'Stripes'], ['dots', 'Dots'], ['grid', 'Grid'], ['checker', 'Checker'], ['hatch', 'Cross-hatch'], ['waves', 'Waves']];

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
    function patternEl(obj, id) {
        const size = Math.max(3, num(obj.patternSize, 12)), ang = num(obj.patternAngle, 0);
        const c1 = obj.fill || '#a305ffff', c2 = obj.patternBg || obj.fill2 || '#ffffff00';
        const p = svgEl('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: size, height: size, patternTransform: 'rotate(' + ang + ')' });
        const bg = svgEl('rect', { width: size, height: size, fill: c2 });
        p.appendChild(bg);
        const k = obj.patternKind || 'stripes', h = size / 2;
        if (k === 'stripes') p.appendChild(svgEl('rect', { width: h, height: size, fill: c1 }));
        else if (k === 'dots') p.appendChild(svgEl('circle', { cx: h, cy: h, r: size * 0.22, fill: c1 }));
        else if (k === 'grid') { p.appendChild(svgEl('rect', { width: size, height: Math.max(1, size * 0.14), fill: c1 })); p.appendChild(svgEl('rect', { width: Math.max(1, size * 0.14), height: size, fill: c1 })); }
        else if (k === 'checker') { p.appendChild(svgEl('rect', { width: h, height: h, fill: c1 })); p.appendChild(svgEl('rect', { x: h, y: h, width: h, height: h, fill: c1 })); }
        else if (k === 'hatch') {
            const sw = Math.max(1, size * 0.12);
            ['M0 ' + size + 'L' + size + ' 0', 'M-1 1L1 -1', 'M' + (size - 1) + ' ' + (size + 1) + 'L' + (size + 1) + ' ' + (size - 1), 'M0 0L' + size + ' ' + size, 'M-1 ' + (size - 1) + 'L1 ' + (size + 1), 'M' + (size - 1) + ' -1L' + (size + 1) + ' 1']
                .forEach((d) => p.appendChild(svgEl('path', { d: d, stroke: c1, 'stroke-width': sw, fill: 'none' })));
        } else p.appendChild(svgEl('path', { d: 'M0 ' + h + 'Q' + (size / 4) + ' 0 ' + h + ' ' + h + 'T' + size + ' ' + h, stroke: c1, 'stroke-width': Math.max(1, size * 0.13), fill: 'none' }));
        return p;
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
                defs.appendChild(patternEl(obj, pid));
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
    function range(min, max, step, oninput) { const r = make('input', { type: 'range', class: 'prop-slider', min: min, max: max, step: step }); r.addEventListener('input', () => oninput(parseFloat(r.value))); return r; }
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
        ui.pBg = make('input', { type: 'color', value: '#ffffff' });
        ui.pBg.addEventListener('input', () => setProp('patternBg', ui.pBg.value + 'ff', true));
        pt.appendChild(group('Pattern background (the lines use Fill Color 1)', ui.pBg));
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
        if (isPattern) {
            ui.pKind.value = f.patternKind || 'stripes';
            ui.pSize.value = f.patternSize || 12; ui.pSizeLbl.textContent = 'Pattern size (' + (f.patternSize || 12) + 'px)';
            ui.pAngle.value = f.patternAngle || 0; ui.pAngleLbl.textContent = 'Pattern angle (' + (f.patternAngle || 0) + '°)';
            const bg = String(f.patternBg || f.fill2 || '#ffffffff'); ui.pBg.value = /^#[0-9a-f]{6}/i.test(bg) ? bg.slice(0, 7) : '#ffffff';
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

    window.inkpathExtras = { apply: apply, applyGroup: applyGroup, sync: sync, groupSelected: groupSelected, addImageFile: addImageFile, dashArray: dashArray };
    const start = () => { try { build(); wireActions(); if (typeof render === 'function') render(); } catch (e) { console.error('Inkpath extras:', e); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
