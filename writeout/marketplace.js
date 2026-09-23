/* ========================================================
   WRITEOUT MARKETPLACE ENGINE
   Persisted via localStorage: writeout_marketplace_installed_v1
   ======================================================== */
(function () {
  'use strict';

  const MKT_STORAGE_KEY = 'writeout_marketplace_installed_v1';
  const MKT_THEME_ACTIVE_KEY = 'writeout_marketplace_active_theme';

  /* ---------------- Vector icons (no emoji!) ---------------- */
  const MKT_ICON_STATS = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M22 22H8a6 6 0 0 1-6-6V2" /><path d="M14.636 16.25V5.75c0-.464.173-.91.48-1.237A1.58 1.58 0 0 1 16.273 4h1.09c.435 0 .85.184 1.158.513c.307.328.479.773.479 1.237v10.5c0 .464-.172.91-.48 1.237a1.58 1.58 0 0 1-1.156.513h-1.091c-.434 0-.85-.184-1.157-.513a1.8 1.8 0 0 1-.48-1.237M7 16.25v-5.833c0-.464.172-.91.48-1.238a1.58 1.58 0 0 1 1.156-.512h1.091c.434 0 .85.184 1.157.512s.48.774.48 1.238v5.833c0 .464-.173.91-.48 1.237A1.58 1.58 0 0 1 9.727 18h-1.09c-.435 0-.85-.184-1.158-.513A1.8 1.8 0 0 1 7 16.25" /></g></svg>';
  const MKT_ICON_WARN = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7.5v5.893M12 17v1m-6.682-7.39l-.37.73c-2.425 4.778-3.637 7.167-2.541 8.913C3.502 22 6.214 22 11.637 22h.726c5.424 0 8.135 0 9.23-1.747c1.096-1.745-.115-4.133-2.537-8.905l-.368-.726C15.77 4.874 14.31 2 12 2s-3.766 2.87-6.682 8.61" /></svg>';

  /* ---------------- Catalog ---------------- */
  const MARKETPLACE_CATALOG = [
    {
      id: 'neon-ribbon',
      name: 'Neon Ribbon Pack',
      category: 'styles',
      kind: 'toolbar-style',
      version: '1.1.0',
      image: 'NE_ext.png',
      description: 'Glowing gradient ribbon highlight. Perfect for headings and callouts.',
      trigger: { open: '~NE~', close: '~NE~' },
      toolbarClass: 'mkt-neon-ribbon',
      toolbarLabel: 'NE',
      previewHTML: '<span class="mkt-neon-ribbon">Neon Ribbon</span>',
      css: `.mkt-neon-ribbon{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:20px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;color:#fff;background:linear-gradient(90deg,#06b6d4,#8b5cf6,#ec4899,#06b6d4);background-size:200% auto;border:2px solid rgba(255,255,255,0.7);text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:0 0 12px rgba(139,92,246,0.55),inset 0 1px 1px rgba(255,255,255,0.6);animation:mkt-neon-slide 3s linear infinite;}@keyframes mkt-neon-slide{to{background-position:200% center;}}`
    },
    {
      id: 'pastel-gel-pack',
      name: 'Pastel Gel Chips',
      category: 'styles',
      kind: 'toolbar-style',
      version: '1.0.2',
      image: 'PASTEL_ext.png',
      description: 'Soft 6-color pastel gel chips for gentle highlighting.',
      trigger: { open: '~PASTEL~', close: '~PASTEL~' },
      toolbarClass: 'mkt-pastel-pop',
      toolbarLabel: 'PA',
      previewHTML: '<span class="mkt-pastel-pop">Pastel Pop</span>',
      css: `.mkt-pastel-pop{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#fce7f3 0%,#f9a8d4 100%);border:2px solid #ec4899;color:#831843;box-shadow:0 3px 6px rgba(0,0,0,0.06),inset 0 1px 1px rgba(255,255,255,0.7);}`
    },
    {
      id: 'holo-chip',
      name: 'Holographic Chip',
      category: 'styles',
      kind: 'toolbar-style',
      version: '1.2.0',
      image: 'HOLO_ext.png',
      description: 'Animated iridescent holo foil chip with shifting rainbow sheen.',
      trigger: { open: '~HOLO~', close: '~HOLO~' },
      toolbarClass: 'mkt-holo-chip',
      toolbarLabel: 'HO',
      previewHTML: '<span class="mkt-holo-chip">Holographic</span>',
      css: `.mkt-holo-chip{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:8px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;color:#0f172a;background:linear-gradient(110deg,#fef08a,#bae6fd,#e9d5ff,#fecdd3,#fef08a);background-size:250% 100%;border:2px solid rgba(255,255,255,0.9);box-shadow:inset 0 1px 1px #fff,0 3px 8px rgba(0,0,0,0.12);animation:mkt-holo-shift 4s linear infinite;}@keyframes mkt-holo-shift{to{background-position:250% 0;}}`
    },
    {
      id: 'outline-glow',
      name: 'Outline Glow Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.1.0',
      image: 'OL_ext.png',
      description: 'Six transparent chips with neon outline glows. Clean on any background.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="mkt-outline-glow">Cyan</span><span class="mkt-ol-magenta">Magenta</span><span class="mkt-ol-violet">Violet</span><span class="mkt-ol-emerald">Emerald</span><span class="mkt-ol-amber">Amber</span><span class="mkt-ol-rose">Rose</span></div>',
      css: `.mkt-outline-glow{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(255,255,255,0.5);border:2px solid #06b6d4;color:#0e7490;box-shadow:0 0 10px rgba(6,182,212,0.5),inset 0 0 8px rgba(6,182,212,0.15);}.mkt-ol-magenta{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(255,255,255,0.5);border:2px solid #d946ef;color:#a21caf;box-shadow:0 0 10px rgba(217,70,239,0.5),inset 0 0 8px rgba(217,70,239,0.15);}.mkt-ol-violet{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(255,255,255,0.5);border:2px solid #8b5cf6;color:#6d28d9;box-shadow:0 0 10px rgba(139,92,246,0.5),inset 0 0 8px rgba(139,92,246,0.15);}.mkt-ol-emerald{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(255,255,255,0.5);border:2px solid #10b981;color:#047857;box-shadow:0 0 10px rgba(16,185,129,0.5),inset 0 0 8px rgba(16,185,129,0.15);}.mkt-ol-amber{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(255,255,255,0.5);border:2px solid #f59e0b;color:#b45309;box-shadow:0 0 10px rgba(245,158,11,0.5),inset 0 0 8px rgba(245,158,11,0.15);}.mkt-ol-rose{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(255,255,255,0.5);border:2px solid #f43f5e;color:#be123c;box-shadow:0 0 10px rgba(244,63,94,0.5),inset 0 0 8px rgba(244,63,94,0.15);}`,
      styles: [
        { name: 'Outline Cyan', label: 'OL', className: 'mkt-outline-glow', trigger: { open: '~OL~', close: '~OL~' } },
        { name: 'Outline Magenta', label: 'OM', className: 'mkt-ol-magenta', trigger: { open: '~OLM~', close: '~OLM~' } },
        { name: 'Outline Violet', label: 'OV', className: 'mkt-ol-violet', trigger: { open: '~OLV~', close: '~OLV~' } },
        { name: 'Outline Emerald', label: 'OE', className: 'mkt-ol-emerald', trigger: { open: '~OLE~', close: '~OLE~' } },
        { name: 'Outline Amber', label: 'OA', className: 'mkt-ol-amber', trigger: { open: '~OLA~', close: '~OLA~' } },
        { name: 'Outline Rose', label: 'OR', className: 'mkt-ol-rose', trigger: { open: '~OLR~', close: '~OLR~' } }
      ]
    },
    {
      id: 'shimmer-title',
      name: 'Shimmer Title FX',
      category: 'styles',
      kind: 'toolbar-style',
      version: '1.3.0',
      image: 'SHM_ext.png',
      description: 'Metallic sweeping-shine title text for hero lines.',
      trigger: { open: '~SHM~', close: '~SHM~' },
      toolbarClass: 'mkt-shimmer-title',
      toolbarLabel: 'SH',
      previewHTML: '<span class="mkt-shimmer-title">Shimmer Title</span>',
      css: `.mkt-shimmer-title{display:inline-block!important;font-weight:900;background:linear-gradient(110deg,#334155 20%,#fff 40%,#38bdf8 50%,#fff 60%,#334155 80%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:mkt-shine 2.8s linear infinite;}@keyframes mkt-shine{to{background-position:200% center;}}`
    },
    {
      id: 'chrome-capsule',
      name: 'Chrome Capsule',
      category: 'styles',
      kind: 'toolbar-style',
      version: '1.0.0',
      image: 'CHROME_ext.png',
      description: 'Liquid-chrome pill with a metallic center band. Pure shine!',
      trigger: { open: '~CHROME~', close: '~CHROME~' },
      toolbarClass: 'mkt-chrome-capsule',
      toolbarLabel: 'CC',
      previewHTML: '<span class="mkt-chrome-capsule">Chrome</span>',
      css: `.mkt-chrome-capsule{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:20px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#f8fafc 0%,#cbd5e1 42%,#94a3b8 50%,#e2e8f0 58%,#f8fafc 100%);border:2px solid #64748b;color:#1e293b;text-shadow:0 1px 0 rgba(255,255,255,0.7);box-shadow:0 3px 8px rgba(0,0,0,0.15),inset 0 1px 1px #fff;}`
    },
    {
      id: 'crimson-seal',
      name: 'Crimson Seal',
      category: 'styles',
      kind: 'toolbar-style',
      version: '1.0.0',
      image: 'SEAL_ext.png',
      description: 'Glossy red wax-seal stamp. For verdicts, approvals, and drama!',
      trigger: { open: '~SEAL~', close: '~SEAL~' },
      toolbarClass: 'mkt-crimson-seal',
      toolbarLabel: 'SE',
      previewHTML: '<span class="mkt-crimson-seal">Sealed</span>',
      css: `.mkt-crimson-seal{display:inline-flex!important;align-items:center;padding:2px 12px;border-radius:20px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:radial-gradient(circle at 35% 30%,#fca5a5 0%,#dc2626 60%,#7f1d1d 100%);border:2px solid #fecaca;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);box-shadow:0 0 12px rgba(220,38,38,0.45),inset 0 1px 2px rgba(255,255,255,0.5);}`
    },
    {
      id: 'sky-tape',
      name: 'Sky Tape',
      category: 'styles',
      kind: 'toolbar-style',
      version: '1.0.0',
      image: 'SKY_ext.png',
      description: 'Translucent sky-blue tape strip with stitched edges. Stick it anywhere!',
      trigger: { open: '~SKY~', close: '~SKY~' },
      toolbarClass: 'mkt-sky-tape',
      toolbarLabel: 'SK',
      previewHTML: '<span class="mkt-sky-tape">Taped</span>',
      css: `.mkt-sky-tape{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:0;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(125,211,252,0.45);border-top:2px dashed #0284c7;border-bottom:2px dashed #0284c7;border-left:1px solid rgba(2,132,199,0.6);border-right:1px solid rgba(2,132,199,0.6);color:#0c4a6e;box-shadow:0 2px 5px rgba(2,132,199,0.2);transform:rotate(-1deg);}`
    },
    {
      id: 'keydown-mega-pack',
      name: 'Keydown Mega Pack — 15 Styles!',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'KeydownPlus.png',
      description: 'Fifteen brand-new Keydown styles in one install! Gels, neons, stickers, keycaps and more — use the toolbar chips, the style picker, or type any trigger code!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="mkt-kp-sunset">Sunset</span><span class="mkt-kp-foam">Foam</span><span class="mkt-kp-grape">Grape</span><span class="mkt-kp-matcha">Matcha</span><span class="mkt-kp-gum">Gum</span><span class="mkt-kp-lemon">Lemon</span><span class="mkt-kp-night">Night</span><span class="mkt-kp-candy">Candy</span><span class="mkt-kp-lava">Lava</span><span class="mkt-kp-frost">Frost</span><span class="mkt-kp-gold">Gold</span><span class="mkt-kp-mint">Mint</span><span class="mkt-kp-uv">UV Glow</span><span class="mkt-kp-key">KEY</span><span class="mkt-kp-stick">Sticker</span></div>',
      css: `.mkt-kp-sunset{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#fdba74 0%,#f43f5e 100%);border:2px solid #be123c;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);box-shadow:0 3px 6px rgba(0,0,0,0.1),inset 0 1px 1px rgba(255,255,255,0.6);}.mkt-kp-foam{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:20px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#f0fdfa 0%,#99f6e4 100%);border:2px solid #14b8a6;color:#134e4a;box-shadow:0 3px 6px rgba(0,0,0,0.06),inset 0 1px 1px rgba(255,255,255,0.7);}.mkt-kp-grape{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#d8b4fe 0%,#7c3aed 100%);border:2px solid #6d28d9;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);box-shadow:0 3px 6px rgba(0,0,0,0.1),inset 0 1px 1px rgba(255,255,255,0.6);}.mkt-kp-matcha{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#d9f99d 0%,#65a30d 100%);border:2px solid #4d7c0f;color:#1a2e05;box-shadow:0 3px 6px rgba(0,0,0,0.06),inset 0 1px 1px rgba(255,255,255,0.7);}.mkt-kp-gum{display:inline-flex!important;align-items:center;padding:2px 12px;border-radius:20px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#f9a8d4 0%,#ec4899 100%);border:2px solid #db2777;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);box-shadow:0 3px 6px rgba(0,0,0,0.1),inset 0 1px 1px rgba(255,255,255,0.6);}.mkt-kp-lemon{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:6px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#fef08a 0%,#eab308 100%);border:2px solid #ca8a04;color:#451a03;box-shadow:0 0 10px rgba(234,179,8,0.45),inset 0 1px 1px rgba(255,255,255,0.7);}.mkt-kp-night{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #22d3ee;color:#a5f3fc;box-shadow:0 0 12px rgba(34,211,238,0.5),inset 0 1px 1px rgba(255,255,255,0.2);}.mkt-kp-candy{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:repeating-linear-gradient(45deg,#fbcfe8 0 8px,#bfdbfe 8px 16px);border:2px solid #f472b6;color:#831843;box-shadow:0 3px 6px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.7);}.mkt-kp-lava{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:8px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#fca5a5 0%,#dc2626 100%);border:2px solid #991b1b;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:0 0 12px rgba(220,38,38,0.45),inset 0 1px 1px rgba(255,255,255,0.5);}.mkt-kp-frost{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:12px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(255,255,255,0.55);border:2px solid rgba(255,255,255,0.9);color:#0c4a6e;box-shadow:0 3px 10px rgba(2,132,199,0.2),inset 0 1px 1px #fff;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}.mkt-kp-gold{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#fde68a 0%,#b45309 100%);border:2px solid #92400e;color:#451a03;box-shadow:0 3px 8px rgba(180,83,9,0.35),inset 0 1px 1px rgba(255,255,255,0.7);}.mkt-kp-mint{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background-color:#a7f3d0;background-image:radial-gradient(#059669 1.2px,transparent 1.3px);background-size:10px 10px;border:2px solid #059669;color:#064e3b;box-shadow:0 3px 6px rgba(0,0,0,0.06),inset 0 1px 1px rgba(255,255,255,0.7);}.mkt-kp-uv{display:inline-block!important;font-weight:900;white-space:nowrap;margin:0 2px;vertical-align:middle;color:#7c3aed;text-shadow:0 0 8px rgba(139,92,246,0.8),0 0 2px rgba(124,58,237,0.6);border-bottom:2px dotted #8b5cf6;}.mkt-kp-key{display:inline-flex!important;align-items:center;padding:2px 9px;border-radius:6px;font-weight:800;font-family:monospace;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,#fff 0%,#cbd5e1 100%);border:2px solid #94a3b8;border-bottom-width:4px;color:#1e293b;box-shadow:0 2px 4px rgba(0,0,0,0.12);}.mkt-kp-stick{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:14px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:#fff;border:2px solid #0ea5e9;color:#0c4a6e;box-shadow:2px 2px 0 #0ea5e9;}`,
      styles: [
        { name: 'Sunset Gel', label: 'SU', className: 'mkt-kp-sunset', trigger: { open: '~SUN~', close: '~SUN~' } },
        { name: 'Ocean Foam', label: 'FO', className: 'mkt-kp-foam', trigger: { open: '~FOAM~', close: '~FOAM~' } },
        { name: 'Grape Soda', label: 'GR', className: 'mkt-kp-grape', trigger: { open: '~GRAPE~', close: '~GRAPE~' } },
        { name: 'Matcha Cream', label: 'MA', className: 'mkt-kp-matcha', trigger: { open: '~MATCHA~', close: '~MATCHA~' } },
        { name: 'Bubblegum Pop', label: 'GU', className: 'mkt-kp-gum', trigger: { open: '~GUM~', close: '~GUM~' } },
        { name: 'Lemon Drop', label: 'LE', className: 'mkt-kp-lemon', trigger: { open: '~LEMON~', close: '~LEMON~' } },
        { name: 'Midnight Neon', label: 'NI', className: 'mkt-kp-night', trigger: { open: '~NIGHT~', close: '~NIGHT~' } },
        { name: 'Cotton Candy', label: 'CA', className: 'mkt-kp-candy', trigger: { open: '~CANDY~', close: '~CANDY~' } },
        { name: 'Lava Alert', label: 'LA', className: 'mkt-kp-lava', trigger: { open: '~LAVA~', close: '~LAVA~' } },
        { name: 'Frosted Glass', label: 'FR', className: 'mkt-kp-frost', trigger: { open: '~FROST~', close: '~FROST~' } },
        { name: 'Gold Foil', label: 'GO', className: 'mkt-kp-gold', trigger: { open: '~GOLD~', close: '~GOLD~' } },
        { name: 'Mint Chip', label: 'MI', className: 'mkt-kp-mint', trigger: { open: '~MINT~', close: '~MINT~' } },
        { name: 'Ultraviolet', label: 'UV', className: 'mkt-kp-uv', trigger: { open: '~UV~', close: '~UV~' } },
        { name: 'Typewriter Key', label: 'KE', className: 'mkt-kp-key', trigger: { open: '~KEY~', close: '~KEY~' } },
        { name: 'Sticker Peel', label: 'ST', className: 'mkt-kp-stick', trigger: { open: '~STICK~', close: '~STICK~' } }
      ]
    },
    {
      id: 'orange-ultrapack',
      name: 'Orange Ultrapack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'OrangeUltrapack.png',
      description: 'Fifty glossy orange highlights in one install! From ember deep to citrus light, plus gradient fusions!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="orange-hl-1">1</span><span class="orange-hl-2">2</span><span class="orange-hl-3">3</span><span class="orange-hl-4">4</span><span class="orange-hl-5">5</span><span class="orange-hl-6">6</span><span class="orange-hl-7">7</span><span class="orange-hl-8">8</span><span class="orange-hl-9">9</span><span class="orange-hl-10">10</span><span class="orange-hl-11">11</span><span class="orange-hl-12">12</span><span class="orange-hl-13">13</span><span class="orange-hl-14">14</span><span class="orange-hl-15">15</span><span class="orange-hl-16">16</span><span class="orange-hl-17">17</span><span class="orange-hl-18">18</span><span class="orange-hl-19">19</span><span class="orange-hl-20">20</span><span class="orange-hl-21">21</span><span class="orange-hl-22">22</span><span class="orange-hl-23">23</span><span class="orange-hl-24">24</span><span class="orange-hl-25">25</span><span class="orange-hl-26">26</span><span class="orange-hl-27">27</span><span class="orange-hl-28">28</span><span class="orange-hl-29">29</span><span class="orange-hl-30">30</span><span class="orange-hl-31">31</span><span class="orange-hl-32">32</span><span class="orange-hl-33">33</span><span class="orange-hl-34">34</span><span class="orange-hl-35">35</span><span class="orange-hl-36">36</span><span class="orange-hl-37">37</span><span class="orange-hl-38">38</span><span class="orange-hl-39">39</span><span class="orange-hl-40">40</span><span class="orange-hl-41">41</span><span class="orange-hl-42">42</span><span class="orange-hl-43">43</span><span class="orange-hl-44">44</span><span class="orange-hl-45">45</span><span class="orange-hl-46">46</span><span class="orange-hl-47">47</span><span class="orange-hl-48">48</span><span class="orange-hl-49">49</span><span class="orange-hl-50">50</span></div>',
      css: `.orange-hl-1,.orange-hl-2,.orange-hl-3,.orange-hl-4,.orange-hl-5,.orange-hl-6,.orange-hl-7,.orange-hl-8,.orange-hl-9,.orange-hl-10,.orange-hl-11,.orange-hl-12,.orange-hl-13,.orange-hl-14,.orange-hl-15,.orange-hl-16,.orange-hl-17,.orange-hl-18,.orange-hl-19,.orange-hl-20,.orange-hl-21,.orange-hl-22,.orange-hl-23,.orange-hl-24,.orange-hl-25,.orange-hl-26,.orange-hl-27,.orange-hl-28,.orange-hl-29,.orange-hl-30,.orange-hl-31,.orange-hl-32,.orange-hl-33,.orange-hl-34,.orange-hl-35,.orange-hl-36,.orange-hl-37,.orange-hl-38,.orange-hl-39,.orange-hl-40,.orange-hl-41,.orange-hl-42,.orange-hl-43,.orange-hl-44,.orange-hl-45,.orange-hl-46,.orange-hl-47,.orange-hl-48,.orange-hl-49,.orange-hl-50{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.orange-hl-1{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ff7700; border: 1.5px solid #cc5f00; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,119,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-2{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ff8800; border: 1.5px solid #d47000; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,136,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-3{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ff9900; border: 1.5px solid #d98200; color: #2e1a00; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(255,153,0,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.orange-hl-4{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ffaa00; border: 1.5px solid #e09400; color: #2e1a00; box-shadow: inset 0 1px 2px rgba(255,255,255,0.90), 0 2px 4px rgba(255,170,0,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.orange-hl-5{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ffbb00; border: 1.5px solid #e6a100; color: #2e1a00; box-shadow: inset 0 1px 2px rgba(255,255,255,0.90), 0 2px 4px rgba(255,187,0,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.orange-hl-6{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #f97316; border: 1.5px solid #c2410c; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(249,115,22,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-7{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ea580c; border: 1.5px solid #9a3412; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(234,88,12,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-8{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #c2410c; border: 1.5px solid #7c2d12; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(194,65,12,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-9{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #9a3412; border: 1.5px solid #431407; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.55), 0 2px 4px rgba(154,52,18,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-10{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #7c2d12; border: 1.5px solid #290802; color: #ffedd5; box-shadow: inset 0 1px 2px rgba(255,255,255,0.45), 0 2px 4px rgba(124,45,18,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.6); }.orange-hl-11{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #fb923c; border: 1.5px solid #ea580c; color: #431407; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(251,146,60,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.orange-hl-12{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #fdba74; border: 1.5px solid #f97316; color: #431407; box-shadow: inset 0 1px 2px rgba(255,255,255,0.90), 0 2px 4px rgba(253,186,116,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.orange-hl-13{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #fed7aa; border: 1.5px solid #fb923c; color: #7c2d12; box-shadow: inset 0 1px 2px rgba(255,255,255,0.95), 0 2px 4px rgba(254,215,170,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.orange-hl-14{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ffedd5; border: 1.5px solid #fdba74; color: #9a3412; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(255,237,213,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.8); }.orange-hl-15{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ff6b00; border: 1.5px solid #b34b00; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,107,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-16{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #f59e0b; border: 1.5px solid #b45309; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(245,158,11,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-17{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #d97706; border: 1.5px solid #92400e; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(217,119,6,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-18{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #b45309; border: 1.5px solid #78350f; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(180,83,9,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-19{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #92400e; border: 1.5px solid #451a03; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.55), 0 2px 4px rgba(146,64,14,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-20{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #fcd34d; border: 1.5px solid #d97706; color: #451a03; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(252,211,77,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.orange-hl-21{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #ff7700 0%, #ffcc00 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,119,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-22{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #ea580c 0%, #fb923c 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(234,88,12,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-23{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #c2410c 0%, #f97316 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(194,65,12,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-24{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #9a3412 0%, #ea580c 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 4px rgba(154,52,18,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-25{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #ff4500 0%, #ff8c00 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,69,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-26{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #cc5500; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.6), 0 2px 4px rgba(204,85,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-27{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #d35400; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(211,84,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-28{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #e67e22; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(230,126,34,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-29{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #f39c12; border: 1.5px solid rgba(255,255,255,0.5); color: #2e1a00; box-shadow: inset 0 1px 3px rgba(255,255,255,0.6), 0 2px 4px rgba(243,156,18,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.orange-hl-30{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #d68910; border: 1.5px solid rgba(255,255,255,0.4); color: #2e1a00; box-shadow: inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(214,137,16,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.orange-hl-31{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ff5722; border: 1.5px solid #d84315; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,87,34,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-32{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #f4511e; border: 1.5px solid #bf360c; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(244,81,30,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-33{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #e64a19; border: 1.5px solid #bf360c; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(230,74,25,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-34{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #d84315; border: 1.5px solid #870000; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(216,67,21,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-35{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #bf360c; border: 1.5px solid #5d1000; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.55), 0 2px 4px rgba(191,54,12,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-36{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ff9800; border: 1.5px solid #ef6c00; color: #2e1a00; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(255,152,0,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.orange-hl-37{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #fb8c00; border: 1.5px solid #e65100; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(251,140,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-38{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #f57c00; border: 1.5px solid #e65100; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(245,124,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-39{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #ef6c00; border: 1.5px solid #b26a00; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(239,108,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-40{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #e65100; border: 1.5px solid #823100; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(230,81,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-41{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #ffcc80; border: 1.5px solid #fb8c00; color: #431407; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(255,204,128,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.orange-hl-42{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #ffb74d; border: 1.5px solid #f57c00; color: #431407; box-shadow: inset 0 1px 2px rgba(255,255,255,0.95), 0 2px 4px rgba(255,183,77,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.orange-hl-43{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #ffa726; border: 1.5px solid #ef6c00; color: #2e1a00; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(255,167,38,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.orange-hl-44{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #ff9100; border: 1.5px solid #e65100; color: #2e1a00; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(255,145,0,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.orange-hl-45{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #ff6d00; border: 1.5px solid #b24700; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,109,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-46{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #ff5722 0%, #ffb300 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(255,87,34,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-47{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #e65100 0%, #ffb74d 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(230,81,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-48{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #d35400 0%, #f39c12 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(211,84,0,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-49{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #bf360c 0%, #ff9800 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(191,54,12,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.orange-hl-50{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #ff9100 0%, #ffe082 100%); border: 1.5px solid #ffffff; color: #2e1a00; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 6px rgba(255,145,0,0.4); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }`,
      styles: [
        { name: 'Orange 1', label: 'O1', className: 'orange-hl-1', trigger: { open: '~OR1~', close: '~OR1~' } },
        { name: 'Orange 2', label: 'O2', className: 'orange-hl-2', trigger: { open: '~OR2~', close: '~OR2~' } },
        { name: 'Orange 3', label: 'O3', className: 'orange-hl-3', trigger: { open: '~OR3~', close: '~OR3~' } },
        { name: 'Orange 4', label: 'O4', className: 'orange-hl-4', trigger: { open: '~OR4~', close: '~OR4~' } },
        { name: 'Orange 5', label: 'O5', className: 'orange-hl-5', trigger: { open: '~OR5~', close: '~OR5~' } },
        { name: 'Orange 6', label: 'O6', className: 'orange-hl-6', trigger: { open: '~OR6~', close: '~OR6~' } },
        { name: 'Orange 7', label: 'O7', className: 'orange-hl-7', trigger: { open: '~OR7~', close: '~OR7~' } },
        { name: 'Orange 8', label: 'O8', className: 'orange-hl-8', trigger: { open: '~OR8~', close: '~OR8~' } },
        { name: 'Orange 9', label: 'O9', className: 'orange-hl-9', trigger: { open: '~OR9~', close: '~OR9~' } },
        { name: 'Orange 10', label: 'O10', className: 'orange-hl-10', trigger: { open: '~OR10~', close: '~OR10~' } },
        { name: 'Orange 11', label: 'O11', className: 'orange-hl-11', trigger: { open: '~OR11~', close: '~OR11~' } },
        { name: 'Orange 12', label: 'O12', className: 'orange-hl-12', trigger: { open: '~OR12~', close: '~OR12~' } },
        { name: 'Orange 13', label: 'O13', className: 'orange-hl-13', trigger: { open: '~OR13~', close: '~OR13~' } },
        { name: 'Orange 14', label: 'O14', className: 'orange-hl-14', trigger: { open: '~OR14~', close: '~OR14~' } },
        { name: 'Orange 15', label: 'O15', className: 'orange-hl-15', trigger: { open: '~OR15~', close: '~OR15~' } },
        { name: 'Orange 16', label: 'O16', className: 'orange-hl-16', trigger: { open: '~OR16~', close: '~OR16~' } },
        { name: 'Orange 17', label: 'O17', className: 'orange-hl-17', trigger: { open: '~OR17~', close: '~OR17~' } },
        { name: 'Orange 18', label: 'O18', className: 'orange-hl-18', trigger: { open: '~OR18~', close: '~OR18~' } },
        { name: 'Orange 19', label: 'O19', className: 'orange-hl-19', trigger: { open: '~OR19~', close: '~OR19~' } },
        { name: 'Orange 20', label: 'O20', className: 'orange-hl-20', trigger: { open: '~OR20~', close: '~OR20~' } },
        { name: 'Orange 21', label: 'O21', className: 'orange-hl-21', trigger: { open: '~OR21~', close: '~OR21~' } },
        { name: 'Orange 22', label: 'O22', className: 'orange-hl-22', trigger: { open: '~OR22~', close: '~OR22~' } },
        { name: 'Orange 23', label: 'O23', className: 'orange-hl-23', trigger: { open: '~OR23~', close: '~OR23~' } },
        { name: 'Orange 24', label: 'O24', className: 'orange-hl-24', trigger: { open: '~OR24~', close: '~OR24~' } },
        { name: 'Orange 25', label: 'O25', className: 'orange-hl-25', trigger: { open: '~OR25~', close: '~OR25~' } },
        { name: 'Orange 26', label: 'O26', className: 'orange-hl-26', trigger: { open: '~OR26~', close: '~OR26~' } },
        { name: 'Orange 27', label: 'O27', className: 'orange-hl-27', trigger: { open: '~OR27~', close: '~OR27~' } },
        { name: 'Orange 28', label: 'O28', className: 'orange-hl-28', trigger: { open: '~OR28~', close: '~OR28~' } },
        { name: 'Orange 29', label: 'O29', className: 'orange-hl-29', trigger: { open: '~OR29~', close: '~OR29~' } },
        { name: 'Orange 30', label: 'O30', className: 'orange-hl-30', trigger: { open: '~OR30~', close: '~OR30~' } },
        { name: 'Orange 31', label: 'O31', className: 'orange-hl-31', trigger: { open: '~OR31~', close: '~OR31~' } },
        { name: 'Orange 32', label: 'O32', className: 'orange-hl-32', trigger: { open: '~OR32~', close: '~OR32~' } },
        { name: 'Orange 33', label: 'O33', className: 'orange-hl-33', trigger: { open: '~OR33~', close: '~OR33~' } },
        { name: 'Orange 34', label: 'O34', className: 'orange-hl-34', trigger: { open: '~OR34~', close: '~OR34~' } },
        { name: 'Orange 35', label: 'O35', className: 'orange-hl-35', trigger: { open: '~OR35~', close: '~OR35~' } },
        { name: 'Orange 36', label: 'O36', className: 'orange-hl-36', trigger: { open: '~OR36~', close: '~OR36~' } },
        { name: 'Orange 37', label: 'O37', className: 'orange-hl-37', trigger: { open: '~OR37~', close: '~OR37~' } },
        { name: 'Orange 38', label: 'O38', className: 'orange-hl-38', trigger: { open: '~OR38~', close: '~OR38~' } },
        { name: 'Orange 39', label: 'O39', className: 'orange-hl-39', trigger: { open: '~OR39~', close: '~OR39~' } },
        { name: 'Orange 40', label: 'O40', className: 'orange-hl-40', trigger: { open: '~OR40~', close: '~OR40~' } },
        { name: 'Orange 41', label: 'O41', className: 'orange-hl-41', trigger: { open: '~OR41~', close: '~OR41~' } },
        { name: 'Orange 42', label: 'O42', className: 'orange-hl-42', trigger: { open: '~OR42~', close: '~OR42~' } },
        { name: 'Orange 43', label: 'O43', className: 'orange-hl-43', trigger: { open: '~OR43~', close: '~OR43~' } },
        { name: 'Orange 44', label: 'O44', className: 'orange-hl-44', trigger: { open: '~OR44~', close: '~OR44~' } },
        { name: 'Orange 45', label: 'O45', className: 'orange-hl-45', trigger: { open: '~OR45~', close: '~OR45~' } },
        { name: 'Orange 46', label: 'O46', className: 'orange-hl-46', trigger: { open: '~OR46~', close: '~OR46~' } },
        { name: 'Orange 47', label: 'O47', className: 'orange-hl-47', trigger: { open: '~OR47~', close: '~OR47~' } },
        { name: 'Orange 48', label: 'O48', className: 'orange-hl-48', trigger: { open: '~OR48~', close: '~OR48~' } },
        { name: 'Orange 49', label: 'O49', className: 'orange-hl-49', trigger: { open: '~OR49~', close: '~OR49~' } },
        { name: 'Orange 50', label: 'O50', className: 'orange-hl-50', trigger: { open: '~OR50~', close: '~OR50~' } }
      ]
    },
    {
      id: 'green-ultrapack',
      name: 'Green Ultrapack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'GreenUltrapack.png',
      description: 'Fifty glossy green highlights in one install! From neon lime to deep forest, plus gradient fusions!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="green-hl-1">1</span><span class="green-hl-2">2</span><span class="green-hl-3">3</span><span class="green-hl-4">4</span><span class="green-hl-5">5</span><span class="green-hl-6">6</span><span class="green-hl-7">7</span><span class="green-hl-8">8</span><span class="green-hl-9">9</span><span class="green-hl-10">10</span><span class="green-hl-11">11</span><span class="green-hl-12">12</span><span class="green-hl-13">13</span><span class="green-hl-14">14</span><span class="green-hl-15">15</span><span class="green-hl-16">16</span><span class="green-hl-17">17</span><span class="green-hl-18">18</span><span class="green-hl-19">19</span><span class="green-hl-20">20</span><span class="green-hl-21">21</span><span class="green-hl-22">22</span><span class="green-hl-23">23</span><span class="green-hl-24">24</span><span class="green-hl-25">25</span><span class="green-hl-26">26</span><span class="green-hl-27">27</span><span class="green-hl-28">28</span><span class="green-hl-29">29</span><span class="green-hl-30">30</span><span class="green-hl-31">31</span><span class="green-hl-32">32</span><span class="green-hl-33">33</span><span class="green-hl-34">34</span><span class="green-hl-35">35</span><span class="green-hl-36">36</span><span class="green-hl-37">37</span><span class="green-hl-38">38</span><span class="green-hl-39">39</span><span class="green-hl-40">40</span><span class="green-hl-41">41</span><span class="green-hl-42">42</span><span class="green-hl-43">43</span><span class="green-hl-44">44</span><span class="green-hl-45">45</span><span class="green-hl-46">46</span><span class="green-hl-47">47</span><span class="green-hl-48">48</span><span class="green-hl-49">49</span><span class="green-hl-50">50</span></div>',
      css: `.green-hl-1,.green-hl-2,.green-hl-3,.green-hl-4,.green-hl-5,.green-hl-6,.green-hl-7,.green-hl-8,.green-hl-9,.green-hl-10,.green-hl-11,.green-hl-12,.green-hl-13,.green-hl-14,.green-hl-15,.green-hl-16,.green-hl-17,.green-hl-18,.green-hl-19,.green-hl-20,.green-hl-21,.green-hl-22,.green-hl-23,.green-hl-24,.green-hl-25,.green-hl-26,.green-hl-27,.green-hl-28,.green-hl-29,.green-hl-30,.green-hl-31,.green-hl-32,.green-hl-33,.green-hl-34,.green-hl-35,.green-hl-36,.green-hl-37,.green-hl-38,.green-hl-39,.green-hl-40,.green-hl-41,.green-hl-42,.green-hl-43,.green-hl-44,.green-hl-45,.green-hl-46,.green-hl-47,.green-hl-48,.green-hl-49,.green-hl-50{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.green-hl-1{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #00ff66; border: 1.5px solid #00b347; color: #033013; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,255,102,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.green-hl-2{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #10b981; border: 1.5px solid #047857; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(16,185,129,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-3{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #059669; border: 1.5px solid #065f46; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(5,150,105,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-4{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #047857; border: 1.5px solid #064e3b; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(4,120,87,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-5{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #065f46; border: 1.5px solid #022c22; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.55), 0 2px 4px rgba(6,95,70,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-6{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #34d399; border: 1.5px solid #059669; color: #022c22; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(52,211,153,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.green-hl-7{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #6ee7b7; border: 1.5px solid #047857; color: #022c22; box-shadow: inset 0 1px 2px rgba(255,255,255,0.90), 0 2px 4px rgba(110,231,183,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.green-hl-8{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #a7f3d0; border: 1.5px solid #059669; color: #064e3b; box-shadow: inset 0 1px 2px rgba(255,255,255,0.95), 0 2px 4px rgba(167,243,208,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.green-hl-9{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #d1fae5; border: 1.5px solid #10b981; color: #065f46; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(209,250,229,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.8); }.green-hl-10{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #22c55e; border: 1.5px solid #15803d; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(34,197,94,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-11{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #16a34a; border: 1.5px solid #166534; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(22,163,74,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-12{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #15803d; border: 1.5px solid #14532d; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(21,128,61,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-13{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #166534; border: 1.5px solid #052e16; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.55), 0 2px 4px rgba(22,101,52,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-14{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #86efac; border: 1.5px solid #16a34a; color: #052e16; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(134,239,172,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.green-hl-15{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #4ade80; border: 1.5px solid #15803d; color: #052e16; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(74,222,128,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.green-hl-16{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #84cc16; border: 1.5px solid #4d7c0f; color: #1a2e05; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(132,204,22,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.green-hl-17{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #65a30d; border: 1.5px solid #3f6212; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(101,163,13,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-18{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #4d7c0f; border: 1.5px solid #365314; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(77,124,15,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-19{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #a3e635; border: 1.5px solid #65a30d; color: #1a2e05; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(163,230,53,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.green-hl-20{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #bef264; border: 1.5px solid #4d7c0f; color: #1a2e05; box-shadow: inset 0 1px 2px rgba(255,255,255,0.95), 0 2px 4px rgba(190,242,100,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.green-hl-21{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #14b8a6; border: 1.5px solid #0f766e; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(20,184,166,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-22{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0d9488; border: 1.5px solid #115e59; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(13,148,136,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-23{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0f766e; border: 1.5px solid #134e4a; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(15,118,110,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-24{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #2dd4bf; border: 1.5px solid #0f766e; color: #042f2e; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(45,212,191,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.green-hl-25{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #5eead4; border: 1.5px solid #0d9488; color: #042f2e; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(94,234,212,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.green-hl-26{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #10b981 0%, #34d399 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(16,185,129,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-27{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #059669 0%, #6ee7b7 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(5,150,105,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-28{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #22c55e 0%, #86efac 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(34,197,94,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-29{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #16a34a 0%, #4ade80 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(22,163,74,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-30{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #65a30d 0%, #a3e635 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(101,163,13,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-31{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #047857; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.6), 0 2px 4px rgba(4,120,87,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-32{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #065f46; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(6,95,70,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-33{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #166534; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(22,101,52,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-34{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #14532d; border: 1.5px solid rgba(255,255,255,0.4); color: #86efac; box-shadow: inset 0 1px 3px rgba(255,255,255,0.4), 0 2px 4px rgba(20,83,45,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.6); }.green-hl-35{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #365314; border: 1.5px solid rgba(255,255,255,0.4); color: #bef264; box-shadow: inset 0 1px 3px rgba(255,255,255,0.4), 0 2px 4px rgba(54,83,20,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.6); }.green-hl-36{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #22c55e; border: 1.5px solid #16a34a; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(34,197,94,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-37{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #10b981; border: 1.5px solid #059669; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(16,185,129,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-38{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #14b8a6; border: 1.5px solid #0d9488; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(20,184,166,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-39{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #84cc16; border: 1.5px solid #65a30d; color: #1a2e05; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(132,204,22,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.green-hl-40{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #15803d; border: 1.5px solid #166534; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(21,128,61,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-41{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #bbf7d0; border: 1.5px solid #22c55e; color: #052e16; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(187,247,208,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.green-hl-42{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #a7f3d0; border: 1.5px solid #10b981; color: #064e3b; box-shadow: inset 0 1px 2px rgba(255,255,255,0.95), 0 2px 4px rgba(167,243,208,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.green-hl-43{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #99f6e4; border: 1.5px solid #14b8a6; color: #042f2e; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(153,246,228,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.green-hl-44{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #ecfccb; border: 1.5px solid #84cc16; color: #1a2e05; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(236,252,203,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.green-hl-45{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #dcfce7; border: 1.5px solid #15803d; color: #052e16; box-shadow: inset 0 1px 2px rgba(255,255,255,0.95), 0 2px 4px rgba(220,252,231,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.green-hl-46{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #059669 0%, #34d399 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(5,150,105,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-47{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #16a34a 0%, #86efac 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(22,163,74,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-48{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #0d9488 0%, #5eead4 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(13,148,136,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-49{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #4d7c0f 0%, #bef264 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(77,124,15,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.green-hl-50{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #22c55e 0%, #dcfce7 100%); border: 1.5px solid #ffffff; color: #052e16; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 6px rgba(34,197,94,0.4); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }`,
      styles: [
        { name: 'Green 1', label: 'G1', className: 'green-hl-1', trigger: { open: '~GR1~', close: '~GR1~' } },
        { name: 'Green 2', label: 'G2', className: 'green-hl-2', trigger: { open: '~GR2~', close: '~GR2~' } },
        { name: 'Green 3', label: 'G3', className: 'green-hl-3', trigger: { open: '~GR3~', close: '~GR3~' } },
        { name: 'Green 4', label: 'G4', className: 'green-hl-4', trigger: { open: '~GR4~', close: '~GR4~' } },
        { name: 'Green 5', label: 'G5', className: 'green-hl-5', trigger: { open: '~GR5~', close: '~GR5~' } },
        { name: 'Green 6', label: 'G6', className: 'green-hl-6', trigger: { open: '~GR6~', close: '~GR6~' } },
        { name: 'Green 7', label: 'G7', className: 'green-hl-7', trigger: { open: '~GR7~', close: '~GR7~' } },
        { name: 'Green 8', label: 'G8', className: 'green-hl-8', trigger: { open: '~GR8~', close: '~GR8~' } },
        { name: 'Green 9', label: 'G9', className: 'green-hl-9', trigger: { open: '~GR9~', close: '~GR9~' } },
        { name: 'Green 10', label: 'G10', className: 'green-hl-10', trigger: { open: '~GR10~', close: '~GR10~' } },
        { name: 'Green 11', label: 'G11', className: 'green-hl-11', trigger: { open: '~GR11~', close: '~GR11~' } },
        { name: 'Green 12', label: 'G12', className: 'green-hl-12', trigger: { open: '~GR12~', close: '~GR12~' } },
        { name: 'Green 13', label: 'G13', className: 'green-hl-13', trigger: { open: '~GR13~', close: '~GR13~' } },
        { name: 'Green 14', label: 'G14', className: 'green-hl-14', trigger: { open: '~GR14~', close: '~GR14~' } },
        { name: 'Green 15', label: 'G15', className: 'green-hl-15', trigger: { open: '~GR15~', close: '~GR15~' } },
        { name: 'Green 16', label: 'G16', className: 'green-hl-16', trigger: { open: '~GR16~', close: '~GR16~' } },
        { name: 'Green 17', label: 'G17', className: 'green-hl-17', trigger: { open: '~GR17~', close: '~GR17~' } },
        { name: 'Green 18', label: 'G18', className: 'green-hl-18', trigger: { open: '~GR18~', close: '~GR18~' } },
        { name: 'Green 19', label: 'G19', className: 'green-hl-19', trigger: { open: '~GR19~', close: '~GR19~' } },
        { name: 'Green 20', label: 'G20', className: 'green-hl-20', trigger: { open: '~GR20~', close: '~GR20~' } },
        { name: 'Green 21', label: 'G21', className: 'green-hl-21', trigger: { open: '~GR21~', close: '~GR21~' } },
        { name: 'Green 22', label: 'G22', className: 'green-hl-22', trigger: { open: '~GR22~', close: '~GR22~' } },
        { name: 'Green 23', label: 'G23', className: 'green-hl-23', trigger: { open: '~GR23~', close: '~GR23~' } },
        { name: 'Green 24', label: 'G24', className: 'green-hl-24', trigger: { open: '~GR24~', close: '~GR24~' } },
        { name: 'Green 25', label: 'G25', className: 'green-hl-25', trigger: { open: '~GR25~', close: '~GR25~' } },
        { name: 'Green 26', label: 'G26', className: 'green-hl-26', trigger: { open: '~GR26~', close: '~GR26~' } },
        { name: 'Green 27', label: 'G27', className: 'green-hl-27', trigger: { open: '~GR27~', close: '~GR27~' } },
        { name: 'Green 28', label: 'G28', className: 'green-hl-28', trigger: { open: '~GR28~', close: '~GR28~' } },
        { name: 'Green 29', label: 'G29', className: 'green-hl-29', trigger: { open: '~GR29~', close: '~GR29~' } },
        { name: 'Green 30', label: 'G30', className: 'green-hl-30', trigger: { open: '~GR30~', close: '~GR30~' } },
        { name: 'Green 31', label: 'G31', className: 'green-hl-31', trigger: { open: '~GR31~', close: '~GR31~' } },
        { name: 'Green 32', label: 'G32', className: 'green-hl-32', trigger: { open: '~GR32~', close: '~GR32~' } },
        { name: 'Green 33', label: 'G33', className: 'green-hl-33', trigger: { open: '~GR33~', close: '~GR33~' } },
        { name: 'Green 34', label: 'G34', className: 'green-hl-34', trigger: { open: '~GR34~', close: '~GR34~' } },
        { name: 'Green 35', label: 'G35', className: 'green-hl-35', trigger: { open: '~GR35~', close: '~GR35~' } },
        { name: 'Green 36', label: 'G36', className: 'green-hl-36', trigger: { open: '~GR36~', close: '~GR36~' } },
        { name: 'Green 37', label: 'G37', className: 'green-hl-37', trigger: { open: '~GR37~', close: '~GR37~' } },
        { name: 'Green 38', label: 'G38', className: 'green-hl-38', trigger: { open: '~GR38~', close: '~GR38~' } },
        { name: 'Green 39', label: 'G39', className: 'green-hl-39', trigger: { open: '~GR39~', close: '~GR39~' } },
        { name: 'Green 40', label: 'G40', className: 'green-hl-40', trigger: { open: '~GR40~', close: '~GR40~' } },
        { name: 'Green 41', label: 'G41', className: 'green-hl-41', trigger: { open: '~GR41~', close: '~GR41~' } },
        { name: 'Green 42', label: 'G42', className: 'green-hl-42', trigger: { open: '~GR42~', close: '~GR42~' } },
        { name: 'Green 43', label: 'G43', className: 'green-hl-43', trigger: { open: '~GR43~', close: '~GR43~' } },
        { name: 'Green 44', label: 'G44', className: 'green-hl-44', trigger: { open: '~GR44~', close: '~GR44~' } },
        { name: 'Green 45', label: 'G45', className: 'green-hl-45', trigger: { open: '~GR45~', close: '~GR45~' } },
        { name: 'Green 46', label: 'G46', className: 'green-hl-46', trigger: { open: '~GR46~', close: '~GR46~' } },
        { name: 'Green 47', label: 'G47', className: 'green-hl-47', trigger: { open: '~GR47~', close: '~GR47~' } },
        { name: 'Green 48', label: 'G48', className: 'green-hl-48', trigger: { open: '~GR48~', close: '~GR48~' } },
        { name: 'Green 49', label: 'G49', className: 'green-hl-49', trigger: { open: '~GR49~', close: '~GR49~' } },
        { name: 'Green 50', label: 'G50', className: 'green-hl-50', trigger: { open: '~GR50~', close: '~GR50~' } }
      ]
    },
    {
      id: 'blue-ultrapack',
      name: 'Blue Ultrapack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'BlueUltrapack.png',
      description: 'Fifty glossy blue highlights in one install! From electric cyan to deep navy, plus gradient fusions!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="blue-hl-1">1</span><span class="blue-hl-2">2</span><span class="blue-hl-3">3</span><span class="blue-hl-4">4</span><span class="blue-hl-5">5</span><span class="blue-hl-6">6</span><span class="blue-hl-7">7</span><span class="blue-hl-8">8</span><span class="blue-hl-9">9</span><span class="blue-hl-10">10</span><span class="blue-hl-11">11</span><span class="blue-hl-12">12</span><span class="blue-hl-13">13</span><span class="blue-hl-14">14</span><span class="blue-hl-15">15</span><span class="blue-hl-16">16</span><span class="blue-hl-17">17</span><span class="blue-hl-18">18</span><span class="blue-hl-19">19</span><span class="blue-hl-20">20</span><span class="blue-hl-21">21</span><span class="blue-hl-22">22</span><span class="blue-hl-23">23</span><span class="blue-hl-24">24</span><span class="blue-hl-25">25</span><span class="blue-hl-26">26</span><span class="blue-hl-27">27</span><span class="blue-hl-28">28</span><span class="blue-hl-29">29</span><span class="blue-hl-30">30</span><span class="blue-hl-31">31</span><span class="blue-hl-32">32</span><span class="blue-hl-33">33</span><span class="blue-hl-34">34</span><span class="blue-hl-35">35</span><span class="blue-hl-36">36</span><span class="blue-hl-37">37</span><span class="blue-hl-38">38</span><span class="blue-hl-39">39</span><span class="blue-hl-40">40</span><span class="blue-hl-41">41</span><span class="blue-hl-42">42</span><span class="blue-hl-43">43</span><span class="blue-hl-44">44</span><span class="blue-hl-45">45</span><span class="blue-hl-46">46</span><span class="blue-hl-47">47</span><span class="blue-hl-48">48</span><span class="blue-hl-49">49</span><span class="blue-hl-50">50</span></div>',
      css: `.blue-hl-1,.blue-hl-2,.blue-hl-3,.blue-hl-4,.blue-hl-5,.blue-hl-6,.blue-hl-7,.blue-hl-8,.blue-hl-9,.blue-hl-10,.blue-hl-11,.blue-hl-12,.blue-hl-13,.blue-hl-14,.blue-hl-15,.blue-hl-16,.blue-hl-17,.blue-hl-18,.blue-hl-19,.blue-hl-20,.blue-hl-21,.blue-hl-22,.blue-hl-23,.blue-hl-24,.blue-hl-25,.blue-hl-26,.blue-hl-27,.blue-hl-28,.blue-hl-29,.blue-hl-30,.blue-hl-31,.blue-hl-32,.blue-hl-33,.blue-hl-34,.blue-hl-35,.blue-hl-36,.blue-hl-37,.blue-hl-38,.blue-hl-39,.blue-hl-40,.blue-hl-41,.blue-hl-42,.blue-hl-43,.blue-hl-44,.blue-hl-45,.blue-hl-46,.blue-hl-47,.blue-hl-48,.blue-hl-49,.blue-hl-50{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.blue-hl-1{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #00f0ff; border: 1.5px solid #00aec7; color: #042f38; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,240,255,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.blue-hl-2{ background: linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #14e5f4; border: 1.5px solid #0da2af; color: #032830; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(20,229,244,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.blue-hl-3{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.25) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #22d3ee; border: 1.5px solid #0891b2; color: #042533; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(34,211,238,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.blue-hl-4{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #06b6d4; border: 1.5px solid #0e7490; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(6,182,212,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-5{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0891b2; border: 1.5px solid #155e75; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 4px rgba(8,145,178,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-6{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0e7490; border: 1.5px solid #164e63; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 4px rgba(14,116,144,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-7{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #38bdf8; border: 1.5px solid #0284c7; color: #082f49; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(56,189,248,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.blue-hl-8{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0ea5e9; border: 1.5px solid #0369a1; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(14,165,233,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-9{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0284c7; border: 1.5px solid #075985; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(2,132,199,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-10{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0369a1; border: 1.5px solid #0c4a6e; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(3,105,161,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-11{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #60a5fa; border: 1.5px solid #2563eb; color: #1e1b4b; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(96,165,250,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.blue-hl-12{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #3b82f6; border: 1.5px solid #1d4ed8; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(59,130,246,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-13{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #2563eb; border: 1.5px solid #1e40af; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(37,99,235,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-14{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #1d4ed8; border: 1.5px solid #1e3a8a; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.65), 0 2px 4px rgba(29,78,216,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-15{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #1e40af; border: 1.5px solid #172554; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.55), 0 2px 4px rgba(30,64,175,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-16{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #93c5fd; border: 1.5px solid #3b82f6; color: #172554; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(147,197,253,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.blue-hl-17{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #dbeafe; border: 1.5px solid #60a5fa; color: #1e3a8a; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(219,234,254,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.blue-hl-18{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #e0f2fe; border: 1.5px solid #38bdf8; color: #0c4a6e; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(224,242,254,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.blue-hl-19{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #cffafe; border: 1.5px solid #22d3ee; color: #164e63; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(207,250,254,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.blue-hl-20{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #a5f3fc; border: 1.5px solid #06b6d4; color: #082f49; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(165,243,252,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.blue-hl-21{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #818cf8; border: 1.5px solid #4f46e5; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(129,140,248,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-22{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #6366f1; border: 1.5px solid #4338ca; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(99,102,241,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-23{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #4f46e5; border: 1.5px solid #3730a3; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 4px rgba(79,70,229,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-24{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #4338ca; border: 1.5px solid #312e81; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 4px rgba(67,56,202,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-25{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #3730a3; border: 1.5px solid #1e1b4b; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(55,48,163,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-26{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #115e59; border: 1.5px solid #042f2e; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(17,94,89,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-27{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #0f766e; border: 1.5px solid #115e59; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 4px rgba(15,118,110,0.25); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-28{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #14b8a6; border: 1.5px solid #0f766e; color: #042f2e; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(20,184,166,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.blue-hl-29{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #2dd4bf; border: 1.5px solid #14b8a6; color: #042f2e; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(45,212,191,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.5); }.blue-hl-30{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), #5eead4; border: 1.5px solid #0d9488; color: #042f2e; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(94,234,212,0.25); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.blue-hl-31{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #0061ff 0%, #60efff 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,97,255,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-32{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #0076ff 0%, #00a2ff 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,118,255,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-33{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(2,132,199,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-34{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #2563eb 0%, #60a5fa 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(37,99,235,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-35{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #0e7490 0%, #22d3ee 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(14,116,144,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-36{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 4px rgba(30,58,138,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-37{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #0369a1 0%, #00f0ff 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(3,105,161,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-38{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #4f46e5 0%, #38bdf8 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(79,70,229,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-39{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(15,118,110,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-40{ background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.15) 51%, rgba(0,0,0,0) 100%), linear-gradient(135deg, #1d4ed8 0%, #2dd4bf 100%); border: 1.5px solid rgba(255,255,255,0.6); color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(29,78,216,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-41{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #1a56db; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.6), 0 2px 4px rgba(26,86,219,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-42{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #1e40af; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(30,64,175,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-43{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #1e3a8a; border: 1.5px solid rgba(255,255,255,0.5); color: #ffffff; box-shadow: inset 0 1px 3px rgba(255,255,255,0.4), 0 2px 4px rgba(30,58,138,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-44{ background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 51%, rgba(0,0,0,0) 100%), #172554; border: 1.5px solid rgba(255,255,255,0.4); color: #93c5fd; box-shadow: inset 0 1px 3px rgba(255,255,255,0.3), 0 2px 4px rgba(23,37,84,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.6); }.blue-hl-45{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #bae6fd; border: 1.5px solid #0284c7; color: #032830; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 4px rgba(186,230,253,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.7); }.blue-hl-46{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #7dd3fc; border: 1.5px solid #0369a1; color: #082f49; box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(125,211,252,0.3); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }.blue-hl-47{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #38bdf8; border: 1.5px solid #075985; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.85), 0 2px 4px rgba(56,189,248,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-48{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #0ea5e9; border: 1.5px solid #0c4a6e; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(14,165,233,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-49{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #0284c7; border: 1.5px solid #1e3a8a; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 4px rgba(2,132,199,0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }.blue-hl-50{ background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(0,0,0,0.1) 51%, rgba(0,0,0,0) 100%), #0284c7; border: 1.5px solid #ffffff; color: #ffffff; box-shadow: inset 0 1px 2px rgba(255,255,255,1), 0 2px 6px rgba(2,132,199,0.4); text-shadow: 0 1px 1px rgba(0,0,0,0.4); }`,
      styles: [
        { name: 'Blue 1', label: 'B1', className: 'blue-hl-1', trigger: { open: '~BL1~', close: '~BL1~' } },
        { name: 'Blue 2', label: 'B2', className: 'blue-hl-2', trigger: { open: '~BL2~', close: '~BL2~' } },
        { name: 'Blue 3', label: 'B3', className: 'blue-hl-3', trigger: { open: '~BL3~', close: '~BL3~' } },
        { name: 'Blue 4', label: 'B4', className: 'blue-hl-4', trigger: { open: '~BL4~', close: '~BL4~' } },
        { name: 'Blue 5', label: 'B5', className: 'blue-hl-5', trigger: { open: '~BL5~', close: '~BL5~' } },
        { name: 'Blue 6', label: 'B6', className: 'blue-hl-6', trigger: { open: '~BL6~', close: '~BL6~' } },
        { name: 'Blue 7', label: 'B7', className: 'blue-hl-7', trigger: { open: '~BL7~', close: '~BL7~' } },
        { name: 'Blue 8', label: 'B8', className: 'blue-hl-8', trigger: { open: '~BL8~', close: '~BL8~' } },
        { name: 'Blue 9', label: 'B9', className: 'blue-hl-9', trigger: { open: '~BL9~', close: '~BL9~' } },
        { name: 'Blue 10', label: 'B10', className: 'blue-hl-10', trigger: { open: '~BL10~', close: '~BL10~' } },
        { name: 'Blue 11', label: 'B11', className: 'blue-hl-11', trigger: { open: '~BL11~', close: '~BL11~' } },
        { name: 'Blue 12', label: 'B12', className: 'blue-hl-12', trigger: { open: '~BL12~', close: '~BL12~' } },
        { name: 'Blue 13', label: 'B13', className: 'blue-hl-13', trigger: { open: '~BL13~', close: '~BL13~' } },
        { name: 'Blue 14', label: 'B14', className: 'blue-hl-14', trigger: { open: '~BL14~', close: '~BL14~' } },
        { name: 'Blue 15', label: 'B15', className: 'blue-hl-15', trigger: { open: '~BL15~', close: '~BL15~' } },
        { name: 'Blue 16', label: 'B16', className: 'blue-hl-16', trigger: { open: '~BL16~', close: '~BL16~' } },
        { name: 'Blue 17', label: 'B17', className: 'blue-hl-17', trigger: { open: '~BL17~', close: '~BL17~' } },
        { name: 'Blue 18', label: 'B18', className: 'blue-hl-18', trigger: { open: '~BL18~', close: '~BL18~' } },
        { name: 'Blue 19', label: 'B19', className: 'blue-hl-19', trigger: { open: '~BL19~', close: '~BL19~' } },
        { name: 'Blue 20', label: 'B20', className: 'blue-hl-20', trigger: { open: '~BL20~', close: '~BL20~' } },
        { name: 'Blue 21', label: 'B21', className: 'blue-hl-21', trigger: { open: '~BL21~', close: '~BL21~' } },
        { name: 'Blue 22', label: 'B22', className: 'blue-hl-22', trigger: { open: '~BL22~', close: '~BL22~' } },
        { name: 'Blue 23', label: 'B23', className: 'blue-hl-23', trigger: { open: '~BL23~', close: '~BL23~' } },
        { name: 'Blue 24', label: 'B24', className: 'blue-hl-24', trigger: { open: '~BL24~', close: '~BL24~' } },
        { name: 'Blue 25', label: 'B25', className: 'blue-hl-25', trigger: { open: '~BL25~', close: '~BL25~' } },
        { name: 'Blue 26', label: 'B26', className: 'blue-hl-26', trigger: { open: '~BL26~', close: '~BL26~' } },
        { name: 'Blue 27', label: 'B27', className: 'blue-hl-27', trigger: { open: '~BL27~', close: '~BL27~' } },
        { name: 'Blue 28', label: 'B28', className: 'blue-hl-28', trigger: { open: '~BL28~', close: '~BL28~' } },
        { name: 'Blue 29', label: 'B29', className: 'blue-hl-29', trigger: { open: '~BL29~', close: '~BL29~' } },
        { name: 'Blue 30', label: 'B30', className: 'blue-hl-30', trigger: { open: '~BL30~', close: '~BL30~' } },
        { name: 'Blue 31', label: 'B31', className: 'blue-hl-31', trigger: { open: '~BL31~', close: '~BL31~' } },
        { name: 'Blue 32', label: 'B32', className: 'blue-hl-32', trigger: { open: '~BL32~', close: '~BL32~' } },
        { name: 'Blue 33', label: 'B33', className: 'blue-hl-33', trigger: { open: '~BL33~', close: '~BL33~' } },
        { name: 'Blue 34', label: 'B34', className: 'blue-hl-34', trigger: { open: '~BL34~', close: '~BL34~' } },
        { name: 'Blue 35', label: 'B35', className: 'blue-hl-35', trigger: { open: '~BL35~', close: '~BL35~' } },
        { name: 'Blue 36', label: 'B36', className: 'blue-hl-36', trigger: { open: '~BL36~', close: '~BL36~' } },
        { name: 'Blue 37', label: 'B37', className: 'blue-hl-37', trigger: { open: '~BL37~', close: '~BL37~' } },
        { name: 'Blue 38', label: 'B38', className: 'blue-hl-38', trigger: { open: '~BL38~', close: '~BL38~' } },
        { name: 'Blue 39', label: 'B39', className: 'blue-hl-39', trigger: { open: '~BL39~', close: '~BL39~' } },
        { name: 'Blue 40', label: 'B40', className: 'blue-hl-40', trigger: { open: '~BL40~', close: '~BL40~' } },
        { name: 'Blue 41', label: 'B41', className: 'blue-hl-41', trigger: { open: '~BL41~', close: '~BL41~' } },
        { name: 'Blue 42', label: 'B42', className: 'blue-hl-42', trigger: { open: '~BL42~', close: '~BL42~' } },
        { name: 'Blue 43', label: 'B43', className: 'blue-hl-43', trigger: { open: '~BL43~', close: '~BL43~' } },
        { name: 'Blue 44', label: 'B44', className: 'blue-hl-44', trigger: { open: '~BL44~', close: '~BL44~' } },
        { name: 'Blue 45', label: 'B45', className: 'blue-hl-45', trigger: { open: '~BL45~', close: '~BL45~' } },
        { name: 'Blue 46', label: 'B46', className: 'blue-hl-46', trigger: { open: '~BL46~', close: '~BL46~' } },
        { name: 'Blue 47', label: 'B47', className: 'blue-hl-47', trigger: { open: '~BL47~', close: '~BL47~' } },
        { name: 'Blue 48', label: 'B48', className: 'blue-hl-48', trigger: { open: '~BL48~', close: '~BL48~' } },
        { name: 'Blue 49', label: 'B49', className: 'blue-hl-49', trigger: { open: '~BL49~', close: '~BL49~' } },
        { name: 'Blue 50', label: 'B50', className: 'blue-hl-50', trigger: { open: '~BL50~', close: '~BL50~' } }
      ]
    },
    {
      id: 'poolside-ultrapack',
      name: 'Poolside Ultrapack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.2.0',
      image: 'PoolsideUltrapack.png',
      description: 'Fifty one-of-a-kind pool chips! Rings, scales, sails, stripes, seals and splashes — no two alike!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="pool-hl-1">1</span><span class="pool-hl-2">2</span><span class="pool-hl-3">3</span><span class="pool-hl-4">4</span><span class="pool-hl-5">5</span><span class="pool-hl-6">6</span><span class="pool-hl-7">7</span><span class="pool-hl-8">8</span><span class="pool-hl-9">9</span><span class="pool-hl-10">10</span><span class="pool-hl-11">11</span><span class="pool-hl-12">12</span><span class="pool-hl-13">13</span><span class="pool-hl-14">14</span><span class="pool-hl-15">15</span><span class="pool-hl-16">16</span><span class="pool-hl-17">17</span><span class="pool-hl-18">18</span><span class="pool-hl-19">19</span><span class="pool-hl-20">20</span><span class="pool-hl-21">21</span><span class="pool-hl-22">22</span><span class="pool-hl-23">23</span><span class="pool-hl-24">24</span><span class="pool-hl-25">25</span><span class="pool-hl-26">26</span><span class="pool-hl-27">27</span><span class="pool-hl-28">28</span><span class="pool-hl-29">29</span><span class="pool-hl-30">30</span><span class="pool-hl-31">31</span><span class="pool-hl-32">32</span><span class="pool-hl-33">33</span><span class="pool-hl-34">34</span><span class="pool-hl-35">35</span><span class="pool-hl-36">36</span><span class="pool-hl-37">37</span><span class="pool-hl-38">38</span><span class="pool-hl-39">39</span><span class="pool-hl-40">40</span><span class="pool-hl-41">41</span><span class="pool-hl-42">42</span><span class="pool-hl-43">43</span><span class="pool-hl-44">44</span><span class="pool-hl-45">45</span><span class="pool-hl-46">46</span><span class="pool-hl-47">47</span><span class="pool-hl-48">48</span><span class="pool-hl-49">49</span><span class="pool-hl-50">50</span></div>',
      css: `.pool-hl-1,.pool-hl-2,.pool-hl-3,.pool-hl-4,.pool-hl-5,.pool-hl-6,.pool-hl-7,.pool-hl-8,.pool-hl-9,.pool-hl-10,.pool-hl-11,.pool-hl-12,.pool-hl-13,.pool-hl-14,.pool-hl-15,.pool-hl-16,.pool-hl-17,.pool-hl-18,.pool-hl-19,.pool-hl-20,.pool-hl-21,.pool-hl-22,.pool-hl-23,.pool-hl-24,.pool-hl-25,.pool-hl-26,.pool-hl-27,.pool-hl-28,.pool-hl-29,.pool-hl-30,.pool-hl-31,.pool-hl-32,.pool-hl-33,.pool-hl-34,.pool-hl-35,.pool-hl-36,.pool-hl-37,.pool-hl-38,.pool-hl-39,.pool-hl-40,.pool-hl-41,.pool-hl-42,.pool-hl-43,.pool-hl-44,.pool-hl-45,.pool-hl-46,.pool-hl-47,.pool-hl-48,.pool-hl-49,.pool-hl-50{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:12px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.pool-hl-1{background:rgba(255,237,213,0.45);border:2px solid #fb923c;outline:1px solid #fdba74;outline-offset:2px;color:#9a3412;border-radius:6px;}.pool-hl-2{background:linear-gradient(180deg,rgba(255,255,255,0.65) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#fdba74 0%,#ea580c 100%);border:2px solid #9a3412;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:10px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7);}.pool-hl-3{background:rgba(236,254,255,0.5);border:2px solid #22d3ee;color:#0e7490;border-radius:12px;box-shadow:0 0 10px rgba(34,211,238,0.55),inset 0 0 8px rgba(34,211,238,0.2);}.pool-hl-4{background:linear-gradient(90deg,#fb923c 0%,#fb923c 33%,#fff7ed 33%,#fff7ed 66%,#22d3ee 66%,#22d3ee 100%);border:2px solid #0e7490;color:#7c2d12;border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7);}.pool-hl-5{background:linear-gradient(180deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#7dd3fc 0%,#0284c7 60%,#0c4a6e 100%);border:2px solid #082f49;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:12px;}.pool-hl-6{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#fde047 0%,#f59e0b 100%);border:2px solid #a16207;color:#713f12;border-radius:999px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8);}.pool-hl-7{background:radial-gradient(circle at 78% 30%,#f8fafc 0%,#f8fafc 4%,rgba(248,250,252,0) 5%),radial-gradient(circle at 20% 60%,#ffffff 0%,#ffffff 1.2%,rgba(255,255,255,0) 2%),radial-gradient(circle at 55% 75%,#ffffff 0%,#ffffff 1.2%,rgba(255,255,255,0) 2%),linear-gradient(180deg,#0c2a4a 0%,#020617 100%);border:2px solid #38bdf8;color:#e0f2ff;border-radius:16px;box-shadow:0 0 12px rgba(56,189,248,0.4);}.pool-hl-8{background:radial-gradient(circle at 30% 25%,#ffffff 0%,#f0fdfa 45%,#5eead4 100%);border:2px solid #0f766e;color:#134e4a;border-radius:20px;box-shadow:inset 0 1px 2px #fff;}.pool-hl-9{background:repeating-linear-gradient(45deg,#14b8a6 0px,#14b8a6 10px,#f0fdfa 10px,#f0fdfa 20px);border:2px solid #0f766e;color:#042f2e;border-radius:8px;text-shadow:0 1px 0 rgba(255,255,255,0.6);}.pool-hl-10{background:linear-gradient(100deg,#fb923c 0%,#fcd34d 45%,#22d3ee 100%);border:2px solid #0e7490;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:14px;}.pool-hl-11{background:radial-gradient(circle at 50% 50%,#fff7ed 0%,#fff7ed 26%,#ea580c 26%,#ea580c 40%,#fff7ed 40%);border:2px solid #9a3412;color:#7c2d12;border-radius:999px;}.pool-hl-12{background:radial-gradient(circle at 8px 8px,rgba(120,53,15,0.5) 1.5px,rgba(120,53,15,0) 2px) 0 0/16px 16px,radial-gradient(circle at 50% 40%,#fef3c7 0%,#e7c084 70%,#b45309 100%);border:2px solid #92400e;color:#451a03;border-radius:999px;}.pool-hl-13{background:radial-gradient(circle at 70% 70%,rgba(255,255,255,0.6) 0%,rgba(255,255,255,0) 35%),linear-gradient(180deg,#fb7185 0%,#e11d48 100%);border:2px solid #881337;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:30px 30px 30px 6px;}.pool-hl-14{background:repeating-radial-gradient(circle at 50% 120%,#ffe4e6 0px,#ffe4e6 5px,#fda4af 5px,#fda4af 7px);border:2px solid #be123c;color:#881337;border-radius:18px;}.pool-hl-15{background:repeating-linear-gradient(90deg,#f0f9ff 0px,#f0f9ff 8px,rgba(240,249,255,0) 8px,rgba(240,249,255,0) 16px) 0 50%/100% 4px no-repeat,linear-gradient(180deg,#38bdf8 0%,#075985 100%);border:2px solid #082f49;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:8px;}.pool-hl-16{background:radial-gradient(circle at 18% 80%,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0.9) 3px,rgba(255,255,255,0) 4px),radial-gradient(circle at 14% 55%,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0.9) 2px,rgba(255,255,255,0) 3px),radial-gradient(circle at 20% 30%,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0.9) 2px,rgba(255,255,255,0) 3px),linear-gradient(180deg,#075985 0%,#082f49 100%);border:2px solid #38bdf8;color:#e0f2ff;border-radius:14px;}.pool-hl-17{background:radial-gradient(circle at 50% 60%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0.95) 18%,rgba(255,255,255,0) 32%),linear-gradient(180deg,#0ea5e9 0%,#0c4a6e 100%);border:2px solid #082f49;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:999px;}.pool-hl-18{background:#0891b2;border:2px solid #164e63;color:#ecfeff;border-radius:10px;text-shadow:2px 0 0 rgba(165,243,252,0.7),4px 0 0 rgba(165,243,252,0.35);}.pool-hl-19{background:radial-gradient(circle at 115% 50%,rgba(12,74,110,0.55) 0%,rgba(12,74,110,0.55) 22%,rgba(12,74,110,0) 30%),linear-gradient(180deg,#fde047 0%,#eab308 100%);border:2px solid #854d0e;color:#451a03;border-radius:999px;}.pool-hl-20{background:linear-gradient(180deg,#ffffff 0px,#ffffff 5px,rgba(255,255,255,0) 5px),linear-gradient(180deg,#67e8f9 0%,#0284c7 100%);border:2px solid #0c4a6e;color:#f0f9ff;border-radius:8px 8px 12px 12px;}.pool-hl-21{background:repeating-linear-gradient(45deg,rgba(255,255,255,0.5) 0px,rgba(255,255,255,0.5) 1px,rgba(255,255,255,0) 1px,rgba(255,255,255,0) 7px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.5) 0px,rgba(255,255,255,0.5) 1px,rgba(255,255,255,0) 1px,rgba(255,255,255,0) 7px),linear-gradient(180deg,#cffafe 0%,#22d3ee 100%);border:2px solid #0e7490;color:#164e63;border-radius:10px;}.pool-hl-22{background:linear-gradient(90deg,#ea580c 0px,#ea580c 14px,rgba(234,88,12,0) 14px),linear-gradient(180deg,#ffffff 0%,#f1f5f9 100%);border:2px solid #c2410c;color:#7c2d12;border-radius:12px;}.pool-hl-23{background:linear-gradient(90deg,#14b8a6 0px,#14b8a6 22px,#f0fdfa 22px,#f0fdfa 44px);border:2px solid #0f766e;color:#042f2e;border-radius:6px;text-shadow:0 1px 0 rgba(255,255,255,0.6);}.pool-hl-24{background:linear-gradient(180deg,#0284c7 0px,#0284c7 9px,rgba(2,132,199,0) 9px),linear-gradient(180deg,#f0f9ff 0%,#bae6fd 100%);border:2px solid #075985;color:#0c4a6e;border-radius:12px;}.pool-hl-25{background:linear-gradient(180deg,#fb923c 0px,#fb923c 50%,#fff7ed 50%,#fff7ed 100%);border:2px solid #9a3412;color:#7c2d12;border-radius:16px 16px 20px 20px;}.pool-hl-26{background:repeating-linear-gradient(0deg,rgba(69,26,3,0.45) 0px,rgba(69,26,3,0.45) 2px,rgba(69,26,3,0) 2px,rgba(69,26,3,0) 9px),linear-gradient(180deg,#e7c084 0%,#b45309 100%);border:2px solid #451a03;color:#fffbeb;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:6px;}.pool-hl-27{background:repeating-linear-gradient(90deg,rgba(28,10,0,0.75) 0px,rgba(28,10,0,0.75) 10px,rgba(28,10,0,0) 10px,rgba(28,10,0,0) 34px),linear-gradient(180deg,#fdba74 0%,#c2410c 70%,#7c2d12 100%);border:2px solid #451a03;color:#fff7ed;text-shadow:0 1px 2px rgba(0,0,0,0.5);border-radius:8px;}.pool-hl-28{background:linear-gradient(135deg,#ffffff 0%,#ffffff 52%,#0891b2 52%,#0891b2 100%);border:2px solid #164e63;color:#0c4a6e;border-radius:4px;}.pool-hl-29{background:radial-gradient(circle at 12px 7px,#fbbf24 0%,#fbbf24 3px,rgba(251,191,36,0) 4px) 0 0/26px 12px repeat-x,linear-gradient(180deg,#14324a 0%,#0a1c30 100%);border:2px solid #fbbf24;color:#fef3c7;border-radius:10px;}.pool-hl-30{background:#0f2c4d;border:3px dashed #d9a441;color:#fde68a;border-radius:14px;}.pool-hl-31{background:linear-gradient(90deg,#f0f9ff 0px,#f0f9ff 16px,#1e3a8a 16px,#1e3a8a 32px);border:2px solid #172554;color:#dbeafe;border-radius:6px;text-shadow:0 1px 2px rgba(0,0,0,0.5);}.pool-hl-32{background:repeating-linear-gradient(0deg,rgba(146,64,14,0.4) 0px,rgba(146,64,14,0.4) 1px,rgba(146,64,14,0) 1px,rgba(146,64,14,0) 6px),linear-gradient(180deg,#fde68a 0%,#d9a441 100%);border:2px solid #92400e;color:#451a03;border-radius:18px;}.pool-hl-33{background:repeating-linear-gradient(30deg,rgba(69,26,3,0.3) 0px,rgba(69,26,3,0.3) 1px,rgba(69,26,3,0) 1px,rgba(69,26,3,0) 8px),repeating-linear-gradient(-30deg,rgba(69,26,3,0.3) 0px,rgba(69,26,3,0.3) 1px,rgba(69,26,3,0) 1px,rgba(69,26,3,0) 8px),linear-gradient(180deg,#fef3c7 0%,#e7c084 100%);border:2px solid #92400e;color:#451a03;border-radius:12px;}.pool-hl-34{background:#cffafe;border:5px solid #fb923c;color:#9a3412;border-radius:999px;}.pool-hl-35{background:linear-gradient(180deg,#f0fdfa 0%,#5eead4 45%,#0f766e 100%);border:2px solid #134e4a;color:#042f2e;border-radius:999px;}.pool-hl-36{background:linear-gradient(90deg,#14b8a6 0px,#14b8a6 18%,#062a33 18%,#062a33 82%,#14b8a6 82%);border:2px solid #042f2e;color:#f0fdfa;border-radius:999px;text-shadow:0 1px 2px rgba(0,0,0,0.5);}.pool-hl-37{background:linear-gradient(115deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 38%,rgba(255,255,255,0.85) 46%,rgba(255,255,255,0.85) 54%,rgba(255,255,255,0) 62%),linear-gradient(180deg,#5eead4 0%,#0f766e 100%);border:2px solid #134e4a;color:#042f2e;border-radius:12px;}.pool-hl-38{background:radial-gradient(circle at 10px 10px,rgba(8,47,73,0.55) 2px,rgba(8,47,73,0) 2.6px) 0 0/20px 20px,linear-gradient(180deg,#7dd3fc 0%,#0284c7 100%);border:2px solid #0c4a6e;color:#f0f9ff;border-radius:16px;}.pool-hl-39{background:linear-gradient(180deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0) 45%),linear-gradient(180deg,#2dd4bf 0%,#115e59 100%);border:2px solid #042f2e;color:#f0fdfa;border-radius:4px 20px 20px 20px;}.pool-hl-40{background:linear-gradient(135deg,#fde68a 0%,#fde68a 55%,#0891b2 55%,#0891b2 100%);border:2px solid #92400e;color:#451a03;border-radius:10px;}.pool-hl-41{background:repeating-linear-gradient(60deg,rgba(255,255,255,0.55) 0px,rgba(255,255,255,0.55) 2px,rgba(255,255,255,0) 2px,rgba(255,255,255,0) 9px),linear-gradient(180deg,#fda4af 0%,#e11d48 100%);border:2px solid #881337;color:#fff1f2;border-radius:18px 18px 18px 4px;}.pool-hl-42{background:linear-gradient(115deg,#fecdd3 0%,#fff7ed 35%,#a5f3fc 70%,#fbcfe8 100%);border:2px solid #9d6b7a;color:#581c3a;border-radius:20px;}.pool-hl-43{background:radial-gradient(circle at 35% 30%,#ffffff 0%,#e2e8f0 55%,#94a3b8 100%);border:2px solid #cbd5e1;color:#334155;border-radius:999px;box-shadow:inset 0 1px 2px #fff,0 2px 5px rgba(100,116,139,0.4);}.pool-hl-44{background:repeating-linear-gradient(0deg,rgba(87,83,78,0.5) 0px,rgba(87,83,78,0.5) 1px,rgba(87,83,78,0) 1px,rgba(87,83,78,0) 5px),linear-gradient(180deg,#d6c9b4 0%,#a89a83 100%);border:2px solid #57534e;color:#292524;border-radius:8px;}.pool-hl-45{background:linear-gradient(160deg,rgba(240,253,250,0.75) 0%,rgba(153,246,228,0.65) 100%);border:1px solid rgba(255,255,255,0.9);color:#0f766e;border-radius:14px;box-shadow:0 0 10px rgba(153,246,228,0.5),inset 0 1px 0 rgba(255,255,255,0.8);}.pool-hl-46{background:linear-gradient(90deg,#92400e 0px,#92400e 12px,rgba(146,64,14,0) 12px),linear-gradient(180deg,#fef3c7 0%,#e7c084 100%);border:2px solid #451a03;color:#451a03;border-radius:10px;}.pool-hl-47{background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 38%,rgba(255,255,255,0.9) 46%,rgba(255,255,255,0.9) 54%,rgba(255,255,255,0) 62%),linear-gradient(180deg,#fde047 0%,#a16207 100%);border:2px solid #451a03;color:#451a03;border-radius:10px;text-shadow:0 1px 0 rgba(255,255,255,0.6);}.pool-hl-48{background:radial-gradient(circle at 12px 100%,rgba(6,42,51,0.6) 9px,rgba(6,42,51,0) 10px) 0 0/24px 14px repeat-x,radial-gradient(circle at 24px 100%,rgba(6,42,51,0.6) 9px,rgba(6,42,51,0) 10px) 0 0/24px 14px repeat-x,linear-gradient(180deg,#5eead4 0%,#0e7490 100%);border:2px solid #164e63;color:#ecfeff;border-radius:12px;}.pool-hl-49{background:linear-gradient(180deg,#94a3b8 0%,#94a3b8 62%,#f1f5f9 62%,#f1f5f9 100%);border:2px solid #334155;color:#0f172a;border-radius:16px 16px 20px 20px;}.pool-hl-50{background:linear-gradient(90deg,#fb923c 0px,#fb923c 18px,#fff7ed 18px,#fff7ed 36px);border:2px solid #172554;color:#7c2d12;border-radius:6px;}`,
      styles: [
        { name: 'Sunrise Frame', label: 'U1', className: 'pool-hl-1', trigger: { open: '~PU1~', close: '~PU1~' } },
        { name: 'Sunset Gel', label: 'U2', className: 'pool-hl-2', trigger: { open: '~PU2~', close: '~PU2~' } },
        { name: 'Chlorine Neon', label: 'U3', className: 'pool-hl-3', trigger: { open: '~PU3~', close: '~PU3~' } },
        { name: 'Beach Bands', label: 'U4', className: 'pool-hl-4', trigger: { open: '~PU4~', close: '~PU4~' } },
        { name: 'Breaker Wave', label: 'U5', className: 'pool-hl-5', trigger: { open: '~PU5~', close: '~PU5~' } },
        { name: 'Sun Pill', label: 'U6', className: 'pool-hl-6', trigger: { open: '~PU6~', close: '~PU6~' } },
        { name: 'Moonlit Abyss', label: 'U7', className: 'pool-hl-7', trigger: { open: '~PU7~', close: '~PU7~' } },
        { name: 'Sea Foam', label: 'U8', className: 'pool-hl-8', trigger: { open: '~PU8~', close: '~PU8~' } },
        { name: 'Cabana Stripes', label: 'U9', className: 'pool-hl-9', trigger: { open: '~PU9~', close: '~PU9~' } },
        { name: 'Tideline Fusion', label: 'U10', className: 'pool-hl-10', trigger: { open: '~PU10~', close: '~PU10~' } },
        { name: 'Lifebuoy Ring', label: 'U11', className: 'pool-hl-11', trigger: { open: '~PU11~', close: '~PU11~' } },
        { name: 'Sand Dollar', label: 'U12', className: 'pool-hl-12', trigger: { open: '~PU12~', close: '~PU12~' } },
        { name: 'Starfish Point', label: 'U13', className: 'pool-hl-13', trigger: { open: '~PU13~', close: '~PU13~' } },
        { name: 'Shell Rings', label: 'U14', className: 'pool-hl-14', trigger: { open: '~PU14~', close: '~PU14~' } },
        { name: 'Lap Lane', label: 'U15', className: 'pool-hl-15', trigger: { open: '~PU15~', close: '~PU15~' } },
        { name: 'Dive Bubbles', label: 'U16', className: 'pool-hl-16', trigger: { open: '~PU16~', close: '~PU16~' } },
        { name: 'Cannonball Splash', label: 'U17', className: 'pool-hl-17', trigger: { open: '~PU17~', close: '~PU17~' } },
        { name: 'Marco Echo', label: 'U18', className: 'pool-hl-18', trigger: { open: '~PU18~', close: '~PU18~' } },
        { name: 'Polo Seam', label: 'U19', className: 'pool-hl-19', trigger: { open: '~PU19~', close: '~PU19~' } },
        { name: 'Gutter Lip', label: 'U20', className: 'pool-hl-20', trigger: { open: '~PU20~', close: '~PU20~' } },
        { name: 'Skimmer Mesh', label: 'U21', className: 'pool-hl-21', trigger: { open: '~PU21~', close: '~PU21~' } },
        { name: 'Sunscreen Squeeze', label: 'U22', className: 'pool-hl-22', trigger: { open: '~PU22~', close: '~PU22~' } },
        { name: 'Towel Cabana', label: 'U23', className: 'pool-hl-23', trigger: { open: '~PU23~', close: '~PU23~' } },
        { name: 'Cooler Lid', label: 'U24', className: 'pool-hl-24', trigger: { open: '~PU24~', close: '~PU24~' } },
        { name: 'Ice Pop Split', label: 'U25', className: 'pool-hl-25', trigger: { open: '~PU25~', close: '~PU25~' } },
        { name: 'Boardwalk Planks', label: 'U26', className: 'pool-hl-26', trigger: { open: '~PU26~', close: '~PU26~' } },
        { name: 'Pier Silhouette', label: 'U27', className: 'pool-hl-27', trigger: { open: '~PU27~', close: '~PU27~' } },
        { name: 'Sailcloth', label: 'U28', className: 'pool-hl-28', trigger: { open: '~PU28~', close: '~PU28~' } },
        { name: 'Regatta Dots', label: 'U29', className: 'pool-hl-29', trigger: { open: '~PU29~', close: '~PU29~' } },
        { name: 'Harbor Rope', label: 'U30', className: 'pool-hl-30', trigger: { open: '~PU30~', close: '~PU30~' } },
        { name: 'Beacon Stripes', label: 'U31', className: 'pool-hl-31', trigger: { open: '~PU31~', close: '~PU31~' } },
        { name: 'Sandbar Ripple', label: 'U32', className: 'pool-hl-32', trigger: { open: '~PU32~', close: '~PU32~' } },
        { name: 'Dune Cross', label: 'U33', className: 'pool-hl-33', trigger: { open: '~PU33~', close: '~PU33~' } },
        { name: 'Floatie Ring', label: 'U34', className: 'pool-hl-34', trigger: { open: '~PU34~', close: '~PU34~' } },
        { name: 'Noodle Roll', label: 'U35', className: 'pool-hl-35', trigger: { open: '~PU35~', close: '~PU35~' } },
        { name: 'Goggle Lens', label: 'U36', className: 'pool-hl-36', trigger: { open: '~PU36~', close: '~PU36~' } },
        { name: 'Swim Sheen', label: 'U37', className: 'pool-hl-37', trigger: { open: '~PU37~', close: '~PU37~' } },
        { name: 'Kickboard Grip', label: 'U38', className: 'pool-hl-38', trigger: { open: '~PU38~', close: '~PU38~' } },
        { name: 'Fin Kick', label: 'U39', className: 'pool-hl-39', trigger: { open: '~PU39~', close: '~PU39~' } },
        { name: 'Shoreline', label: 'U40', className: 'pool-hl-40', trigger: { open: '~PU40~', close: '~PU40~' } },
        { name: 'Seashell Rays', label: 'U41', className: 'pool-hl-41', trigger: { open: '~PU41~', close: '~PU41~' } },
        { name: 'Conch Lustre', label: 'U42', className: 'pool-hl-42', trigger: { open: '~PU42~', close: '~PU42~' } },
        { name: 'Pearl Drop', label: 'U43', className: 'pool-hl-43', trigger: { open: '~PU43~', close: '~PU43~' } },
        { name: 'Driftwood Grain', label: 'U44', className: 'pool-hl-44', trigger: { open: '~PU44~', close: '~PU44~' } },
        { name: 'Sea Glass', label: 'U45', className: 'pool-hl-45', trigger: { open: '~PU45~', close: '~PU45~' } },
        { name: 'Message Bottle', label: 'U46', className: 'pool-hl-46', trigger: { open: '~PU46~', close: '~PU46~' } },
        { name: 'Treasure Gold', label: 'U47', className: 'pool-hl-47', trigger: { open: '~PU47~', close: '~PU47~' } },
        { name: 'Mermaid Scales', label: 'U48', className: 'pool-hl-48', trigger: { open: '~PU48~', close: '~PU48~' } },
        { name: 'Grayfin', label: 'U49', className: 'pool-hl-49', trigger: { open: '~PU49~', close: '~PU49~' } },
        { name: 'Tower Stripes', label: 'U50', className: 'pool-hl-50', trigger: { open: '~PU50~', close: '~PU50~' } },
      ]
    },
    {
      id: 'chip-pack',
      name: 'Dark Gel Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'DarkGelChipPack.png',
      description: 'Sixteen midnight neon chips sharing one dark pill design — nothing else looks like these!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;background:#0f172a;border-radius:10px;padding:8px;"><span class="mkt-cp-red">R</span><span class="mkt-cp-orange">O</span><span class="mkt-cp-amber">A</span><span class="mkt-cp-yellow">Y</span><span class="mkt-cp-lime">L</span><span class="mkt-cp-green">G</span><span class="mkt-cp-emerald">E</span><span class="mkt-cp-teal">T</span><span class="mkt-cp-cyan">C</span><span class="mkt-cp-sky">S</span><span class="mkt-cp-blue">B</span><span class="mkt-cp-indigo">I</span><span class="mkt-cp-violet">V</span><span class="mkt-cp-fuchsia">F</span><span class="mkt-cp-pink">P</span><span class="mkt-cp-slate">Sl</span></div>',
      css: `.mkt-cp-red,.mkt-cp-orange,.mkt-cp-amber,.mkt-cp-yellow,.mkt-cp-lime,.mkt-cp-green,.mkt-cp-emerald,.mkt-cp-teal,.mkt-cp-cyan,.mkt-cp-sky,.mkt-cp-blue,.mkt-cp-indigo,.mkt-cp-violet,.mkt-cp-fuchsia,.mkt-cp-pink,.mkt-cp-slate{display:inline-flex!important;align-items:center;padding:2px 12px;border-radius:20px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.mkt-cp-red{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #f87171;color:#fecaca;box-shadow:0 0 10px rgba(248,113,113,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-orange{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #fb923c;color:#fed7aa;box-shadow:0 0 10px rgba(251,146,60,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-amber{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #fbbf24;color:#fde68a;box-shadow:0 0 10px rgba(251,191,36,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-yellow{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #fde047;color:#fef08a;box-shadow:0 0 10px rgba(253,224,71,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-lime{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #a3e635;color:#d9f99d;box-shadow:0 0 10px rgba(163,230,53,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-green{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #4ade80;color:#bbf7d0;box-shadow:0 0 10px rgba(74,222,128,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-emerald{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #34d399;color:#a7f3d0;box-shadow:0 0 10px rgba(52,211,153,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-teal{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #2dd4bf;color:#99f6e4;box-shadow:0 0 10px rgba(45,212,191,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-cyan{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #67e8f9;color:#cffafe;box-shadow:0 0 10px rgba(103,232,249,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-sky{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #7dd3fc;color:#e0f2fe;box-shadow:0 0 10px rgba(125,211,252,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-blue{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #93c5fd;color:#dbeafe;box-shadow:0 0 10px rgba(147,197,253,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-indigo{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #a5b4fc;color:#e0e7ff;box-shadow:0 0 10px rgba(165,180,252,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-violet{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #c4b5fd;color:#ede9fe;box-shadow:0 0 10px rgba(196,181,253,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-fuchsia{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #f0abfc;color:#fae8ff;box-shadow:0 0 10px rgba(240,171,252,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-pink{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #f9a8d4;color:#fce7f3;box-shadow:0 0 10px rgba(249,168,212,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-cp-slate{background:linear-gradient(180deg,#334155 0%,#0f172a 100%);border:2px solid #94a3b8;color:#e2e8f0;box-shadow:0 0 10px rgba(148,163,184,0.45),inset 0 1px 1px rgba(255,255,255,0.15);}`,
      styles: [
        { name: 'Chip Red', label: 'CR', className: 'mkt-cp-red', trigger: { open: '~CPR~', close: '~CPR~' } },
        { name: 'Chip Orange', label: 'CO', className: 'mkt-cp-orange', trigger: { open: '~CPO~', close: '~CPO~' } },
        { name: 'Chip Amber', label: 'AM', className: 'mkt-cp-amber', trigger: { open: '~CPA~', close: '~CPA~' } },
        { name: 'Chip Yellow', label: 'CY', className: 'mkt-cp-yellow', trigger: { open: '~CPY~', close: '~CPY~' } },
        { name: 'Chip Lime', label: 'CL', className: 'mkt-cp-lime', trigger: { open: '~CPL~', close: '~CPL~' } },
        { name: 'Chip Green', label: 'CG', className: 'mkt-cp-green', trigger: { open: '~CPG~', close: '~CPG~' } },
        { name: 'Chip Emerald', label: 'CE', className: 'mkt-cp-emerald', trigger: { open: '~CPE~', close: '~CPE~' } },
        { name: 'Chip Teal', label: 'CT', className: 'mkt-cp-teal', trigger: { open: '~CPT~', close: '~CPT~' } },
        { name: 'Chip Cyan', label: 'CN', className: 'mkt-cp-cyan', trigger: { open: '~CPC~', close: '~CPC~' } },
        { name: 'Chip Sky', label: 'CS', className: 'mkt-cp-sky', trigger: { open: '~CPS~', close: '~CPS~' } },
        { name: 'Chip Blue', label: 'CB', className: 'mkt-cp-blue', trigger: { open: '~CPB~', close: '~CPB~' } },
        { name: 'Chip Indigo', label: 'CI', className: 'mkt-cp-indigo', trigger: { open: '~CPI~', close: '~CPI~' } },
        { name: 'Chip Violet', label: 'CV', className: 'mkt-cp-violet', trigger: { open: '~CPV~', close: '~CPV~' } },
        { name: 'Chip Fuchsia', label: 'CF', className: 'mkt-cp-fuchsia', trigger: { open: '~CPF~', close: '~CPF~' } },
        { name: 'Chip Pink', label: 'CP', className: 'mkt-cp-pink', trigger: { open: '~CPP~', close: '~CPP~' } },
        { name: 'Chip Slate', label: 'Cq', className: 'mkt-cp-slate', trigger: { open: '~CPQ~', close: '~CPQ~' } }
      ]
    },
    {
      id: 'blue-chip-pack',
      name: 'Blue Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'BlueChipPack.png',
      description: 'Ten glossy blue highlight chips in ten shades — plus the wild Tideframe and Dotted outliers!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="bcp-tide">Tide</span><span class="bcp-highlighter">High</span><span class="bcp-bevel">Deep</span><span class="bcp-stitch">Light</span><span class="bcp-scan">Bright</span><span class="bcp-hatch">Ocean</span><span class="bcp-emboss">Sea</span><span class="bcp-halo">Sky</span><span class="bcp-dots">Dots</span><span class="bcp-marker">Ice</span></div>',
      css: `.bcp-tide{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:6px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:rgba(224,242,254,0.35);border:2px solid #0284c7;outline:1px solid #7dd3fc;outline-offset:2px;color:#0c4a6e;}.bcp-highlighter{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#3b82f6;border:2px solid #1d4ed8;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 4px rgba(37,99,235,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.bcp-bevel{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#1d4ed8;border:2px solid #1e3a8a;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 4px rgba(29,78,216,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.bcp-stitch{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#93c5fd;border:2px solid #3b82f6;color:#172554;box-shadow:inset 0 1px 2px rgba(255,255,255,0.9),0 2px 4px rgba(147,197,253,0.35);text-shadow:0 1px 0 rgba(255,255,255,0.6);}.bcp-scan{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#0ea5e9;border:2px solid #0369a1;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 4px rgba(14,165,233,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.bcp-hatch{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#0284c7;border:2px solid #075985;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 4px rgba(2,132,199,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.bcp-emboss{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#0369a1;border:2px solid #0c4a6e;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 4px rgba(3,105,161,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.bcp-halo{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#38bdf8;border:2px solid #0284c7;color:#082f49;box-shadow:inset 0 1px 2px rgba(255,255,255,0.9),0 2px 4px rgba(56,189,248,0.35);text-shadow:0 1px 0 rgba(255,255,255,0.5);}.bcp-dots{display:inline-flex!important;align-items:center;padding:3px 12px;border-radius:14px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background-color:#eff6ff;background-image:radial-gradient(#93c5fd 1.5px,transparent 1.6px);background-size:12px 12px;border:3px dotted #2563eb;color:#1e40af;}.bcp-marker{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:10px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0.2) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#7dd3fc;border:2px solid #0284c7;color:#0c4a6e;box-shadow:inset 0 1px 2px rgba(255,255,255,0.9),0 2px 4px rgba(125,211,252,0.35);text-shadow:0 1px 0 rgba(255,255,255,0.5);}`,
      styles: [
        { name: 'Blue Tideframe', label: 'P1', className: 'bcp-tide', trigger: { open: '~BP1~', close: '~BP1~' } },
        { name: 'Blue Highlighter', label: 'P2', className: 'bcp-highlighter', trigger: { open: '~BP2~', close: '~BP2~' } },
        { name: 'Blue Deep', label: 'P3', className: 'bcp-bevel', trigger: { open: '~BP3~', close: '~BP3~' } },
        { name: 'Blue Light', label: 'P4', className: 'bcp-stitch', trigger: { open: '~BP4~', close: '~BP4~' } },
        { name: 'Blue Bright', label: 'P5', className: 'bcp-scan', trigger: { open: '~BP5~', close: '~BP5~' } },
        { name: 'Blue Ocean', label: 'P6', className: 'bcp-hatch', trigger: { open: '~BP6~', close: '~BP6~' } },
        { name: 'Blue Sea', label: 'P7', className: 'bcp-emboss', trigger: { open: '~BP7~', close: '~BP7~' } },
        { name: 'Blue Sky', label: 'P8', className: 'bcp-halo', trigger: { open: '~BP8~', close: '~BP8~' } },
        { name: 'Blue Dotted', label: 'P9', className: 'bcp-dots', trigger: { open: '~BP9~', close: '~BP9~' } },
        { name: 'Blue Ice', label: 'P10', className: 'bcp-marker', trigger: { open: '~BP10~', close: '~BP10~' } }
      ]
    },
    {
      id: 'pill-chip-pack',
      name: 'Pill Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'PillChipPack.png',
      description: 'Sixteen fully-rounded glossy highlight pills, spanning the whole rainbow!',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="pill-hl-red">1</span><span class="pill-hl-orange">2</span><span class="pill-hl-amber">3</span><span class="pill-hl-yellow">4</span><span class="pill-hl-lime">5</span><span class="pill-hl-green">6</span><span class="pill-hl-emerald">7</span><span class="pill-hl-teal">8</span><span class="pill-hl-cyan">9</span><span class="pill-hl-sky">10</span><span class="pill-hl-blue">11</span><span class="pill-hl-indigo">12</span><span class="pill-hl-violet">13</span><span class="pill-hl-fuchsia">14</span><span class="pill-hl-pink">15</span><span class="pill-hl-slate">16</span></div>',
      css: `.pill-hl-red,.pill-hl-orange,.pill-hl-amber,.pill-hl-yellow,.pill-hl-lime,.pill-hl-green,.pill-hl-emerald,.pill-hl-teal,.pill-hl-cyan,.pill-hl-sky,.pill-hl-blue,.pill-hl-indigo,.pill-hl-violet,.pill-hl-fuchsia,.pill-hl-pink,.pill-hl-slate{display:inline-flex!important;align-items:center;padding:3px 14px;border-radius:999px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.pill-hl-red{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#ef4444;border:2px solid #b91c1c;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(239,68,68,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-orange{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#f97316;border:2px solid #c2410c;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(249,115,22,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-amber{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#f59e0b;border:2px solid #b45309;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(245,158,11,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-yellow{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#fde047;border:2px solid #ca8a04;color:#713f12;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 5px rgba(253,224,71,0.35);text-shadow:0 1px 0 rgba(255,255,255,0.6);}.pill-hl-lime{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#a3e635;border:2px solid #65a30d;color:#365314;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 5px rgba(163,230,53,0.35);text-shadow:0 1px 0 rgba(255,255,255,0.6);}.pill-hl-green{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#22c55e;border:2px solid #15803d;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(34,197,94,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-emerald{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#10b981;border:2px solid #047857;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(16,185,129,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-teal{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#14b8a6;border:2px solid #0f766e;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(20,184,166,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-cyan{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#06b6d4;border:2px solid #0e7490;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(6,182,212,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-sky{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#38bdf8;border:2px solid #0284c7;color:#082f49;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 5px rgba(56,189,248,0.35);text-shadow:0 1px 0 rgba(255,255,255,0.5);}.pill-hl-blue{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#3b82f6;border:2px solid #1d4ed8;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(59,130,246,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-indigo{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#6366f1;border:2px solid #4338ca;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(99,102,241,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-violet{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#8b5cf6;border:2px solid #6d28d9;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(139,92,246,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-fuchsia{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#d946ef;border:2px solid #a21caf;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(217,70,239,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-pink{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),#ec4899;border:2px solid #be185d;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(236,72,153,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}.pill-hl-slate{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),#64748b;border:2px solid #334155;color:#fff;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(100,116,139,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.4);}`,
      styles: [
        { name: 'Pill Red', label: 'L1', className: 'pill-hl-red', trigger: { open: '~PL1~', close: '~PL1~' } },
        { name: 'Pill Orange', label: 'L2', className: 'pill-hl-orange', trigger: { open: '~PL2~', close: '~PL2~' } },
        { name: 'Pill Amber', label: 'L3', className: 'pill-hl-amber', trigger: { open: '~PL3~', close: '~PL3~' } },
        { name: 'Pill Yellow', label: 'L4', className: 'pill-hl-yellow', trigger: { open: '~PL4~', close: '~PL4~' } },
        { name: 'Pill Lime', label: 'L5', className: 'pill-hl-lime', trigger: { open: '~PL5~', close: '~PL5~' } },
        { name: 'Pill Green', label: 'L6', className: 'pill-hl-green', trigger: { open: '~PL6~', close: '~PL6~' } },
        { name: 'Pill Emerald', label: 'L7', className: 'pill-hl-emerald', trigger: { open: '~PL7~', close: '~PL7~' } },
        { name: 'Pill Teal', label: 'L8', className: 'pill-hl-teal', trigger: { open: '~PL8~', close: '~PL8~' } },
        { name: 'Pill Cyan', label: 'L9', className: 'pill-hl-cyan', trigger: { open: '~PL9~', close: '~PL9~' } },
        { name: 'Pill Sky', label: 'L10', className: 'pill-hl-sky', trigger: { open: '~PL10~', close: '~PL10~' } },
        { name: 'Pill Blue', label: 'L11', className: 'pill-hl-blue', trigger: { open: '~PL11~', close: '~PL11~' } },
        { name: 'Pill Indigo', label: 'L12', className: 'pill-hl-indigo', trigger: { open: '~PL12~', close: '~PL12~' } },
        { name: 'Pill Violet', label: 'L13', className: 'pill-hl-violet', trigger: { open: '~PL13~', close: '~PL13~' } },
        { name: 'Pill Fuchsia', label: 'L14', className: 'pill-hl-fuchsia', trigger: { open: '~PL14~', close: '~PL14~' } },
        { name: 'Pill Pink', label: 'L15', className: 'pill-hl-pink', trigger: { open: '~PL15~', close: '~PL15~' } },
        { name: 'Pill Slate', label: 'L16', className: 'pill-hl-slate', trigger: { open: '~PL16~', close: '~PL16~' } }
      ]
    },
    {
      id: 'poolside-chip-pack',
      name: 'Poolside Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'PoolsideChipPack.png',
      description: 'Ten watery pool-party chips! Sunset splashes, chlorine glows, lifeguard stripes and deep-end neons.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="mkt-pool-tide">Tide</span><span class="mkt-pool-sunset">Sunset</span><span class="mkt-pool-chlorine">Chlorine</span><span class="mkt-pool-beachball">Beach</span><span class="mkt-pool-wave">Wave</span><span class="mkt-pool-lounger">Lounger</span><span class="mkt-pool-deep">Deep</span><span class="mkt-pool-foam">Foam</span><span class="mkt-pool-lifeguard">Guard</span><span class="mkt-pool-fusion">Fusion</span></div>',
      css: `.mkt-pool-tide,.mkt-pool-sunset,.mkt-pool-chlorine,.mkt-pool-beachball,.mkt-pool-wave,.mkt-pool-lounger,.mkt-pool-deep,.mkt-pool-foam,.mkt-pool-lifeguard,.mkt-pool-fusion{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:12px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.mkt-pool-tide{background:rgba(207,250,254,0.4);border:2px solid #0891b2;outline:1px solid #67e8f9;outline-offset:2px;color:#155e75;border-radius:6px;}.mkt-pool-sunset{background:linear-gradient(180deg,rgba(255,255,255,0.65) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#fdba74 0%,#f97316 100%);border:2px solid #c2410c;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(249,115,22,0.4);}.mkt-pool-chlorine{background:rgba(255,255,255,0.5);border:2px solid #22d3ee;color:#0e7490;box-shadow:0 0 10px rgba(34,211,238,0.55),inset 0 0 8px rgba(34,211,238,0.2);}.mkt-pool-beachball{background:linear-gradient(90deg,#fb923c 0%,#fb923c 33%,#fff7ed 33%,#fff7ed 66%,#22d3ee 66%,#22d3ee 100%);border:2px solid #0e7490;color:#7c2d12;border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(14,116,144,0.35);}.mkt-pool-wave{background:linear-gradient(180deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#7dd3fc 0%,#0284c7 60%,#0c4a6e 100%);border:2px solid #082f49;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(2,132,199,0.4);}.mkt-pool-lounger{background:linear-gradient(180deg,rgba(255,255,255,0.65) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#fef08a 0%,#eab308 100%);border:2px solid #a16207;color:#713f12;border-radius:10px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 5px rgba(234,179,8,0.4);text-shadow:0 1px 0 rgba(255,255,255,0.55);}.mkt-pool-deep{background:linear-gradient(180deg,#164e63 0%,#082f49 100%);border:2px solid #22d3ee;color:#a5f3fc;box-shadow:0 0 10px rgba(34,211,238,0.5),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-pool-foam{background:radial-gradient(circle at 30% 25%,#ffffff 0%,#cffafe 45%,#67e8f9 100%);border:2px solid #0891b2;color:#155e75;border-radius:20px;box-shadow:inset 0 1px 2px #fff,0 2px 5px rgba(8,145,178,0.35);}.mkt-pool-lifeguard{background:repeating-linear-gradient(45deg,#fb923c 0px,#fb923c 8px,#fff7ed 8px,#fff7ed 16px);border:2px solid #c2410c;color:#7c2d12;border-radius:8px;text-shadow:0 1px 0 rgba(255,255,255,0.6);box-shadow:0 2px 5px rgba(194,65,12,0.35);}.mkt-pool-fusion{background:linear-gradient(100deg,#fb923c 0%,#facc15 35%,#22d3ee 75%,#0284c7 100%);border:2px solid #0e7490;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:14px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(14,116,144,0.35);}`,
      styles: [
        { name: 'Poolside Tideframe', label: 'S1', className: 'mkt-pool-tide', trigger: { open: '~PS1~', close: '~PS1~' } },
        { name: 'Sunset Splash', label: 'S2', className: 'mkt-pool-sunset', trigger: { open: '~PS2~', close: '~PS2~' } },
        { name: 'Chlorine Glow', label: 'S3', className: 'mkt-pool-chlorine', trigger: { open: '~PS3~', close: '~PS3~' } },
        { name: 'Beach Ball', label: 'S4', className: 'mkt-pool-beachball', trigger: { open: '~PS4~', close: '~PS4~' } },
        { name: 'Wave Rider', label: 'S5', className: 'mkt-pool-wave', trigger: { open: '~PS5~', close: '~PS5~' } },
        { name: 'Sun Lounger', label: 'S6', className: 'mkt-pool-lounger', trigger: { open: '~PS6~', close: '~PS6~' } },
        { name: 'Deep End', label: 'S7', className: 'mkt-pool-deep', trigger: { open: '~PS7~', close: '~PS7~' } },
        { name: 'Foam Party', label: 'S8', className: 'mkt-pool-foam', trigger: { open: '~PS8~', close: '~PS8~' } },
        { name: 'Lifeguard Stripes', label: 'S9', className: 'mkt-pool-lifeguard', trigger: { open: '~PS9~', close: '~PS9~' } },
        { name: 'Cocktail Fusion', label: 'S10', className: 'mkt-pool-fusion', trigger: { open: '~PS10~', close: '~PS10~' } }
      ]
    },
    {
      id: 'autumn-chip-pack',
      name: 'Autumn Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'AutumnChipPack.png',
      description: 'Ten cozy fall chips! Pumpkin spice, cider glows, flannel stripes and bonfire neons.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="mkt-autumn-harvest">Harvest</span><span class="mkt-autumn-pumpkin">Pumpkin</span><span class="mkt-autumn-cider">Cider</span><span class="mkt-autumn-candy">Candy</span><span class="mkt-autumn-leaves">Leaves</span><span class="mkt-autumn-golden">Golden</span><span class="mkt-autumn-bonfire">Bonfire</span><span class="mkt-autumn-frost">Frost</span><span class="mkt-autumn-flannel">Flannel</span><span class="mkt-autumn-orchard">Orchard</span></div>',
      css: `.mkt-autumn-harvest,.mkt-autumn-pumpkin,.mkt-autumn-cider,.mkt-autumn-candy,.mkt-autumn-leaves,.mkt-autumn-golden,.mkt-autumn-bonfire,.mkt-autumn-frost,.mkt-autumn-flannel,.mkt-autumn-orchard{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:12px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.mkt-autumn-harvest{background:rgba(254,243,199,0.4);border:2px solid #b45309;outline:1px solid #fbbf24;outline-offset:2px;color:#92400e;border-radius:6px;}.mkt-autumn-pumpkin{background:linear-gradient(180deg,rgba(255,255,255,0.65) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#fb923c 0%,#c2410c 100%);border:2px solid #7c2d12;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(194,65,12,0.4);}.mkt-autumn-cider{background:rgba(255,255,255,0.5);border:2px solid #d97706;color:#92400e;box-shadow:0 0 10px rgba(217,119,6,0.55),inset 0 0 8px rgba(217,119,6,0.2);}.mkt-autumn-candy{background:linear-gradient(90deg,#ea580c 0%,#ea580c 33%,#fffbeb 33%,#fffbeb 66%,#eab308 66%,#eab308 100%);border:2px solid #9a3412;color:#7c2d12;border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(154,52,18,0.35);}.mkt-autumn-leaves{background:linear-gradient(180deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#fbbf24 0%,#b45309 60%,#451a03 100%);border:2px solid #451a03;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(180,83,9,0.4);}.mkt-autumn-golden{background:linear-gradient(180deg,rgba(255,255,255,0.65) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#fde047 0%,#ca8a04 100%);border:2px solid #854d0e;color:#713f12;border-radius:10px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 5px rgba(202,138,4,0.4);text-shadow:0 1px 0 rgba(255,255,255,0.55);}.mkt-autumn-bonfire{background:linear-gradient(180deg,#431407 0%,#1c0a00 100%);border:2px solid #fb923c;color:#fed7aa;box-shadow:0 0 10px rgba(251,146,60,0.5),inset 0 1px 1px rgba(255,255,255,0.15);}.mkt-autumn-frost{background:radial-gradient(circle at 30% 25%,#ffffff 0%,#fef3c7 45%,#fcd34d 100%);border:2px solid #b45309;color:#92400e;border-radius:20px;box-shadow:inset 0 1px 2px #fff,0 2px 5px rgba(180,83,9,0.35);}.mkt-autumn-flannel{background:repeating-linear-gradient(45deg,#be123c 0px,#be123c 8px,#fff1f2 8px,#fff1f2 16px);border:2px solid #881337;color:#fff1f2;border-radius:8px;text-shadow:0 1px 2px rgba(0,0,0,0.45);box-shadow:0 2px 5px rgba(136,19,55,0.35);}.mkt-autumn-orchard{background:linear-gradient(100deg,#be123c 0%,#ea580c 35%,#eab308 75%,#65a30d 100%);border:2px solid #713f12;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:14px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(113,63,18,0.35);}`,
      styles: [
        { name: 'Harvest Frame', label: 'A1', className: 'mkt-autumn-harvest', trigger: { open: '~AU1~', close: '~AU1~' } },
        { name: 'Pumpkin Spice', label: 'A2', className: 'mkt-autumn-pumpkin', trigger: { open: '~AU2~', close: '~AU2~' } },
        { name: 'Cider Glow', label: 'A3', className: 'mkt-autumn-cider', trigger: { open: '~AU3~', close: '~AU3~' } },
        { name: 'Candy Corn', label: 'A4', className: 'mkt-autumn-candy', trigger: { open: '~AU4~', close: '~AU4~' } },
        { name: 'Falling Leaves', label: 'A5', className: 'mkt-autumn-leaves', trigger: { open: '~AU5~', close: '~AU5~' } },
        { name: 'Golden Hour', label: 'A6', className: 'mkt-autumn-golden', trigger: { open: '~AU6~', close: '~AU6~' } },
        { name: 'Bonfire Night', label: 'A7', className: 'mkt-autumn-bonfire', trigger: { open: '~AU7~', close: '~AU7~' } },
        { name: 'Morning Frost', label: 'A8', className: 'mkt-autumn-frost', trigger: { open: '~AU8~', close: '~AU8~' } },
        { name: 'Flannel Stripes', label: 'A9', className: 'mkt-autumn-flannel', trigger: { open: '~AU9~', close: '~AU9~' } },
        { name: 'Orchard Fusion', label: 'A10', className: 'mkt-autumn-orchard', trigger: { open: '~AU10~', close: '~AU10~' } }
      ]
    },
    {
      id: 'winter-chip-pack',
      name: 'Winter Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'WinterChipPack.png',
      description: 'Ten frosty originals! Icicle drips, pine stitches, garnet facets and a sliding blizzard.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="mkt-winter-icicle">Icicle</span><span class="mkt-winter-frost">Etch</span><span class="mkt-winter-pine">Pine</span><span class="mkt-winter-garnet">Garnet</span><span class="mkt-winter-snowdrift">Drift</span><span class="mkt-winter-aurora">Aurora</span><span class="mkt-winter-pond">Pond</span><span class="mkt-winter-seal">Seal</span><span class="mkt-winter-blizzard">Blizzard</span><span class="mkt-winter-cranberry">Berry</span></div>',
      css: `.mkt-winter-icicle,.mkt-winter-frost,.mkt-winter-pine,.mkt-winter-garnet,.mkt-winter-snowdrift,.mkt-winter-aurora,.mkt-winter-pond,.mkt-winter-seal,.mkt-winter-blizzard,.mkt-winter-cranberry{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:12px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.mkt-winter-icicle{background:radial-gradient(circle at 12px 100%,#bae6fd 12px,rgba(186,230,253,0) 13px) 0 100%/24px 14px repeat-x,linear-gradient(180deg,#e0f2ff 0%,#7dd3fc 100%);color:#0c4a6e;border-radius:12px 12px 4px 4px;padding-bottom:6px;}.mkt-winter-frost{background:rgba(240,249,255,0.55);border:1px solid #7dd3fc;color:#075985;box-shadow:inset 0 0 0 3px rgba(255,255,255,0.7),inset 0 0 0 4px #38bdf8,0 2px 6px rgba(2,132,199,0.25);}.mkt-winter-pine{background:linear-gradient(180deg,#15803d 0%,#14532d 100%);border:2px dashed #fef3c7;color:#fefce8;border-radius:10px;box-shadow:0 2px 5px rgba(20,83,45,0.4);}.mkt-winter-garnet{background:linear-gradient(135deg,#fecdd3 0%,#e11d48 30%,#881337 55%,#f43f5e 80%,#881337 100%);border:2px solid #4c0519;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);border-radius:5px;box-shadow:inset 0 1px 1px rgba(255,255,255,0.5),0 2px 5px rgba(136,19,55,0.4);}.mkt-winter-snowdrift{background:linear-gradient(180deg,#ffffff 0%,#e0f2ff 100%);border:2px solid #bae6fd;color:#0369a1;border-radius:999px;box-shadow:0 3px 8px rgba(3,105,161,0.3),inset 0 1px 1px #fff;}.mkt-winter-aurora{background:linear-gradient(180deg,rgba(255,255,255,0.45) 0%,rgba(255,255,255,0) 55%),linear-gradient(115deg,#a5f3fc 0%,#16a34a 45%,#be123c 100%);border:2px solid #0c4a6e;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:16px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(12,74,110,0.35);}.mkt-winter-pond{background:linear-gradient(115deg,rgba(255,255,255,0.85) 0%,rgba(255,255,255,0.85) 18%,rgba(255,255,255,0) 32%),linear-gradient(180deg,#bae6fd 0%,#0369a1 100%);border:2px solid #075985;color:#f0f9ff;text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(7,89,133,0.4);}.mkt-winter-seal{background:radial-gradient(circle at 50% 35%,#ecfdf5 0px,#ecfdf5 4px,#86efac 4px,#86efac 9px,#3f6212 9px,#3f6212 15px,#1a2e05 15px);border:2px solid #fefce8;color:#ecfdf5;text-shadow:0 1px 2px rgba(0,0,0,0.55);border-radius:20px;box-shadow:0 0 10px rgba(77,124,15,0.45),inset 0 1px 1px rgba(255,255,255,0.3);}.mkt-winter-blizzard{background:repeating-linear-gradient(90deg,rgba(255,255,255,0.28) 0px,rgba(255,255,255,0.28) 10px,rgba(255,255,255,0) 10px,rgba(255,255,255,0) 20px),linear-gradient(180deg,#38bdf8 0%,#1e3a8a 100%);border:2px solid #dbeafe;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);animation:mkt-winter-snow 1.6s linear infinite;}@keyframes mkt-winter-snow{to{background-position:40px 0,0 0;}}.mkt-winter-cranberry{background:linear-gradient(180deg,rgba(255,255,255,0.7) 0%,rgba(255,255,255,0) 35%),linear-gradient(180deg,#fb7185 0%,#9f1239 100%);border:2px solid #881337;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(159,18,57,0.4);}`,
      styles: [
        { name: 'Icicle Drip', label: 'W1', className: 'mkt-winter-icicle', trigger: { open: '~WN1~', close: '~WN1~' } },
        { name: 'Frost Etch', label: 'W2', className: 'mkt-winter-frost', trigger: { open: '~WN2~', close: '~WN2~' } },
        { name: 'Pine Stitch', label: 'W3', className: 'mkt-winter-pine', trigger: { open: '~WN3~', close: '~WN3~' } },
        { name: 'Garnet Facet', label: 'W4', className: 'mkt-winter-garnet', trigger: { open: '~WN4~', close: '~WN4~' } },
        { name: 'Snowdrift Pill', label: 'W5', className: 'mkt-winter-snowdrift', trigger: { open: '~WN5~', close: '~WN5~' } },
        { name: 'Aurora Veil', label: 'W6', className: 'mkt-winter-aurora', trigger: { open: '~WN6~', close: '~WN6~' } },
        { name: 'Frozen Pond', label: 'W7', className: 'mkt-winter-pond', trigger: { open: '~WN7~', close: '~WN7~' } },
        { name: 'Evergreen Seal', label: 'W8', className: 'mkt-winter-seal', trigger: { open: '~WN8~', close: '~WN8~' } },
        { name: 'Blizzard Swirl', label: 'W9', className: 'mkt-winter-blizzard', trigger: { open: '~WN9~', close: '~WN9~' } },
        { name: 'Cranberry Frost', label: 'W10', className: 'mkt-winter-cranberry', trigger: { open: '~WN10~', close: '~WN10~' } }
      ]
    },
    {
      id: 'fruit-chip-pack',
      name: 'Fruit Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'FruitChipPack.png',
      description: 'Twenty juicy fruit chips! Apple, mango, grape, berries, melons and more — fresh from the orchard.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="mkt-fruit-apple">Apple</span><span class="mkt-fruit-mango">Mango</span><span class="mkt-fruit-grape">Grape</span><span class="mkt-fruit-strawberry">Straw</span><span class="mkt-fruit-blueberry">Blue</span><span class="mkt-fruit-orange">Orange</span><span class="mkt-fruit-lemon">Lemon</span><span class="mkt-fruit-lime">Lime</span><span class="mkt-fruit-cherry">Cherry</span><span class="mkt-fruit-peach">Peach</span><span class="mkt-fruit-pear">Pear</span><span class="mkt-fruit-plum">Plum</span><span class="mkt-fruit-kiwi">Kiwi</span><span class="mkt-fruit-pineapple">Pine</span><span class="mkt-fruit-watermelon">Melon</span><span class="mkt-fruit-banana">Banana</span><span class="mkt-fruit-coconut">Coco</span><span class="mkt-fruit-raspberry">Rasp</span><span class="mkt-fruit-blackberry">Black</span><span class="mkt-fruit-pomegranate">Pom</span></div>',
      css: `.mkt-fruit-apple,.mkt-fruit-mango,.mkt-fruit-grape,.mkt-fruit-strawberry,.mkt-fruit-blueberry,.mkt-fruit-orange,.mkt-fruit-lemon,.mkt-fruit-lime,.mkt-fruit-cherry,.mkt-fruit-peach,.mkt-fruit-pear,.mkt-fruit-plum,.mkt-fruit-kiwi,.mkt-fruit-pineapple,.mkt-fruit-watermelon,.mkt-fruit-banana,.mkt-fruit-coconut,.mkt-fruit-raspberry,.mkt-fruit-blackberry,.mkt-fruit-pomegranate{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:12px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.mkt-fruit-apple{background:linear-gradient(180deg,rgba(255,255,255,0.6) 0%,rgba(255,255,255,0.1) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#f87171 0%,#b91c1c 100%);border:2px solid #7f1d1d;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(185,28,28,0.4);}.mkt-fruit-mango{background:linear-gradient(180deg,#fdba74 0%,#f59e0b 60%,#ea580c 100%);border:2px solid #9a3412;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(234,88,12,0.4);}.mkt-fruit-grape{background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.1) 50%,rgba(0,0,0,0.12) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#c084fc 0%,#7e22ce 100%);border:2px solid #581c87;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(126,34,206,0.4);}.mkt-fruit-strawberry{background:radial-gradient(circle at 8px 8px,#fef3c7 2px,rgba(254,243,199,0) 3px) 0 0/18px 18px,linear-gradient(180deg,#fb7185 0%,#be123c 100%);border:2px solid #881337;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:14px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(190,18,60,0.4);}.mkt-fruit-blueberry{background:linear-gradient(180deg,rgba(255,255,255,0.45) 0%,rgba(255,255,255,0.05) 50%,rgba(0,0,0,0.15) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#64748b 0%,#1e293b 100%);border:2px solid #0f172a;color:#e2e8f0;border-radius:999px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.5),0 2px 5px rgba(15,23,42,0.45);}.mkt-fruit-orange{background:linear-gradient(180deg,#fed7aa 0%,#fb923c 55%,#ea580c 100%);border:2px solid #9a3412;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);border-radius:999px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 5px rgba(234,88,12,0.4);}.mkt-fruit-lemon{background:linear-gradient(180deg,rgba(255,255,255,0.65) 0%,rgba(255,255,255,0.15) 50%,rgba(0,0,0,0.1) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#fef08a 0%,#eab308 100%);border:2px solid #a16207;color:#713f12;border-radius:999px;text-shadow:0 1px 0 rgba(255,255,255,0.55);box-shadow:inset 0 1px 2px rgba(255,255,255,0.8),0 2px 5px rgba(234,179,8,0.4);}.mkt-fruit-lime{background:linear-gradient(180deg,#bef264 0%,#84cc16 55%,#4d7c0f 100%);border:2px solid #365314;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);border-radius:10px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(101,163,13,0.4);}.mkt-fruit-cherry{background:radial-gradient(circle at 32% 28%,rgba(255,255,255,0.85) 0%,rgba(255,255,255,0) 34%),linear-gradient(180deg,#f87171 0%,#881337 100%);border:2px solid #4c0519;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:999px;box-shadow:0 2px 6px rgba(136,19,55,0.45),inset 0 1px 1px rgba(255,255,255,0.5);}.mkt-fruit-peach{background:linear-gradient(180deg,#ffedd5 0%,#fdba74 60%,#fb923c 100%);border:2px solid #c2410c;color:#7c2d12;border-radius:16px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.85),0 2px 5px rgba(251,146,60,0.4);}.mkt-fruit-pear{background:linear-gradient(180deg,#ecfccb 0%,#a3e635 55%,#4d7c0f 100%);border:2px solid #365314;color:#1a2e05;border-radius:10px 22px 10px 22px;text-shadow:0 1px 0 rgba(255,255,255,0.5);box-shadow:inset 0 1px 2px rgba(255,255,255,0.7),0 2px 5px rgba(77,124,15,0.4);}.mkt-fruit-plum{background:linear-gradient(180deg,#d8b4fe 0%,#9333ea 55%,#581c87 100%);border:2px solid #3b0764;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:6px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(88,28,135,0.45);}.mkt-fruit-kiwi{background:radial-gradient(circle at 50% 50%,#fefce8 0%,#fefce8 22%,rgba(254,252,232,0) 30%),linear-gradient(180deg,#86efac 0%,#16a34a 60%,#14532d 100%);border:2px solid #14532d;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:999px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(20,83,45,0.4);}.mkt-fruit-pineapple{background:repeating-linear-gradient(45deg,rgba(120,53,15,0.35) 0px,rgba(120,53,15,0.35) 3px,rgba(120,53,15,0) 3px,rgba(120,53,15,0) 12px),repeating-linear-gradient(-45deg,rgba(120,53,15,0.35) 0px,rgba(120,53,15,0.35) 3px,rgba(120,53,15,0) 3px,rgba(120,53,15,0) 12px),linear-gradient(180deg,#fef08a 0%,#facc15 60%,#ca8a04 100%);border:2px solid #854d0e;color:#713f12;border-radius:8px;text-shadow:0 1px 0 rgba(255,255,255,0.55);box-shadow:inset 0 1px 2px rgba(255,255,255,0.75),0 2px 5px rgba(202,138,4,0.4);}.mkt-fruit-watermelon{background:linear-gradient(180deg,#166534 0px,#166534 7px,#fda4af 7px,#fda4af 12px,rgba(253,164,175,0) 12px),linear-gradient(180deg,#fb7185 0%,#e11d48 70%,#9f1239 100%);border:2px solid #14532d;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(225,29,72,0.4);}.mkt-fruit-banana{background:linear-gradient(180deg,#fef9c3 0%,#fde047 55%,#eab308 100%);border:2px solid #a16207;color:#713f12;border-radius:999px;text-shadow:0 1px 0 rgba(255,255,255,0.6);box-shadow:inset 0 1px 2px rgba(255,255,255,0.85),0 2px 5px rgba(234,179,8,0.4);}.mkt-fruit-coconut{background:linear-gradient(180deg,#92400e 0px,#92400e 22%,#fffbeb 22%,#fffbeb 78%,#92400e 78%);border:2px solid #451a03;color:#451a03;border-radius:12px;text-shadow:0 1px 0 rgba(255,255,255,0.7);box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(69,26,3,0.4);}.mkt-fruit-raspberry{background:radial-gradient(circle at 6px 6px,#fecdd3 1.6px,rgba(254,205,211,0) 2.4px) 0 0/13px 13px,linear-gradient(180deg,#fb7185 0%,#9f1239 100%);border:2px solid #881337;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:12px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.55),0 2px 5px rgba(159,18,57,0.45);}.mkt-fruit-blackberry{background:linear-gradient(180deg,rgba(255,255,255,0.4) 0%,rgba(255,255,255,0.05) 50%,rgba(0,0,0,0.2) 51%,rgba(0,0,0,0) 100%),linear-gradient(180deg,#6d28d9 0%,#2e1065 100%);border:2px solid #1e1b4b;color:#ede9fe;border-radius:999px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.5),0 2px 5px rgba(46,16,101,0.5);}.mkt-fruit-pomegranate{background:linear-gradient(115deg,rgba(255,255,255,0.8) 0%,rgba(255,255,255,0.8) 16%,rgba(255,255,255,0) 30%),linear-gradient(180deg,#fb7185 0%,#be123c 60%,#881337 100%);border:2px solid #4c0519;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.45);border-radius:10px;box-shadow:inset 0 1px 2px rgba(255,255,255,0.6),0 2px 5px rgba(190,18,60,0.45);}`,
      styles: [
        { name: 'Apple Crunch', label: 'F1', className: 'mkt-fruit-apple', trigger: { open: '~FR1~', close: '~FR1~' } },
        { name: 'Mango Tango', label: 'F2', className: 'mkt-fruit-mango', trigger: { open: '~FR2~', close: '~FR2~' } },
        { name: 'Grape Cluster', label: 'F3', className: 'mkt-fruit-grape', trigger: { open: '~FR3~', close: '~FR3~' } },
        { name: 'Strawberry Seeds', label: 'F4', className: 'mkt-fruit-strawberry', trigger: { open: '~FR4~', close: '~FR4~' } },
        { name: 'Blueberry Bloom', label: 'F5', className: 'mkt-fruit-blueberry', trigger: { open: '~FR5~', close: '~FR5~' } },
        { name: 'Orange Citrus', label: 'F6', className: 'mkt-fruit-orange', trigger: { open: '~FR6~', close: '~FR6~' } },
        { name: 'Lemon Zest', label: 'F7', className: 'mkt-fruit-lemon', trigger: { open: '~FR7~', close: '~FR7~' } },
        { name: 'Lime Squeeze', label: 'F8', className: 'mkt-fruit-lime', trigger: { open: '~FR8~', close: '~FR8~' } },
        { name: 'Cherry Shine', label: 'F9', className: 'mkt-fruit-cherry', trigger: { open: '~FR9~', close: '~FR9~' } },
        { name: 'Peach Fuzz', label: 'F10', className: 'mkt-fruit-peach', trigger: { open: '~FR10~', close: '~FR10~' } },
        { name: 'Pear Glow', label: 'F11', className: 'mkt-fruit-pear', trigger: { open: '~FR11~', close: '~FR11~' } },
        { name: 'Plum Jewel', label: 'F12', className: 'mkt-fruit-plum', trigger: { open: '~FR12~', close: '~FR12~' } },
        { name: 'Kiwi Core', label: 'F13', className: 'mkt-fruit-kiwi', trigger: { open: '~FR13~', close: '~FR13~' } },
        { name: 'Pineapple Cross', label: 'F14', className: 'mkt-fruit-pineapple', trigger: { open: '~FR14~', close: '~FR14~' } },
        { name: 'Watermelon Rind', label: 'F15', className: 'mkt-fruit-watermelon', trigger: { open: '~FR15~', close: '~FR15~' } },
        { name: 'Banana Peel', label: 'F16', className: 'mkt-fruit-banana', trigger: { open: '~FR16~', close: '~FR16~' } },
        { name: 'Coconut Split', label: 'F17', className: 'mkt-fruit-coconut', trigger: { open: '~FR17~', close: '~FR17~' } },
        { name: 'Raspberry Dot', label: 'F18', className: 'mkt-fruit-raspberry', trigger: { open: '~FR18~', close: '~FR18~' } },
        { name: 'Blackberry Night', label: 'F19', className: 'mkt-fruit-blackberry', trigger: { open: '~FR19~', close: '~FR19~' } },
        { name: 'Pomegranate Ruby', label: 'F20', className: 'mkt-fruit-pomegranate', trigger: { open: '~FR20~', close: '~FR20~' } }
      ]
    },
    {
      id: 'hacker-chip-pack',
      name: 'Hacker Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'HackerChipPack.png',
      description: 'Thirty original terminal chips! Phosphor prompts, matrix rain, CRT scanlines, alerts and mainframes.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;background:#0a0f0a;border-radius:10px;padding:8px;"><span class="mkt-hacker-prompt">Prm</span><span class="mkt-hacker-matrix">Mtx</span><span class="mkt-hacker-amber">Amb</span><span class="mkt-hacker-scan">Scn</span><span class="mkt-hacker-alert">Alr</span><span class="mkt-hacker-hex">Hex</span><span class="mkt-hacker-root">Root</span><span class="mkt-hacker-ghost">Gho</span><span class="mkt-hacker-ice">Ice</span><span class="mkt-hacker-panic">Pnc</span><span class="mkt-hacker-null">Nul</span><span class="mkt-hacker-bitflip">Bit</span><span class="mkt-hacker-firewall">Fw</span><span class="mkt-hacker-darknet">Net</span><span class="mkt-hacker-sniffer">Snf</span><span class="mkt-hacker-overclock">Ovr</span><span class="mkt-hacker-leak">Lek</span><span class="mkt-hacker-zeroday">Zero</span><span class="mkt-hacker-backdoor">Door</span><span class="mkt-hacker-cipher">Cph</span><span class="mkt-hacker-daemon">Dmn</span><span class="mkt-hacker-fork">Frk</span><span class="mkt-hacker-segfault">Seg</span><span class="mkt-hacker-uptime">Upt</span><span class="mkt-hacker-latency">Lat</span><span class="mkt-hacker-mainframe">Mfr</span><span class="mkt-hacker-punchcard">Pnc</span><span class="mkt-hacker-turing">Tur</span><span class="mkt-hacker-quantum">Qtm</span><span class="mkt-hacker-sudo">Sudo</span></div>',
      css: `.mkt-hacker-prompt,.mkt-hacker-matrix,.mkt-hacker-amber,.mkt-hacker-scan,.mkt-hacker-alert,.mkt-hacker-hex,.mkt-hacker-root,.mkt-hacker-ghost,.mkt-hacker-ice,.mkt-hacker-panic,.mkt-hacker-null,.mkt-hacker-bitflip,.mkt-hacker-firewall,.mkt-hacker-darknet,.mkt-hacker-sniffer,.mkt-hacker-overclock,.mkt-hacker-leak,.mkt-hacker-zeroday,.mkt-hacker-backdoor,.mkt-hacker-cipher,.mkt-hacker-daemon,.mkt-hacker-fork,.mkt-hacker-segfault,.mkt-hacker-uptime,.mkt-hacker-latency,.mkt-hacker-mainframe,.mkt-hacker-punchcard,.mkt-hacker-turing,.mkt-hacker-quantum,.mkt-hacker-sudo{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:8px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;font-family:monospace;}.mkt-hacker-prompt{background:#0a0f0a;border:2px solid #33ff66;border-left-width:8px;color:#33ff66;text-shadow:0 0 6px rgba(51,255,102,0.8);}.mkt-hacker-matrix{background:repeating-linear-gradient(180deg,rgba(0,255,65,0.35) 0px,rgba(0,255,65,0.35) 8px,rgba(0,255,65,0) 8px,rgba(0,255,65,0) 22px),#04140a;border:2px solid #00ff41;color:#00ff41;text-shadow:0 0 6px rgba(0,255,65,0.8);animation:mkt-hacker-rain 1.2s linear infinite;}@keyframes mkt-hacker-rain{to{background-position:0 22px,0 0;}}.mkt-hacker-amber{background:#140e04;border:2px solid #ffb000;color:#ffb000;text-shadow:0 0 6px rgba(255,176,0,0.8);border-radius:4px;}.mkt-hacker-scan{background:repeating-linear-gradient(180deg,rgba(0,0,0,0.45) 0px,rgba(0,0,0,0.45) 2px,rgba(0,0,0,0) 2px,rgba(0,0,0,0) 5px),#0d2818;border:2px solid #33ff66;color:#9dffb9;}.mkt-hacker-alert{background:#0a0f0a;border:2px solid #ff3131;color:#ff3131;text-shadow:0 0 8px rgba(255,49,49,0.9);box-shadow:0 0 10px rgba(255,49,49,0.5),inset 0 0 8px rgba(255,49,49,0.2);}.mkt-hacker-hex{background:#0d1520;border:2px dotted #00e5ff;color:#00e5ff;letter-spacing:2px;border-radius:4px;}.mkt-hacker-root{background:#33ff66;border:2px solid #04140a;color:#04140a;border-radius:2px;}.mkt-hacker-ghost{background:rgba(4,20,10,0.35);border:1px solid #33ff66;color:#4ade80;text-shadow:0 0 6px rgba(51,255,102,0.6);border-radius:20px;}.mkt-hacker-ice{background:#04121a;border:2px solid #00e5ff;color:#a5f3fc;text-shadow:0 0 8px rgba(0,229,255,0.9);box-shadow:0 0 10px rgba(0,229,255,0.5);border-radius:20px;}.mkt-hacker-panic{background:#ff3131;border:2px solid #7f1d1d;color:#0a0f0a;border-radius:2px;}.mkt-hacker-null{background:#101418;border:2px dashed #8b949e;color:#8b949e;border-radius:4px;}.mkt-hacker-bitflip{background:linear-gradient(135deg,#33ff66 0%,#33ff66 50%,#0a0f0a 50%,#0a0f0a 100%);border:2px solid #33ff66;color:#eafff0;text-shadow:0 1px 2px #000;border-radius:2px;}.mkt-hacker-firewall{background:linear-gradient(180deg,#ff6b1a 0px,#ff6b1a 6px,rgba(255,107,26,0) 6px),#140903;border:2px solid #ff6b1a;color:#ffb37a;border-radius:6px 6px 8px 8px;}.mkt-hacker-darknet{background:#0d0714;border:2px solid #8b5cf6;color:#c4b5fd;text-shadow:0 0 8px rgba(139,92,246,0.9);border-radius:12px;}.mkt-hacker-sniffer{background:#0a0f0a;border:2px solid #0a0f0a;border-bottom:3px dotted #a3e635;color:#bef264;border-radius:0;}.mkt-hacker-overclock{background:linear-gradient(180deg,#a3e635 0%,#4d7c0f 100%);border:2px solid #1a2e05;color:#0a0f0a;transform:skewX(-8deg);border-radius:4px;}.mkt-hacker-leak{background:#0a1a33;border:2px solid #38bdf8;color:#7dd3fc;border-radius:20px 4px 20px 4px;text-shadow:0 0 8px rgba(56,189,248,0.8);}.mkt-hacker-zeroday{background:#0a0f0a;border:2px solid #f8fafc;color:#f8fafc;border-radius:2px;letter-spacing:1px;}.mkt-hacker-backdoor{background:#170c02;border:2px dashed #f59e0b;color:#fbbf24;border-radius:8px;}.mkt-hacker-cipher{background:#12081f;border:2px solid #a855f7;color:#d8b4fe;font-family:monospace;letter-spacing:3px;border-radius:4px;text-shadow:0 0 6px rgba(168,85,247,0.8);}.mkt-hacker-daemon{background:#042a26;border:2px solid #2dd4bf;color:#99f6e4;text-shadow:0 0 8px rgba(45,212,191,0.9);border-radius:20px;}.mkt-hacker-fork{background:#0a0f0a;border:2px solid #33ff66;outline:1px solid #33ff66;outline-offset:3px;color:#33ff66;border-radius:4px;}.mkt-hacker-segfault{background:linear-gradient(180deg,#ff3131 0px,#ff3131 8px,#f8fafc 8px,#f8fafc 13px,#ff3131 13px);border:2px solid #7f1d1d;color:#fff;text-shadow:0 1px 2px #000;border-radius:4px;}.mkt-hacker-uptime{background:rgba(20,60,35,0.55);border:1px solid #4ade80;color:#bbf7d0;border-radius:20px;}.mkt-hacker-latency{background:repeating-linear-gradient(45deg,#facc15 0px,#facc15 8px,#0a0f0a 8px,#0a0f0a 16px);border:2px solid #713f12;color:#fff;text-shadow:0 1px 2px #000;border-radius:4px;}.mkt-hacker-mainframe{background:#d7d7c3;border:3px solid #3f3f33;color:#1c1c14;border-radius:2px;font-family:monospace;}.mkt-hacker-punchcard{background:radial-gradient(circle at 8px 50%,#3f3f33 3px,rgba(63,63,51,0) 4px) 0 0/20px 14px,#e8e4d4;border:2px solid #3f3f33;color:#1c1c14;border-radius:4px;font-family:monospace;}.mkt-hacker-turing{background:#0a0f0a;border:2px solid #d4af37;color:#f3d67c;text-shadow:0 0 8px rgba(212,175,55,0.9);border-radius:8px;letter-spacing:1px;}.mkt-hacker-quantum{background:linear-gradient(115deg,#2e1065 0%,#6d28d9 45%,#0e7490 100%);border:2px solid #c4b5fd;color:#fff;text-shadow:0 0 8px rgba(196,181,253,0.9);border-radius:12px;}.mkt-hacker-sudo{background:#04140a;border:3px solid #33ff66;color:#33ff66;text-shadow:0 0 8px rgba(51,255,102,0.9);box-shadow:0 0 12px rgba(51,255,102,0.55),inset 0 0 10px rgba(51,255,102,0.2);border-radius:10px;padding:3px 12px;}`,
      styles: [
        { name: 'Phosphor Prompt', label: 'H1', className: 'mkt-hacker-prompt', trigger: { open: '~HK1~', close: '~HK1~' } },
        { name: 'Matrix Rain', label: 'H2', className: 'mkt-hacker-matrix', trigger: { open: '~HK2~', close: '~HK2~' } },
        { name: 'Amber Terminal', label: 'H3', className: 'mkt-hacker-amber', trigger: { open: '~HK3~', close: '~HK3~' } },
        { name: 'CRT Scanlines', label: 'H4', className: 'mkt-hacker-scan', trigger: { open: '~HK4~', close: '~HK4~' } },
        { name: 'Red Alert', label: 'H5', className: 'mkt-hacker-alert', trigger: { open: '~HK5~', close: '~HK5~' } },
        { name: 'Hex Dump', label: 'H6', className: 'mkt-hacker-hex', trigger: { open: '~HK6~', close: '~HK6~' } },
        { name: 'Root Access', label: 'H7', className: 'mkt-hacker-root', trigger: { open: '~HK7~', close: '~HK7~' } },
        { name: 'Ghost Shell', label: 'H8', className: 'mkt-hacker-ghost', trigger: { open: '~HK8~', close: '~HK8~' } },
        { name: 'Cyber Ice', label: 'H9', className: 'mkt-hacker-ice', trigger: { open: '~HK9~', close: '~HK9~' } },
        { name: 'Kernel Panic', label: 'H10', className: 'mkt-hacker-panic', trigger: { open: '~HK10~', close: '~HK10~' } },
        { name: 'Null Pointer', label: 'H11', className: 'mkt-hacker-null', trigger: { open: '~HK11~', close: '~HK11~' } },
        { name: 'Bit Flip', label: 'H12', className: 'mkt-hacker-bitflip', trigger: { open: '~HK12~', close: '~HK12~' } },
        { name: 'Firewall', label: 'H13', className: 'mkt-hacker-firewall', trigger: { open: '~HK13~', close: '~HK13~' } },
        { name: 'Darknet', label: 'H14', className: 'mkt-hacker-darknet', trigger: { open: '~HK14~', close: '~HK14~' } },
        { name: 'Packet Sniffer', label: 'H15', className: 'mkt-hacker-sniffer', trigger: { open: '~HK15~', close: '~HK15~' } },
        { name: 'Overclock', label: 'H16', className: 'mkt-hacker-overclock', trigger: { open: '~HK16~', close: '~HK16~' } },
        { name: 'Memory Leak', label: 'H17', className: 'mkt-hacker-leak', trigger: { open: '~HK17~', close: '~HK17~' } },
        { name: 'Zero Day', label: 'H18', className: 'mkt-hacker-zeroday', trigger: { open: '~HK18~', close: '~HK18~' } },
        { name: 'Backdoor', label: 'H19', className: 'mkt-hacker-backdoor', trigger: { open: '~HK19~', close: '~HK19~' } },
        { name: 'Cipher', label: 'H20', className: 'mkt-hacker-cipher', trigger: { open: '~HK20~', close: '~HK20~' } },
        { name: 'Daemon', label: 'H21', className: 'mkt-hacker-daemon', trigger: { open: '~HK21~', close: '~HK21~' } },
        { name: 'Fork Bomb', label: 'H22', className: 'mkt-hacker-fork', trigger: { open: '~HK22~', close: '~HK22~' } },
        { name: 'Segfault', label: 'H23', className: 'mkt-hacker-segfault', trigger: { open: '~HK23~', close: '~HK23~' } },
        { name: 'Uptime', label: 'H24', className: 'mkt-hacker-uptime', trigger: { open: '~HK24~', close: '~HK24~' } },
        { name: 'Latency', label: 'H25', className: 'mkt-hacker-latency', trigger: { open: '~HK25~', close: '~HK25~' } },
        { name: 'Mainframe', label: 'H26', className: 'mkt-hacker-mainframe', trigger: { open: '~HK26~', close: '~HK26~' } },
        { name: 'Punchcard', label: 'H27', className: 'mkt-hacker-punchcard', trigger: { open: '~HK27~', close: '~HK27~' } },
        { name: 'Turing Gold', label: 'H28', className: 'mkt-hacker-turing', trigger: { open: '~HK28~', close: '~HK28~' } },
        { name: 'Quantum', label: 'H29', className: 'mkt-hacker-quantum', trigger: { open: '~HK29~', close: '~HK29~' } },
        { name: 'Sudo Make', label: 'H30', className: 'mkt-hacker-sudo', trigger: { open: '~HK30~', close: '~HK30~' } }
      ]
    },
    {
      id: 'midnight-glass-pack',
      name: 'Midnight Glass Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'MidnightGlassChipPack.png',
      description: 'Sixteen frosted midnight-glass chips! Same rainbow soul as Dark Gel — all-new glass design with glowing color edges.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;background:#0f172a;border-radius:10px;padding:8px;"><span class="mkt-mg-red">R</span><span class="mkt-mg-orange">O</span><span class="mkt-mg-amber">A</span><span class="mkt-mg-yellow">Y</span><span class="mkt-mg-lime">L</span><span class="mkt-mg-green">G</span><span class="mkt-mg-emerald">E</span><span class="mkt-mg-teal">T</span><span class="mkt-mg-cyan">C</span><span class="mkt-mg-sky">S</span><span class="mkt-mg-blue">B</span><span class="mkt-mg-indigo">I</span><span class="mkt-mg-violet">V</span><span class="mkt-mg-fuchsia">F</span><span class="mkt-mg-pink">P</span><span class="mkt-mg-slate">Sl</span></div>',
      css: `.mkt-mg-red,.mkt-mg-orange,.mkt-mg-amber,.mkt-mg-yellow,.mkt-mg-lime,.mkt-mg-green,.mkt-mg-emerald,.mkt-mg-teal,.mkt-mg-cyan,.mkt-mg-sky,.mkt-mg-blue,.mkt-mg-indigo,.mkt-mg-violet,.mkt-mg-fuchsia,.mkt-mg-pink,.mkt-mg-slate{display:inline-flex!important;align-items:center;padding:3px 12px;border-radius:14px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;background:linear-gradient(160deg,rgba(30,41,59,0.72) 0%,rgba(2,6,23,0.82) 100%);border:1px solid rgba(255,255,255,0.22);}.mkt-mg-red{border-bottom:3px solid #f87171;color:#fecaca;box-shadow:0 0 12px rgba(248,113,113,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-orange{border-bottom:3px solid #fb923c;color:#fed7aa;box-shadow:0 0 12px rgba(251,146,60,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-amber{border-bottom:3px solid #fbbf24;color:#fde68a;box-shadow:0 0 12px rgba(251,191,36,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-yellow{border-bottom:3px solid #fde047;color:#fef08a;box-shadow:0 0 12px rgba(253,224,71,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-lime{border-bottom:3px solid #a3e635;color:#d9f99d;box-shadow:0 0 12px rgba(163,230,53,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-green{border-bottom:3px solid #4ade80;color:#bbf7d0;box-shadow:0 0 12px rgba(74,222,128,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-emerald{border-bottom:3px solid #34d399;color:#a7f3d0;box-shadow:0 0 12px rgba(52,211,153,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-teal{border-bottom:3px solid #2dd4bf;color:#99f6e4;box-shadow:0 0 12px rgba(45,212,191,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-cyan{border-bottom:3px solid #22d3ee;color:#a5f3fc;box-shadow:0 0 12px rgba(34,211,238,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-sky{border-bottom:3px solid #38bdf8;color:#bae6fd;box-shadow:0 0 12px rgba(56,189,248,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-blue{border-bottom:3px solid #60a5fa;color:#bfdbfe;box-shadow:0 0 12px rgba(96,165,250,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-indigo{border-bottom:3px solid #818cf8;color:#c7d2fe;box-shadow:0 0 12px rgba(129,140,248,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-violet{border-bottom:3px solid #a78bfa;color:#ddd6fe;box-shadow:0 0 12px rgba(167,139,250,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-fuchsia{border-bottom:3px solid #e879f9;color:#f5d0fe;box-shadow:0 0 12px rgba(232,121,249,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-pink{border-bottom:3px solid #f472b6;color:#fbcfe8;box-shadow:0 0 12px rgba(244,114,182,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}.mkt-mg-slate{border-bottom:3px solid #94a3b8;color:#e2e8f0;box-shadow:0 0 12px rgba(148,163,184,0.45),inset 0 1px 0 rgba(255,255,255,0.25);}`,
      styles: [
        { name: 'Midnight Red', label: 'M1', className: 'mkt-mg-red', trigger: { open: '~MG1~', close: '~MG1~' } },
        { name: 'Midnight Orange', label: 'M2', className: 'mkt-mg-orange', trigger: { open: '~MG2~', close: '~MG2~' } },
        { name: 'Midnight Amber', label: 'M3', className: 'mkt-mg-amber', trigger: { open: '~MG3~', close: '~MG3~' } },
        { name: 'Midnight Yellow', label: 'M4', className: 'mkt-mg-yellow', trigger: { open: '~MG4~', close: '~MG4~' } },
        { name: 'Midnight Lime', label: 'M5', className: 'mkt-mg-lime', trigger: { open: '~MG5~', close: '~MG5~' } },
        { name: 'Midnight Green', label: 'M6', className: 'mkt-mg-green', trigger: { open: '~MG6~', close: '~MG6~' } },
        { name: 'Midnight Emerald', label: 'M7', className: 'mkt-mg-emerald', trigger: { open: '~MG7~', close: '~MG7~' } },
        { name: 'Midnight Teal', label: 'M8', className: 'mkt-mg-teal', trigger: { open: '~MG8~', close: '~MG8~' } },
        { name: 'Midnight Cyan', label: 'M9', className: 'mkt-mg-cyan', trigger: { open: '~MG9~', close: '~MG9~' } },
        { name: 'Midnight Sky', label: 'M10', className: 'mkt-mg-sky', trigger: { open: '~MG10~', close: '~MG10~' } },
        { name: 'Midnight Blue', label: 'M11', className: 'mkt-mg-blue', trigger: { open: '~MG11~', close: '~MG11~' } },
        { name: 'Midnight Indigo', label: 'M12', className: 'mkt-mg-indigo', trigger: { open: '~MG12~', close: '~MG12~' } },
        { name: 'Midnight Violet', label: 'M13', className: 'mkt-mg-violet', trigger: { open: '~MG13~', close: '~MG13~' } },
        { name: 'Midnight Fuchsia', label: 'M14', className: 'mkt-mg-fuchsia', trigger: { open: '~MG14~', close: '~MG14~' } },
        { name: 'Midnight Pink', label: 'M15', className: 'mkt-mg-pink', trigger: { open: '~MG15~', close: '~MG15~' } },
        { name: 'Midnight Slate', label: 'M16', className: 'mkt-mg-slate', trigger: { open: '~MG16~', close: '~MG16~' } }
      ]
    },
    {
      id: 'gel-dewdrop-pack',
      name: 'Gel Dewdrop Chip Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.0.0',
      image: 'GelDewdropChipPack.png',
      description: 'Sixteen dewdrop gels in the classic bubble rainbow! Same family feel — droplet silhouette, specular dot shine.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;background:#f0f9ff;border-radius:10px;padding:8px;"><span class="mkt-dew-cyan">C</span><span class="mkt-dew-orange">O</span><span class="mkt-dew-green">G</span><span class="mkt-dew-red">R</span><span class="mkt-dew-purple">P</span><span class="mkt-dew-pink">P</span><span class="mkt-dew-yellow">Y</span><span class="mkt-dew-blue">B</span><span class="mkt-dew-lime">L</span><span class="mkt-dew-teal">T</span><span class="mkt-dew-gold">G</span><span class="mkt-dew-slate">S</span><span class="mkt-dew-white">W</span><span class="mkt-dew-black">B</span><span class="mkt-dew-fog">F</span><span class="mkt-dew-turquoise">T</span></div>',
      css: `.mkt-dew-cyan,.mkt-dew-orange,.mkt-dew-green,.mkt-dew-red,.mkt-dew-purple,.mkt-dew-pink,.mkt-dew-yellow,.mkt-dew-blue,.mkt-dew-lime,.mkt-dew-teal,.mkt-dew-gold,.mkt-dew-slate,.mkt-dew-white,.mkt-dew-black,.mkt-dew-fog,.mkt-dew-turquoise{display:inline-flex!important;align-items:center;padding:2px 12px;border-radius:18px 18px 18px 5px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;}.mkt-dew-cyan{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#a5f3fc 0%,#22d3ee 100%);border:2px solid #0e7490;color:#164e63;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-orange{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#fed7aa 0%,#fb923c 100%);border:2px solid #c2410c;color:#7c2d12;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-green{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#a7f3d0 0%,#10b981 100%);border:2px solid #047857;color:#022c22;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-red{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#fecaca 0%,#ef4444 100%);border:2px solid #b91c1c;color:#450a0a;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-purple{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#ddd6fe 0%,#a855f7 100%);border:2px solid #7e22ce;color:#2e1065;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-pink{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#fbcfe8 0%,#ec4899 100%);border:2px solid #be123c;color:#4c0519;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-yellow{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#fef08a 0%,#eab308 100%);border:2px solid #a16207;color:#452b03;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-blue{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#bfdbfe 0%,#3b82f6 100%);border:2px solid #1d4ed8;color:#172554;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-lime{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#d9f99d 0%,#84cc16 100%);border:2px solid #4d7c0f;color:#1a2e05;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-teal{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#99f6e4 0%,#14b8a6 100%);border:2px solid #0f766e;color:#042f2e;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-gold{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#fde68a 0%,#f59e0b 100%);border:2px solid #b45309;color:#451a03;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-slate{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#e2e8f0 0%,#64748b 100%);border:2px solid #334155;color:#0f172a;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-white{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,1) 0%,rgba(255,255,255,0) 45%),linear-gradient(180deg,#ffffff 0%,#f1f5f9 100%);border:2px solid #94a3b8;color:#334155;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.6),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-black{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#475569 0%,#020617 100%);border:2px solid #000000;color:#f1f5f9;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.2),0 2px 4px rgba(0,0,0,0.2);}.mkt-dew-fog{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#f1f5f9 0%,#cbd5e1 100%);border:2px solid #64748b;color:#1e293b;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.5),0 2px 4px rgba(0,0,0,0.08);}.mkt-dew-turquoise{background:radial-gradient(circle at 32% 26%,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%),linear-gradient(180deg,#a5f3fc 0%,#06b6d4 100%);border:2px solid #0e7490;color:#164e63;box-shadow:inset 0 -2px 3px rgba(255,255,255,0.35),0 2px 4px rgba(0,0,0,0.08);}`,
      styles: [
        { name: 'Dewdrop Cyan', label: 'D1', className: 'mkt-dew-cyan', trigger: { open: '~DW1~', close: '~DW1~' } },
        { name: 'Dewdrop Orange', label: 'D2', className: 'mkt-dew-orange', trigger: { open: '~DW2~', close: '~DW2~' } },
        { name: 'Dewdrop Green', label: 'D3', className: 'mkt-dew-green', trigger: { open: '~DW3~', close: '~DW3~' } },
        { name: 'Dewdrop Red', label: 'D4', className: 'mkt-dew-red', trigger: { open: '~DW4~', close: '~DW4~' } },
        { name: 'Dewdrop Purple', label: 'D5', className: 'mkt-dew-purple', trigger: { open: '~DW5~', close: '~DW5~' } },
        { name: 'Dewdrop Pink', label: 'D6', className: 'mkt-dew-pink', trigger: { open: '~DW6~', close: '~DW6~' } },
        { name: 'Dewdrop Yellow', label: 'D7', className: 'mkt-dew-yellow', trigger: { open: '~DW7~', close: '~DW7~' } },
        { name: 'Dewdrop Blue', label: 'D8', className: 'mkt-dew-blue', trigger: { open: '~DW8~', close: '~DW8~' } },
        { name: 'Dewdrop Lime', label: 'D9', className: 'mkt-dew-lime', trigger: { open: '~DW9~', close: '~DW9~' } },
        { name: 'Dewdrop Teal', label: 'D10', className: 'mkt-dew-teal', trigger: { open: '~DW10~', close: '~DW10~' } },
        { name: 'Dewdrop Gold', label: 'D11', className: 'mkt-dew-gold', trigger: { open: '~DW11~', close: '~DW11~' } },
        { name: 'Dewdrop Slate', label: 'D12', className: 'mkt-dew-slate', trigger: { open: '~DW12~', close: '~DW12~' } },
        { name: 'Dewdrop White', label: 'D13', className: 'mkt-dew-white', trigger: { open: '~DW13~', close: '~DW13~' } },
        { name: 'Dewdrop Black', label: 'D14', className: 'mkt-dew-black', trigger: { open: '~DW14~', close: '~DW14~' } },
        { name: 'Dewdrop Fog', label: 'D15', className: 'mkt-dew-fog', trigger: { open: '~DW15~', close: '~DW15~' } },
        { name: 'Dewdrop Turquoise', label: 'D16', className: 'mkt-dew-turquoise', trigger: { open: '~DW16~', close: '~DW16~' } }
      ]
    },
    {
      id: 'gel-bubble-remix',
      name: 'Gel Bubble Remix Pack',
      category: 'styles',
      kind: 'style-pack',
      version: '1.1.0',
      image: 'GelBubbleRemix.png',
      description: 'Thirty bubbly gels in rainbow order! Same gradient soul, brand-new shades — every bubble its own personality.',
      previewHTML: '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:10px;"><span class="mkt-bubble-red">1</span><span class="mkt-bubble-coral">2</span><span class="mkt-bubble-orange">3</span><span class="mkt-bubble-amber">4</span><span class="mkt-bubble-gold">5</span><span class="mkt-bubble-yellow">6</span><span class="mkt-bubble-cream">7</span><span class="mkt-bubble-lime">8</span><span class="mkt-bubble-olive">9</span><span class="mkt-bubble-green">10</span><span class="mkt-bubble-emerald">11</span><span class="mkt-bubble-mint">12</span><span class="mkt-bubble-teal">13</span><span class="mkt-bubble-turquoise">14</span><span class="mkt-bubble-cyan">15</span><span class="mkt-bubble-sky">16</span><span class="mkt-bubble-blue">17</span><span class="mkt-bubble-navy">18</span><span class="mkt-bubble-indigo">19</span><span class="mkt-bubble-violet">20</span><span class="mkt-bubble-purple">21</span><span class="mkt-bubble-lavender">22</span><span class="mkt-bubble-fuchsia">23</span><span class="mkt-bubble-pink">24</span><span class="mkt-bubble-rose">25</span><span class="mkt-bubble-brown">26</span><span class="mkt-bubble-white">27</span><span class="mkt-bubble-fog">28</span><span class="mkt-bubble-slate">29</span><span class="mkt-bubble-black">30</span></div>',
      css: `.mkt-bubble-red,.mkt-bubble-coral,.mkt-bubble-orange,.mkt-bubble-amber,.mkt-bubble-gold,.mkt-bubble-yellow,.mkt-bubble-cream,.mkt-bubble-lime,.mkt-bubble-olive,.mkt-bubble-green,.mkt-bubble-emerald,.mkt-bubble-mint,.mkt-bubble-teal,.mkt-bubble-turquoise,.mkt-bubble-cyan,.mkt-bubble-sky,.mkt-bubble-blue,.mkt-bubble-navy,.mkt-bubble-indigo,.mkt-bubble-violet,.mkt-bubble-purple,.mkt-bubble-lavender,.mkt-bubble-fuchsia,.mkt-bubble-pink,.mkt-bubble-rose,.mkt-bubble-brown,.mkt-bubble-white,.mkt-bubble-fog,.mkt-bubble-slate,.mkt-bubble-black{display:inline-flex!important;align-items:center;padding:2px 10px;border-radius:999px;font-weight:800;white-space:nowrap;margin:0 2px;vertical-align:middle;box-shadow:0 3px 6px rgba(0,0,0,0.06),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-red{background:linear-gradient(180deg,#ef4444 0%,transparent 100%);border:2px solid #dc2626;color:#450a0a;border-radius:999px;box-shadow:0 3px 9px rgba(220,38,38,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-coral{background:linear-gradient(180deg,#ff6b4a 0%,transparent 100%);border:2px solid #dc4426;color:#431407;border-radius:999px;box-shadow:0 3px 9px rgba(220,68,38,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-orange{background:linear-gradient(180deg,#f97316 0%,transparent 100%);border:2px solid #ea580c;color:#431407;border-radius:999px;box-shadow:0 3px 9px rgba(234,88,12,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-amber{background:linear-gradient(180deg,#fbbf24 0%,transparent 100%);border:2px solid #d97706;color:#451a03;border-radius:999px;box-shadow:0 3px 9px rgba(217,119,6,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-gold{background:linear-gradient(180deg,#facc15 0%,transparent 100%);border:2px solid #b45309;color:#451a03;border-radius:999px;box-shadow:0 3px 9px rgba(180,83,9,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-yellow{background:linear-gradient(180deg,#ead708 0%,transparent 100%);border:2px solid #caa604;color:#452b03;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-cream{background:linear-gradient(180deg,#fef3c7 0%,transparent 100%);border:2px solid #fcd34d;color:#78350f;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-lime{background:linear-gradient(180deg,#84cc16 0%,transparent 100%);border:2px solid #65a30d;color:#1a2e05;border-radius:999px;box-shadow:0 3px 9px rgba(101,163,13,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-olive{background:linear-gradient(180deg,#95953c 0%,transparent 100%);border:2px solid #5c5c22;color:#fefce8;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-green{background:linear-gradient(180deg,#10b981 0%,transparent 100%);border:2px solid #059669;color:#022c22;border-radius:999px;box-shadow:0 3px 9px rgba(5,150,105,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-emerald{background:linear-gradient(180deg,#34d399 0%,transparent 100%);border:2px solid #059669;color:#022c22;border-radius:999px;box-shadow:0 3px 9px rgba(5,150,105,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-mint{background:linear-gradient(180deg,#6ee7b7 0%,transparent 100%);border:2px solid #10b981;color:#022c22;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-teal{background:linear-gradient(180deg,#06b6d4 0%,transparent 100%);border:2px solid #0e7490;color:#164e63;border-radius:999px;box-shadow:0 3px 9px rgba(14,116,144,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-turquoise{background:linear-gradient(180deg,#2dd4bf 0%,transparent 100%);border:2px solid #0d9488;color:#042f2e;border-radius:999px;box-shadow:0 3px 9px rgba(13,148,136,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-cyan{background:linear-gradient(180deg,#30d3e5 0%,transparent 100%);border:2px solid #26a3b1;color:#043e44;border-radius:999px;box-shadow:0 3px 9px rgba(38,163,177,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-sky{background:linear-gradient(180deg,#38bdf8 0%,transparent 100%);border:2px solid #0284c7;color:#0c4a6e;border-radius:999px;box-shadow:0 3px 9px rgba(2,132,199,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-blue{background:linear-gradient(180deg,#3b82f6 0%,transparent 100%);border:2px solid #2563eb;color:#172554;border-radius:999px;box-shadow:0 3px 9px rgba(37,99,235,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-navy{background:linear-gradient(180deg,#1e3a8a 0%,transparent 100%);border:2px solid #172554;color:#dbeafe;border-radius:999px;box-shadow:0 5px 12px rgba(0,0,0,0.16),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-indigo{background:linear-gradient(180deg,#818cf8 0%,transparent 100%);border:2px solid #4f46e5;color:#1e1b4e;border-radius:999px;box-shadow:0 3px 9px rgba(79,70,229,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-violet{background:linear-gradient(180deg,#8b5cf6 0%,transparent 100%);border:2px solid #7c3aed;color:#2e1065;border-radius:999px;box-shadow:0 3px 9px rgba(124,58,237,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-purple{background:linear-gradient(180deg,#a855f7 0%,transparent 100%);border:2px solid #9333ea;color:#2e1065;border-radius:999px;box-shadow:0 3px 9px rgba(147,51,234,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-lavender{background:linear-gradient(180deg,#c4b5fd 0%,transparent 100%);border:2px solid #8b5cf6;color:#2e1065;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-fuchsia{background:linear-gradient(180deg,#d946ef 0%,transparent 100%);border:2px solid #a21caf;color:#4a044e;border-radius:999px;box-shadow:0 3px 9px rgba(162,28,175,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-pink{background:linear-gradient(180deg,#ec4899 0%,transparent 100%);border:2px solid #db2777;color:#4c0519;border-radius:999px;box-shadow:0 3px 9px rgba(219,39,119,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-rose{background:linear-gradient(180deg,#fb7185 0%,transparent 100%);border:2px solid #e11d48;color:#4c0519;border-radius:999px;box-shadow:0 3px 9px rgba(225,29,72,0.4),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-brown{background:linear-gradient(180deg,#a16207 0%,transparent 100%);border:2px solid #713f12;color:#fef3c7;border-radius:999px;box-shadow:0 5px 12px rgba(0,0,0,0.16),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-white{background:linear-gradient(180deg,#ffffff 0%,transparent 100%);border:2px solid #cbd5e1;color:#334155;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-fog{background:linear-gradient(180deg,#e2e8f0 0%,transparent 100%);border:2px solid #94a3b8;color:#1e293b;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-slate{background:linear-gradient(180deg,#64748b 0%,transparent 100%);border:2px solid #475569;color:#f8fafc;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,0.08),inset 0 1px 1px rgba(255,255,255,0.4);}.mkt-bubble-black{background:linear-gradient(180deg,#374151 0%,transparent 100%);border:2px solid #030303;color:#f8fafc;border-radius:999px;box-shadow:0 5px 12px rgba(0,0,0,0.16),inset 0 1px 1px rgba(255,255,255,0.4);}`,
      styles: [
        { name: 'Bubble Red', label: 'BB1', className: 'mkt-bubble-red', trigger: { open: '~BB1~', close: '~BB1~' } },
        { name: 'Bubble Coral', label: 'BB2', className: 'mkt-bubble-coral', trigger: { open: '~BB2~', close: '~BB2~' } },
        { name: 'Bubble Orange', label: 'BB3', className: 'mkt-bubble-orange', trigger: { open: '~BB3~', close: '~BB3~' } },
        { name: 'Bubble Amber', label: 'BB4', className: 'mkt-bubble-amber', trigger: { open: '~BB4~', close: '~BB4~' } },
        { name: 'Bubble Gold', label: 'BB5', className: 'mkt-bubble-gold', trigger: { open: '~BB5~', close: '~BB5~' } },
        { name: 'Bubble Yellow', label: 'BB6', className: 'mkt-bubble-yellow', trigger: { open: '~BB6~', close: '~BB6~' } },
        { name: 'Bubble Cream', label: 'BB7', className: 'mkt-bubble-cream', trigger: { open: '~BB7~', close: '~BB7~' } },
        { name: 'Bubble Lime', label: 'BB8', className: 'mkt-bubble-lime', trigger: { open: '~BB8~', close: '~BB8~' } },
        { name: 'Bubble Olive', label: 'BB9', className: 'mkt-bubble-olive', trigger: { open: '~BB9~', close: '~BB9~' } },
        { name: 'Bubble Green', label: 'BB10', className: 'mkt-bubble-green', trigger: { open: '~BB10~', close: '~BB10~' } },
        { name: 'Bubble Emerald', label: 'BB11', className: 'mkt-bubble-emerald', trigger: { open: '~BB11~', close: '~BB11~' } },
        { name: 'Bubble Mint', label: 'BB12', className: 'mkt-bubble-mint', trigger: { open: '~BB12~', close: '~BB12~' } },
        { name: 'Bubble Teal', label: 'BB13', className: 'mkt-bubble-teal', trigger: { open: '~BB13~', close: '~BB13~' } },
        { name: 'Bubble Turquoise', label: 'BB14', className: 'mkt-bubble-turquoise', trigger: { open: '~BB14~', close: '~BB14~' } },
        { name: 'Bubble Cyan', label: 'BB15', className: 'mkt-bubble-cyan', trigger: { open: '~BB15~', close: '~BB15~' } },
        { name: 'Bubble Sky', label: 'BB16', className: 'mkt-bubble-sky', trigger: { open: '~BB16~', close: '~BB16~' } },
        { name: 'Bubble Blue', label: 'BB17', className: 'mkt-bubble-blue', trigger: { open: '~BB17~', close: '~BB17~' } },
        { name: 'Bubble Navy', label: 'BB18', className: 'mkt-bubble-navy', trigger: { open: '~BB18~', close: '~BB18~' } },
        { name: 'Bubble Indigo', label: 'BB19', className: 'mkt-bubble-indigo', trigger: { open: '~BB19~', close: '~BB19~' } },
        { name: 'Bubble Violet', label: 'BB20', className: 'mkt-bubble-violet', trigger: { open: '~BB20~', close: '~BB20~' } },
        { name: 'Bubble Purple', label: 'BB21', className: 'mkt-bubble-purple', trigger: { open: '~BB21~', close: '~BB21~' } },
        { name: 'Bubble Lavender', label: 'BB22', className: 'mkt-bubble-lavender', trigger: { open: '~BB22~', close: '~BB22~' } },
        { name: 'Bubble Fuchsia', label: 'BB23', className: 'mkt-bubble-fuchsia', trigger: { open: '~BB23~', close: '~BB23~' } },
        { name: 'Bubble Pink', label: 'BB24', className: 'mkt-bubble-pink', trigger: { open: '~BB24~', close: '~BB24~' } },
        { name: 'Bubble Rose', label: 'BB25', className: 'mkt-bubble-rose', trigger: { open: '~BB25~', close: '~BB25~' } },
        { name: 'Bubble Brown', label: 'BB26', className: 'mkt-bubble-brown', trigger: { open: '~BB26~', close: '~BB26~' } },
        { name: 'Bubble White', label: 'BB27', className: 'mkt-bubble-white', trigger: { open: '~BB27~', close: '~BB27~' } },
        { name: 'Bubble Fog', label: 'BB28', className: 'mkt-bubble-fog', trigger: { open: '~BB28~', close: '~BB28~' } },
        { name: 'Bubble Slate', label: 'BB29', className: 'mkt-bubble-slate', trigger: { open: '~BB29~', close: '~BB29~' } },
        { name: 'Bubble Black', label: 'BB30', className: 'mkt-bubble-black', trigger: { open: '~BB30~', close: '~BB30~' } },
      ]
    },
    {
      id: 'icon-picker',
      name: 'Icon Picker',
      category: 'utilities',
      kind: 'utility',
      version: '1.0.0',
      image: 'IconPicker.png',
      description: 'Icon button on the top format bar! Opens a popup of insertable glyphs — click one to drop it at your caret.',
      previewHTML: '<div style="display:flex;gap:6px;justify-content:center;font-size:14px;color:#0369a1;"><span>\u2605</span><span>\u2665</span><span>\u2713</span><span>\u2715</span></div>',
      css: `.mkt-icon-wrap{position:relative;display:inline-flex;}.mkt-icon-wrap #mkt-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid #7dd3fc;background:linear-gradient(180deg,#ffffff 0%,#e0f2fe 100%);color:#0369a1;cursor:pointer;box-shadow:0 2px 6px rgba(2,132,199,0.2),inset 0 1px 0 #fff;}#mkt-icon-btn svg{width:18px;height:18px;}#mkt-icon-btn:hover{filter:brightness(1.05);}#mkt-icon-popup{position:absolute;top:calc(100% + 8px);left:0;z-index:200;background:linear-gradient(180deg,rgba(255,255,255,0.97) 0%,rgba(240,249,255,0.95) 100%);border:1px solid #7dd3fc;border-radius:12px;padding:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;box-shadow:0 8px 24px rgba(2,132,199,0.25),inset 0 1px 0 #fff;max-height:240px;overflow-y:auto;}.mkt-icon-head{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;color:#0369a1;font-family:'JetBrains Mono',monospace;}.mkt-icon-x{background:rgba(2,132,199,0.1);border:1px solid #7dd3fc;border-radius:6px;color:#0369a1;font-size:10px;font-weight:800;cursor:pointer;padding:1px 7px;}.mkt-icon-item{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:8px;border:1px solid #bae6fd;background:rgba(255,255,255,0.7);color:#0369a1;cursor:pointer;}.mkt-icon-item:hover{background:#e0f2fe;border-color:#38bdf8;}.mkt-icon-item svg{width:22px;height:22px;}.mkt-icon-glyph{display:inline-flex;width:1.1em;height:1.1em;vertical-align:-0.15em;line-height:1;}.mkt-icon-glyph svg{width:100%;height:100%;}`,
      init: function () { mktIconInit(); },
      teardown: function () { mktIconTeardown(); },
      action: function () { mktIconToggle(); },
      actionLabel: 'Open'
    },
    {
      id: 'word-counter',
      name: 'Word Counter',
      category: 'utilities',
      kind: 'utility',
      version: '1.0.1',
      image: 'WordCounter.png',
      description: 'Live floating word + character count bubble docked to the canvas.',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#0369a1;background:#e0f2fe;border:1px solid #38bdf8;border-radius:20px;padding:3px 12px;">128 words · 842 chars</span>',
      init: function () {
        const wrapper = document.querySelector('.workspace-viewport-wrapper');
        const canvas = document.getElementById('wysiwyg-canvas');
        if (!wrapper || !canvas || document.getElementById('mkt-wordcount')) return;
        wrapper.style.position = 'relative';
        const badge = document.createElement('div');
        badge.id = 'mkt-wordcount';
        badge.textContent = '0 words · 0 chars';
        wrapper.appendChild(badge);
        const update = function () {
          const text = ((canvas.innerText || canvas.textContent) || '').trim();
          const words = text ? text.split(/\s+/).length : 0;
          badge.textContent = words + ' words · ' + text.length + ' chars';
        };
        badge._mktUpdate = update;
        canvas.addEventListener('input', update);
        update();
      },
      teardown: function () {
        const badge = document.getElementById('mkt-wordcount');
        const canvas = document.getElementById('wysiwyg-canvas');
        if (badge && canvas && badge._mktUpdate) canvas.removeEventListener('input', badge._mktUpdate);
        if (badge) badge.remove();
      },
      action: function () {
        const badge = document.getElementById('mkt-wordcount');
        if (badge) { badge.style.display = badge.style.display === 'none' ? '' : 'none'; }
      },
      actionLabel: 'Toggle'
    },
    {
      id: 'timestamp-inserter',
      name: 'Timestamp Inserter',
      category: 'utilities',
      kind: 'utility',
      version: '1.0.0',
      image: 'TimestampInserter.png',
      description: 'Adds a ribbon button + marketplace shortcut to drop a timestamp at the caret.',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#92400e;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:4px 10px;">⏱ 09/19 12:00</span>',
      init: function () {
        const bar = document.getElementById('top-format-bar');
        if (!bar || document.getElementById('mkt-timestamp-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'mkt-timestamp-btn';
        btn.type = 'button';
        btn.className = 'mkt-util-btn';
        btn.textContent = '⏱ Time';
        btn.title = 'Insert timestamp at cursor';
        btn.addEventListener('click', function () { insertTimestampAtCaret(); });
        bar.appendChild(btn);
      },
      teardown: function () {
        const btn = document.getElementById('mkt-timestamp-btn');
        if (btn) btn.remove();
      },
      action: function () { insertTimestampAtCaret(); },
      actionLabel: 'Insert now'
    },
    {
      id: 'case-switcher',
      name: 'Case Switcher',
      category: 'utilities',
      kind: 'utility',
      version: '1.0.0',
      image: 'CaseSwitcher.png',
      description: 'Adds a ribbon button that cycles your selection through UPPER, lower, then Title Case!',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#92400e;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:4px 10px;">Aa</span>',
      init: function () {
        const bar = document.getElementById('top-format-bar');
        if (!bar || document.getElementById('mkt-case-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'mkt-case-btn';
        btn.type = 'button';
        btn.className = 'mkt-util-btn';
        btn.textContent = 'Aa';
        btn.title = 'Cycle selection case: UPPER, lower, Title';
        btn.addEventListener('click', function () { mktCycleCase(); });
        bar.appendChild(btn);
      },
      teardown: function () {
        const btn = document.getElementById('mkt-case-btn');
        if (btn) btn.remove();
      },
      action: function () { mktCycleCase(); },
      actionLabel: 'Cycle case'
    },
    {
      id: 'document-stats',
      name: 'Document Stats',
      category: 'utilities',
      kind: 'utility',
      version: '1.0.0',
      image: 'DocumentStats.png',
      description: 'Corner chip that opens live stats: reading time, per-format counts, and more!',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#0369a1;background:#e0f2fe;border:1px solid #38bdf8;border-radius:20px;padding:3px 12px;">Stats</span>',
      init: function () { mktStatsInit(); },
      teardown: function () { mktStatsTeardown(); },
      action: function () { mktStatsToggle(); },
      actionLabel: 'Open'
    },
    {
      id: 'dark-canvas',
      name: 'Midnight Canvas Theme',
      category: 'themes',
      kind: 'theme',
      version: '1.0.0',
      image: 'MidnightCanvas.png',
      description: 'Dark slate canvas theme. Easy on the eyes for night writing.',
      themeClass: 'mkt-theme-dark',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#e2e8f0;background:#0f172a;border:1px solid #475569;border-radius:8px;padding:4px 12px;">🌙 Midnight</span>'
    },
    {
      id: 'sepia-paper',
      name: 'Sepia Paper Theme',
      category: 'themes',
      kind: 'theme',
      version: '1.0.0',
      image: 'SepiaPaper.png',
      description: 'Warm parchment canvas theme for journaling and long reads.',
      themeClass: 'mkt-theme-sepia',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#57534e;background:#fef3c7;border:1px solid #d6c48a;border-radius:8px;padding:4px 12px;">📜 Sepia</span>'
    },
    {
      id: 'aqua-breeze',
      name: 'Aqua Breeze Theme',
      category: 'themes',
      kind: 'theme',
      version: '1.0.0',
      image: 'AquaBreeze.png',
      description: 'Cool light-blue canvas theme. Fresh ocean air for your words!',
      themeClass: 'mkt-theme-aqua',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#0c4a6e;background:#e0f2fe;border:1px solid #38bdf8;border-radius:8px;padding:4px 12px;">🌊 Aqua</span>'
    },
    {
      id: 'ember-orange',
      name: 'Ember Orange Theme',
      category: 'themes',
      kind: 'theme',
      version: '1.0.0',
      image: 'EmberOrange.png',
      description: 'Warm ember-orange canvas theme. Cozy campfire glow for late writes!',
      themeClass: 'mkt-theme-ember',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#7c2d12;background:#ffedd5;border:1px solid #fb923c;border-radius:8px;padding:4px 12px;">🔥 Ember</span>'
    },
    {
      id: 'mint-meadow',
      name: 'Mint Meadow Theme',
      category: 'themes',
      kind: 'theme',
      version: '1.0.0',
      image: 'MintMeadow.png',
      description: 'Fresh mint-green canvas theme. Crisp morning air for your words!',
      themeClass: 'mkt-theme-mint',
      previewHTML: '<span style="font-size:11px;font-weight:800;color:#064e3b;background:#d1fae5;border:1px solid #34d399;border-radius:8px;padding:4px 12px;">🌿 Mint</span>'
    }
  ];

  /* ---------------- localStorage helpers ---------------- */
  /* ---------------- Icon Picker engine ---------------- */
  const MKT_ICONS = [
    { name: 'Star', body: '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/>' },
    { name: 'Heart', body: '<path d="M12 21C7 16.5 3 13 3 8.8 3 6 5.2 4 7.8 4c1.7 0 3.2.9 4.2 2.3C13 4.9 14.5 4 16.2 4 18.8 4 21 6 21 8.8c0 4.2-4 7.7-9 12.2z"/>' },
    { name: 'Check', body: '<path d="M4 12.5l5 5L20 6.5"/>' },
    { name: 'Cross', body: '<path d="M6 6l12 12M18 6L6 18"/>' },
    { name: 'Plus', body: '<path d="M12 5v14M5 12h14"/>' },
    { name: 'Minus', body: '<path d="M5 12h14"/>' },
    { name: 'Arrow Right', body: '<path d="M4 12h16m-6-6l6 6-6 6"/>' },
    { name: 'Arrow Left', body: '<path d="M20 12H4m6-6l-6 6 6 6"/>' },
    { name: 'Home', body: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>' },
    { name: 'Gear', body: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>' },
    { name: 'Bell', body: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0"/>' },
    { name: 'Search', body: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>' },
    { name: 'Info', body: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>' },
    { name: 'Warning', body: '<path d="M12 3L2 21h20zM12 10v5M12 18v.1"/>' },
    { name: 'Lock', body: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>' },
    { name: 'Flag', body: '<path d="M5 21V4m0 1h13l-3 4 3 4H5"/>' }
  ];

  function mktIconSVG(body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  function mktIconToggle() {
    const pop = document.getElementById('mkt-icon-popup');
    if (!pop) return;
    pop.style.display = (pop.style.display === 'none') ? '' : 'none';
  }

  function mktIconInsert(name) {
    const canvas = document.getElementById('wysiwyg-canvas');
    let selection = null;
    try { selection = window.getSelection(); } catch (e) { return; }
    if (!canvas || !selection || !selection.rangeCount) return;
    try { if (!canvas.contains(selection.anchorNode)) return; } catch (e) { return; }
    const icon = MKT_ICONS.find(function (ic) { return ic.name === name; });
    if (!icon) return;
    if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08);
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'mkt-icon-glyph';
    span.setAttribute('data-icon', name);
    span.innerHTML = mktIconSVG(icon.body);
    try {
      if (!selection.isCollapsed && typeof range.collapse === 'function') range.collapse(true);
      range.insertNode(span);
    } catch (e) { return; }
    try {
      const nr = document.createRange();
      if (typeof nr.setStartAfter === 'function') {
        nr.setStartAfter(span);
        nr.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nr);
      }
    } catch (e) {}
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
  }

  function mktIconInit() {
    const bar = document.getElementById('top-format-bar');
    if (!bar || document.getElementById('mkt-icon-btn')) return;
    const wrap = document.createElement('span');
    wrap.className = 'mkt-icon-wrap';
    wrap.id = 'mkt-icon-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'mkt-icon-btn';
    btn.title = 'Insert icon';
    btn.innerHTML = mktIconSVG('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>');
    const pop = document.createElement('div');
    pop.id = 'mkt-icon-popup';
    pop.style.display = 'none';
    const head = document.createElement('div');
    head.className = 'mkt-icon-head';
    const cap = document.createElement('span');
    cap.textContent = 'Icons';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'mkt-icon-x';
    x.textContent = 'X';
    head.appendChild(cap);
    head.appendChild(x);
    pop.appendChild(head);
    MKT_ICONS.forEach(function (ic) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mkt-icon-item';
      b.title = ic.name;
      b.setAttribute('data-icon', ic.name);
      b.innerHTML = mktIconSVG(ic.body);
      pop.appendChild(b);
    });
    btn.addEventListener('click', function () {
      if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.08);
      mktIconToggle();
    });
    x.addEventListener('click', function () { pop.style.display = 'none'; });
    wrap.addEventListener('mousedown', function (e) {
      if (e.target && e.target.closest && e.target.closest('button')) e.preventDefault();
    });
    pop.addEventListener('click', function (e) {
      const t = e.target;
      const item = (t && t.closest) ? t.closest('[data-icon]') : ((t && t.getAttribute && t.getAttribute('data-icon')) ? t : null);
      if (!item) return;
      mktIconInsert(item.getAttribute('data-icon'));
    });
    const outside = function (e) {
      if (!wrap.contains(e.target)) pop.style.display = 'none';
    };
    wrap._mktOutside = outside;
    document.addEventListener('mousedown', outside);
    wrap.appendChild(btn);
    wrap.appendChild(pop);
    bar.appendChild(wrap);
  }

  function mktIconTeardown() {
    const wrap = document.getElementById('mkt-icon-wrap');
    if (wrap) {
      if (wrap._mktOutside && document.removeEventListener) {
        try { document.removeEventListener('mousedown', wrap._mktOutside); } catch (e) {}
      }
      wrap.remove();
    }
  }

  function mktGetInstalled() {
    try {
      const raw = localStorage.getItem(MKT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return []; }
  }

  function mktSaveInstalled(ids) {
    try { localStorage.setItem(MKT_STORAGE_KEY, JSON.stringify(ids)); } catch (e) {}
  }

  function mktIsInstalled(id) {
    return mktGetInstalled().indexOf(id) !== -1;
  }

  function mktGetActiveTheme() {
    try { return localStorage.getItem(MKT_THEME_ACTIVE_KEY) || ''; } catch (e) { return ''; }
  }

  function mktSetActiveTheme(id) {
    try {
      if (!id) localStorage.removeItem(MKT_THEME_ACTIVE_KEY);
      else localStorage.setItem(MKT_THEME_ACTIVE_KEY, id);
    } catch (e) {}
  }

  function findExt(id) {
    return MARKETPLACE_CATALOG.find(function (e) { return e.id === id; });
  }

  /* ---------------- Apply / Remove ---------------- */
  function injectCSS(ext) {
    if (!ext.css) return;
    if (document.getElementById('mkt-style-' + ext.id)) return;
    const tag = document.createElement('style');
    tag.id = 'mkt-style-' + ext.id;
    tag.textContent = ext.css;
    document.head.appendChild(tag);
  }

  function removeCSS(ext) {
    const tag = document.getElementById('mkt-style-' + ext.id);
    if (tag) tag.remove();
  }

  function ensureToolbarTray() {
    // The tray is now the static inbox dropdown menu in index.html —
    // chips are never appended loose on the toolbar bar anymore.
    return document.getElementById('mkt-styles-tray');
  }

  // The inbox dropdown button only shows while downloads exist!
  function updateInboxVisibility() {
    const dd = document.getElementById('mkt-inbox-dropdown');
    if (!dd) return;
    const tray = document.getElementById('mkt-styles-tray');
    const hasChips = !!(tray && tray.querySelector('[data-mkt-chip]'));
    dd.style.display = hasChips ? '' : 'none';
    if (!hasChips) dd.classList.remove('active');
  }

  /* Unify single styles + multi-style packs into one variant list! */
  function getStyleVariants(ext) {
    if (ext.kind === 'style-pack' && Array.isArray(ext.styles)) return ext.styles;
    if (ext.kind === 'toolbar-style' && ext.toolbarClass) {
      return [{ name: ext.name, label: ext.toolbarLabel, className: ext.toolbarClass, trigger: ext.trigger }];
    }
    return [];
  }

  function addToolbarChip(ext) {
    const variants = getStyleVariants(ext);
    if (!variants.length) return;
    const tray = ensureToolbarTray();
    if (!tray) return;
    variants.forEach(function (v) {
      const chipKey = ext.id + ':' + v.className;
      if (tray.querySelector('[data-mkt-chip="' + chipKey + '"]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      // Tile wears the style it represents, just like the built-in swatches!
      btn.className = 'chip-swatch-item ' + v.className;
      btn.setAttribute('data-mkt-chip', chipKey);
      btn.setAttribute('data-class', v.className);
      btn.title = (v.name || ext.name) + (v.trigger ? ' (' + v.trigger.open + 'text' + v.trigger.close + ')' : '');
      btn.textContent = v.label || 'MKT';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        applyClassToSelection(v.className);
        // Collapse the inbox menu after picking a style!
        const dd = document.getElementById('mkt-inbox-dropdown');
        if (dd) dd.classList.remove('active');
        tray.style.display = '';
      });
      tray.appendChild(btn);
    });
    updateInboxVisibility();
  }

  function removeToolbarChip(ext) {
    const tray = document.getElementById('mkt-styles-tray');
    if (tray) {
      tray.querySelectorAll('[data-mkt-chip]').forEach(function (btn) {
        const key = btn.getAttribute('data-mkt-chip') || '';
        if (key === ext.id || key.indexOf(ext.id + ':') === 0) btn.remove();
      });
      updateInboxVisibility();
    }
  }

  function applyThemeClass(ext, on) {
    const canvas = document.getElementById('wysiwyg-canvas');
    if (!canvas || !ext.themeClass) return;
    if (on) {
      MARKETPLACE_CATALOG.forEach(function (e) {
        if (e.kind === 'theme' && e.themeClass) canvas.classList.remove(e.themeClass);
      });
      canvas.classList.add(ext.themeClass);
      mktSetActiveTheme(ext.id);
    } else {
      canvas.classList.remove(ext.themeClass);
      if (mktGetActiveTheme() === ext.id) mktSetActiveTheme('');
    }
  }

  function applyExtension(ext) {
    if (ext.css) injectCSS(ext);
    if (ext.kind === 'toolbar-style' || ext.kind === 'style-pack') addToolbarChip(ext);
    else if (ext.kind === 'utility' && typeof ext.init === 'function') { try { ext.init(); } catch (e) {} }
    else if (ext.kind === 'theme') {
      if (mktGetActiveTheme() === ext.id) {
        const canvas = document.getElementById('wysiwyg-canvas');
        if (canvas) canvas.classList.add(ext.themeClass);
      }
    }
  }

  function removeExtension(ext) {
    if (ext.css) removeCSS(ext);
    if (ext.kind === 'toolbar-style' || ext.kind === 'style-pack') removeToolbarChip(ext);
    else if (ext.kind === 'utility' && typeof ext.teardown === 'function') { try { ext.teardown(); } catch (e) {} }
    else if (ext.kind === 'theme') applyThemeClass(ext, false);
  }

  /* ---------------- Install / Uninstall (persisted) ---------------- */
  function mktInstall(id) {
    const ext = findExt(id);
    if (!ext || mktIsInstalled(id)) return;
    const ids = mktGetInstalled();
    ids.push(id);
    mktSaveInstalled(ids);
    applyExtension(ext);
    if (ext.kind === 'theme') applyThemeClass(ext, true);
    if (typeof playAeroClickSound === 'function') playAeroClickSound(750, 0.12);
    renderMarketplace();
    renderUtilDock();
    mktMissingRender();
    notifySettings();
  }

  function mktUninstall(id) {
    const ext = findExt(id);
    if (!ext || !mktIsInstalled(id)) return;
    mktSaveInstalled(mktGetInstalled().filter(function (x) { return x !== id; }));
    removeExtension(ext);
    if (typeof playAeroClickSound === 'function') playAeroClickSound(350, 0.1);
    renderMarketplace();
    renderUtilDock();
    mktMissingRender();
    notifySettings();
  }

  /* ---------------- Theme controls for the Settings menu! ---------------- */
  function mktApplyThemeId(id) {
    if (!id) {
      if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.08);
      const cur = mktGetActiveTheme();
      if (cur) {
        const curExt = findExt(cur);
        if (curExt) applyThemeClass(curExt, false);
      }
      mktSetActiveTheme('');
      renderMarketplace();
      notifySettings();
      return;
    }
    const ext = findExt(id);
    if (!ext || ext.kind !== 'theme') return;
    if (!mktIsInstalled(id)) {
      const ids = mktGetInstalled();
      ids.push(id);
      mktSaveInstalled(ids);
      applyExtension(ext);
    }
    applyThemeClass(ext, true);
    if (typeof playAeroClickSound === 'function') playAeroClickSound(750, 0.12);
    renderMarketplace();
    notifySettings();
  }

  function mktThemeList() {
    return MARKETPLACE_CATALOG.filter(function (e) { return e.kind === 'theme'; }).map(function (e) {
      return { id: e.id, name: e.name, description: e.description, version: e.version, installed: mktIsInstalled(e.id) };
    });
  }

  function notifySettings() {
    try {
      if (window.WriteoutSettings && typeof window.WriteoutSettings.refresh === 'function') window.WriteoutSettings.refresh();
    } catch (e) {}
  }

  // Missing-extension watchdog: warns when the doc uses styles you haven't installed!
  var mktMissingTimer = null;

  function mktMissingScan() {
    const canvas = document.getElementById('wysiwyg-canvas');
    if (!canvas || !canvas.querySelectorAll) return [];
    const extByClass = {};
    MARKETPLACE_CATALOG.forEach(function (ext) {
      getStyleVariants(ext).forEach(function (v) {
        if (v.className) extByClass[v.className] = ext.id;
      });
    });
    const installed = mktGetInstalled();
    const missing = {};
    canvas.querySelectorAll('span[class]').forEach(function (el) {
      String(el.className || '').split(/\s+/).forEach(function (cls) {
        const id = extByClass[cls];
        if (id && installed.indexOf(id) === -1) missing[id] = true;
      });
    });
    return Object.keys(missing);
  }

  function mktMissingRender() {
    let wrapper = null;
    try { wrapper = document.querySelector('.workspace-viewport-wrapper'); } catch (e) { return; }
    if (!wrapper) return;
    const missing = mktMissingScan();
    let chip = null;
    try { chip = document.getElementById('mkt-missing-chip'); } catch (e) {}
    if (!missing.length) {
      if (chip) chip.remove();
      return;
    }
    if (!chip) {
      chip = document.createElement('button');
      chip.id = 'mkt-missing-chip';
      chip.type = 'button';
      chip.title = 'Open the Marketplace to get these styles!';
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        openMarketplace();
      });
      wrapper.appendChild(chip);
    }
    chip.textContent = missing.length + (missing.length === 1 ? ' style needs' : ' styles need') + ' an extension!';
    chip.insertAdjacentHTML('afterbegin', MKT_ICON_WARN + ' ');
  }

  function mktMissingRefresh() {
    if (mktMissingTimer) {
      try { clearTimeout(mktMissingTimer); } catch (e) {}
      mktMissingTimer = null;
    }
    mktMissingTimer = setTimeout(function () {
      mktMissingTimer = null;
      mktMissingRender();
    }, 150);
  }


  /* ---------------- Use installed extensions ---------------- */
  function applyClassToSelection(className) {
    const canvas = document.getElementById('wysiwyg-canvas');
    const selection = window.getSelection();
    if (typeof playAeroClickSound === 'function') playAeroClickSound(700, 0.08);
    if (!canvas || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (selection.isCollapsed || !canvas.contains(range.commonAncestorContainer)) return;
    const span = document.createElement('span');
    span.className = className;
    span.setAttribute('spellcheck', 'false');
    try {
      span.appendChild(range.extractContents());
    } catch (e) { span.textContent = selection.toString(); }
    if (!span.textContent) span.textContent = 'Styled';
    range.insertNode(span);
    selection.removeAllRanges();
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
    const toolbar = document.getElementById('aero-selection-toolbar');
    if (toolbar) toolbar.style.display = 'none';
  }

  /* Extension utilities docked in the small bottom sidebar! */
  function renderUtilDock() {
    const dock = document.getElementById('sidebar-util-dock');
    if (!dock) return;
    dock.innerHTML = '';
    const installed = mktGetInstalled();
    MARKETPLACE_CATALOG.forEach(function (ext) {
      if (ext.category !== 'utilities' || installed.indexOf(ext.id) === -1) return;
      if (typeof ext.action !== 'function') return;
      if (ext.id === 'timestamp-inserter') return; // Inserting lives in the Insert menu now!
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebar-util-btn';
      btn.textContent = ext.actionLabel || ext.name;
      btn.title = ext.name;
      btn.setAttribute('data-util', ext.id);
      btn.addEventListener('click', function () {
        if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.08);
        try { ext.action(); } catch (e) {}
      });
      dock.appendChild(btn);
    });
  }

  function mktDocStats() {
    const canvas = document.getElementById('wysiwyg-canvas');
    if (!canvas) return null;
    const text = ((canvas.innerText || canvas.textContent) || '');
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const formats = {};
    canvas.querySelectorAll('span[class], b, strong, i, em, u, strike, s, code, a').forEach(function (el) {
      let key = null;
      if (el.tagName === 'SPAN') {
        if (!el.className) return;
        key = el.className;
      } else {
        key = el.tagName.toLowerCase();
      }
      formats[key] = (formats[key] || 0) + 1;
    });
    return {
      words: words,
      chars: text.length,
      charsNoSpaces: text.replace(/\s/g, '').length,
      lines: canvas.children.length,
      readMins: Math.max(1, Math.ceil(words / 200)),
      formats: formats
    };
  }

  function mktStatsRender() {
    const menu = document.getElementById('mkt-stats-menu');
    const s = mktDocStats();
    if (!menu || !s) return;
    menu.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'mkt-stats-head';
    head.textContent = 'Document Stats';
    menu.appendChild(head);
    const rows = [
      ['words', 'Words', s.words],
      ['chars', 'Characters', s.chars],
      ['nospace', 'No spaces', s.charsNoSpaces],
      ['lines', 'Lines', s.lines],
      ['reading', 'Reading time', s.readMins + ' min']
    ];
    rows.forEach(function (r) {
      const row = document.createElement('div');
      row.className = 'mkt-stats-row';
      row.setAttribute('data-stat', r[0]);
      const k = document.createElement('span');
      k.textContent = r[1];
      const v = document.createElement('b');
      v.className = 'mkt-stats-val';
      v.textContent = r[2];
      row.appendChild(k);
      row.appendChild(v);
      menu.appendChild(row);
    });
    const keys = Object.keys(s.formats).sort(function (a, b) { return s.formats[b] - s.formats[a]; });
    const fhead = document.createElement('div');
    fhead.className = 'mkt-stats-head';
    fhead.textContent = 'Formats (' + keys.length + ')';
    menu.appendChild(fhead);
    if (!keys.length) {
      const none = document.createElement('div');
      none.className = 'mkt-stats-row';
      none.textContent = 'No formatting yet.';
      menu.appendChild(none);
    }
    keys.forEach(function (k) {
      const row = document.createElement('div');
      row.className = 'mkt-stats-row mkt-stats-fmt';
      row.setAttribute('data-fmt', k);
      const name = document.createElement('span');
      name.textContent = k;
      const v = document.createElement('b');
      v.className = 'mkt-stats-val';
      v.textContent = '×' + s.formats[k];
      row.appendChild(name);
      row.appendChild(v);
      menu.appendChild(row);
    });
  }

  function mktStatsToggle() {
    const wrapper = document.querySelector('.workspace-viewport-wrapper');
    if (!wrapper) return;
    const old = document.getElementById('mkt-stats-menu');
    if (old) { old.remove(); return; }
    if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.08);
    const menu = document.createElement('div');
    menu.id = 'mkt-stats-menu';
    wrapper.appendChild(menu);
    mktStatsRender();
  }

  function mktStatsInit() {
    const wrapper = document.querySelector('.workspace-viewport-wrapper');
    const canvas = document.getElementById('wysiwyg-canvas');
    if (!wrapper || !canvas || document.getElementById('mkt-stats-chip')) return;
    wrapper.style.position = 'relative';
    const chip = document.createElement('button');
    chip.id = 'mkt-stats-chip';
    chip.type = 'button';
    chip.textContent = 'Stats';
    chip.insertAdjacentHTML('afterbegin', MKT_ICON_STATS + ' ');
    chip.title = 'Open document statistics';
    chip.addEventListener('click', function (e) {
      e.stopPropagation();
      mktStatsToggle();
    });
    const refresh = function () {
      if (document.getElementById('mkt-stats-menu')) mktStatsRender();
    };
    chip._mktRefresh = refresh;
    canvas.addEventListener('input', refresh);
    wrapper.appendChild(chip);
  }

  function mktStatsTeardown() {
    const chip = document.getElementById('mkt-stats-chip');
    const menu = document.getElementById('mkt-stats-menu');
    const canvas = document.getElementById('wysiwyg-canvas');
    if (chip && canvas && chip._mktRefresh) canvas.removeEventListener('input', chip._mktRefresh);
    if (menu) menu.remove();
    if (chip) chip.remove();
  }

  var mktCaseMode = 0;

  function mktCycleCase() {
    const canvas = document.getElementById('wysiwyg-canvas');
    if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.08);
    if (!canvas) return;
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!canvas.contains(range.commonAncestorContainer)) return;
    const text = selection.toString();
    if (!text) return;
    let out = text;
    if (mktCaseMode === 0) out = text.toUpperCase();
    else if (mktCaseMode === 1) out = text.toLowerCase();
    else out = text.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    mktCaseMode = (mktCaseMode + 1) % 3;
    range.deleteContents();
    const node = document.createTextNode(out);
    range.insertNode(node);
    const nr = document.createRange();
    nr.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(nr);
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
  }

  function insertTimestampAtCaret() {
    const canvas = document.getElementById('wysiwyg-canvas');
    if (typeof playAeroClickSound === 'function') playAeroClickSound(650, 0.08);
    if (!canvas) return;
    canvas.focus();
    const now = new Date();
    const stamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      document.execCommand('insertText', false, '⏱ ' + stamp + ' ');
    } catch (e) {
      const selection = window.getSelection();
      if (selection.rangeCount) {
        const node = document.createTextNode('⏱ ' + stamp + ' ');
        selection.getRangeAt(0).insertNode(node);
      }
    }
    if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
  }

  /* Marketplace typed-trigger interceptor: ~CODE~text~CODE~ + space */
  function handleMarketplaceTriggers(e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const installed = mktGetInstalled();
    if (!installed.length) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    const caret = range.startOffset;
    const line = textNode.nodeValue.substring(0, caret);
    const activeVariants = [];
    for (const id of installed) {
      const ext = findExt(id);
      if (!ext) continue;
      getStyleVariants(ext).forEach(function (v) { if (v.trigger) activeVariants.push(v); });
    }
    for (const v of activeVariants) {
      const open = v.trigger.open, close = v.trigger.close;
      const openIdx = line.indexOf(open);
      if (openIdx === -1) continue;
      const closeIdx = line.indexOf(close, openIdx + open.length);
      if (closeIdx === -1) continue;
      e.preventDefault();
      const before = line.substring(0, openIdx);
      const inner = line.substring(openIdx + open.length, closeIdx).trim();
      const after = line.substring(closeIdx + close.length);
      textNode.nodeValue = before;
      const span = document.createElement('span');
      span.className = v.className;
      span.setAttribute('spellcheck', 'false');
      span.textContent = inner || 'Styled';
      range.insertNode(span);
      const tail = document.createTextNode(after + (e.key === ' ' ? ' ' : '\n'));
      span.parentNode.insertBefore(tail, span.nextSibling);
      const nr = document.createRange();
      nr.setStart(tail, Math.min(1, tail.length));
      nr.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nr);
      if (typeof playAeroClickSound === 'function') playAeroClickSound(850, 0.1);
      if (typeof autoSaveCanvasContent === 'function') autoSaveCanvasContent();
      return;
    }
  }

  /* ---------------- Rendering ---------------- */
  let activeCategory = 'all';
  let searchQuery = '';
  let hideInstalled = false; // "New only" toggle!
  try { hideInstalled = localStorage.getItem('writeout_marketplace_hide_installed') === '1'; } catch (e) {}
  let mktDetailId = null; // null = list view, otherwise the open extension page!

  // Temporary colored-square avatar until real artwork lands!
  function mktAvatarColor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return 'linear-gradient(135deg, hsl(' + h + ', 80%, 65%) 0%, hsl(' + ((h + 40) % 360) + ', 75%, 45%) 100%)';
  }

  // Avatar box: real image when the extension ships one, colored square otherwise!
  function buildAvatar(ext, sizeClass) {
    const avatar = document.createElement('div');
    avatar.className = ('mkt-avatar ' + (sizeClass || '')).trim();
    if (ext.image) {
      const img = document.createElement('img');
      img.src = ext.image;
      img.alt = ext.name;
      avatar.appendChild(img);
    } else {
      avatar.style.background = mktAvatarColor(ext.id);
    }
    return avatar;
  }

  function openExtensionPage(id) {
    mktDetailId = id;
    if (typeof playAeroClickSound === 'function') playAeroClickSound(600, 0.08);
    renderMarketplace();
  }

  function closeExtensionPage() {
    mktDetailId = null;
    renderMarketplace();
  }

  function updatePill() {
    const pill = document.getElementById('mkt-installed-count');
    if (pill) pill.textContent = mktGetInstalled().length + ' installed';
  }

  function renderMarketplace() {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;
    updatePill();
    const searchRow = document.querySelector('.mkt-toolbar-row');
    const tabsRow = document.querySelector('.mkt-tabs');
    if (mktDetailId) {
      if (searchRow) searchRow.style.display = 'none';
      if (tabsRow) tabsRow.style.display = 'none';
      renderDetailPage(grid, mktDetailId);
      return;
    }
    if (searchRow) searchRow.style.display = '';
    if (tabsRow) tabsRow.style.display = '';
    const q = searchQuery.trim().toLowerCase();
    const items = MARKETPLACE_CATALOG.filter(function (ext) {
      const matchCat = activeCategory === 'all' || ext.category === activeCategory;
      let hay = (ext.name + ' ' + ext.description + ' ' + ext.id).toLowerCase();
      getStyleVariants(ext).forEach(function (v) { hay += ' ' + (v.name || '') + ' ' + (v.className || ''); });
      const matchQ = !q || hay.includes(q);
      const matchInstalled = !hideInstalled || !mktIsInstalled(ext.id);
      return matchCat && matchQ && matchInstalled;
    });
    grid.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'mkt-empty';
      empty.textContent = 'No extensions found. Try a different search or category.';
      grid.appendChild(empty);
      return;
    }
    items.forEach(function (ext) {
      const installed = mktIsInstalled(ext.id);
      const card = document.createElement('div');
      card.className = 'mkt-card' + (installed ? ' installed' : '');

      // Head row: avatar square on the left, title on the right!
      const head = document.createElement('div');
      head.className = 'mkt-card-head';
      const avatar = buildAvatar(ext, '');
      const titleWrap = document.createElement('div');
      titleWrap.className = 'mkt-card-titles';
      const name = document.createElement('p');
      name.className = 'mkt-card-name';
      name.textContent = ext.name;
      const ver = document.createElement('div');
      ver.className = 'mkt-card-version';
      ver.textContent = 'v' + ext.version;
      titleWrap.appendChild(name);
      titleWrap.appendChild(ver);
      const badge = document.createElement('span');
      badge.className = 'mkt-badge mkt-badge-' + ext.category;
      badge.textContent = ext.category;
      head.appendChild(avatar);
      head.appendChild(titleWrap);
      head.appendChild(badge);

      // Description along the bottom!
      const desc = document.createElement('p');
      desc.className = 'mkt-card-desc';
      desc.textContent = ext.description;

      card.appendChild(head);
      card.appendChild(desc);

      // Clicking the card opens its own page (buttons opt out below)!
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () { openExtensionPage(ext.id); });

      const actions = document.createElement('div');
      actions.className = 'mkt-card-actions';
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'mkt-view-btn';
      viewBtn.textContent = 'View ▸';
      viewBtn.title = 'Open the extension page';
      viewBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openExtensionPage(ext.id);
      });
      actions.appendChild(viewBtn);
      const mainBtn = document.createElement('button');
      mainBtn.type = 'button';
      mainBtn.className = 'mkt-install-btn';
      mainBtn.textContent = installed ? 'Installed' : 'Get Extension';
      mainBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (mktIsInstalled(ext.id)) mktUninstall(ext.id);
        else mktInstall(ext.id);
      });
      actions.appendChild(mainBtn);

      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  // Detail page for a single extension!
  function renderDetailPage(grid, id) {
    const ext = findExt(id);
    grid.innerHTML = '';
    if (!ext) {
      mktDetailId = null;
      renderMarketplace();
      return;
    }
    const installed = mktIsInstalled(ext.id);

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'mkt-back-btn';
    back.textContent = '← All extensions';
    back.addEventListener('click', closeExtensionPage);
    grid.appendChild(back);

    const card = document.createElement('div');
    card.className = 'mkt-card mkt-detail' + (installed ? ' installed' : '');

    const head = document.createElement('div');
    head.className = 'mkt-card-head';
    const avatar = buildAvatar(ext, 'mkt-avatar-lg');
    const titleWrap = document.createElement('div');
    titleWrap.className = 'mkt-card-titles';
    const name = document.createElement('p');
    name.className = 'mkt-card-name';
    name.textContent = ext.name;
    const ver = document.createElement('div');
    ver.className = 'mkt-card-version';
    ver.textContent = 'v' + ext.version;
    titleWrap.appendChild(name);
    titleWrap.appendChild(ver);
    const badge = document.createElement('span');
    badge.className = 'mkt-badge mkt-badge-' + ext.category;
    badge.textContent = ext.category;
    head.appendChild(avatar);
    head.appendChild(titleWrap);
    head.appendChild(badge);
    card.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'mkt-card-desc';
    desc.textContent = ext.description;
    card.appendChild(desc);

    // Style contents replace the old previews!
    if (ext.kind === 'style-pack' && ext.styles) {
      const list = document.createElement('div');
      list.className = 'mkt-style-list';
      ext.styles.forEach(function (s) {
        const row = document.createElement('div');
        row.className = 'mkt-style-row';
        const label = document.createElement('span');
        label.textContent = s.name;
        const code = document.createElement('code');
        code.textContent = s.trigger.open + 'text' + s.trigger.close;
        row.appendChild(label);
        row.appendChild(code);
        list.appendChild(row);
      });
      card.appendChild(list);
    } else if (ext.trigger) {
      const code = document.createElement('div');
      code.className = 'mkt-trigger-code';
      code.innerHTML = 'Type <b>' + ext.trigger.open + 'text' + ext.trigger.close + '</b> + Space';
      card.appendChild(code);
    }

    const actions = document.createElement('div');
    actions.className = 'mkt-card-actions';
    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.className = 'mkt-install-btn';
    mainBtn.textContent = installed ? 'Installed' : 'Get Extension';
    mainBtn.addEventListener('click', function () {
      if (mktIsInstalled(ext.id)) mktUninstall(ext.id);
      else mktInstall(ext.id);
    });
    actions.appendChild(mainBtn);
    card.appendChild(actions);
    grid.appendChild(card);
  }

  /* ---------------- Dialog open/close ---------------- */
  function openMarketplace() {
    if (typeof playAeroClickSound === 'function') playAeroClickSound(750, 0.12);
    mktDetailId = null; // every open starts on the main list!
    const dlg = document.getElementById('marketplace-dialog');
    if (!dlg) return;
    if (dlg.open) { renderMarketplace(); return; } // already open (e.g. double-click) — just refresh
    // Heal stale inline state: older builds could leave display:none behind,
    // which overrides the UA stylesheet and makes showModal() appear to do nothing.
    dlg.removeAttribute('open');
    dlg.style.display = '';
    renderMarketplace();
    try {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    } catch (err) {
      // showModal() throws InvalidStateError if another modal is already open —
      // fall back to a non-modal open so the menu still appears.
      try { dlg.setAttribute('open', ''); } catch (e) {}
    }
  }

  function closeMarketplace() {
    if (typeof playAeroClickSound === 'function') playAeroClickSound(450, 0.08);
    const dlg = document.getElementById('marketplace-dialog');
    if (!dlg) return;
    if (!dlg.open && !dlg.hasAttribute('open')) return; // already closed — do nothing
    try { if (typeof dlg.close === 'function') dlg.close(); } catch (e) {}
    // Never leave inline display styles behind; they would block the next showModal().
    dlg.removeAttribute('open');
    dlg.style.display = '';
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    // Restore installed extensions from localStorage, dropping retired ids!
    const knownIds = mktGetInstalled().filter(function (id) { return !!findExt(id); });
    mktSaveInstalled(knownIds);
    knownIds.forEach(function (id) {
      const ext = findExt(id);
      if (ext) {
        try { applyExtension(ext); } catch (e) {}
        if (ext.kind === 'theme' && mktGetActiveTheme() === id) {
          const canvas = document.getElementById('wysiwyg-canvas');
          if (canvas) canvas.classList.add(ext.themeClass);
        }
      }
    });
    // Show the inbox button only when downloads actually exist!
    updateInboxVisibility();
    renderUtilDock();

    // Missing-styles watchdog: rescan on every canvas mutation!
    mktMissingRender();
    const mktCanvas = document.getElementById('wysiwyg-canvas');
    if (mktCanvas && typeof MutationObserver === 'function') {
      const mktObs = new MutationObserver(function () { mktMissingRefresh(); });
      mktObs.observe(mktCanvas, { childList: true, subtree: true, characterData: true });
    } else if (mktCanvas) {
      mktCanvas.addEventListener('input', mktMissingRefresh);
    }

    const triggerBtn = document.getElementById('marketplace-trigger-btn');
    if (triggerBtn) triggerBtn.addEventListener('click', openMarketplace);

    const closeBtn = document.getElementById('marketplace-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function (e) {
      e.stopPropagation(); // keep the click from reaching the light-dismiss handler below
      closeMarketplace();
    });

    const dlg = document.getElementById('marketplace-dialog');
    if (dlg) {
      // Heal any stale inline state left by older builds.
      dlg.removeAttribute('open');
      dlg.style.display = '';
      // Light-dismiss: a click whose target IS the dialog element itself
      // landed on the ::backdrop (outside the card), so close.
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) closeMarketplace();
      });
      // Native dismiss (Esc key) — make sure no inline state lingers.
      dlg.addEventListener('close', function () {
        dlg.removeAttribute('open');
        dlg.style.display = '';
      });
      dlg.addEventListener('cancel', function () {
        dlg.removeAttribute('open');
        dlg.style.display = '';
      });
    }

    document.querySelectorAll('.mkt-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        const picked = tab.getAttribute('data-cat') || 'all';
        if (picked !== 'all' && activeCategory === picked) {
          // Pressing the active filter again clears back to All!
          activeCategory = 'all';
          document.querySelectorAll('.mkt-tab').forEach(function (t) {
            if ((t.getAttribute('data-cat') || 'all') === 'all') t.classList.add('active');
            else t.classList.remove('active');
          });
        } else {
          document.querySelectorAll('.mkt-tab').forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          activeCategory = picked;
        }
        if (typeof playAeroClickSound === 'function') playAeroClickSound(550, 0.06);
        renderMarketplace();
      });
    });

    const search = document.getElementById('marketplace-search');
    if (search) {
      search.addEventListener('input', function () {
        searchQuery = search.value || '';
        renderMarketplace();
      });
    }

    const hideBox = document.getElementById('marketplace-hide-installed');
    if (hideBox) {
      hideBox.checked = hideInstalled;
      hideBox.addEventListener('change', function () {
        hideInstalled = !!hideBox.checked;
        try {
          if (hideInstalled) localStorage.setItem('writeout_marketplace_hide_installed', '1');
          else localStorage.removeItem('writeout_marketplace_hide_installed');
        } catch (e) {}
        if (typeof playAeroClickSound === 'function') playAeroClickSound(550, 0.06);
        renderMarketplace();
      });
    }

    const resetBtn = document.getElementById('marketplace-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!confirm('Remove all Marketplace extensions?')) return;
        mktGetInstalled().slice().forEach(function (id) {
          const ext = findExt(id);
          if (ext) { try { removeExtension(ext); } catch (e) {} }
        });
        mktSaveInstalled([]);
        mktSetActiveTheme('');
        renderMarketplace();
        renderUtilDock();
      });
    }

    // Typed-trigger support for installed style packs (capture phase, runs alongside core engine)
    const canvas = document.getElementById('wysiwyg-canvas');
    if (canvas) canvas.addEventListener('keydown', handleMarketplaceTriggers, true);

    renderMarketplace();
  });

  // Expose for debugging / inline use
  window.WriteoutMarketplace = {
    install: mktInstall,
    uninstall: mktUninstall,
    installed: mktGetInstalled,
    apply: applyClassToSelection,
    open: openMarketplace,
    close: closeMarketplace,
    view: openExtensionPage,
    back: closeExtensionPage,
    themes: mktThemeList,
    activeTheme: mktGetActiveTheme,
    applyTheme: mktApplyThemeId,
    catalog: MARKETPLACE_CATALOG
  };
})();
