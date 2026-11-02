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
    // Colors like color(srgb 0.9 0.8 0 / 0.5) (what color-mix() turns into), oklch(), lab(), hsl()... -> rgba(),
    // by letting a 1x1 canvas paint them
    let cvx = null;
    const cssColorCache = {};
    function plainColor(c) {
        if (cssColorCache[c]) return cssColorCache[c];
        if (!cvx) { const cv = document.createElement('canvas'); cv.width = cv.height = 1; cvx = cv.getContext('2d', { willReadFrequently: true }); }
        cvx.clearRect(0, 0, 1, 1);
        cvx.fillStyle = 'rgba(0, 0, 0, 0)';
        cvx.fillStyle = c;
        cvx.fillRect(0, 0, 1, 1);
        const d = cvx.getImageData(0, 0, 1, 1).data;
        return (cssColorCache[c] = 'rgba(' + d[0] + ', ' + d[1] + ', ' + d[2] + ', ' + Math.round(d[3] / 255 * 1000) / 1000 + ')');
    }
    function plainColors(s) { return String(s).replace(/\b(?:color|oklch|oklab|lab|lch|hwb|hsla?)\([^()]*\)/gi, plainColor); }
    function hex2(n) { return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2); }
    // Any computed CSS color -> Inkpath's #rrggbbaa!
    function toHex8(c) {
        c = plainColors(c);
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
    // radial-gradient's shape, size and position ("130% 95% at 50% 120%", "circle at 0% 0%", "closest-side"...)
    // -> centre and radii as fractions of the box, plus the ray length in px (what px stops are measured along)
    function radialGeom(head, w, h) {
        const t = words(head || '');
        const at = t.indexOf('at');
        const shapeT = at < 0 ? t : t.slice(0, at), posT = at < 0 ? [] : t.slice(at + 1);
        const cx = posT.length ? evalLen(posT[0], w) : w / 2, cy = posT.length > 1 ? evalLen(posT[1], h) : h / 2;
        let circle = shapeT.indexOf('circle') >= 0;
        const sizeT = shapeT.filter(function (x) { return x !== 'circle' && x !== 'ellipse'; });
        const isKw = function (x) { return /^(closest|farthest)-(side|corner)$/.test(x); };
        const lens = sizeT.filter(function (x) { return !isKw(x); });
        const kw = sizeT.find(isKw) || 'farthest-corner';
        if (lens.length === 1) circle = true;
        let rx, ry;
        if (lens.length) { rx = evalLen(lens[0], w); ry = lens.length > 1 ? evalLen(lens[1], h) : rx; }
        else {
            const far = /farthest/.test(kw);
            const pick = far ? Math.max : Math.min;
            const sx = pick(Math.abs(cx), Math.abs(w - cx)), sy = pick(Math.abs(cy), Math.abs(h - cy));
            if (/side/.test(kw)) { if (circle) rx = ry = pick(sx, sy); else { rx = sx; ry = sy; } }
            else {
                let best = null;
                [[0, 0], [w, 0], [w, h], [0, h]].forEach(function (c) { const d = Math.hypot(c[0] - cx, c[1] - cy); if (!best || (far ? d > best.d : d < best.d)) best = { d: d, x: c[0] - cx, y: c[1] - cy }; });
                if (circle || !(sy > 0) || !(sx > 0)) rx = ry = best.d;
                else { const k = sx / sy, s2 = Math.sqrt(Math.pow(best.x / k, 2) + best.y * best.y); ry = s2; rx = k * s2; } // (the -side shape, stretched to reach the corner)
            }
        }
        rx = Math.max(0.01, rx || 0); ry = Math.max(0.01, ry || 0);
        const r4 = function (n) { return Math.round(n * 10000) / 10000; };
        return { cx: r4(cx / w), cy: r4(cy / h), rx: r4(rx / w), ry: r4(ry / h), L: rx };
    }
    function angleOf(v) {
        const n = parseFloat(v);
        if (/turn$/.test(v)) return n * 360;
        if (/grad$/.test(v)) return n * 0.9;
        if (/rad$/.test(v)) return n * 180 / Math.PI;
        return n;
    }
    function parseGradient(g, w, h) {
        w = w || 100; h = h || 100;
        g = plainColors(g);
        const m = g.match(/^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/s);
        if (!m) return null;
        const repeating = !!m[1], kind = m[2];
        const parts = splitTop(m[3]);
        const isColor = function (p) { return /^(rgb|#|hsl|transparent)/i.test(p); };
        let angle = 180, geom = null, conic = null;
        if (kind === 'linear' && parts.length && !isColor(parts[0])) {
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
        } else if (kind === 'radial') geom = radialGeom(parts.length && !isColor(parts[0]) ? parts.shift() : '', w, h);
        else if (kind === 'conic') {
            const t = words(parts.length && !isColor(parts[0]) ? parts.shift() : '');
            const f = t.indexOf('from'), at = t.indexOf('at');
            conic = { from: f >= 0 ? angleOf(t[f + 1]) : 0, cx: at >= 0 ? evalLen(t[at + 1], w) : w / 2, cy: at >= 0 && t[at + 2] ? evalLen(t[at + 2], h) : h / 2 };
        }
        // the length of the gradient line, so px positions turn into fractions
        const th = angle * Math.PI / 180;
        const ux = Math.sin(th), uy = -Math.cos(th);
        const L = kind === 'linear' ? (Math.abs(w * ux) + Math.abs(h * uy)) || 1 : geom ? geom.L : 360;
        const pos = function (v) {
            if (v === undefined) return null;
            const n = parseFloat(v);
            if (/%$/.test(v)) return n / 100;
            if (/(deg|turn|rad|grad)$/.test(v)) return angleOf(v) / 360;
            return n / L;
        };
        let stops = [];
        parts.forEach(function (p) {
            const cm = p.match(/^(rgba?\([^)]*\)|#[0-9a-f]{3,8}|transparent)\s*(-?[\d.]+(?:%|px|deg|turn|rad|grad))?(?:\s+(-?[\d.]+(?:%|px|deg|turn|rad|grad)))?/i);
            if (!cm) return;
            const col = toHex8(cm[1] === 'transparent' ? 'rgba(0, 0, 0, 0)' : cm[1]);
            stops.push({ c: col, o: pos(cm[2]) });
            if (cm[3] !== undefined) stops.push({ c: col, o: pos(cm[3]) });
        });
        if (stops.length < 2) return null;
        // A see-through stop (like transparent) fades like CSS: toward the color beside it, never toward black
        const rgbOf = function (c) { return c.slice(0, 7); }, clear = function (c) { return parseInt(c.slice(7, 9), 16) === 0; };
        for (let i = 0; i < stops.length; i++) {
            if (!clear(stops[i].c)) continue;
            const prev = stops.slice(0, i).reverse().find(function (t) { return !clear(t.c); }), next = stops.slice(i + 1).find(function (t) { return !clear(t.c); });
            if (prev && next && rgbOf(prev.c) !== rgbOf(next.c)) {
                // between two colors: two stops at the same spot, each fading to its own side's color
                stops.splice(i + 1, 0, { c: rgbOf(next.c) + '00', o: stops[i].o });
                stops[i] = { c: rgbOf(prev.c) + '00', o: stops[i].o };
                i++;
            } else if (prev || next) stops[i] = { c: rgbOf((prev || next).c) + '00', o: stops[i].o };
        }
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
        if (kind === 'radial') { const r = { cx: geom.cx, cy: geom.cy, rx: geom.rx, ry: geom.ry }; return { type: 'radial', angle: 0, scale: 1, stops: stops, radial: r }; }
        if (kind === 'conic') return { type: 'conic', from: conic.from, cx: conic.cx, cy: conic.cy, stops: stops };
        // Inkpath gradients run in box units (0 = left-to-right, 90 = top-to-bottom), so the
        // direction is corrected for the box shape and the vector stretched to match CSS!
        const ex = w * ux / L, ey = h * uy / L;
        const len = Math.hypot(ex, ey) || 1;
        const inkAngle = ((Math.atan2(ey, ex) * 180 / Math.PI) % 360 + 360) % 360;
        return { type: 'linear', angle: Math.round(inkAngle * 1000) / 1000, scale: Math.round(1000 / len) / 1000, stops: stops };
    }
    function parseShadows(s) {
        if (!s || s === 'none') return [];
        s = plainColors(s);
        return splitTop(s).map(function (one) {
            const inset = /\binset\b/.test(one);
            const col = (one.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i) || ['rgba(0, 0, 0, 0.5)'])[0];
            const nums = one.replace(col, '').replace('inset', '').trim().split(/\s+/).map(parseFloat).filter(function (n) { return !isNaN(n); });
            return { inset: inset, dx: nums[0] || 0, dy: nums[1] || 0, blur: (nums[2] || 0) / 2, color: toHex8(col) || '#00000080' };
        });
    }

    /* ---------- Reading the CSS: every rule counts, whatever its name ---------- */
    // Plain declarations and rules like .highlight { ... } or :root { --c: red } all style the element; rules
    // with ::before / ::after style those; @media/@supports blocks are read inside; nested rules work too.
    // -> { main: 'decls', before: 'decls' or null, after: 'decls' or null }
    function parseRules(css) {
        const src = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
        const list = []; // { t: target, d: declarations, spec, n: order }
        const seen = { main: true };
        const add = function (t, d, spec) { d = String(d).replace(/[{}]/g, '').trim(); seen[t] = true; if (d) list.push({ t: t, d: d, spec: spec, n: list.length }); };
        function targets(sel, def, base) {
            const out = {};
            splitTop(sel).forEach(function (part) {
                const t = /::?before\b/i.test(part) ? 'before' : /::?after\b/i.test(part) ? 'after' : /::[a-z-]+/i.test(part) ? null : def;
                if (!t) return;
                const sp = base + specOf(part);
                // (several selectors in one rule: the strongest one counts, as it would on a page)
                if (!(t in out) || sp > out[t]) out[t] = sp;
            });
            return out;
        }
        function walk(s, def, base) {
            let i = 0, pending = '', q = null;
            while (i < s.length) {
                const c = s[i];
                if (q) { pending += c; if (c === '\\') { pending += s[i + 1] || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
                if (c === '"' || c === "'") { q = c; pending += c; i++; continue; }
                if (c === '}') { i++; continue; }
                if (c !== '{') { pending += c; i++; continue; }
                // a block: find its closing brace
                let depth = 1, j = i + 1, q2 = null;
                for (; j < s.length && depth; j++) {
                    const d = s[j];
                    if (q2) { if (d === '\\') j++; else if (d === q2) q2 = null; continue; }
                    if (d === '"' || d === "'") q2 = d; else if (d === '{') depth++; else if (d === '}') depth--;
                }
                const body = s.slice(i + 1, depth ? j : j - 1);
                const cut = pending.lastIndexOf(';');
                if (cut >= 0) add(def, pending.slice(0, cut + 1), base);
                const head = pending.slice(cut + 1).trim();
                pending = '';
                i = j;
                if (/^@/.test(head)) { if (/^@(media|supports|layer|container|scope|document)\b/i.test(head)) walk(body, def, base); continue; }
                const ts = targets(head, def, base);
                Object.keys(ts).forEach(function (t) { seen[t] = true; if (/\{/.test(body)) walk(body, t, ts[t]); else add(t, body, ts[t]); });
            }
            if (pending.trim()) add(def, pending, base);
        }
        walk(src, 'main', 0);
        // like a browser: the more specific rule wins, and between equals the later one
        list.sort(function (x, y) { return x.spec - y.spec || x.n - y.n; });
        const join = function (t) { return list.filter(function (e) { return e.t === t; }).map(function (e) { return /;\s*$/.test(e.d) ? e.d : e.d + ';'; }).join('\n'); };
        // a var(--name) that is never set counts as none (so var(--cap), linear-gradient(...) keeps its gradient,
        // where a browser would throw the whole line away)
        const all = list.map(function (e) { return e.d; }).join('\n');
        const defined = {}, missing = [];
        all.replace(/(^|[;\s{])--([\w-]+)\s*:/g, function (m, p, n) { defined[n] = true; return m; });
        all.replace(/var\(\s*--([\w-]+)\s*\)/g, function (m, n) { if (!defined[n] && missing.indexOf(n) < 0) missing.push(n); return m; });
        const pre = missing.map(function (n) { return '--' + n + ': none;'; }).join('');
        return { main: pre + join('main'), before: seen.before ? join('before') : null, after: seen.after ? join('after') : null };
    }
    // Selector specificity as one number: ids, then classes / attributes / pseudo-classes, then element names
    function specOf(sel) {
        let s = String(sel).replace(/:where\((?:[^()]|\([^()]*\))*\)/gi, ' ').replace(/:(?:is|not|has|matches)\(((?:[^()]|\([^()]*\))*)\)/gi, ' $1 ');
        const ids = (s.match(/#[\w-]+/g) || []).length;
        const attrs = (s.match(/\[[^\]]*\]/g) || []).length;
        s = s.replace(/\[[^\]]*\]/g, ' ');
        const classes = (s.match(/\.[\w-]+/g) || []).length + (s.match(/(?<!:):(?!:)(?!before\b|after\b)[\w-]+/gi) || []).length;
        const elems = (s.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length + (s.match(/::?(?:before|after)\b|::[\w-]+/gi) || []).length;
        return ids * 10000 + (classes + attrs) * 100 + elems;
    }
    // the text in content: "..." (several strings join; \2605 escapes work); none/normal = no box at all
    function contentText(decls) {
        let v = null;
        String(decls || '').replace(/(?:^|;|\n)\s*content\s*:\s*((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^;"'])*)/gi, function (m, val) { v = val.trim(); return m; });
        if (v === null) return '';
        if (/^(none|normal)\b/i.test(v)) return null;
        let out = '';
        v.replace(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g, function (m, a, b) { out += a !== undefined ? a : b; return m; });
        return out.replace(/\\([0-9a-fA-F]{1,6})\s?/g, function (m, h) { return String.fromCodePoint(parseInt(h, 16)); }).replace(/\\(.)/g, '$1');
    }
    const BASE = 'display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;white-space:pre;font-family:"JetBrains Mono",monospace;';
    // The CSS as a stylesheet for one class: real ::before/::after (the preview), or stand-in spans (measuring)
    function scopedCss(R, sel, real) {
        let out = sel + ' {' + BASE + R.main + '}\n';
        ['before', 'after'].forEach(function (k) {
            if (R[k] === null) return;
            if (real) out += sel + '::' + k + ' {' + (/(^|[;\n])\s*content\s*:/i.test(R[k]) ? '' : 'content: "";') + R[k] + '}\n';
            else out += sel + ' > .c2s-p' + k + ' {' + R[k] + '}\n';
        });
        return out;
    }
    // "calc(100% - 4.1px)", "50%", "12px" -> px, with % of ref
    function evalLen(v, ref) {
        const e = String(v).trim().replace(/calc\(/g, '(').replace(/(-?[\d.]+(?:e-?\d+)?)%/g, function (m, n) { return '(' + n + '*' + ref + '/100)'; }).replace(/(\d)px/g, '$1');
        if (!/^[\d.\s+\-*/()e]*$/.test(e)) return NaN;
        try { return Function('"use strict";return (' + e + ')')(); } catch (err) { return NaN; }
    }
    // splits "calc(100% - 2px) 50%" at its top-level spaces
    function words(s) {
        const out = []; let depth = 0, cur = '';
        for (const ch of String(s).trim()) {
            if (ch === '(') depth++;
            if (ch === ')') depth--;
            if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
        }
        if (cur) out.push(cur);
        return out;
    }
    let seq = 0;
    // A styled copy of the CSS off screen: the element, its text, and stand-ins for ::before / ::after
    function stage(css, text) {
        const R = parseRules(css);
        const cls = 'c2s-m' + (++seq);
        const style = document.createElement('style');
        style.textContent = scopedCss(R, '.' + cls, false);
        document.head.appendChild(style);
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-5000px;top:0;visibility:hidden;';
        const el = document.createElement('div');
        el.className = cls;
        const parts = {};
        ['before', 'after'].forEach(function (k) {
            if (R[k] === null) return;
            const t = contentText(R[k]);
            if (t === null) return;
            const sp = document.createElement('span');
            sp.className = 'c2s-p' + k;
            sp.textContent = t;
            parts[k] = sp;
        });
        if (parts.before) el.appendChild(parts.before);
        const textNode = document.createTextNode(text || '');
        el.appendChild(textNode);
        if (parts.after) el.appendChild(parts.after);
        host.appendChild(el);
        document.body.appendChild(host);
        return { el: el, parts: parts, textNode: textNode, done: function () { host.remove(); style.remove(); } };
    }
    function readTransform(cs) {
        const m = String(cs.transform || 'none').match(/matrix\(([^)]+)\)/);
        if (!m) return { rot: 0, dx: 0, dy: 0 };
        const v = m[1].split(',').map(parseFloat);
        return { rot: Math.round(Math.atan2(v[1], v[0]) * 18000 / Math.PI) / 100, dx: v[4] || 0, dy: v[5] || 0 };
    }
    // One box's measurements (the element or a stand-in), relative to the element's top-left corner
    function measurePart(node, textNode, origin, isMain) {
        const r = node.getBoundingClientRect();
        const cs = getComputedStyle(node);
        let textLeft = null, textWidth = 0, textTop = null, textHeight = 0;
        if (textNode && textNode.nodeValue) {
            const range = document.createRange();
            range.selectNodeContents(textNode);
            const tr = range.getBoundingClientRect();
            if (tr.width) { textLeft = tr.left - r.left; textWidth = tr.width; textTop = tr.top - r.top; textHeight = tr.height; }
        }
        const minSize = isMain ? 4 : 0;
        // every corner's own radius (x and y: 50% on a long box is an oval corner); CSS shrinks them all if they overlap
        const rr = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(function (k) {
            const v = words(cs['border' + k + 'Radius'] || '0');
            return { x: Math.max(0, evalLen(v[0] || '0', r.width) || 0), y: Math.max(0, evalLen(v[1] || v[0] || '0', r.height) || 0) };
        });
        const fit = Math.min(1, r.width / ((rr[0].x + rr[1].x) || 1e9), r.width / ((rr[3].x + rr[2].x) || 1e9), r.height / ((rr[0].y + rr[3].y) || 1e9), r.height / ((rr[1].y + rr[2].y) || 1e9));
        const radii = rr.map(function (c) { return { x: c.x * fit, y: c.y * fit }; });
        // border-radius: 50% means half the box, not 50px!
        const rawR = String(cs.borderTopLeftRadius).split(' ')[0];
        const radiusPx = /%$/.test(rawR) ? parseFloat(rawR) / 100 * Math.min(r.width, r.height) : parseFloat(rawR) || 0;
        return {
            ox: r.left - origin.left, oy: r.top - origin.top, realW: r.width, realH: r.height,
            w: Math.max(minSize, r.width), h: Math.max(minSize, r.height),
            radius: Math.min(radiusPx, Math.min(r.width, r.height) / 2), radii: radii, textLeft: textLeft, textWidth: textWidth, textTop: textTop, textHeight: textHeight,
            bgColor: cs.backgroundColor, bgImage: cs.backgroundImage,
            bgSize: splitTop(cs.backgroundSize || 'auto'), bgPos: splitTop(cs.backgroundPosition || '0% 0%'), bgRepeat: splitTop(cs.backgroundRepeat || 'repeat'), bgOrigin: splitTop(cs.backgroundOrigin || 'padding-box'),
            borderW: cs.borderTopStyle === 'none' ? 0 : (parseFloat(cs.borderTopWidth) || 0), borderColor: cs.borderTopColor,
            bw: ['Top', 'Right', 'Bottom', 'Left'].map(function (k) { return cs['border' + k + 'Style'] === 'none' ? 0 : (parseFloat(cs['border' + k + 'Width']) || 0); }),
            pad: ['Top', 'Right', 'Bottom', 'Left'].map(function (k) { return parseFloat(cs['padding' + k]) || 0; }),
            clips: splitTop(cs.backgroundClip || 'border-box'),
            outlineW: cs.outlineStyle === 'none' ? 0 : (parseFloat(cs.outlineWidth) || 0), outlineColor: cs.outlineColor, outlineOffset: parseFloat(cs.outlineOffset) || 0,
            shadows: parseShadows(cs.boxShadow), textShadows: parseShadows(cs.textShadow),
            opacity: parseFloat(cs.opacity), color: cs.color, fontSize: parseFloat(cs.fontSize) || 16,
            fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), fontWeight: cs.fontWeight, textAlign: cs.textAlign,
            blur: ((cs.filter || '').match(/blur\(([\d.]+)px\)/) || [0, 0])[1],
            zIndex: parseInt(cs.zIndex, 10) || 0, hidden: cs.display === 'none' // (visibility is hidden on the whole off-screen copy, so it can't count)
        };
    }
    function measure(css, text) {
        const S = stage(css, text);
        try { return measurePart(S.el, S.textNode, S.el.getBoundingClientRect(), true); } finally { S.done(); }
    }

    /* ---------- Turn the measurements into Inkpath objects ---------- */
    // Corner radii [top-left, top-right, bottom-right, bottom-left] as {x, y}, pulled in by insets (or pushed out)
    function insetRadii(r, t, rt, b, l) {
        const f = function (v, d) { return v > 0 ? Math.max(0, v - d) : 0; };
        return [{ x: f(r[0].x, l), y: f(r[0].y, t) }, { x: f(r[1].x, rt), y: f(r[1].y, t) }, { x: f(r[2].x, rt), y: f(r[2].y, b) }, { x: f(r[3].x, l), y: f(r[3].y, b) }];
    }
    // A rounded box with its own radius at every corner (each corner can be oval) as Inkpath path nodes
    function roundedNodes(x, y, w, h, r) {
        const k = 0.5522847498, tl = r[0], tr = r[1], br = r[2], bl = r[3];
        const S = { x: x + tl.x, y: y };
        const segs = [
            [S.x, S.y, x + w - tr.x, y, x + w - tr.x, y],
            [x + w - tr.x + k * tr.x, y, x + w, y + tr.y - k * tr.y, x + w, y + tr.y],
            [x + w, y + tr.y, x + w, y + h - br.y, x + w, y + h - br.y],
            [x + w, y + h - br.y + k * br.y, x + w - br.x + k * br.x, y + h, x + w - br.x, y + h],
            [x + w - br.x, y + h, x + bl.x, y + h, x + bl.x, y + h],
            [x + bl.x - k * bl.x, y + h, x, y + h - bl.y + k * bl.y, x, y + h - bl.y],
            [x, y + h - bl.y, x, y + tl.y, x, y + tl.y],
            [x, y + tl.y - k * tl.y, x + tl.x - k * tl.x, y, S.x, S.y]
        ];
        const nodes = [{ x: S.x, y: S.y, cx1: S.x, cy1: S.y, cx2: segs[0][0], cy2: segs[0][1] }];
        segs.forEach(function (g, i) { const nx = segs[i + 1]; nodes.push({ x: g[4], y: g[5], cx1: g[2], cy1: g[3], cx2: nx ? nx[0] : g[4], cy2: nx ? nx[1] : g[5] }); });
        const first = nodes[0], last = nodes[nodes.length - 1];
        first.cx1 = last.cx1; first.cy1 = last.cy1; last.cx2 = first.cx2; last.cy2 = first.cy2;
        return nodes;
    }
    // A box shape with corners: an even round rectangle, a true ellipse (corners meeting in the middle), or a path
    function finishBox(s) {
        const r = s._r;
        delete s._r;
        if (!r || s.type !== 'rect') return s;
        const near = function (a, b) { return Math.abs(a - b) < 0.01; };
        if (r.every(function (c) { return near(c.x, r[0].x) && near(c.y, r[0].y); }) && near(r[0].x, r[0].y)) { s.rx = r[0].x; return s; }
        if (r.every(function (c) { return near(c.x, s.width / 2) && near(c.y, s.height / 2); })) {
            const e = Object.assign({}, s, { type: 'ellipse', cx: s.x + s.width / 2, cy: s.y + s.height / 2, rx: s.width / 2, ry: s.height / 2 });
            delete e.x; delete e.y; delete e.width; delete e.height;
            return e;
        }
        const p = Object.assign({}, s, { type: 'path', pathMode: 'bezier', nodes: roundedNodes(s.x, s.y, s.width, s.height, r) });
        delete p.x; delete p.y; delete p.width; delete p.height; delete p.rx;
        return p;
    }
    // A conic gradient: fine wedges of color around its centre, clipped to the box
    function conicShape(g, box, base) {
        const cx = box.x + g.cx, cy = box.y + g.cy;
        const R = Math.max(Math.hypot(box.x - cx, box.y - cy), Math.hypot(box.x + box.width - cx, box.y - cy), Math.hypot(box.x - cx, box.y + box.height - cy), Math.hypot(box.x + box.width - cx, box.y + box.height - cy)) + 2;
        const N = 120, dir = function (deg) { const a = deg * Math.PI / 180; return { x: cx + R * Math.sin(a), y: cy - R * Math.cos(a) }; };
        const P = function (p) { return { x: p.x, y: p.y, cx1: p.x, cy1: p.y, cx2: p.x, cy2: p.y }; };
        const wedges = [];
        let k = 0;
        while (k < N) {
            const c = colorAt(g.stops, (k + 0.5) / N);
            let j = k + 1;
            while (j < N && colorAt(g.stops, (j + 0.5) / N) === c) j++; // (one wedge for a run of the same color)
            const a = g.from + k * 360 / N, b = g.from + j * 360 / N + (j < N ? 0.6 : 0); // (a hair of overlap: no seams)
            const pts = [P({ x: cx, y: cy })];
            for (let t = 0; t <= Math.ceil((b - a) / 30); t++) pts.push(P(dir(a + (b - a) * t / Math.ceil((b - a) / 30))));
            pts.push(P({ x: cx, y: cy }));
            wedges.push({ type: 'path', pathMode: 'bezier', nodes: pts, fillType: 'color', fill: c, fill2: c, strokeType: 'none', stroke: '#00000000', strokeWidth: 0, opacity: 1, blur: 0, rotation: 0 });
            k = j;
        }
        const clip = finishBox(Object.assign({}, base, box, { fillType: 'color', fill: '#000000ff' }));
        return { type: 'clip', clip: clip, children: wedges, opacity: 1, rotation: 0, blur: 0 };
    }
    // The shapes for one box (background layers, border, outline, shadows) at x0, y0 (no label)
    function boxShapes(M, x0, y0, isMain) {
        const shapes = [];
        const base = { type: 'rect', x: x0, y: y0, width: M.w, height: M.h, _r: M.radii, strokeType: 'none', stroke: '#ffffff00', stroke2: '#38bdf8ff', strokeAngle: 0, strokeWidth: 0, opacity: 1, blur: 0, rotation: 0, fill2: '#38bdf8ff', fillAngle: 0 };
        // Each background layer paints only inside its background-clip box (border-box,
        // padding-box or content-box), with the corners rounded to match!
        function clipBox(clip) {
            const b = M.bw, p = M.pad;
            const ins = clip === 'content-box' ? [b[0] + p[0], b[1] + p[1], b[2] + p[2], b[3] + p[3]] : clip === 'padding-box' ? b : [0, 0, 0, 0];
            const w = Math.max(1, M.w - ins[1] - ins[3]), h = Math.max(1, M.h - ins[0] - ins[2]);
            return { x: x0 + ins[3], y: y0 + ins[0], width: w, height: h, _r: insetRadii(M.radii, ins[0], ins[1], ins[2], ins[3]) };
        }
        if (!(M.w > 0 && M.h > 0)) return shapes;
        // where one background layer really paints: its background-size at its background-position, when it does not
        // repeat (a repeating one fills its whole clip box, as before)
        function layerBox(i, clip) {
            const cb = clipBox(clip);
            const at = function (list) { return list.length ? list[i % list.length] : ''; };
            const rw = words(at(M.bgRepeat || []) || 'repeat');
            const rpt = rw[0] === 'repeat-x' ? [true, false] : rw[0] === 'repeat-y' ? [false, true] : [rw[0] !== 'no-repeat', (rw[1] || rw[0]) !== 'no-repeat'];
            const ob = clipBox(at(M.bgOrigin || []) || 'padding-box');
            const sz = words(at(M.bgSize || []) || 'auto');
            let w = ob.width, h = ob.height;
            if (sz[0] && !/^(auto|cover|contain)$/.test(sz[0])) { w = evalLen(sz[0], ob.width); h = sz[1] && sz[1] !== 'auto' ? evalLen(sz[1], ob.height) : h; }
            const ps = words(at(M.bgPos || []) || '0% 0%');
            const x = ob.x + evalLen(ps[0] || '0%', ob.width - w), y = ob.y + evalLen(ps[1] || ps[0] || '0%', ob.height - h);
            if (!(isFinite(w) && isFinite(h) && isFinite(x) && isFinite(y)) || !(w > 0.5 && h > 0.5)) return cb;
            // (a layer the size of its own box is one shape, even though CSS would repeat it under the border)
            if ((rpt[0] || rpt[1]) && Math.abs(w - ob.width) < 0.01 && Math.abs(h - ob.height) < 0.01) return cb;
            if (rpt[0] || rpt[1]) {
                // a repeating layer: tiles of w x h across the clip box (a layer that fills the box is one tile)
                const xs = [], ys = [];
                if (rpt[0]) for (let tx = x - Math.ceil((x - cb.x) / w) * w; tx < cb.x + cb.width - 0.01 && xs.length < 200; tx += w) xs.push(tx); else xs.push(x);
                if (rpt[1]) for (let ty = y - Math.ceil((y - cb.y) / h) * h; ty < cb.y + cb.height - 0.01 && ys.length < 200; ty += h) ys.push(ty); else ys.push(y);
                if (xs.length * ys.length <= 1 && Math.abs(w - cb.width) < 0.01 && Math.abs(h - cb.height) < 0.01) return cb;
                if (xs.length * ys.length > 400) return cb;
                const tiles = [];
                ys.forEach(function (ty) { xs.forEach(function (tx) { tiles.push({ x: tx, y: ty, width: w, height: h, _r: null }); }); });
                return Object.assign({}, cb, { tiles: tiles, gw: w, gh: h });
            }
            // only the part inside the clip box shows
            const x1 = Math.max(x, cb.x), y1 = Math.max(y, cb.y), x2 = Math.min(x + w, cb.x + cb.width), y2 = Math.min(y + h, cb.y + cb.height);
            if (x2 - x1 <= 0.01 || y2 - y1 <= 0.01) return null;
            const full = Math.abs(x1 - cb.x) < 0.01 && Math.abs(y1 - cb.y) < 0.01 && Math.abs(x2 - cb.x - cb.width) < 0.01 && Math.abs(y2 - cb.y - cb.height) < 0.01;
            return { x: x1, y: y1, width: x2 - x1, height: y2 - y1, _r: full ? cb._r : null, gw: w, gh: h };
        }
        const layers = (M.bgImage && M.bgImage !== 'none') ? splitTop(M.bgImage) : [];
        const clipOf = function (i) { return M.clips[Math.min(i, M.clips.length - 1)] || 'border-box'; };
        // Bottom layer first: the background color (it uses the LAST clip), then images from back to front!
        if (alphaOf(M.bgColor) > 0) shapes.push(Object.assign({}, base, clipBox(clipOf(layers.length ? layers.length - 1 : 0)), { fillType: 'color', fill: toHex8(M.bgColor), name: 'Background' }));
        layers.map(function (layer, i) { return { layer: layer, clip: clipOf(i), i: i }; }).reverse().forEach(function (L, i, all) {
            const box = layerBox(L.i, L.clip);
            if (!box) return;
            const g = parseGradient(L.layer, box.gw || box.width, box.gh || box.height);
            delete box.gw; delete box.gh;
            if (!g) return;
            const name = (all.length > 1 ? (i === all.length - 1 ? 'Gloss' : 'Gradient ' + (i + 1)) : 'Gradient') + (L.clip !== 'border-box' ? ' (' + L.clip.replace('-box', '') + ')' : '');
            if (box.tiles) {
                // tiles: each one painted, all clipped to the (rounded) box
                const tiles = box.tiles;
                delete box.tiles;
                const kids = tiles.map(function (t) {
                    if (g.type === 'conic') return conicShape(g, t, base);
                    const flat1 = g.stops.every(function (st) { return st.c === g.stops[0].c; });
                    const f1 = flat1 ? { fillType: 'color', fill: g.stops[0].c } : { fillType: g.type, fill: g.stops[0].c, fill2: g.stops[g.stops.length - 1].c, fillStops: g.stops, fillAngle: g.angle, fillScale: g.scale };
                    if (!flat1 && g.radial) f1.fillRadial = g.radial;
                    return finishBox(Object.assign({}, base, t, f1));
                });
                const clip = finishBox(Object.assign({}, base, box, { fillType: 'color', fill: '#000000ff' }));
                shapes.push({ type: 'clip', clip: clip, children: kids, opacity: 1, rotation: 0, blur: 0, name: name + ' (' + kids.length + ' tiles)' });
                return;
            }
            if (g.type === 'conic') { shapes.push(Object.assign(conicShape(g, box, base), { name: name + ' (conic)' })); return; }
            // a flat gradient (one color, like linear-gradient(white, white)) is just a color!
            const flat = g.stops.every(function (st) { return st.c === g.stops[0].c; });
            const fill = flat ? { fillType: 'color', fill: g.stops[0].c } : { fillType: g.type, fill: g.stops[0].c, fill2: g.stops[g.stops.length - 1].c, fillStops: g.stops, fillAngle: g.angle, fillScale: g.scale };
            if (!flat && g.radial) fill.fillRadial = g.radial;
            shapes.push(Object.assign({}, base, box, fill, { name: name }));
        });
        if (!shapes.length && isMain) shapes.push(Object.assign({}, base, { fillType: 'none', fill: '#00000000', name: 'Box' }));
        // Shadows go on the bottom shape, the border becomes the top shape's stroke!
        const drop = M.shadows.find(function (s) { return !s.inset; });
        const inner = M.shadows.find(function (s) { return s.inset; });
        if (!shapes.length && (drop || inner)) shapes.push(Object.assign({}, base, { fillType: 'color', fill: '#ffffff00', name: 'Shadow' }));
        if (drop && shapes.length) shapes[0].effects = Object.assign(shapes[0].effects || {}, { drop: { dx: drop.dx, dy: drop.dy, blur: drop.blur, color: drop.color } });
        if (inner && shapes.length) shapes[shapes.length - 1].effects = Object.assign(shapes[shapes.length - 1].effects || {}, { inner: { dx: inner.dx, dy: inner.dy, blur: inner.blur, color: inner.color } });
        if (M.borderW > 0 && alphaOf(M.borderColor) > 0) {
            const top = shapes[shapes.length - 1];
            const bw = M.borderW;
            // CSS borders sit INSIDE the box; SVG strokes straddle the edge, so inset by half!
            const ring = Object.assign({}, base, { x: x0 + bw / 2, y: y0 + bw / 2, width: Math.max(1, M.w - bw), height: Math.max(1, M.h - bw), _r: insetRadii(M.radii, bw / 2, bw / 2, bw / 2, bw / 2), fillType: 'none', fill: '#00000000', strokeType: 'color', stroke: toHex8(M.borderColor), strokeWidth: bw, name: 'Border' });
            if (top && top.type === 'rect' && top.fillType === 'none') Object.assign(top, ring); else shapes.push(ring);
        }
        if (M.outlineW > 0 && alphaOf(M.outlineColor) > 0) {
            const ow = M.outlineW, out = M.outlineOffset + ow / 2;
            shapes.push(Object.assign({}, base, { x: x0 - out, y: y0 - out, width: M.w + out * 2, height: M.h + out * 2, _r: insetRadii(M.radii, -out, -out, -out, -out), fillType: 'none', fill: '#00000000', strokeType: 'color', stroke: toHex8(M.outlineColor), strokeWidth: ow, name: 'Outline' }));
        }
        shapes.forEach(function (s) {
            if (M.opacity < 1) s.opacity = M.opacity;
            if (+M.blur) s.blur = +M.blur;
        });
        return shapes.map(finishBox);
    }
    // The text, with its middle exactly where the browser put the text's middle!
    function labelShape(M, x0, y0, text) {
        const ts = M.textShadows[0];
        const tx = M.textLeft !== null ? x0 + M.textLeft + M.textWidth / 2 : x0 + M.w / 2;
        const ty = M.textTop !== null ? y0 + M.textTop + M.textHeight / 2 + M.fontSize * 0.35 : y0 + M.h / 2 + M.fontSize * 0.35;
        const t = { type: 'text', text: text, fontSize: M.fontSize, fontFamily: M.fontFamily || 'JetBrains Mono', fontWeight: M.fontWeight, textAlign: 'middle', x: tx, y: ty, fill: toHex8(M.color) || '#000000ff', fillType: 'color', stroke: '#ffffff00', strokeType: 'none', strokeWidth: 0, opacity: M.opacity < 1 ? M.opacity : 1, blur: 0, rotation: 0, name: 'Label' };
        if (ts) t.effects = { drop: { dx: ts.dx, dy: ts.dy, blur: ts.blur, color: ts.color } };
        return t;
    }
    // Turns a shape by deg about the point P (as seen), whatever point Inkpath turns that kind of shape about
    function turnAbout(s, deg, P) {
        const bb = shapeBBox(s), local = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
        const r0 = s.rotation || 0;
        const was = rotPt(r0 ? rotPt(local, r0, getCenter(s)) : local, deg, P);
        s.rotation = Math.round((r0 + deg) * 100) / 100;
        const now = rotPt(local, s.rotation, getCenter(s));
        moveObject(s, was.x - now.x, was.y - now.y);
    }
    function convert(css, text, x0, y0) {
        const S = stage(css, text);
        try {
            const nodes = [S.el, S.parts.before, S.parts.after].filter(Boolean);
            // transforms are read first, then switched off so every box is measured upright
            const tf = nodes.map(function (n) { return readTransform(getComputedStyle(n)); });
            nodes.forEach(function (n) { n.style.transform = 'none'; });
            const origin = S.el.getBoundingClientRect();
            const M = measurePart(S.el, S.textNode, origin, true);
            const mainTf = tf[0];
            const below = [];
            const main = boxShapes(M, x0, y0, true);
            const label = text ? [labelShape(M, x0, y0, text)] : [];
            const pseudo = { before: [], after: [] };
            ['before', 'after'].forEach(function (k) {
                const sp = S.parts[k];
                if (!sp) return;
                const P = measurePart(sp, sp.firstChild, origin, false);
                if (P.hidden) return;
                const px = x0 + P.ox, py = y0 + P.oy;
                const list = boxShapes(P, px, py, false);
                if (sp.textContent) list.push(labelShape(P, px, py, sp.textContent));
                const own = tf[nodes.indexOf(sp)];
                const mid = { x: px + P.w / 2, y: py + P.h / 2 };
                list.forEach(function (s) {
                    s.name = (k === 'before' ? '::before ' : '::after ') + (s.name || '');
                    if (M.opacity < 1) s.opacity = (s.opacity === undefined ? 1 : s.opacity) * M.opacity;
                    if (own.rot) turnAbout(s, own.rot, mid);
                    if (own.dx || own.dy) moveObject(s, own.dx, own.dy);
                });
                // (a ::before/::after with a negative z-index sits under the element's own background)
                if (P.zIndex < 0) below.push.apply(below, list); else pseudo[k].push.apply(pseudo[k], list);
            });
            const shapes = below.concat(main, pseudo.before, label, pseudo.after);
            // the element's own transform turns everything (its ::before/::after turn with it)
            if (mainTf.rot || mainTf.dx || mainTf.dy) {
                const mid = { x: x0 + M.w / 2, y: y0 + M.h / 2 };
                shapes.forEach(function (s) {
                    if (mainTf.rot) turnAbout(s, mainTf.rot, mid);
                    if (mainTf.dx || mainTf.dy) moveObject(s, mainTf.dx, mainTf.dy);
                });
            }
            const bounds = unionBBox(shapes.map(shapeBBox));
            return { shapes: shapes, w: M.w, h: M.h, bounds: bounds };
        } finally { S.done(); }
    }

    /* ---------- A tiny painter for the live SVG preview ---------- */
    function paint(svg, shapes) {
        const NS = 'http://www.w3.org/2000/svg';
        svg.innerHTML = '';
        const defs = document.createElementNS(NS, 'defs');
        svg.appendChild(defs);
        let n = 0;
        function geom(s) {
            let el;
            if (s.type === 'text') {
                el = document.createElementNS(NS, 'text');
                el.textContent = s.text;
                el.setAttribute('x', s.x); el.setAttribute('y', s.y);
                el.setAttribute('font-size', s.fontSize); el.setAttribute('font-family', s.fontFamily); el.setAttribute('font-weight', s.fontWeight);
                el.setAttribute('text-anchor', s.textAlign);
            } else if (s.type === 'ellipse') {
                el = document.createElementNS(NS, 'ellipse');
                el.setAttribute('cx', s.cx); el.setAttribute('cy', s.cy); el.setAttribute('rx', s.rx); el.setAttribute('ry', s.ry);
            } else if (s.type === 'path') {
                el = document.createElementNS(NS, 'path');
                el.setAttribute('d', buildPathData(s.nodes));
            } else {
                el = document.createElementNS(NS, 'rect');
                el.setAttribute('x', s.x); el.setAttribute('y', s.y); el.setAttribute('width', s.width); el.setAttribute('height', s.height); el.setAttribute('rx', s.rx || 0);
            }
            if (s.rotation) { const c = getCenter(s); el.setAttribute('transform', 'rotate(' + s.rotation + ' ' + c.x + ' ' + c.y + ')'); }
            return el;
        }
        function one(s, parent) {
            const i = n++;
            if (s.type === 'clip') {
                const cp = document.createElementNS(NS, 'clipPath');
                cp.id = 'c2s-c' + i;
                cp.appendChild(geom(s.clip));
                defs.appendChild(cp);
                const g = document.createElementNS(NS, 'g');
                g.setAttribute('clip-path', 'url(#' + cp.id + ')');
                if (s.opacity < 1) g.setAttribute('opacity', s.opacity);
                if (typeof buildFxFilterInto === 'function') { const f = buildFxFilterInto(defs, 'c2s-f' + i, s.blur || 0, s.effects); if (f) g.setAttribute('filter', f); }
                s.children.forEach(function (c) { one(c, g); });
                parent.appendChild(g);
                return;
            }
            let fill = 'none';
            if (s.fillType === 'color') fill = s.fill;
            else if (s.fillType === 'linear' || s.fillType === 'radial') {
                const g = document.createElementNS(NS, s.fillType === 'linear' ? 'linearGradient' : 'radialGradient');
                g.id = 'c2s-g' + i;
                if (s.fillType === 'linear' && typeof applyGradientAngle === 'function') applyGradientAngle(g, s.fillAngle, s.fillScale);
                if (s.fillType === 'radial' && s.fillRadial && typeof applyRadialShape === 'function') applyRadialShape(g, s.fillRadial);
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
            const el = geom(s);
            el.setAttribute('fill', fill.length === 9 && fill[0] === '#' ? fill.slice(0, 7) : fill);
            if (fill.length === 9 && fill[0] === '#') el.setAttribute('fill-opacity', parseInt(fill.slice(7), 16) / 255);
            if (s.strokeType === 'color' && s.strokeWidth) { el.setAttribute('stroke', s.stroke.slice(0, 7)); el.setAttribute('stroke-opacity', parseInt(s.stroke.slice(7, 9) || 'ff', 16) / 255); el.setAttribute('stroke-width', s.strokeWidth); }
            if (s.opacity < 1) el.setAttribute('opacity', s.opacity);
            if (typeof buildFxFilterInto === 'function') {
                const f = buildFxFilterInto(defs, 'c2s-f' + i, s.blur || 0, s.effects);
                if (f) el.setAttribute('filter', f);
            }
            parent.appendChild(el);
        }
        shapes.forEach(function (s) { one(s, svg); });
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
            '<p class="c2s-sub">Paste CSS (just the declarations, or whole rules like <code>.highlight { … }</code>: their names do not matter: every rule styles this one thing) and get real, editable Inkpath shapes! Backgrounds, gradients, borders, rounding, box-shadows, text, <code>var(--…)</code> variables and <code>::before</code> / <code>::after</code> all convert!</p>' +
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
    let liveStyle = null;
    function update() {
        const css = dlg.querySelector('#c2s-css').value;
        const text = dlg.querySelector('#c2s-text').value;
        const html = dlg.querySelector('#c2s-html');
        html.innerHTML = '';
        // the CSS preview is the real thing: every rule, variables, ::before and ::after
        if (!liveStyle) { liveStyle = document.createElement('style'); document.head.appendChild(liveStyle); }
        try { liveStyle.textContent = scopedCss(parseRules(css), '.c2s-live', true); } catch (e) { liveStyle.textContent = ''; }
        const el = document.createElement('div');
        el.className = 'c2s-live';
        el.textContent = text;
        html.appendChild(el);
        let res;
        try { res = convert(css, text, 20, 20); } catch (e) { dlg.querySelector('#c2s-msg').textContent = 'Could not read that CSS!'; return; }
        const svg = dlg.querySelector('#c2s-svg');
        const b = res.bounds, pad = 20;
        svg.setAttribute('viewBox', Math.floor(b.x - pad) + ' ' + Math.floor(b.y - pad) + ' ' + Math.ceil(b.w + pad * 2) + ' ' + Math.ceil(b.h + pad * 2));
        svg.setAttribute('width', Math.min(320, b.w + pad * 2));
        paint(svg, res.shapes);
        dlg.querySelector('#c2s-count').textContent = '(' + res.shapes.length + ' shape' + (res.shapes.length === 1 ? '' : 's') + ')';
        dlg.querySelector('#c2s-msg').textContent = '';
    }
    function insert() {
        const css = dlg.querySelector('#c2s-css').value;
        const text = dlg.querySelector('#c2s-text').value;
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
        // (the middle of everything, ::before and ::after included)
        const res = convert(css, text, 0, 0), b = res.bounds;
        const dx = Math.round(cx - (b.x + b.w / 2)), dy = Math.round(cy - (b.y + b.h / 2));
        res.shapes.forEach(function (s) { moveObject(s, dx, dy); });
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
