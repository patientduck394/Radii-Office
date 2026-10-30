/* OpenDB Images for Amber! Pick a free OpenDB picture and drop it on the
   current slide as a resizable object (with a source line underneath, if you ask)! */
(function () {
    'use strict';
    function open() {
        if (!window.RadiiImages) return;
        window.RadiiImages.open({
            title: 'OpenDB Images',
            accent: '#d97706', accent2: '#fbbf24', glow: 'rgba(217,119,6,.3)',
            onPick: function (r) {
                saveState();
                const w = Math.min(420, Math.max(160, r.width || 420));
                const h = Math.round(w * ((r.height || 3) / (r.width || 4)));
                const credit = r.withCredit ? '<div style="font-size:11px;line-height:1.3;margin-top:4px;opacity:.9">' + r.creditHtml + '</div>' : '';
                const id = 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
                slides[activeSlideIndex].elements.push({
                    id: id, type: 'text',
                    content: '<img src="' + r.loaded.replace(/"/g, '&quot;') + '" alt="' + String(r.alt).replace(/"/g, '&quot;') + '" style="width:100%;display:block;border-radius:6px">' + credit,
                    top: 70, left: 90, width: w, height: h + (r.withCredit ? 48 : 0),
                    zIndex: slides[activeSlideIndex].elements.length + 1, fontSize: '11px', color: '#ffffff'
                });
                activeElementId = id;
                editingElementId = null;
                renderThumbnails();
                renderActiveSlide();
                try { if (window.OfficeShell) { window.OfficeShell.sync(); window.OfficeShell.toast('Picture added to the slide!'); } } catch (e) {}
            }
        });
    }
    window.openOnlinePictures = open;
    // Classic toolbar button, right after the Text Box button!
    const tb = document.querySelector('.style-tool-btn[onclick="addTextBox()"]');
    if (tb) {
        const b = document.createElement('button');
        b.className = 'style-tool-btn';
        b.title = 'OpenDB Images';
        b.setAttribute('data-tooltip', 'Free pictures from OpenDB');
        b.setAttribute('onclick', 'openOnlinePictures()');
        b.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 18l6-6 4 4 4-4 4 4"/></g></svg>';
        tb.after(b);
    }
})();
