/* =====================================================================
   Custom Emoji / Symbol (Writeout and Bitbook, identical copy in each)!
   Draw on a square canvas with the Annotator's own inks, Theme Pack styles and colors (bitbook/annotate-ink.js) and put the drawing
   right inside your text like an emoji. It is saved as Keydown text:  @@emoji="d='gel:orange:9:M10 20Q30 40 50 50',size='md'"
   Double-click an emoji in the page to draw on it again!
   Needs the Keydown engine (keydown-doc.js) for the drawing itself.
   ===================================================================== */
(function () {
    'use strict';
    if (window.KdEmoji) return;

    // The Annotator's inks, Theme Pack styles and colors (bitbook/annotate-ink.js); a small set of our own if it did not load
    const AIK = () => window.AnnotateInk || null;
    const FALLBACK_COLORS = [['red', '#ef4444', '#dc2626', '#f9b4b4'], ['orange', '#f97316', '#ea580c', '#fdc7a2'], ['gold', '#ea9f08', '#ca8a04', '#f7d99c'], ['yellow', '#ead708', '#caa604', '#f7ef9c'], ['lime', '#84cc16', '#65a30d', '#ceeba2'], ['green', '#10b981', '#059669', '#9fe3cd'], ['turquoise', '#30e5cd', '#26b1a5', '#acf5eb'], ['teal', '#06b6d4', '#0891b2', '#9be2ee'], ['cyan', '#30d3e5', '#26a3b1', '#acedf5'], ['blue', '#3b82f6', '#2563eb', '#b1cdfb'], ['purple', '#a855f7', '#9333ea', '#dcbbfc'], ['pink', '#ec4899', '#db2777', '#f7b6d6'], ['slate', '#b4b4b4', '#6f6f6f', '#e1e1e1']];
    const COLORS = () => (AIK() ? AIK().COLORS : FALLBACK_COLORS);
    const INKS = () => (AIK() ? AIK().INKS : [['pen', 'Felt Pen'], ['marker', 'Highlighter']]);
    const PACKS = () => (AIK() ? AIK().PACKS : []);
    const BASE = () => (AIK() ? AIK().BASE : { pen: 2.6, marker: 18 });
    const SIZES = [['s', 'S', 0.6], ['m', 'M', 1], ['l', 'L', 1.7]];
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function css() {
        if (document.getElementById('kd-emoji-css')) return;
        const s = document.createElement('style');
        s.id = 'kd-emoji-css';
        s.textContent = '.kd-emoji{display:inline-block;width:1.5em;height:1.5em;vertical-align:-0.32em;margin:0 0.08em;line-height:1;cursor:pointer}'
            + '.kd-emoji-sm{width:1.15em;height:1.15em;vertical-align:-0.2em}.kd-emoji-lg{width:3.2em;height:3.2em;vertical-align:-0.8em}'
            + '.kd-emoji svg{display:block;width:100%;height:100%;pointer-events:none}'
            + '.kde-back{position:fixed;inset:0;z-index:2147483100;display:grid;place-items:center;padding:14px;background:rgba(8,30,52,.5);backdrop-filter:blur(4px)}'
            + '.kde-card{width:min(420px,100%);max-height:96vh;overflow:auto;background:linear-gradient(180deg,#f7fbff,#e6f2fc);border:1px solid #b6dcff;border-radius:18px;padding:14px 16px;box-shadow:0 20px 60px rgba(0,0,0,.4);font:600 13px "Segoe UI",system-ui,sans-serif;color:#1d3a57}'
            + '.kde-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.kde-head b{font-size:16px}.kde-head button{border:0;background:none;font-size:22px;cursor:pointer;color:#5b7690}'
            + '.kde-surface{position:relative;width:100%;aspect-ratio:1/1;border-radius:12px;border:2px solid #7cc3ff;touch-action:none;cursor:crosshair;overflow:hidden;background-color:#fff;background-image:linear-gradient(45deg,#e8eef4 25%,transparent 25%,transparent 75%,#e8eef4 75%),linear-gradient(45deg,#e8eef4 25%,transparent 25%,transparent 75%,#e8eef4 75%);background-size:16px 16px;background-position:0 0,8px 8px}'
            + '.kde-surface svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'
            + '.kde-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}'
            + '.kde-sw{width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #8aa9c4;cursor:pointer;padding:0}.kde-sw.on{box-shadow:0 0 0 2px #0a6cff}'
            + '.kde-btn{border:1px solid #9fcbf0;background:#fff;border-radius:999px;padding:4px 11px;font:700 12px "Segoe UI",system-ui,sans-serif;color:#1d3a57;cursor:pointer}.kde-btn.on{background:linear-gradient(180deg,#8fd0ff,#1e8fe0);color:#fff;border-color:#0b66b5}'
            + '.kde-row select{flex:1;min-width:140px;border:1px solid #9fcbf0;border-radius:8px;padding:4px 6px;font:600 12px "Segoe UI",system-ui,sans-serif;color:#1d3a57;background:#fff}.kde-go{background:linear-gradient(180deg,#8fe08a,#2a9d22);color:#fff;border-color:#1f7a19}.kde-row input[type=range]{flex:1;min-width:90px}';
        document.head.appendChild(s);
    }

    // The drawing dialog. start = { d, size } to edit one; cb(d, size) when it is saved
    function open(start, cb) {
        css();
        let strokes = (window.kdEmojiStrokes ? window.kdEmojiStrokes(start && start.d) : []).map((s) => {
            const n = (String(s.d).match(/-?\d+(?:\.\d+)?/g) || []).map(Number), pts = [];
            if (/l0\.1 0$/.test(s.d)) n.length -= 2;
            for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
            return { t: s.t, c: s.c, w: s.w, d: s.d, pts: pts };
        });
        let ink = INKS()[0][0], col = COLORS().some((c) => c[0] === 'blue') ? 'blue' : COLORS()[0][0], sz = 'm', erase = false, size = (start && start.size) || 'md', cur = null;
        const back = document.createElement('div');
        back.className = 'kde-back';
        const packOpts = PACKS().map((pk) => '<optgroup label="' + esc(pk[1]) + '">' + pk[2].map((st) => '<option value="' + st[0] + '">' + esc(st[1]) + '</option>').join('') + '</optgroup>').join('');
        back.innerHTML = '<div class="kde-card"><div class="kde-head"><b>Custom Emoji / Symbol</b><button type="button" aria-label="Close">×</button></div>'
            + '<div class="kde-surface"></div>'
            + '<div class="kde-row kde-inks"></div>'
            + (packOpts ? '<div class="kde-row"><span>Theme Packs</span><select class="kde-pack"><option value="">Choose a style…</option>' + packOpts + '</select></div>' : '')
            + '<div class="kde-row kde-cols"></div><div class="kde-row kde-sizes"><span>Size</span></div>'
            + '<div class="kde-row"><button type="button" class="kde-btn kde-erase">Eraser</button><button type="button" class="kde-btn kde-undo">Undo</button><button type="button" class="kde-btn kde-clear">Clear</button>'
            + '<span style="margin-left:auto">In text</span><button type="button" class="kde-btn" data-s="sm">Small</button><button type="button" class="kde-btn" data-s="md">Normal</button><button type="button" class="kde-btn" data-s="lg">Large</button></div>'
            + '<div class="kde-row" style="justify-content:flex-end"><button type="button" class="kde-btn kde-cancel">Cancel</button><button type="button" class="kde-btn kde-go">' + (start && start.d !== undefined ? 'Save' : 'Put it in the text') + '</button></div></div>';
        document.body.appendChild(back);
        const q = (sel) => back.querySelector(sel);
        const surf = q('.kde-surface');
        const widthOf = () => Math.round((BASE()[ink] || 6) * SIZES.find((z) => z[0] === sz)[2] * 10) / 10;
        const ser = () => (window.kdEmojiSer ? window.kdEmojiSer(strokes.concat(cur && !cur.erasing ? [cur] : [])) : '');
        const draw = () => { surf.innerHTML = window.kdEmojiSvg ? window.kdEmojiSvg(ser()) : ''; };
        const inks = q('.kde-inks');
        INKS().forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kde-btn'; b.textContent = k[1]; b.title = k[1]; b.addEventListener('click', () => { ink = k[0]; erase = false; sync(); }); b.dataset.k = k[0]; inks.appendChild(b); });
        const cols = q('.kde-cols');
        COLORS().forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kde-sw'; b.style.background = 'linear-gradient(180deg,' + c[3] + ',' + c[1] + ' 60%,' + c[2] + ')'; b.title = c[0].charAt(0).toUpperCase() + c[0].slice(1); b.addEventListener('click', () => { col = c[0]; erase = false; sync(); }); b.dataset.c = c[0]; cols.appendChild(b); });
        SIZES.forEach((z) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kde-btn'; b.textContent = z[1]; b.dataset.z = z[0]; b.addEventListener('click', () => { sz = z[0]; sync(); }); q('.kde-sizes').appendChild(b); });
        const packSel = q('.kde-pack');
        if (packSel) packSel.addEventListener('change', () => { if (packSel.value) { ink = packSel.value; erase = false; sync(); } });
        function sync() {
            inks.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === ink && !erase));
            cols.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === col && !erase));
            q('.kde-sizes').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.z === sz));
            if (packSel && !inks.querySelector('[data-k="' + ink + '"]')) packSel.value = ink; else if (packSel) packSel.value = '';
            q('.kde-erase').classList.toggle('on', erase);
            back.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === size));
        }
        const pos = (e) => { const r = surf.getBoundingClientRect(); return [Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 1000) / 10)), Math.max(0, Math.min(100, Math.round((e.clientY - r.top) / r.height * 1000) / 10))]; };
        const hit = (p) => { for (let i = strokes.length - 1; i >= 0; i--) if (strokes[i].pts.some((pt) => Math.hypot(pt[0] - p[0], pt[1] - p[1]) < 5 + strokes[i].w / 2)) return i; return -1; };
        const pathOf = (pts) => (AIK() ? AIK().pathOf(pts) : 'M' + pts.map((p) => p[0] + ' ' + p[1]).join('L'));
        surf.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            try { surf.setPointerCapture(e.pointerId); } catch (x) {}
            const p = pos(e);
            if (erase) { const i = hit(p); if (i >= 0) { strokes.splice(i, 1); draw(); } cur = { erasing: true }; return; }
            cur = { t: ink, c: col, w: widthOf(), pts: [p], d: pathOf([p]) };
            draw();
        });
        surf.addEventListener('pointermove', (e) => {
            if (!cur) return;
            const p = pos(e);
            if (cur.erasing) { const i = hit(p); if (i >= 0) { strokes.splice(i, 1); draw(); } return; }
            const l = cur.pts[cur.pts.length - 1];
            if (Math.hypot(l[0] - p[0], l[1] - p[1]) > 1.2) { cur.pts.push(p); cur.d = pathOf(cur.pts); draw(); }
        });
        const end = () => { if (cur && !cur.erasing && cur.pts.length) strokes.push(cur); cur = null; draw(); };
        surf.addEventListener('pointerup', end);
        surf.addEventListener('pointercancel', end);
        q('.kde-erase').addEventListener('click', () => { erase = !erase; sync(); });
        q('.kde-undo').addEventListener('click', () => { strokes.pop(); draw(); });
        q('.kde-clear').addEventListener('click', () => { strokes = []; draw(); });
        back.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { size = b.dataset.s; sync(); }));
        const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); };
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        document.addEventListener('keydown', onKey, true);
        q('.kde-head button').addEventListener('click', close);
        q('.kde-cancel').addEventListener('click', close);
        q('.kde-go').addEventListener('click', () => { const d = ser(); close(); if (d && cb) cb(d, size); });
        draw(); sync();
    }

    function save() { try { if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent(); } catch (e) {} }
    // draw a new emoji and put it in the text at the caret
    function insert() {
        const canvas = document.getElementById('wysiwyg-canvas');
        let saved = null;
        try { const s = window.getSelection(); if (s.rangeCount && canvas && canvas.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); } catch (e) {}
        open({ size: 'md' }, (d, size) => {
            const node = window.kdEmojiChip(d, size);
            try { if (canvas) canvas.focus(); } catch (e) {}
            if (saved) { try { const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); } catch (e) {} }
            let ok = false;
            try { ok = typeof fmtInsertNodeAtCaret === 'function' && fmtInsertNodeAtCaret(node); } catch (e) {}
            if (!ok && canvas) { const line = document.createElement('div'); line.appendChild(node); canvas.appendChild(line); }
            save();
        });
    }
    // double-click an emoji in the page to draw on it again
    document.addEventListener('dblclick', (e) => {
        const el = e.target && e.target.closest && e.target.closest('.kd-emoji');
        const canvas = document.getElementById('wysiwyg-canvas');
        if (!el || !canvas || !canvas.contains(el)) return;
        e.preventDefault();
        open({ d: el.getAttribute('data-emoji') || '', size: el.getAttribute('data-emoji-size') || 'md' }, (d, size) => {
            const fresh = window.kdEmojiChip(d, size);
            el.className = fresh.className; el.setAttribute('data-emoji', d); el.setAttribute('data-emoji-size', size); el.innerHTML = fresh.innerHTML;
            save();
        });
    });
    // Bitbook's Skills menu entry
    document.querySelectorAll('#skills-menu-popup [data-skill="emoji"]').forEach((item) => item.addEventListener('click', () => { insert(); try { closeSkillsMenu(); } catch (e) {} }));

    /* ---------- an emoji is one character of the text: arrow keys step over it, Shift+arrows select it, Backspace and Delete remove it ---------- */
    const isEmoji = (n) => !!(n && n.nodeType === 1 && n.classList && n.classList.contains('kd-emoji'));
    const blank = (n) => n.nodeType === 3 && !n.nodeValue.replace(/[​﻿]/g, '');
    // the emoji touching the caret on one side (dir -1 is the left, 1 the right), or null when a letter or something else is there
    function neighbor(node, off, dir) {
        if (node.nodeType === 3) {
            const v = node.nodeValue;
            if ((dir < 0 ? v.slice(0, off) : v.slice(off)).replace(/[​﻿]/g, '')) return null;
            let sib = dir < 0 ? node.previousSibling : node.nextSibling;
            while (sib && blank(sib)) sib = dir < 0 ? sib.previousSibling : sib.nextSibling;
            return isEmoji(sib) ? sib : null;
        }
        const kids = node.childNodes;
        let i = dir < 0 ? off - 1 : off;
        while (i >= 0 && i < kids.length && blank(kids[i])) i += dir;
        return isEmoji(kids[i]) ? kids[i] : null;
    }
    document.addEventListener('keydown', (e) => {
        if (!/^(ArrowLeft|ArrowRight|Backspace|Delete)$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
        const canvas = document.getElementById('wysiwyg-canvas');
        if (!canvas || /kd-mode-(view|source)/.test(document.body.className)) return;
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.focusNode || !canvas.contains(sel.focusNode)) return;
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (!sel.isCollapsed) return;
            const em = neighbor(sel.focusNode, sel.focusOffset, e.key === 'Backspace' ? -1 : 1);
            if (!em) return;
            e.preventDefault();
            const parent = em.parentNode, idx = Array.prototype.indexOf.call(parent.childNodes, em);
            em.remove();
            sel.collapse(parent, idx);
            save();
            return;
        }
        if (!sel.isCollapsed && !e.shiftKey) return;   // (with something selected, the arrows just collapse it, as they always do)
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        const em = neighbor(sel.focusNode, sel.focusOffset, dir);
        if (!em) return;
        e.preventDefault();
        const parent = em.parentNode, idx = Array.prototype.indexOf.call(parent.childNodes, em), pos = dir < 0 ? idx : idx + 1;
        if (e.shiftKey) sel.extend(parent, pos); else sel.collapse(parent, pos);
    }, true);
    // an emoji that was copied and pasted must stay one piece (the paste drops its "do not edit inside" mark)
    (function () {
        const canvas = document.getElementById('wysiwyg-canvas');
        if (!canvas) return;
        const fix = () => canvas.querySelectorAll('.kd-emoji:not([contenteditable="false"])').forEach((el) => el.setAttribute('contenteditable', 'false'));
        new MutationObserver(fix).observe(canvas, { childList: true, subtree: true });
        fix();
    })();
    css();
    window.KdEmoji = { open: open, insert: insert };
})();
