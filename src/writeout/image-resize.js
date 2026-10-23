/* =====================================================================
   Image resize handles (Writeout + Bitbook)! Click a picture and it gets
   eight big, easy-to-grab handles: four corners (they keep the picture's
   shape, hold Shift to stretch freely) and four edges (stretch just that
   direction)! Identical copy in both apps (loaded after app.js)!
   ===================================================================== */
(function () {
    'use strict';
    const ed = document.getElementById('wysiwyg-canvas');
    if (!ed) return;
    const HANDLES = [['nw', 'nwse-resize'], ['n', 'ns-resize'], ['ne', 'nesw-resize'], ['e', 'ew-resize'], ['se', 'nwse-resize'], ['s', 'ns-resize'], ['sw', 'nesw-resize'], ['w', 'ew-resize']];
    const css = document.createElement('style');
    css.textContent =
        '#wysiwyg-canvas .img-resize{resize:none !important;overflow:visible !important}' +
        '#kd-img-layer .kd-frame{position:fixed;border:2px solid var(--os-accent,#0284c7);box-sizing:border-box;pointer-events:none}' +
        '#kd-img-layer{position:fixed;left:0;top:0;width:0;height:0;z-index:60;pointer-events:none}' +
        '#kd-img-layer .kd-h{position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;background:#fff;border:2px solid var(--os-accent,#0284c7);border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.35);pointer-events:auto;touch-action:none}' +
        '#kd-img-layer .kd-h:hover{background:var(--os-accent,#0284c7)}' +
        '#kd-img-layer .kd-tip{position:fixed;transform:translate(-50%,0);padding:2px 8px;border-radius:999px;background:rgba(15,23,42,.85);color:#fff;font:700 11px/1.4 "JetBrains Mono",monospace;pointer-events:none;white-space:nowrap}';
    document.head.appendChild(css);

    let layer = null, img = null, drag = null, queued = false;
    function ensureLayer() {
        if (layer) return layer;
        layer = document.createElement('div');
        layer.id = 'kd-img-layer';
        HANDLES.forEach(function (h) {
            const d = document.createElement('div');
            d.className = 'kd-h';
            d.dataset.h = h[0];
            d.style.cursor = h[1];
            d.addEventListener('pointerdown', start);
            layer.appendChild(d);
        });
        const fr = document.createElement('div');
        fr.className = 'kd-frame';
        layer.appendChild(fr);
        const tip = document.createElement('div');
        tip.className = 'kd-tip';
        tip.hidden = true;
        layer.appendChild(tip);
        document.body.appendChild(layer);
        return layer;
    }
    function holderOf(i) { return i.closest('.img-resize') || i; }
    function select(i) {
        img = i;
        if (img) { ensureLayer().style.display = 'block'; place(); }
        else if (layer) layer.style.display = 'none';
    }
    function place() {
        queued = false;
        if (!img || !img.isConnected || !ed.contains(img)) { select(null); return; }
        const r = img.getBoundingClientRect();
        const pos = { nw: [r.left, r.top], n: [r.left + r.width / 2, r.top], ne: [r.right, r.top], e: [r.right, r.top + r.height / 2], se: [r.right, r.bottom], s: [r.left + r.width / 2, r.bottom], sw: [r.left, r.bottom], w: [r.left, r.top + r.height / 2] };
        [].forEach.call(layer.querySelectorAll('.kd-h'), function (d) { const p = pos[d.dataset.h]; d.style.left = p[0] + 'px'; d.style.top = p[1] + 'px'; });
        const fr = layer.querySelector('.kd-frame');
        fr.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
        const tip = layer.querySelector('.kd-tip');
        if (drag) { tip.hidden = false; tip.textContent = Math.round(img.offsetWidth) + ' × ' + Math.round(img.offsetHeight); tip.style.left = (r.left + r.width / 2) + 'px'; tip.style.top = (r.bottom + 12) + 'px'; } else tip.hidden = true;
    }
    function soon() { if (!queued && img) { queued = true; requestAnimationFrame(place); } }

    function start(e) {
        if (!img) return;
        e.preventDefault();
        e.stopPropagation();
        const hd = holderOf(img);
        const r = img.getBoundingClientRect();
        // Screen pixels to CSS pixels (page zoom in the Office layouts)!
        const k = img.offsetWidth ? r.width / img.offsetWidth : 1;
        drag = { h: e.target.dataset.h, x: e.clientX, y: e.clientY, w: img.offsetWidth, hh: img.offsetHeight, k: k || 1, hd: hd };
        e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end, { once: true });
        place();
    }
    function move(e) {
        if (!drag) return;
        const dx = (e.clientX - drag.x) / drag.k, dy = (e.clientY - drag.y) / drag.k;
        const h = drag.h;
        let w = drag.w, hh = drag.hh;
        const ratio = drag.w / (drag.hh || 1);
        const grow = function (d, neg) { return neg ? -d : d; };
        const wantsW = /e|w/.test(h), wantsH = /n|s/.test(h);
        if (wantsW) w = drag.w + grow(dx, /w/.test(h));
        if (wantsH) hh = drag.hh + grow(dy, /n/.test(h));
        const corner = wantsW && wantsH;
        if (corner && !e.shiftKey) {
            // Keep the picture's shape: follow whichever direction moved more!
            const sw = w / drag.w, sh = hh / drag.hh;
            const s = Math.abs(sw - 1) > Math.abs(sh - 1) ? sw : sh;
            w = drag.w * s;
            hh = w / ratio;
        } else if (wantsW && !wantsH) hh = drag.hh;
        w = Math.max(24, Math.round(w));
        hh = Math.max(24, Math.round(hh));
        const maxW = ed.clientWidth;
        if (w > maxW) { if (corner && !e.shiftKey) hh = Math.round(maxW / ratio); w = maxW; }
        drag.hd.style.width = w + 'px';
        if (drag.hd !== img) { drag.hd.style.maxWidth = '100%'; }
        // Edge handles (and Shift) stretch; plain corners keep the shape!
        if (wantsH || (corner && e.shiftKey)) { img.style.width = '100%'; img.style.height = hh + 'px'; }
        else if (!wantsH) img.style.height = '';
        if (drag.hd === img) { img.style.width = w + 'px'; }
        place();
    }
    function end() {
        document.removeEventListener('pointermove', move);
        drag = null;
        place();
        ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatImage' }));
    }

    ed.addEventListener('mousedown', function (e) {
        const t = e.target;
        let inWidget = false;
        for (let n = t && t.parentElement; n && n !== ed; n = n.parentElement) if (n.getAttribute('contenteditable') === 'false' && !n.classList.contains('img-resize')) { inWidget = true; break; }
        if (t && t.tagName === 'IMG' && ed.contains(t) && !inWidget) { select(t); }
        else if (!(e.target.closest && e.target.closest('#kd-img-layer'))) select(null);
    });
    document.addEventListener('mousedown', function (e) { if (img && !ed.contains(e.target) && !(e.target.closest && e.target.closest('#kd-img-layer'))) select(null); });
    document.addEventListener('keydown', function (e) {
        if (!img) return;
        if (e.key === 'Escape') select(null);
        else if ((e.key === 'Delete' || e.key === 'Backspace') && !drag && document.activeElement === document.body) { const h = holderOf(img); select(null); h.remove(); ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent' })); }
    });
    document.addEventListener('scroll', soon, true);
    window.addEventListener('resize', soon);
    new MutationObserver(soon).observe(ed, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    ed.addEventListener('load', soon, true);
    window.KdImageResize = { select: select };
})();
