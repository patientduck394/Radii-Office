/* ========================================================
   CABINET — file drawer: upload, cards, share-as-a-file!
   Persisted via localStorage: cabinet_drawer_v1
   Share format: .kc (JSON bundle, legacy .drawer supported)!
   ======================================================== */
(function () {
  'use strict';

  var DRAWER_KEY = 'cabinet_drawer_v1';
  var DRAWER_FORMAT = 'kc';
  var DRAWER_FORMAT_LEGACY = 'cabinet-drawer';

  var drawers = [];
  var activeDrawerId = null;
  var lightboxFileId = null;
  var currentTagFilter = '';
  var currentFolderPath = []; // array of folder IDs representing the path
  // Tracks the in-app file being dragged (dataTransfer can silently drop it)!
  var cabinetDragFileId = null;
  // Tracks the in-app folder being dragged!
  var cabinetDragFolderId = null;
  // Right/middle-button or two-finger drags reorder instead of move/merge!
  var cabinetDragButton = 0;
  var cabinetReorderMode = false;
  // Folder detail accordions open below filenames (persist across renders)!
  var openDetailIds = {};
  // Armed Connector waiting for the user to pick a file to move inside!
  var cabinetPickInsideId = null;
  // Armed Connector waiting for the user to pick a file to link!
  var cabinetPickLinkId = null;
  // Armed Merge waiting for the user to pick a Branch/Node to absorb!
  var cabinetPickMergeId = null;

  // Card vs list view for the file grid (persisted)!
  var VIEW_MODE_KEY = 'cabinet_view_mode_v1';
  var cabinetViewMode = 'cards';

  function applyCabinetViewMode() {
    try {
      const grid = document.getElementById('file-grid');
      if (grid) grid.classList.toggle('list-view', cabinetViewMode === 'list');
      const listBtn = document.getElementById('view-list-btn');
      const cardsBtn = document.getElementById('view-cards-btn');
      if (listBtn) listBtn.classList.toggle('active', cabinetViewMode === 'list');
      if (cardsBtn) cardsBtn.classList.toggle('active', cabinetViewMode !== 'list');
    } catch (e) {}
  }

  function setCabinetViewMode(mode) {
    cabinetViewMode = mode === 'list' ? 'list' : 'cards';
    try { localStorage.setItem(VIEW_MODE_KEY, cabinetViewMode); } catch (e) {}
    applyCabinetViewMode();
  }

  function loadCabinetViewMode() {
    try {
      const raw = localStorage.getItem(VIEW_MODE_KEY);
      cabinetViewMode = raw === 'list' ? 'list' : 'cards';
    } catch (e) { cabinetViewMode = 'cards'; }
    applyCabinetViewMode();
  }

  var DRAWERS_KEY = 'cabinet_drawers_v1';
  var ACTIVE_KEY = 'cabinet_active_drawer';

  // ---- Persistent storage: localStorage (fast, tiny ~5MB) + IndexedDB (big, async)!
  // Large music/movie files blow past localStorage quota, so the full state
  // (including dataUrls) is mirrored to IndexedDB. localStorage keeps a fast
  // sync snapshot (possibly lite without big dataUrls) for instant first paint!
  var IDB_DB = 'radii-cabinet';
  var IDB_STORE = 'kv';
  var IDB_KEY = 'cabinet_state_v1';
  var idbSaveTimer = null;
  var lastPersistOverflow = false;
  var localSavedAt = 0;

  function openCabinetDB() {
    try {
      if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-indexeddb'));
      if (window._cabinetDBPromise) return window._cabinetDBPromise;
      window._cabinetDBPromise = new Promise(function (resolve, reject) {
        try {
          const req = indexedDB.open(IDB_DB, 1);
          req.onupgradeneeded = function () {
            try { req.result.createObjectStore(IDB_STORE); } catch (e) {}
          };
          req.onsuccess = function () { resolve(req.result); };
          req.onerror = function () { reject(req.error || new Error('idb-open-failed')); };
          req.onblocked = function () { reject(new Error('idb-blocked')); };
        } catch (e) { reject(e); }
      });
      return window._cabinetDBPromise;
    } catch (e) { return Promise.reject(e); }
  }

  function idbSetState(state) {
    return openCabinetDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          const req = store.put(state, IDB_KEY);
          req.onsuccess = function () { resolve(true); };
          req.onerror = function () { reject(req.error || new Error('idb-put-failed')); };
        } catch (e) { reject(e); }
      });
    });
  }

  function idbGetState() {
    return openCabinetDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get(IDB_KEY);
          req.onsuccess = function () { resolve(req.result || null); };
          req.onerror = function () { reject(req.error || new Error('idb-get-failed')); };
        } catch (e) { reject(e); }
      });
    });
  }

  function stripLargeDataUrls(drawerList, maxLen) {
    return (drawerList || []).map(function (d) {
      function stripFolder(folder) {
        const kind = normFolderKind(folder.kind);
        return {
          id: folder.id, name: folder.name, kind: kind, note: String(folder.note || '').substring(0, 280), powered: kind === 'node' ? folder.powered !== false : undefined, links: kindHoldsLinks(kind) ? cleanLinks(folder.links) : [], entries: kind === 'log' ? cleanLogEntries(folder.entries) : [], code: kind === 'branch' ? cleanBranchCode(folder.code) : undefined, color: kind === 'branch' ? cleanBranchColor(folder.color) : undefined, notes: kind === 'merge' ? cleanMergeNotes(folder.notes) : [], tags: folder.tags || [],
          files: (folder.files || []).map(function (f) {
            const url = String(f.dataUrl || '');
            return { id: f.id, name: f.name, type: f.type, size: f.size, tags: f.tags || [], dataUrl: url.length > maxLen ? '' : url };
          }),
          folders: (folder.folders || []).map(stripFolder)
        };
      }
      const root = stripFolder({ id: d.id, name: d.name, tags: [], files: d.files, folders: d.folders });
      return { id: root.id, name: root.name, files: root.files, folders: root.folders };
    });
  }

  function stateDataBytes(drawerList) {
    let n = 0;
    function walk(folder) {
      (folder.files || []).forEach(function (f) { n += String(f.dataUrl || '').length; });
      (folder.folders || []).forEach(walk);
    }
    (drawerList || []).forEach(walk);
    return n;
  }

  function queueIDBSave() {
    try {
      if (idbSaveTimer) clearTimeout(idbSaveTimer);
      idbSaveTimer = setTimeout(function () {
        idbSaveTimer = null;
        const snapshot = { drawers: drawers, activeId: activeDrawerId, savedAt: Date.now() };
        idbSetState(snapshot).then(function () {
          try { window._cabinetIDBOk = true; } catch (e) {}
          updateStorageFoot();
        }).catch(function () {
          try { window._cabinetIDBOk = false; } catch (e) {}
          updateStorageFoot();
        });
      }, 250);
    } catch (e) {}
  }

  function updateStorageFoot() {
    try {
      const foot = document.getElementById('drawer-foot-count');
      if (!foot) return;
      if (lastPersistOverflow) {
        foot.title = 'Large files exceed localStorage — full library kept in browser database (IndexedDB)!';
      } else {
        foot.title = '';
      }
    } catch (e) {}
  }

  function loadFromIDBAsync() {
    idbGetState().then(function (record) {
      if (!record || !Array.isArray(record.drawers) || !record.drawers.length) return;
      // Strictly newer only! A bigger-but-older snapshot is stale data
      // (e.g. an absorb/delete that shrank localStorage must never resurrect)!
      // IDB snapshots always fire after the local save that queued them,
      // so a fuller IDB is naturally newer and still wins when it should!
      const idbNewer = (Number(record.savedAt) || 0) > (localSavedAt || 0);
      if (idbNewer) {
        try {
          drawers = record.drawers.map(function (d) {
            return { id: String(d.id || uid()), name: String(d.name || 'My Drawer').substring(0, 60) || 'My Drawer', files: cleanFiles(d.files), folders: cleanFolders(d.folders) };
          });
          if (record.activeId && drawers.some(function (d) { return d.id === record.activeId; })) activeDrawerId = record.activeId;
          D();
          renderDrawer();
        } catch (e) {}
      }
    }).catch(function () {});
  }

  function D() {
    for (const d of drawers) if (d.id === activeDrawerId) return d;
    if (!drawers.length) {
      const fresh = { id: uid(), name: 'My Drawer', files: [], folders: [] };
      drawers.push(fresh);
      activeDrawerId = fresh.id;
    } else {
      activeDrawerId = drawers[0].id;
    }
    return drawers[0];
  }

  const ICON_CLOSED = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="m6.44 4.06l.439.44H12.5A1.5 1.5 0 0 1 14 6v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11V4.5A1.5 1.5 0 0 1 3.5 3h1.257a1.5 1.5 0 0 1 1.061.44zM.5 4.5a3 3 0 0 1 3-3h1.257a3 3 0 0 1 2.122.879L7.5 3h5a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3zm4.25 2a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5z" clip-rule="evenodd" /></svg>';
  const ICON_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="m6.379 4.5l-.44-.44l-.621-.62A1.5 1.5 0 0 0 4.258 3H3a1.5 1.5 0 0 0-1.5 1.5v5.25l1.376-2.293A3 3 0 0 1 5.45 6h7.05A1.5 1.5 0 0 0 11 4.5zM14 6.026V6a3 3 0 0 0-3-3H7l-.621-.621A3 3 0 0 0 4.257 1.5H3a3 3 0 0 0-3 3V11a3 3 0 0 0 3 3h8.301a3 3 0 0 0 2.573-1.457l1.791-2.985A2.35 2.35 0 0 0 14 6.026M10 12.5h1.301a1.5 1.5 0 0 0 1.287-.728l1.791-2.986l1.286.772l-1.286-.772a.85.85 0 0 0-.728-1.286H5.449a1.5 1.5 0 0 0-1.287.728l-1.791 2.986a.85.85 0 0 0 .728 1.286z" clip-rule="evenodd" /></svg>';

  // Web Audio blip synth (lazy AudioContext, user-gesture safe)!
  // Fix: ctx.resume() is async! Playing immediately while suspended = silent sometimes!
  function ensureCabinetAudioCtx() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      let ctx = window._cabinetAudioCtx;
      if (!ctx || ctx.state === 'closed') {
        ctx = new Ctx();
        window._cabinetAudioCtx = ctx;
      }
      if (ctx.state === 'suspended') {
        try {
          const p = ctx.resume();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) {}
      }
      return ctx;
    } catch (e) { return null; }
  }

  function playCabinetSound(frequency, duration) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      let ctx = window._cabinetAudioCtx;
      if (!ctx || ctx.state === 'closed') {
        ctx = new Ctx();
        window._cabinetAudioCtx = ctx;
      }
      const freq = frequency || 600;
      const dur = duration || 0.08;
      const playTone = function () {
        try {
          if (ctx.state === 'suspended') return;
          const t = ctx.currentTime;
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = freq;
          gainNode.gain.setValueAtTime(0.14, t);
          gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.onended = function () {
            try { oscillator.disconnect(); } catch (e) {}
            try { gainNode.disconnect(); } catch (e) {}
          };
          oscillator.start(t);
          oscillator.stop(t + dur);
        } catch (e) {}
      };
      if (ctx.state === 'suspended') {
        try {
          const p = ctx.resume();
          if (p && typeof p.then === 'function') p.then(playTone, playTone);
          else setTimeout(playTone, 0);
        } catch (e) { setTimeout(playTone, 0); }
      } else {
        playTone();
      }
    } catch (e) {}
  }

  function uid() {
    return 'f' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // ---- Keydown lite: render a safe subset of Writeout Keydown codes in Node notes!
  // Supports **bold**, *italic*, `code`, ~G~/~U~/~B~/~S~/~L~/~E~ gels,
  // and gel chips #C# #O# #G# #R# #PR# #PK# #Y# #B# #L# #T# #GL# #SL# #W# #BK# #FG# #TU#!
  var KD_CHIP_CLASSES = {
    C: 'kd-chip-cyan', O: 'kd-chip-orange', G: 'kd-chip-green', R: 'kd-chip-red',
    PR: 'kd-chip-purple', PK: 'kd-chip-pink', Y: 'kd-chip-yellow', B: 'kd-chip-blue',
    L: 'kd-chip-lime', T: 'kd-chip-teal', GL: 'kd-chip-gold', SL: 'kd-chip-slate',
    W: 'kd-chip-white', BK: 'kd-chip-black', FG: 'kd-chip-fog', TU: 'kd-chip-turquoise'
  };
  function renderKeydownNote(text) {
    const safe = escHtml(text);
    return safe
      .replace(/`([^`\n]+)`/g, '<code class="kd-code">$1</code>')
      .replace(/\*\*([^\n*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/~G~([^~\n]+)~G~/g, '<span class="kd-gel">$1</span>')
      .replace(/~U~([^~\n]+)~U~/g, '<span class="kd-ul">$1</span>')
      .replace(/~B~([^~\n]+)~B~/g, '<span class="kd-badge">$1</span>')
      .replace(/~S~([^~\n]+)~S~/g, '<span class="kd-spark">$1</span>')
      .replace(/~L~([^~\n]+)~L~/g, '<span class="kd-glow">$1</span>')
      .replace(/~E~([^~\n]+)~E~/g, '<span class="kd-emboss">$1</span>')
      .replace(/#(PR|PK|GL|SL|BK|FG|TU|C|O|G|R|Y|B|L|T|W)#([^#\n]+)#/g, function (m, code, inner) {
        return '<span class="kd-chip ' + (KD_CHIP_CLASSES[code] || 'kd-chip-cyan') + '">' + inner + '</span>';
      });
  }

  // Folder kinds: folder, node, connector, linker, log, branch, merge!
  function normFolderKind(kind) {
    return kind === 'node' ? 'node' : (kind === 'connector' ? 'connector' : (kind === 'linker' ? 'linker' : (kind === 'log' ? 'log' : (kind === 'branch' ? 'branch' : (kind === 'merge' ? 'merge' : 'folder')))));
  }

  function folderHoldsLinks(folder) {
    return kindHoldsLinks(normFolderKind(folder && folder.kind));
  }

  function kindHoldsLinks(kind) {
    return kind === 'connector' || kind === 'linker';
  }

  function cleanLogEntries(entries) {
    return (Array.isArray(entries) ? entries : []).filter(function (e) { return e && typeof e.text === 'string'; }).map(function (e) {
      return { id: String(e.id || uid()), text: String(e.text).substring(0, 280), addedAt: Number(e.addedAt) || Date.now() };
    });
  }

  function cleanMergeNotes(notes) {
    return (Array.isArray(notes) ? notes : []).filter(function (n) { return n && typeof n.note === 'string'; }).map(function (n) {
      return { id: String(n.id || uid()), from: String(n.from || '').substring(0, 60), note: String(n.note).substring(0, 280), at: Number(n.at) || Date.now() };
    });
  }

  // Branch codes: 4 chars from the lineage dictionary (no zero)!
  var BRANCH_DICT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

  function genBranchCode() {
    let code = '';
    for (let i = 0; i < 4; i++) code += BRANCH_DICT[Math.floor(Math.random() * BRANCH_DICT.length)];
    return code;
  }

  function uniqueBranchCode() {
    const seen = {};
    (function walk(folder) {
      (folder.folders || []).forEach(function (sub) {
        if (sub.code) seen[sub.code] = true;
        walk(sub);
      });
    })(D());
    let code = genBranchCode();
    let guard = 0;
    while (seen[code] && guard++ < 50) code = genBranchCode();
    return code;
  }

  function cleanBranchCode(code) {
    const s = String(code || '');
    return /^[A-Za-z0-9]{4}$/.test(s) ? s : genBranchCode();
  }

  function cleanBranchColor(color) {
    const s = String(color || '');
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s : '';
  }

  // Darken a hex color for gradient bottoms!
  function shadeHex(hex, f) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '';
    const r = Math.max(0, Math.min(255, Math.round(rgb.r * f)));
    const g = Math.max(0, Math.min(255, Math.round(rgb.g * f)));
    const b = Math.max(0, Math.min(255, Math.round(rgb.b * f)));
    return rgbToHex(r, g, b);
  }

  function hexToRgb(hex) {
    const m = /^#([0-9a-fA-F]{6})$/.exec(String(hex || ''));
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    r = Math.max(0, Math.min(255, Math.round(Number(r) || 0)));
    g = Math.max(0, Math.min(255, Math.round(Number(g) || 0)));
    b = Math.max(0, Math.min(255, Math.round(Number(b) || 0)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // All Branch codes in this drawer (lineage tags glow green)!
  function branchCodeSet() {
    const out = {};
    (function walk(folder) {
      (folder.folders || []).forEach(function (sub) {
        if (sub.kind === 'branch' && sub.code) out[sub.code] = true;
        walk(sub);
      });
    })(D());
    return out;
  }

  // Which connectors/linkers link to this file? Used for the linked tag!
  function findLinkingFolders(fileId) {
    const out = [];
    function walk(folder) {
      (folder.folders || []).forEach(function (sub) {
        if (folderHoldsLinks(sub) && (sub.links || []).some(function (l) { return l.fileId === fileId; })) out.push(sub);
        walk(sub);
      });
    }
    walk(D());
    return out;
  }

  // Which connectors link to this folder? Folders show their admirers too!
  function findFoldersLinkingFolder(folderId) {
    const out = [];
    function walk(folder) {
      (folder.folders || []).forEach(function (sub) {
        if (sub.kind === 'connector' && (sub.links || []).some(function (l) { return l.folderId === folderId; })) out.push(sub);
        walk(sub);
      });
    }
    walk(D());
    return out;
  }

  function fmtSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (Math.round(n / 102.4) / 10) + ' KB';
    if (n < 1024 * 1024 * 1024) return (Math.round(n / 104857.6) / 10) + ' MB';
    return (Math.round(n / 107374182.4) / 10) + ' GB';
  }

  function isImageFile(type, name) {
    if (/^image\//.test(type || '')) return true;
    return /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(name || '');
  }

  function isAudioFile(type, name) {
    if (/^audio\//.test(type || '')) return true;
    return /\.(wav|mp3|ogg|oga|m4a|flac)$/i.test(name || '');
  }

  function isVideoFile(type, name) {
    if (/^video\//.test(type || '')) return true;
    return /\.(mp4|mkv|mov|webm|avi)$/i.test(name || '');
  }

  function radiiFileKind(name) {
    const m = String(name || '').match(/\.([a-z0-9]{2,4})$/i);
    const ext = m ? m[1].toLowerCase() : '';
    if (ext === 'kd') return 'kd';
    if (ext === 'ks') return 'ks';
    if (ext === 'kv') return 'kv';
    if (ext === 'ka') return 'ka';
    if (ext === 'kb') return 'kb';
    if (ext === 'kfe' || ext === 'kfv' || ext === 'kfa') return 'kf';
    return '';
  }

  function fileExt(name) {
    const m = String(name || '').match(/\.([a-z0-9]{1,8})$/i);
    return m ? m[1].toUpperCase() : 'FILE';
  }

  function totalBytes() {
    function countFolder(folder) {
      let total = (folder.files || []).reduce(function (a, f) { return a + (Number(f.size) || 0); }, 0);
      (folder.folders || []).forEach(function (f) { total += countFolder(f); });
      return total;
    }
    return countFolder(D());
  }

  function cleanFiles(files) {
    return (Array.isArray(files) ? files : []).filter(function (f) { return f && typeof f.name === 'string'; }).map(function (f) {
      return { id: String(f.id || uid()), name: f.name, type: String(f.type || ''), size: Number(f.size) || 0, dataUrl: String(f.dataUrl || ''), tags: Array.isArray(f.tags) ? f.tags : [] };
    });
  }

  function cleanLinks(links) {
    return (Array.isArray(links) ? links : []).filter(function (l) {
      return l && ((typeof l.fileId === 'string' && l.fileId) || (typeof l.folderId === 'string' && l.folderId));
    }).map(function (l) {
      const out = { id: String(l.id || uid()), addedAt: Number(l.addedAt) || Date.now() };
      if (typeof l.fileId === 'string' && l.fileId) out.fileId = l.fileId;
      if (typeof l.folderId === 'string' && l.folderId) out.folderId = l.folderId;
      return out;
    });
  }

  function cleanFolders(folders) {
    return (Array.isArray(folders) ? folders : []).filter(function (f) { return f && typeof f.name === 'string'; }).map(function (f) {
      const kind = normFolderKind(f.kind);
      return { id: String(f.id || uid()), name: f.name, kind: kind, note: String(f.note || '').substring(0, 280), powered: kind === 'node' ? f.powered !== false : undefined, links: kindHoldsLinks(kind) ? cleanLinks(f.links) : [], entries: kind === 'log' ? cleanLogEntries(f.entries) : [], code: kind === 'branch' ? cleanBranchCode(f.code) : undefined, color: kind === 'branch' ? cleanBranchColor(f.color) : undefined, notes: kind === 'merge' ? cleanMergeNotes(f.notes) : [], tags: Array.isArray(f.tags) ? f.tags : [], files: cleanFiles(f.files), folders: cleanFolders(f.folders) };
    });
  }

  function saveDrawer() {
    const payload = { drawers: drawers, activeId: activeDrawerId, savedAt: Date.now() };
    let ok = true;
    try {
      localStorage.setItem(DRAWERS_KEY, JSON.stringify(payload));
      lastPersistOverflow = false;
      localSavedAt = payload.savedAt;
    } catch (e) {
      ok = false;
      lastPersistOverflow = true;
      // Lite fallback: keep names/tags/structure in localStorage without big blobs!
      try {
        let lite = null;
        try {
          lite = { drawers: stripLargeDataUrls(drawers, 100 * 1024), activeId: activeDrawerId, savedAt: payload.savedAt, lite: true };
          localStorage.setItem(DRAWERS_KEY, JSON.stringify(lite));
        } catch (e2) {
          lite = { drawers: stripLargeDataUrls(drawers, 0), activeId: activeDrawerId, savedAt: payload.savedAt, lite: true };
          try { localStorage.setItem(DRAWERS_KEY, JSON.stringify(lite)); }
          catch (e3) { try { localStorage.removeItem(DRAWERS_KEY); } catch (_) {} }
        }
        localSavedAt = payload.savedAt;
      } catch (_) {}
    }
    queueIDBSave();
    updateStorageFoot();
    return ok;
  }

  function loadDrawer() {
    try {
      const raw = localStorage.getItem(DRAWERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.drawers) && parsed.drawers.length) {
          drawers = parsed.drawers.map(function (d) {
            return { id: String(d.id || uid()), name: String(d.name || 'My Drawer').substring(0, 60) || 'My Drawer', files: cleanFiles(d.files), folders: cleanFolders(d.folders) };
          });
          activeDrawerId = parsed.activeId || drawers[0].id;
          localSavedAt = Number(parsed.savedAt) || 0;
          // If localStorage only holds a lite snapshot, the blobs live in IndexedDB!
          lastPersistOverflow = !!parsed.lite;
          D();
          updateStorageFoot();
          return true;
        }
      }
      // One-time legacy migration (single-drawer era)!
      const legacy = localStorage.getItem(DRAWER_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && Array.isArray(parsed.files)) {
          drawers = [{ id: uid(), name: String(parsed.name || 'My Drawer').substring(0, 60) || 'My Drawer', files: cleanFiles(parsed.files), folders: [] }];
          activeDrawerId = drawers[0].id;
          try { localStorage.removeItem(DRAWER_KEY); } catch (e) {}
          saveDrawer();
          return true;
        }
      }
    } catch (e) {}
    drawers = [];
    activeDrawerId = null;
    D();
    return false;
  }

  // ---- Share-as-a-file (.kc readable-YAML bundle, legacy JSON supported!) ----
  // Readable first: names, types, sizes and tags sit above each data blob!
  function yamlEscape(s) {
    s = String(s == null ? '' : s);
    if (s === '' || s !== s.trim() || s.length > 120) return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r') + '"';
    if (/^[A-Za-z0-9][A-Za-z0-9 _.\/+~|-]*$/.test(s) && !/^(true|false|null|~|[-+]?[0-9][0-9.,]*)$/i.test(s) && s.indexOf(': ') === -1 && s.indexOf(' #') === -1 && s.indexOf(',') === -1) return s;
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r') + '"';
  }

  function yamlUnquote(s) {
    s = String(s == null ? '' : s).trim();
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
      return s.slice(1, -1).replace(/\\(\\|"|n|t|r)/g, function (m, c) {
        return c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c;
      });
    }
    return s;
  }

  function yamlFlowTags(tags) {
    const arr = Array.isArray(tags) ? tags : [];
    return '[' + arr.map(function (t) { return yamlEscape(t); }).join(', ') + ']';
  }

  function yamlFlowItems(s) {
    s = String(s == null ? '' : s).trim();
    if (s === '' || s === '[]') return [];
    if (s[0] !== '[' || s[s.length - 1] !== ']') return [];
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '"' && (i === 0 || inner[i - 1] !== '\\')) { inQ = !inQ; cur += ch; }
      else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    const res = [];
    for (let j = 0; j < out.length; j++) {
      if (out[j] === '') continue;
      res.push(yamlUnquote(out[j]));
    }
    return res;
  }

  function kcPad(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += ' ';
    return s;
  }

  function kcEmitFiles(files, indent, out) {
    files = Array.isArray(files) ? files : [];
    if (!files.length) { out.push(kcPad(indent) + 'files: []'); return; }
    out.push(kcPad(indent) + 'files:');
    files.forEach(function (f) {
      const pad = kcPad(indent + 2);
      out.push(pad + '- id: ' + yamlEscape(f.id));
      out.push(pad + '  name: ' + yamlEscape(f.name));
      out.push(pad + '  type: ' + yamlEscape(f.type));
      out.push(pad + '  size: ' + (Number(f.size) || 0));
      out.push(pad + '  tags: ' + yamlFlowTags(f.tags));
      const data = String(f.dataUrl || '');
      if (data) {
        out.push(pad + '  data: |-');
        out.push(pad + '    ' + data);
      } else {
        out.push(pad + '  data: ""');
      }
    });
  }

  function kcEmitLinks(links, indent, out) {
    links = Array.isArray(links) ? links : [];
    if (!links.length) { out.push(kcPad(indent) + 'links: []'); return; }
    out.push(kcPad(indent) + 'links:');
    links.forEach(function (l) {
      const pad = kcPad(indent + 2);
      out.push(pad + '- id: ' + yamlEscape(l.id));
      if (l.fileId) out.push(pad + '  fileId: ' + yamlEscape(l.fileId));
      if (l.folderId) out.push(pad + '  folderId: ' + yamlEscape(l.folderId));
      out.push(pad + '  addedAt: ' + (Number(l.addedAt) || 0));
    });
  }

  function kcEmitEntries(entries, indent, out) {
    entries = Array.isArray(entries) ? entries : [];
    if (!entries.length) { out.push(kcPad(indent) + 'entries: []'); return; }
    out.push(kcPad(indent) + 'entries:');
    entries.forEach(function (en) {
      const pad = kcPad(indent + 2);
      out.push(pad + '- id: ' + yamlEscape(en.id));
      out.push(pad + '  text: ' + yamlEscape(en.text));
      out.push(pad + '  addedAt: ' + (Number(en.addedAt) || 0));
    });
  }

  function kcEmitMergeNotes(notes, indent, out) {
    notes = Array.isArray(notes) ? notes : [];
    if (!notes.length) { out.push(kcPad(indent) + 'notes: []'); return; }
    out.push(kcPad(indent) + 'notes:');
    notes.forEach(function (n) {
      const pad = kcPad(indent + 2);
      out.push(pad + '- id: ' + yamlEscape(n.id));
      out.push(pad + '  from: ' + yamlEscape(n.from));
      out.push(pad + '  note: ' + yamlEscape(n.note));
      out.push(pad + '  at: ' + (Number(n.at) || 0));
    });
  }

  function kcEmitFolders(folders, indent, out) {
    folders = Array.isArray(folders) ? folders : [];
    if (!folders.length) { out.push(kcPad(indent) + 'folders: []'); return; }
    out.push(kcPad(indent) + 'folders:');
    folders.forEach(function (f) {
      const kind = normFolderKind(f.kind);
      const pad = kcPad(indent + 2);
      out.push(pad + '- id: ' + yamlEscape(f.id));
      out.push(pad + '  name: ' + yamlEscape(f.name));
      out.push(pad + '  kind: ' + kind);
      if (f.note) out.push(pad + '  note: ' + yamlEscape(f.note));
      if (kind === 'node') out.push(pad + '  powered: ' + (f.powered === false ? 'false' : 'true'));
      if (kind === 'branch') {
        out.push(pad + '  code: ' + yamlEscape(f.code || ''));
        if (f.color) out.push(pad + '  color: ' + yamlEscape(f.color));
      }
      out.push(pad + '  tags: ' + yamlFlowTags(f.tags));
      kcEmitFiles(f.files, indent + 4, out);
      kcEmitFolders(f.folders, indent + 4, out);
      if (kindHoldsLinks(kind)) kcEmitLinks(f.links, indent + 4, out);
      if (kind === 'log') kcEmitEntries(f.entries, indent + 4, out);
      if (kind === 'merge') kcEmitMergeNotes(f.notes, indent + 4, out);
    });
  }

  function kcStringifyDrawer(name, files, folders) {
    const out = [
      '---',
      'app: "Radii Cabinet"',
      'format: "' + DRAWER_FORMAT + '"',
      'version: 1',
      'name: ' + yamlEscape(name),
      'exported_at: "' + new Date().toISOString() + '"',
      '---',
      ''
    ];
    kcEmitFiles(files, 0, out);
    kcEmitFolders(folders, 0, out);
    return out.join('\n') + '\n';
  }

  function cabinetSerializeDrawer() {
    return kcStringifyDrawer(D().name, D().files, D().folders);
  }

  // ---- Minimal YAML-subset reader (frontmatter + our schema only!) ----
  function kcYamlIndent(line) {
    const m = String(line).match(/^ */);
    return m ? m[0].length : 0;
  }

  // Flow lists (tags) keep their raw form for the quote-aware splitter!
  function kcScalar(key, val) {
    return key === 'tags' ? val : yamlUnquote(val);
  }

  function kcParseBlock(lines, pos, baseIndent) {
    const obj = {};
    while (pos < lines.length) {
      const raw = lines[pos];
      if (raw.trim() === '' || raw.trim().startsWith('#')) { pos++; continue; }
      const ind = kcYamlIndent(raw);
      if (ind !== baseIndent) break;
      const m = raw.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (!m) { pos++; continue; }
      const key = m[1];
      const val = m[2].trim();
      pos++;
      if (val === '|-') {
        const r = kcParseLiteral(lines, pos, ind);
        obj[key] = r.text;
        pos = r.pos;
      } else if (val === '') {
        let p2 = pos;
        while (p2 < lines.length && lines[p2].trim() === '') p2++;
        if (p2 < lines.length && /^\s*-\s/.test(lines[p2])) {
          const r = kcParseList(lines, p2, kcYamlIndent(lines[p2]));
          obj[key] = r.items;
          pos = r.pos;
        } else {
          obj[key] = [];
        }
      } else {
        obj[key] = kcScalar(key, val);
      }
    }
    return { obj: obj, pos: pos };
  }

  function kcParseLiteral(lines, pos, keyIndent) {
    const buf = [];
    let strip = null;
    while (pos < lines.length) {
      const l2 = lines[pos];
      if (l2.trim() === '') { buf.push(''); pos++; continue; }
      const i2 = kcYamlIndent(l2);
      if (i2 <= keyIndent) break;
      if (strip === null) strip = i2;
      buf.push(l2.slice(strip));
      pos++;
    }
    while (buf.length && buf[buf.length - 1] === '') buf.pop();
    return { text: buf.join('\n'), pos: pos };
  }

  function kcParseList(lines, pos, listIndent) {
    const items = [];
    while (pos < lines.length) {
      const raw = lines[pos];
      if (raw.trim() === '' || raw.trim().startsWith('#')) { pos++; continue; }
      const ind = kcYamlIndent(raw);
      if (ind !== listIndent) break;
      const t = raw.trim();
      if (t !== '-' && !t.startsWith('- ')) break;
      const rest = t === '-' ? '' : t.slice(2);
      pos++;
      const item = {};
      if (rest !== '') {
        const m = rest.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (m) item[m[1]] = kcScalar(m[1], m[2].trim());
      }
      while (pos < lines.length) {
        const r2 = lines[pos];
        if (r2.trim() === '' || r2.trim().startsWith('#')) { pos++; continue; }
        const i2 = kcYamlIndent(r2);
        if (i2 <= listIndent) break;
        const m2 = r2.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (!m2) { pos++; continue; }
        const k2 = m2[1];
        const v2 = m2[2].trim();
        pos++;
        if (v2 === '|-') {
          const r = kcParseLiteral(lines, pos, i2);
          item[k2] = r.text;
          pos = r.pos;
        } else if (v2 === '') {
          let p3 = pos;
          while (p3 < lines.length && lines[p3].trim() === '') p3++;
          if (p3 < lines.length && /^\s*-\s/.test(lines[p3])) {
            const rr = kcParseList(lines, p3, kcYamlIndent(lines[p3]));
            item[k2] = rr.items;
            pos = rr.pos;
          } else {
            item[k2] = [];
          }
        } else {
          item[k2] = kcScalar(k2, v2);
        }
      }
      items.push(item);
    }
    return { items: items, pos: pos };
  }

  function kcAsList(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim() === '[]') return [];
    return [];
  }

  function kcConvertTags(v) {
    if (Array.isArray(v)) {
      const out = [];
      for (let i = 0; i < v.length; i++) {
        if (typeof v[i] === 'string' && v[i] !== '') out.push(v[i]);
      }
      return out;
    }
    if (typeof v === 'string') return yamlFlowItems(v);
    return [];
  }

  function kcConvertLinks(list) {
    const out = [];
    const arr = kcAsList(list);
    for (let i = 0; i < arr.length; i++) {
      const l = arr[i];
      if (!l) continue;
      const hasFile = typeof l.fileId === 'string' && l.fileId;
      const hasFolder = typeof l.folderId === 'string' && l.folderId;
      if (!hasFile && !hasFolder) continue;
      const entry = { id: (typeof l.id === 'string' && l.id) ? l.id : uid(), addedAt: Number(l.addedAt) || Date.now() };
      if (hasFile) entry.fileId = l.fileId;
      if (hasFolder) entry.folderId = l.folderId;
      out.push(entry);
    }
    return out;
  }

  function kcConvertFiles(list) {
    const out = [];
    const arr = kcAsList(list);
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      if (!f || typeof f.name !== 'string' || typeof f.data !== 'string') return null;
      out.push({
        id: (typeof f.id === 'string' && f.id) ? f.id : uid(),
        name: f.name,
        type: typeof f.type === 'string' ? f.type : '',
        size: Number(f.size) || 0,
        dataUrl: String(f.data).replace(/\s+/g, ''),
        tags: kcConvertTags(f.tags)
      });
    }
    return out;
  }

  function kcConvertEntries(list) {
    const out = [];
    const arr = kcAsList(list);
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (!e || typeof e.text !== 'string') continue;
      out.push({ id: (typeof e.id === 'string' && e.id) ? e.id : uid(), text: e.text.substring(0, 280), addedAt: Number(e.addedAt) || Date.now() });
    }
    return out;
  }

  function kcConvertMergeNotes(list) {
    const out = [];
    const arr = kcAsList(list);
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i];
      if (!n || typeof n.note !== 'string') continue;
      out.push({ id: (typeof n.id === 'string' && n.id) ? n.id : uid(), from: typeof n.from === 'string' ? n.from.substring(0, 60) : '', note: n.note.substring(0, 280), at: Number(n.at) || Date.now() });
    }
    return out;
  }

  function kcConvertFolders(list) {
    const out = [];
    const arr = kcAsList(list);
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      if (!f || typeof f.name !== 'string') continue;
      const kind = normFolderKind(f.kind);
      out.push({
        id: (typeof f.id === 'string' && f.id) ? f.id : uid(),
        name: String(f.name).substring(0, 60) || 'Folder',
        kind: kind,
        note: typeof f.note === 'string' ? f.note.substring(0, 280) : '',
        powered: kind === 'node' ? (f.powered === false || f.powered === 'false' ? false : true) : undefined,
        code: kind === 'branch' ? cleanBranchCode(f.code) : undefined,
        color: kind === 'branch' ? cleanBranchColor(f.color) : undefined,
        links: kindHoldsLinks(kind) ? kcConvertLinks(f.links) : [],
        entries: kind === 'log' ? kcConvertEntries(f.entries) : [],
        notes: kind === 'merge' ? kcConvertMergeNotes(f.notes) : [],
        tags: kcConvertTags(f.tags),
        files: (function () {
          const c = kcConvertFiles(f.files);
          return c === null ? [] : c;
        })(),
        folders: kcConvertFolders(f.folders)
      });
    }
    return out;
  }

  function kcParseYamlDrawer(str) {
    const lines = String(str).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let pos = 0;
    while (pos < lines.length && lines[pos].trim() === '') pos++;
    if (pos >= lines.length || lines[pos].trim() !== '---') return null;
    pos++;
    const front = {};
    while (pos < lines.length && lines[pos].trim() !== '---') {
      const line = lines[pos];
      if (line.trim() !== '' && !line.trim().startsWith('#')) {
        const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (m) front[m[1]] = yamlUnquote(m[2]);
      }
      pos++;
    }
    if (pos >= lines.length) return null;
    pos++;
    if (front.format !== DRAWER_FORMAT && front.format !== DRAWER_FORMAT_LEGACY) return null;
    const body = kcParseBlock(lines, pos, 0).obj;
    const files = kcConvertFiles(body.files);
    if (files === null) return null;
    return {
      name: String(front.name || 'Shared Drawer').substring(0, 60) || 'Shared Drawer',
      files: files,
      folders: kcConvertFolders(body.folders)
    };
  }

  function cabinetParseDrawer(text) {
    const str = String(text == null ? '' : text);
    if (/^\s*---/.test(str)) return kcParseYamlDrawer(str);
    // Legacy JSON (.drawer era + early .kc)!
    let parsed = null;
    try { parsed = JSON.parse(str); } catch (e) { return null; }
    if (!parsed || (parsed.format !== DRAWER_FORMAT && parsed.format !== DRAWER_FORMAT_LEGACY) || !Array.isArray(parsed.files)) return null;
    function parseFolders(folders) {
      return (Array.isArray(folders) ? folders : []).filter(function (f) { return f && typeof f.name === 'string'; }).map(function (f) {
        const kind = normFolderKind(f.kind);
        return { id: uid(), name: String(f.name || 'Folder').substring(0, 60), kind: kind, note: String(f.note || '').substring(0, 280), powered: kind === 'node' ? f.powered !== false : undefined, links: kindHoldsLinks(kind) ? cleanLinks(f.links) : [], entries: kind === 'log' ? cleanLogEntries(f.entries) : [], code: kind === 'branch' ? cleanBranchCode(f.code) : undefined, color: kind === 'branch' ? cleanBranchColor(f.color) : undefined, notes: kind === 'merge' ? cleanMergeNotes(f.notes) : [], tags: Array.isArray(f.tags) ? f.tags : [], files: ((f.files || []).filter(function (ff) { return ff && typeof ff.name === 'string' && typeof ff.dataUrl === 'string'; })).map(function (ff) { return { id: uid(), name: ff.name, type: String(ff.type || ''), size: Number(ff.size) || 0, dataUrl: ff.dataUrl, tags: Array.isArray(ff.tags) ? ff.tags : [] }; }), folders: parseFolders(f.folders || []) };
      });
    }
    const files = [];
    for (const f of parsed.files) {
      if (!f || typeof f.name !== 'string' || typeof f.dataUrl !== 'string') return null;
      files.push({ id: uid(), name: f.name, type: String(f.type || ''), size: Number(f.size) || 0, dataUrl: f.dataUrl, tags: Array.isArray(f.tags) ? f.tags : [] });
    }
    return { name: String(parsed.name || 'Shared Drawer').substring(0, 60) || 'Shared Drawer', files: files, folders: parseFolders(parsed.folders || []) };
  }

  function downloadBlob(blob, filename) {
    try {
      const url = (window.URL || {}).createObjectURL ? window.URL.createObjectURL(blob) : null;
      const a = document.createElement('a');
      a.href = url || ('data:application/octet-stream;base64,');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { a.remove(); } catch (e) {}
        if (url && window.URL.revokeObjectURL) { try { window.URL.revokeObjectURL(url); } catch (e) {} }
      }, 100);
      return true;
    } catch (e) { return false; }
  }

  function slugName(name) {
    return String(name || 'drawer').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40) || 'drawer';
  }

  // ---- Uploads (FileReader dataURLs double as previews + storage!) ----
  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      try {
        const reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.onerror = function () { reject(new Error('unreadable')); };
        reader.readAsDataURL(file);
      } catch (e) { reject(e); }
    });
  }

  function cabinetAddFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return Promise.resolve([]);
    const target = getCurrentFolder() || D();
    // Linkers can only link: refuse uploads with a helpful nudge!
    if (target.kind === 'linker') {
      try { alert('Linker folders can only link files! Use “Link file…” to connect one.'); } catch (e) {}
      return Promise.resolve([]);
    }
    return Promise.all(files.map(function (file) {
      return readFileAsDataURL(file).then(function (dataUrl) {
        return { id: uid(), name: file.name || 'untitled', type: file.type || '', size: file.size || 0, dataUrl: dataUrl, tags: [] };
      });
    })).then(function (entries) {
      target.files = (target.files || []).concat(entries);
      saveDrawer();
      renderDrawer();
      return entries;
    });
  }

  function findFileRecursive(folder, id) {
    for (const f of (folder.files || [])) if (f.id === id) return f;
    for (const sub of (folder.folders || [])) {
      const found = findFileRecursive(sub, id);
      if (found) return found;
    }
    return null;
  }

  function findParentOfFile(folder, id) {
    for (const f of (folder.files || [])) if (f.id === id) return folder;
    for (const sub of (folder.folders || [])) {
      const found = findParentOfFile(sub, id);
      if (found) return found;
    }
    return null;
  }

  function findFolderById(folder, id) {
    for (const sub of (folder.folders || [])) {
      if (sub.id === id) return sub;
      const found = findFolderById(sub, id);
      if (found) return found;
    }
    return null;
  }

  function cabinetRemoveFile(id) {
    const parent = findParentOfFile(D(), id);
    if (!parent) return;
    parent.files = parent.files.filter(function (f) { return f.id !== id; });
    saveDrawer();
    renderDrawer();
  }

  function cabinetRemoveTag(id, tagName) {
    const f = findFileRecursive(D(), id);
    if (!f) return;
    f.tags = (f.tags || []).filter(function (t) { return t !== tagName; });
    saveDrawer();
    renderDrawer();
  }

  function cabinetRenameFile(id, name) {
    const f = findFileRecursive(D(), id);
    if (!f) return false;
    const clean = String(name || '').trim().substring(0, 100);
    if (!clean) return false;
    f.name = clean;
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetFindFile(id) {
    const cur = getCurrentFolder();
    if (cur) {
      for (const f of (cur.files || [])) if (f.id === id) return f;
    }
    return findFileRecursive(D(), id);
  }

  function cabinetMoveFileToFolder(fileId, folderId) {
    if (!fileId || !folderId) return false;
    const target = findFolderById(D(), folderId);
    if (!target) return false;
    const source = findParentOfFile(D(), fileId);
    if (!source) return false;
    if (source.id === target.id) return false;
    const idx = source.files.findIndex(function (f) { return f.id === fileId; });
    if (idx === -1) return false;
    const entry = source.files[idx];
    source.files.splice(idx, 1);
    target.files = target.files || [];
    target.files.push(entry);
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetMoveFileToPath(fileId, targetPath) {
    if (!fileId) return false;
    const path = Array.isArray(targetPath) ? targetPath : [];
    const target = findFolder(path);
    if (!target) return false;
    const source = findParentOfFile(D(), fileId);
    if (!source) return false;
    if (source === target) return false;
    // Prevent moving a file into itself (not possible) but also avoid no-ops!
    const idx = (source.files || []).findIndex(function (f) { return f.id === fileId; });
    if (idx === -1) return false;
    const entry = source.files[idx];
    source.files.splice(idx, 1);
    target.files = target.files || [];
    target.files.push(entry);
    saveDrawer();
    renderDrawer();
    return true;
  }

  function findFolder(path) {
    let current = D();
    current.folders = current.folders || [];
    for (const folderId of (path || [])) {
      const folder = (current.folders || []).find(function (f) { return f.id === folderId; });
      if (!folder) return null;
      folder.folders = folder.folders || [];
      folder.files = folder.files || [];
      current = folder;
    }
    return current;
  }

  function getCurrentFolder() {
    return findFolder(currentFolderPath);
  }

  function cabinetNavigateFolder(folderId) {
    if (folderId === null) {
      currentFolderPath = [];
    } else {
      currentFolderPath.push(folderId);
    }
    renderDrawer();
  }

  function cabinetNavigateUp() {
    if (currentFolderPath.length > 0) {
      currentFolderPath.pop();
      renderDrawer();
    }
  }

  function cabinetCreateFolder(name, kind) {
    const folder = getCurrentFolder() || D();
    folder.folders = folder.folders || [];
    const normKind = normFolderKind(kind);
    const defaultName = normKind === 'node' ? 'New Node' : (normKind === 'connector' ? 'New Connector' : (normKind === 'linker' ? 'New Linker' : (normKind === 'log' ? 'New Log' : (normKind === 'branch' ? 'New Branch' : (normKind === 'merge' ? 'New Merge' : 'New Folder')))));
    const newFolder = { id: uid(), name: String(name || defaultName).substring(0, 60) || defaultName, kind: normKind, note: '', powered: normKind === 'node' ? true : undefined, links: kindHoldsLinks(normKind) ? [] : [], entries: normKind === 'log' ? [] : [], code: normKind === 'branch' ? uniqueBranchCode() : undefined, color: undefined, notes: normKind === 'merge' ? [] : [], tags: [], files: [], folders: [] };
    folder.folders.push(newFolder);
    saveDrawer();
    renderDrawer();
    return newFolder.id;
  }

  function cabinetCreateNode(name) {
    return cabinetCreateFolder(name || 'New Node', 'node');
  }

  function cabinetCreateConnector(name) {
    return cabinetCreateFolder(name || 'New Connector', 'connector');
  }

  // ---- Connector links: references to files living elsewhere (no move, no copy!) ----
  function cabinetLinkFileToConnector(fileId, connectorId) {
    if (!fileId || !connectorId) return false;
    const target = findFolderById(D(), connectorId);
    if (!target || !folderHoldsLinks(target)) return false;
    const entry = findFileRecursive(D(), fileId);
    if (!entry) return false;
    // Never link a file to the connector that already contains it!
    const source = findParentOfFile(D(), fileId);
    if (source && source.id === target.id) return false;
    target.links = target.links || [];
    if (target.links.some(function (l) { return l.fileId === fileId; })) return false;
    target.links.push({ id: uid(), fileId: fileId, addedAt: Date.now() });
    // Open the Links accordion so the new link is unmistakable!
    openDetailIds[connectorId] = true;
    saveDrawer();
    renderDrawer();
    return true;
  }

  // Link a whole folder (Connectors only: Linkers stay file-only)!
  function cabinetLinkFolder(connectorId, folderId) {
    if (!connectorId || !folderId || connectorId === folderId) return false;
    const target = findFolderById(D(), connectorId);
    if (!target || target.kind !== 'connector') return false;
    const entry = findFolderById(D(), folderId);
    if (!entry) return false;
    target.links = target.links || [];
    if (target.links.some(function (l) { return l.folderId === folderId; })) return false;
    target.links.push({ id: uid(), folderId: folderId, addedAt: Date.now() });
    openDetailIds[connectorId] = true;
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetUnlinkFile(connectorId, linkId) {
    const target = findFolderById(D(), connectorId);
    if (!target || !folderHoldsLinks(target)) return false;
    target.links = (target.links || []).filter(function (l) { return l.id !== linkId; });
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetBringLinkInside(connectorId, linkId) {
    const target = findFolderById(D(), connectorId);
    // Linkers can only link: only real Connectors absorb files!
    if (!target || target.kind !== 'connector') return false;
    const link = (target.links || []).find(function (l) { return l.id === linkId; });
    if (!link) return false;
    if (cabinetMoveFileToFolder(link.fileId, connectorId)) {
      target.links = (target.links || []).filter(function (l) { return l.id !== linkId; });
      saveDrawer();
      renderDrawer();
      return true;
    }
    return false;
  }

  // Reorder: slide a file to another file's slot in the same folder!
  function cabinetReorderFile(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return false;
    const parent = findParentOfFile(D(), targetId) || getCurrentFolder() || D();
    parent.files = parent.files || [];
    let entry = null;
    const sIdx = parent.files.findIndex(function (f) { return f.id === sourceId; });
    if (sIdx !== -1) {
      entry = parent.files.splice(sIdx, 1)[0];
    } else {
      const elsewhere = findParentOfFile(D(), sourceId);
      if (!elsewhere) return false;
      const eIdx = (elsewhere.files || []).findIndex(function (f) { return f.id === sourceId; });
      if (eIdx === -1) return false;
      entry = elsewhere.files.splice(eIdx, 1)[0];
    }
    const tIdx = parent.files.findIndex(function (f) { return f.id === targetId; });
    if (tIdx === -1) return false;
    parent.files.splice(tIdx, 0, entry);
    saveDrawer();
    renderDrawer();
    return true;
  }

  // Pick mode: arm a Connector, then click any file to move it inside!
  var touchReorderArmed = false;
  var touchReorderId = null;
  var touchReorderTarget = null;

  function armPickInside(connectorId) {
    const target = findFolderById(D(), connectorId);
    // Only real Connectors absorb files: Linkers can only link!
    if (!target || target.kind !== 'connector') return false;
    cabinetPickInsideId = connectorId;
    cabinetPickLinkId = null;
    cabinetPickMergeId = null;
    try {
      const grid = document.getElementById('file-grid');
      if (grid) grid.classList.add('picking-inside');
      const hint = document.getElementById('pick-hint');
      const hintText = document.getElementById('pick-hint-text');
      if (hintText) hintText.textContent = 'Click a file or folder to move it inside "' + target.name + '" — Esc to cancel!';
      if (hint) hint.classList.add('open');
    } catch (e) {}
    renderDrawer();
    return true;
  }

  function armPickLink(connectorId) {
    const target = findFolderById(D(), connectorId);
    if (!target || !folderHoldsLinks(target)) return false;
    cabinetPickLinkId = connectorId;
    cabinetPickInsideId = null;
    cabinetPickMergeId = null;
    cabinetPickMergeId = null;
    try {
      const grid = document.getElementById('file-grid');
      if (grid) grid.classList.add('picking-inside');
      const hint = document.getElementById('pick-hint');
      const hintText = document.getElementById('pick-hint-text');
      if (hintText) hintText.textContent = 'Click a file or folder to link it to "' + target.name + '" — Esc to cancel!';
      if (hint) hint.classList.add('open');
    } catch (e) {}
    renderDrawer();
    return true;
  }

  function armPickMerge(mergeId) {
    const target = findFolderById(D(), mergeId);
    if (!target || target.kind !== 'merge') return false;
    cabinetPickMergeId = mergeId;
    cabinetPickInsideId = null;
    cabinetPickLinkId = null;
    try {
      const grid = document.getElementById('file-grid');
      if (grid) grid.classList.add('picking-inside');
      const hint = document.getElementById('pick-hint');
      const hintText = document.getElementById('pick-hint-text');
      if (hintText) hintText.textContent = 'Click a Branch or Node to merge it into "' + target.name + '" — Esc to cancel!';
      if (hint) hint.classList.add('open');
    } catch (e) {}
    renderDrawer();
    return true;
  }

  // Merge a Branch/Node into a Merge: contents + tags flow in, source vanishes!
  function cabinetMergeInto(mergeId, sourceId) {
    if (!mergeId || !sourceId || mergeId === sourceId) return false;
    const merge = findFolderById(D(), mergeId);
    if (!merge || merge.kind !== 'merge') return false;
    const source = findFolderById(D(), sourceId);
    if (!source || (source.kind !== 'branch' && source.kind !== 'node')) return false;
    // Never absorb your own container!
    if (folderContainsFolder(source, mergeId)) return false;
    const host = findParentFolderOf(D(), sourceId) || D();
    function tagTree(folder) {
      (folder.files || []).forEach(function (f) {
        f.tags = f.tags || [];
        if (!f.tags.includes(merge.name)) f.tags.push(merge.name);
      });
      (folder.folders || []).forEach(tagTree);
    }
    tagTree(source);
    if (source.code) {
      merge.tags = merge.tags || [];
      if (!merge.tags.includes(source.code)) merge.tags.push(source.code);
    }
    (source.tags || []).forEach(function (t) {
      merge.tags = merge.tags || [];
      if (!merge.tags.includes(t)) merge.tags.push(t);
    });
    if (source.kind === 'node' && source.note) {
      merge.notes = merge.notes || [];
      merge.notes.push({ id: uid(), from: source.name, note: source.note, at: Date.now() });
    }
    merge.files = (merge.files || []).concat(source.files || []);
    merge.folders = (merge.folders || []).concat(source.folders || []);
    host.folders = (host.folders || []).filter(function (f) { return f.id !== sourceId; });
    openDetailIds[mergeId] = true;
    // Jump inside the Merge so the absorbed contents are unmistakable!
    const mergePath = findPathToFolder(D(), mergeId, []);
    if (mergePath) {
      currentTagFilter = '';
      try {
        const tagFilterEl = document.getElementById('tag-filter');
        if (tagFilterEl) tagFilterEl.value = '';
      } catch (e) {}
      currentFolderPath = mergePath;
    }
    saveDrawer();
    renderDrawer();
    return true;
  }

  // All Merge names in this drawer (absorbed files wear them in purple)!
  function mergeNameSet() {
    const out = {};
    (function walk(folder) {
      (folder.folders || []).forEach(function (sub) {
        if (sub.kind === 'merge') out[sub.name] = true;
        walk(sub);
      });
    })(D());
    return out;
  }

  // Inside Merge territory, content tags wear Merge purple!
  function folderLivesInMerge(folderId) {
    let found = false;
    (function walk(folder, underMerge) {
      if (found) return;
      const now = underMerge || folder.kind === 'merge';
      if ((folder.folders || []).some(function (s) { return s.id === folderId; })) {
        if (now) found = true;
        return;
      }
      (folder.folders || []).forEach(function (s) { walk(s, now); });
    })(D(), false);
    return found;
  }

  function fileLivesInMerge(fileId) {
    let found = false;
    (function walk(folder, underMerge) {
      if (found) return;
      const now = underMerge || folder.kind === 'merge';
      if ((folder.files || []).some(function (f) { return f.id === fileId; })) {
        if (now) found = true;
        return;
      }
      (folder.folders || []).forEach(function (s) { walk(s, now); });
    })(D(), false);
    return found;
  }

  function disarmPickInside() {
    if (!cabinetPickInsideId && !cabinetPickLinkId && !cabinetPickMergeId) return;
    cabinetPickInsideId = null;
    cabinetPickLinkId = null;
    cabinetPickMergeId = null;
    try {
      const grid = document.getElementById('file-grid');
      if (grid) grid.classList.remove('picking-inside');
      const hint = document.getElementById('pick-hint');
      if (hint) hint.classList.remove('open');
      document.querySelectorAll('.folder-card.pick-armed').forEach(function (el) { el.classList.remove('pick-armed'); });
    } catch (e) {}
  }

  function findPathToFile(folder, fileId, base) {
    base = base || [];
    for (const f of (folder.files || [])) if (f.id === fileId) return base.slice();
    for (const sub of (folder.folders || [])) {
      const found = findPathToFile(sub, fileId, base.concat(sub.id));
      if (found) return found;
    }
    return null;
  }

  function findPathToFolder(folder, folderId, base) {
    base = base || [];
    for (const sub of (folder.folders || [])) {
      if (sub.id === folderId) return base.concat(sub.id);
      const found = findPathToFolder(sub, folderId, base.concat(sub.id));
      if (found) return found;
    }
    return null;
  }

  function cabinetJumpToFile(fileId) {
    const path = findPathToFile(D(), fileId, []);
    if (!path) return false;
    currentTagFilter = '';
    const tagFilter = document.getElementById('tag-filter');
    if (tagFilter) tagFilter.value = '';
    currentFolderPath = path;
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetAddFilesToFolder(folderId, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return Promise.resolve([]);
    const target = findFolderById(D(), folderId);
    if (!target) return Promise.resolve([]);
    return Promise.all(files.map(function (file) {
      return readFileAsDataURL(file).then(function (dataUrl) {
        return { id: uid(), name: file.name || 'untitled', type: file.type || '', size: file.size || 0, dataUrl: dataUrl, tags: [] };
      });
    })).then(function (entries) {
      // Linkers can't hold files: land uploads in the parent and link them!
      if (target.kind === 'linker') {
        const host = findParentFolderOf(D(), folderId) || D();
        host.files = (host.files || []).concat(entries);
        target.links = target.links || [];
        entries.forEach(function (en) {
          target.links.push({ id: uid(), fileId: en.id, addedAt: Date.now() });
        });
        saveDrawer();
        renderDrawer();
        return entries;
      }
      target.files = (target.files || []).concat(entries);
      saveDrawer();
      renderDrawer();
      return entries;
    });
  }

  function cloneFolderDeep(folder, nameSuffix) {
    const idMap = {};
    function kindOf(f) { return normFolderKind(f.kind); }
    function cloneFiles(files) {
      return (files || []).map(function (f) {
        const nid = uid();
        idMap[f.id] = nid;
        return { id: nid, name: f.name, type: f.type, size: f.size, dataUrl: f.dataUrl, tags: (f.tags || []).slice() };
      });
    }
    function cloneSubs(folders) {
      return (folders || []).map(function (sub) {
        const k = kindOf(sub);
        return { id: uid(), name: sub.name, kind: k, note: String(sub.note || '').substring(0, 280), powered: k === 'node' ? sub.powered !== false : undefined, links: [], entries: k === 'log' ? cloneEntries(sub.entries) : [], code: k === 'branch' ? genBranchCode() : undefined, color: k === 'branch' ? cleanBranchColor(sub.color) : undefined, notes: k === 'merge' ? cloneMergeNotes(sub.notes) : [], tags: (sub.tags || []).slice(), files: cloneFiles(sub.files), folders: cloneSubs(sub.folders) };
      });
    }
    function cloneEntries(entries) {
      return (entries || []).map(function (e) {
        return { id: uid(), text: String(e.text || '').substring(0, 280), addedAt: Number(e.addedAt) || Date.now() };
      });
    }
    function cloneMergeNotes(notes) {
      return (notes || []).map(function (n) {
        return { id: uid(), from: String(n.from || '').substring(0, 60), note: String(n.note || '').substring(0, 280), at: Number(n.at) || Date.now() };
      });
    }
    const clonedFiles = cloneFiles(folder.files);
    const clonedSubs = cloneSubs(folder.folders);
    // Remap links: inside-clone references follow the copies, outside ones stay!
    function remapLinks(subs, origSubs) {
      (subs || []).forEach(function (cs, i) {
        const os = (origSubs || [])[i];
        if (!os) return;
        if (kindHoldsLinks(kindOf(cs))) {
          cs.links = (os.links || []).map(function (l) {
            const out = { id: uid(), addedAt: l.addedAt || Date.now() };
            if (l.fileId) out.fileId = idMap[l.fileId] || l.fileId;
            if (l.folderId) out.folderId = l.folderId;
            return out;
          });
        }
        remapLinks(cs.folders, os.folders);
      });
    }
    const k = kindOf(folder);
    const root = { id: uid(), name: String(folder.name + (nameSuffix || ' copy')).substring(0, 60), kind: k, note: String(folder.note || '').substring(0, 280), powered: k === 'node' ? folder.powered !== false : undefined, entries: k === 'log' ? cloneEntries(folder.entries) : [], code: k === 'branch' ? genBranchCode() : undefined, color: k === 'branch' ? cleanBranchColor(folder.color) : undefined, notes: k === 'merge' ? cloneMergeNotes(folder.notes) : [], tags: (folder.tags || []).slice(), files: clonedFiles, folders: clonedSubs };
    if (kindHoldsLinks(k)) {
      root.links = (folder.links || []).map(function (l) {
        const out = { id: uid(), addedAt: l.addedAt || Date.now() };
        if (l.fileId) out.fileId = idMap[l.fileId] || l.fileId;
        if (l.folderId) out.folderId = l.folderId;
        return out;
      });
    } else {
      root.links = [];
    }
    remapLinks(root.folders, folder.folders);
    return root;
  }

  function cabinetDuplicateFolder(folderId) {
    const parent = getCurrentFolder() || D();
    const target = (parent.folders || []).find(function (f) { return f.id === folderId; }) || findFolderById(D(), folderId);
    if (!target) return false;
    const host = (parent.folders || []).some(function (f) { return f.id === folderId; }) ? parent : (findParentFolderOf(D(), folderId) || parent);
    host.folders = host.folders || [];
    host.folders.push(cloneFolderDeep(target, ' copy'));
    saveDrawer();
    renderDrawer();
    return true;
  }

  // Branch a Branch: clone it and stamp the source's 4-char code as a tag!
  function cabinetBranchClone(folderId) {
    const target = findFolderById(D(), folderId);
    if (!target || target.kind !== 'branch') return false;
    const host = findParentFolderOf(D(), folderId) || D();
    const clone = cloneFolderDeep(target, ' branch');
    clone.tags = clone.tags || [];
    if (target.code && !clone.tags.includes(target.code)) clone.tags.unshift(target.code);
    host.folders = host.folders || [];
    host.folders.push(clone);
    openDetailIds[clone.id] = true;
    saveDrawer();
    renderDrawer();
    return clone.id;
  }

  function cabinetSetBranchColor(folderId, hex) {
    const target = findFolderById(D(), folderId);
    if (!target || target.kind !== 'branch') return false;
    target.color = cleanBranchColor(hex);
    saveDrawer();
    renderDrawer();
    return true;
  }

  // Read the RGB sliders inside a Branch color panel!
  function branchPanelHex(panel) {
    try {
      const r = panel.querySelector('[data-branch-r]');
      const g = panel.querySelector('[data-branch-g]');
      const b = panel.querySelector('[data-branch-b]');
      const hex = rgbToHex(r ? r.value : 0, g ? g.value : 0, b ? b.value : 0);
      const swatch = panel.querySelector('[data-branch-swatch]');
      const label = panel.querySelector('[data-branch-hex]');
      if (swatch) swatch.style.background = hex;
      if (label) label.textContent = hex;
      return hex;
    } catch (e) { return ''; }
  }

  function findParentFolderOf(folder, id) {
    for (const sub of (folder.folders || [])) {
      if (sub.id === id) return folder;
      const found = findParentFolderOf(sub, id);
      if (found) return found;
    }
    return null;
  }

  function folderContainsFolder(folder, id) {
    for (const sub of (folder.folders || [])) {
      if (sub.id === id) return true;
      if (folderContainsFolder(sub, id)) return true;
    }
    return false;
  }

  function cabinetMoveFolderToFolder(folderId, targetFolderId) {
    if (!folderId || !targetFolderId || folderId === targetFolderId) return false;
    const dragged = findFolderById(D(), folderId);
    if (!dragged) return false;
    // Never allow cycles: a folder can't go inside itself or its own child!
    if (folderContainsFolder(dragged, targetFolderId)) return false;
    const target = findFolderById(D(), targetFolderId);
    if (!target) return false;
    const host = findParentFolderOf(D(), folderId) || D();
    if (host === target) return false;
    host.folders = (host.folders || []).filter(function (f) { return f.id !== folderId; });
    target.folders = target.folders || [];
    target.folders.push(dragged);
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetMoveFolderToPath(folderId, targetPath) {
    if (!folderId) return false;
    const path = Array.isArray(targetPath) ? targetPath : [];
    // Never allow cycles: the target path can't pass through the dragged folder!
    if (path.includes(folderId)) return false;
    const dragged = findFolderById(D(), folderId);
    if (!dragged) return false;
    const target = findFolder(path);
    if (!target) return false;
    const host = findParentFolderOf(D(), folderId) || D();
    if (host === target) return false;
    host.folders = (host.folders || []).filter(function (f) { return f.id !== folderId; });
    target.folders = target.folders || [];
    target.folders.push(dragged);
    saveDrawer();
    renderDrawer();
    return true;
  }

  // Drop a file onto another file: group both into a brand-new folder!
  function cabinetGroupFilesIntoFolder(sourceId, targetId, name) {
    if (!sourceId || !targetId || sourceId === targetId) return false;
    const targetParent = findParentOfFile(D(), targetId) || getCurrentFolder() || D();
    const tIdx = (targetParent.files || []).findIndex(function (f) { return f.id === targetId; });
    if (tIdx === -1) return false;
    const sourceParent = findParentOfFile(D(), sourceId);
    if (!sourceParent) return false;
    const sIdx = (sourceParent.files || []).findIndex(function (f) { return f.id === sourceId; });
    if (sIdx === -1) return false;
    const label = String(name || '').trim().substring(0, 60) || 'New Folder';
    const targetEntry = targetParent.files[tIdx];
    const sourceEntry = sourceParent.files[sIdx];
    sourceParent.files.splice(sIdx, 1);
    // Re-find target index in case both lived in the same folder!
    const tIdx2 = (targetParent.files || []).findIndex(function (f) { return f.id === targetId; });
    if (tIdx2 === -1) return false;
    targetParent.files.splice(tIdx2, 1);
    targetParent.folders = targetParent.folders || [];
    const group = { id: uid(), name: label, kind: 'folder', note: '', powered: undefined, links: [], tags: [], files: [targetEntry, sourceEntry], folders: [] };
    targetParent.folders.push(group);
    saveDrawer();
    renderDrawer();
    return group.id;
  }

  function cabinetSetFolderNote(folderId, note) {
    const target = findFolderById(D(), folderId);
    if (!target) return false;
    target.note = String(note || '').substring(0, 280);
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetToggleFolderPower(folderId) {
    const target = findFolderById(D(), folderId);
    if (!target || target.kind !== 'node') return false;
    target.powered = target.powered === false ? true : false;
    saveDrawer();
    renderDrawer();
    return target.powered;
  }

  function cabinetLogEntry(folderId, text) {
    const target = findFolderById(D(), folderId);
    if (!target || target.kind !== 'log') return false;
    const clean = String(text || '').trim().substring(0, 280);
    if (!clean) return false;
    target.entries = target.entries || [];
    if (target.entries.length >= 200) target.entries.shift();
    target.entries.push({ id: uid(), text: clean, addedAt: Date.now() });
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetDeleteLogEntry(folderId, entryId) {
    const target = findFolderById(D(), folderId);
    if (!target || target.kind !== 'log') return false;
    target.entries = (target.entries || []).filter(function (e) { return e.id !== entryId; });
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetExportFolder(folderId) {
    const target = findFolderById(D(), folderId);
    if (!target) return false;
    const bundle = kcStringifyDrawer(target.name, target.files, target.folders);
    playCabinetSound(750, 0.12);
    return downloadBlob(new Blob([bundle], { type: 'text/yaml;charset=utf-8' }), slugName(target.name) + '.kc');
  }

  function cabinetRemoveFolder(folderId) {
    const folder = getCurrentFolder() || D();
    folder.folders = (folder.folders || []).filter(function (f) { return f.id !== folderId; });
    saveDrawer();
    renderDrawer();
  }

  function cabinetRenameFolder(folderId, name) {
    const target = findFolderById(D(), folderId);
    if (!target) return false;
    const clean = String(name || '').trim().substring(0, 60);
    if (!clean) return false;
    target.name = clean;
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetAddFolderTag(folderId, tagName) {
    const target = findFolderById(D(), folderId);
    if (!target) return;
    target.tags = target.tags || [];
    if (!target.tags.includes(tagName)) target.tags.push(tagName);
    saveDrawer();
    renderDrawer();
  }

  function cabinetRemoveFolderTag(folderId, tagName) {
    const target = findFolderById(D(), folderId);
    if (target) {
      target.tags = (target.tags || []).filter(function (t) { return t !== tagName; });
      saveDrawer();
      renderDrawer();
    }
  }

  function cabinetDownloadFile(id) {
    const f = cabinetFindFile(id);
    if (!f || !f.dataUrl) return false;
    const bytes = dataUrlToBytes(f.dataUrl);
    if (!bytes) return false;
    const parts = f.dataUrl.split(',');
    const mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    try {
      return downloadBlob(new Blob([bytes], { type: mime }), f.name);
    } catch (e) { return false; }
  }

  function dataUrlToBytes(dataUrl) {
    try {
      const parts = String(dataUrl || '').split(',');
      const base64 = parts[1] || '';
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch (e) { return null; }
  }

  // ---- Minimal ZIP builder (STORE, no compression, zero dependencies!) ----
  var ZIP_CRC_TABLE = null;
  function zipCrc32(bytes) {
    if (!ZIP_CRC_TABLE) {
      ZIP_CRC_TABLE = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        ZIP_CRC_TABLE[n] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = ZIP_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function zipDosTime(date) {
    const d = date || new Date();
    const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((Math.floor(d.getSeconds() / 2)) & 31);
    const day = ((d.getFullYear() - 1980) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
    return { time: time, date: day };
  }

  function zipEncodeName(name) {
    try {
      if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(name);
    } catch (e) {}
    const bytes = [];
    for (let i = 0; i < name.length; i++) {
      let code = name.charCodeAt(i);
      if (code < 128) bytes.push(code);
      else if (code < 2048) bytes.push(192 | (code >> 6), 128 | (code & 63));
      else bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
    }
    return new Uint8Array(bytes);
  }

  function zipSanitizeSegment(name) {
    return String(name || 'untitled').replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+/, '_').substring(0, 100) || 'untitled';
  }

  function collectFolderZipEntries(folder, basePath, seen) {
    const entries = [];
    seen = seen || {};
    // Cycle guard: linked folders can reference back up the tree!
    const seenKey = '__folder__' + String((folder && folder.id) || '');
    if (seen[seenKey]) return entries;
    seen[seenKey] = true;
    function pushFile(name, bytes) {
      if (!bytes) return;
      let filePath = basePath + zipSanitizeSegment(name);
      let n = 1;
      while (seen[filePath]) {
        const seg = zipSanitizeSegment(name);
        const dot = seg.lastIndexOf('.');
        filePath = dot > 0
          ? basePath + seg.substring(0, dot) + ' (' + (n++) + ')' + seg.substring(dot)
          : basePath + seg + ' (' + (n++) + ')';
      }
      seen[filePath] = true;
      entries.push({ path: filePath, dir: false, bytes: bytes });
    }
    const folders = folder.folders || [];
    const files = folder.files || [];
    folders.forEach(function (sub) {
      const dirPath = basePath + zipSanitizeSegment(sub.name) + '/';
      let uniqueDir = dirPath;
      let n = 1;
      while (seen[uniqueDir]) uniqueDir = basePath + zipSanitizeSegment(sub.name) + ' (' + (n++) + ')/';
      seen[uniqueDir] = true;
      entries.push({ path: uniqueDir, dir: true, bytes: null });
      collectFolderZipEntries(sub, uniqueDir, seen).forEach(function (e) { entries.push(e); });
    });
    files.forEach(function (f) {
      pushFile(f.name, dataUrlToBytes(f.dataUrl));
    });
    // Log entries ship as a plain-text log alongside the files!
    if (folder.kind === 'log' && (folder.entries || []).length) {
      const text = (folder.entries || []).map(function (en) {
        let stamp = '';
        try { stamp = new Date(en.addedAt).toISOString(); } catch (e) { stamp = ''; }
        return (stamp ? '[' + stamp + '] ' : '') + String(en.text || '');
      }).join('\n') + '\n';
      pushFile('_log.txt', zipEncodeName(text));
    }
    // Connector links ship as handy copies under _links/ (references stay put)!
    if (folderHoldsLinks(folder)) {
      (folder.links || []).forEach(function (l) {
        if (l.folderId) {
          // Linked folders materialize as full subtrees under _links/!
          const linked = findFolderById(D(), l.folderId);
          if (!linked) return;
          const linkDir = basePath + '_links/' + zipSanitizeSegment(linked.name) + '/';
          let uniqueDir = linkDir;
          let n = 1;
          while (seen[uniqueDir]) uniqueDir = basePath + '_links/' + zipSanitizeSegment(linked.name) + ' (' + (n++) + ')/';
          seen[uniqueDir] = true;
          entries.push({ path: uniqueDir, dir: true, bytes: null });
          collectFolderZipEntries(linked, uniqueDir, seen).forEach(function (e) { entries.push(e); });
          return;
        }
        const target = findFileRecursive(D(), l.fileId);
        if (!target) return;
        const bytes = dataUrlToBytes(target.dataUrl);
        if (!bytes) return;
        const linkDir = basePath + '_links/';
        if (!seen[linkDir]) { seen[linkDir] = true; entries.push({ path: linkDir, dir: true, bytes: null }); }
        let filePath = linkDir + zipSanitizeSegment(target.name);
        let n = 1;
        while (seen[filePath]) {
          const seg = zipSanitizeSegment(target.name);
          const dot = seg.lastIndexOf('.');
          filePath = dot > 0
            ? linkDir + seg.substring(0, dot) + ' (' + (n++) + ')' + seg.substring(dot)
            : linkDir + seg + ' (' + (n++) + ')';
        }
        seen[filePath] = true;
        entries.push({ path: filePath, dir: false, bytes: bytes });
      });
    }
    return entries;
  }

  function zipBuild(entries) {
    const dos = zipDosTime(new Date());
    const encNames = entries.map(function (e) { return zipEncodeName(e.path); });
    let totalSize = 0;
    let centralSize = 0;
    entries.forEach(function (e, i) {
      const nameLen = encNames[i].length;
      totalSize += 30 + nameLen + (e.dir ? 0 : e.bytes.length);
      centralSize += 46 + nameLen;
    });
    totalSize += centralSize + 22;
    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);
    const out = new Uint8Array(buf);
    let offset = 0;
    const offsets = [];
    entries.forEach(function (e, i) {
      const nameBytes = encNames[i];
      const crc = e.dir ? 0 : zipCrc32(e.bytes);
      const size = e.dir ? 0 : e.bytes.length;
      offsets.push(offset);
      view.setUint32(offset, 0x04034b50, true); offset += 4;
      view.setUint16(offset, 20, true); offset += 2;
      view.setUint16(offset, 0x0800, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, dos.time, true); offset += 2;
      view.setUint16(offset, dos.date, true); offset += 2;
      view.setUint32(offset, crc, true); offset += 4;
      view.setUint32(offset, size, true); offset += 4;
      view.setUint32(offset, size, true); offset += 4;
      view.setUint16(offset, nameBytes.length, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      out.set(nameBytes, offset); offset += nameBytes.length;
      if (!e.dir) { out.set(e.bytes, offset); offset += e.bytes.length; }
    });
    const centralStart = offset;
    entries.forEach(function (e, i) {
      const nameBytes = encNames[i];
      const crc = e.dir ? 0 : zipCrc32(e.bytes);
      const size = e.dir ? 0 : e.bytes.length;
      view.setUint32(offset, 0x02014b50, true); offset += 4;
      view.setUint16(offset, 63, true); offset += 2;
      view.setUint16(offset, 20, true); offset += 2;
      view.setUint16(offset, 0x0800, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, dos.time, true); offset += 2;
      view.setUint16(offset, dos.date, true); offset += 2;
      view.setUint32(offset, crc, true); offset += 4;
      view.setUint32(offset, size, true); offset += 4;
      view.setUint32(offset, size, true); offset += 4;
      view.setUint16(offset, nameBytes.length, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint32(offset, e.dir ? (0x10 << 16) : 0, true); offset += 4;
      view.setUint32(offset, offsets[i], true); offset += 4;
      out.set(nameBytes, offset); offset += nameBytes.length;
    });
    const centralLen = offset - centralStart;
    view.setUint32(offset, 0x06054b50, true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, entries.length, true); offset += 2;
    view.setUint16(offset, entries.length, true); offset += 2;
    view.setUint32(offset, centralLen, true); offset += 4;
    view.setUint32(offset, centralStart, true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;
    return new Blob([buf], { type: 'application/zip' });
  }

  function cabinetDownloadFolder(folderId) {
    const target = findFolderById(D(), folderId);
    if (!target) return false;
    const base = zipSanitizeSegment(target.name) + '/';
    const entries = collectFolderZipEntries(target, base, {});
    if (!entries.length) {
      // Empty folder? Still ship a zip with the directory entry!
      entries.push({ path: base, dir: true, bytes: null });
    }
    try {
      const blob = zipBuild(entries);
      playCabinetSound(700, 0.12);
      return downloadBlob(blob, slugName(target.name) + '.zip');
    } catch (e) { return false; }
  }

  function cabinetExportDrawer() {
    return downloadBlob(new Blob([cabinetSerializeDrawer()], { type: 'text/yaml;charset=utf-8' }), slugName(D().name) + '.kc');
  }

  // Whole-drawer .zip export: plain files + folders, links as _links/ copies!
  function cabinetExportZip() {
    try {
      const entries = collectFolderZipEntries(D(), '', {});
      const blob = zipBuild(entries);
      return downloadBlob(blob, slugName(D().name) + '.zip');
    } catch (e) { return false; }
  }

  function cabinetImportDrawer(file) {
    if (!file) return Promise.resolve(false);
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () {
        const parsed = cabinetParseDrawer(reader.result);
        if (!parsed) { resolve(false); return; }
        drawers.push({ id: uid(), name: parsed.name, files: parsed.files, folders: parsed.folders || [] });
        activeDrawerId = drawers[drawers.length - 1].id;
        saveDrawer();
        renderDrawer();
        resolve(true);
      };
      reader.onerror = function () { resolve(false); };
      try { reader.readAsText(file); } catch (e) { resolve(false); }
    });
  }

  function cabinetNewDrawer() {
    const d = { id: uid(), name: 'Drawer ' + (drawers.length + 1), files: [], folders: [] };
    drawers.push(d);
    activeDrawerId = d.id;
    currentFolderPath = [];
    currentTagFilter = '';
    openDetailIds = {};
    disarmPickInside();
    saveDrawer();
    renderDrawer();
    return d.id;
  }

  function cabinetFreshDrawer() {
    drawers = [{ id: uid(), name: 'My Drawer', files: [], folders: [] }];
    activeDrawerId = drawers[0].id;
    currentFolderPath = [];
    currentTagFilter = '';
    openDetailIds = {};
    disarmPickInside();
    saveDrawer();
    renderDrawer();
  }

  function cabinetSwitchDrawer(id) {
    if (!drawers.some(function (d) { return d.id === id; })) return false;
    activeDrawerId = id;
    currentFolderPath = [];
    currentTagFilter = '';
    openDetailIds = {};
    disarmPickInside();
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetDeleteDrawer(id) {
    if (drawers.length <= 1) {
      cabinetFreshDrawer();
      return true;
    }
    drawers = drawers.filter(function (d) { return d.id !== id; });
    if (activeDrawerId === id) activeDrawerId = drawers[0].id;
    saveDrawer();
    renderDrawer();
    return true;
  }

  function cabinetRename(name) {
    D().name = String(name || '').substring(0, 60) || 'My Drawer';
    saveDrawer();
    renderDrawer();
  }

  // ---- Rendering: files as cards (image previews inline!) ----
  const ICON_FILE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" /></svg>';
  const ICON_MUSIC = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 17.982C8.25 19.65 6.85 21 5.126 21C3.399 21 2 19.649 2 17.982c0-1.665 1.4-3.016 3.126-3.016s3.124 1.35 3.124 3.016m0 0V5.077c0-.551.438-1.01 1.01-1.06l11.528-1.013a1.16 1.16 0 0 1 .852.275q.172.151.267.356q.094.206.093.43v12.711m0 0c0 1.665-1.4 3.017-3.125 3.017s-3.125-1.352-3.125-3.018s1.4-3.018 3.125-3.018S22 15.11 22 16.777m0 0v.001" /></svg>';
  const ICON_VIDEO = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 3v4.225m0 0V12m0-4.775h4.5M17 12v4.718M17 12h5m-5 0H7m10 4.718V21m0-4.282h4.5M7 7.225H2.5m4.5 0V3m0 4.225V12m0 0H2m5 0v4.718m0 0H2.5m4.5 0V21M2 8a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6z" /></svg>';
  const ICON_KD = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.476 2H7.5a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-7M9.476 2C10.856 2 12 3.119 12 4.5V7a2.5 2.5 0 0 0 2.5 2.5H17a2.5 2.5 0 0 1 2.5 2.5M9.476 2C13.576 2 19.5 7.956 19.5 12M8.833 17.5H15.5M8.833 14h4.445" /></svg>';
  const ICON_KS = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18M3 15h18M9 9v12m6-12v12"/></g></svg>';
  const ICON_KV = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="m3.929 20.071l-.964-.268a1 1 0 0 0 1.232 1.232zm6.364-1.414l.12.993zm-4.95-4.95l.993.12zm14.143-4.95A1 1 0 1 0 20.9 7.343l-.707.707zm-2.829-5.656a1 1 0 1 0-1.414 1.414l.707-.707zM6.597 7.83l-.372-.928zm6.99-2.143l.708-.707zm4.946 5.803l.929.372zm-.221-1.078l.707-.708zm-2.144 6.99l-.928-.37zm-.801.621l-.126-.992zm.801-.62l.929.371l2.365-5.912l-.929-.372l-.928-.371l-2.365 5.912zm2.144-6.991l.707-.708l-4.724-4.724l-.707.707l-.707.707l4.724 4.725zm-5.803-4.946l-.371-.929l-5.913 2.365l.372.929l.37.928l5.914-2.365zM3.93 20.07l.268.964l.002-.001l.008-.002l.034-.01l.131-.035a79 79 0 0 1 2.128-.549c1.308-.319 2.848-.66 3.913-.788l-.12-.993l-.12-.993c-1.195.145-2.838.512-4.147.831a90 90 0 0 0-2.179.562l-.137.037l-.036.01l-.01.003h-.002zm6.364-1.414l.12.993c1.644-.2 3.999-.497 5.08-.634l-.127-.992l-.125-.992c-1.081.137-3.43.434-5.068.632zM5.976 8.634l-.992-.126c-.137 1.08-.434 3.435-.634 5.079l.993.12l.993.12c.198-1.637.495-3.987.632-5.068zm-.633 5.073l-.993-.12c-.129 1.065-.47 2.605-.788 3.913a89 89 0 0 1-.584 2.26l-.01.033l-.002.008v.002l1.926.536v-.001l.001-.003l.003-.01l.01-.035a49 49 0 0 0 .172-.64a90 90 0 0 0 .427-1.676c.32-1.31.686-2.951.83-4.146zm-.707 5.657l.707.707L11 14.414l-.707-.707L9.586 13l-5.657 5.657zm5.657-7.07L11 13l.707-.707l.707-.707a2 2 0 0 0-2.828 0zm1.414 0L11 13l.707.707l.707.707a2 2 0 0 0 0-2.828zm0 1.413L11 13l-.707.707l-.707.707a2 2 0 0 0 2.828 0zm-1.414 0L11 13l-.707-.707l-.707-.707a2 2 0 0 0 0 2.829zm9.9-5.657l.707-.707l-4.243-4.242l-.707.707l-.707.707l4.243 4.242zM6.597 7.832l-.372-.929c-.674.27-1.15.884-1.24 1.605l.991.126l.992.125v.001zm6.99-2.144l.708-.707a2 2 0 0 0-2.157-.443l.371.929l.371.928zm4.946 5.803l.929.372a2 2 0 0 0-.443-2.158l-.707.708l-.707.707zm-2.365 5.913l-.928-.372l.127.992l.125.992a2 2 0 0 0 1.605-1.241z"/></svg>';
  const ICON_KA = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 3h20m-2.111 0v11a2.003 2.003 0 0 1-2 2H6.11a2 2 0 0 1-1.847-1.233A2 2 0 0 1 4.111 14V3M7 21l5-5l5 5" /></svg>';
  const ICON_KB = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21 11.722c0 5.186-18 5.186-18 0m0-6.389V18.85c0 4.2 18 4.2 18 0V5.333M12 2C7.03 2 3 3.433 3 5.2c0 4.622 18 4.622 18 0C21 3.433 16.97 2 12 2" /><path d="M15.037 11.801c.936-.128 1.824-.32 2.615-.572M15 18.573A15.7 15.7 0 0 0 17.615 18" /></g></svg>';
  const ICON_KF = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H6.5A2.5 2.5 0 0 0 4 6.5v12A3.5 3.5 0 0 0 7.5 22h9a3.5 3.5 0 0 0 3.5-3.5v-12A2.5 2.5 0 0 0 17.5 4H16m-6-2h4c2.64 0 2.65 4 0 4h-4c-2.65 0-2.64-4 0-4m2.5 9h4m-4 5h4m-9-5h1m-1 5h1" /></svg>';

  function cardHTML(f) {
    let previewContent = ICON_FILE;
    let previewClass = 'file-preview';
    const kind = radiiFileKind(f.name);
    if (isImageFile(f.type, f.name) && f.dataUrl) {
      previewContent = '<img src="' + f.dataUrl + '" alt="">';
    } else if (isAudioFile(f.type, f.name)) {
      previewContent = ICON_MUSIC;
      previewClass = 'file-preview audio-preview';
    } else if (isVideoFile(f.type, f.name)) {
      previewContent = ICON_VIDEO;
      previewClass = 'file-preview video-preview';
    } else if (kind === 'kd') {
      previewContent = ICON_KD;
      previewClass = 'file-preview kd-preview';
    } else if (kind === 'ks') {
      previewContent = ICON_KS;
      previewClass = 'file-preview ks-preview';
    } else if (kind === 'kv') {
      previewContent = ICON_KV;
      previewClass = 'file-preview kv-preview';
    } else if (kind === 'ka') {
      previewContent = ICON_KA;
      previewClass = 'file-preview ka-preview';
    } else if (kind === 'kb') {
      previewContent = ICON_KB;
      previewClass = 'file-preview kb-preview';
    } else if (kind === 'kf') {
      previewContent = ICON_KF;
      previewClass = 'file-preview kf-preview';
    }
    const tags = f.tags || [];
    const branchCodes = branchCodeSet();
    const mergeNames = mergeNameSet();
    const inMerge = fileLivesInMerge(f.id);
    const tagChips = tags.map(function (t) {
      const branchCls = (mergeNames[t] || inMerge) ? ' merge-tag' : (branchCodes[t] ? ' branch-tag' : '');
      return '<span class="tag-chip' + branchCls + '" data-tag="' + escHtml(t) + '">' + escHtml(t) + '<span class="tag-close">×</span></span>';
    }).join(' ');
    // Connector-colored linked tag when any connector links to this file!
    const linkedBy = findLinkingFolders(f.id);
    const linkedChips = linkedBy.map(function (c) {
      const linkerCls = c.kind === 'linker' ? ' linker-tag' : '';
      return '<span class="linked-tag' + linkerCls + '" title="Linked in ' + (c.kind === 'linker' ? 'Linker' : 'Connector') + ': ' + escHtml(c.name) + '">⇄ ' + escHtml(c.name) + '</span>';
    }).join(' ');
    const tagDisplay = (tags.length > 0 ? tagChips + ' ' : '') + linkedChips;
    return '<div class="' + previewClass + '" data-preview="' + escHtml(f.id) + '">' + previewContent + '</div>' +
      '<div class="file-tags">' + tagDisplay + '<button type="button" class="add-tag-btn" data-add-tag="' + escHtml(f.id) + '">+ Tag</button></div>' +
      '<div class="file-meta"><div class="file-name" data-rename-file="' + escHtml(f.id) + '" title="' + escHtml(f.name) + ' (double-click to rename!)">' + escHtml(f.name) + '</div>' +
      '<div class="file-sub">' + escHtml(fileExt(f.name)) + ' · ' + escHtml(fmtSize(f.size)) + '</div></div>' +
      '<div class="file-actions"><button type="button" data-download="' + escHtml(f.id) + '">Download</button>' +
      '<button type="button" class="danger" data-remove="' + escHtml(f.id) + '">Delete</button></div>';
  }

  function renderDrawer() {
    const grid = document.getElementById('file-grid');
    const empty = document.getElementById('drawer-empty');
    const title = document.getElementById('drawer-title');
    const sub = document.getElementById('drawer-sub');
    const total = document.getElementById('drawer-total');
    const foot = document.getElementById('drawer-foot-count');
    const nameInput = document.getElementById('drawer-name-input');
    const tagFilter = document.getElementById('tag-filter');
    const breadcrumb = document.getElementById('folder-breadcrumb');
    if (!grid) return;
    
    const currentFolder = getCurrentFolder() || D();
    
    // Collect all unique tags from current drawer (all folders + folder tags + links!)
    function collectTags(folder) {
      const tags = new Set();
      (folder.files || []).forEach(function (f) { (f.tags || []).forEach(function (t) { tags.add(t); }); });
      (folder.folders || []).forEach(function (f) {
        (f.tags || []).forEach(function (t) { tags.add(t); });
        (f.links || []).forEach(function (l) {
          if (l.fileId) {
            const target = findFileRecursive(D(), l.fileId);
            if (target) (target.tags || []).forEach(function (t) { tags.add(t); });
          } else if (l.folderId) {
            const linked = findFolderById(D(), l.folderId);
            if (linked) (linked.tags || []).forEach(function (t) { tags.add(t); });
          }
        });
        collectTags(f).forEach(function (t) { tags.add(t); });
      });
      return tags;
    }
    const allTags = collectTags(D());
    
    // Update tag filter dropdown
    if (tagFilter) {
      const currentValue = tagFilter.value;
      tagFilter.innerHTML = '<option value="">All Files</option>';
      Array.from(allTags).sort().forEach(function (tag) {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = tag;
        tagFilter.appendChild(opt);
      });
      tagFilter.value = allTags.has(currentValue) ? currentValue : '';
      currentTagFilter = tagFilter.value;
    }
    
    // Build breadcrumb
    if (breadcrumb) {
      breadcrumb.innerHTML = '';
      const root = document.createElement('span');
      root.className = 'breadcrumb-item';
      root.textContent = D().name;
      root.setAttribute('data-path', '');
      breadcrumb.appendChild(root);
      currentFolderPath.forEach(function (folderId, index) {
        const folder = findFolder(currentFolderPath.slice(0, index + 1));
        if (folder) {
          const sep = document.createElement('span');
          sep.className = 'breadcrumb-sep';
          sep.textContent = ' / ';
          breadcrumb.appendChild(sep);
          const item = document.createElement('span');
          item.className = 'breadcrumb-item';
          item.textContent = folder.name;
          item.setAttribute('data-path', JSON.stringify(currentFolderPath.slice(0, index + 1)));
          breadcrumb.appendChild(item);
        }
      });
    }
    
    // Get files and folders in current folder
    var filesToShow = currentFolder.files || [];
    var foldersToShow = currentFolder.folders || [];
    
    // Filter by tag if active
    if (currentTagFilter) {
      filesToShow = filesToShow.filter(function (f) { return (f.tags || []).includes(currentTagFilter); });
      foldersToShow = foldersToShow.filter(function (f) {
        if ((f.tags || []).includes(currentTagFilter)) return true;
        // Check if folder or subfolders contain files (or links!) with this tag
        function folderHasTag(folder) {
          if ((folder.files || []).some(function (ff) { return (ff.tags || []).includes(currentTagFilter); })) return true;
          if ((folder.links || []).some(function (l) {
            if (l.fileId) {
              const target = findFileRecursive(D(), l.fileId);
              return target && (target.tags || []).includes(currentTagFilter);
            }
            if (l.folderId) {
              const linked = findFolderById(D(), l.folderId);
              return linked && (linked.tags || []).includes(currentTagFilter);
            }
            return false;
          })) return true;
          return (folder.folders || []).some(function (ff) { return folderHasTag(ff); });
        }
        return folderHasTag(f);
      });
    }
    
    grid.innerHTML = '';
    
    // Render folders first (draggable targets + outer IDs for tag removal!)
    foldersToShow.forEach(function (f) {
      const card = document.createElement('div');
      card.className = 'folder-card' + (f.kind === 'node' ? ' node-card' : '') + (f.kind === 'connector' ? ' connector-card' : '') + (f.kind === 'linker' ? ' linker-card' : '') + (f.kind === 'log' ? ' log-card' : '') + (f.kind === 'branch' ? ' branch-card' : '') + (f.kind === 'merge' ? ' merge-card' : '') + (f.kind === 'node' && f.powered === false ? ' node-off' : '') + ((cabinetPickInsideId && f.id === cabinetPickInsideId) || (cabinetPickLinkId && f.id === cabinetPickLinkId) || (cabinetPickMergeId && f.id === cabinetPickMergeId) ? ' pick-armed' : '');
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-folder-card', f.id);
      if (f.kind === 'node') card.setAttribute('data-node-card', f.id);
      if (f.kind === 'connector') card.setAttribute('data-connector-card', f.id);
      card.innerHTML = folderCardHTML(f);
      grid.appendChild(card);
    });
    
    // Render files (draggable!)
    filesToShow.forEach(function (f) {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-file-card', f.id);
      card.innerHTML = cardHTML(f);
      grid.appendChild(card);
    });
    
    const totalItems = countItems(D());
    const shownFiles = filesToShow.length;
    const shownFolders = foldersToShow.length;
    
    if (empty) { empty.hidden = (filesToShow.length + foldersToShow.length) > 0; }
    if (title) title.textContent = currentFolder.name || D().name;
    if (sub) {
      if (currentFolderPath.length > 0) {
        if (currentTagFilter) {
          sub.textContent = shownFolders + ' folder' + (shownFolders !== 1 ? 's' : '') + ', ' + shownFiles + ' file' + (shownFiles !== 1 ? 's' : '') + ' in "' + currentFolder.name + '"';
        } else {
          sub.textContent = shownFolders + ' folder' + (shownFolders !== 1 ? 's' : '') + ', ' + shownFiles + ' file' + (shownFiles !== 1 ? 's' : '') + ' in "' + currentFolder.name + '"';
        }
      } else {
        if (currentTagFilter) {
          sub.textContent = shownFiles + ' file' + (shownFiles === 1 ? '' : 's') + ' tagged "' + currentTagFilter + '" — ' + totalItems + ' items total';
        } else {
          sub.textContent = totalItems + ' item' + (totalItems === 1 ? '' : 's') + ' in this drawer — drop more here or press Upload Files!';
        }
      }
    }
    if (total) total.textContent = fmtSize(totalBytes());
    if (foot) foot.textContent = totalItems + (totalItems === 1 ? ' item' : ' items');
    if (nameInput && document.activeElement !== nameInput && nameInput.value !== D().name) nameInput.value = D().name;
    renderDrawerList();
  }
  
  function countFiles(folder) {
    let count = (folder.files || []).length;
    (folder.folders || []).forEach(function (f) { count += countFiles(f); });
    return count;
  }

  // Total items: files AND folders count (a folder full of folders isn't empty)!
  function countItems(folder) {
    let count = (folder.files || []).length + (folder.folders || []).length;
    (folder.folders || []).forEach(function (f) { count += countItems(f); });
    return count;
  }
  
  const ICON_FOLDER = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="M.5 4.5a3 3 0 0 1 3-3h1.257a3 3 0 0 1 2.122.879L7.5 3h5a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3zm4.25 2a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5z" clip-rule="evenodd" /></svg>';
  const ICON_NODE = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="M2.327.504A.75.75 0 0 1 3 1.25V2a1.5 1.5 0 0 0 1.5 1.5h2.588A3.25 3.25 0 0 1 10.25 1l.167.004A3.25 3.25 0 0 1 13.5 4.25l-.004.167A3.25 3.25 0 0 1 10.25 7.5l-.167-.004A3.25 3.25 0 0 1 7.088 5H4.5c-.547 0-1.058-.15-1.5-.405V10a1.5 1.5 0 0 0 1.5 1.5h2.588a3.25 3.25 0 1 1 0 1.5H4.5a3 3 0 0 1-3-3V1.25A.75.75 0 0 1 2.25.5zM10.25 10.5a1.75 1.75 0 1 0 0 3.5a1.75 1.75 0 0 0 0-3.5m0-8a1.75 1.75 0 1 0 0 3.5a1.75 1.75 0 0 0 0-3.5" clip-rule="evenodd" /></svg>';
  const ICON_CONNECTOR = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="M13.5 11a1.5 1.5 0 1 0-3 0a1.5 1.5 0 0 0 3 0M12 14a3 3 0 1 0-.79-5.895L10.092 6.15a3 3 0 1 0-4.185 0L4.79 8.105A3.003 3.003 0 0 0 1 11a3 3 0 1 0 5.092-2.15L7.21 6.895a3 3 0 0 0 1.58 0L9.908 8.85A3 3 0 0 0 12 14m-6.5-3a1.5 1.5 0 1 0-3 0a1.5 1.5 0 0 0 3 0M8 2.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3" clip-rule="evenodd" /></svg>';
  const ICON_LINKER = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="M14.25 7.25h-2.32a4.001 4.001 0 0 0-7.86 0H1.75a.75.75 0 0 0 0 1.5h2.32a4.001 4.001 0 0 0 7.86 0h2.32a.75.75 0 0 0 0-1.5M5.5 8a2.5 2.5 0 1 0 5 0a2.5 2.5 0 0 0-5 0" clip-rule="evenodd" /></svg>';
  // Official Log icon!
  const ICON_LOG = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="M11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h3v-2.5a3 3 0 0 1 3-3H13v-3A1.5 1.5 0 0 0 11.5 3m1.303 6a1.5 1.5 0 0 1-.242.318l-3.243 3.243a1.5 1.5 0 0 1-.318.242V10.5A1.5 1.5 0 0 1 10.5 9zm.818 1.379a3 3 0 0 0 .879-2.122V4.5a3 3 0 0 0-3-3h-7a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h3.757a3 3 0 0 0 2.122-.879z" clip-rule="evenodd" /></svg>';

  // Official Branch icon!
  const ICON_BRANCH = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><path fill="currentColor" fill-rule="evenodd" d="M3.504 5.897a2.751 2.751 0 1 1 1.503-.002A1.5 1.5 0 0 0 6.5 7.25h3a1.5 1.5 0 0 0 1.493-1.355a2.751 2.751 0 1 1 1.503.002A3 3 0 0 1 9.5 8.75h-.75v1.354a2.751 2.751 0 1 1-1.5 0V8.75H6.5a3 3 0 0 1-2.996-2.853M3 3.25a1.25 1.25 0 1 1 2.5 0a1.25 1.25 0 0 1-2.5 0m3.75 9.5a1.25 1.25 0 1 1 2.5 0a1.25 1.25 0 0 1-2.5 0m3.75-9.5a1.25 1.25 0 1 1 2.5 0a1.25 1.25 0 0 1-2.5 0" clip-rule="evenodd" /></svg>';
  // Placeholder Merge icon (converging branches)! Swap when the final pick lands!
  const ICON_MERGE = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="none" /><circle cx="4.5" cy="4" r="2" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="4.5" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="11.5" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.6" /><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" d="M6.3 4.8C8.5 5.5 8.5 6.5 9.6 7M6.3 11.2c2.2-.7 2.2-1.7 3.3-2.2" /></svg>';

  function folderCardHTML(f) {
    const isNode = f.kind === 'node';
    const isConnector = f.kind === 'connector';
    const isLinker = f.kind === 'linker';
    const isLog = f.kind === 'log';
    const isBranch = f.kind === 'branch';
    const isMerge = f.kind === 'merge';
    const tags = f.tags || [];
    const branchCodes = branchCodeSet();
    const mergeNames = mergeNameSet();
    const inMerge = folderLivesInMerge(f.id);
    const tagChips = tags.map(function (t) {
      const branchCls = (mergeNames[t] || inMerge) ? ' merge-tag' : (branchCodes[t] ? ' branch-tag' : '');
      return '<span class="tag-chip' + branchCls + '" data-tag="' + escHtml(t) + '">' + escHtml(t) + '<span class="tag-close">×</span></span>';
    }).join(' ');
    const tagDisplay = tags.length > 0 ? tagChips + ' ' : '';
    const linkedByFolders = findFoldersLinkingFolder(f.id);
    const linkedFolderChips = linkedByFolders.map(function (c) {
      return '<span class="linked-tag" title="Linked in Connector: ' + escHtml(c.name) + '">⇄ ' + escHtml(c.name) + '</span>';
    }).join(' ');
    const folderTagDisplay = tagDisplay + (linkedFolderChips ? linkedFolderChips + ' ' : '');
    const fileCount = countItems(f);
    const icon = isNode ? ICON_NODE : (isConnector ? ICON_CONNECTOR : (isLinker ? ICON_LINKER : (isLog ? ICON_LOG : (isBranch ? ICON_BRANCH : (isMerge ? ICON_MERGE : ICON_FOLDER)))));
    const previewClass = 'file-preview' + (isNode ? ' node-preview' : '') + (isConnector ? ' connector-preview' : '') + (isLinker ? ' linker-preview' : '') + (isLog ? ' log-preview' : '') + (isBranch ? ' branch-preview' : '') + (isMerge ? ' merge-preview' : '');
    const badge = isNode ? '<span class="node-badge">NODE</span>' : (isConnector ? '<span class="connector-badge">CONNECTOR</span>' : (isLinker ? '<span class="linker-badge">LINKER</span>' : (isLog ? '<span class="log-badge">LOG</span>' : (isBranch ? '<span class="branch-badge">' + escHtml(f.code || 'BRANCH') + '</span>' : (isMerge ? '<span class="merge-badge">MERGE</span>' : '')))));
    const note = isNode && f.note ? '<div class="node-note" title="' + escHtml(f.note) + '">' + renderKeydownNote(f.note) + '</div>' : '';
    const powerLabel = isNode ? (f.powered === false ? 'Power On' : 'Power Off') : '';
    const detailOpen = openDetailIds[f.id] ? true : false;
    const detailArrow = detailOpen ? '▴' : '▾';
    // Node superpowers live below the filename in a tidy accordion!
    const nodeExtra = isNode
      ? '<div class="file-actions detail-toggle-row"><button type="button" class="detail-toggle node-toggle" data-detail-toggle="' + escHtml(f.id) + '">Node actions ' + detailArrow + '</button></div>' +
        '<div class="folder-detail' + (detailOpen ? ' open' : '') + '"><div class="node-btn-grid">' +
        '<button type="button" data-node-note="' + escHtml(f.id) + '">Note</button>' +
        '<button type="button" data-node-duplicate="' + escHtml(f.id) + '">Clone</button>' +
        '<button type="button" data-node-export="' + escHtml(f.id) + '">Export</button>' +
        '<button type="button" data-node-power="' + escHtml(f.id) + '">' + powerLabel + '</button>' +
        '</div></div>'
      : '';
    // Connector + Linker links and actions live below the filename!
    let connectorExtra = '';
    if (isConnector || isLinker) {
      const links = f.links || [];
      const linkRows = links.map(function (l) {
        if (l.folderId) {
          const linked = findFolderById(D(), l.folderId);
          if (!linked) {
            return '<div class="link-row link-broken"><div class="link-top"><span class="link-name" title="Linked folder is missing!">Missing folder</span></div>' +
              '<div class="link-btns"><button type="button" class="link-btn" data-link-unlink="' + escHtml(f.id) + ':' + escHtml(l.id) + '">Unlink</button></div></div>';
          }
          return '<div class="link-row"><div class="link-top"><span class="link-name" data-link-open-folder="' + escHtml(f.id) + ':' + escHtml(l.id) + '" title="' + escHtml(linked.name) + ' (click to open!)">' + escHtml(linked.name) + '</span>' +
            '<span class="link-sub">Folder · ' + countItems(linked) + ' item' + (countItems(linked) !== 1 ? 's' : '') + '</span></div>' +
            '<div class="link-btns">' +
            '<button type="button" class="link-btn" data-link-unlink="' + escHtml(f.id) + ':' + escHtml(l.id) + '">Unlink</button></div></div>';
        }
        const target = findFileRecursive(D(), l.fileId);
        if (!target) {
          return '<div class="link-row link-broken"><div class="link-top"><span class="link-name" title="Linked file is missing!">Missing file</span></div>' +
            '<div class="link-btns"><button type="button" class="link-btn" data-link-unlink="' + escHtml(f.id) + ':' + escHtml(l.id) + '">Unlink</button></div></div>';
        }
        const insideBtn = isLinker ? '' : '<button type="button" class="link-btn" data-link-inside="' + escHtml(f.id) + ':' + escHtml(l.id) + '" title="Move the real file inside!">Move</button>';
        return '<div class="link-row"><div class="link-top"><span class="link-name" data-link-open="' + escHtml(f.id) + ':' + escHtml(l.id) + '" title="' + escHtml(target.name) + ' (click to open!)">' + escHtml(target.name) + '</span>' +
          '<span class="link-sub">' + escHtml(fileExt(target.name)) + ' · ' + escHtml(fmtSize(target.size)) + '</span></div>' +
          '<div class="link-btns">' + insideBtn +
          '<button type="button" class="link-btn" data-link-unlink="' + escHtml(f.id) + ':' + escHtml(l.id) + '">Unlink</button></div></div>';
      }).join('');
      const moveBtn = isLinker ? '' : '<button type="button" data-connector-pick="' + escHtml(f.id) + '" title="Pick an existing file to move inside!">Move</button>';
      connectorExtra = '<div class="file-actions detail-toggle-row"><button type="button" class="detail-toggle ' + (isLinker ? 'linker-toggle' : 'connector-toggle') + '" data-detail-toggle="' + escHtml(f.id) + '" title="Linked files live here!">Links (' + links.length + ') ' + detailArrow + '</button></div>' +
        '<div class="folder-detail' + (detailOpen ? ' open' : '') + '"><div class="connector-link-list">' + (linkRows || '<div class="connector-empty">No links yet! Use “Link” below to connect one!</div>') + '</div>' +
        '<div class="connector-detail-btns"><button type="button" data-connector-add="' + escHtml(f.id) + '" title="Upload files!">Add…</button>' +
        moveBtn +
        '<button type="button" data-connector-link="' + escHtml(f.id) + '" title="Pick an existing file to link without moving!">Link</button></div></div>';
    }
    // Log entries live below the filename in a tidy accordion (Keydown renders)!
    let logExtra = '';
    if (isLog) {
      const entries = f.entries || [];
      const entryRows = entries.map(function (en) {
        let stamp = '';
        try { stamp = new Date(en.addedAt).toLocaleString(); } catch (e) { stamp = ''; }
        return '<div class="log-row"><div class="log-top"><span class="log-text" title="' + escHtml(en.text) + '">' + renderKeydownNote(en.text) + '</span>' +
          '<button type="button" class="log-del" data-log-del="' + escHtml(f.id) + ':' + escHtml(en.id) + '" title="Delete entry!">×</button></div>' +
          '<div class="log-stamp">' + escHtml(stamp) + '</div></div>';
      }).join('');
      logExtra = '<div class="file-actions detail-toggle-row"><button type="button" class="detail-toggle log-toggle" data-detail-toggle="' + escHtml(f.id) + '" title="Timestamped log entries live here!">Log (' + entries.length + ') ' + detailArrow + '</button></div>' +
        '<div class="folder-detail' + (detailOpen ? ' open' : '') + '"><div class="log-list">' + (entryRows || '<div class="log-empty">No entries yet! Log one below!</div>') + '</div>' +
        '<div class="log-add-row"><button type="button" data-log-add="' + escHtml(f.id) + '" title="Append a timestamped entry!">Log entry…</button></div></div>';
    }
    // Branch superpowers: clone with lineage, recolor, export!
    let branchExtra = '';
    if (isBranch) {
      const rgb = hexToRgb(f.color);
      const cr = rgb ? rgb.r : 59;
      const cg = rgb ? rgb.g : 255;
      const cb = rgb ? rgb.b : 65;
      branchExtra = '<div class="file-actions detail-toggle-row"><button type="button" class="detail-toggle branch-toggle" data-detail-toggle="' + escHtml(f.id) + '" title="Branch superpowers live here!">Branch ' + escHtml(f.code || '????') + ' ' + detailArrow + '</button></div>' +
        '<div class="folder-detail' + (detailOpen ? ' open' : '') + '"><div class="node-btn-grid">' +
        '<button type="button" data-branch-clone="' + escHtml(f.id) + '" title="Clone this Branch (stamps your code as a tag)!">Clone</button>' +
        '<button type="button" data-branch-export="' + escHtml(f.id) + '" title="Export this Branch as .kc!">Export</button>' +
        '</div><div class="branch-color-row"><button type="button" data-branch-color="' + escHtml(f.id) + '" title="Pick a custom preview color!">Color…</button></div>' +
        '<div class="branch-color-menu" data-branch-panel="' + escHtml(f.id) + '" hidden>' +
        '<div class="branch-color-row"><span>R</span><input type="range" min="0" max="255" value="' + cr + '" data-branch-r="' + escHtml(f.id) + '"><b data-branch-rv="' + escHtml(f.id) + '">' + cr + '</b></div>' +
        '<div class="branch-color-row"><span>G</span><input type="range" min="0" max="255" value="' + cg + '" data-branch-g="' + escHtml(f.id) + '"><b data-branch-gv="' + escHtml(f.id) + '">' + cg + '</b></div>' +
        '<div class="branch-color-row"><span>B</span><input type="range" min="0" max="255" value="' + cb + '" data-branch-b="' + escHtml(f.id) + '"><b data-branch-bv="' + escHtml(f.id) + '">' + cb + '</b></div>' +
        '<div class="branch-color-row"><span class="branch-swatch" data-branch-swatch="' + escHtml(f.id) + '"></span><span class="branch-hex" data-branch-hex="' + escHtml(f.id) + '">' + escHtml(rgbToHex(cr, cg, cb)) + '</span></div>' +
        '<div class="branch-color-row"><button type="button" data-branch-save="' + escHtml(f.id) + '">Save</button>' +
        '<button type="button" data-branch-reset="' + escHtml(f.id) + '" title="Back to default green!">Reset</button></div>' +
        '</div></div>';
    }
    // Merge absorption: collected notes + Absorb button!
    let mergeExtra = '';
    if (isMerge) {
      const notes = f.notes || [];
      const noteRows = notes.map(function (n) {
        return '<div class="merge-note-row"><div class="merge-note-from">from ' + escHtml(n.from || 'unknown') + '</div>' +
          '<div class="merge-note-text" title="' + escHtml(n.note) + '">' + renderKeydownNote(n.note) + '</div></div>';
      }).join('');
      mergeExtra = '<div class="file-actions detail-toggle-row"><button type="button" class="detail-toggle merge-toggle" data-detail-toggle="' + escHtml(f.id) + '" title="Absorbed notes live here!">Merge (' + notes.length + ') ' + detailArrow + '</button></div>' +
        '<div class="folder-detail' + (detailOpen ? ' open' : '') + '"><div class="merge-note-list">' + (noteRows || '<div class="merge-empty">Nothing absorbed yet! Absorb a Branch or Node below!</div>') + '</div>' +
        '<div class="merge-absorb-row"><button type="button" data-merge-pick="' + escHtml(f.id) + '" title="Pick a Branch or Node to absorb!">Absorb…</button></div></div>';
    }
    // Branches can recolor their preview via the RGB picker!
    let previewStyle = '';
    if (isBranch && f.color) {
      const bottom = shadeHex(f.color, 0.72);
      if (bottom) previewStyle = ' style="background: linear-gradient(180deg, ' + escHtml(f.color) + ' 0%, ' + escHtml(bottom) + ' 100%);"';
    }
    return '<div class="' + previewClass + '" data-folder="' + escHtml(f.id) + '"' + previewStyle + '>' + badge + icon + '</div>' +
      '<div class="file-tags">' + folderTagDisplay + '<button type="button" class="add-tag-btn" data-add-folder-tag="' + escHtml(f.id) + '">+ Tag</button></div>' +
      '<div class="file-meta"><div class="file-name" data-rename-folder="' + escHtml(f.id) + '" title="' + escHtml(f.name) + ' (double-click to rename!)">' + escHtml(f.name) + '</div>' + note +
      '<div class="file-sub">' + fileCount + ' item' + (fileCount !== 1 ? 's' : '') + '</div></div>' +
      connectorExtra + nodeExtra + logExtra + branchExtra + mergeExtra +
      '<div class="file-actions"><button type="button" data-download-folder="' + escHtml(f.id) + '">Download</button>' +
      '<button type="button" class="danger" data-remove-folder="' + escHtml(f.id) + '">Delete</button></div>';
  }

  // ---- Drawer menu: one row per drawer, folder icons show open vs shut! ----
  function renderDrawerList() {
    const list = document.getElementById('drawer-list');
    if (!list) return;
    list.innerHTML = '';
    drawers.forEach(function (d) {
      const open = d.id === activeDrawerId;
      const row = document.createElement('div');
      row.className = 'drawer-item' + (open ? ' active' : '');
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'drawer-pick';
      pick.setAttribute('data-drawer', d.id);
      pick.title = d.name;
      const ico = document.createElement('span');
      ico.className = 'drawer-ico' + (open ? ' open' : '');
      ico.innerHTML = open ? ICON_OPEN : ICON_CLOSED;
      const nm = document.createElement('span');
      nm.className = 'drawer-name';
      nm.textContent = d.name;
      const ct = document.createElement('span');
      ct.className = 'drawer-count';
      ct.textContent = countItems(d);
      pick.appendChild(ico);
      pick.appendChild(nm);
      pick.appendChild(ct);
      row.appendChild(pick);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'drawer-del';
      del.setAttribute('data-del-drawer', d.id);
      del.title = 'Delete drawer';
      del.textContent = '×';
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  // ---- Lightbox (image previews, full size!) ----
  function openLightbox(id) {
    const f = cabinetFindFile(id);
    if (!f || !isImageFile(f.type, f.name) || !f.dataUrl) return false;
    lightboxFileId = id;
    const overlay = document.getElementById('lightbox-overlay');
    const img = document.getElementById('lightbox-img');
    const title = document.getElementById('lightbox-title');
    if (!overlay || !img) return false;
    img.src = f.dataUrl;
    if (title) title.textContent = f.name;
    overlay.classList.add('active');
    return true;
  }

  function closeLightbox() {
    lightboxFileId = null;
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ---- Wiring (once!) ----
  function initCabinet() {
    loadDrawer();
    loadCabinetViewMode();
    renderDrawer();
    // IndexedDB holds the full library including big music/movie blobs!
    // It loads async and re-renders if it has newer or more complete data!
    try { loadFromIDBAsync(); } catch (e) {}
    if (initCabinet._done) return;
    initCabinet._done = true;

    // Unlock audio on first gesture so later blips never start suspended!
    const unlockAudio = function () { ensureCabinetAudioCtx(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) {
      try { document.addEventListener(t, unlockAudio, { once: true, passive: true }); }
      catch (e) { try { document.addEventListener(t, unlockAudio); } catch (err) {} }
    });

    const byId = function (id) { return document.getElementById(id); };
    const newBtn = byId('drawer-new-btn');
    const upBtn = byId('drawer-upload-btn');
    const newFolderBtn = byId('folder-new-btn');
    const shareBtn = byId('drawer-share-btn');
    const impBtn = byId('drawer-import-btn');
    const fileInput = byId('file-input');
    const drawerFileInput = byId('drawer-file-input');
    const nameInput = byId('drawer-name-input');
    const grid = byId('file-grid');
    const drawerList = byId('drawer-list');
    const zone = byId('drop-zone');
    const overlay = byId('lightbox-overlay');

    if (newBtn) newBtn.addEventListener('click', function () {
      playCabinetSound(550, 0.1);
      cabinetNewDrawer();
    });
    if (upBtn && fileInput) upBtn.addEventListener('click', function () { playCabinetSound(750, 0.1); fileInput.click(); });
    var folderMenu = byId('folder-type-menu');
    function closeFolderMenu() { if (folderMenu) folderMenu.classList.remove('open'); }
    if (newFolderBtn) newFolderBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      playCabinetSound(550, 0.1);
      closeShareMenu();
      if (folderMenu) folderMenu.classList.toggle('open');
    });
    if (folderMenu) folderMenu.addEventListener('click', function (e) {
      const opt = e.target.closest ? e.target.closest('[data-folder-kind]') : null;
      if (!opt) return;
      e.stopPropagation();
      const rawKind = opt.getAttribute('data-folder-kind');
      const kind = rawKind === 'node' ? 'node' : (rawKind === 'connector' ? 'connector' : (rawKind === 'linker' ? 'linker' : (rawKind === 'log' ? 'log' : (rawKind === 'branch' ? 'branch' : (rawKind === 'merge' ? 'merge' : 'folder')))));
      closeFolderMenu();
      playCabinetSound(550, 0.1);
      const label = kind === 'node' ? 'Node name:' : (kind === 'connector' ? 'Connector name:' : (kind === 'linker' ? 'Linker name:' : (kind === 'log' ? 'Log name:' : (kind === 'branch' ? 'Branch name:' : (kind === 'merge' ? 'Merge name:' : 'Folder name:')))));
      const name = prompt(label);
      if (name && name.trim()) cabinetCreateFolder(name.trim(), kind);
    });
    var shareMenu = byId('share-type-menu');
    function closeShareMenu() { if (shareMenu) shareMenu.classList.remove('open'); }
    if (shareBtn) shareBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      playCabinetSound(550, 0.1);
      closeFolderMenu();
      if (shareMenu) shareMenu.classList.toggle('open');
    });
    if (shareMenu) shareMenu.addEventListener('click', function (e) {
      const opt = e.target.closest ? e.target.closest('[data-share-format]') : null;
      if (!opt) return;
      e.stopPropagation();
      const fmt = opt.getAttribute('data-share-format');
      closeShareMenu();
      playCabinetSound(750, 0.12);
      if (fmt === 'zip') cabinetExportZip();
      else cabinetExportDrawer();
    });
    document.addEventListener('click', function (e) {
      if (folderMenu && folderMenu.classList.contains('open')) {
        const wrap = byId('folder-new-wrap');
        if (!wrap || !wrap.contains(e.target)) closeFolderMenu();
      }
      if (shareMenu && shareMenu.classList.contains('open')) {
        const wrap = byId('share-wrap');
        if (!wrap || !wrap.contains(e.target)) closeShareMenu();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && folderMenu) closeFolderMenu();
      if (e.key === 'Escape' && shareMenu) closeShareMenu();
      if (e.key === 'Escape' && cabinetPickInsideId) disarmPickInside();
    });
    if (fileInput) fileInput.addEventListener('change', function () {
      cabinetAddFiles(fileInput.files).catch(function () {});
      try { fileInput.value = ''; } catch (e) {}
    });
    if (impBtn && drawerFileInput) impBtn.addEventListener('click', function () { playCabinetSound(650, 0.1); drawerFileInput.click(); });
    if (drawerFileInput) drawerFileInput.addEventListener('change', function () {
      cabinetImportDrawer(drawerFileInput.files[0]).catch(function () {});
      try { drawerFileInput.value = ''; } catch (e) {}
    });
    if (nameInput) nameInput.addEventListener('input', function () { cabinetRename(nameInput.value); });
    const tagFilter = byId('tag-filter');
    if (tagFilter) tagFilter.addEventListener('change', function () {
      playCabinetSound(600, 0.08);
      currentTagFilter = tagFilter.value;
      renderDrawer();
    });
    const pickCancel = byId('pick-cancel');
    if (pickCancel) pickCancel.addEventListener('click', function () {
      playCabinetSound(350, 0.08);
      disarmPickInside();
    });
    const viewListBtn = byId('view-list-btn');
    if (viewListBtn) viewListBtn.addEventListener('click', function () {
      playCabinetSound(600, 0.08);
      setCabinetViewMode('list');
    });
    const viewCardsBtn = byId('view-cards-btn');
    if (viewCardsBtn) viewCardsBtn.addEventListener('click', function () {
      playCabinetSound(600, 0.08);
      setCabinetViewMode('cards');
    });
    if (drawerList) {
      drawerList.addEventListener('click', function (e) {
        const del = e.target.closest ? e.target.closest('[data-del-drawer]') : null;
        if (del) {
          playCabinetSound(350, 0.1);
          cabinetDeleteDrawer(del.getAttribute('data-del-drawer'));
          return;
        }
        const pick = e.target.closest ? e.target.closest('[data-drawer]') : null;
        if (pick) {
          playCabinetSound(600, 0.08);
          cabinetSwitchDrawer(pick.getAttribute('data-drawer'));
        }
      });
      drawerList.addEventListener('mousedown', function (e) {
        if (e.target.closest && e.target.closest('button')) e.preventDefault();
      });
    }
    if (grid) {
      grid.addEventListener('click', function (e) {
        // Pick mode armed: plain clicks move, link, or merge!
        if (cabinetPickInsideId || cabinetPickLinkId || cabinetPickMergeId) {
          const onBtn = e.target.closest ? e.target.closest('button, a, input, select, .tag-chip, .link-row') : null;
          if (!onBtn) {
            const pickCard = e.target.closest ? e.target.closest('[data-file-card]') : null;
            if (pickCard && !cabinetPickMergeId) {
              e.preventDefault();
              e.stopPropagation();
              const fid = pickCard.getAttribute('data-file-card');
              if (cabinetPickLinkId) {
                const tid = cabinetPickLinkId;
                disarmPickInside();
                playCabinetSound(650, 0.12);
                cabinetLinkFileToConnector(fid, tid);
              } else {
                const tid = cabinetPickInsideId;
                disarmPickInside();
                playCabinetSound(650, 0.12);
                cabinetMoveFileToFolder(fid, tid);
              }
              return;
            }
            const pickFolder = e.target.closest ? e.target.closest('[data-folder-card]') : null;
            const armedId = cabinetPickInsideId || cabinetPickLinkId || cabinetPickMergeId;
            if (pickFolder && pickFolder.getAttribute('data-folder-card') !== armedId) {
              e.preventDefault();
              e.stopPropagation();
              const fid = pickFolder.getAttribute('data-folder-card');
              if (cabinetPickLinkId) {
                const tid = cabinetPickLinkId;
                disarmPickInside();
                playCabinetSound(650, 0.12);
                cabinetLinkFolder(tid, fid);
              } else if (cabinetPickMergeId) {
                const cand = findFolderById(D(), fid);
                if (cand && (cand.kind === 'branch' || cand.kind === 'node')) {
                  const tid = cabinetPickMergeId;
                  disarmPickInside();
                  playCabinetSound(650, 0.12);
                  cabinetMergeInto(tid, fid);
                }
                // Other kinds are ignored so the pick stays armed!
              } else {
                const tid = cabinetPickInsideId;
                disarmPickInside();
                playCabinetSound(650, 0.12);
                cabinetMoveFolderToFolder(fid, tid);
              }
              return;
            }
            if (pickFolder && pickFolder.getAttribute('data-folder-card') === armedId) {
              e.preventDefault();
              e.stopPropagation();
              disarmPickInside();
              return;
            }
          }
        }
        const dl = e.target.closest ? e.target.closest('[data-download]') : null;
        if (dl) { playCabinetSound(700, 0.08); cabinetDownloadFile(dl.getAttribute('data-download')); return; }
        const dlFolder = e.target.closest ? e.target.closest('[data-download-folder]') : null;
        if (dlFolder) { cabinetDownloadFolder(dlFolder.getAttribute('data-download-folder')); return; }
        const rm = e.target.closest ? e.target.closest('[data-remove]') : null;
        if (rm) { playCabinetSound(350, 0.1); cabinetRemoveFile(rm.getAttribute('data-remove')); return; }
        const rmFolder = e.target.closest ? e.target.closest('[data-remove-folder]') : null;
        if (rmFolder) { playCabinetSound(350, 0.1); cabinetRemoveFolder(rmFolder.getAttribute('data-remove-folder')); return; }
        // Detail accordions toggle below the filename!
        const detailToggle = e.target.closest ? e.target.closest('[data-detail-toggle]') : null;
        if (detailToggle) {
          e.stopPropagation();
          playCabinetSound(500, 0.08);
          const id = detailToggle.getAttribute('data-detail-toggle');
          if (openDetailIds[id]) delete openDetailIds[id];
          else openDetailIds[id] = true;
          renderDrawer();
          return;
        }
        // Pick mode: click a file to move it inside the armed Connector!
        const connPick = e.target.closest ? e.target.closest('[data-connector-pick]') : null;
        if (connPick) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          armPickInside(connPick.getAttribute('data-connector-pick'));
          return;
        }
        // Log mode: append a timestamped entry to the Log folder!
        const logAdd = e.target.closest ? e.target.closest('[data-log-add]') : null;
        if (logAdd) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          const val = prompt('Log entry (Keydown supported!):');
          if (val !== null) cabinetLogEntry(logAdd.getAttribute('data-log-add'), val);
          return;
        }
        // Branch powers: clone with lineage, export, recolor!
        const branchClone = e.target.closest ? e.target.closest('[data-branch-clone]') : null;
        if (branchClone) {
          e.stopPropagation();
          playCabinetSound(650, 0.12);
          cabinetBranchClone(branchClone.getAttribute('data-branch-clone'));
          return;
        }
        const branchExport = e.target.closest ? e.target.closest('[data-branch-export]') : null;
        if (branchExport) {
          e.stopPropagation();
          cabinetExportFolder(branchExport.getAttribute('data-branch-export'));
          return;
        }
        const branchColorBtn = e.target.closest ? e.target.closest('[data-branch-color]') : null;
        if (branchColorBtn) {
          e.stopPropagation();
          playCabinetSound(500, 0.08);
          const panel = branchColorBtn.closest ? branchColorBtn.closest('.folder-detail') : null;
          const menu = panel ? panel.querySelector('[data-branch-panel]') : null;
          if (menu) {
            if (menu.hasAttribute('hidden')) menu.removeAttribute('hidden');
            else menu.setAttribute('hidden', '');
          }
          return;
        }
        const branchSave = e.target.closest ? e.target.closest('[data-branch-save]') : null;
        if (branchSave) {
          e.stopPropagation();
          const id = branchSave.getAttribute('data-branch-save');
          const panel = branchSave.closest ? branchSave.closest('[data-branch-panel]') : null;
          const hex = panel ? branchPanelHex(panel) : '';
          playCabinetSound(650, 0.1);
          cabinetSetBranchColor(id, hex);
          return;
        }
        const branchReset = e.target.closest ? e.target.closest('[data-branch-reset]') : null;
        if (branchReset) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          cabinetSetBranchColor(branchReset.getAttribute('data-branch-reset'), '');
          return;
        }
        const logDel = e.target.closest ? e.target.closest('[data-log-del]') : null;
        if (logDel) {
          e.stopPropagation();
          playCabinetSound(350, 0.08);
          const parts = (logDel.getAttribute('data-log-del') || '').split(':');
          cabinetDeleteLogEntry(parts[0], parts.slice(1).join(':'));
          return;
        }
        // Link mode: click a file to link it to the armed Connector!
        const connLink = e.target.closest ? e.target.closest('[data-connector-link]') : null;
        if (connLink) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          armPickLink(connLink.getAttribute('data-connector-link'));
          return;
        }
        // Merge mode: click a Branch/Node to absorb it into the armed Merge!
        const mergePick = e.target.closest ? e.target.closest('[data-merge-pick]') : null;
        if (mergePick) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          armPickMerge(mergePick.getAttribute('data-merge-pick'));
          return;
        }
        const nodeNote = e.target.closest ? e.target.closest('[data-node-note]') : null;
        if (nodeNote) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          const target = findFolderById(D(), nodeNote.getAttribute('data-node-note'));
          const cur = target && target.note ? target.note : '';
          const val = prompt('Node note (Keydown: **bold** *italic* `code` ~G~gel~G~ #C#chip#):', cur);
          if (val !== null) cabinetSetFolderNote(nodeNote.getAttribute('data-node-note'), val.trim());
          return;
        }
        const nodeDup = e.target.closest ? e.target.closest('[data-node-duplicate]') : null;
        if (nodeDup) {
          e.stopPropagation();
          playCabinetSound(650, 0.12);
          cabinetDuplicateFolder(nodeDup.getAttribute('data-node-duplicate'));
          return;
        }
        const nodeExp = e.target.closest ? e.target.closest('[data-node-export]') : null;
        if (nodeExp) {
          e.stopPropagation();
          cabinetExportFolder(nodeExp.getAttribute('data-node-export'));
          return;
        }
        const nodePow = e.target.closest ? e.target.closest('[data-node-power]') : null;
        if (nodePow) {
          e.stopPropagation();
          playCabinetSound(600, 0.1);
          cabinetToggleFolderPower(nodePow.getAttribute('data-node-power'));
          return;
        }
        const tagClose = e.target.closest ? e.target.closest('.tag-close') : null;
        if (tagClose) {
          e.stopPropagation();
          playCabinetSound(350, 0.08);
          const chip = tagClose.closest ? tagClose.closest('.tag-chip') : tagClose.parentNode;
          const tagName = chip && chip.getAttribute ? chip.getAttribute('data-tag') : null;
          if (tagName) {
            const folderCard = tagClose.closest ? tagClose.closest('[data-folder-card]') : null;
            const fileCard = tagClose.closest ? tagClose.closest('[data-file-card]') : null;
            if (folderCard) {
              cabinetRemoveFolderTag(folderCard.getAttribute('data-folder-card'), tagName);
            } else if (fileCard) {
              cabinetRemoveTag(fileCard.getAttribute('data-file-card'), tagName);
            } else {
              // Fallback: try inner preview ids
              const gridItem = chip.closest ? (chip.closest('.file-card') || chip.closest('.folder-card')) : null;
              if (gridItem) {
                const innerFile = gridItem.querySelector ? gridItem.querySelector('[data-preview]') : null;
                const innerFolder = gridItem.querySelector ? gridItem.querySelector('[data-folder]') : null;
                if (innerFolder) cabinetRemoveFolderTag(innerFolder.getAttribute('data-folder'), tagName);
                else if (innerFile) cabinetRemoveTag(innerFile.getAttribute('data-preview'), tagName);
              }
            }
          }
          return;
        }
        const addTagBtn = e.target.closest ? e.target.closest('[data-add-tag]') : null;
        if (addTagBtn) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          const newTag = prompt('Enter a new tag:');
          if (newTag && newTag.trim()) {
            const trimmed = newTag.trim().substring(0, 30);
            const id = addTagBtn.getAttribute('data-add-tag');
            const f = findFileRecursive(D(), id);
            if (f) {
              f.tags = f.tags || [];
              if (!f.tags.includes(trimmed)) f.tags.push(trimmed);
              saveDrawer();
              renderDrawer();
            }
          }
          return;
        }
        const addFolderTagBtn = e.target.closest ? e.target.closest('[data-add-folder-tag]') : null;
        if (addFolderTagBtn) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          const newTag = prompt('Enter a new tag for this folder:');
          if (newTag && newTag.trim()) {
            cabinetAddFolderTag(addFolderTagBtn.getAttribute('data-add-folder-tag'), newTag.trim().substring(0, 30));
          }
          return;
        }
        // Connector: add real files inside (uploads go straight into it)!
        const connAdd = e.target.closest ? e.target.closest('[data-connector-add]') : null;
        if (connAdd) {
          e.stopPropagation();
          playCabinetSound(500, 0.1);
          const targetId = connAdd.getAttribute('data-connector-add');
          const picker = document.createElement('input');
          picker.type = 'file';
          picker.multiple = true;
          picker.onchange = function () {
            cabinetAddFilesToFolder(targetId, picker.files).catch(function () {});
          };
          try { picker.click(); } catch (err) {}
          return;
        }
        // Connector links: open location, bring inside, or unlink!
        const linkOpen = e.target.closest ? e.target.closest('[data-link-open]') : null;
        if (linkOpen) {
          e.stopPropagation();
          const parts = (linkOpen.getAttribute('data-link-open') || '').split(':');
          const fileId = parts.slice(1).join(':');
          const target = findFileRecursive(D(), fileId);
          if (!target) return;
          if (isImageFile(target.type, target.name) && target.dataUrl) { playCabinetSound(750, 0.1); openLightbox(fileId); return; }
          playCabinetSound(600, 0.08);
          cabinetJumpToFile(fileId);
          return;
        }
        // Linked folders open right where they live!
        const linkOpenFolder = e.target.closest ? e.target.closest('[data-link-open-folder]') : null;
        if (linkOpenFolder) {
          e.stopPropagation();
          const parts = (linkOpenFolder.getAttribute('data-link-open-folder') || '').split(':');
          const linkId = parts.slice(1).join(':');
          const card = linkOpenFolder.closest ? linkOpenFolder.closest('[data-folder-card]') : null;
          const host = card ? findFolderById(D(), card.getAttribute('data-folder-card')) : null;
          const link = host ? (host.links || []).find(function (x) { return x.id === linkId; }) : null;
          if (!link || !link.folderId) return;
          const path = findPathToFolder(D(), link.folderId, []);
          if (!path) return;
          playCabinetSound(600, 0.08);
          currentTagFilter = '';
          const tagFilterEl = document.getElementById('tag-filter');
          if (tagFilterEl) tagFilterEl.value = '';
          currentFolderPath = path;
          saveDrawer();
          renderDrawer();
          return;
        }
        const linkInside = e.target.closest ? e.target.closest('[data-link-inside]') : null;
        if (linkInside) {
          e.stopPropagation();
          const parts = (linkInside.getAttribute('data-link-inside') || '').split(':');
          const connectorId = parts[0];
          const linkId = parts.slice(1).join(':');
          playCabinetSound(650, 0.12);
          cabinetBringLinkInside(connectorId, linkId);
          return;
        }
        const linkUnlink = e.target.closest ? e.target.closest('[data-link-unlink]') : null;
        if (linkUnlink) {
          e.stopPropagation();
          const parts = (linkUnlink.getAttribute('data-link-unlink') || '').split(':');
          const connectorId = parts[0];
          const linkId = parts.slice(1).join(':');
          playCabinetSound(350, 0.08);
          cabinetUnlinkFile(connectorId, linkId);
          return;
        }
        const folderPreview = e.target.closest ? e.target.closest('[data-folder]') : null;
        if (folderPreview) { playCabinetSound(750, 0.1); cabinetNavigateFolder(folderPreview.getAttribute('data-folder')); return; }
        const pv = e.target.closest ? e.target.closest('[data-preview]') : null;
        if (pv) { playCabinetSound(750, 0.1); openLightbox(pv.getAttribute('data-preview')); }
      });
      grid.addEventListener('mousedown', function (e) {
        if (e.target.closest && e.target.closest('button')) e.preventDefault();
        // Remember which mouse button started a potential drag (2/1 = reorder)!
        // A fresh mouse press also clears stale touch-reorder state!
        try {
          touchReorderArmed = false;
          if (!e.buttons || e.buttons === 1) {
            touchReorderId = null;
            touchReorderTarget = null;
            if (!cabinetDragFileId && !cabinetDragFolderId) cabinetReorderMode = false;
          }
          const card = e.target.closest ? (e.target.closest('[data-file-card]') || e.target.closest('[data-folder-card]')) : null;
          cabinetDragButton = card && typeof e.button === 'number' ? e.button : 0;
          if (card && e.button === 1) e.preventDefault();
        } catch (err) { cabinetDragButton = 0; }
      });
      // No context menu on cards: right-drag means reorder, not a menu!
      grid.addEventListener('contextmenu', function (e) {
        try {
          if (e.target.closest && (e.target.closest('[data-file-card]') || e.target.closest('[data-folder-card]'))) e.preventDefault();
        } catch (err) {}
      });
      // RGB sliders live-update the Branch swatch + hex readout!
      grid.addEventListener('input', function (e) {
        try {
          const slider = e.target.closest ? e.target.closest('[data-branch-r], [data-branch-g], [data-branch-b]') : null;
          if (!slider) return;
          const panel = slider.closest ? slider.closest('[data-branch-panel]') : null;
          if (!panel) return;
          const valEl = slider.hasAttribute('data-branch-r') ? panel.querySelector('[data-branch-rv]') : (slider.hasAttribute('data-branch-g') ? panel.querySelector('[data-branch-gv]') : panel.querySelector('[data-branch-bv]'));
          if (valEl) valEl.textContent = slider.value;
          branchPanelHex(panel);
        } catch (err) {}
      });
      // Two-finger touch drag on a file card reorders too!
      grid.addEventListener('touchstart', function (e) {
        try {
          if (e.touches && e.touches.length >= 2) {
            const card = e.target.closest ? e.target.closest('[data-file-card]') : null;
            if (card && !touchReorderId) {
              touchReorderId = card.getAttribute('data-file-card');
              touchReorderArmed = true;
              cabinetReorderMode = true;
              e.preventDefault();
            }
          }
        } catch (err) {}
      }, { passive: false });
      grid.addEventListener('touchmove', function (e) {
        if (!touchReorderId) return;
        try { e.preventDefault(); } catch (err) {}
        let el = null;
        try {
          const t = e.touches && e.touches[0];
          if (t && typeof document.elementFromPoint === 'function') el = document.elementFromPoint(t.clientX, t.clientY);
        } catch (err) {}
        document.querySelectorAll('.file-card.drop-reorder').forEach(function (x) { x.classList.remove('drop-reorder'); });
        touchReorderTarget = null;
        const card = el && el.closest ? el.closest('[data-file-card]') : null;
        if (card && card.getAttribute('data-file-card') !== touchReorderId) {
          card.classList.add('drop-reorder');
          touchReorderTarget = card.getAttribute('data-file-card');
        }
      }, { passive: false });
      grid.addEventListener('touchend', function (e) {
        if (!touchReorderId) return;
        try {
          if (e.touches && e.touches.length === 0) {
            if (touchReorderTarget) {
              playCabinetSound(650, 0.12);
              cabinetReorderFile(touchReorderId, touchReorderTarget);
            }
            touchReorderId = null;
            touchReorderTarget = null;
            touchReorderArmed = false;
            cabinetReorderMode = false;
            document.querySelectorAll('.file-card.drop-reorder').forEach(function (x) { x.classList.remove('drop-reorder'); });
          }
        } catch (err) {}
      });
      // Double-click a file name to rename it!
      grid.addEventListener('dblclick', function (e) {
        const nameEl = e.target.closest ? e.target.closest('[data-rename-file]') : null;
        if (nameEl) {
          e.preventDefault();
          e.stopPropagation();
          const id = nameEl.getAttribute('data-rename-file');
          const f = findFileRecursive(D(), id);
          if (!f) return;
          playCabinetSound(500, 0.1);
          const val = prompt('Rename file:', f.name);
          if (val !== null) cabinetRenameFile(id, val);
          return;
        }
        // Double-click a folder name to rename it!
        const folderNameEl = e.target.closest ? e.target.closest('[data-rename-folder]') : null;
        if (folderNameEl) {
          e.preventDefault();
          e.stopPropagation();
          const id = folderNameEl.getAttribute('data-rename-folder');
          const target = findFolderById(D(), id);
          if (!target) return;
          playCabinetSound(500, 0.1);
          const val = prompt('Rename folder:', target.name);
          if (val !== null) cabinetRenameFolder(id, val);
        }
      });
      // ---- Drag and drop: files, folders, merge, reorder, links! ----
      function clearFolderHighlights() {
        document.querySelectorAll('.folder-card.drag-over-folder').forEach(function (el) {
          el.classList.remove('drag-over-folder');
          el.classList.remove('drag-over-node');
          el.classList.remove('drag-over-connector');
          el.classList.remove('drag-over-branch');
          el.classList.remove('drag-over-merge');
        });
      }
      function clearMergeHighlights() {
        document.querySelectorAll('.file-card.drop-merge, .file-card.drop-reorder').forEach(function (el) {
          el.classList.remove('drop-merge');
          el.classList.remove('drop-reorder');
        });
      }
      // Ground-up hover targeting: coordinates first, event target second!
      // Matches the drop handler exactly, so highlight always equals action!
      function hoverTargetEl(e) {
        try {
          if (typeof document.elementFromPoint === 'function' && e.clientX !== undefined && e.clientY !== undefined) {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el.closest) {
              const t = el.closest('[data-folder-card], [data-file-card]');
              if (t) return t;
            }
          }
          if (e.target && e.target.closest) {
            const t = e.target.closest('[data-folder-card], [data-file-card]');
            if (t) return t;
          }
        } catch (err) {}
        return null;
      }
      function dragTypes(e) {
        const out = { file: !!cabinetDragFileId, folder: !!cabinetDragFolderId, os: false, reorder: cabinetReorderMode };
        try {
          const types = e.dataTransfer ? e.dataTransfer.types : [];
          for (let i = 0; i < types.length; i++) {
            if (types[i] === 'text/cabinet-file-id') out.file = true;
            if (types[i] === 'text/cabinet-folder-id') out.folder = true;
            if (types[i] === 'Files') out.os = true;
          }
          if (!types.length) { out.file = out.file || !!cabinetDragFileId; out.folder = out.folder || !!cabinetDragFolderId; }
        } catch (err) {}
        return out;
      }
      grid.addEventListener('dragstart', function (e) {
        // Never start drags from form controls (sliders, inputs)!
        if (e.target.closest && e.target.closest('input, select, textarea')) return;
        disarmPickInside();
        const fileCard = e.target.closest ? e.target.closest('[data-file-card]') : null;
        if (fileCard) {
          cabinetDragFileId = fileCard.getAttribute('data-file-card');
          cabinetDragFolderId = null;
          cabinetReorderMode = (cabinetDragButton === 2 || cabinetDragButton === 1) || touchReorderArmed;
          try {
            e.dataTransfer.setData('text/cabinet-file-id', cabinetDragFileId);
            e.dataTransfer.effectAllowed = 'move';
          } catch (err) {}
          return;
        }
        // Folders drag too: drop onto folders or breadcrumb paths!
        const folderCard = e.target.closest ? e.target.closest('[data-folder-card]') : null;
        if (folderCard) {
          cabinetDragFolderId = folderCard.getAttribute('data-folder-card');
          cabinetDragFileId = null;
          cabinetReorderMode = false;
          try {
            e.dataTransfer.setData('text/cabinet-folder-id', cabinetDragFolderId);
            e.dataTransfer.effectAllowed = 'move';
          } catch (err) {}
        }
      });
      grid.addEventListener('dragover', function (e) {
        const hovered = hoverTargetEl(e);
        const dt = dragTypes(e);
        // File-on-file: reorder highlight in reorder mode, merge highlight otherwise!
        const mergeCard = hovered && hovered.closest ? hovered.closest('[data-file-card]') : null;
        if (mergeCard && cabinetDragFileId && mergeCard.getAttribute('data-file-card') !== cabinetDragFileId) {
          e.preventDefault();
          e.stopPropagation();
          try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
          mergeCard.classList.add(dt.reorder ? 'drop-reorder' : 'drop-merge');
          return;
        }
        const folderCard = hovered && hovered.closest ? hovered.closest('[data-folder-card]') : null;
        if (folderCard) {
          const hasFileId = dt.file;
          const hasFolderId = dt.folder;
          const hasOsFiles = dt.os;
          if (hasFileId || hasFolderId || hasOsFiles || (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.length === 0)) {
            const fid = folderCard.getAttribute('data-folder-card');
            let kind = '';
            try { const t = findFolderById(D(), fid); kind = t && t.kind; } catch (err) {}
            // Invalid folder drops (self, own child, or folders into linkers)!
            if (hasFolderId && !hasFileId) {
              const draggedId = cabinetDragFolderId;
              let dragged = null;
              try { dragged = draggedId ? findFolderById(D(), draggedId) : null; } catch (err) {}
              if (!draggedId || fid === draggedId || kind === 'linker' || (dragged && folderContainsFolder(dragged, fid))) return;
            }
            e.preventDefault();
            // Cursor tells the truth: link for app files on linkers!
            const linking = kind === 'linker' && hasFileId && !hasOsFiles && !hasFolderId;
            try { e.dataTransfer.dropEffect = linking ? 'link' : ((hasOsFiles && !hasFileId && !hasFolderId) ? 'copy' : 'move'); } catch (err) {}
            // Outline matches the folder type so nothing looks weird!
            folderCard.classList.add('drag-over-folder');
            if (kind === 'node') folderCard.classList.add('drag-over-node');
            if (kind === 'connector' || kind === 'linker') folderCard.classList.add('drag-over-connector');
            if (kind === 'branch') folderCard.classList.add('drag-over-branch');
            if (kind === 'merge') folderCard.classList.add('drag-over-merge');
          }
        }
      });
      grid.addEventListener('dragleave', function (e) {
        const folderCard = e.target.closest ? e.target.closest('[data-folder-card]') : null;
        if (folderCard) {
          folderCard.classList.remove('drag-over-folder');
          folderCard.classList.remove('drag-over-node');
          folderCard.classList.remove('drag-over-connector');
          folderCard.classList.remove('drag-over-branch');
          folderCard.classList.remove('drag-over-merge');
        }
        const mergeCard = e.target.closest ? e.target.closest('[data-file-card]') : null;
        if (mergeCard) {
          mergeCard.classList.remove('drop-merge');
          mergeCard.classList.remove('drop-reorder');
        }
      });
      grid.addEventListener('drop', function (e) {
        // Ground-up targeting: coordinates first (never lies), event target second!
        // The add-inside overlay is absolute, so layout never shifts mid-drag!
        function elAtPoint() {
          try {
            if (typeof document.elementFromPoint === 'function' && e.clientX !== undefined && e.clientY !== undefined) {
              const el = document.elementFromPoint(e.clientX, e.clientY);
              if (el) return el;
            }
          } catch (err) {}
          return null;
        }
        function dropTargetEl() {
          try {
            const pointed = elAtPoint();
            if (pointed && pointed.closest) {
              const t = pointed.closest('[data-folder-card], [data-file-card]');
              if (t) return t;
            }
            if (e.target && e.target.closest) {
              const t = e.target.closest('[data-folder-card], [data-file-card]');
              if (t) return t;
            }
          } catch (err) {}
          return null;
        }
        function dropFileId() {
          if (cabinetDragFileId) return cabinetDragFileId;
          try { return e.dataTransfer.getData('text/cabinet-file-id') || null; } catch (err) { return null; }
        }
        function dropFolderId() {
          if (cabinetDragFolderId) return cabinetDragFolderId;
          try { return e.dataTransfer.getData('text/cabinet-folder-id') || null; } catch (err) { return null; }
        }
        function dropOsFiles() {
          return (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) ? e.dataTransfer.files : null;
        }
        try {
          const hit = dropTargetEl();
          const reorderMode = cabinetReorderMode;
          const folderCard = hit && hit.closest ? hit.closest('[data-folder-card]') : null;
          if (folderCard) {
            // OS files dropped onto any folder card go straight inside it!
            // (Linkers land them in the parent and link them instead!)
            const osFiles = dropOsFiles();
            const fileId = dropFileId();
            const dragFolderId = dropFolderId();
            const folderId = folderCard.getAttribute('data-folder-card');
            const target = findFolderById(D(), folderId);
            if (!fileId && !dragFolderId && osFiles) {
              e.preventDefault();
              e.stopPropagation();
              clearFolderHighlights();
              playCabinetSound(650, 0.12);
              cabinetAddFilesToFolder(folderId, osFiles).catch(function () {});
              return;
            }
            if (fileId) {
              e.preventDefault();
              e.stopPropagation();
              clearFolderHighlights();
              // Linkers can only link: everything else swallows the file!
              if (target && target.kind === 'linker') {
                if (cabinetLinkFileToConnector(fileId, folderId)) playCabinetSound(650, 0.12);
              } else if (cabinetMoveFileToFolder(fileId, folderId)) {
                playCabinetSound(650, 0.12);
              }
              return;
            }
            // Dragged folders move inside, but never into a link-only Linker!
            // Branches + Nodes dropped on a Merge get absorbed instead!
            if (dragFolderId) {
              e.preventDefault();
              e.stopPropagation();
              clearFolderHighlights();
              if (target && target.kind === 'linker') return;
              if (target && target.kind === 'merge') {
                const dragged = findFolderById(D(), dragFolderId);
                if (dragged && (dragged.kind === 'branch' || dragged.kind === 'node')) {
                  if (cabinetMergeInto(folderId, dragFolderId)) playCabinetSound(650, 0.12);
                  return;
                }
              }
              if (cabinetMoveFolderToFolder(dragFolderId, folderId)) playCabinetSound(650, 0.12);
              return;
            }
          }
          // File dropped onto another file: reorder in reorder mode, else group!
          const mergeHit = hit && hit.closest ? hit.closest('[data-file-card]') : null;
          if (mergeHit) {
            const targetFileId = mergeHit.getAttribute('data-file-card');
            const sourceFileId = dropFileId();
            if (sourceFileId && targetFileId && sourceFileId !== targetFileId) {
              e.preventDefault();
              e.stopPropagation();
              if (reorderMode) {
                if (cabinetReorderFile(sourceFileId, targetFileId)) playCabinetSound(650, 0.12);
                return;
              }
              playCabinetSound(550, 0.1);
              const targetEntry = findFileRecursive(D(), targetFileId);
              const suggested = targetEntry ? targetEntry.name.replace(/\.[a-z0-9]{1,8}$/i, '') + ' Folder' : 'New Folder';
              const name = prompt('Folder name for these 2 files:', suggested);
              if (name !== null) {
                if (cabinetGroupFilesIntoFolder(sourceFileId, targetFileId, name)) playCabinetSound(650, 0.12);
              }
              return;
            }
          }
        } finally {
          cabinetDragFileId = null;
          cabinetDragFolderId = null;
          cabinetReorderMode = false;
          touchReorderArmed = false;
        }
        clearFolderHighlights();
        clearMergeHighlights();
      });
      grid.addEventListener('dragend', function () {
        cabinetDragFileId = null;
        cabinetDragFolderId = null;
        cabinetReorderMode = false;
        touchReorderArmed = false;
        clearFolderHighlights();
        clearMergeHighlights();
      });
      // Safety net: only clears tracking vars, highlights die with renders!
      document.addEventListener('drop', function () {
        cabinetDragFileId = null;
        cabinetDragFolderId = null;
        cabinetReorderMode = false;
        touchReorderArmed = false;
        try { clearFolderHighlights(); } catch (err) {}
        try { clearMergeHighlights(); } catch (err) {}
      });
    }
    if (zone) {
      ['dragenter', 'dragover'].forEach(function (t) {
        zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
      });
      ['dragleave', 'drop'].forEach(function (t) {
        zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove('drag-over'); });
      });
      zone.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          cabinetAddFiles(e.dataTransfer.files).catch(function () {});
        }
      });
    }
    const closeBtn = byId('lightbox-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function () { playCabinetSound(450, 0.08); closeLightbox(); });
    const dlBtn = byId('lightbox-download-btn');
    if (dlBtn) dlBtn.addEventListener('click', function () { playCabinetSound(700, 0.08); if (lightboxFileId) cabinetDownloadFile(lightboxFileId); });
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
    const toggle = byId('toggle-zone');
    if (toggle) toggle.addEventListener('click', function () {
      const sb = byId('sidebar');
      if (sb) sb.classList.toggle('collapsed');
    });
    const breadcrumb = byId('folder-breadcrumb');
    if (breadcrumb) {
      breadcrumb.addEventListener('click', function (e) {
        const item = e.target.closest ? e.target.closest('.breadcrumb-item') : null;
        if (item) {
          playCabinetSound(600, 0.08);
          const pathStr = item.getAttribute('data-path');
          if (pathStr === '') {
            currentFolderPath = [];
          } else {
            currentFolderPath = JSON.parse(pathStr);
          }
          renderDrawer();
        }
      });
      // ---- Drag files onto breadcrumb path titles to move them there! ----
      breadcrumb.addEventListener('dragover', function (e) {
        const item = e.target.closest ? e.target.closest('.breadcrumb-item') : null;
        if (item) {
          let hasFileId = !!cabinetDragFileId;
          let hasFolderId = !!cabinetDragFolderId;
          try {
            const types = e.dataTransfer ? e.dataTransfer.types : [];
            for (let i = 0; i < types.length; i++) {
              if (types[i] === 'text/cabinet-file-id') hasFileId = true;
              if (types[i] === 'text/cabinet-folder-id') hasFolderId = true;
            }
          } catch (err) {}
          if (hasFileId || hasFolderId || (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.length === 0)) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('drag-over-path');
          }
        }
      });
      breadcrumb.addEventListener('dragleave', function (e) {
        const item = e.target.closest ? e.target.closest('.breadcrumb-item') : null;
        if (item) item.classList.remove('drag-over-path');
      });
      breadcrumb.addEventListener('drop', function (e) {
        const item = e.target.closest ? e.target.closest('.breadcrumb-item') : null;
        if (item) {
          let fileId = cabinetDragFileId;
          if (!fileId) {
            try { fileId = e.dataTransfer.getData('text/cabinet-file-id'); } catch (err) {}
          }
          let folderDragId = cabinetDragFolderId;
          if (!folderDragId) {
            try { folderDragId = e.dataTransfer.getData('text/cabinet-folder-id'); } catch (err) {}
          }
          const pathStr = item.getAttribute('data-path');
          let targetPath = [];
          if (pathStr && pathStr !== '') {
            try { targetPath = JSON.parse(pathStr); } catch (err) { targetPath = []; }
          }
          if (fileId) {
            e.preventDefault();
            e.stopPropagation();
            item.classList.remove('drag-over-path');
            if (cabinetMoveFileToPath(fileId, targetPath)) playCabinetSound(650, 0.12);
            return;
          }
          // Dragged folders move to the path too (cycles rejected inside)!
          if (folderDragId) {
            e.preventDefault();
            e.stopPropagation();
            item.classList.remove('drag-over-path');
            if (cabinetMoveFolderToPath(folderDragId, targetPath)) playCabinetSound(650, 0.12);
            return;
          }
        }
        breadcrumb.querySelectorAll('.drag-over-path').forEach(function (el) { el.classList.remove('drag-over-path'); });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initCabinet);

  window.RadiiCabinet = {
    init: initCabinet,
    render: renderDrawer,
    files: function () { var cur = getCurrentFolder() || D(); return (cur.files || []).slice(); },
    name: function () { return D().name; },
    addFiles: cabinetAddFiles,
    removeFile: cabinetRemoveFile,
    renameFile: cabinetRenameFile,
    renameFolder: cabinetRenameFolder,
    rename: cabinetRename,
    fresh: cabinetFreshDrawer,
    newDrawer: cabinetNewDrawer,
    switchDrawer: cabinetSwitchDrawer,
    deleteDrawer: cabinetDeleteDrawer,
    drawers: function () { return drawers.map(function (d) { return { id: d.id, name: d.name, files: d.files.slice() }; }); },
    activeId: function () { return activeDrawerId; },
    serialize: cabinetSerializeDrawer,
    parse: cabinetParseDrawer,
    exportDrawer: cabinetExportDrawer,
    exportZip: cabinetExportZip,
    importDrawer: cabinetImportDrawer,
    downloadFile: cabinetDownloadFile,
    downloadFolder: cabinetDownloadFolder,
    lightbox: openLightbox,
    sound: playCabinetSound,
    fmtSize: fmtSize,
    createFolder: cabinetCreateFolder,
    createBranch: function (name) { return cabinetCreateFolder(name || 'New Branch', 'branch'); },
    branchClone: cabinetBranchClone,
    setBranchColor: cabinetSetBranchColor,
    renameFolder: cabinetRenameFolder,
    createNode: cabinetCreateNode,
    createConnector: cabinetCreateConnector,
    linkFileToConnector: cabinetLinkFileToConnector,
    linkFolder: cabinetLinkFolder,
    mergeInto: cabinetMergeInto,
    armPickMerge: armPickMerge,
    unlinkFile: cabinetUnlinkFile,
    bringLinkInside: cabinetBringLinkInside,
    jumpToFile: cabinetJumpToFile,
    addFilesToFolder: cabinetAddFilesToFolder,
    removeFolder: cabinetRemoveFolder,
    duplicateFolder: cabinetDuplicateFolder,
    setFolderNote: cabinetSetFolderNote,
    toggleFolderPower: cabinetToggleFolderPower,
    exportFolder: cabinetExportFolder,
    addFolderTag: cabinetAddFolderTag,
    removeFolderTag: cabinetRemoveFolderTag,
    moveFileToFolder: cabinetMoveFileToFolder,
    moveFileToPath: cabinetMoveFileToPath,
    reorderFile: cabinetReorderFile,
    armPickInside: armPickInside,
    armPickLink: armPickLink,
    disarmPickInside: disarmPickInside,
    viewMode: function () { return cabinetViewMode; },
    setViewMode: setCabinetViewMode,
    moveFolderToFolder: cabinetMoveFolderToFolder,
    moveFolderToPath: cabinetMoveFolderToPath,
    groupFilesIntoFolder: cabinetGroupFilesIntoFolder,
    navigateFolder: cabinetNavigateFolder,
    currentFolder: getCurrentFolder,
    storageInfo: function () { return { overflow: lastPersistOverflow, localBytes: stateDataBytes(drawers), localSavedAt: localSavedAt }; },
    flushStorage: function () {
      try {
        if (idbSaveTimer) { clearTimeout(idbSaveTimer); idbSaveTimer = null; }
        return idbSetState({ drawers: drawers, activeId: activeDrawerId, savedAt: Date.now() });
      } catch (e) { return Promise.reject(e); }
    }
  };
})();
