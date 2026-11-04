/* =====================================================================
   Bitbook's Annotate skill: draw right on the note, over the letters!
   Five inks in 16 colors (the 13 Annotate colors plus White, Fog and Black):
     Gel Ink      the Gel Underline (#R#text#_) as a pen: a deep edge, a light-to-color gel core and a gloss on top,
                  following your hand at any angle, smoothed as it goes
     Felt Pen     a crisp line in the deep shade of the color
     Highlighter  a wide see-through marker that tints the text under it
     Neon         a bright tube with a soft glow
     Crayon       a waxy, slightly rough stroke
   The drawing lives in the note itself (an <svg class="an-ink-layer" contenteditable="false">, holding every stroke in data-ink),
   so it saves, reloads and travels in .kd files (as @@ink="...") with the rest of the note.
   ===================================================================== */
(function () {
    'use strict';
    // [name, color, deep edge, light] — the Gel Underline's own colors (annotate-hl.css)
    const COLORS = [['red', '#ef4444', '#dc2626', '#f9b4b4'], ['orange', '#f97316', '#ea580c', '#fdc7a2'], ['gold', '#ea9f08', '#ca8a04', '#f7d99c'], ['yellow', '#ead708', '#caa604', '#f7ef9c'],
        ['lime', '#84cc16', '#65a30d', '#ceeba2'], ['green', '#10b981', '#059669', '#9fe3cd'], ['turquoise', '#30e5cd', '#26b1a5', '#acf5eb'], ['teal', '#06b6d4', '#0891b2', '#9be2ee'],
        ['cyan', '#30d3e5', '#26a3b1', '#acedf5'], ['blue', '#3b82f6', '#2563eb', '#b1cdfb'], ['purple', '#a855f7', '#9333ea', '#dcbbfc'], ['pink', '#ec4899', '#db2777', '#f7b6d6'], ['slate', '#b4b4b4', '#6f6f6f', '#e1e1e1']];
    const COLOR = {};
    COLORS.forEach((c) => { COLOR[c[0]] = c; });
    const INKS = [['gel', 'Gel Ink'], ['pen', 'Felt Pen'], ['marker', 'Highlighter'], ['neon', 'Neon'], ['crayon', 'Crayon']];
    const SIZES = [['s', 'Small', 0.6], ['m', 'Medium', 1], ['l', 'Large', 1.7]];
    // each ink's base width at Medium
    // Theme Packs: each pack is a set of ink styles, and every style is drawn in the color you pick
    const PACKS = [
        ['aero', 'Frutiger Aero', [['aero-tube', 'Glass Tube'], ['aero-bubbles', 'Bubble Trail'], ['aero-aurora', 'Glossy Orb'], ['aero-sky', 'Aero Chip']]],
        ['pool', 'Poolside', [['pool-water', 'Water'], ['pool-tile', 'Swirl Lolly'], ['pool-rope', 'Refraction'], ['pool-ripple', 'Reflection Shine']]],
        ['aero2', 'Frutiger Aero 2', [['aero2-pearl', 'Glossy Pearl'], ['aero2-vista', 'Vista Glow'], ['aero2-brackets', 'Gel Brackets'], ['aero2-rings', 'Ring Wallpaper']]],
        ['pool2', 'Poolside 2', [['pool2-mist', 'Mist Glow'], ['pool2-chevron', 'Lane Chevrons'], ['pool2-outline', 'Outline Pill'], ['pool2-deck', 'Diagonal Deck']]],
        ['aero3', 'Frutiger Aero 3', [['aero3-jelly', 'Jelly Tube'], ['aero3-silver', 'Silver Chrome Pill'], ['aero3-ribbons', 'Twisted Ribbons'], ['aero3-streak', 'Light Streak']]],
        ['pool3', 'Poolside 3', [['pool3-glitter', 'Glitter Water'], ['pool3-dapple', 'Sun Dapples'], ['pool3-checker', 'Checker Border'], ['pool3-ombre', 'Pool Ombre']]],
        ['aero4', 'Frutiger Aero 4', [['aero4-peek', 'Peek Panel'], ['aero4-trio', 'Bubble Trio'], ['aero4-glow', 'Glow Tube'], ['aero4-aurora', 'Aurora Bar']]],
        ['pool4', 'Poolside 4', [['pool4-wavelet', 'Wavelet Edge'], ['pool4-current', 'Current Lines'], ['pool4-gloss', 'Wet Gloss'], ['pool4-tape', 'Caution Tape']]],
        ['cosmic', 'Cosmic', [['cosmic-galaxy', 'Galaxy'], ['cosmic-comet', 'Comet'], ['cosmic-stars', 'Stars'], ['cosmic-nebula', 'Nebula']]],
        ['metal', 'Metallic', [['metal-foil', 'Foil'], ['metal-chain', 'Chain'], ['metal-wire', 'Wire'], ['metal-rivet', 'Rivets']]]
    ];
    const STYLE_NAME = {};
    PACKS.forEach((pk) => pk[2].forEach((st) => { STYLE_NAME[st[0]] = [pk[1], st[1], pk[0]]; }));
    const BASE = { gel: 9, pen: 2.6, marker: 18, neon: 3.2, crayon: 6,
        'aero-tube': 11, 'aero-bubbles': 9, 'aero-aurora': 14, 'aero-sky': 12, 'pool-water': 12, 'pool-tile': 10, 'pool-rope': 9, 'pool-ripple': 10,
        'vapor-glow': 4, 'vapor-grid': 12, 'vapor-chrome': 9, 'vapor-sunset': 10, 'candy-stripe': 9, 'candy-sprinkles': 12, 'candy-gummy': 12, 'candy-ribbon': 9,
        'cosmic-galaxy': 10, 'cosmic-comet': 4, 'cosmic-stars': 10, 'cosmic-nebula': 10, 'metal-foil': 8, 'metal-chain': 8, 'metal-wire': 5, 'metal-rivet': 10,
        'aero2-pearl': 12, 'aero2-vista': 12, 'aero2-brackets': 12, 'aero2-rings': 12, 'pool2-mist': 12, 'pool2-chevron': 12, 'pool2-outline': 12, 'pool2-deck': 12,
        'aero3-jelly': 12, 'aero3-silver': 12, 'aero3-ribbons': 12, 'aero3-streak': 8, 'pool3-glitter': 12, 'pool3-dapple': 12, 'pool3-checker': 12, 'pool3-ombre': 12,
        'aero4-peek': 12, 'aero4-trio': 10, 'aero4-glow': 8, 'aero4-aurora': 12, 'pool4-wavelet': 12, 'pool4-current': 12, 'pool4-gloss': 12, 'pool4-tape': 12,
        // (the first themed inks, still drawn in notes that use them)
        aero: 11, pool: 12, vapor: 4, mint: 9, galaxy: 10, rainbow: 8, lava: 8, gold: 8 };
    const NS = 'http://www.w3.org/2000/svg';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    /* ---------- drawing a stroke ---------- */
    // a smooth path through the points (quadratic curves between their midpoints)
    function pathOf(pts) {
        if (!pts.length) return '';
        const r = (n) => Math.round(n * 10) / 10;
        if (pts.length === 1) return 'M' + r(pts[0][0]) + ' ' + r(pts[0][1]) + 'l0.1 0';
        let d = 'M' + r(pts[0][0]) + ' ' + r(pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
            d += 'Q' + r(pts[i][0]) + ' ' + r(pts[i][1]) + ' ' + r(mx) + ' ' + r(my);
        }
        const last = pts[pts.length - 1];
        return d + 'L' + r(last[0]) + ' ' + r(last[1]);
    }
    const n = (v) => Math.max(0.1, v).toFixed(1);
    // a row of round dots along the path (a dash of length 0 with round caps is a dot)
    const dots = (d, color, size, gap, offset, extra) => line(d, color, size, ' stroke-dasharray="0 ' + n(gap) + '"' + (offset ? ' stroke-dashoffset="' + n(offset) + '"' : '') + (extra || ''));
    // a color run for one pack style in one color (defined right in the stroke, so every color gets its own)
    const gid = (k, c) => 'url(#ank-' + k + '-' + c[0] + ')';
    const lg = (k, c, stops, span) => '<defs>' + grad(k + '-' + c[0], stops, span).replace('id="ank-t-', 'id="ank-') + '</defs>';
    // A stroke's length along its path (good enough to place things a set distance from its ends)
    function pathLen(d) {
        let len = 0, x = 0, y = 0;
        const re = /([MLQl])([^MLQl]*)/g;
        let m;
        while ((m = re.exec(String(d)))) {
            const v = (m[2].match(/-?\d*\.?\d+/g) || []).map(Number);
            if (m[1] === 'M') { x = v[0]; y = v[1]; }
            else if (m[1] === 'L') { len += Math.hypot(v[0] - x, v[1] - y); x = v[0]; y = v[1]; }
            else if (m[1] === 'l') { len += Math.hypot(v[0], v[1]); x += v[0]; y += v[1]; }
            else if (m[1] === 'Q') {
                // a curve: measured along 8 short pieces of it
                let px = x, py = y;
                for (let k = 1; k <= 8; k++) {
                    const t = k / 8, u = 1 - t;
                    const qx = u * u * x + 2 * u * t * v[0] + t * t * v[2], qy = u * u * y + 2 * u * t * v[1] + t * t * v[3];
                    len += Math.hypot(qx - px, qy - py); px = qx; py = qy;
                }
                x = v[2]; y = v[3];
            }
        }
        return len;
    }
    // the path drawn only between two set distances from its ends (a dash that starts at one inset and ends at the other)
    function trim(d, color, width, inset, extra) {
        const len = pathLen(d), span = Math.max(0.1, len - inset * 2);
        return line(d, color, width, ' stroke-dasharray="' + span.toFixed(1) + ' ' + (len + inset * 4 + 10).toFixed(1) + '" stroke-dashoffset="' + (-inset).toFixed(1) + '"' + (extra || ''));
    }
    // just the two ends of the path, each a set length (skip trims that much off the very tips)
    function caps(d, color, width, size, extra, skip) {
        const len = pathLen(d), k = skip || 0, cap = Math.min(size, Math.max(0.1, len / 2 - k));
        return line(d, color, width, ' stroke-dasharray="' + cap.toFixed(1) + ' ' + Math.max(0.1, len - 2 * cap - 2 * k).toFixed(1) + ' ' + cap.toFixed(1) + ' ' + (len + 10).toFixed(1) + '" stroke-dashoffset="' + (-k).toFixed(1) + '"' + (extra || ''));
    }
    // A real gradient across a stroke's thickness (top to bottom), made of n stacked bands: each band runs from its
    // starting point down to the stroke's bottom edge, a little lighter (or darker) than the one before, so they blend
    // smoothly. from/to are where the blend starts and ends (0 = top edge, 1 = bottom edge).
    function bands(d, w, from, to, c1, c2, n) {
        let out = '';
        const bottom = w / 2;
        for (let k = 0; k <= n; k++) {
            const f = n ? k / n : 0, at = from + (to - from) * f;
            const top = -w / 2 + w * at, h = bottom - top;
            if (h <= 0.05) break;
            const shift = (top + bottom) / 2;
            out += line(d, blend(c1, c2, f), h, ' stroke-linecap="round" transform="translate(0 ' + shift.toFixed(2) + ')"');
        }
        return out;
    }
    const blend = (a, b, f) => '#' + [1, 3, 5].map((i) => { const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16); return Math.round(x + (y - x) * f).toString(16).padStart(2, '0'); }).join('');
    // a shade of a color: k of the way from it to black
    const dark = (hex, k) => '#' + [1, 3, 5].map((i) => { const v = parseInt(hex.slice(i, i + 2), 16); return Math.round(v * (1 - k)).toString(16).padStart(2, '0'); }).join('');
    let maskN = 0;
    // a tint of a color: k of the way from it to white
    const mix = (hex, k) => '#' + [1, 3, 5].map((i) => { const v = parseInt(hex.slice(i, i + 2), 16); return Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); }).join('');
    const up = (w, k) => ' transform="translate(0 ' + (-w * k).toFixed(2) + ')"';
    // (round ends unless a style asks for its own: a repeated attribute would be ignored, keeping the first)
    const line = (d, color, width, extra) => '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '"' +
        (/stroke-linecap=/.test(extra || '') ? '' : ' stroke-linecap="round"') + ' stroke-linejoin="round"' + (extra || '') + '/>';
    // the inside of one stroke's <g>, by ink
    function strokeSvg(s) {
        const c = COLOR[s.c] || COLOR.red, w = s.w, d = s.d;
        switch (s.t) {
            case 'gel': // the Gel Underline, as a tube: deep edge, gel core (light shading toward the top), gloss
                return line(d, c[2], w) + line(d, c[1], w * 0.64) + line(d, c[3], w * 0.26, ' transform="translate(0 ' + (-w * 0.13).toFixed(2) + ')" opacity="0.9"') +
                    line(d, '#ffffff', w * 0.16, ' transform="translate(0 ' + (-w * 0.2).toFixed(2) + ')" opacity="0.5"');
            case 'pen':
                return line(d, c[2], w);
            case 'marker':
                return line(d, c[1], w, ' opacity="0.38" style="mix-blend-mode:multiply"');
            case 'neon':
                return line(d, c[1], w * 5, ' opacity="0.75" filter="url(#ank-glow)"') + line(d, c[1], w * 2.4, ' opacity="0.6" filter="url(#ank-glow-in)"') +
                    line(d, c[1], w * 1.5) + line(d, c[3], w * 0.7) + line(d, '#ffffff', w * 0.3, ' opacity="0.85"');
            case 'crayon':
                return line(d, c[1], w, ' opacity="0.88" filter="url(#ank-wax)"') + line(d, c[3], w * 0.3, ' opacity="0.35" stroke-dasharray="1 3" filter="url(#ank-wax)"');
            /* ---- Theme Packs (each style in the picked color: c[1] color, c[2] deep edge, c[3] light) ---- */
            case 'aero-tube':
                return lg('aero', c, [c[3], c[1], c[3], '#ffffff']) + line(d, c[2], w) + line(d, gid('aero', c), w * 0.72) + line(d, '#ffffff', w * 0.22, up(w, 0.2) + ' opacity="0.7"') +
                    dots(d, '#ffffff', w * 0.3, w * 2.2, 0, ' opacity="0.85"');
            case 'aero-bubbles':
                return dots(d, c[2], w * 0.95, w * 2.3, 0) + dots(d, c[1], w * 0.78, w * 2.3, 0) + dots(d, c[3], w * 0.45, w * 2.3, 0, ' transform="translate(0 ' + (w * 0.1).toFixed(2) + ')"') +
                    dots(d, '#ffffff', w * 0.26, w * 2.3, 0, ' transform="translate(' + (-w * 0.16).toFixed(2) + ' ' + (-w * 0.16).toFixed(2) + ')"');
            case 'aero-aurora': // Glossy Orb (the gallery's Frutiger Aero 1): a deep, dark glossy pill: dark rim, rich core, a broad pale gloss on top,
                // a bright glow along the bottom, a white ring and a shadow
                return line(d, 'rgba(0,0,0,0.35)', w * 1.1, ' transform="translate(0 ' + (w * 0.1).toFixed(2) + ')" filter="url(#ank-glow-in)"') + line(d, 'rgba(255,255,255,0.55)', w * 1.16) +
                    line(d, dark(c[1], 0.72), w) + line(d, dark(c[1], 0.55), w * 0.9) + line(d, dark(c[1], 0.35), w * 0.62) +
                    line(d, c[1], w * 0.32, ' transform="translate(0 ' + (w * 0.24).toFixed(2) + ')" opacity="0.8" filter="url(#ank-glow-in)"') +
                    line(d, mix(c[1], 0.35), w * 0.14, ' transform="translate(0 ' + (w * 0.27).toFixed(2) + ')" opacity="0.6" filter="url(#ank-glow-in)"') +
                    line(d, '#ffffff', w * 0.34, up(w, 0.25) + ' opacity="0.6"');
            case 'aero-sky': { // Aero Chip: the Aero Chip (++R+text++) as a pen: its border gradient (dark at the top, lighter at the bottom),
                // its fill (the color down to 59%, blending into a light tint by 87%), the shine along the top, and the shadow
                const e1 = dark(c[1], 0.5), e2 = dark(c[1], 0.2), light = mix(c[1], 0.45), fw = w * 0.78;
                return line(d, 'rgba(150,150,150,0.55)', w, ' transform="translate(0 ' + (w * 0.16).toFixed(2) + ')"') +
                    bands(d, w, 0, 1, e1, e2, 10) +                // the border: a gradient from top to bottom of the whole stroke
                    bands(d, fw, 0, 1, c[1], c[1], 1) +           // the fill's solid top
                    bands(d, fw, 0.59, 0.87, c[1], light, 9) +    // ...blending into the light tint
                    // the shine stops a set distance short of both ends (measured in the stroke's own width, so it keeps up as the line grows)
                    trim(d, '#ffffff', w * 0.3, w * 0.55, up(w, 0.17) + ' opacity="0.8"');
            }
            case 'pool-water':
                return lg('pool', c, [c[1], c[3], c[1]]) + line(d, '#ffffff', w * 1.08, ' opacity="0.9"') + line(d, c[2], w) + line(d, gid('pool', c), w * 0.8) +
                    line(d, '#ffffff', w * 0.12, ' stroke-dasharray="' + n(w * 0.9) + ' ' + n(w * 0.7) + '"' + up(w, 0.15) + ' opacity="0.75"') +
                    line(d, '#ffffff', w * 0.08, ' stroke-dasharray="' + n(w * 0.5) + ' ' + n(w * 1.1) + '" stroke-dashoffset="' + n(w * 0.6) + '" transform="translate(0 ' + (w * 0.18).toFixed(2) + ')" opacity="0.6"');
            // Poolside's other three take after the gallery's Swirl Lolly, Refraction and Reflection Shine, in your one color
            case 'pool-tile': { // Swirl Lolly: pale diagonal stripes in tints of the color, with white between, inside a full-color outline
                const id = 'ank-lolly-' + c[0], t1 = mix(c[1], 0.45), t2 = mix(c[1], 0.22);
                return '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(-60)">' +
                    '<rect width="12" height="12" fill="#ffffff"/><rect width="4" height="12" fill="' + t1 + '"/><rect x="6" width="4" height="12" fill="' + t2 + '"/></pattern></defs>' +
                    line(d, c[1], w * 1.14) + line(d, 'url(#' + id + ')', w * 0.86);
            }
            case 'pool-rope': { // Refraction: light-to-color water with slanted bands of light crossing it
                const id = 'ank-refract-' + c[0];
                return '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="46" height="46" patternTransform="rotate(10)">' +
                    '<rect x="9" width="5" height="46" fill="#ffffff" fill-opacity="0.5"/><rect x="25" width="3" height="46" fill="#ffffff" fill-opacity="0.35"/></pattern></defs>' +
                    line(d, c[1], w) + line(d, mix(c[1], 0.5), w * 0.55, up(w, 0.2) + ' opacity="0.85"') + line(d, 'url(#' + id + ')', w) +
                    line(d, c[2], w * 0.12, ' transform="translate(0 ' + (w * 0.42).toFixed(2) + ')" opacity="0.5"');
            }
            case 'pool-ripple': // Reflection Shine: the color with a flat white shine over its top half and a soft glow along the bottom
                return line(d, c[1], w) + line(d, mix(c[1], 0.85), w * 0.3, ' transform="translate(0 ' + (w * 0.28).toFixed(2) + ')" opacity="0.6" filter="url(#ank-glow-in)"') +
                    line(d, '#ffffff', w * 0.46, up(w, 0.24) + ' opacity="0.6"');
            case 'vapor-glow':
                return lg('vapor', c, [c[1], c[3], '#ffffff', c[3]]) + line(d, c[1], w * 4.5, ' opacity="0.7" filter="url(#ank-glow)"') + line(d, gid('vapor', c), w * 1.6) + line(d, '#ffffff', w * 0.4, ' opacity="0.8"');
            case 'vapor-grid':
                return line(d, c[1], w * 1.4, ' opacity="0.35" filter="url(#ank-glow-in)"') + line(d, c[1], w * 0.7, ' stroke-linecap="butt" stroke-dasharray="' + n(w * 0.1) + ' ' + n(w * 0.55) + '"') +
                    line(d, c[3], w * 0.12, up(w, 0.35)) + line(d, c[3], w * 0.12, ' transform="translate(0 ' + (w * 0.35).toFixed(2) + ')"');
            case 'vapor-chrome':
                return lg('chrome', c, ['#ffffff', c[3], c[1], c[2], c[3]], 36) + line(d, c[2], w) + line(d, gid('chrome', c), w * 0.78) + line(d, '#ffffff', w * 0.16, up(w, 0.2) + ' opacity="0.9"');
            case 'vapor-sunset':
                return line(d, c[2], w * 0.34, ' transform="translate(0 ' + (w * 0.33).toFixed(2) + ')"') + line(d, c[1], w * 0.34) + line(d, c[3], w * 0.34, up(w, 0.33)) +
                    line(d, '#ffffff', w * 0.12, up(w, 0.55) + ' opacity="0.7"');
            case 'candy-stripe':
                return line(d, c[2], w * 1.06) + line(d, '#ffffff', w * 0.88) + line(d, c[1], w * 0.88, ' stroke-linecap="butt" stroke-dasharray="' + n(w * 0.7) + ' ' + n(w * 0.7) + '"') +
                    line(d, '#ffffff', w * 0.2, up(w, 0.2) + ' opacity="0.6"');
            case 'candy-sprinkles':
                return dots(d, c[1], w * 0.32, w * 1.3, 0, up(w, 0.25)) + dots(d, c[3], w * 0.28, w * 1.5, w * 0.6, ' transform="translate(0 ' + (w * 0.2).toFixed(2) + ')"') +
                    dots(d, c[2], w * 0.26, w * 1.7, w * 0.3) + dots(d, '#ffffff', w * 0.22, w * 1.9, w * 1.1, ' transform="translate(0 ' + (w * 0.35).toFixed(2) + ')"');
            case 'candy-gummy':
                return line(d, c[2], w * 1.04, ' opacity="0.45"') + line(d, c[1], w * 0.9, ' opacity="0.6"') + line(d, c[3], w * 0.5, ' opacity="0.6"') + line(d, '#ffffff', w * 0.2, up(w, 0.22) + ' opacity="0.85"');
            case 'candy-ribbon':
                return line(d, c[2], w * 1.05) + line(d, c[1], w * 0.85) + line(d, c[3], w * 0.25, up(w, 0.22) + ' opacity="0.7"') +
                    line(d, '#ffffff', w * 0.09, ' stroke-dasharray="' + n(w * 0.35) + ' ' + n(w * 0.28) + '" opacity="0.9"');
            case 'cosmic-galaxy':
                return lg('galaxy', c, [c[2], c[1], '#1e1b4b', c[3]]) + line(d, '#1e1b4b', w) + line(d, gid('galaxy', c), w * 0.78) +
                    dots(d, '#ffffff', w * 0.18, w * 1.7, 0, up(w, 0.15)) + dots(d, '#fde68a', w * 0.12, w * 2.6, w * 1.1, ' transform="translate(0 ' + (w * 0.2).toFixed(2) + ')"');
            case 'cosmic-comet':
                return line(d, c[1], w * 3.6, ' opacity="0.55" filter="url(#ank-glow)"') + line(d, c[3], w * 1.4) + line(d, '#ffffff', w * 0.55) + dots(d, '#ffffff', w * 0.5, w * 4, 0, ' opacity="0.8" filter="url(#ank-glow-in)"');
            case 'cosmic-stars':
                return dots(d, c[1], w * 0.6, w * 2.2, 0, ' opacity="0.45" filter="url(#ank-glow-in)"') + dots(d, c[3], w * 0.45, w * 2.2, 0) + dots(d, '#ffffff', w * 0.22, w * 2.2, 0) +
                    dots(d, c[3], w * 0.14, w * 1.4, w * 0.7, up(w, 0.3));
            case 'cosmic-nebula':
                return line(d, c[1], w * 2.6, ' opacity="0.35" filter="url(#ank-glow)"') + line(d, c[3], w * 1.4, ' opacity="0.45" filter="url(#ank-glow-in)"') + dots(d, '#ffffff', w * 0.12, w * 1.3, 0, ' opacity="0.8"');
            case 'metal-foil':
                return lg('foil', c, [c[3], c[2], '#ffffff', c[1]], 90) + line(d, c[2], w) + line(d, gid('foil', c), w * 0.76) + line(d, '#ffffff', w * 0.2, up(w, 0.2) + ' opacity="0.8"');
            case 'metal-chain':
                return line(d, c[2], w * 0.95, ' stroke-dasharray="' + n(w * 1.2) + ' ' + n(w * 0.55) + '"') + line(d, c[3], w * 0.5, ' stroke-dasharray="' + n(w * 1.2) + ' ' + n(w * 0.55) + '"') +
                    line(d, '#ffffff', w * 0.15, ' stroke-dasharray="' + n(w * 0.7) + ' ' + n(w * 1.05) + '"' + up(w, 0.2) + ' opacity="0.7"');
            case 'metal-wire':
                return line(d, c[2], w * 0.5) + line(d, c[1], w * 0.32) + line(d, '#ffffff', w * 0.12, up(w, 0.08) + ' opacity="0.8"');
            case 'metal-rivet':
                return lg('rivet', c, [c[3], c[1], c[3]], 60) + line(d, c[2], w, ' stroke-linecap="butt"') + line(d, gid('rivet', c), w * 0.8, ' stroke-linecap="butt"') +
                    dots(d, c[2], w * 0.34, w * 1.5, w * 0.4) + dots(d, '#ffffff', w * 0.12, w * 1.5, w * 0.4, up(w, 0.06));
            /* ---- Frutiger Aero 2 and Poolside 2 (after the gallery's styles of the same names) ---- */
            case 'aero2-pearl': // Glossy Pearl: a white pearl tinted with the color, a white ring, a color glow below and a bright gloss
                return line(d, c[1], w * 1.5, ' opacity="0.3" filter="url(#ank-glow-in)"') + line(d, 'rgba(255,255,255,0.7)', w * 1.16) + line(d, mix(c[1], 0.45), w) +
                    line(d, mix(c[1], 0.7), w * 0.9) + line(d, '#ffffff', w * 0.5, ' opacity="0.85"') +
                    line(d, c[1], w * 0.3, ' transform="translate(0 ' + (w * 0.26).toFixed(2) + ')" opacity="0.5" filter="url(#ank-glow-in)"') + line(d, '#ffffff', w * 0.42, up(w, 0.2) + ' opacity="0.95"');
            case 'aero2-vista': // Vista Glow: a deep glassy tube, a faint sheen over its top half and a glow rising from the bottom
                return line(d, dark(c[1], 0.6), w * 1.06) + line(d, dark(c[1], 0.35), w) + line(d, c[1], w * 0.6, ' opacity="0.7"') +
                    line(d, mix(c[1], 0.55), w * 0.42, ' transform="translate(0 ' + (w * 0.2).toFixed(2) + ')" opacity="0.85" filter="url(#ank-glow-in)"') +
                    line(d, '#ffffff', w * 0.46, up(w, 0.24) + ' opacity="0.22"');
            case 'aero2-brackets': // Gel Brackets: a pale body between two glossy gel caps (each cap a set length, whatever the stroke's length)
                return line(d, mix(c[1], 0.5), w * 1.08) + line(d, mix(c[1], 0.9), w) +
                    caps(d, c[1], w, w * 1.1, '') +
                    caps(d, '#ffffff', w * 0.36, w * 0.75, up(w, 0.2) + ' opacity="0.85"', w * 0.15);
            case 'aero2-rings': { // Ring Wallpaper: a run from deep to bright color, scattered with white rings
                const id = 'ank-rings-' + c[0];
                return lg('ringrun', c, [dark(c[1], 0.3), c[1], mix(c[1], 0.25)], 70) +
                    '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="44" height="30"><g fill="none" stroke="#ffffff">' +
                    '<circle cx="5" cy="8" r="4" stroke-width="1" stroke-opacity="0.4"/><circle cx="17" cy="22" r="5" stroke-width="1" stroke-opacity="0.35"/>' +
                    '<circle cx="29" cy="7" r="3" stroke-width="1" stroke-opacity="0.4"/><circle cx="39" cy="20" r="6" stroke-width="1" stroke-opacity="0.3"/></g></pattern></defs>' +
                    line(d, 'rgba(0,0,0,0.15)', w * 1.05, ' transform="translate(0 ' + (w * 0.1).toFixed(2) + ')"') + line(d, gid('ringrun', c), w) + line(d, 'url(#' + id + ')', w);
            }
            case 'pool2-mist': // Mist Glow: a pale, misty band with a thin rim and a soft halo of the color
                return line(d, c[1], w * 1.6, ' opacity="0.45" filter="url(#ank-glow-in)"') + line(d, mix(c[1], 0.6), w * 1.06) + line(d, mix(c[1], 0.94), w);
            case 'pool2-chevron': { // Lane Chevrons: a solid band with see-through chevrons marching along it
                const id = 'ank-chev-' + c[0];
                return '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="10" height="12"><path d="M2 0L7 6L2 12" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.35"/></pattern></defs>' +
                    line(d, c[1], w) + line(d, 'url(#' + id + ')', w);
            }
            case 'pool2-outline': { // Outline Pill: just the outline, see-through in the middle (a mask cuts the inside out)
                const id = 'ank-out-' + (++maskN);
                return '<defs><mask id="' + id + '" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="12000" height="40000">' + line(d, '#ffffff', w) + line(d, '#000000', w * 0.7) + '</mask></defs>' +
                    line(d, c[1], w, ' mask="url(#' + id + ')"');
            }
            case 'pool2-deck': { // Diagonal Deck: slanted deck planks in tints of the color, over a solid edge along the bottom
                const id = 'ank-deck-' + c[0];
                return '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(55)">' +
                    '<rect width="7" height="7" fill="' + mix(c[1], 0.6) + '"/><rect x="6" width="1" height="7" fill="' + mix(c[1], 0.3) + '"/></pattern></defs>' +
                    line(d, 'url(#' + id + ')', w) + line(d, c[1], w * 0.2, ' transform="translate(0 ' + (w * 0.46).toFixed(2) + ')"');
            }
            /* ---- Frutiger Aero 3, Poolside 3, Frutiger Aero 4 and Poolside 4 (after the gallery's styles of the same names) ---- */
            case 'aero3-jelly': // Jelly Tube: a fat translucent jelly, a bright core, a gloss on top and glints
                return line(d, dark(c[1], 0.3), w * 1.04, ' opacity="0.85"') + line(d, c[1], w * 0.86, ' opacity="0.9"') +
                    line(d, mix(c[1], 0.5), w * 0.46, ' transform="translate(0 ' + (w * 0.12).toFixed(2) + ')" opacity="0.7" filter="url(#ank-glow-in)"') +
                    line(d, '#ffffff', w * 0.22, up(w, 0.24) + ' opacity="0.8"') + dots(d, '#ffffff', w * 0.14, w * 2.4, w * 0.5, ' transform="translate(' + (-w * 0.12).toFixed(2) + ' ' + (w * 0.1).toFixed(2) + ')" opacity="0.8"');
            case 'aero3-silver': // Silver Chrome Pill: brushed chrome from bright to dark, tinted with the color, in a thin edge of the color
                return line(d, c[2], w * 1.06) + bands(d, w, 0, 1, '#f7f9fb', '#6f7c88', 10) + bands(d, w * 0.9, 0.5, 1, mix(c[1], 0.7), c[1], 6) +
                    line(d, '#ffffff', w * 0.14, up(w, 0.28) + ' opacity="0.9"');
            case 'aero3-ribbons': // Twisted Ribbons: two ribbons of the color crossing over each other along the stroke
                return line(d, c[2], w) + line(d, c[1], w * 0.82, ' stroke-linecap="butt" stroke-dasharray="' + n(w * 1.5) + ' ' + n(w * 1.5) + '"') +
                    line(d, c[3], w * 0.82, ' stroke-linecap="butt" stroke-dasharray="' + n(w * 1.5) + ' ' + n(w * 1.5) + '" stroke-dashoffset="' + n(w * 1.5) + '"') +
                    line(d, '#ffffff', w * 0.18, up(w, 0.22) + ' opacity="0.5"');
            case 'aero3-streak': // Light Streak: a hot white core inside a soft colored glow
                return line(d, c[1], w * 3.4, ' opacity="0.55" filter="url(#ank-glow)"') + line(d, c[1], w * 1.6, ' opacity="0.85"') + line(d, mix(c[1], 0.6), w * 0.9) + line(d, '#ffffff', w * 0.4);
            case 'pool3-glitter': // Glitter Water: a water-colored band flecked with white glitter
                return line(d, c[2], w) + line(d, c[1], w * 0.86) + line(d, mix(c[1], 0.4), w * 0.3, up(w, 0.18) + ' opacity="0.6"') +
                    dots(d, '#ffffff', w * 0.12, w * 0.8, 0, ' opacity="0.9"') + dots(d, mix(c[1], 0.8), w * 0.09, w * 1.1, w * 0.45, ' transform="translate(0 ' + (w * 0.2).toFixed(2) + ')"') +
                    dots(d, '#ffffff', w * 0.07, w * 1.3, w * 0.7, ' transform="translate(0 ' + (-w * 0.22).toFixed(2) + ')" opacity="0.8"');
            case 'pool3-dapple': // Sun Dapples: the color with soft pools of sunlight floating over it
                return line(d, c[1], w) + dots(d, 'rgba(255,255,255,0.38)', w * 0.62, w * 1.7, 0, ' filter="url(#ank-glow-in)"') +
                    dots(d, 'rgba(255,255,255,0.3)', w * 0.4, w * 1.7, w * 0.85, ' transform="translate(0 ' + (w * 0.15).toFixed(2) + ')" filter="url(#ank-glow-in)"') + line(d, c[2], w * 0.12, ' transform="translate(0 ' + (w * 0.46).toFixed(2) + ')" opacity="0.6"');
            case 'pool3-checker': { // Checker Border: a checkerboard of the color and white, like pool-edge tile
                const id = 'ank-chk-' + c[0];
                return '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="12" height="12"><rect width="12" height="12" fill="#ffffff"/><rect width="6" height="6" fill="' + c[1] + '"/><rect x="6" y="6" width="6" height="6" fill="' + c[1] + '"/></pattern></defs>' +
                    line(d, c[2], w * 1.12, ' stroke-linecap="butt"') + line(d, 'url(#' + id + ')', w * 0.88, ' stroke-linecap="butt"');
            }
            case 'pool3-ombre': // Pool Ombre: from pale at the top of the stroke to deep at the bottom, with a bright shine
                return line(d, c[2], w * 1.04) + bands(d, w, 0, 1, mix(c[1], 0.7), dark(c[1], 0.25), 12) + line(d, '#ffffff', w * 0.16, up(w, 0.26) + ' opacity="0.7"');
            case 'aero4-peek': // Peek Panel: clear Aero glass: a white rim, a faint tint, a diagonal gloss
                return line(d, c[2], w * 1.1, ' opacity="0.7"') + line(d, 'rgba(255,255,255,0.92)', w) + line(d, c[1], w * 0.88, ' opacity="0.32"') +
                    line(d, '#ffffff', w * 0.36, up(w, 0.2) + ' opacity="0.55"') + line(d, c[1], w * 0.26, ' transform="translate(0 ' + (w * 0.24).toFixed(2) + ')" opacity="0.35" filter="url(#ank-glow-in)"');
            case 'aero4-trio': // Bubble Trio: bubbles in threes (big, middle, small) drifting along the stroke
                return dots(d, c[2], w * 0.96, w * 3.4, 0) + dots(d, c[1], w * 0.78, w * 3.4, 0) + dots(d, c[2], w * 0.66, w * 3.4, w * 1.15) + dots(d, c[1], w * 0.5, w * 3.4, w * 1.15) +
                    dots(d, c[2], w * 0.44, w * 3.4, w * 2.1) + dots(d, c[3], w * 0.32, w * 3.4, w * 2.1) +
                    dots(d, '#ffffff', w * 0.26, w * 3.4, 0, ' transform="translate(' + (-w * 0.16).toFixed(2) + ' ' + (-w * 0.16).toFixed(2) + ')"');
            case 'aero4-glow': // Glow Tube: a glass tube lit from inside, with a halo
                return line(d, c[1], w * 3, ' opacity="0.45" filter="url(#ank-glow)"') + line(d, c[2], w * 1.1) + line(d, c[1], w * 0.86) + line(d, mix(c[1], 0.55), w * 0.5) + line(d, '#ffffff', w * 0.24, up(w, 0.2) + ' opacity="0.85"');
            case 'aero4-aurora': { // Aurora Bar: a ribbon that shifts from the color to white and back along its length
                return lg('aur4', c, [c[1], mix(c[1], 0.55), '#ffffff', mix(c[1], 0.45), c[1]], 110) + line(d, 'rgba(0,0,0,0.12)', w * 1.06, ' transform="translate(0 ' + (w * 0.08).toFixed(2) + ')"') +
                    line(d, c[2], w) + line(d, gid('aur4', c), w * 0.84) + line(d, '#ffffff', w * 0.22, up(w, 0.22) + ' opacity="0.6"');
            }
            case 'pool4-wavelet': // Wavelet Edge: a water band with a row of little scallops along its bottom edge
                return lg('wvl', c, [c[3], c[1], c[2]]) + line(d, gid('wvl', c), w * 0.9) + dots(d, '#ffffff', w * 0.3, w * 0.52, 0, ' transform="translate(0 ' + (w * 0.4).toFixed(2) + ')" opacity="0.92"') +
                    line(d, '#ffffff', w * 0.12, up(w, 0.22) + ' opacity="0.6"');
            case 'pool4-current': { // Current Lines: a solid band with pale lines streaming along it
                const id = 'ank-cur-' + c[0];
                return '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(100)"><rect width="9" height="9" fill="' + c[1] + '"/><rect width="1.4" height="9" fill="#ffffff" fill-opacity="0.32"/></pattern></defs>' +
                    line(d, c[2], w * 1.06) + line(d, 'url(#' + id + ')', w * 0.9);
            }
            case 'pool4-gloss': // Wet Gloss: a glossy band with a wet white sheen across its top half
                return line(d, 'rgba(0,0,0,0.12)', w * 1.04, ' transform="translate(0 ' + (w * 0.08).toFixed(2) + ')"') + line(d, c[2], w) + line(d, c[1], w * 0.86) +
                    line(d, mix(c[1], 0.5), w * 0.28, ' transform="translate(0 ' + (w * 0.2).toFixed(2) + ')" opacity="0.7" filter="url(#ank-glow-in)"') + line(d, '#ffffff', w * 0.44, up(w, 0.2) + ' opacity="0.55"');
            case 'pool4-tape': { // Caution Tape: slanted stripes of the color and its deep shade
                const id = 'ank-tape-' + c[0];
                return '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(-45)"><rect width="14" height="14" fill="' + c[1] + '"/><rect width="7" height="14" fill="' + dark(c[2], 0.45) + '"/></pattern></defs>' +
                    line(d, dark(c[2], 0.5), w * 1.06, ' stroke-linecap="butt"') + line(d, 'url(#' + id + ')', w * 0.9, ' stroke-linecap="butt"');
            }
            /* ---- the first themed inks (fixed colors), still drawn in notes that use them ---- */
            case 'aero': // Frutiger Aero: a glossy sky-to-grass glass tube with bubbles drifting along it
                return line(d, '#0369a1', w) + line(d, 'url(#ank-t-aero)', w * 0.72) + line(d, '#ffffff', w * 0.22, up(w, 0.2) + ' opacity="0.7"') +
                    line(d, '#ffffff', w * 0.3, ' stroke-dasharray="0 ' + (w * 2.2).toFixed(1) + '" opacity="0.85"') +
                    line(d, '#e0f7ff', w * 0.16, ' stroke-dasharray="0 ' + (w * 1.6).toFixed(1) + '" stroke-dashoffset="' + (w * 0.9).toFixed(1) + '" transform="translate(0 ' + (w * 0.18).toFixed(2) + ')" opacity="0.9"');
            case 'pool': // Poolside: clear aqua water with light dancing across it, edged in pool tile
                return line(d, '#ffffff', w * 1.08, ' opacity="0.9"') + line(d, '#0891b2', w) + line(d, 'url(#ank-t-pool)', w * 0.8) +
                    line(d, '#ffffff', w * 0.12, ' stroke-dasharray="' + (w * 0.9).toFixed(1) + ' ' + (w * 0.7).toFixed(1) + '" transform="translate(0 ' + (-w * 0.15).toFixed(2) + ')" opacity="0.75"') +
                    line(d, '#ecfeff', w * 0.08, ' stroke-dasharray="' + (w * 0.5).toFixed(1) + ' ' + (w * 1.1).toFixed(1) + '" stroke-dashoffset="' + (w * 0.6).toFixed(1) + '" transform="translate(0 ' + (w * 0.18).toFixed(2) + ')" opacity="0.65"');
            case 'vapor': // Vaporwave: a sunset glow running pink to purple to cyan
                return line(d, 'url(#ank-t-vapor)', w * 4.5, ' opacity="0.7" filter="url(#ank-glow)"') + line(d, 'url(#ank-t-vapor)', w * 1.6) + line(d, '#ffffff', w * 0.4, ' opacity="0.8"');
            case 'mint': // Peppermint: a candy stripe with a shine
                return line(d, '#b91c1c', w * 1.06) + line(d, '#ffffff', w * 0.88) +
                    line(d, '#ef4444', w * 0.88, ' stroke-linecap="butt" stroke-dasharray="' + (w * 0.7).toFixed(1) + ' ' + (w * 0.7).toFixed(1) + '"') +
                    line(d, '#ffffff', w * 0.2, up(w, 0.2) + ' opacity="0.6"');
            case 'galaxy': // Galaxy: deep space with drifting sparkles
                return line(d, '#1e1b4b', w) + line(d, 'url(#ank-t-galaxy)', w * 0.78) +
                    line(d, '#ffffff', w * 0.18, ' stroke-dasharray="0 ' + (w * 1.7).toFixed(1) + '" transform="translate(0 ' + (-w * 0.15).toFixed(2) + ')"') +
                    line(d, '#fde68a', w * 0.12, ' stroke-dasharray="0 ' + (w * 2.6).toFixed(1) + '" stroke-dashoffset="' + (w * 1.1).toFixed(1) + '" transform="translate(0 ' + (w * 0.2).toFixed(2) + ')"');
            case 'rainbow':
                return line(d, 'url(#ank-t-rainbow)', w) + line(d, '#ffffff', w * 0.22, up(w, 0.2) + ' opacity="0.5"');
            case 'lava': // Lava: molten color with a hot glow and cooling crust
                return line(d, '#f97316', w * 3.2, ' opacity="0.55" filter="url(#ank-glow)"') + line(d, '#7f1d1d', w) + line(d, 'url(#ank-t-lava)', w * 0.7) +
                    line(d, '#450a0a', w * 0.3, ' stroke-dasharray="' + (w * 0.4).toFixed(1) + ' ' + (w * 1.6).toFixed(1) + '" opacity="0.55"');
            case 'gold': // Gold Foil: shining metal
                return line(d, '#92400e', w) + line(d, 'url(#ank-t-gold)', w * 0.76) + line(d, '#fffbeb', w * 0.2, up(w, 0.2) + ' opacity="0.8"');
        }
        return '';
    }
    function grad(id, stops, span) {
        const n = stops.length - 1;
        return '<linearGradient id="ank-t-' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + (span || 140) + '" y2="' + Math.round((span || 140) * 0.35) + '" spreadMethod="reflect">' +
            stops.map((c, i) => '<stop offset="' + (i / n).toFixed(3) + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
    }
    // (the filters cover a fixed, roomy area: measured from a nearly straight stroke's own box, a glow would be clipped flat)
    const DEFS = '<defs><filter id="ank-glow" filterUnits="userSpaceOnUse" x="-4000" y="-4000" width="12000" height="40000"><feGaussianBlur stdDeviation="5"/></filter>' +
        '<filter id="ank-glow-in" filterUnits="userSpaceOnUse" x="-4000" y="-4000" width="12000" height="40000"><feGaussianBlur stdDeviation="2"/></filter>' +
        '<filter id="ank-wax" filterUnits="userSpaceOnUse" x="-4000" y="-4000" width="12000" height="40000"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/></filter>' +
        // the themed inks' color runs: in page units, repeating (reflected), so they flow along a stroke in any direction
        grad('aero', ['#38bdf8', '#7dd3fc', '#4ade80', '#a7f3d0']) + grad('pool', ['#22d3ee', '#67e8f9', '#06b6d4', '#a5f3fc']) +
        grad('vapor', ['#ff4fd8', '#a855f7', '#22d3ee']) + grad('galaxy', ['#4c1d95', '#7c3aed', '#1e3a8a', '#db2777']) +
        grad('rainbow', ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'], 240) + grad('lava', ['#f97316', '#facc15', '#ef4444']) +
        grad('gold', ['#fde68a', '#b45309', '#fef3c7', '#d97706'], 90) + '</defs>';
    // a stroke from a saved note or a file is checked before it is drawn: a known ink and color, a sane width, a path of plain numbers
    function clean(list) {
        return (Array.isArray(list) ? list : []).filter((s) => s && typeof s.d === 'string' && /^[MLQl0-9 .\-]+$/.test(s.d) && s.d.length < 200000).map((s) => ({
            t: BASE[s.t] ? s.t : 'pen', c: COLOR[s.c] ? s.c : 'red', w: Math.max(0.5, Math.min(60, parseFloat(s.w) || 4)), d: s.d
        }));
    }
    function strokesOf(layer) { try { return clean(JSON.parse(layer.getAttribute('data-ink') || '[]')); } catch (e) { return []; } }
    function paint(layer, strokes) {
        layer.setAttribute('data-ink', JSON.stringify(strokes));
        layer.innerHTML = DEFS + strokes.map((s, i) => '<g class="ank-stroke" data-i="' + i + '">' + strokeSvg(s) + '</g>').join('');
    }
    // the layer's markup for a list of strokes (keydown-doc.js uses this to open @@ink from .kd files)
    function layerHtml(strokes) {
        const list = clean(strokes);
        return '<svg class="an-ink-layer" xmlns="' + NS + '" contenteditable="false" aria-hidden="true" data-ink="' + esc(JSON.stringify(list)) + '">' + DEFS +
            list.map((s, i) => '<g class="ank-stroke" data-i="' + i + '">' + strokeSvg(s) + '</g>').join('') + '</svg>';
    }

    /* ---------- the layer in the note ---------- */
    // the page being drawn on: Bitbook's note, or any element handed to start() (Keydown.js editors, KeydownBox...)
    let target = null, onStop = null, toLocal = null;
    const ed = () => target || document.getElementById('wysiwyg-canvas');
    function fit(layer) {
        const c = ed();
        if (!c || !layer) return;
        layer.setAttribute('width', Math.max(c.scrollWidth, c.clientWidth));
        layer.setAttribute('height', Math.max(c.scrollHeight, c.clientHeight));
    }
    // the note's layer, right inside the note (made when first needed; it is absolutely positioned, so where it sits does not matter)
    function layerOf(make) {
        const c = ed();
        if (!c) return null;
        let layer = Array.from(c.querySelectorAll('svg.an-ink-layer')).find((l) => !l.closest('.bl-view')) || null;
        if (!layer && !make) return null;
        if (!layer) { const t = document.createElement('template'); t.innerHTML = layerHtml([]); layer = t.content.firstChild; }
        if (!c.contains(layer)) c.appendChild(layer);
        fit(layer);
        return layer;
    }
    // notes opened, switched to, or loaded from .kd: draw their strokes again, and keep the layer the right size
    let tidyQueued = 0;
    function tidy() {
        clearTimeout(tidyQueued);
        tidyQueued = setTimeout(() => {
            const c = ed();
            if (!c) return;
            // (a drawing on a playing BitLang program's page belongs to the program: it stays where the program put it)
            const all = Array.from(c.querySelectorAll('svg.an-ink-layer')).filter((l) => !l.closest('.bl-view'));
            all.forEach((l, i) => { if (i > 0) { paint(all[0], strokesOf(all[0]).concat(strokesOf(l))); l.remove(); } });
            const layer = all[0];
            if (!layer) return;
            if (!layer.querySelector('.ank-stroke') && strokesOf(layer).length) paint(layer, strokesOf(layer));
            const holder0 = layer.parentNode;
            const wrapped = holder0 && holder0 !== c && holder0.parentNode === c && holder0.children.length === 1;
            if (layer.parentNode !== c && !wrapped) {
                const holder = layer.parentNode;
                c.appendChild(layer);
                if (holder !== c && holder && !holder.textContent.trim() && !holder.querySelector('img, svg, input')) holder.remove();
            }
            fit(layer);
        }, 80);
    }
    function saved() {
        const c = ed();
        if (!c) return;
        c.dispatchEvent(new Event('input', { bubbles: true }));
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    }

    /* ---------- the Annotate bar and drawing ---------- */
    const CSS = `
#wysiwyg-canvas, .ank-target { position: relative; }
svg.an-ink-layer { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; z-index: 5; }
body.ank-on svg.an-ink-layer { pointer-events: auto; cursor: crosshair; touch-action: none; }
body.ank-on.ank-erase svg.an-ink-layer { cursor: cell; }
body.ank-on #wysiwyg-canvas, body.ank-on .ank-target { user-select: none; -webkit-user-select: none; }
.ank-bar { position: fixed; z-index: 2147483600; left: 50%; bottom: calc(44px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 10px;
  max-width: calc(100vw - 16px); box-sizing: border-box; padding: 8px 12px; border-radius: 16px; font: 600 12px system-ui, sans-serif; color: #3b0764;
  background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(243,232,255,0.95)); border: 1px solid rgba(147,51,234,0.35); box-shadow: 0 10px 30px rgba(59,7,100,0.25); }
.ank-bar[hidden] { display: none; }
.ank-title { font-weight: 800; font-size: 13px; color: #7e22ce; }
.ank-group { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.ank-sep { width: 1px; align-self: stretch; background: rgba(147,51,234,0.25); }
.ank-btn { border: 1px solid transparent; background: transparent; border-radius: 9px; padding: 3px 7px; cursor: pointer; color: inherit; font: inherit; display: inline-flex; align-items: center; gap: 4px; }
.ank-btn:hover { background: rgba(216,180,254,0.45); }
.ank-btn.on { background: #fff; border-color: #a855f7; box-shadow: 0 1px 4px rgba(147,51,234,0.3); }
.ank-btn svg { width: 34px; height: 16px; overflow: visible; }
.ank-sw { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.2); cursor: pointer; padding: 0; }
.ank-sw.on { box-shadow: 0 0 0 2px #7e22ce; }
.ank-themes-btn { border-color: rgba(147,51,234,0.35); background: linear-gradient(180deg, #fff, #f3e8ff); }
.ank-themes { position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px;
  width: min(560px, calc(100vw - 24px)); box-sizing: border-box; padding: 8px; border-radius: 14px; background: linear-gradient(180deg, #ffffff, #faf5ff);
  border: 1px solid rgba(147,51,234,0.35); box-shadow: 0 10px 30px rgba(59,7,100,0.25); }
.ank-packs { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
.ank-pack { border: 1px solid rgba(147,51,234,0.3); background: #fff; color: #6b21a8; border-radius: 999px; padding: 4px 11px; font: 700 12px system-ui, sans-serif; cursor: pointer; }
.ank-pack:hover { background: #f3e8ff; }
.ank-pack.on { color: #fff; border-color: #7e22ce; background: linear-gradient(180deg, #d8b4fe, #9333ea); }
.ank-styles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.ank-pack-note { text-align: center; font-size: 11px; color: #6b21a8; opacity: 0.8; }
.ank-theme { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 4px; border-radius: 10px; border: 1px solid transparent; background: transparent; cursor: pointer; font: inherit; color: inherit; }
.ank-theme svg { width: 100%; max-width: 92px; height: 34px; overflow: visible; }
.ank-theme:hover { background: rgba(216,180,254,0.35); }
.ank-theme.on { border-color: #a855f7; background: #fff; }
@media (max-width: 520px) { .ank-styles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.ank-done { background: linear-gradient(180deg, #d8b4fe, #9333ea); color: #fff; border-color: #7e22ce; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
.ank-done:hover { background: linear-gradient(180deg, #e9d5ff, #a855f7); }
`;
    let bar = null, on = false, ink = 'gel', color = 'red', size = 'm', erasing = false, undo = [], themesOpen = false, pack = 'aero';
    function preview(t) {
        const s = { t: t, c: color, w: BASE[t] * (t === 'marker' ? 0.7 : 1), d: 'M3 11Q10 3 17 8T31 6' };
        return '<svg viewBox="0 0 34 16" aria-hidden="true">' + DEFS + strokeSvg(s) + '</svg>';
    }
    function buildBar() {
        if (bar) return bar;
        bar = document.createElement('div');
        bar.className = 'ank-bar';
        bar.hidden = true;
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', 'Annotate');
        document.body.appendChild(bar);
        bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
        bar.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            if (b.dataset.act === 'themes') {
                themesOpen = !themesOpen;
                // opening the menu shows the pack of the style you are using (after that, the tabs switch freely)
                if (themesOpen && STYLE_NAME[ink]) pack = STYLE_NAME[ink][2];
                render();
                return;
            }
            if (b.dataset.pack) { pack = b.dataset.pack; render(); return; }
            if (b.dataset.ink) { ink = b.dataset.ink; erasing = false; themesOpen = false; }
            else if (b.dataset.color) { color = b.dataset.color; erasing = false; }
            else if (b.dataset.size) size = b.dataset.size;
            else if (b.dataset.act === 'erase') erasing = !erasing;
            else if (b.dataset.act === 'undo') { const layer = layerOf(false); if (layer && undo.length) { paint(layer, undo.pop()); saved(); } }
            else if (b.dataset.act === 'clear') { const layer = layerOf(false); if (layer && strokesOf(layer).length) { undo.push(strokesOf(layer)); paint(layer, []); saved(); } }
            else if (b.dataset.act === 'done') { stop(); return; }
            render();
        });
        return bar;
    }
    function render() {
        document.body.classList.toggle('ank-erase', erasing);
        const style = STYLE_NAME[ink];
        const cur = PACKS.find((pk) => pk[0] === pack) || PACKS[0];
        bar.innerHTML = '<span class="ank-title">Annotate</span>' +
            '<span class="ank-group" aria-label="Ink">' + INKS.map((k) => '<button type="button" class="ank-btn' + (k[0] === ink && !erasing ? ' on' : '') + '" data-ink="' + k[0] + '" title="' + k[1] + '">' + preview(k[0]) + k[1] + '</button>').join('') +
            '<button type="button" class="ank-btn ank-themes-btn' + (style && !erasing ? ' on' : '') + '" data-act="themes" aria-expanded="' + themesOpen + '" title="Theme Packs: sets of ink styles, in any color">' +
            (style ? preview(ink) + style[1] : '🎨 Theme Packs') + ' ▾</button></span>' +
            (themesOpen ? '<div class="ank-themes" role="menu" aria-label="Theme Packs">' +
                '<div class="ank-packs">' + PACKS.map((pk) => '<button type="button" class="ank-pack' + (pk[0] === cur[0] ? ' on' : '') + '" data-pack="' + pk[0] + '">' + pk[1] + '</button>').join('') + '</div>' +
                '<div class="ank-styles">' + cur[2].map((st) => '<button type="button" role="menuitem" class="ank-theme' + (st[0] === ink ? ' on' : '') + '" data-ink="' + st[0] + '"><svg viewBox="0 0 34 16" aria-hidden="true">' + DEFS + strokeSvg({ t: st[0], c: color, w: BASE[st[0]] * 0.75, d: 'M3 11Q10 3 17 8T31 6' }) + '</svg>' + st[1] + '</button>').join('') + '</div>' +
                '<div class="ank-pack-note">Every style draws in the color you pick below!</div></div>' : '') +
            '<span class="ank-sep"></span><span class="ank-group" aria-label="Color">' + COLORS.map((c) => '<button type="button" class="ank-sw' + (c[0] === color ? ' on' : '') + '" data-color="' + c[0] + '" title="' + c[0].charAt(0).toUpperCase() + c[0].slice(1) + '" style="background:linear-gradient(180deg,' + c[3] + ',' + c[1] + ')"></button>').join('') + '</span>' +
            '<span class="ank-sep"></span><span class="ank-group" aria-label="Size">' + SIZES.map((z) => '<button type="button" class="ank-btn' + (z[0] === size ? ' on' : '') + '" data-size="' + z[0] + '" title="' + z[1] + '">' + z[0].toUpperCase() + '</button>').join('') + '</span>' +
            '<span class="ank-sep"></span><span class="ank-group">' +
            '<button type="button" class="ank-btn' + (erasing ? ' on' : '') + '" data-act="erase" title="Eraser: drag over a stroke to remove it">Eraser</button>' +
            '<button type="button" class="ank-btn" data-act="undo" title="Undo the last change">Undo</button>' +
            '<button type="button" class="ank-btn" data-act="clear" title="Remove every drawing from this note">Clear</button>' +
            '<button type="button" class="ank-btn ank-done" data-act="done" title="Back to typing (Esc)">Done</button></span>';
    }
    // start(): draw on Bitbook's note; start(element, { onStop }) draws on that element instead (onStop runs when you press Done)
    function start(el, opts) {
        if (on) stop();
        // (a different page starts its own undo list)
        if (el && el.nodeType === 1) { if (el !== start.last) undo = []; start.last = el; target = el; el.classList.add('ank-target'); }
        onStop = opts && typeof opts.onStop === 'function' ? opts.onStop : null;
        // (opts.toLocal(event) -> [x, y] in the page's own pixels, for a page that is zoomed or scaled)
        toLocal = opts && typeof opts.toLocal === 'function' ? opts.toLocal : null;
        if (!ed()) return;
        buildBar();
        on = true;
        render();
        bar.hidden = false;
        document.body.classList.add('ank-on');
        layerOf(true);
        try { document.activeElement && document.activeElement.blur(); } catch (e) {}
        try { if (window.OfficeShell) window.OfficeShell.toast('Annotate: draw on the note! Pick an ink and a color, then press Done (or Esc) to type again!'); } catch (e) {}
    }
    function stop() {
        on = false; erasing = false;
        if (bar) bar.hidden = true;
        document.body.classList.remove('ank-on', 'ank-erase');
        const layer = layerOf(false);
        // an empty layer leaves the note
        if (layer && !strokesOf(layer).length) { layer.remove(); saved(); }
        const done = onStop;
        target = null; onStop = null; toLocal = null;
        if (done) { try { done(); } catch (e) {} }
    }

    // drawing: points are smoothed as they come, so the line flows
    let cur = null;
    // (a zoomed page, like Amber's slide, is drawn bigger than its own size: points are scaled back to the page's own pixels)
    function local(layer, e) {
        if (toLocal) { try { const p = toLocal(e); if (p) return p; } catch (err) {} }
        const r = layer.getBoundingClientRect();
        const sx = r.width / (parseFloat(layer.getAttribute('width')) || r.width) || 1, sy = r.height / (parseFloat(layer.getAttribute('height')) || r.height) || 1;
        return [(e.clientX - r.left) / sx, (e.clientY - r.top) / sy];
    }
    function eraseAt(layer, e) {
        const hits = document.elementsFromPoint(e.clientX, e.clientY);
        const g = hits.map((h) => h.closest && h.closest('g.ank-stroke')).find((x) => x && layer.contains(x));
        if (!g) return;
        const list = strokesOf(layer);
        undo.push(list.slice());
        list.splice(+g.getAttribute('data-i'), 1);
        paint(layer, list);
        saved();
    }
    document.addEventListener('pointerdown', (e) => {
        if (!on || e.button > 0) return;
        const layer = layerOf(false);
        if (!layer || !(e.target === layer || layer.contains(e.target))) return;
        e.preventDefault();
        if (erasing) { cur = { erase: true }; eraseAt(layer, e); return; }
        const p = local(layer, e);
        cur = { layer: layer, pts: [p], last: p, s: { t: ink, c: color, w: Math.round(BASE[ink] * SIZES.find((z) => z[0] === size)[2] * 10) / 10, d: '' } };
        cur.g = document.createElementNS(NS, 'g');
        cur.g.setAttribute('class', 'ank-stroke ank-live');
        layer.appendChild(cur.g);
        try { layer.setPointerCapture(e.pointerId); } catch (err) {}
    }, true);
    document.addEventListener('pointermove', (e) => {
        if (!on || !cur) return;
        const layer = layerOf(false);
        if (cur.erase) { if (e.buttons) eraseAt(layer, e); return; }
        const raw = local(cur.layer, e);
        // smoothing: each new point moves only part of the way toward the pointer
        const k = 0.45, p = [cur.last[0] + (raw[0] - cur.last[0]) * k, cur.last[1] + (raw[1] - cur.last[1]) * k];
        if (Math.hypot(p[0] - cur.last[0], p[1] - cur.last[1]) < 1.2) return;
        cur.pts.push(p); cur.last = p;
        cur.s.d = pathOf(cur.pts);
        cur.g.innerHTML = strokeSvg(cur.s);
    }, true);
    const end = (e) => {
        if (!cur) return;
        if (!cur.erase) {
            const raw = local(cur.layer, e);
            if (cur.pts.length > 1) cur.pts.push(raw);
            cur.s.d = pathOf(cur.pts);
            const list = strokesOf(cur.layer);
            undo.push(list.slice());
            list.push(cur.s);
            paint(cur.layer, list);
            saved();
        }
        cur = null;
    };
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', end, true);
    // Keys while annotating: caught on the window, before anything else sees them, so Bitbook's own undo (which
    // would undo the note and drop the caret into the text) never runs, and nothing gets typed into the note
    function undoInk() { const layer = layerOf(false); if (layer && undo.length) { paint(layer, undo.pop()); saved(); } }
    window.addEventListener('keydown', (e) => {
        if (!on) return;
        const k = e.key;
        if (k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stop(); return; }
        const mod = e.metaKey || e.ctrlKey;
        if (mod && (k === 'z' || k === 'Z' || k === 'y' || k === 'Y')) {
            e.preventDefault(); e.stopImmediatePropagation();
            if ((k === 'z' || k === 'Z') && !e.shiftKey) undoInk();
            return;
        }
        // typing keys stay out of the note while you draw (the bar's buttons still work with the keyboard)
        if (bar && bar.contains(e.target)) return;
        if (!mod && (k.length === 1 || k === 'Backspace' || k === 'Delete' || k === 'Enter' || k === 'Tab')) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    // undo from the Edit menu or a touch keyboard arrives as beforeinput: keep that out of the note too
    window.addEventListener('beforeinput', (e) => {
        if (!on) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.inputType === 'historyUndo') undoInk();
    }, true);

    /* ---------- wiring ---------- */
    function injectCss() {
        if (document.getElementById('ank-css')) return;
        const st = document.createElement('style');
        st.id = 'ank-css';
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    injectCss();
    function wire() {
        document.querySelectorAll('#skills-menu-popup [data-skill="markup"]').forEach((item) => item.addEventListener('click', () => {
            try { if (typeof closeSkillsMenu === 'function') closeSkillsMenu(); } catch (e) {}
            const m = document.getElementById('skills-menu-popup');
            if (m) m.style.display = 'none';
            start();
        }));
        const c = ed();
        if (c) {
            new MutationObserver((recs) => { for (const r of recs) { if (r.type === 'childList' && !(r.target.closest && r.target.closest('svg.an-ink-layer'))) { tidy(); return; } } }).observe(c, { childList: true, subtree: true });
            window.addEventListener('resize', () => fit(layerOf(false)));
            c.addEventListener('input', () => { const l = layerOf(false); if (l) fit(l); });
            tidy();
        }
    }
    // (Peeker draws with the same inks: strokeSvg draws one stroke, pathOf smooths points into a path, DEFS holds the filters)
    window.AnnotateInk = { start: start, stop: stop, isOn: () => on, layerHtml: layerHtml, strokesOf: strokesOf, strokeSvg: (st) => strokeSvg(clean([st])[0] || st), pathOf: pathOf,
        DEFS: DEFS, COLORS: COLORS, INKS: INKS, PACKS: PACKS, BASE: BASE };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
