/* draw.io diagrams for Amber! Draw a diagram in the draw.io editor and drop it on the current slide
   as a resizable object; double-click it later to keep editing it in draw.io. */
(function () {
    'use strict';
    const THEME = { accent: '#d97706', accent2: '#fbbf24' };
    const pic = (png) => '<img class="drawio-diagram" src="' + png.replace(/"/g, '&quot;') + '" alt="draw.io diagram" title="Double-click to edit this diagram!" style="width:100%;display:block">';
    function open() {
        if (!window.RadiiDrawio) return;
        window.RadiiDrawio.open(Object.assign({ onDone: function (r) {
            saveState();
            const w = Math.min(480, Math.max(160, r.w));
            const id = 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
            slides[activeSlideIndex].elements.push({
                id: id, type: 'text', content: pic(r.png),
                top: 70, left: 90, width: w, height: Math.round(w * r.h / r.w),
                zIndex: slides[activeSlideIndex].elements.length + 1, fontSize: '11px', color: '#ffffff'
            });
            activeElementId = id;
            editingElementId = null;
            renderThumbnails();
            renderActiveSlide();
            try { if (window.OfficeShell) { window.OfficeShell.sync(); window.OfficeShell.toast('draw.io diagram added! Double-click it to edit it again!'); } } catch (e) {}
        } }, THEME));
    }
    window.openDrawioDiagram = open;
    // double-clicking a diagram opens draw.io (instead of editing it as text)
    const canvas = document.getElementById('slide-canvas');
    if (canvas) canvas.addEventListener('dblclick', function (e) {
        const img = e.target.closest && e.target.closest('img.drawio-diagram');
        const box = img && img.closest('.slide-element');
        if (!img || !box || !window.RadiiDrawio) return;
        e.preventDefault();
        e.stopPropagation();
        const el = slides[activeSlideIndex].elements.find(function (x) { return x.id === box.dataset.elId; });
        if (!el) return;
        window.RadiiDrawio.open(Object.assign({ png: img.getAttribute('src'), onDone: function (r) {
            saveState();
            el.content = pic(r.png);
            renderThumbnails();
            renderActiveSlide();
            try { if (window.OfficeShell) window.OfficeShell.toast('Diagram updated!'); } catch (err) {}
        } }, THEME));
    }, true);
    // Classic toolbar button, right after the OpenDB Images button!
    const after = document.querySelector('.style-tool-btn[onclick="openOnlinePictures()"]');
    if (after) {
        const b = document.createElement('button');
        b.className = 'style-tool-btn';
        b.title = 'draw.io';
        b.setAttribute('data-tooltip', 'Draw a diagram in draw.io');
        b.setAttribute('onclick', 'openDrawioDiagram()');
        b.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect x="3" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="15" width="8" height="6" rx="1.5"/><path d="M7 9v6h6M17 15V9h-4"/></g></svg>';
        after.after(b);
    }
})();
