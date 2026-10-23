/* =====================================================================
   Bitbook's Programs skill! Skills > Programs drops a BitLang program
   chip into the note: ✎ edits the code, and clicking the chip plays it over
   the whole document (canvas, rich-text lines, buttons and BeepBox songs)!
   ===================================================================== */
(function () {
    'use strict';
    const BL = window.BitLang;
    if (!BL) return;
    function ed() { return document.getElementById('wysiwyg-canvas'); }

    // skill(skill="beepbox", get=link, content=inherit): the song comes from the link itself!
    BL.host = {
        skill: function (name, sk) {
            if (typeof bbSongCandidates !== 'function' || typeof bbPackSong !== 'function') return Promise.reject(new Error('BeepBox songs are not available here'));
            const cands = bbSongCandidates(sk.get);
            if (!cands.length) return Promise.reject(new Error('No song data in that link (copy the full link with the # part)'));
            return bbPackSong(cands[0]).then(function (packed) {
                const chip = bbBuildChip(packed, sk.label || 'BeepBox Song', typeof bbChipStyle === 'string' ? bbChipStyle : 'cartridge');
                return chip.outerHTML;
            });
        }
    };

    function insertProgram() {
        try { if (typeof closeSkillsMenu === 'function') closeSkillsMenu(); } catch (e) {}
        const canvasEl = ed();
        if (!canvasEl) return;
        const holder = document.createElement('div');
        holder.innerHTML = '<div contenteditable="true">' + BL.blockHTML() + '&nbsp;</div>';
        const w = holder.firstElementChild;
        const sel = window.getSelection();
        let box = null;
        if (sel.rangeCount && canvasEl.contains(sel.anchorNode) && window.KdBlockEditor) box = window.KdBlockEditor.blockOf(sel.anchorNode);
        if (box) (box.tagName === 'LI' ? box.parentNode : box).after(w); else canvasEl.appendChild(w);
        if (!w.nextElementSibling) { const d = document.createElement('div'); d.setAttribute('contenteditable', 'true'); d.innerHTML = '<br>'; w.after(d); }
        BL.hydrate(w);
        canvasEl.dispatchEvent(new Event('input', { bubbles: true }));
        try { w.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        try { if (typeof playAeroClickSound === 'function') playAeroClickSound(800, 0.08); } catch (e) {}
        try { if (window.OfficeShell) window.OfficeShell.toast('Program added! Click the chip to play it, or ✎ to edit the code!'); } catch (e) {}
    }
    document.querySelectorAll('#skills-menu-popup [data-skill="programs"]').forEach(function (item) { item.addEventListener('click', insertProgram); });
    window.bitbookInsertProgram = insertProgram;

    // Programs in notes (opened, switched to, imported) come alive when they appear!
    let queued = 0;
    function wake() { clearTimeout(queued); queued = setTimeout(function () { const c = ed(); if (c) BL.hydrate(c); }, 60); }
    const c0 = ed();
    if (c0) new MutationObserver(wake).observe(c0, { childList: true, subtree: true });
    wake();

    // The Help Deck gets a guide button too!
    const deck = document.getElementById('help-deck-dialog');
    if (deck) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'style-bar-btn';
        b.style.cssText = 'padding:6px 16px;margin-right:8px;cursor:pointer';
        b.textContent = '▶ BitLang Guide';
        b.addEventListener('click', function () { try { deck.close(); } catch (e) {} BL.openDocs(); });
        const got = deck.querySelector('button[onclick*="close()"]:last-of-type');
        if (got && got.parentNode) got.parentNode.insertBefore(b, got); else deck.appendChild(b);
    }
})();
