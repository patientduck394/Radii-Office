/* =====================================================================
   Annotate in Amber! Draw right on a slide with Bitbook's Annotate inks
   (Gel Ink, Felt Pen, Highlighter, Neon, Crayon and the Theme Packs, in
   16 colors). Each slide keeps its own drawing (slide.ink, a list of
   strokes in slide pixels), so it saves, undoes, travels with the deck,
   shows in the thumbnails and plays in the slide show.
   Uses bitbook/annotate-ink.js (window.AnnotateInk). window.AmberAnnotate
   ===================================================================== */
(function () {
    'use strict';
    if (typeof slides === 'undefined') return;
    const AI = function () { return window.AnnotateInk || null; };
    const toast = function (m) { try { if (window.OfficeShell) window.OfficeShell.toast(m); } catch (e) {} };
    const canvas = function () { return document.getElementById('slide-canvas'); };
    const V_W = 720, V_H = 405;
    let drawing = false;

    function inkOf(s) { return s && Array.isArray(s.ink) ? s.ink : []; }
    function layerIn(root) { return root ? root.querySelector(':scope > svg.an-ink-layer') : null; }
    // the slide's drawing on the editing canvas (and an empty one while drawing, so there is something to draw on)
    function putLayer() {
        const c = canvas(), ai = AI();
        if (!c || !ai) return;
        const old = layerIn(c);
        if (old) old.remove();
        const list = inkOf(slides[activeSlideIndex]);
        if (!list.length && !drawing) return;
        c.insertAdjacentHTML('beforeend', ai.layerHtml(list));
        const layer = layerIn(c);
        layer.classList.add('am-ink');
        layer.setAttribute('width', V_W);
        layer.setAttribute('height', V_H);
    }
    // a small copy of a drawing, for thumbnails and the slide show
    function inkSvg(list, cls) {
        const ai = AI();
        if (!ai || !list.length) return '';
        return '<svg class="' + cls + '" viewBox="0 0 ' + V_W + ' ' + V_H + '" preserveAspectRatio="none" aria-hidden="true">' + ai.DEFS + list.map(function (s) { return ai.strokeSvg(s); }).join('') + '</svg>';
    }
    function keep() {
        const layer = layerIn(canvas()), ai = AI();
        if (!ai) return;
        const s = slides[activeSlideIndex];
        const list = layer ? ai.strokesOf(layer) : [];
        if (list.length) s.ink = list; else delete s.ink;
        try { amberQueueSave(); } catch (e) {}
        thumbs();
    }
    function thumbs() {
        document.querySelectorAll('#thumbnail-strip .thumbnail-card').forEach(function (card, i) {
            const live = card.querySelector('.thumbnail-live');
            if (!live) return;
            const old = live.querySelector('.am-thumb-ink');
            if (old) old.remove();
            const list = inkOf(slides[i]);
            if (list.length) live.insertAdjacentHTML('beforeend', inkSvg(list, 'am-thumb-ink'));
        });
    }

    // Amber redraws the slide and the thumbnails often: the drawing goes back on each time
    const wrap = function (name, after) {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function () { const r = orig.apply(this, arguments); try { after(); } catch (e) {} return r; };
    };
    wrap('renderActiveSlide', putLayer);
    wrap('renderThumbnails', thumbs);

    // strokes save the moment they are drawn (Annotate tells the page with an input event)
    document.addEventListener('input', function (e) {
        if (!drawing || e.target !== canvas()) return;
        keep();
    }, true);
    // while drawing, a press on the drawing is only for the pen (not for selecting or moving things on the slide)
    ['mousedown', 'click', 'dblclick'].forEach(function (type) {
        document.addEventListener(type, function (e) {
            if (!drawing) return;
            const layer = layerIn(canvas());
            if (layer && (e.target === layer || layer.contains(e.target))) e.stopPropagation();
        }, true);
    });

    function start() {
        const ai = AI();
        if (!ai) { toast('Annotate could not load!'); return; }
        if (drawing) { ai.stop(); return; }
        try { saveState(); } catch (e) {}
        editingElementId = null;
        activeElementId = null;
        drawing = true;
        document.body.classList.add('am-annotating');
        renderActiveSlide();
        ai.start(canvas(), {
            // the slide is zoomed to fit the window: a point on screen goes back to the slide's own 720 x 405 pixels
            // (browsers disagree about zoom: some report the zoomed box, WebKit reports the unzoomed one while the pointer stays zoomed)
            toLocal: function (e) {
                const c = canvas(), r = c.getBoundingClientRect();
                const z = parseFloat(c.style.zoom) || 1, w = c.offsetWidth || V_W;
                const zoomedBox = Math.abs(r.width - w * z) < Math.abs(r.width - w);
                const x = zoomedBox ? (e.clientX - r.left) / z : e.clientX / z - r.left;
                const y = zoomedBox ? (e.clientY - r.top) / z : e.clientY / z - r.top;
                return [x * V_W / w, y * V_H / (c.offsetHeight || V_H)];
            },
            onStop: function () {
                drawing = false;
                document.body.classList.remove('am-annotating');
                keep();
                renderActiveSlide();
                try { if (window.OfficeShell) window.OfficeShell.sync(); } catch (e) {}
            }
        });
        try { if (window.OfficeShell) window.OfficeShell.sync(); } catch (e) {}
        toast('Draw on the slide! Switch slides from the thumbnails to draw on another one, and press Done (or Esc) when you finish!');
    }
    function clearSlide() {
        const s = slides[activeSlideIndex];
        if (!inkOf(s).length) { toast('This slide has no drawing!'); return; }
        try { saveState(); } catch (e) {}
        delete s.ink;
        renderActiveSlide(); thumbs();
        try { amberQueueSave(); } catch (e) {}
        toast('Removed the drawing from this slide!');
    }
    function clearAll() {
        const n = slides.filter(function (s) { return inkOf(s).length; }).length;
        if (!n) { toast('No slide has a drawing!'); return; }
        try { saveState(); } catch (e) {}
        slides.forEach(function (s) { delete s.ink; });
        renderActiveSlide(); thumbs();
        try { amberQueueSave(); } catch (e) {}
        toast('Removed the drawings from ' + n + ' slide' + (n === 1 ? '' : 's') + '!');
    }

    const st = document.createElement('style');
    st.textContent = '#slide-canvas > svg.an-ink-layer.am-ink{z-index:9000}' +
        '.am-thumb-ink{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9000;overflow:visible}' +
        '.as-slide > .am-show-ink{position:absolute;left:0;top:0;width:' + V_W + 'px;height:' + V_H + 'px;pointer-events:none;z-index:9000;overflow:visible}' +
        'body.am-annotating #slide-canvas .slide-element{pointer-events:none}';
    document.head.appendChild(st);

    window.AmberAnnotate = {
        start: start, isOn: function () { return drawing; }, clearSlide: clearSlide, clearAll: clearAll,
        // the slide show adds each slide's drawing on top of it
        showLayer: function (slide) { return inkSvg(inkOf(slide), 'am-show-ink'); }
    };
})();
