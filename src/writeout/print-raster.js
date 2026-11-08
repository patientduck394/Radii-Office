/* =====================================================================
   PRINT RASTER for Firefox: chips and divider lines print as sharp, high-resolution pictures!
   Chrome prints these soft, glowy styles sharply when they wear a do-nothing filter. Firefox prints a filtered box as a 72 dpi picture instead (and slices
   blurred shadows into small pieces), so in Firefox each chip and divider line is drawn here, ahead of time, at 4 times its size: its gradients, borders,
   shadows and the little highlights that sit on it (::before and ::after) become ONE picture that goes behind the real text while printing.
   The words stay real text (sharp at any size). Nothing is changed on screen, and nothing is saved in the document.
     KdPrintRaster.prepare(root)  draws (or refreshes) the pictures, returns a promise: it takes a moment, so it runs in the background
     KdPrintRaster.on() / off()   put the pictures in / take them out (wired to beforeprint and afterprint)
   ===================================================================== */
(function (root) {
    'use strict';
    if (!/Firefox\//.test(navigator.userAgent)) { root.KdPrintRaster = { prepare: function () { return Promise.resolve(); }, on: function () {}, off: function () {}, active: false }; return; }
    const SCALE = 4, PAD = 20;
    const SEL = '[class*="-chip"], .kd-div-line, .aero-liquid-divider';
    const cache = new WeakMap();   // element -> { sig, url, w, h }
    let placed = [];
    let working = null;

    const BOX = ['background-image', 'background-color', 'background-size', 'background-position', 'background-repeat', 'background-origin', 'background-clip',
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'box-shadow', 'opacity', 'filter', 'clip-path', 'mask-image', 'mask-mode', 'mask-repeat', 'mask-position', 'mask-size', 'mask-composite', 'mask-clip', 'mask-origin', 'transform', 'transform-origin', 'overflow', 'box-sizing', 'isolation'];
    const POS = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'z-index'];

    function pseudoOf(el, which) {
        const ps = getComputedStyle(el, which);
        if (!ps || ps.content === 'none' || ps.content === 'normal' || ps.display === 'none') return null;
        return ps;
    }
    function sigOf(el) {
        const cs = getComputedStyle(el), p = [];
        BOX.forEach(function (k) { p.push(cs.getPropertyValue(k)); });
        p.push(cs.width, cs.height);
        ['::before', '::after'].forEach(function (w) { const ps = pseudoOf(el, w); if (ps) { BOX.concat(POS).forEach(function (k) { p.push(ps.getPropertyValue(k)); }); } });
        return p.join('|');
    }
    function copy(ps, dst, props) { props.forEach(function (k) { dst.style.setProperty(k, ps.getPropertyValue(k)); }); }

    // the element's own box (no text, no children), plus its two highlight layers, as a little HTML tree the picture is drawn from
    function layerHtml(el) {
        const cs = getComputedStyle(el);
        let w = parseFloat(cs.width), h = parseFloat(cs.height);
        if (!(w >= 0) || !(h >= 0)) return null;
        if (cs.boxSizing !== 'border-box') {
            w += parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
            h += parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        }
        if (!(w > 0) || w > 3000 || h > 600) return null;
        const box = document.createElement('div');
        copy(cs, box, BOX);
        box.style.cssText += ';position:absolute;display:block;margin:0;padding:0;left:' + PAD + 'px;top:' + PAD + 'px;width:' + w + 'px;height:' + h + 'px;box-sizing:border-box;transform:none';
        // (border widths are part of the box: width and height above already include them)
        ['::before', '::after'].forEach(function (which) {
            const ps = pseudoOf(el, which);
            if (!ps) return;
            const p = document.createElement('div');
            copy(ps, p, BOX); copy(ps, p, POS);
            p.style.display = 'block';
            if (ps.position === 'static') p.style.position = 'relative';
            // a highlight that sits behind the text (z-index below 0) still sits above the chip's own background, as the chip is its own layer
            box.appendChild(p);
        });
        return { html: box, w: w, h: h };
    }
    function drawLayer(el) {
        const lay = layerHtml(el);
        if (!lay) return Promise.resolve(null);
        const W = lay.w + PAD * 2, H = lay.h + PAD * 2;
        const wrap = document.createElement('div');
        wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        wrap.style.cssText = 'position:relative;width:' + W + 'px;height:' + H + 'px';
        wrap.appendChild(lay.html);
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (W * SCALE) + '" height="' + (H * SCALE) + '" viewBox="0 0 ' + W + ' ' + H + '"><foreignObject x="0" y="0" width="' + W + '" height="' + H + '">' +
            new XMLSerializer().serializeToString(wrap) + '</foreignObject></svg>';
        return new Promise(function (resolve) {
            const img = new Image();
            img.onload = function () {
                try {
                    const c = document.createElement('canvas');
                    c.width = Math.round(W * SCALE); c.height = Math.round(H * SCALE);
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    resolve({ url: c.toDataURL('image/png'), w: W, h: H });
                } catch (e) { resolve(null); }
            };
            img.onerror = function () { resolve(null); };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        });
    }

    // draws the pictures for everything that needs one and does not have a fresh one yet (one at a time, so the page stays smooth)
    function prepare(scope) {
        const top = scope && scope.querySelectorAll ? scope : document;
        const list = Array.from(top.querySelectorAll(SEL)).filter(function (el) { return el.offsetParent !== null || getComputedStyle(el).position === 'fixed'; });
        const run = function () {
            let chain = Promise.resolve();
            list.forEach(function (el) {
                chain = chain.then(function () {
                    let sig;
                    try { sig = sigOf(el); } catch (e) { return; }
                    const have = cache.get(el);
                    if (have && have.sig === sig) return;
                    return drawLayer(el).then(function (r) {
                        if (!r) { cache.delete(el); return; }
                        // the picture is made into a ready <img> now (loaded and decoded), because printing starts the moment beforeprint ends
                        const img = new Image();
                        img.className = 'kd-rast-img'; img.alt = ''; img.setAttribute('aria-hidden', 'true');
                        img.src = r.url;
                        const done = function () { cache.set(el, { sig: sig, img: img, w: r.w, h: r.h }); return new Promise(function (go) { setTimeout(go, 0); }); };
                        return (img.decode ? img.decode() : Promise.resolve()).then(done, done);
                    });
                });
            });
            return chain;
        };
        working = (working || Promise.resolve()).then(run);
        return working;
    }

    const style = document.createElement('style');
    style.textContent = '.kd-rast-img { display: none; } @media print { .kd-rasted { background: none !important; box-shadow: none !important; border-color: transparent !important; filter: none !important; ' +
        '-webkit-backdrop-filter: none !important; backdrop-filter: none !important; isolation: isolate !important; clip-path: none !important; -webkit-mask: none !important; mask: none !important; }' +
        ' .kd-rasted::before, .kd-rasted::after { display: none !important; } .kd-rast-img { display: block; } }';
    document.head.appendChild(style);

    function on() {
        off();
        Array.from(document.querySelectorAll(SEL)).forEach(function (el) {
            const have = cache.get(el);
            if (!have) return;
            let sig;
            try { sig = sigOf(el); } catch (e) { return; }
            if (sig !== have.sig) return;   // it changed since its picture was drawn: it prints the normal way
            const cs = getComputedStyle(el);
            const img = have.img;
            img.style.cssText = 'position:absolute;z-index:-1;pointer-events:none;max-width:none;margin:0;padding:0;border:0;left:' + (-PAD - parseFloat(cs.borderLeftWidth || 0)) + 'px;top:' + (-PAD - parseFloat(cs.borderTopWidth || 0)) + 'px;width:' + have.w + 'px;height:' + have.h + 'px';
            const rec = { el: el, img: img, pos: el.style.position };
            if (cs.position === 'static') el.style.position = 'relative';
            el.insertBefore(img, el.firstChild);
            el.classList.add('kd-rasted');
            placed.push(rec);
        });
    }
    function off() {
        placed.forEach(function (r) { r.img.remove(); r.el.classList.remove('kd-rasted'); r.el.style.position = r.pos; if (!r.el.getAttribute('style')) r.el.removeAttribute('style'); });
        placed = [];
    }

    root.KdPrintRaster = { prepare: prepare, on: on, off: off, active: true, count: function () { return placed.length; } };
    window.addEventListener('afterprint', off);
})(window);
