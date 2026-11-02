/* =====================================================================
   Image on top of the document! Puts a picture (from your computer or from OpenDB) in front of the text,
   anywhere on the page. Click it to select it, drag it to move it, pull the 8 handles to resize it
   (corners keep its shape, edges stretch it), tap it again to swap them for rotate handles (tap once more to go back, Shift snaps to 15 degrees), use the arrow keys to nudge it (Shift for bigger steps)
   and press Delete or the X to remove it. It lives in the note and saves in the Keydown file as
   ![alt](data:...){overlay x=120 y=60 w=240 h=180 r=30}.
   window.DocOverlay = { add, pickFile, pickOpenDB }
   ===================================================================== */
(function () {
    'use strict';
    const canvas = document.getElementById('wysiwyg-canvas');
    if (!canvas) return;
    const KEY = (window.RADII_COLLAB_APP && window.RADII_COLLAB_APP.key) || (location.pathname.indexOf('bitbook') !== -1 ? 'bitbook' : 'writeout');
    const ACCENT = KEY === 'bitbook' ? '#9333ea' : '#0284c7';
    const ACCENT2 = KEY === 'bitbook' ? '#d946ef' : '#38bdf8';

    const st = document.createElement('style');
    st.id = 'kd-overlay-css';
    st.textContent =
        '.kd-overlay { cursor: move; user-select: none; -webkit-user-select: none; touch-action: none; line-height: 0; margin: 0; padding: 0; }' +
        '.kd-overlay img { display: block; width: 100%; height: 100%; object-fit: fill; pointer-events: none; -webkit-user-drag: none; user-select: none; }' +
        '.kd-ov-ui { position: fixed; left: 0; top: 0; width: 0; height: 0; z-index: 2147482000; pointer-events: none; }' +
        '.kd-ov-frame { position: fixed; border: 2px solid ' + ACCENT + '; box-shadow: 0 0 0 1px rgba(255,255,255,0.8), 0 0 12px ' + ACCENT2 + '66; pointer-events: none; box-sizing: border-box; }' +
        '.kd-ov-h { position: fixed; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 4px; background: #fff; border: 2px solid ' + ACCENT + '; box-sizing: border-box; pointer-events: auto; touch-action: none; }' +
        '.kd-ov-h:hover { background: ' + ACCENT2 + '; }' +
        '.kd-ov-r { position: fixed; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: ' + ACCENT2 + '; border: 2px solid #fff; box-shadow: 0 0 0 1px ' + ACCENT + ', 0 2px 6px rgba(0,0,0,0.3); box-sizing: border-box; pointer-events: auto; touch-action: none; cursor: grab; }' +
        '.kd-ov-r:active { cursor: grabbing; }' +
        '.kd-ov-x { position: fixed; width: 26px; height: 26px; margin: 0; border-radius: 13px; border: 2px solid #fff; background: linear-gradient(180deg, #fca5a5, #ef4444); color: #fff; font: 800 13px/22px system-ui, sans-serif; text-align: center; cursor: pointer; pointer-events: auto; box-shadow: 0 2px 6px rgba(0,0,0,0.3); padding: 0; }' +
        '.kd-ov-x:hover { filter: brightness(1.1); }' +
        '@media print { .kd-ov-ui { display: none !important; } }';
    document.head.appendChild(st);

    /* ---------- where things are ---------- */
    function scaleOf() { return canvas.offsetWidth ? canvas.getBoundingClientRect().width / canvas.offsetWidth : 1; }
    // a point on the screen -> a point on the note (the note may be zoomed or scrolled)
    function toLocal(cx, cy) {
        const r = canvas.getBoundingClientRect(), s = scaleOf() || 1;
        return { x: (cx - r.left) / s - canvas.clientLeft + canvas.scrollLeft, y: (cy - r.top) / s - canvas.clientTop + canvas.scrollTop };
    }
    const num = (el, p) => parseFloat(el.style[p]) || 0;
    function changed() {
        try { canvas.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
    }
    function toast(msg) { try { if (window.OfficeShell) window.OfficeShell.toast(msg); } catch (e) {} }

    /* ---------- making one ---------- */
    function make(src, alt, x, y, w, h) {
        const d = document.createElement('div');
        d.className = 'kd-overlay';
        d.setAttribute('contenteditable', 'false');
        d.setAttribute('data-kd-overlay', '1');
        // (the position is inline, so it works wherever the note is shown)
        d.style.cssText = 'position:absolute;z-index:40;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;';
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt || 'Image';
        img.draggable = false;
        d.appendChild(img);
        return d;
    }
    function add(opts) {
        const src = opts && opts.src;
        if (!src) return;
        const probe = new Image();
        probe.onload = function () {
            const nw = probe.naturalWidth || 200, nh = probe.naturalHeight || 150;
            // starts small enough to sit on the page (never bigger than the picture itself)
            const k = Math.min(1, 300 / nw, 300 / nh, (canvas.clientWidth * 0.6 || 300) / nw);
            const w = Math.max(40, Math.round(nw * k));
            const h = Math.max(24, Math.round(nh * k));
            // the middle of what you can see of the note
            const box = (canvas.closest('.canvas-scrollbox') || canvas).getBoundingClientRect(), cr = canvas.getBoundingClientRect();
            const cx = (Math.max(box.left, cr.left) + Math.min(box.right, cr.right)) / 2;
            const cy = (Math.max(box.top, cr.top) + Math.min(box.bottom, cr.bottom)) / 2;
            const p = toLocal(cx, cy);
            const x = Math.round(Math.max(8, Math.min(p.x - w / 2, canvas.clientWidth - w - 8)));
            const y = Math.round(Math.max(8, p.y - h / 2));
            const el = make(src, opts.alt, x, y, w, h);
            canvas.appendChild(el);
            changed();
            select(el);
            toast('Image added on top of the document! Drag it, resize it, or press Delete to remove it!');
        };
        probe.onerror = function () { toast('That picture could not be opened!'); };
        probe.src = src;
    }

    /* ---------- the picture pickers ---------- */
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', function () {
        const f = input.files && input.files[0];
        input.value = '';
        if (!f) return;
        const r = new FileReader();
        r.onload = function () { add({ src: String(r.result || ''), alt: String(f.name || '').replace(/\.[a-z0-9]+$/i, '') }); };
        r.readAsDataURL(f);
    });
    document.body.appendChild(input);
    function pickFile() { input.click(); }
    function pickOpenDB() {
        if (!window.RadiiImages) { toast('OpenDB Images is not ready yet, try again in a moment!'); return; }
        window.RadiiImages.open({
            title: 'OpenDB Images on top of the document',
            accent: ACCENT, accent2: ACCENT2, glow: ACCENT + '4d',
            onPick: function (r) { add({ src: r.loaded, alt: r.alt }); }
        });
    }

    /* ---------- selecting, moving, resizing and rotating ---------- */
    // Tap an image that is already selected and its resize handles turn into rotate handles (tap again to switch back)
    let sel = null, ui = null, raf = 0, mode = 'scale';
    const DIRS = [['nw', -1, -1], ['n', 0, -1], ['ne', 1, -1], ['e', 1, 0], ['se', 1, 1], ['s', 0, 1], ['sw', -1, 1], ['w', -1, 0]];
    const CORNERS = DIRS.filter(function (d) { return d[1] && d[2]; });
    const CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
    const rad = (d) => d * Math.PI / 180;
    function angleOf(el) {
        const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform || '');
        return m ? parseFloat(m[1]) : 0;
    }
    function setAngle(el, deg) {
        deg = Math.round((((deg % 360) + 540) % 360 - 180) * 10) / 10; // (kept between -180 and 180)
        el.style.transform = deg ? 'rotate(' + deg + 'deg)' : '';
    }
    const rot = (x, y, deg) => ({ x: x * Math.cos(rad(deg)) - y * Math.sin(rad(deg)), y: x * Math.sin(rad(deg)) + y * Math.cos(rad(deg)) });
    // the image's middle (on screen, and in the note's own units), its size and its turn
    function geom(el) {
        const r = canvas.getBoundingClientRect(), s = scaleOf() || 1;
        const w = num(el, 'width'), h = num(el, 'height');
        const lx = num(el, 'left') + w / 2, ly = num(el, 'top') + h / 2;
        return { s: s, w: w, h: h, lx: lx, ly: ly, ang: angleOf(el),
            cx: r.left + (lx - canvas.scrollLeft + canvas.clientLeft) * s, cy: r.top + (ly - canvas.scrollTop + canvas.clientTop) * s };
    }
    function buildUi() {
        ui = document.createElement('div');
        ui.className = 'kd-ov-ui';
        ui.innerHTML = '<div class="kd-ov-frame"></div>';
        DIRS.forEach(function (d) {
            const h = document.createElement('div');
            h.className = 'kd-ov-h';
            h.setAttribute('data-dir', d[0]);
            ui.appendChild(h);
        });
        CORNERS.forEach(function (d) {
            const h = document.createElement('div');
            h.className = 'kd-ov-r';
            h.setAttribute('data-dir', d[0]);
            h.title = 'Drag to rotate (hold Shift to snap to 15 degrees)';
            ui.appendChild(h);
        });
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'kd-ov-x';
        x.title = 'Remove this image (Delete)';
        x.textContent = '✕';
        x.addEventListener('click', function (e) { e.stopPropagation(); remove(); });
        ui.appendChild(x);
        document.body.appendChild(ui);
    }
    function place() {
        if (!sel || !sel.isConnected) { select(null); return; }
        const g = geom(sel), W = g.w * g.s, H = g.h * g.s;
        const f = ui.querySelector('.kd-ov-frame');
        f.style.left = (g.cx - W / 2) + 'px'; f.style.top = (g.cy - H / 2) + 'px'; f.style.width = W + 'px'; f.style.height = H + 'px';
        f.style.transform = 'rotate(' + g.ang + 'deg)';
        const at = (d) => { const o = rot(d[1] * W / 2, d[2] * H / 2, g.ang); return { x: g.cx + o.x, y: g.cy + o.y }; };
        DIRS.forEach(function (d) {
            const h = ui.querySelector('.kd-ov-h[data-dir="' + d[0] + '"]'), p = at(d);
            h.style.display = mode === 'scale' ? '' : 'none';
            h.style.left = p.x + 'px'; h.style.top = p.y + 'px';
            // the resize arrow turned with the picture
            const a = ((Math.atan2(d[2] * H, d[1] * W) * 180 / Math.PI + g.ang) % 180 + 180) % 180;
            h.style.cursor = a < 22.5 || a >= 157.5 ? 'ew-resize' : a < 67.5 ? 'nwse-resize' : a < 112.5 ? 'ns-resize' : 'nesw-resize';
        });
        CORNERS.forEach(function (d) {
            const h = ui.querySelector('.kd-ov-r[data-dir="' + d[0] + '"]'), p = at(d);
            h.style.display = mode === 'rotate' ? '' : 'none';
            h.style.left = p.x + 'px'; h.style.top = p.y + 'px';
        });
        const x = ui.querySelector('.kd-ov-x'), ne = at(DIRS[2]);
        x.style.left = Math.max(4, Math.min(window.innerWidth - 30, ne.x + 8)) + 'px';
        x.style.top = Math.max(4, ne.y - 34) + 'px';
    }
    function loop() { raf = 0; if (!sel) return; place(); raf = requestAnimationFrame(loop); }
    function select(el) {
        if (el !== sel) mode = 'scale'; // (a newly selected image starts with its resize handles)
        sel = el;
        if (!el) {
            if (ui) { ui.remove(); ui = null; }
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            return;
        }
        if (!ui) buildUi();
        place();
        if (!raf) raf = requestAnimationFrame(loop);
    }
    function remove() {
        if (!sel) return;
        const el = sel;
        select(null);
        el.remove();
        changed();
    }
    function clamp(el) {
        const w = num(el, 'width'), h = num(el, 'height');
        el.style.left = Math.round(Math.max(-w + 24, Math.min(num(el, 'left'), canvas.clientWidth - 24))) + 'px';
        el.style.top = Math.round(Math.max(-h + 24, num(el, 'top'))) + 'px';
    }
    // kind is 'move', 'resize' or 'rotate'; wasSelected lets a plain tap on a selected image swap the handles
    function drag(el, e, kind, dir, wasSelected) {
        const s = scaleOf() || 1;
        const sx = e.clientX, sy = e.clientY;
        const x0 = num(el, 'left'), y0 = num(el, 'top'), w0 = num(el, 'width'), h0 = num(el, 'height');
        const g0 = geom(el), ang0 = g0.ang;
        const ratio = w0 / (h0 || 1);
        const a0 = Math.atan2(sy - g0.cy, sx - g0.cx) * 180 / Math.PI;
        let moved = false;
        function onMove(ev) {
            const dx = (ev.clientX - sx) / s, dy = (ev.clientY - sy) / s;
            if (!moved && Math.hypot(dx, dy) < 2) return;
            moved = true;
            if (kind === 'move') {
                el.style.left = Math.round(x0 + dx) + 'px';
                el.style.top = Math.round(y0 + dy) + 'px';
                clamp(el);
                return;
            }
            if (kind === 'rotate') {
                let a = ang0 + (Math.atan2(ev.clientY - g0.cy, ev.clientX - g0.cx) * 180 / Math.PI - a0);
                if (ev.shiftKey) a = Math.round(a / 15) * 15;
                setAngle(el, a);
                return;
            }
            // resizing happens in the picture's own (turned) directions, and the opposite side stays where it is
            const u = rot(dx, dy, -ang0);
            const hx = dir[1], hy = dir[2];
            let w = w0, h = h0;
            if (hx) w = Math.max(24, w0 + hx * u.x);
            if (hy) h = Math.max(24, h0 + hy * u.y);
            // corners keep the picture's shape (the bigger pull wins), edges stretch it
            if (hx && hy) {
                const k = Math.max(w / w0, h / h0);
                w = Math.max(24, w0 * k); h = Math.max(24, w / ratio);
            }
            const A = rot(-hx * w0 / 2, -hy * h0 / 2, ang0);      // the fixed point, from the old middle
            const B = rot(hx * w / 2, hy * h / 2, ang0);          // the same point, from the new middle
            const cx = g0.lx + A.x + B.x, cy = g0.ly + A.y + B.y;
            el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px';
            el.style.left = Math.round(cx - w / 2) + 'px'; el.style.top = Math.round(cy - h / 2) + 'px';
        }
        function onUp() {
            window.removeEventListener('pointermove', onMove, true);
            window.removeEventListener('pointerup', onUp, true);
            window.removeEventListener('pointercancel', onUp, true);
            if (moved) changed();
            else if (kind === 'move' && wasSelected) { mode = mode === 'rotate' ? 'scale' : 'rotate'; place(); }
        }
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
    }
    document.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        const t = e.target;
        if (!t || !t.closest) return;
        const rh = t.closest('.kd-ov-r');
        if (rh && sel) { e.preventDefault(); e.stopPropagation(); drag(sel, e, 'rotate'); return; }
        const handle = t.closest('.kd-ov-h');
        if (handle && sel) {
            e.preventDefault(); e.stopPropagation();
            drag(sel, e, 'resize', DIRS.filter(function (d) { return d[0] === handle.getAttribute('data-dir'); })[0]);
            return;
        }
        if (t.closest('.kd-ov-x')) return;
        const ov = t.closest('.kd-overlay');
        if (ov && canvas.contains(ov)) {
            e.preventDefault(); e.stopPropagation();
            const was = sel === ov;
            select(ov);
            drag(ov, e, 'move', null, was);
            return;
        }
        if (sel) select(null);
    }, true);
    document.addEventListener('keydown', function (e) {
        if (!sel) return;
        if (/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return; // (modifiers alone do nothing, Shift is held for snapping)
        const ae = document.activeElement;
        if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
        if (e.key === 'Escape') { select(null); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); remove(); return; }
        const step = e.shiftKey ? 10 : 1;
        const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (mv && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault(); e.stopPropagation();
            sel.style.left = (num(sel, 'left') + mv[0]) + 'px';
            sel.style.top = (num(sel, 'top') + mv[1]) + 'px';
            clamp(sel);
            changed();
            return;
        }
        // any other key goes back to the text
        select(null);
    }, true);
    window.addEventListener('resize', function () { if (sel) place(); });

    // a note opened from a file puts overlays inside its lines: they move out to the page itself
    function hoist(n) {
        const list = [];
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('.kd-overlay')) list.push(n);
        else if (n.querySelectorAll) n.querySelectorAll('.kd-overlay').forEach(function (x) { list.push(x); });
        list.forEach(function (o) { if (o.parentNode !== canvas && canvas.contains(o)) canvas.appendChild(o); });
    }
    try {
        new MutationObserver(function (muts) {
            muts.forEach(function (m) { m.addedNodes.forEach(hoist); });
        }).observe(canvas, { childList: true, subtree: true });
    } catch (e) {}
    canvas.querySelectorAll('.kd-overlay').forEach(hoist);

    window.DocOverlay = { add: add, pickFile: pickFile, pickOpenDB: pickOpenDB, select: select };

    // Classic Insert menu: "Image on Top..." and "OpenDB Image on Top..." right under "Image..."!
    const base = document.querySelector('#insert-menu-popup [data-insert="image"]');
    if (base) {
        const mk = function (kind, label) {
            const b = base.cloneNode(true);
            b.setAttribute('data-insert', kind);
            if (b.lastChild && b.lastChild.nodeType === 3) b.lastChild.nodeValue = label;
            return b;
        };
        const b2 = mk('topimageopendb', 'OpenDB Image on Top...');
        base.after(b2);
        base.after(mk('topimage', 'Image on Top...'));
    }
    const orig = window.runInsertKind;
    if (typeof orig === 'function') {
        window.runInsertKind = function (kind) {
            if (kind === 'topimage' || kind === 'topimageopendb') {
                try { if (typeof closeInsertMenu === 'function') closeInsertMenu(); } catch (e) {}
                if (kind === 'topimage') pickFile(); else pickOpenDB();
                return;
            }
            return orig.apply(this, arguments);
        };
    }
})();
