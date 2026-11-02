/* =====================================================================
   Inkpath drawings (.kv) in Writeout and Bitbook! Insert > "Inkpath
   Drawing (.kv)..." (or the Image picker, or dropping a .kv file on the
   page) draws the file with Inkpath's own engine (/inkpath/render.html,
   in a hidden frame that never saves anything) and puts the finished
   picture in at the caret: gradients, effects, booleans and all!
   window.RadiiKV.toImage(text) -> Promise of { src, width, height }
   ===================================================================== */
(function () {
    'use strict';
    const RENDERER = '/inkpath/render.html';
    let frameReady = null;
    function renderer() {
        if (frameReady) return frameReady;
        frameReady = new Promise((resolve, reject) => {
            const f = document.createElement('iframe');
            f.setAttribute('aria-hidden', 'true');
            f.tabIndex = -1;
            f.style.cssText = 'position:fixed;left:-20000px;top:0;width:1200px;height:800px;border:0;opacity:0;pointer-events:none';
            const fail = () => { frameReady = null; f.remove(); reject(new Error('Inkpath could not be loaded to draw this file! Check your internet connection and try again!')); };
            const t = setTimeout(fail, 20000);
            f.addEventListener('load', () => {
                clearTimeout(t);
                let fn = null;
                try { fn = f.contentWindow.inkpathKvToSvg; } catch (e) {}
                if (typeof fn === 'function') resolve(f); else fail();
            });
            f.src = RENDERER;
            document.body.appendChild(f);
        });
        return frameReady;
    }
    function toImage(text) {
        return renderer().then((f) => {
            const r = f.contentWindow.inkpathKvToSvg(text);
            const b64 = btoa(unescape(encodeURIComponent(r.svg)));
            return { src: 'data:image/svg+xml;base64,' + b64, width: r.width, height: r.height };
        });
    }
    window.RadiiKV = { toImage: toImage };

    const editor = () => document.getElementById('wysiwyg-canvas');
    if (!editor()) return;
    const isKv = (file) => !!file && /\.(kv)$/i.test(file.name || '');
    const toast = (msg) => { try { if (window.OfficeShell) window.OfficeShell.toast(msg); } catch (e) {} };
    function caret() {
        try { const s = window.getSelection(); if (s.rangeCount && editor().contains(s.anchorNode)) return s.getRangeAt(0).cloneRange(); } catch (e) {}
        return null;
    }
    function place(r, name, saved) {
        const ed = editor();
        ed.focus();
        try { if (saved) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); } } catch (e) {}
        const holder = document.createElement('span');
        holder.className = 'img-resize';
        const img = document.createElement('img');
        img.src = r.src;
        img.alt = name || 'Inkpath drawing';
        img.className = 'inkpath-drawing';
        img.style.width = Math.min(r.width, 640) + 'px';
        holder.appendChild(img);
        if (typeof fmtInsertNodeAtCaret === 'function') fmtInsertNodeAtCaret(holder); else ed.appendChild(holder);
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    }
    function addFile(file, saved) {
        const reader = new FileReader();
        reader.onload = () => {
            toImage(String(reader.result || ''))
                .then((r) => { place(r, String(file.name || '').replace(/\.kv$/i, ''), saved); toast('Inkpath drawing added!'); })
                .catch((e) => { const m = (e && e.message) || 'That .kv file could not be drawn!'; toast(m); if (!window.OfficeShell) alert(m); });
        };
        reader.readAsText(file);
    }

    // a picker just for .kv files
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.kv';
    picker.hidden = true;
    picker.id = 'insert-kv-input';
    let pickSaved = null;
    picker.addEventListener('change', () => {
        const file = picker.files && picker.files[0];
        if (file) addFile(file, pickSaved);
        picker.value = '';
    });
    document.body.appendChild(picker);
    function openPicker() { pickSaved = caret(); picker.click(); }
    window.insertInkpathDrawing = openPicker;

    // the Image picker takes .kv files too
    const imgInput = document.getElementById('insert-image-input');
    if (imgInput) {
        imgInput.setAttribute('accept', (imgInput.getAttribute('accept') || 'image/*') + ',.kv');
        let imgSaved = null;
        imgInput.addEventListener('click', () => { imgSaved = caret(); }, true);
        imgInput.addEventListener('change', (e) => {
            const file = imgInput.files && imgInput.files[0];
            if (!isKv(file)) return;
            e.stopImmediatePropagation();
            addFile(file, imgSaved || caret());
            imgInput.value = '';
        }, true);
    }

    // dropping a .kv file on the page
    editor().addEventListener('drop', (e) => {
        const files = e.dataTransfer && e.dataTransfer.files;
        const kv = files && Array.from(files).filter(isKv);
        if (!kv || !kv.length) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        let at = null;
        try {
            if (document.caretRangeFromPoint) at = document.caretRangeFromPoint(e.clientX, e.clientY);
            else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { at = document.createRange(); at.setStart(p.offsetNode, p.offset); } }
        } catch (err) {}
        kv.forEach((f) => addFile(f, at));
    }, true);

    // Classic Insert menu: "Inkpath Drawing (.kv)..." right under "Image..." (and draw.io)!
    const after = document.querySelector('#insert-menu-popup [data-insert="drawio"]') || document.querySelector('#insert-menu-popup [data-insert="image"]');
    if (after) {
        const b = after.cloneNode(true);
        b.setAttribute('data-insert', 'inkpath');
        if (b.lastChild && b.lastChild.nodeType === 3) b.lastChild.nodeValue = 'Inkpath Drawing (.kv)...';
        after.after(b);
    }
    const orig = window.runInsertKind;
    if (typeof orig === 'function') {
        window.runInsertKind = function (kind) {
            if (kind === 'inkpath') { try { if (typeof closeInsertMenu === 'function') closeInsertMenu(); } catch (e) {} openPicker(); return; }
            return orig.apply(this, arguments);
        };
    }
})();
