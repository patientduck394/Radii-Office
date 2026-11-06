// Keydown Next for Yuzu: custom @style tags, live {{values}} and ::chart/::poll/::quiz/::timer/::map blocks come alive in message bodies and the compose preview!
(function () {
    'use strict';
    const sel = '.yz-read-body.keydown-doc, #yz-compose-preview';
    function run(el) {
        if (!window.KeydownNext || !el || el.__kdnSig === el.innerHTML) return;
        try { window.KeydownNext.apply(el); } catch (e) {}
        el.__kdnSig = el.innerHTML;
    }
    function scan() { document.querySelectorAll(sel).forEach(run); }
    new MutationObserver(() => scan()).observe(document.body, { childList: true, subtree: true, characterData: true });
    scan();
})();
