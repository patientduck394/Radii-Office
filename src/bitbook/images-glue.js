/* OpenDB Images for the document editor (Writeout + Bitbook)! Opens the
   Radii Images picker and drops the chosen OpenDB picture (and a source line,
   if you ask for one) at your caret. Works from the ribbon (Insert > OpenDB
   Images) and from the Classic Insert menu! */
(function () {
    'use strict';
    const KEY = (window.RADII_COLLAB_APP && window.RADII_COLLAB_APP.key) || (location.pathname.indexOf('bitbook') !== -1 ? 'bitbook' : 'writeout');
    const THEME = KEY === 'bitbook'
        ? { accent: '#9333ea', accent2: '#d946ef', glow: 'rgba(147,51,234,.3)' }
        : { accent: '#0284c7', accent2: '#38bdf8', glow: 'rgba(2,132,199,.3)' };
    function editor() { return document.getElementById('wysiwyg-canvas'); }
    function open() {
        const ed = editor();
        if (!ed || !window.RadiiImages) return;
        let saved = null;
        try { const s = window.getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); } catch (e) {}
        window.RadiiImages.open(Object.assign({
            title: 'OpenDB Images',
            onPick: function (r) {
                ed.focus();
                try { if (saved) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); } } catch (e) {}
                if (typeof fmtInsertImageDataURL !== 'function') return;
                fmtInsertImageDataURL(r.loaded, r.alt);
                if (r.withCredit && typeof fmtInsertNodeAtCaret === 'function') {
                    const c = document.createElement('span');
                    c.className = 'img-credit';
                    c.setAttribute('contenteditable', 'false');
                    c.setAttribute('style', 'display:block;font-size:11px;line-height:1.4;color:#64748b;margin:2px 0 8px;font-weight:500;font-style:normal');
                    c.innerHTML = r.creditHtml;
                    fmtInsertNodeAtCaret(c);
                }
                ed.dispatchEvent(new Event('input', { bubbles: true }));
                try { if (window.OfficeShell) window.OfficeShell.toast('Picture added' + (r.withCredit ? ' with its source line!' : '!')); } catch (e) {}
            }
        }, THEME));
    }
    window.openOnlinePictures = open;
    // Classic Insert menu: "OpenDB Image..." right under "Image..."!
    const img = document.querySelector('#insert-menu-popup [data-insert="image"]');
    if (img) {
        const b = img.cloneNode(true);
        b.setAttribute('data-insert', 'onlineimage');
        b.lastChild.nodeType === 3 && (b.lastChild.nodeValue = 'OpenDB Image...');
        img.after(b);
    }
    const orig = window.runInsertKind;
    if (typeof orig === 'function') {
        window.runInsertKind = function (kind) {
            if (kind === 'onlineimage') { try { if (typeof closeInsertMenu === 'function') closeInsertMenu(); } catch (e) {} open(); return; }
            return orig.apply(this, arguments);
        };
    }
})();
