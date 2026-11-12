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
    const DARK_APPS = { inkpath: 1, peeker: 1, phosphor: 1, antimony: 1, zonerider: 1, trigger: 1 };
    const SKIP = 'svg, svg *, canvas, img, video, script, style, option, #pool-bar, #pool-bar *, #pool-fab, #pool-bubbles, #pool-bubbles *, .aero-sidebar, .aero-sidebar *, .pool-keep';
    function parse(c) { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    const lum = function (c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; };
    // The dark apps were drawn for a dark page. In Poolside every dark panel turns into bright glass (and its text into ink) so the water shows through
    function lighten() {
        if (!on || !DARK_APPS[app]) return;
        const all = document.body.querySelectorAll('*');
        for (let i = 0; i < all.length; i++) {
            const el = all[i];
            if (el.matches(SKIP)) { el.classList.remove('pool-lit'); continue; }
            const cs = getComputedStyle(el);
            let dark = false;
            const bg = parse(cs.backgroundColor);
            if (bg && bg.a >= 0.3 && lum(bg) < 0.4) dark = true;
            else if (cs.backgroundImage && cs.backgroundImage.indexOf('gradient') > -1) {
                const cols = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(function (c) { return c && c.a >= 0.3; });
                if (cols.length && cols.reduce(function (s, c) { return s + lum(c); }, 0) / cols.length < 0.4) dark = true;
            }
            el.classList.toggle('pool-lit', dark);
        }
        if (obs) obs.takeRecords();   // (those class changes were ours, so they must not start another pass)
    }
    let lt = 0, obs = null;
    function later() { clearTimeout(lt); lt = setTimeout(lighten, 250); }
    function apply() {
        document.body.classList.toggle('pool-ui', on);
        if (on && !document.getElementById('pool-bubbles')) { const b = document.createElement('div'); b.id = 'pool-bubbles'; b.setAttribute('aria-hidden', 'true'); b.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>'; document.body.insertBefore(b, document.body.firstChild); }
        if (!on) document.querySelectorAll('.pool-lit').forEach(function (e) { e.classList.remove('pool-lit'); });
        else { lighten(); }
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
        try { obs = new MutationObserver(function () { if (on) later(); }); obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] }); } catch (e) {}
    }
    if (document.readyState !== 'loading') build(); else document.addEventListener('DOMContentLoaded', build);
})();
