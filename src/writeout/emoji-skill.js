/* =====================================================================
   Custom Emoji / Symbol (Writeout and Bitbook, identical copy in each)!
   Draw on a square canvas with pens like the Annotator's (pen, gel, marker, neon, dashed) and put the drawing right inside
   your text like an emoji. It is saved as Keydown text:  @@emoji="d='g:ff7a1a:6:10,20;30,40',size='md'"
   Double-click an emoji in the page to draw on it again!
   Needs the Keydown engine (keydown-doc.js) for the drawing itself.
   ===================================================================== */
(function () {
    'use strict';
    if (window.KdEmoji) return;

    const COLORS = ['#ef4444', '#f97316', '#f5b301', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0a6cff', '#7c3aed', '#ec4899', '#64748b', '#ffffff', '#cbd5e1', '#1e293b', '#000000'];
    const INKS = [['p', 'Pen'], ['g', 'Gel'], ['m', 'Marker'], ['n', 'Neon'], ['d', 'Dashed']];
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
            + '.kde-go{background:linear-gradient(180deg,#8fe08a,#2a9d22);color:#fff;border-color:#1f7a19}.kde-row input[type=range]{flex:1;min-width:90px}';
        document.head.appendChild(s);
    }

    // The drawing dialog. start = { d, size } to edit one; cb(d, size) when it is saved
    function open(start, cb) {
        css();
        let strokes = String((start && start.d) || '').split('|').filter(Boolean).map((s) => { const a = s.split(':'); return { ink: a[0] || 'p', col: a[1] || '000000', w: +a[2] || 6, pts: String(a[3] || '').split(';').map((p) => p.split(',').map(Number)).filter((p) => p.length === 2) }; });
        let ink = 'p', col = '#0a6cff', w = 6, erase = false, size = (start && start.size) || 'md', cur = null;
        const back = document.createElement('div');
        back.className = 'kde-back';
        back.innerHTML = '<div class="kde-card"><div class="kde-head"><b>Custom Emoji / Symbol</b><button type="button" aria-label="Close">×</button></div>'
            + '<div class="kde-surface"></div>'
            + '<div class="kde-row kde-inks"></div><div class="kde-row kde-cols"></div>'
            + '<div class="kde-row"><span>Thickness</span><input type="range" min="2" max="18" value="6" class="kde-w"></div>'
            + '<div class="kde-row"><button type="button" class="kde-btn kde-erase">Eraser</button><button type="button" class="kde-btn kde-undo">Undo</button><button type="button" class="kde-btn kde-clear">Clear</button>'
            + '<span style="margin-left:auto">In text</span><button type="button" class="kde-btn" data-s="sm">Small</button><button type="button" class="kde-btn" data-s="md">Normal</button><button type="button" class="kde-btn" data-s="lg">Large</button></div>'
            + '<div class="kde-row" style="justify-content:flex-end"><button type="button" class="kde-btn kde-cancel">Cancel</button><button type="button" class="kde-btn kde-go">' + (start && start.d !== undefined ? 'Save' : 'Put it in the text') + '</button></div></div>';
        document.body.appendChild(back);
        const q = (sel) => back.querySelector(sel);
        const surf = q('.kde-surface');
        const ser = () => strokes.concat(cur ? [cur] : []).map((s) => s.ink + ':' + String(s.col).replace('#', '') + ':' + s.w + ':' + s.pts.map((p) => p[0] + ',' + p[1]).join(';')).join('|');
        const draw = () => { surf.innerHTML = window.kdEmojiSvg ? window.kdEmojiSvg(ser()) : ''; };
        const inks = q('.kde-inks');
        INKS.forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kde-btn' + (k[0] === ink ? ' on' : ''); b.textContent = k[1]; b.addEventListener('click', () => { ink = k[0]; erase = false; sync(); }); b.dataset.k = k[0]; inks.appendChild(b); });
        const cols = q('.kde-cols');
        COLORS.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kde-sw'; b.style.background = c; b.title = c; b.addEventListener('click', () => { col = c; erase = false; sync(); }); b.dataset.c = c; cols.appendChild(b); });
        function sync() {
            inks.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === ink && !erase));
            cols.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === col && !erase));
            q('.kde-erase').classList.toggle('on', erase);
            back.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === size));
        }
        const pos = (e) => { const r = surf.getBoundingClientRect(); return [Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 1000) / 10)), Math.max(0, Math.min(100, Math.round((e.clientY - r.top) / r.height * 1000) / 10))]; };
        const hit = (p) => { for (let i = strokes.length - 1; i >= 0; i--) if (strokes[i].pts.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 5 + strokes[i].w / 2)) return i; return -1; };
        surf.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            try { surf.setPointerCapture(e.pointerId); } catch (x) {}
            const p = pos(e);
            if (erase) { const i = hit(p); if (i >= 0) { strokes.splice(i, 1); draw(); } cur = { erasing: true }; return; }
            cur = { ink: ink, col: col, w: w, pts: [p] };
            draw();
        });
        surf.addEventListener('pointermove', (e) => {
            if (!cur) return;
            const p = pos(e);
            if (cur.erasing) { const i = hit(p); if (i >= 0) { strokes.splice(i, 1); draw(); } return; }
            const l = cur.pts[cur.pts.length - 1];
            if (Math.hypot(l[0] - p[0], l[1] - p[1]) > 1.2) { cur.pts.push(p); draw(); }
        });
        const end = () => { if (cur && !cur.erasing && cur.pts.length) strokes.push(cur); cur = null; draw(); };
        surf.addEventListener('pointerup', end);
        surf.addEventListener('pointercancel', end);
        q('.kde-w').addEventListener('input', (e) => { w = +e.target.value; });
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
    css();
    window.KdEmoji = { open: open, insert: insert };
})();
