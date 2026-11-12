/* =====================================================================
   Poolside UI! An optional Poolside layout for the apps that do not use the Office shell (Imbuer, Zonerider, Inkpath, Peeker,
   Phosphor, Antimony, OpenDB, Trigger). A small "Poolside" ring button (bottom left) switches it on or off, and the choice is
   remembered per app. In Poolside there is a deep-blue waterline across the top and the tools stand on a pool deck, with lane
   ropes for edges, in cyan, blue and orange. (Identical copy in each app folder! Pair: poolside-ui.css.)
   Use ?pool=1 or ?pool=0 in the link to switch it from outside.
   ===================================================================== */
(function () {
    'use strict';
    const me = document.currentScript;
    const app = (me && me.dataset.app) || 'app';
    const name = (me && me.dataset.name) || app;
    const key = 'radii_pool_ui_' + app;
    const ring = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#fff" stroke="#8a3d00" stroke-width="1.5"/><path d="M12 3a9 9 0 0 1 6.4 2.6l-3.2 3.2A4.5 4.5 0 0 0 12 7.5zM21 12a9 9 0 0 1-2.6 6.4l-3.2-3.2A4.5 4.5 0 0 0 16.5 12zM12 21a9 9 0 0 1-6.4-2.6l3.2-3.2A4.5 4.5 0 0 0 12 16.5zM3 12a9 9 0 0 1 2.6-6.4l3.2 3.2A4.5 4.5 0 0 0 7.5 12z" fill="#ff8a1b"/><circle cx="12" cy="12" r="4.5" fill="#22d3ee" stroke="#8a3d00" stroke-width="1.2"/></svg>';
    let on = false;
    function read() {
        try {
            const m = /[?&]pool=([01])/.exec(location.search);
            if (m) { localStorage.setItem(key, m[1]); return m[1] === '1'; }
            return localStorage.getItem(key) === '1';
        } catch (e) { return false; }
    }
    function write(v) { try { localStorage.setItem(key, v ? '1' : '0'); } catch (e) {} }
    function apply() {
        document.body.classList.toggle('pool-ui', on);
        document.body.dataset.poolApp = app;
        const fab = document.getElementById('pool-fab');
        if (fab) fab.hidden = on;
        window.dispatchEvent(new Event('resize'));
    }
    function set(v) { on = !!v; write(on); apply(); }
    function build() {
        if (document.getElementById('pool-bar')) return;
        const icon = (document.querySelector('link[rel="icon"]') || {}).href || '';
        const bar = document.createElement('div');
        bar.id = 'pool-bar';
        bar.innerHTML = (icon ? '<img src="' + icon + '" alt="">' : '') + '<b>' + name + '</b><span class="pool-tag">Poolside</span><span class="pool-grow"></span>' +
            '<button type="button" id="pool-off" title="Go back to the usual layout">Classic layout</button>';
        document.body.insertBefore(bar, document.body.firstChild);
        bar.querySelector('#pool-off').addEventListener('click', function () { set(false); });
        const fab = document.createElement('button');
        fab.type = 'button'; fab.id = 'pool-fab'; fab.title = 'Try the Poolside layout!';
        fab.innerHTML = ring + '<span>Poolside</span>';
        fab.addEventListener('click', function () { set(true); });
        document.body.appendChild(fab);
        on = read();
        apply();
    }
    if (document.readyState !== 'loading') build(); else document.addEventListener('DOMContentLoaded', build);
})();
