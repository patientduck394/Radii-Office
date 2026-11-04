/* =====================================================================
   3D Scenes from Zonerider in Writeout and Bitbook! Insert > "3D Scene"
   opens Zonerider in a big frame (/zonerider/?embed=1). Build anything,
   press Done, and a picture of the scene goes in at the caret, with the
   whole .zr scene saved inside it (data-zr). Double-click the picture to
   open the scene again and keep editing!
   window.insertZoneriderScene()  ·  window.ZoneriderScene.open(scene) -> Promise of { scene, png } or null
   (shared file: writeout/zonerider-scene.js and bitbook/zonerider-scene.js are the same)
   ===================================================================== */
(function () {
    'use strict';
    const FRAME = '/zonerider/?embed=1';
    const toast = (msg) => { try { if (window.OfficeShell) window.OfficeShell.toast(msg); else alert(msg); } catch (e) {} };

    function injectCss() {
        if (document.getElementById('zrs-css')) return;
        const st = document.createElement('style');
        st.id = 'zrs-css';
        st.textContent =
            '.zrs-back{position:fixed;inset:0;z-index:100000;background:rgba(10,14,20,.55);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}' +
            '.zrs-card{position:relative;width:min(1400px,100%);height:min(900px,100%);border-radius:14px;overflow:hidden;background:#1b1e22;border:1px solid #8fc400;box-shadow:0 24px 70px rgba(0,0,0,.5)}' +
            '.zrs-frame{display:block;width:100%;height:100%;border:0}' +
            '.zrs-wait{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#c5ff11;font:600 15px system-ui,sans-serif;pointer-events:none}' +
            'img.zr-scene{cursor:zoom-in}' +
            '@media (max-width:640px){.zrs-back{padding:0}.zrs-card{border-radius:0}}';
        document.head.appendChild(st);
    }

    // Zonerider in a frame: resolves with { scene, png } on Done, or null on Cancel
    let busy = false;
    function open(scene) {
        if (busy) return Promise.resolve(null);
        busy = true;
        injectCss();
        return new Promise((resolve) => {
            const back = document.createElement('div');
            back.className = 'zrs-back';
            back.setAttribute('role', 'dialog');
            back.setAttribute('aria-modal', 'true');
            back.setAttribute('aria-label', '3D Scene editor (Zonerider)');
            const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
            back.innerHTML = '<div class="zrs-card"><div class="zrs-wait">Opening Zonerider…</div><iframe class="zrs-frame" title="Zonerider 3D editor" src="' + FRAME + '#t=' + token + '"></iframe></div>';
            document.body.appendChild(back);
            const frame = back.querySelector('iframe');
            const before = document.activeElement;
            let ready = false;
            const finish = (val) => {
                window.removeEventListener('message', onMsg);
                document.removeEventListener('keydown', onKey, true);
                clearTimeout(timer);
                back.remove();
                busy = false;
                try { if (before && before.focus) before.focus({ preventScroll: true }); } catch (e) {}
                resolve(val);
            };
            const onMsg = (ev) => {
                if (ev.origin !== location.origin || !ev.data || ev.data.t !== token) return;
                const d = ev.data;
                if (d.zr === 'ready') {
                    ready = true;
                    const w = back.querySelector('.zrs-wait'); if (w) w.remove();
                    (ev.source || frame.contentWindow).postMessage({ zr: 'load', t: token, scene: scene || null }, location.origin);
                    try { frame.focus(); } catch (e) {}
                } else if (d.zr === 'done') finish(d.scene ? { scene: d.scene, png: d.png || '' } : null);
                else if (d.zr === 'cancel') finish(null);
            };
            // (Escape inside the frame belongs to Zonerider; out here it closes without saving)
            const onKey = (ev) => { if (ev.key === 'Escape' && !back.contains(document.activeElement)) { ev.preventDefault(); finish(null); } };
            window.addEventListener('message', onMsg);
            document.addEventListener('keydown', onKey, true);
            const timer = setTimeout(() => { if (!ready) { toast('Zonerider could not be opened! Check your internet connection and try again!'); finish(null); } }, 25000);
        });
    }
    window.ZoneriderScene = { open: open };

    const editor = () => document.getElementById('wysiwyg-canvas');
    if (!editor()) return;
    const viewOnly = () => document.body.classList.contains('kd-mode-view');
    function caret() {
        try { const s = window.getSelection(); if (s.rangeCount && editor().contains(s.anchorNode)) return s.getRangeAt(0).cloneRange(); } catch (e) {}
        return null;
    }
    function saved() {
        editor().dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    }
    function fill(img, r) {
        if (r.png) img.src = r.png;
        img.setAttribute('data-zr', JSON.stringify(r.scene));
        const n = (r.scene.scene && r.scene.scene.object && r.scene.scene.object.children || []).length;
        img.alt = '3D scene (' + n + ' object' + (n === 1 ? '' : 's') + ')';
    }
    function insert() {
        const at = caret();
        open(null).then((r) => {
            if (!r) return;
            const ed = editor();
            ed.focus();
            try { if (at) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(at); } } catch (e) {}
            const holder = document.createElement('span');
            holder.className = 'img-resize';
            const img = document.createElement('img');
            img.className = 'zr-scene';
            img.title = 'Double-click to edit this 3D scene in Zonerider!';
            img.style.width = '560px';
            fill(img, r);
            holder.appendChild(img);
            if (typeof fmtInsertNodeAtCaret === 'function') fmtInsertNodeAtCaret(holder); else ed.appendChild(holder);
            saved();
            toast('3D scene added! Double-click it to keep editing!');
        });
    }
    window.insertZoneriderScene = insert;

    // double-click a scene to open it again
    // (on the document: Writeout can swap its page element, so a listener on it could be left behind)
    document.addEventListener('dblclick', (e) => {
        const img = e.target.closest && e.target.closest('img.zr-scene');
        if (!img || !editor() || !editor().contains(img) || viewOnly()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        let scene = null;
        try { scene = JSON.parse(img.getAttribute('data-zr') || 'null'); } catch (err) {}
        if (!scene) { toast('This picture lost its scene, so a new one opens!'); }
        open(scene).then((r) => { if (r) { fill(img, r); saved(); toast('3D scene updated!'); } });
    }, true);

    // Classic Insert menu: "3D Scene (Zonerider)..." under the Inkpath and draw.io items
    const after = document.querySelector('#insert-menu-popup [data-insert="inkpath"]') || document.querySelector('#insert-menu-popup [data-insert="drawio"]') || document.querySelector('#insert-menu-popup [data-insert="image"]');
    if (after) {
        const b = after.cloneNode(true);
        b.setAttribute('data-insert', 'zonerider');
        if (b.lastChild && b.lastChild.nodeType === 3) b.lastChild.nodeValue = '3D Scene (Zonerider)...';
        after.after(b);
    }
    const orig = window.runInsertKind;
    if (typeof orig === 'function') {
        window.runInsertKind = function (kind) {
            if (kind === 'zonerider') { try { if (typeof closeInsertMenu === 'function') closeInsertMenu(); } catch (e) {} insert(); return; }
            return orig.apply(this, arguments);
        };
    }
})();
