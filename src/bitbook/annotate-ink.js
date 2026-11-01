/* =====================================================================
   Bitbook's Annotate skill: draw right on the note, over the letters!
   Five inks in the 13 Annotate colors:
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
    const BASE = { gel: 9, pen: 2.6, marker: 18, neon: 3.2, crayon: 6 };
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
    const line = (d, color, width, extra) => '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
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
        }
        return '';
    }
    // (the filters cover a fixed, roomy area: measured from a nearly straight stroke's own box, a glow would be clipped flat)
    const DEFS = '<defs><filter id="ank-glow" filterUnits="userSpaceOnUse" x="-4000" y="-4000" width="12000" height="40000"><feGaussianBlur stdDeviation="5"/></filter>' +
        '<filter id="ank-glow-in" filterUnits="userSpaceOnUse" x="-4000" y="-4000" width="12000" height="40000"><feGaussianBlur stdDeviation="2"/></filter>' +
        '<filter id="ank-wax" filterUnits="userSpaceOnUse" x="-4000" y="-4000" width="12000" height="40000"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/></filter></defs>';
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
    const ed = () => document.getElementById('wysiwyg-canvas');
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
        let layer = c.querySelector('svg.an-ink-layer');
        if (!layer && !make) return null;
        if (!layer) { const t = document.createElement('template'); t.innerHTML = layerHtml([]); layer = t.content.firstChild; }
        if (layer.parentNode !== c) c.appendChild(layer);
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
            const all = c.querySelectorAll('svg.an-ink-layer');
            all.forEach((l, i) => { if (i > 0) { paint(all[0], strokesOf(all[0]).concat(strokesOf(l))); l.remove(); } });
            const layer = all[0];
            if (!layer) return;
            if (!layer.querySelector('.ank-stroke') && strokesOf(layer).length) paint(layer, strokesOf(layer));
            if (layer.parentNode !== c) {
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
#wysiwyg-canvas { position: relative; }
svg.an-ink-layer { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; z-index: 5; }
body.ank-on svg.an-ink-layer { pointer-events: auto; cursor: crosshair; touch-action: none; }
body.ank-on.ank-erase svg.an-ink-layer { cursor: cell; }
body.ank-on #wysiwyg-canvas { user-select: none; -webkit-user-select: none; }
.ank-bar { position: fixed; z-index: 100000; left: 50%; bottom: calc(44px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 10px;
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
.ank-done { background: linear-gradient(180deg, #d8b4fe, #9333ea); color: #fff; border-color: #7e22ce; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
.ank-done:hover { background: linear-gradient(180deg, #e9d5ff, #a855f7); }
`;
    let bar = null, on = false, ink = 'gel', color = 'red', size = 'm', erasing = false, undo = [];
    function preview(t) {
        const s = { t: t, c: color, w: BASE[t] * (t === 'marker' ? 0.7 : 1), d: 'M3 11Q10 3 17 8T31 6' };
        return '<svg viewBox="0 0 34 16" aria-hidden="true">' + DEFS + strokeSvg(s) + '</svg>';
    }
    function buildBar() {
        if (bar) return bar;
        const st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);
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
            if (b.dataset.ink) { ink = b.dataset.ink; erasing = false; }
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
        bar.innerHTML = '<span class="ank-title">Annotate</span>' +
            '<span class="ank-group" aria-label="Ink">' + INKS.map((k) => '<button type="button" class="ank-btn' + (k[0] === ink && !erasing ? ' on' : '') + '" data-ink="' + k[0] + '" title="' + k[1] + '">' + preview(k[0]) + k[1] + '</button>').join('') + '</span>' +
            '<span class="ank-sep"></span><span class="ank-group" aria-label="Color">' + COLORS.map((c) => '<button type="button" class="ank-sw' + (c[0] === color ? ' on' : '') + '" data-color="' + c[0] + '" title="' + c[0].charAt(0).toUpperCase() + c[0].slice(1) + '" style="background:linear-gradient(180deg,' + c[3] + ',' + c[1] + ')"></button>').join('') + '</span>' +
            '<span class="ank-sep"></span><span class="ank-group" aria-label="Size">' + SIZES.map((z) => '<button type="button" class="ank-btn' + (z[0] === size ? ' on' : '') + '" data-size="' + z[0] + '" title="' + z[1] + '">' + z[0].toUpperCase() + '</button>').join('') + '</span>' +
            '<span class="ank-sep"></span><span class="ank-group">' +
            '<button type="button" class="ank-btn' + (erasing ? ' on' : '') + '" data-act="erase" title="Eraser: drag over a stroke to remove it">Eraser</button>' +
            '<button type="button" class="ank-btn" data-act="undo" title="Undo the last change">Undo</button>' +
            '<button type="button" class="ank-btn" data-act="clear" title="Remove every drawing from this note">Clear</button>' +
            '<button type="button" class="ank-btn ank-done" data-act="done" title="Back to typing (Esc)">Done</button></span>';
    }
    function start() {
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
    }

    // drawing: points are smoothed as they come, so the line flows
    let cur = null;
    function local(layer, e) { const r = layer.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
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
    document.addEventListener('keydown', (e) => {
        if (!on) return;
        if (e.key === 'Escape') { e.preventDefault(); stop(); }
        else if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); const layer = layerOf(false); if (layer && undo.length) { paint(layer, undo.pop()); saved(); } }
    }, true);

    /* ---------- wiring ---------- */
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
    window.AnnotateInk = { start: start, stop: stop, layerHtml: layerHtml, strokesOf: strokesOf, COLORS: COLORS, INKS: INKS };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
