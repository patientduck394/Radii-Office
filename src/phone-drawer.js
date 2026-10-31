// Phone drawers for the Classic layouts! On a phone (an app's /mobile/ page, or any screen 700px wide or less),
// an app's glass sidebar slides in from the left (and an inspector panel from the right) as a drawer,
// opened with a floating gel button, so the app's own work area gets the whole screen.
// The New (ribbon) layouts hide these sidebars, so the buttons only show while a sidebar is really there.
(function () {
    'use strict';
    const PANELS = [
        { sel: '.aero-sidebar, #app-deck > #sidebar', side: 'left', label: 'Menu', icon: '<path d="M4 7h16M4 12h16M4 17h16"/>' },
        { sel: '.aero-inspector', side: 'right', label: 'Properties', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>' },
    ];
    const CSS = '' +
        'html.pd-phone .pd-panel{position:fixed!important;top:0!important;bottom:0!important;height:100dvh!important;max-height:none!important;width:min(300px,84vw)!important;min-width:0!important;z-index:2147482000!important;overflow-y:auto!important;margin:0!important;transition:transform .28s cubic-bezier(.2,.8,.2,1)!important}' +
        'html.pd-phone .pd-panel.pd-left{left:0!important;right:auto!important;transform:translateX(-105%)!important}' +
        'html.pd-phone .pd-panel.pd-right{right:0!important;left:auto!important;transform:translateX(105%)!important}' +
        'html.pd-phone .pd-panel.pd-open{transform:none!important;box-shadow:0 0 0 100vmax rgba(0,0,0,.38),0 0 24px rgba(0,0,0,.35)!important}' +
        '.pd-btn{position:fixed;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147481999;width:52px;height:52px;border-radius:50%;border:1px solid rgba(255,255,255,.85);display:none;place-items:center;cursor:pointer;color:#fff;' +
        'background:radial-gradient(circle at 50% 28%,rgba(255,255,255,.9) 0,rgba(255,255,255,.25) 32%,transparent 33%),linear-gradient(180deg,#5fb8f3,#1278c8);box-shadow:0 6px 16px rgba(0,0,0,.35),inset 0 1px 1px rgba(255,255,255,.7)}' +
        '.pd-btn svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}' +
        '.pd-btn.pd-left{left:16px}.pd-btn.pd-right{right:16px}' +
        'body.os-office .pd-btn{bottom:calc(46px + env(safe-area-inset-bottom))}' +
        'html.pd-phone .pd-btn.pd-show{display:grid}' +
        '@media (prefers-reduced-motion:reduce){html.pd-phone .pd-panel{transition:none!important}}';
    const phoneMQ = window.matchMedia ? window.matchMedia('(max-width: 700px)') : null;
    const isPhone = () => document.documentElement.hasAttribute('data-os-phone') || !!(phoneMQ && phoneMQ.matches);
    const items = [];

    function closeAll(except) { items.forEach((it) => { if (it !== except) it.panel.classList.remove('pd-open'); }); }
    // a panel counts only while the layout really shows it (the ribbon layouts hide the sidebars)
    function shown(panel) {
        const was = panel.classList.contains('pd-panel');
        if (was) panel.classList.remove('pd-panel');
        const d = getComputedStyle(panel).display;
        if (was) panel.classList.add('pd-panel');
        return d !== 'none';
    }
    // a see-through glass sidebar normally sits on the page's own background: as a drawer it carries that background along
    const clear = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0(\.0+)?\)$/.test(c);
    function underlay(it, on) {
        if (!on) { if (it.saved !== undefined) { it.panel.style.backgroundImage = it.saved.img; it.panel.style.backgroundColor = it.saved.color; it.saved = undefined; } return; }
        if (it.saved !== undefined) return;
        it.saved = { img: it.panel.style.backgroundImage, color: it.panel.style.backgroundColor };
        const pcs = getComputedStyle(it.panel), bcs = getComputedStyle(document.body), hcs = getComputedStyle(document.documentElement);
        const layers = [pcs.backgroundImage, bcs.backgroundImage].filter((x) => x && x !== 'none');
        if (layers.length) it.panel.style.backgroundImage = layers.join(', ');
        const color = [pcs.backgroundColor, bcs.backgroundColor, hcs.backgroundColor].find((c) => !clear(c));
        it.panel.style.backgroundColor = color || (layers.length > 1 ? 'transparent' : '#1d1d26');
    }
    function refresh() {
        const on = isPhone();
        document.documentElement.classList.toggle('pd-phone', on);
        items.forEach((it) => {
            const live = on && shown(it.panel);
            if (!live) underlay(it, false);
            it.panel.classList.toggle('pd-panel', live);
            it.btn.classList.toggle('pd-show', live);
            if (!live) it.panel.classList.remove('pd-open');
            else underlay(it, true);
        });
    }
    function start() {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);
        PANELS.forEach((P) => {
            const panel = document.querySelector(P.sel);
            if (!panel) return;
            panel.classList.add('pd-' + P.side);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pd-btn pd-' + P.side;
            btn.setAttribute('aria-label', P.label);
            btn.title = P.label;
            btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + P.icon + '</svg>';
            const it = { panel, btn };
            btn.addEventListener('click', (e) => { e.stopPropagation(); const open = !panel.classList.contains('pd-open'); closeAll(it); panel.classList.toggle('pd-open', open); });
            document.body.appendChild(btn);
            items.push(it);
        });
        if (!items.length) return;
        // tapping outside an open drawer closes it; so does picking a button or link in it
        document.addEventListener('click', (e) => {
            items.forEach((it) => {
                if (!it.panel.classList.contains('pd-open') || e.target.closest('.pd-btn')) return;
                if (!it.panel.contains(e.target) || e.target.closest('button, a')) it.panel.classList.remove('pd-open');
            });
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(null); });
        if (phoneMQ) { if (phoneMQ.addEventListener) phoneMQ.addEventListener('change', refresh); else if (phoneMQ.addListener) phoneMQ.addListener(refresh); }
        // switching between the New and Classic layouts changes the body's classes
        new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        refresh();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
