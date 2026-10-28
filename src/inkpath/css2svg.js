/* =====================================================================
   Inkpath CSS to SVG! Paste CSS (a button, a gel chip, a Keydown style,
   anything with backgrounds, gradients, borders, rounding, shadows and
   text) and get REAL editable Inkpath shapes: every background layer
   becomes its own rounded shape (so glossy highlights stack correctly),
   borders become strokes, box-shadows become drop/inner shadows, and the
   text becomes a text object! The browser itself reads the CSS, so
   anything it understands works!
   ===================================================================== */
(function () {
    'use strict';
    if (typeof objects === 'undefined') return;

    const PRESETS = [
        ['Aero gel button', 'background: linear-gradient(180deg, #ff92d8 0%, #FF60C5 100%);\nborder: 1px solid #ffb8e4;\nborder-radius: 10px;\nbox-shadow: 0 4px 15px rgba(255, 96, 197, 0.5), inset 0 1px 2px #fff;\ncolor: #fff;\nfont: bold 18px "JetBrains Mono";\npadding: 14px 28px;', 'Inkpath!'],
        ['Glossy pill', 'background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.1) 50%, transparent 51%), linear-gradient(180deg, #7dd3fc 0%, #0284c7 100%);\nborder: 2px solid #e0f2fe;\nborder-radius: 999px;\nbox-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);\ncolor: #fff;\nfont: 800 16px "JetBrains Mono";\npadding: 12px 30px;', 'Gel Pill'],
        ['Glass card', 'background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,249,255,0.75) 100%);\nborder: 2px solid rgba(255,255,255,0.95);\nborder-radius: 16px;\nbox-shadow: 0 15px 45px rgba(0,0,0,0.25), inset 0 1px 2px #fff;\ncolor: #334155;\nfont: 600 15px "JetBrains Mono";\nwidth: 220px;\nheight: 120px;', 'Glass Card'],
        ['Lime chip', 'background: linear-gradient(180deg, #98f838 0%, #54c702 100%);\nborder: 1px solid #b2fc7d;\nborder-radius: 6px;\nbox-shadow: 0 4px 12px rgba(104, 199, 2, 0.35), inset 0 1px 2px #fff;\ncolor: #fff;\nfont: bold 13px "JetBrains Mono";\npadding: 6px 12px;\ntext-shadow: 0 1px 2px rgba(0,0,0,0.3);', 'chip'],
        ['Candy stripe pill', 'display: inline-block;\nborder: 3px solid transparent;\nbackground: linear-gradient(var(--mx), var(--mx)) padding-box, repeating-linear-gradient(45deg, var(--m) 0 4px, var(--ml) 4px 8px) border-box;\ncolor: var(--mk);\nborder-radius: 999px;\npadding: 0px 12px;\nfont-weight: 900;\nline-height: 1.45;\n--m: #22d3ee;\n--ml: #a5f3fc;\n--mx: #f0fdff;\n--mk: #0a3a4a;', 'Inkpath!'],
        ['Sunset orb', 'background: radial-gradient(circle at 35% 30%, #fff7ed 0%, #fb923c 45%, #c2410c 100%);\nborder-radius: 50%;\nbox-shadow: 0 10px 30px rgba(194, 65, 12, 0.5), inset 0 -6px 14px rgba(0,0,0,0.25);\nwidth: 140px;\nheight: 140px;', '']
    ];

    /* ---------- Color + gradient parsing (on computed styles!) ---------- */
    function splitTop(s) {
        const out = [];
        let depth = 0, cur = '';
        for (const ch of String(s)) {
            if (ch === '(') depth++;
            if (ch === ')') depth--;
            if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
    }
    function hex2(n) { return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2); }
    // Any computed CSS color -> Inkpath's #rrggbbaa!
    function toHex8(c) {
        const m = String(c).match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
        if (m) {
            let a = m[4] === undefined ? 1 : (m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
            return '#' + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]) + hex2(a * 255);
        }
        if (/^#[0-9a-f]{3,8}$/i.test(c)) return c.length === 7 ? c + 'ff' : c;
        return null;
    }
    function alphaOf(c) { const h = toHex8(c); return h ? parseInt(h.slice(7, 9), 16) / 255 : 0; }
    // The color at position o along a sorted stop list!
    function colorAt(stops, o) {
        if (o <= stops[0].o) return stops[0].c;
        for (let i = 1; i < stops.length; i++) {
            const a = stops[i - 1], b = stops[i];
            if (o <= b.o) {
                const t = b.o === a.o ? 1 : (o - a.o) / (b.o - a.o);
                let out = '#';
                for (let k = 1; k < 9; k += 2) out += hex2(parseInt(a.c.substr(k, 2), 16) * (1 - t) + parseInt(b.c.substr(k, 2), 16) * t);
                return out;
            }
        }
        return stops[stops.length - 1].c;
    }
    // Keeps only the 0..1 part of a stop list, adding exact edge colors!
    function clipStops(stops) {
        const out = [{ c: colorAt(stops, 0), o: 0 }];
        stops.forEach(function (st) { if (st.o > 0 && st.o < 1) out.push({ c: st.c, o: st.o }); });
        out.push({ c: colorAt(stops, 1), o: 1 });
        return out;
    }
    // "repeating-linear-gradient(45deg, rgb(..) 0px, rgb(..) 4px, ...)" (from the browser, so px, %,
    // var() and shorthand stops are already resolved) -> {type, angle, scale, stops}!
    // w x h is the box the gradient paints, so px stops and angles come out exactly like CSS!
    function parseGradient(g, w, h) {
        w = w || 100; h = h || 100;
        const m = g.match(/^(repeating-)?(linear|radial)-gradient\((.*)\)$/s);
        if (!m) return null;
        const repeating = !!m[1];
        const parts = splitTop(m[3]);
        let angle = 180;
        if (m[2] === 'linear' && parts.length && !/^(rgb|#|hsl|transparent)/i.test(parts[0])) {
            const head = parts.shift();
            const deg = head.match(/(-?[\d.]+)deg/);
            const turn = head.match(/(-?[\d.]+)turn/);
            const rad = head.match(/(-?[\d.]+)rad/);
            if (deg) angle = parseFloat(deg[1]);
            else if (turn) angle = parseFloat(turn[1]) * 360;
            else if (rad) angle = parseFloat(rad[1]) * 180 / Math.PI;
            else if (/to /.test(head)) {
                // corner directions: CSS tilts the line so its middle runs between the OTHER two corners!
                const t = head.trim();
                const map = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 };
                if (map[t] !== undefined) angle = map[t];
                else {
                    const up = /top/.test(t), right = /right/.test(t);
                    const corner = Math.atan2(h, w) * 180 / Math.PI;
                    angle = up ? (right ? corner : 360 - corner) : (right ? 180 - corner : 180 + corner);
                }
            }
        } else if (m[2] === 'radial' && parts.length && !/^(rgb|#|hsl|transparent)/i.test(parts[0])) parts.shift();
        // the length of the gradient line, so px positions turn into fractions
        const th = angle * Math.PI / 180;
        const ux = Math.sin(th), uy = -Math.cos(th);
        const L = m[2] === 'linear' ? (Math.abs(w * ux) + Math.abs(h * uy)) || 1 : Math.hypot(w, h) / 2 || 1;
        const pos = function (v) { if (v === undefined) return null; const n = parseFloat(v); return /%$/.test(v) ? n / 100 : n / L; };
        let stops = [];
        parts.forEach(function (p) {
            const cm = p.match(/^(rgba?\([^)]*\)|#[0-9a-f]{3,8}|transparent)\s*(-?[\d.]+(?:%|px))?(?:\s+(-?[\d.]+(?:%|px)))?/i);
            if (!cm) return;
            const col = toHex8(cm[1] === 'transparent' ? 'rgba(0, 0, 0, 0)' : cm[1]);
            stops.push({ c: col, o: pos(cm[2]) });
            if (cm[3] !== undefined) stops.push({ c: col, o: pos(cm[3]) });
        });
        if (stops.length < 2) return null;
        // Missing positions spread evenly between their neighbors, like CSS does!
        if (stops[0].o === null) stops[0].o = 0;
        if (stops[stops.length - 1].o === null) stops[stops.length - 1].o = repeating ? stops[0].o + 1 : 1;
        for (let i = 1; i < stops.length; i++) {
            if (stops[i].o !== null) continue;
            let j = i;
            while (stops[j].o === null) j++;
            const a = stops[i - 1].o, b = stops[j].o;
            for (let k = i; k < j; k++) stops[k].o = a + (b - a) * (k - i + 1) / (j - i + 1);
        }
        // a stop can't sit before the one in front of it
        for (let i = 1; i < stops.length; i++) if (stops[i].o < stops[i - 1].o) stops[i].o = stops[i - 1].o;
        // repeating gradients: tile the pattern across the whole box!
        const period = stops[stops.length - 1].o - stops[0].o;
        if (repeating && period > 0.0005) {
            const tiled = [];
            const first = Math.floor((0 - stops[0].o) / period);
            for (let k = first; stops[0].o + k * period < 1 && tiled.length < 1200; k++) {
                stops.forEach(function (st) { tiled.push({ c: st.c, o: st.o + k * period }); });
            }
            stops = tiled;
        }
        stops = clipStops(stops);
        if (m[2] === 'radial') return { type: 'radial', angle: 0, scale: 1, stops: stops };
        // Inkpath gradients run in box units (0 = left-to-right, 90 = top-to-bottom), so the
        // direction is corrected for the box shape and the vector stretched to match CSS!
        const ex = w * ux / L, ey = h * uy / L;
        const len = Math.hypot(ex, ey) || 1;
        const inkAngle = ((Math.atan2(ey, ex) * 180 / Math.PI) % 360 + 360) % 360;
        return { type: 'linear', angle: Math.round(inkAngle * 1000) / 1000, scale: Math.round(1000 / len) / 1000, stops: stops };
    }
    function parseShadows(s) {
        if (!s || s === 'none') return [];
        return splitTop(s).map(function (one) {
            const inset = /\binset\b/.test(one);
            const col = (one.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i) || ['rgba(0, 0, 0, 0.5)'])[0];
            const nums = one.replace(col, '').replace('inset', '').trim().split(/\s+/).map(parseFloat).filter(function (n) { return !isNaN(n); });
            return { inset: inset, dx: nums[0] || 0, dy: nums[1] || 0, blur: (nums[2] || 0) / 2, color: toHex8(col) || '#00000080' };
        });
    }

    /* ---------- Measure the CSS with the real browser ---------- */
    function cleanCss(css) {
        let s = String(css || '');
        const brace = s.match(/\{([^}]*)\}/);
        if (brace) s = brace[1];
        return s.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    }
    function measure(css, text) {
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-5000px;top:0;visibility:hidden;';
        const el = document.createElement('div');
        el.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;white-space:pre;font-family:"JetBrains Mono",monospace;' + cleanCss(css);
        el.textContent = text || '';
        host.appendChild(el);
        document.body.appendChild(host);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        // where the browser really put the text (flex centering, padding, text-align all included)
        let textLeft = null, textWidth = 0;
        if (el.firstChild) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const tr = range.getBoundingClientRect();
            if (tr.width) { textLeft = tr.left - r.left; textWidth = tr.width; }
        }
        // border-radius: 50% means half the box, not 50px!
        const rawR = String(cs.borderTopLeftRadius).split(' ')[0];
        const radiusPx = /%$/.test(rawR) ? parseFloat(rawR) / 100 * Math.min(r.width, r.height) : parseFloat(rawR) || 0;
        const out = {
            w: Math.max(4, r.width), h: Math.max(4, r.height),
            radius: Math.min(radiusPx, Math.min(r.width, r.height) / 2), textLeft: textLeft, textWidth: textWidth,
            bgColor: cs.backgroundColor, bgImage: cs.backgroundImage,
            borderW: cs.borderTopStyle === 'none' ? 0 : (parseFloat(cs.borderTopWidth) || 0), borderColor: cs.borderTopColor,
            bw: ['Top', 'Right', 'Bottom', 'Left'].map(function (k) { return cs['border' + k + 'Style'] === 'none' ? 0 : (parseFloat(cs['border' + k + 'Width']) || 0); }),
            pad: ['Top', 'Right', 'Bottom', 'Left'].map(function (k) { return parseFloat(cs['padding' + k]) || 0; }),
            clips: splitTop(cs.backgroundClip || 'border-box'),
            outlineW: cs.outlineStyle === 'none' ? 0 : (parseFloat(cs.outlineWidth) || 0), outlineColor: cs.outlineColor, outlineOffset: parseFloat(cs.outlineOffset) || 0,
            shadows: parseShadows(cs.boxShadow), textShadows: parseShadows(cs.textShadow),
            opacity: parseFloat(cs.opacity), color: cs.color, fontSize: parseFloat(cs.fontSize) || 16,
            fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), fontWeight: cs.fontWeight, textAlign: cs.textAlign,
            blur: ((cs.filter || '').match(/blur\(([\d.]+)px\)/) || [0, 0])[1]
        };
        host.remove();
        return out;
    }

    /* ---------- Turn the measurements into Inkpath objects ---------- */
    function convert(css, text, x0, y0) {
        const M = measure(css, text);
        const shapes = [];
        const base = { type: 'rect', x: x0, y: y0, width: M.w, height: M.h, rx: M.radius, strokeType: 'none', stroke: '#ffffff00', stroke2: '#38bdf8ff', strokeAngle: 0, strokeWidth: 0, opacity: 1, blur: 0, rotation: 0, fill2: '#38bdf8ff', fillAngle: 0 };
        // Each background layer paints only inside its background-clip box (border-box,
        // padding-box or content-box), with the corners rounded to match!
        function clipBox(clip) {
            const b = M.bw, p = M.pad;
            const ins = clip === 'content-box' ? [b[0] + p[0], b[1] + p[1], b[2] + p[2], b[3] + p[3]] : clip === 'padding-box' ? b : [0, 0, 0, 0];
            const w = Math.max(1, M.w - ins[1] - ins[3]), h = Math.max(1, M.h - ins[0] - ins[2]);
            return { x: x0 + ins[3], y: y0 + ins[0], width: w, height: h, rx: Math.max(0, Math.min(M.radius - Math.max(ins[0], ins[3]), Math.min(w, h) / 2)) };
        }
        const layers = (M.bgImage && M.bgImage !== 'none') ? splitTop(M.bgImage) : [];
        const clipOf = function (i) { return M.clips[Math.min(i, M.clips.length - 1)] || 'border-box'; };
        // Bottom layer first: the background color (it uses the LAST clip), then images from back to front!
        if (alphaOf(M.bgColor) > 0) shapes.push(Object.assign({}, base, clipBox(clipOf(layers.length ? layers.length - 1 : 0)), { fillType: 'color', fill: toHex8(M.bgColor), name: 'Background' }));
        layers.map(function (layer, i) { return { layer: layer, clip: clipOf(i) }; }).reverse().forEach(function (L, i, all) {
            const box = clipBox(L.clip);
            const g = parseGradient(L.layer, box.width, box.height);
            if (!g) return;
            // a flat gradient (one color, like linear-gradient(white, white)) is just a color!
            const flat = g.stops.every(function (st) { return st.c === g.stops[0].c; });
            shapes.push(Object.assign({}, base, box, flat ? { fillType: 'color', fill: g.stops[0].c } : {
                fillType: g.type, fill: g.stops[0].c, fill2: g.stops[g.stops.length - 1].c, fillStops: g.stops, fillAngle: g.angle, fillScale: g.scale
            }, {
                name: (all.length > 1 ? (i === all.length - 1 ? 'Gloss' : 'Gradient ' + (i + 1)) : 'Gradient') + (L.clip !== 'border-box' ? ' (' + L.clip.replace('-box', '') + ')' : '')
            }));
        });
        if (!shapes.length) shapes.push(Object.assign({}, base, { fillType: 'none', fill: '#00000000', name: 'Box' }));
        // Shadows go on the bottom shape, the border becomes the top shape's stroke!
        const drop = M.shadows.find(function (s) { return !s.inset; });
        const inner = M.shadows.find(function (s) { return s.inset; });
        if (drop) shapes[0].effects = Object.assign(shapes[0].effects || {}, { drop: { dx: drop.dx, dy: drop.dy, blur: drop.blur, color: drop.color } });
        if (inner) shapes[shapes.length - 1].effects = Object.assign(shapes[shapes.length - 1].effects || {}, { inner: { dx: inner.dx, dy: inner.dy, blur: inner.blur, color: inner.color } });
        if (M.borderW > 0 && alphaOf(M.borderColor) > 0) {
            const top = shapes[shapes.length - 1];
            const bw = M.borderW;
            // CSS borders sit INSIDE the box; SVG strokes straddle the edge, so inset by half!
            const ring = Object.assign({}, base, { x: x0 + bw / 2, y: y0 + bw / 2, width: Math.max(1, M.w - bw), height: Math.max(1, M.h - bw), rx: Math.max(0, M.radius - bw / 2), fillType: 'none', fill: '#00000000', strokeType: 'color', stroke: toHex8(M.borderColor), strokeWidth: bw, name: 'Border' });
            if (top.fillType === 'none') Object.assign(top, ring); else shapes.push(ring);
        }
        if (M.outlineW > 0 && alphaOf(M.outlineColor) > 0) {
            const ow = M.outlineW, out = M.outlineOffset + ow / 2;
            shapes.push(Object.assign({}, base, { x: x0 - out, y: y0 - out, width: M.w + out * 2, height: M.h + out * 2, rx: M.radius > 0 ? M.radius + out : 0, fillType: 'none', fill: '#00000000', strokeType: 'color', stroke: toHex8(M.outlineColor), strokeWidth: ow, name: 'Outline' }));
        }
        shapes.forEach(function (s) {
            if (M.opacity < 1) s.opacity = M.opacity;
            if (+M.blur) s.blur = +M.blur;
        });
        if (text) {
            const ts = M.textShadows[0];
            // the label's middle goes exactly where the browser put the text's middle!
            const anchor = 'middle';
            const tx = M.textLeft !== null ? x0 + M.textLeft + M.textWidth / 2 : x0 + M.w / 2;
            const t = { type: 'text', text: text, fontSize: M.fontSize, fontFamily: M.fontFamily || 'JetBrains Mono', fontWeight: M.fontWeight, textAlign: anchor, x: tx, y: y0 + M.h / 2 + M.fontSize * 0.35, fill: toHex8(M.color) || '#000000ff', fillType: 'color', stroke: '#ffffff00', strokeType: 'none', strokeWidth: 0, opacity: M.opacity < 1 ? M.opacity : 1, blur: 0, rotation: 0, name: 'Label' };
            if (ts) t.effects = { drop: { dx: ts.dx, dy: ts.dy, blur: ts.blur, color: ts.color } };
            shapes.push(t);
        }
        return { shapes: shapes, w: M.w, h: M.h };
    }

    /* ---------- A tiny painter for the live SVG preview ---------- */
    function paint(svg, shapes) {
        const NS = 'http://www.w3.org/2000/svg';
        svg.innerHTML = '';
        const defs = document.createElementNS(NS, 'defs');
        svg.appendChild(defs);
        shapes.forEach(function (s, i) {
            let fill = 'none';
            if (s.fillType === 'color') fill = s.fill;
            else if (s.fillType === 'linear' || s.fillType === 'radial') {
                const g = document.createElementNS(NS, s.fillType === 'linear' ? 'linearGradient' : 'radialGradient');
                g.id = 'c2s-g' + i;
                if (s.fillType === 'linear' && typeof applyGradientAngle === 'function') applyGradientAngle(g, s.fillAngle, s.fillScale);
                s.fillStops.forEach(function (st) {
                    const stop = document.createElementNS(NS, 'stop');
                    stop.setAttribute('offset', st.o);
                    stop.setAttribute('stop-color', st.c.slice(0, 7));
                    stop.setAttribute('stop-opacity', parseInt(st.c.slice(7, 9) || 'ff', 16) / 255);
                    g.appendChild(stop);
                });
                defs.appendChild(g);
                fill = 'url(#' + g.id + ')';
            }
            let el;
            if (s.type === 'text') {
                el = document.createElementNS(NS, 'text');
                el.textContent = s.text;
                el.setAttribute('x', s.x); el.setAttribute('y', s.y);
                el.setAttribute('font-size', s.fontSize); el.setAttribute('font-family', s.fontFamily); el.setAttribute('font-weight', s.fontWeight);
                el.setAttribute('text-anchor', s.textAlign);
            } else {
                el = document.createElementNS(NS, 'rect');
                el.setAttribute('x', s.x); el.setAttribute('y', s.y); el.setAttribute('width', s.width); el.setAttribute('height', s.height); el.setAttribute('rx', s.rx || 0);
            }
            el.setAttribute('fill', fill.length === 9 && fill[0] === '#' ? fill.slice(0, 7) : fill);
            if (fill.length === 9 && fill[0] === '#') el.setAttribute('fill-opacity', parseInt(fill.slice(7), 16) / 255);
            if (s.strokeType === 'color' && s.strokeWidth) { el.setAttribute('stroke', s.stroke.slice(0, 7)); el.setAttribute('stroke-opacity', parseInt(s.stroke.slice(7, 9) || 'ff', 16) / 255); el.setAttribute('stroke-width', s.strokeWidth); }
            if (s.opacity < 1) el.setAttribute('opacity', s.opacity);
            if (typeof buildFxFilterInto === 'function') {
                const f = buildFxFilterInto(defs, 'c2s-f' + i, s.blur || 0, s.effects);
                if (f) el.setAttribute('filter', f);
            }
            svg.appendChild(el);
        });
    }

    /* ---------- The dialog ---------- */
    let dlg = null;
    function open() {
        if (typeof playUISound === 'function') playUISound('click');
        if (!dlg) build();
        dlg.hidden = false;
        update();
        dlg.querySelector('#c2s-css').focus();
    }
    function close() { dlg.hidden = true; }
    function build() {
        dlg = document.createElement('div');
        dlg.id = 'c2s-back';
        dlg.hidden = true;
        dlg.innerHTML =
            '<div class="c2s-dlg" role="dialog" aria-label="CSS to SVG">' +
            '<div class="c2s-head"><b>CSS to SVG</b><button type="button" class="c2s-x" title="Close">✕</button></div>' +
            '<p class="c2s-sub">Paste CSS (just the declarations, or a whole <code>.rule { … }</code>) and get real, editable Inkpath shapes! Backgrounds, gradients, borders, rounding, box-shadows and text all convert!</p>' +
            '<div class="c2s-presets"></div>' +
            '<div class="c2s-grid"><div class="c2s-col"><label>CSS</label><textarea id="c2s-css" spellcheck="false"></textarea><label>Text (optional)</label><input id="c2s-text" maxlength="80" spellcheck="false"></div>' +
            '<div class="c2s-col"><label>CSS preview</label><div class="c2s-stage" id="c2s-html"></div><label>SVG result <span id="c2s-count"></span></label><div class="c2s-stage"><svg id="c2s-svg" xmlns="http://www.w3.org/2000/svg"></svg></div></div></div>' +
            '<div class="c2s-foot"><span id="c2s-msg"></span><button type="button" class="action-btn c2s-cancel">Cancel</button><button type="button" class="pad-toggle-btn active c2s-go">Insert as Shapes</button></div></div>';
        document.body.appendChild(dlg);
        const pres = dlg.querySelector('.c2s-presets');
        PRESETS.forEach(function (p) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'action-btn';
            b.textContent = p[0];
            b.addEventListener('click', function () { dlg.querySelector('#c2s-css').value = p[1]; dlg.querySelector('#c2s-text').value = p[2]; update(); });
            pres.appendChild(b);
        });
        dlg.querySelector('#c2s-css').value = PRESETS[0][1];
        dlg.querySelector('#c2s-text').value = PRESETS[0][2];
        dlg.querySelector('#c2s-css').addEventListener('input', update);
        dlg.querySelector('#c2s-text').addEventListener('input', update);
        dlg.querySelector('.c2s-x').addEventListener('click', close);
        dlg.querySelector('.c2s-cancel').addEventListener('click', close);
        dlg.querySelector('.c2s-go').addEventListener('click', insert);
        dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) close(); });
        dlg.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') close(); });
    }
    function update() {
        const css = dlg.querySelector('#c2s-css').value;
        const text = dlg.querySelector('#c2s-text').value;
        const html = dlg.querySelector('#c2s-html');
        html.innerHTML = '';
        const el = document.createElement('div');
        el.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;white-space:pre;font-family:"JetBrains Mono",monospace;' + cleanCss(css);
        el.textContent = text;
        html.appendChild(el);
        let res;
        try { res = convert(css, text, 20, 20); } catch (e) { dlg.querySelector('#c2s-msg').textContent = 'Could not read that CSS!'; return; }
        const svg = dlg.querySelector('#c2s-svg');
        svg.setAttribute('viewBox', '0 0 ' + Math.ceil(res.w + 40) + ' ' + Math.ceil(res.h + 40));
        svg.setAttribute('width', Math.min(320, res.w + 40));
        paint(svg, res.shapes);
        dlg.querySelector('#c2s-count').textContent = '(' + res.shapes.length + ' shape' + (res.shapes.length === 1 ? '' : 's') + ')';
        dlg.querySelector('#c2s-msg').textContent = '';
    }
    function insert() {
        const css = dlg.querySelector('#c2s-css').value;
        const text = dlg.querySelector('#c2s-text').value;
        const probe = measure(css, text);
        // Drop it in the middle of what you can SEE (zoom + pan included)!
        let cx = CANVAS_BOUNDS.width / 2, cy = CANVAS_BOUNDS.height / 2;
        try {
            const vp = document.getElementById('viewport').getBoundingClientRect();
            const m = document.getElementById('drawing-layer').getScreenCTM().inverse();
            const pt = document.getElementById('viewport').createSVGPoint();
            pt.x = vp.left + vp.width / 2; pt.y = vp.top + vp.height / 2;
            const q = pt.matrixTransform(m);
            cx = Math.max(0, Math.min(CANVAS_BOUNDS.width, q.x)); cy = Math.max(0, Math.min(CANVAS_BOUNDS.height, q.y));
        } catch (e) {}
        const x0 = Math.round(cx - probe.w / 2), y0 = Math.round(cy - probe.h / 2);
        const res = convert(css, text, x0, y0);
        pushHistory(true);
        const first = objects.length;
        res.shapes.forEach(function (s) { objects.push(s); });
        selectedIndices = res.shapes.map(function (_, i) { return first + i; });
        if (typeof playUISound === 'function') playUISound('snap');
        close();
        render();
    }

    window.openCssToSvg = open;
    window.InkpathCssToSvg = { convert: convert, parseGradient: parseGradient };
    // A sidebar button, right under the export buttons!
    const exp = [...document.querySelectorAll('.aero-sidebar .action-btn')].find(function (b) { return /Export PNG/.test(b.textContent); });
    if (exp) {
        const b = document.createElement('button');
        b.className = 'action-btn';
        b.type = 'button';
        b.textContent = '🎨 CSS to SVG';
        b.title = 'Turn CSS into editable vector shapes!';
        b.addEventListener('click', open);
        exp.after(b);
    }
})();
