/* ========================================================
   WRITEOUT SETTINGS — effects and restore options
   ======================================================== */
(function () {
  'use strict';

  /* Floating background spheres on/off (persists writeout_hide_ambient)! */
  var AMBIENT_HIDE_KEY = 'writeout_hide_ambient';

  function ambientHidden() {
    try { return localStorage.getItem(AMBIENT_HIDE_KEY) === '1'; } catch (e) { return false; }
  }

  function setAmbientHidden(on) {
    try { localStorage.setItem(AMBIENT_HIDE_KEY, on ? '1' : '0'); } catch (e) {}
    try { if (document.body) document.body.classList.toggle('hide-ambient', !!on); } catch (e) {}
    if (!on) {
      // Re-showing with zero spheres left: ask the app to respawn them!
      try {
        var dots = (document.querySelectorAll) ? document.querySelectorAll('.ambient-droplet') : [];
        if (!dots.length && window.initializeAmbientDroplets) window.initializeAmbientDroplets();
      } catch (e) {}
    }
  }

  function renderAmbientToggle() {
    var box = document.getElementById('settings-hide-ambient');
    if (!box) return;
    box.checked = ambientHidden();
  }

  /* Restore-on-start is ON by default (only '0' opts out)! */
  var RESTORE_KEY = 'writeout_restore_docs';

  function restoreDocs() {
    try { return localStorage.getItem(RESTORE_KEY) !== '0'; } catch (e) { return true; }
  }

  function setRestoreDocs(on) {
    try { localStorage.setItem(RESTORE_KEY, on ? '1' : '0'); } catch (e) {}
  }

  function renderRestoreToggle() {
    var box = document.getElementById('settings-restore-docs');
    if (!box) return;
    box.checked = restoreDocs();
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderAmbientToggle();
    renderRestoreToggle();
    var rBox = document.getElementById('settings-restore-docs');
    if (rBox && !rBox._writeoutRestoreWired) {
      rBox._writeoutRestoreWired = true;
      rBox.addEventListener('change', function (e) {
        var on = !!(e && e.target ? e.target.checked : rBox.checked);
        setRestoreDocs(on);
      });
    }
    var box = document.getElementById('settings-hide-ambient');
    if (box && !box._writeoutAmbientWired) {
      box._writeoutAmbientWired = true;
      box.addEventListener('change', function (e) {
        var on = !!(e && e.target ? e.target.checked : box.checked);
        setAmbientHidden(on);
      });
    }
    // Re-render every open
    var sBtn = document.getElementById('settings-trigger-btn');
    if (sBtn) sBtn.addEventListener('click', function () { renderAmbientToggle(); renderRestoreToggle(); });
  });

  window.WriteoutSettings = { refresh: function () {}, ambientHidden: ambientHidden, setAmbientHidden: setAmbientHidden, restoreDocs: restoreDocs, setRestoreDocs: setRestoreDocs };
})();
