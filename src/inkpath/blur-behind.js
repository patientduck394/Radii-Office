/* =====================================================================
   BLUR BEHIND for Inkpath: a shape that blurs everything behind it, like frosted glass!
   Set a shape's `blurBehind` (0 to 40 px, the Blur Behind slider in the inspector). Right after the shape is drawn,
   app.js calls inkpathBB.after(), which puts a layer just BEHIND it: a copy of everything drawn before it, blurred, and
   clipped to the shape's own outline. Everything is ordinary SVG (a clipPath, a filter and copies of the earlier shapes),
   so the picture exports as SVG and PNG exactly as you see it, and it works in every SVG viewer.
   The clip is a <use> of the shape's outline, so animation.js can move it together with the shape.
   ===================================================================== */
(function (root) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const GEOMETRY = ['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'd', 'points', 'transform', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'letter-spacing'];
    const FLAT = /^(boolean|clip|mask|line)$/;
    const uses = {};   // idx -> the <use> that draws the clip outline (animation.js animates it with the shape)

    function outlineOf(el) {
        const tag = el.tagName.toLowerCase();
        const o = document.createElementNS(NS, tag === 'image' ? 'rect' : tag);
        GEOMETRY.forEach((a) => { if (el.hasAttribute(a)) o.setAttribute(a, el.getAttribute(a)); });
        if (tag === 'text') o.textContent = el.textContent;
        return o;
    }
    // a copy of a drawn node that can sit behind the shape: not clickable, not selected
    function copyOf(node) {
        const c = node.cloneNode(true);
        const clean = (e) => {
            if (e.nodeType !== 1) return;
            e.removeAttribute('data-idx');
            if (e.classList) { e.classList.remove('shape-element', 'shape-selected'); if (!e.classList.length) e.removeAttribute('class'); }
        };
        clean(c); c.querySelectorAll('*').forEach(clean);
        return c;
    }

    function after(obj, idx, start, layer) {
        uses[idx] = null;
        const amount = Math.max(0, Math.min(60, +obj.blurBehind || 0));
        if (!amount || FLAT.test(obj.type)) return;
        const nodes = Array.from(layer.childNodes).slice(start);
        const el = nodes.find((n) => n.classList && n.classList.contains('shape-element'));
        if (!el) return;
        // everything drawn before this shape (the first child is the canvas border)
        const before = Array.from(layer.childNodes).slice(1, start);
        if (!before.length) return;
        const defs = document.getElementById('svg-defs');

        const outline = outlineOf(el);
        outline.setAttribute('id', 'bbs-' + idx);
        defs.appendChild(outline);
        const clip = document.createElementNS(NS, 'clipPath');
        clip.setAttribute('id', 'bbc-' + idx);
        const use = document.createElementNS(NS, 'use');
        use.setAttribute('href', '#bbs-' + idx);
        clip.appendChild(use);
        defs.appendChild(clip);
        uses[idx] = use;

        const f = document.createElementNS(NS, 'filter');
        f.setAttribute('id', 'bbf-' + idx);
        f.setAttribute('filterUnits', 'userSpaceOnUse');
        f.setAttribute('color-interpolation-filters', 'sRGB');
        const W = typeof CANVAS_BOUNDS !== 'undefined' ? CANVAS_BOUNDS.width : 1200, H = typeof CANVAS_BOUNDS !== 'undefined' ? CANVAS_BOUNDS.height : 800;
        f.setAttribute('x', -120); f.setAttribute('y', -120); f.setAttribute('width', W + 240); f.setAttribute('height', H + 240);
        const blur = document.createElementNS(NS, 'feGaussianBlur');
        blur.setAttribute('stdDeviation', amount);
        f.appendChild(blur);
        defs.appendChild(f);

        const g = document.createElementNS(NS, 'g');
        g.setAttribute('clip-path', 'url(#bbc-' + idx + ')');
        g.setAttribute('pointer-events', 'none');
        g.setAttribute('data-blur-behind', idx);
        const inner = document.createElementNS(NS, 'g');
        inner.setAttribute('filter', 'url(#bbf-' + idx + ')');
        before.forEach((n) => inner.appendChild(copyOf(n)));
        g.appendChild(inner);
        layer.insertBefore(g, nodes[0]);
    }

    root.inkpathBB = { after: after, uses: uses };
})(typeof window !== 'undefined' ? window : this);
