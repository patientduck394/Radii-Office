/* ========================================================
   AMBER MARKETPLACE ENGINE
   Inspired by Writeout Marketplace!
   Persisted via localStorage: amber_marketplace_installed_v1
   Kinds: theme-pack (backgrounds) | template (full slides) | shape-pack (new shapes)
   ======================================================== */
(function () {
  'use strict';

  const MKT_STORAGE_KEY = 'amber_marketplace_installed_v1';

  const MARKETPLACE_CATALOG = [
    {
      id: 'midnight-glass',
      name: 'Midnight Glass Themes',
      category: 'themes',
      kind: 'theme-pack',
      version: '1.0.0',
      description: 'Four deep-space glass gradients for night-mode decks. Installs extra swatches in your toolbar!',
      backgrounds: [
        { name: 'Midnight', css: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' },
        { name: 'Abyss', css: 'linear-gradient(180deg, #334155 0%, #020617 100%)' },
        { name: 'Ocean Night', css: 'linear-gradient(180deg, #0c4a6e 0%, #082f49 100%)' },
        { name: 'Violet Dusk', css: 'linear-gradient(180deg, #6d28d9 0%, #1e1b4b 100%)' }
      ]
    },
    {
      id: 'candy-meadow',
      name: 'Candy Meadow Themes',
      category: 'themes',
      kind: 'theme-pack',
      version: '1.0.0',
      description: 'Fresh mint, aqua and lemon glass gradients for playful spring decks!',
      backgrounds: [
        { name: 'Mint', css: 'linear-gradient(180deg, #6ee7b7 0%, #059669 100%)' },
        { name: 'Aqua Breeze', css: 'linear-gradient(180deg, #7dd3fc 0%, #0369a1 100%)' },
        { name: 'Lemon Pop', css: 'linear-gradient(180deg, #fde047 0%, #ea580c 100%)' },
        { name: 'Rosewater', css: 'linear-gradient(180deg, #f9a8d4 0%, #be123c 100%)' }
      ]
    },
    {
      id: 'ember-ember',
      name: 'Ember & Sepia Themes',
      category: 'themes',
      kind: 'theme-pack',
      version: '1.0.0',
      description: 'Warm ember, sepia paper and poolside gradients for cozy storytelling!',
      backgrounds: [
        { name: 'Ember', css: 'linear-gradient(180deg, #fdba74 0%, #9a3412 100%)' },
        { name: 'Sepia Paper', css: 'linear-gradient(180deg, #fefce8 0%, #d6c48a 100%)' },
        { name: 'Poolside', css: 'linear-gradient(180deg, #22d3ee 0%, #0e7490 100%)' },
        { name: 'Classic Glass', css: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)' }
      ]
    },
    {
      id: 'title-bullets',
      name: 'Title + Bullets Layout',
      category: 'templates',
      kind: 'template',
      version: '1.0.0',
      description: 'Classic agenda slide: big title, three bullet rows and an accent chip. One click inserts it!',
      slide: {
        title: 'Agenda',
        background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
        elements: [
          { type: 'text', content: 'TODAY\u2019S AGENDA', top: 40, left: 90, width: 540, height: 50, zIndex: 1, fontSize: '32px', color: '#ffffff' },
          { type: 'text', content: '\u2022 Welcome + goals', top: 120, left: 110, width: 500, height: 36, zIndex: 2, fontSize: '18px', color: '#ffffff' },
          { type: 'text', content: '\u2022 Demos + discussion', top: 165, left: 110, width: 500, height: 36, zIndex: 3, fontSize: '18px', color: '#ffffff' },
          { type: 'text', content: '\u2022 Next steps', top: 210, left: 110, width: 500, height: 36, zIndex: 4, fontSize: '18px', color: '#ffffff' },
          { type: 'shape', shapeType: 'chip', content: 'Amber', top: 280, left: 270, width: 180, height: 52, zIndex: 5, fontSize: '14px', color: '#ffffff', fillColor: '#f59e0b' }
        ]
      }
    },
    {
      id: 'hero-split',
      name: 'Hero Split Layout',
      category: 'templates',
      kind: 'template',
      version: '1.0.0',
      description: 'Bold product hero: giant headline left, glossy shape stage right!',
      slide: {
        title: 'Hero',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        elements: [
          { type: 'text', content: 'SHIP SOMETHING BOLD', top: 100, left: 40, width: 320, height: 110, zIndex: 1, fontSize: '40px', color: '#fbbf24' },
          { type: 'text', content: 'One line that sells the dream.', top: 220, left: 40, width: 320, height: 40, zIndex: 2, fontSize: '16px', color: '#e2e8f0' },
          { type: 'shape', shapeType: 'rounded', content: 'Demo', top: 80, left: 400, width: 260, height: 220, zIndex: 3, fontSize: '18px', color: '#ffffff', fillColor: '#38bdf8' }
        ]
      }
    },
    {
      id: 'quote-spotlight',
      name: 'Quote Spotlight',
      category: 'templates',
      kind: 'template',
      version: '1.0.0',
      description: 'Center-stage testimonial with oversized quote styling and attribution!',
      slide: {
        title: 'Quote',
        background: 'linear-gradient(180deg, #fefce8 0%, #fde68a 100%)',
        elements: [
          { type: 'text', content: '\u201CDesign is intelligence made visible.\u201D', top: 110, left: 90, width: 540, height: 90, zIndex: 1, fontSize: '30px', color: '#78350f' },
          { type: 'text', content: '\u2014 Alina Wheeler', top: 215, left: 90, width: 540, height: 36, zIndex: 2, fontSize: '16px', color: '#92400e' },
          { type: 'shape', shapeType: 'star', content: '\u2605', top: 40, left: 330, width: 60, height: 60, zIndex: 3, fontSize: '20px', color: '#ffffff', fillColor: '#f59e0b' }
        ]
      }
    },
    {
      id: 'neon-shapes',
      name: 'Neon Shape Expansion',
      category: 'shapes',
      kind: 'shape-pack',
      version: '1.1.0',
      description: 'Four bonus vector shapes injected straight into your shape picker: Ring, Pill, Burst and Shield!',
      shapes: [
        { type: 'ring', label: 'Ring' },
        { type: 'pill', label: 'Pill' },
        { type: 'burst', label: 'Burst' },
        { type: 'shield', label: 'Shield' }
      ]
    }
  ];

  /* ---------------- Storage ---------------- */
  function mktGetInstalled() {
    try {
      const raw = localStorage.getItem(MKT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
    } catch (e) { return []; }
  }
  function mktSaveInstalled(ids) {
    try { localStorage.setItem(MKT_STORAGE_KEY, JSON.stringify(ids)); } catch (e) {}
  }
  function mktIsInstalled(id) { return mktGetInstalled().indexOf(id) !== -1; }
  function findExt(id) { return MARKETPLACE_CATALOG.find(e => e.id === id); }

  /* ---------------- Apply / Remove ---------------- */
  /* ---------------- Marketplace Themes Dropdown (toolbar!) ---------------- */
  function renderMktThemesDropdown() {
    const list = document.getElementById('mkt-themes-list');
    if (!list) return;
    list.innerHTML = '';
    const installedPacks = MARKETPLACE_CATALOG.filter(
      ext => ext.kind === 'theme-pack' && mktIsInstalled(ext.id)
    );
    if (!installedPacks.length) {
      const note = document.createElement('p');
      note.className = 'mkt-empty-note';
      note.textContent = 'No Marketplace themes yet. Grab a theme pack to grow this collection!';
      const openBtn = document.createElement('button');
      openBtn.className = 'mkt-open-btn';
      openBtn.textContent = 'Open Marketplace';
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMarketplace();
      });
      list.appendChild(note);
      list.appendChild(openBtn);
      return;
    }
    installedPacks.forEach(ext => {
      const packName = document.createElement('div');
      packName.className = 'mkt-themes-pack-name';
      packName.textContent = ext.name;
      const dots = document.createElement('div');
      dots.className = 'mkt-themes-dots';
      ext.backgrounds.forEach(bg => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'mkt-preview-dot';
        dot.style.background = bg.css;
        dot.title = bg.name;
        dot.setAttribute('aria-label', bg.name);
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof playAeroClickSound === 'function') playAeroClickSound(650, 0.08);
          if (window.Amber && typeof window.Amber.applyBackground === 'function') window.Amber.applyBackground(bg.css);
          else if (typeof changeBackground === 'function') changeBackground(bg.css);
        });
        dots.appendChild(dot);
      });
      list.appendChild(packName);
      list.appendChild(dots);
    });
  }

  function toggleMktThemesPopup(e) {
    if (e) e.stopPropagation();
    if (typeof playAeroClickSound === 'function') playAeroClickSound(750, 0.1);
    const popup = document.getElementById('mkt-themes-popup');
    if (!popup) return;
    ['shapes-popup', 'snap-popup', 'fill-popup'].forEach(id => {
      const p = document.getElementById(id);
      if (p) p.classList.remove('show');
    });
    if (typeof closeRgbaPicker === 'function') closeRgbaPicker();
    if (typeof closeFillPopup === 'function') closeFillPopup();
    renderMktThemesDropdown();
    popup.classList.toggle('show');
  }
  window.toggleMktThemesPopup = toggleMktThemesPopup;

  function addThemePack() {
    renderMktThemesDropdown();
  }

  function removeThemePack() {
    renderMktThemesDropdown();
  }

  /* Extension glyphs: unfilled line icons matching the default grid!
     Same currentColor stroke + ~2px weight, zero fill! */
  function mktShapeGlyph(type) {
    if (typeof getSvgShapeMarkup !== 'function') return null;
    let g = getSvgShapeMarkup(type, '#d97706', null, 2, null, null);
    g = g.replace(/<defs>[\s\S]*?<\/defs>/, '');
    g = g.replace(/<g filter="url\(#[^)]*\)">/, '<g>');
    g = g.replace(/ fill="url\(#[^)]*\)"/g, ' fill="none"');
    g = g.replace(/ fill="#ffffff"/g, ' fill="none"');
    g = g.replace(/ stroke="[^"]*"/g, ' stroke="currentColor"');
    g = g.replace(/ opacity="[^"]*"/g, '');
    return g;
  }

  function addShapePack(ext) {
    const grid = document.querySelector('.shape-compact-grid');
    if (!grid || !Array.isArray(ext.shapes)) return;
    ext.shapes.forEach(s => {
      const key = ext.id + ':' + s.type;
      if (grid.querySelector(`[data-mkt-shape="${key}"]`)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shape-grid-btn mkt-shape-btn';
      btn.setAttribute('data-mkt-shape', key);
      btn.setAttribute('data-tooltip', s.label + ' (Marketplace)');
      btn.setAttribute('aria-label', s.label + ' (Marketplace)');
      btn.title = s.label;
      // True vector glyphs from the shape engine — icons, not words!
      const glyph = mktShapeGlyph(s.type);
      if (glyph) btn.innerHTML = glyph;
      else btn.textContent = s.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof addShape === 'function') addShape(s.type);
      });
      // Insert before the wide Aero Chip button so core shapes stay first!
      const wide = grid.querySelector('.wide-btn');
      if (wide) grid.insertBefore(btn, wide);
      else grid.appendChild(btn);
    });
  }

  function removeShapePack(ext) {
    const grid = document.querySelector('.shape-compact-grid');
    if (!grid) return;
    grid.querySelectorAll('[data-mkt-shape]').forEach(btn => {
      const key = btn.getAttribute('data-mkt-shape') || '';
      if (key === ext.id || key.indexOf(ext.id + ':') === 0) btn.remove();
    });
  }

  function applyExtension(ext) {
    if (ext.kind === 'theme-pack') addThemePack(ext);
    else if (ext.kind === 'shape-pack') addShapePack(ext);
  }
  function removeExtension(ext) {
    if (ext.kind === 'theme-pack') removeThemePack(ext);
    else if (ext.kind === 'shape-pack') removeShapePack(ext);
  }

  function mktInstall(id) {
    const ext = findExt(id);
    if (!ext || mktIsInstalled(id)) return;
    const ids = mktGetInstalled();
    ids.push(id);
    mktSaveInstalled(ids);
    applyExtension(ext);
    if (typeof playAeroClickSound === 'function') playAeroClickSound(850, 0.12);
    renderMarketplace();
  }
  function mktUninstall(id) {
    const ext = findExt(id);
    if (!ext) return;
    mktSaveInstalled(mktGetInstalled().filter(x => x !== id));
    removeExtension(ext);
    if (typeof playAeroClickSound === 'function') playAeroClickSound(450, 0.08);
    renderMarketplace();
  }

  /* ---------------- Rendering ---------------- */
  let activeCat = 'all';
  let searchText = '';
  let hideInstalled = false;
  let detailId = null;
  try { hideInstalled = localStorage.getItem('amber_marketplace_hide_installed') === '1'; } catch (e) {}

  function badgeClass(cat) {
    if (cat === 'themes') return 'mkt-badge-themes';
    if (cat === 'templates') return 'mkt-badge-templates';
    return 'mkt-badge-shapes';
  }
  function catLabel(cat) {
    if (cat === 'themes') return 'Themes';
    if (cat === 'templates') return 'Template';
    return 'Shapes';
  }

  function previewHTML(ext) {
    if (ext.kind === 'theme-pack') {
      return '<div class="mkt-preview-swatches">' + ext.backgrounds.map(bg =>
        `<span class="mkt-preview-dot" data-bg="${encodeURIComponent(bg.css)}" title="${bg.name}" style="background:${bg.css}"></span>`
      ).join('') + '</div>';
    }
    if (ext.kind === 'template') {
      const s = ext.slide;
      return `<div class="mkt-mini-slide" style="background:${s.background}">` +
        s.elements.slice(0, 3).map((el, i) =>
          `<span style="top:${8 + i * 26}%;color:${el.color || '#fff'}">${String(el.content || '').replace(/<[^>]*>/g, '').slice(0, 26)}</span>`
        ).join('') + '</div>';
    }
    if (ext.kind === 'shape-pack') {
      return '<div class="mkt-preview-swatches">' + ext.shapes.map(s =>
        `<span class="mkt-trigger-code"><b>${s.label}</b></span>`
      ).join('') + '</div>';
    }
    return '';
  }

  function updatePill() {
    const pill = document.getElementById('mkt-installed-count');
    if (pill) pill.textContent = mktGetInstalled().length + ' installed';
  }

  function filteredCatalog() {
    const q = searchText.trim().toLowerCase();
    return MARKETPLACE_CATALOG.filter(ext => {
      if (activeCat !== 'all' && ext.category !== activeCat) return false;
      if (hideInstalled && mktIsInstalled(ext.id)) return false;
      if (q && (ext.name + ' ' + ext.description).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderMarketplace() {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;
    updatePill();
    grid.innerHTML = '';

    if (detailId) { renderDetail(grid, findExt(detailId)); return; }

    const list = filteredCatalog();
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'mkt-empty';
      empty.textContent = 'No extensions match your search. Try another keyword!';
      grid.appendChild(empty);
      return;
    }

    list.forEach(ext => {
      const installed = mktIsInstalled(ext.id);
      const card = document.createElement('div');
      card.className = 'mkt-card' + (installed ? ' installed' : '');

      const top = document.createElement('div');
      top.className = 'mkt-card-top';
      const nameWrap = document.createElement('div');
      const name = document.createElement('p');
      name.className = 'mkt-card-name';
      name.textContent = ext.name;
      const ver = document.createElement('div');
      ver.className = 'mkt-card-version';
      ver.textContent = 'v' + ext.version;
      nameWrap.appendChild(name);
      nameWrap.appendChild(ver);
      const badge = document.createElement('span');
      badge.className = 'mkt-badge ' + badgeClass(ext.category);
      badge.textContent = catLabel(ext.category);
      top.appendChild(nameWrap);
      top.appendChild(badge);

      const desc = document.createElement('p');
      desc.className = 'mkt-card-desc';
      desc.textContent = ext.description;

      const preview = document.createElement('div');
      preview.className = 'mkt-preview';
      preview.innerHTML = previewHTML(ext);
      preview.querySelectorAll('[data-bg]').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const bg = decodeURIComponent(dot.getAttribute('data-bg'));
          if (window.Amber && typeof window.Amber.applyBackground === 'function') window.Amber.applyBackground(bg);
          else if (typeof changeBackground === 'function') changeBackground(bg);
        });
      });

      const actions = document.createElement('div');
      actions.className = 'mkt-card-actions';
      const mainBtn = document.createElement('button');
      mainBtn.className = 'mkt-install-btn';
      mainBtn.textContent = installed ? 'Installed ✓' : 'Get Extension';
      mainBtn.addEventListener('click', () => {
        if (mktIsInstalled(ext.id)) mktUninstall(ext.id);
        else mktInstall(ext.id);
      });
      const viewBtn = document.createElement('button');
      viewBtn.className = 'mkt-view-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => { detailId = ext.id; renderMarketplace(); });
      actions.appendChild(mainBtn);
      actions.appendChild(viewBtn);

      // Templates get a fast Insert button even before install detail!
      if (ext.kind === 'template' && installed) {
        const useBtn = document.createElement('button');
        useBtn.className = 'mkt-use-btn';
        useBtn.textContent = 'Insert';
        useBtn.addEventListener('click', () => insertTemplate(ext));
        actions.appendChild(useBtn);
      }

      card.appendChild(top);
      card.appendChild(desc);
      card.appendChild(preview);
      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  function renderDetail(grid, ext) {
    if (!ext) { detailId = null; renderMarketplace(); return; }
    const installed = mktIsInstalled(ext.id);

    const back = document.createElement('button');
    back.className = 'mkt-back-btn';
    back.textContent = '← Back to all';
    back.addEventListener('click', () => { detailId = null; renderMarketplace(); });
    grid.appendChild(back);

    const card = document.createElement('div');
    card.className = 'mkt-card mkt-detail' + (installed ? ' installed' : '');
    const top = document.createElement('div');
    top.className = 'mkt-card-top';
    const nameWrap = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'mkt-card-name';
    name.textContent = ext.name;
    const ver = document.createElement('div');
    ver.className = 'mkt-card-version';
    ver.textContent = 'v' + ext.version + ' • ' + catLabel(ext.category);
    nameWrap.appendChild(name);
    nameWrap.appendChild(ver);
    const badge = document.createElement('span');
    badge.className = 'mkt-badge ' + badgeClass(ext.category);
    badge.textContent = installed ? 'Installed' : 'New';
    top.appendChild(nameWrap);
    top.appendChild(badge);
    card.appendChild(top);

    const desc = document.createElement('p');
    desc.className = 'mkt-card-desc';
    desc.textContent = ext.description;
    card.appendChild(desc);

    const preview = document.createElement('div');
    preview.className = 'mkt-preview';
    preview.innerHTML = previewHTML(ext);
    card.appendChild(preview);

    const list = document.createElement('div');
    list.className = 'mkt-detail-row';
    if (ext.kind === 'theme-pack') {
      ext.backgrounds.forEach(bg => {
        const row = document.createElement('div');
        row.className = 'mkt-theme-row';
        row.style.flex = '1 1 100%';
        row.innerHTML = `<span class="mkt-preview-dot" style="background:${bg.css}"></span><span>${bg.name}</span>`;
        const apply = document.createElement('button');
        apply.className = 'mkt-use-btn';
        apply.textContent = installed ? 'Apply' : 'Get to apply';
        apply.addEventListener('click', () => {
          if (!mktIsInstalled(ext.id)) { mktInstall(ext.id); return; }
          if (window.Amber && typeof window.Amber.applyBackground === 'function') window.Amber.applyBackground(bg.css);
          else if (typeof changeBackground === 'function') changeBackground(bg.css);
        });
        row.appendChild(apply);
        list.appendChild(row);
      });
    } else if (ext.kind === 'template') {
      const info = document.createElement('p');
      info.className = 'mkt-card-desc';
      info.textContent = `Inserts "${ext.slide.title}" with ${ext.slide.elements.length} elements right after your current slide!`;
      list.appendChild(info);
    } else if (ext.kind === 'shape-pack') {
      ext.shapes.forEach(s => {
        const row = document.createElement('div');
        row.className = 'mkt-theme-row';
        row.style.flex = '1 1 100%';
        row.innerHTML = `<span><b>${s.label}</b> → shape type "${s.type}"</span>`;
        const add = document.createElement('button');
        add.className = 'mkt-use-btn';
        add.textContent = installed ? 'Add to slide' : 'Get to use';
        add.addEventListener('click', () => {
          if (!mktIsInstalled(ext.id)) { mktInstall(ext.id); return; }
          if (typeof addShape === 'function') addShape(s.type);
        });
        row.appendChild(add);
        list.appendChild(row);
      });
    }
    card.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'mkt-card-actions';
    const mainBtn = document.createElement('button');
    mainBtn.className = 'mkt-install-btn';
    mainBtn.textContent = installed ? 'Installed ✓' : 'Get Extension';
    mainBtn.addEventListener('click', () => {
      if (mktIsInstalled(ext.id)) mktUninstall(ext.id);
      else mktInstall(ext.id);
    });
    actions.appendChild(mainBtn);
    if (ext.kind === 'template' && installed) {
      const useBtn = document.createElement('button');
      useBtn.className = 'mkt-use-btn';
      useBtn.textContent = 'Insert Slide';
      useBtn.addEventListener('click', () => insertTemplate(ext));
      actions.appendChild(useBtn);
    }
    card.appendChild(actions);
    grid.appendChild(card);
  }

  function insertTemplate(ext) {
    if (!ext.slide) return;
    if (window.Amber && typeof window.Amber.insertSlide === 'function') {
      window.Amber.insertSlide(ext.slide);
      if (typeof playAeroClickSound === 'function') playAeroClickSound(850, 0.12);
      closeMarketplace();
    }
  }

  /* ---------------- Dialog open/close ---------------- */
  function openMarketplace() {
    const dlg = document.getElementById('marketplace-dialog');
    if (!dlg) return;
    if (dlg.open) { renderMarketplace(); return; }
    detailId = null;
    renderMarketplace();
    try {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    } catch (e) {
      try { dlg.setAttribute('open', ''); } catch (err) {}
    }
  }
  function closeMarketplace() {
    const dlg = document.getElementById('marketplace-dialog');
    if (!dlg) return;
    if (!dlg.open && !dlg.hasAttribute('open')) return;
    try { if (typeof dlg.close === 'function') dlg.close(); } catch (e) {}
    try { dlg.removeAttribute('open'); } catch (e) {}
  }

  /* ---------------- Boot ---------------- */
  function init() {
    // Restore installed extensions, dropping retired ids!
    const valid = MARKETPLACE_CATALOG.map(e => e.id);
    const installed = mktGetInstalled().filter(id => valid.indexOf(id) !== -1);
    mktSaveInstalled(installed);
    installed.forEach(id => {
      const ext = findExt(id);
      if (ext) applyExtension(ext);
    });
    renderMktThemesDropdown();

    // Close the themes dropdown on outside clicks (clicks inside stay open!)!
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('mkt-themes-popup');
      if (!popup || !popup.classList.contains('show')) return;
      if (e.target.closest('#mkt-themes-popup') || e.target.closest('#mkt-themes-btn')) return;
      popup.classList.remove('show');
    });

    const triggerBtn = document.getElementById('marketplace-trigger-btn');
    if (triggerBtn) triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof playAeroClickSound === 'function') playAeroClickSound(750, 0.1);
      openMarketplace();
    });
    const closeBtn = document.getElementById('marketplace-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeMarketplace(); });

    const dlg = document.getElementById('marketplace-dialog');
    if (dlg) {
      dlg.addEventListener('click', (e) => { if (e.target === dlg) closeMarketplace(); });
    }

    document.querySelectorAll('#marketplace-dialog .mkt-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#marketplace-dialog .mkt-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCat = tab.getAttribute('data-cat') || 'all';
        detailId = null;
        renderMarketplace();
      });
    });

    const search = document.getElementById('marketplace-search');
    if (search) search.addEventListener('input', () => { searchText = search.value; detailId = null; renderMarketplace(); });

    const hideBox = document.getElementById('marketplace-hide-installed');
    if (hideBox) {
      hideBox.checked = hideInstalled;
      hideBox.addEventListener('change', () => {
        hideInstalled = hideBox.checked;
        try {
          if (hideInstalled) localStorage.setItem('amber_marketplace_hide_installed', '1');
          else localStorage.removeItem('amber_marketplace_hide_installed');
        } catch (e) {}
        renderMarketplace();
      });
    }

    const resetBtn = document.getElementById('marketplace-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      [...mktGetInstalled()].forEach(id => {
        const ext = findExt(id);
        if (ext) removeExtension(ext);
      });
      mktSaveInstalled([]);
      renderMktThemesDropdown();
      renderMarketplace();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMarketplace();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.AmberMarketplace = {
    open: openMarketplace,
    close: closeMarketplace,
    install: mktInstall,
    uninstall: mktUninstall,
    installed: mktGetInstalled,
    catalog: MARKETPLACE_CATALOG
  };
})();
