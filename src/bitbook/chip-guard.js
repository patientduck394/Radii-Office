/* =====================================================================
   Chip guard! One shared rule for EVERY formatting chip in the note (Gel Orbs, Gel Bubbles and all their
   cousins, Aero and Logo chips, Unique Chips, Custom Chips, Custom CSS chips, tag chips, Annotate highlights,
   effect text...):
   1. A chip is never empty. An empty inline chip would collapse to a thin line (it has no text to give it a
      height), so it always holds a zero-width placeholder and keeps its full chip shape and size!
   2. Deleting the last letter of a chip (Backspace, Delete, word delete or deleting a selection inside it) leaves
      the empty chip waiting for new text instead of removing the whole chip. Deleting once more, from the empty
      chip, removes it!
   3. Typing into a chip drops the placeholder, so the saved text stays clean!
   window.KdChips = { sel, of, seed }
   ===================================================================== */
(function () {
    'use strict';
    const ZW = '​';
    const canvas = document.getElementById('wysiwyg-canvas');
    if (!canvas) return;

    // every kind of formatting chip (the same families the Format sidebar's "Remove formatting" knows about)
    const SEL = [
        '.gel-orb', 'span[class*="-chip"]', 'span[class*="gel-chip-"]', 'span[class*="megachip-"]', 'span[class*="droplet-"]',
        'span[class*="effect-"]', 'span[class*="mkt-"]', 'span[class*="orange-hl-"]', 'span[class*="dev-chip-"]',
        'mark.an-hl', '.spark-text', '.liquid-underline', '.glossy-border-badge', '.cyber-glow-spark', '.liquid-text-glow',
        '.aqua-bubble-text', '.reflected-text-block', '.embossed-glass-text', '.kinetic-wave-text'
    ].join(', ');

    function editable(c) {
        if (!c || c === canvas || !canvas.contains(c)) return false;
        if (c.getAttribute('contenteditable') === 'false' || !c.isContentEditable) return false;
        // (chips that hold buttons, boxes or other locked pieces are applets, not text chips)
        return !c.querySelector('input, textarea, button, select, [contenteditable="false"]');
    }
    // the innermost text chip around a node
    function of(node) {
        let el = node && (node.nodeType === 3 ? node.parentElement : node);
        let c = el && el.closest ? el.closest(SEL) : null;
        while (c) {
            if (editable(c)) return c;
            c = c.parentElement && c.parentElement.closest ? c.parentElement.closest(SEL) : null;
        }
        return null;
    }
    const plain = (c) => (c.textContent || '').split(ZW).join('');
    const save = () => {
        try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {}
        try { if (typeof syncTopBarWithSelection === 'function') syncTopBarWithSelection(); } catch (e) {}
    };
    // puts the placeholder in an empty chip (and the caret after it when the caret was inside)
    function fill(c, withCaret) {
        while (c.firstChild) c.removeChild(c.firstChild);
        const z = document.createTextNode(ZW);
        c.appendChild(z);
        if (withCaret) {
            try { const s = window.getSelection(); const r = document.createRange(); r.setStart(z, 1); r.collapse(true); s.removeAllRanges(); s.addRange(r); } catch (e) {}
        }
        return z;
    }
    // an empty chip at the caret gets its placeholder
    function seed() {
        const s = window.getSelection();
        if (!s || !s.rangeCount || !s.isCollapsed) return;
        const c = of(s.anchorNode);
        if (!c || (c.textContent || '') !== '') return;
        fill(c, true);
    }
    let seedT = 0;
    document.addEventListener('selectionchange', function () {
        if (seedT) return;
        seedT = setTimeout(function () { seedT = 0; seed(); }, 0);
    });

    // deleting the chip's last letter keeps the (empty) chip
    document.addEventListener('beforeinput', function (e) {
        if (!/^delete(Content|Word|SoftLine|HardLine)(Backward|Forward)?$/.test(e.inputType || '')) return;
        const s = window.getSelection();
        if (!s || !s.rangeCount) return;
        const rng = s.getRangeAt(0);
        const chip = of(rng.startContainer);
        if (!chip || !chip.contains(rng.endContainer)) return;
        const text = plain(chip);
        if (!text) return; // (already empty: the next delete removes it)
        let gone = null;
        try {
            const t = e.getTargetRanges && e.getTargetRanges();
            if (t && t.length) { gone = document.createRange(); gone.setStart(t[0].startContainer, t[0].startOffset); gone.setEnd(t[0].endContainer, t[0].endOffset); }
        } catch (err) { gone = null; }
        let len = -1;
        if (gone && !gone.collapsed) {
            if (!chip.contains(gone.startContainer) || !chip.contains(gone.endContainer)) return; // (the delete reaches outside the chip)
            len = gone.toString().split(ZW).join('').length;
        } else if (!rng.collapsed) {
            len = rng.toString().split(ZW).join('').length;
        } else {
            const pre = document.createRange();
            pre.selectNodeContents(chip);
            pre.setEnd(rng.startContainer, rng.startOffset);
            const pos = pre.toString().split(ZW).join('').length;
            if (/Backward/.test(e.inputType)) len = pos > 0 ? 1 : 0;
            else if (/Forward/.test(e.inputType)) len = pos < text.length ? 1 : 0;
        }
        if (len >= text.length) {
            e.preventDefault();
            fill(chip, true);
            save();
        }
    }, true);

    // typing into a chip drops the placeholder
    document.addEventListener('input', function (e) {
        if (!/^insert/.test(e.inputType || '')) return;
        const s = window.getSelection();
        if (!s || !s.rangeCount) return;
        const chip = of(s.anchorNode);
        if (!chip || (chip.textContent || '').indexOf(ZW) === -1 || !plain(chip)) return;
        const walker = document.createTreeWalker(chip, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (n) {
            if (n.data.indexOf(ZW) === -1) return;
            let off = s.anchorNode === n ? s.anchorOffset : -1;
            if (off >= 0) off -= n.data.slice(0, off).split(ZW).length - 1;
            n.data = n.data.split(ZW).join('');
            if (off >= 0) {
                try { const r = document.createRange(); r.setStart(n, Math.max(0, off)); r.collapse(true); s.removeAllRanges(); s.addRange(r); } catch (err) {}
            }
        });
    });

    window.KdChips = { sel: SEL, of: of, seed: seed };
})();
