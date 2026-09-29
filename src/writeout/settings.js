/* ========================================================
   WRITEOUT SETTINGS — Theme switching + registry tools
   Talks to WriteoutMarketplace for theme install/apply!
   ======================================================== */
(function () {
  'use strict';

  var THEME_SWATCH = {
    '': 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%)',
    'dark-canvas': 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    'sepia-paper': 'linear-gradient(180deg, #fefce8 0%, #fde68a 100%)',
    'aqua-breeze': 'linear-gradient(180deg, #f0f9ff 0%, #bae6fd 100%)',
    'ember-orange': 'linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%)',
    'mint-meadow': 'linear-gradient(180deg, #f0fdf4 0%, #bbf7d0 100%)'
  };

  function swatchFor(id) {
    return THEME_SWATCH[id] || 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)';
  }

  function getMarketplace() {
    try {
      if (window.WriteoutMarketplace && typeof window.WriteoutMarketplace.themes === 'function') return window.WriteoutMarketplace;
    } catch (e) {}
    return null;
  }

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

  function renderThemeList() {
    var list = document.getElementById('settings-theme-list');
    if (!list) return;
    list.innerHTML = '';

    var M = getMarketplace();
    var themeEntries = [];
    try { themeEntries = M ? M.themes() : []; } catch (e) { themeEntries = []; }
    var active = '';
    try { active = M ? M.activeTheme() : ''; } catch (e) { active = ''; }

    var rows = [{ id: '', name: 'Default Paper', description: 'Clean white canvas.' }].concat(themeEntries);

    rows.forEach(function (t) {
      var row = document.createElement('div');
      row.className = 'settings-theme-row' + (active === t.id ? ' active' : '');

      var sw = document.createElement('div');
      sw.className = 'mkt-avatar settings-theme-swatch';
      sw.style.background = swatchFor(t.id);

      var meta = document.createElement('div');
      meta.className = 'settings-theme-meta';
      var nm = document.createElement('div');
      nm.className = 'settings-theme-name';
      nm.textContent = t.name;
      var ds = document.createElement('div');
      ds.className = 'settings-theme-desc';
      ds.textContent = t.description || '';
      meta.appendChild(nm);
      meta.appendChild(ds);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'settings-theme-btn';
      if (active === t.id) {
        btn.textContent = '✓ Active';
        btn.disabled = true;
      } else if (t.id === '' || t.installed) {
        // Default Paper is always gotten — never Get!
        btn.textContent = 'Apply';
      } else {
        btn.textContent = '⬇ Get';
      }
      btn.addEventListener('click', function () {
        if (M && typeof M.applyTheme === 'function') M.applyTheme(t.id);
        renderThemeList();
      });

      row.appendChild(sw);
      row.appendChild(meta);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderThemeList();
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
    // Re-render every open so installs from the Marketplace show up instantly!
    var sBtn = document.getElementById('settings-trigger-btn');
    if (sBtn) sBtn.addEventListener('click', function () { renderThemeList(); renderAmbientToggle(); renderRestoreToggle(); });
  });

  window.WriteoutSettings = { refresh: renderThemeList, ambientHidden: ambientHidden, setAmbientHidden: setAmbientHidden, restoreDocs: restoreDocs, setRestoreDocs: setRestoreDocs };
})();
