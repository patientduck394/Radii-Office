// Radii Office works offline! This starts the suite's offline worker (sw.js), which saves every app on your
// first online visit, so the whole suite opens later with no internet.
// (Writeout, Bitbook and Amber also keep their own offline workers; all of them share the saved files.)
(function () {
    'use strict';
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (e) { console.warn('Offline mode is not available here:', e && e.message); });
    });
})();
