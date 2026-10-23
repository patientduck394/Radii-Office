/* =====================================================================
   Radii Office Shell! The Office-style layout (title bar, ribbon, File
   screen, status bar, menus, toasts) shared by Writeout, Amber and Bitbook!
   Each app keeps an identical copy of this file in its own folder (Tauri
   bundles one folder per app), so keep the copies in sync!

   Apps call OfficeShell.init({...}) with their tabs, backstage pages and
   settings. The original ("Classic") layout stays untouched underneath:
   body.os-office shows this shell, body.os-classic hides it!
   ===================================================================== */
(function () {
    'use strict';

    const ICONS = {
        save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
        undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
        redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
        chevUp: '<path d="M6 15l6-6 6 6"/>',
        chevDown: '<path d="M6 9l6 6 6-6"/>',
        chevRight: '<path d="M9 6l6 6-6 6"/>',
        chevLeft: '<path d="M15 6l-6 6 6 6"/>',
        paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9z"/><path d="M8.5 11h7M8.5 15h4.5"/>',
        cut: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.2 16L18 3M15.8 16L6 3"/>',
        copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/>',
        brush: '<path d="M18.4 2.6l3 3-9.2 9.2-3-3z"/><path d="M9.2 11.8c-2.9 0-4.7 2-4.7 4.6 0 1.6-1 3-2 3.1 2.2 1.2 6 .9 7.9-1 1.4-1.4 1.8-2.8 1.8-3.7"/>',
        growFont: '<path d="M2.5 19L8 5l5.5 14M4.6 14h6.8"/><path d="M16 10l3-3 3 3M19 7v9"/>',
        shrinkFont: '<path d="M2.5 19L8 5l5.5 14M4.6 14h6.8"/><path d="M16 13l3 3 3-3M19 16V7"/>',
        aLeft: '<path d="M3 5h18M3 10h12M3 15h18M3 20h12"/>',
        aCenter: '<path d="M3 5h18M6 10h12M3 15h18M6 20h12"/>',
        aRight: '<path d="M3 5h18M9 10h12M3 15h18M9 20h12"/>',
        aJustify: '<path d="M3 5h18M3 10h18M3 15h18M3 20h18"/>',
        indent: '<path d="M3 5h18M11 10h10M11 15h10M3 20h18M3 9l4 3-4 3"/>',
        outdent: '<path d="M3 5h18M11 10h10M11 15h10M3 20h18M7 9l-4 3 4 3"/>',
        bullets: '<circle cx="4.5" cy="6" r="1.4" fill="currentColor"/><circle cx="4.5" cy="12" r="1.4" fill="currentColor"/><circle cx="4.5" cy="18" r="1.4" fill="currentColor"/><path d="M9 6h12M9 12h12M9 18h12"/>',
        numbers: '<text x="1.5" y="8.5" font-size="7" font-weight="700" fill="currentColor" stroke="none">1</text><text x="1.5" y="14.5" font-size="7" font-weight="700" fill="currentColor" stroke="none">2</text><text x="1.5" y="20.5" font-size="7" font-weight="700" fill="currentColor" stroke="none">3</text><path d="M9 6h12M9 12h12M9 18h12"/>',
        quote: '<path d="M4 11h5v6H4zM4 11c0-3 1.5-5 4-6M14 11h5v6h-5zM14 11c0-3 1.5-5 4-6"/>',
        code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
        clearFormat: '<path d="M5 5h12M11 5l-3 14M15 13l6 6M21 13l-6 6"/>',
        highlighter: '<path d="M14.5 4.5l5 5-8 8H6.5v-5z"/><path d="M4 21h16" stroke-width="3"/>',
        fontColor: '<path d="M6 17L12 3l6 14M8.3 12h7.4"/>',
        palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.8-1.5 1.7-1.5H17a4 4 0 0 0 4-4c0-4.5-4-8.2-9-8.2z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7.2" r="1.2" fill="currentColor"/>',
        orb: '<circle cx="12" cy="12" r="8"/><path d="M8.5 9a4 4 0 0 1 3.5-2.5" stroke-width="2.2"/>',
        bubble: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M7 10.5a2 2 0 0 1 2-1.5h5" stroke-width="2"/>',
        sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>',
        image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
        link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
        file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
        attach: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7"/>',
        table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 14.8h18M9 9.5V20M15 9.5V20"/>',
        divider: '<path d="M3 12h18"/><path d="M6 7h12M6 17h12" opacity=".4"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        newDoc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M13 12v6M10 15h6"/>',
        folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        export: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
        import: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
        download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
        print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
        home: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-6h6v6"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
        store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 11z"/><path d="M5 13v8h14v-8M10 21v-5h4v5"/>',
        lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M9 10h12"/>',
        pages: '<rect x="4" y="2.5" width="12" height="15" rx="1.5"/><rect x="8" y="6.5" width="12" height="15" rx="1.5" fill="var(--os-ribbon, #fff)"/>',
        page: '<rect x="5" y="2.5" width="14" height="19" rx="1.5"/><path d="M8.5 7h7M8.5 10.5h7M8.5 14h4.5"/>',
        web: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01"/>',
        orientation: '<rect x="3" y="6" width="11" height="15" rx="1.5"/><rect x="10" y="3" width="11" height="8" rx="1.5" opacity=".55"/>',
        size: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h6M12 7v10M9 17h6" opacity=".6"/>',
        margins: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><rect x="7.5" y="6.5" width="9" height="11" stroke-dasharray="2 1.6"/>',
        ruler: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>',
        zoom: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6M11 8v6"/>',
        zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>',
        eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        navPane: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M5 8h2M5 11h2M5 14h2"/>',
        sidePane: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="M17 8h2M17 11h2M17 14h2"/>',
        focus: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="3"/>',
        moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
        droplets: '<circle cx="7" cy="8" r="3"/><circle cx="16" cy="6" r="2"/><circle cx="15" cy="16" r="4"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        x: '<path d="M6 6l12 12M18 6L6 18"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/>',
        duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/><path d="M14 11v6M11 14h6"/>',
        arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
        arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
        slide: '<rect x="2.5" y="4.5" width="19" height="13" rx="1.5"/><path d="M12 17.5V21M8 21h8"/>',
        newSlide: '<rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><circle cx="18.5" cy="17.5" r="4" fill="var(--os-ribbon, #fff)"/><path d="M18.5 15.6v3.8M16.6 17.5h3.8"/>',
        play: '<path d="M7 4.5v15l12.5-7.5z"/>',
        playFrom: '<rect x="2.5" y="4.5" width="13" height="10" rx="1.5"/><path d="M14 13v8l7-4z" fill="currentColor"/>',
        stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
        textbox: '<rect x="3" y="5" width="18" height="14" rx="1.5" stroke-dasharray="2.5 2"/><path d="M8 9h8M12 9v7"/>',
        shapes: '<circle cx="8" cy="8" r="4.5"/><rect x="11" y="11" width="10" height="10" rx="1.5"/><path d="M3 21l4-7 4 7z"/>',
        bringFront: '<rect x="3" y="3" width="11" height="11" rx="1.5" opacity=".5"/><rect x="10" y="10" width="11" height="11" rx="1.5" fill="currentColor" fill-opacity=".25"/>',
        sendBack: '<rect x="3" y="3" width="11" height="11" rx="1.5" fill="currentColor" fill-opacity=".25"/><rect x="10" y="10" width="11" height="11" rx="1.5" opacity=".5"/>',
        grid: '<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',
        magnet: '<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/><path d="M6 7h4M14 7h4"/>',
        background: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="16" cy="8.5" r="1.5"/>',
        transition: '<rect x="2" y="6" width="11" height="12" rx="1.5"/><rect x="11" y="6" width="11" height="12" rx="1.5" fill="currentColor" fill-opacity=".25"/><path d="M7 12h8M13 10l2 2-2 2"/>',
        star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"/>',
        animPane: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="M5.5 9l1.5-2 1.5 2M5.5 15l1.5-2 1.5 2"/><path d="M17 8h2M17 12h2M17 16h2"/>',
        timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
        notebook: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M5 7H3M5 12H3M5 17H3M9 2.5v19"/>',
        section: '<path d="M4 6h16M4 12h16M4 18h10"/><rect x="2" y="3" width="20" height="18" rx="2" opacity=".4"/>',
        tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
        todo: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M7.5 12.5l3 3 6-7"/>',
        lightbulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
        importantStar: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" fill="#f59e0b" stroke="#b45309"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        hash: '<path d="M5 9h15M4 15h15M10 3L8 21M16 3l-2 18"/>',
        symbol: '<path d="M6 19h4.5v-1.6a6.8 6.8 0 1 1 3 0V19H18"/>',
        music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
        dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
        pixel: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
        cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 6V4h14v14h-4"/>',
        capsule: '<rect x="4" y="8" width="16" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M9.5 8.5l5 7" />',
        pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
        lines: '<path d="M3 6h18M3 10h18M3 14h18M3 18h18" opacity=".7"/>',
        pageColor: '<rect x="4" y="3" width="16" height="18" rx="2" fill="currentColor" fill-opacity=".18"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        css: '<path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3"/>',
        jumper: '<path d="M4 17c3-9 7-9 9-5s5 3 7-3"/><circle cx="20" cy="9" r="1.5" fill="currentColor"/>',
        annotate: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8M8 11.5h5"/>',
        font: '<path d="M5 20L11 4h2l6 16M7.5 14h9"/>',
        weight: '<path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z"/>',
        effects: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
        reset: '<path d="M4 11a8 8 0 1 1 2.3 5.7"/><path d="M4 4v7h7"/>',
        keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
        fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
        notes: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h18M6 17h8"/>',
        sorter: '<rect x="3" y="4" width="8" height="6" rx="1"/><rect x="13" y="4" width="8" height="6" rx="1"/><rect x="3" y="14" width="8" height="6" rx="1"/><rect x="13" y="14" width="8" height="6" rx="1"/>'
    };

    function ico(name, cls) {
        return '<svg class="os-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.sparkle) + '</svg>';
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

    function el(tag, cls, html) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    let cfg = null;
    let prefs = { ribbonMin: false, tab: 'home', dark: false, anim: true };
    let controls = [];          // registered ribbon controls for syncing!
    let commandIndex = [];      // searchable commands!
    let savedRange = null;      // the editor selection, kept while ribbon controls take focus!
    let syncQueued = false;
    let menuEl = null;
    let menuAnchor = null;

    function click(freq) {
        try { if (typeof window.playAeroClickSound === 'function') window.playAeroClickSound(freq || 600, 0.05); } catch (e) {}
    }

    function isOffice() { return document.body.classList.contains('os-office'); }
    function animOn() { return prefs.anim && !document.body.classList.contains('os-no-anim'); }

    function restartAnim(node, cls) {
        if (!node || !animOn()) return;
        node.classList.remove(cls);
        void node.offsetWidth;
        node.classList.add(cls);
    }

    /* ---------- Selection keeping (ribbon clicks never lose your text selection!) ---------- */
    function editorEl() {
        try { return cfg && cfg.editor ? cfg.editor() : null; } catch (e) { return null; }
    }

    function inShell(node) {
        return !!(node && node.closest && node.closest('#os-top, .os-menu, #os-backstage, .os-dlg-back'));
    }

    function trackSelection() {
        const ed = editorEl();
        const sel = window.getSelection();
        if (ed && sel && sel.rangeCount && ed.contains(sel.anchorNode) && !inShell(document.activeElement)) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
        queueSync();
    }

    function restoreSelection() {
        const ed = editorEl();
        if (!ed) return false;
        const sel = window.getSelection();
        if (sel && sel.rangeCount && ed.contains(sel.anchorNode) && document.activeElement === ed) return true;
        if (!savedRange || !document.contains(savedRange.startContainer) || !ed.contains(savedRange.startContainer)) return false;
        try {
            ed.focus({ preventScroll: true });
            sel.removeAllRanges();
            sel.addRange(savedRange);
            return true;
        } catch (e) { return false; }
    }

    function run(item, ev) {
        if (!item) return;
        const keep = item.sel !== undefined ? item.sel : !!(cfg && cfg.keepSelection);
        if (keep) restoreSelection();
        click(item.freq);
        try {
            if (item.run) item.run(ev && ev.currentTarget, ev);
        } catch (err) {
            console.error(err);
            toast('Something went wrong: ' + err.message);
        }
        queueSync();
    }

    /* ---------- Ribbon controls ---------- */
    function itemLabel(it) {
        return typeof it.label === 'function' ? it.label() : (it.label || '');
    }

    function buildButton(it) {
        const size = it.big ? 'big' : it.sm ? 'sm' : 'ic';
        const b = el('button', 'os-rb ' + size + (it.cls ? ' ' + it.cls : ''));
        b.type = 'button';
        b.title = (it.title || itemLabel(it)) + (it.kbd ? ' (' + it.kbd + ')' : '');
        const glyph = it.glyph ? '<b class="os-glyph' + (it.glyphCls ? ' ' + it.glyphCls : '') + '">' + it.glyph + '</b>' : ico(it.icon);
        const lab = (it.big || it.sm) ? '<span>' + esc(itemLabel(it)).replace(/\n/g, '<br>') + (it.menu && it.big ? ' <i class="os-caret">▾</i>' : '') + '</span>' : '';
        b.innerHTML = glyph + lab + (it.bar ? '<i class="os-cbar"></i>' : '');
        if (it.menu && !it.run) {
            b.addEventListener('click', function (e) { toggleMenu(b, typeof it.menu === 'function' ? it.menu(b) : it.menu, it.menuCls); e.stopPropagation(); });
        } else {
            b.addEventListener('click', function (e) { run(it, e); restartAnim(b, 'os-pop'); });
        }
        if (it.menu && it.run) {
            const wrap = el('div', 'os-split ' + size);
            const arrow = el('button', 'os-split-arrow', '▾');
            arrow.type = 'button';
            arrow.title = (it.title || itemLabel(it)) + ' options';
            arrow.addEventListener('click', function (e) { toggleMenu(arrow, typeof it.menu === 'function' ? it.menu(arrow) : it.menu, it.menuCls); e.stopPropagation(); });
            wrap.appendChild(b);
            wrap.appendChild(arrow);
            controls.push({ it: it, el: b, wrap: wrap });
            return wrap;
        }
        controls.push({ it: it, el: b });
        return b;
    }

    function buildSelect(it) {
        const wrap = el('label', 'os-combo' + (it.cls ? ' ' + it.cls : ''));
        wrap.title = it.title || itemLabel(it);
        const s = el('select', 'os-select');
        if (it.width) s.style.width = it.width + 'px';
        const opts = typeof it.options === 'function' ? it.options() : it.options;
        opts.forEach(function (o) {
            const v = Array.isArray(o) ? o[0] : o;
            const t = Array.isArray(o) ? o[1] : o;
            const op = document.createElement('option');
            op.value = v;
            op.textContent = t;
            if (it.fontPreview) op.style.fontFamily = v;
            s.appendChild(op);
        });
        s.addEventListener('change', function () {
            if (cfg.keepSelection && it.sel !== false) restoreSelection();
            try { it.set(s.value); } catch (e) { console.error(e); }
            queueSync();
        });
        wrap.appendChild(s);
        controls.push({ it: it, el: s, kind: 'select' });
        return wrap;
    }

    // Number box with real ▲/▼ spin buttons: clean rounding, min/max clamping,
    // hold-to-repeat, and ↑/↓ keys while typing (no fragile native spinners)!
    function stepDecimals(st) { const t = String(st); return t.indexOf('.') === -1 ? 0 : t.length - t.indexOf('.') - 1; }
    function fmtNum(v, st) {
        const n = Number(v);
        if (!isFinite(n)) return '';
        return String(Number(n.toFixed(Math.max(stepDecimals(st), 2))));
    }
    function buildNumber(it) {
        const wrap = el('label', 'os-combo os-num' + (it.cls ? ' ' + it.cls : ''));
        wrap.title = it.title || itemLabel(it);
        if (it.label) wrap.innerHTML = '<span class="os-num-lab">' + esc(itemLabel(it)) + '</span>';
        const box = el('span', 'os-spinbox');
        const inp = el('input', 'os-input');
        inp.type = 'text';
        inp.inputMode = 'decimal';
        inp.autocomplete = 'off';
        inp.spellcheck = false;
        if (it.width) inp.style.width = it.width + 'px';
        const st = it.step || 1;
        const clamp = function (v) {
            if (it.min != null) v = Math.max(it.min, v);
            if (it.max != null) v = Math.min(it.max, v);
            return Number(v.toFixed(Math.max(stepDecimals(st), 2)));
        };
        const commit = function (v) {
            if (!isFinite(v)) { queueSync(); return; }
            v = clamp(v);
            inp.value = fmtNum(v, st);
            if (cfg.keepSelection && it.sel !== false) restoreSelection();
            try { it.set(v); } catch (e) { console.error(e); }
            queueSync();
        };
        const bump = function (dir) {
            if (inp.disabled) return;
            const cur = parseFloat(inp.value);
            const base = isFinite(cur) ? cur : (it.min != null ? it.min : 0);
            // Snap onto the step grid first, so 0.01 + 0.05 lands on 0.05, not 0.06!
            const k = Math.round(base / st * 1e6) / 1e6;
            const next = (dir > 0 ? Math.floor(k) + 1 : Math.ceil(k) - 1) * st;
            commit(next);
            click(dir > 0 ? 680 : 560);
        };
        inp.addEventListener('change', function () { if (inp.value.trim() !== '') commit(parseFloat(inp.value)); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); commit(parseFloat(inp.value)); inp.blur(); restoreSelection(); }
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); bump(e.key === 'ArrowUp' ? 1 : -1); }
            else if (e.key === 'Escape') { inp.blur(); queueSync(); }
        });
        const spin = el('span', 'os-spin');
        [['up', 1, '▲'], ['down', -1, '▼']].forEach(function (d) {
            const b = el('button', 'os-spin-' + d[0], d[2]);
            b.type = 'button';
            b.tabIndex = -1;
            b.title = (d[1] > 0 ? 'Increase ' : 'Decrease ') + (itemLabel(it) || it.title || '');
            let hold = null, rep = null;
            const stop = function () { clearTimeout(hold); clearInterval(rep); hold = rep = null; };
            b.addEventListener('mousedown', function (e) {
                e.preventDefault();
                if (e.button !== 0) return;
                bump(d[1]);
                stop();
                hold = setTimeout(function () { rep = setInterval(function () { bump(d[1]); }, 70); }, 380);
            });
            b.addEventListener('mouseup', stop);
            b.addEventListener('mouseleave', stop);
            b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
            spin.appendChild(b);
        });
        box.appendChild(inp);
        box.appendChild(spin);
        wrap.appendChild(box);
        if (it.unit) wrap.appendChild(el('span', 'os-num-unit', esc(it.unit)));
        controls.push({ it: it, el: inp, kind: 'number', wrap: wrap });
        return wrap;
    }

    function buildCheck(it) {
        const lab = el('label', 'os-check');
        lab.title = it.title || itemLabel(it);
        const cb = el('input');
        cb.type = 'checkbox';
        cb.addEventListener('change', function () { click(); try { it.set(cb.checked); } catch (e) { console.error(e); } queueSync(); });
        lab.appendChild(cb);
        lab.appendChild(el('span', null, esc(itemLabel(it))));
        controls.push({ it: it, el: cb, kind: 'check' });
        return lab;
    }

    function buildGallery(it) {
        const g = el('div', 'os-gallery' + (it.cls ? ' ' + it.cls : ''));
        const list = el('div', 'os-gal-list');
        g.appendChild(list);
        const render = function () {
            const items = typeof it.items === 'function' ? it.items() : it.items;
            list.innerHTML = '';
            items.forEach(function (gi) {
                const b = el('button', 'os-gal-item' + (gi.cls ? ' ' + gi.cls : ''));
                b.type = 'button';
                b.title = gi.title || gi.label;
                b.innerHTML = (gi.preview || '') + '<span>' + esc(gi.label) + '</span>';
                b.addEventListener('click', function (e) { run(gi, e); restartAnim(b, 'os-pop'); });
                b._gi = gi;
                list.appendChild(b);
            });
        };
        render();
        if (it.menu) {
            const more = el('button', 'os-gal-more', ico('chevDown'));
            more.type = 'button';
            more.title = 'More';
            more.addEventListener('click', function (e) { toggleMenu(more, typeof it.menu === 'function' ? it.menu(more) : it.menu, it.menuCls); e.stopPropagation(); });
            g.appendChild(more);
        }
        controls.push({ it: it, el: g, kind: 'gallery', render: render, list: list });
        return g;
    }

    function buildItem(it) {
        if (it.sep) return el('span', 'os-rsep');
        if (it.stack) {
            const s = el('div', 'os-stack');
            it.stack.forEach(function (x) { s.appendChild(buildItem(x)); });
            return s;
        }
        if (it.rows) {
            const c = el('div', 'os-rows');
            it.rows.forEach(function (row) {
                const r = el('div', 'os-row');
                row.forEach(function (x) { r.appendChild(buildItem(x)); });
                c.appendChild(r);
            });
            return c;
        }
        if (it.select) return buildSelect(it);
        if (it.number) return buildNumber(it);
        if (it.check) return buildCheck(it);
        if (it.gallery) return buildGallery(it);
        if (it.custom) {
            const c = el('div', 'os-custom');
            it.custom(c);
            if (it.sync) controls.push({ it: it, el: c, kind: 'custom' });
            return c;
        }
        return buildButton(it);
    }

    function indexCommands(items, tabLabel) {
        items.forEach(function (it) {
            if (!it) return;
            if (it.stack) return indexCommands(it.stack, tabLabel);
            if (it.rows) return it.rows.forEach(function (r) { indexCommands(r, tabLabel); });
            if (it.run && (it.label || it.title)) commandIndex.push({ label: it.title || itemLabel(it), icon: it.icon, where: tabLabel, it: it });
            if (it.gallery && !it.noIndex) {
                const items2 = typeof it.items === 'function' ? it.items() : it.items;
                items2.forEach(function (gi) { if (gi.run) commandIndex.push({ label: gi.title || gi.label, icon: it.icon || 'sparkle', where: tabLabel, it: gi }); });
            }
        });
    }

    function buildRibbon() {
        const ribbon = document.getElementById('os-ribbon');
        const tabs = document.getElementById('os-tabs');
        ribbon.innerHTML = '';
        tabs.querySelectorAll('.os-tab:not(.os-file)').forEach(function (t) { t.remove(); });
        controls = [];
        commandIndex = [];
        const ink = document.getElementById('os-ink');
        cfg.tabs.forEach(function (tab) {
            const tb = el('button', 'os-tab' + (tab.contextual ? ' os-ctx' : ''), esc(tab.label));
            tb.type = 'button';
            tb.dataset.tab = tab.id;
            tb.setAttribute('role', 'tab');
            tabs.insertBefore(tb, ink);
            const panel = el('div', 'os-panel');
            panel.dataset.panel = tab.id;
            tab.groups.forEach(function (gr) {
                const g = el('div', 'os-group' + (gr.cls ? ' ' + gr.cls : ''));
                const body = el('div', 'os-gbody');
                gr.items.forEach(function (it) { body.appendChild(buildItem(it)); });
                g.appendChild(body);
                if (gr.label) g.appendChild(el('div', 'os-glabel', esc(gr.label)));
                panel.appendChild(g);
                indexCommands(gr.items, tab.label);
            });
            ribbon.appendChild(panel);
            if (tab.contextual) controls.push({ it: { visible: tab.visible }, el: tb, kind: 'tab', tabId: tab.id });
        });
        showTab(cfg.tabs.some(function (t) { return t.id === prefs.tab && !t.contextual; }) ? prefs.tab : cfg.tabs[0].id, true);
    }

    function showTab(id, silent) {
        const tabs = document.getElementById('os-tabs');
        const t = tabs.querySelector('.os-tab[data-tab="' + id + '"]');
        if (!t) return;
        tabs.querySelectorAll('.os-tab').forEach(function (x) { x.classList.toggle('on', x === t); });
        document.querySelectorAll('#os-ribbon .os-panel').forEach(function (p) {
            const on = p.dataset.panel === id;
            p.classList.toggle('on', on);
            if (on && !silent) restartAnim(p, 'os-panel-in');
        });
        const tab = cfg.tabs.find(function (x) { return x.id === id; });
        if (tab && !tab.contextual) { prefs.tab = id; savePrefs(); }
        if (prefs.ribbonMin && !silent) document.body.classList.add('os-ribbon-peek');
        moveInk();
        queueSync();
    }

    function moveInk() {
        const tabs = document.getElementById('os-tabs');
        const ink = document.getElementById('os-ink');
        if (!tabs || !ink) return;
        const t = tabs.querySelector('.os-tab.on');
        if (!t || !t.offsetWidth) { ink.style.width = '0px'; return; }
        ink.style.left = (t.offsetLeft + 10) + 'px';
        ink.style.width = Math.max(10, t.offsetWidth - 20) + 'px';
    }

    function queueSync() {
        if (syncQueued) return;
        syncQueued = true;
        requestAnimationFrame(function () { syncQueued = false; sync(); });
    }

    function sync() {
        if (!cfg || !isOffice()) return;
        controls.forEach(function (c) {
            const it = c.it;
            try {
                if (c.kind === 'tab') {
                    const vis = it.visible ? !!it.visible() : true;
                    if (c.el.hidden === vis) {
                        c.el.hidden = !vis;
                        if (vis) restartAnim(c.el, 'os-ctx-in');
                        else if (c.el.classList.contains('on')) showTab(prefs.tab, true);
                        moveInk();
                    }
                    return;
                }
                if (it.disabled) {
                    const d = !!it.disabled();
                    if (c.el.disabled !== d) c.el.disabled = d;
                }
                if (c.kind === 'select') {
                    if (document.activeElement !== c.el && it.get) {
                        const v = it.get();
                        if (v != null && c.el.value !== String(v)) {
                            if (![].some.call(c.el.options, function (o) { return o.value === String(v); })) {
                                const op = document.createElement('option');
                                op.value = v; op.textContent = v;
                                c.el.appendChild(op);
                            }
                            c.el.value = v;
                        }
                    }
                } else if (c.kind === 'number') {
                    if (document.activeElement !== c.el && it.get) {
                        const v = it.get();
                        const t = v == null ? '' : fmtNum(v, it.step || 1);
                        if (c.el.value !== t) c.el.value = t;
                    }
                    c.wrap.classList.toggle('os-disabled', !!c.el.disabled);
                    c.wrap.querySelectorAll('.os-spin button').forEach(function (b) { b.disabled = c.el.disabled; });
                } else if (c.kind === 'check') {
                    if (it.get) c.el.checked = !!it.get();
                } else if (c.kind === 'gallery') {
                    if (it.refresh && it.refresh()) c.render();
                    [].forEach.call(c.list.children, function (b) { b.classList.toggle('on', !!(b._gi.active && b._gi.active())); });
                } else if (c.kind === 'custom') {
                    it.sync(c.el);
                } else {
                    if (it.checked) c.el.classList.toggle('on', !!it.checked());
                    if (it.bar) { const col = it.bar(); const bar = c.el.querySelector('.os-cbar'); if (bar) bar.style.background = col || 'transparent'; }
                    if (typeof it.label === 'function' && (it.big || it.sm)) {
                        const sp = c.el.querySelector('span');
                        const want = esc(itemLabel(it)).replace(/\n/g, '<br>') + (it.menu && it.big ? ' <i class="os-caret">▾</i>' : '');
                        if (sp && sp.innerHTML !== want) sp.innerHTML = want;
                    }
                }
            } catch (e) {}
        });
        updateTitle();
        updateStatus();
    }

    /* ---------- Menus ---------- */
    function closeMenu() {
        if (!menuEl) return;
        const m = menuEl;
        menuEl = null;
        if (menuAnchor) menuAnchor.classList.remove('os-menu-on');
        menuAnchor = null;
        if (animOn()) {
            m.classList.add('os-closing');
            setTimeout(function () { m.remove(); }, 110);
        } else m.remove();
    }

    function toggleMenu(anchor, items, cls) {
        if (menuEl && menuAnchor === anchor) { closeMenu(); return; }
        openMenu(anchor, items, { cls: cls });
    }

    function openMenu(anchor, items, opts) {
        opts = opts || {};
        closeMenu();
        if (!items) return null;
        click(540);
        const m = el('div', 'os-menu' + (opts.cls ? ' ' + opts.cls : ''));
        m.setAttribute('role', 'menu');
        const buttons = [];
        items.forEach(function (mi) {
            if (!mi) return;
            if (mi.sep) { m.appendChild(el('div', 'os-msep')); return; }
            if (mi.header) { m.appendChild(el('div', 'os-mhead', esc(mi.header))); return; }
            if (mi.node) { m.appendChild(mi.node); return; }
            if (mi.swatches) {
                const grid = el('div', 'os-swatches' + (mi.cls ? ' ' + mi.cls : ''));
                if (mi.cols) grid.style.gridTemplateColumns = 'repeat(' + mi.cols + ', 1fr)';
                mi.swatches.forEach(function (sw) {
                    const b = el('button', 'os-swatch' + (sw.cls ? ' ' + sw.cls : ''), sw.html || '');
                    b.type = 'button';
                    b.title = sw.title || '';
                    if (sw.color) b.style.background = sw.color;
                    b.addEventListener('click', function (e) { closeMenu(); run(sw, e); });
                    grid.appendChild(b);
                });
                m.appendChild(grid);
                return;
            }
            const b = el('button', 'os-mitem' + (mi.checked ? ' checked' : '') + (mi.cls ? ' ' + mi.cls : ''));
            b.type = 'button';
            b.setAttribute('role', 'menuitem');
            b.innerHTML = '<span class="os-mico">' + (mi.checked ? ico('check') : mi.icon ? ico(mi.icon) : mi.dot ? '<i class="os-mdot" style="background:' + esc(mi.dot) + '"></i>' : '') + '</span>' +
                '<span class="os-mlabel"' + (mi.style ? ' style="' + esc(mi.style) + '"' : '') + '>' + esc(mi.label) + (mi.hint ? '<small>' + esc(mi.hint) + '</small>' : '') + '</span>' +
                (mi.kbd ? '<span class="os-mkbd">' + esc(mi.kbd) + '</span>' : '');
            if (mi.disabled) b.disabled = true;
            b.addEventListener('click', function (e) { closeMenu(); run(mi, e); });
            m.appendChild(b);
            buttons.push(b);
        });
        document.body.appendChild(m);
        if (opts.x != null) placeAt(m, opts.x, opts.y);
        else placeUnder(m, anchor);
        restartAnim(m, 'os-pop-in');
        menuEl = m;
        menuAnchor = anchor || null;
        if (anchor) anchor.classList.add('os-menu-on');
        let idx = -1;
        m.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
                buttons[idx].focus();
            }
        });
        return m;
    }

    function placeUnder(m, anchor) {
        const r = anchor ? anchor.getBoundingClientRect() : { left: 100, bottom: 100, top: 100 };
        const mw = m.offsetWidth, mh = m.offsetHeight;
        let x = r.left, y = r.bottom + 3;
        if (x + mw > window.innerWidth - 6) x = Math.max(6, window.innerWidth - mw - 6);
        if (y + mh > window.innerHeight - 6) y = Math.max(6, r.top - mh - 3);
        m.style.left = x + 'px';
        m.style.top = y + 'px';
    }

    function placeAt(m, x, y) {
        const mw = m.offsetWidth, mh = m.offsetHeight;
        if (x + mw > window.innerWidth - 6) x = Math.max(6, window.innerWidth - mw - 6);
        if (y + mh > window.innerHeight - 6) y = Math.max(6, y - mh);
        m.style.left = x + 'px';
        m.style.top = y + 'px';
    }

    /* ---------- Toast + dialogs ---------- */
    let toastTimer = null;
    function toast(msg) {
        const t = document.getElementById('os-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
    }

    function dialog(title, bodyNode, buttons, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            const back = el('div', 'os-dlg-back');
            const d = el('div', 'os-dlg' + (opts.cls ? ' ' + opts.cls : ''));
            d.setAttribute('role', 'dialog');
            d.innerHTML = '<div class="os-dlg-head"><span>' + esc(title) + '</span><button type="button" class="os-dlg-x" title="Close">' + ico('x') + '</button></div>';
            const body = el('div', 'os-dlg-body');
            if (typeof bodyNode === 'string') body.innerHTML = bodyNode;
            else if (bodyNode) body.appendChild(bodyNode);
            d.appendChild(body);
            const foot = el('div', 'os-dlg-foot');
            const done = function (v) {
                back.classList.add('os-closing');
                setTimeout(function () { back.remove(); }, 150);
                document.removeEventListener('keydown', onKey, true);
                resolve(v);
            };
            (buttons || [{ label: 'OK', value: true, primary: true }]).forEach(function (bt) {
                const b = el('button', 'os-dlg-btn' + (bt.primary ? ' primary' : '') + (bt.danger ? ' danger' : ''), esc(bt.label));
                b.type = 'button';
                b.addEventListener('click', function () { if (bt.keep) { bt.value(body); return; } done(typeof bt.value === 'function' ? bt.value(body) : bt.value); });
                foot.appendChild(b);
            });
            d.appendChild(foot);
            back.appendChild(d);
            document.body.appendChild(back);
            d.querySelector('.os-dlg-x').addEventListener('click', function () { done(null); });
            back.addEventListener('mousedown', function (e) { if (e.target === back) done(null); });
            const onKey = function (e) {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); }
                else if (e.key === 'Enter' && !(e.target && e.target.tagName === 'TEXTAREA')) {
                    const p = foot.querySelector('.primary');
                    if (p) { e.preventDefault(); p.click(); }
                }
            };
            document.addEventListener('keydown', onKey, true);
            setTimeout(function () {
                const f = body.querySelector('input, select, textarea') || foot.querySelector('.primary');
                if (f) { f.focus(); if (f.select) f.select(); }
            }, 30);
        });
    }

    function prompt(title, label, value, okLabel) {
        const wrap = el('div');
        wrap.innerHTML = '<label class="os-field"><span>' + esc(label) + '</span><input class="os-dlg-input" spellcheck="false"></label>';
        wrap.querySelector('input').value = value || '';
        return dialog(title, wrap, [
            { label: 'Cancel', value: null },
            { label: okLabel || 'OK', primary: true, value: function (b) { return b.querySelector('input').value; } }
        ]);
    }

    function confirmBox(title, text, okLabel, danger) {
        return dialog(title, '<p class="os-dlg-text">' + esc(text) + '</p>', [
            { label: 'Cancel', value: false },
            { label: okLabel || 'OK', value: true, primary: true, danger: !!danger }
        ]);
    }

    /* ---------- Title + status ---------- */
    function updateTitle() {
        const inp = document.getElementById('os-docname');
        if (!inp || document.activeElement === inp || !cfg.title) return;
        const t = cfg.title() || 'Untitled';
        if (inp.value !== t) inp.value = t;
        inp.size = Math.max(6, Math.min(40, t.length + 1));
    }

    function flashSaved(text) {
        const s = document.getElementById('os-saved');
        if (!s) return;
        s.textContent = text || 'Saved';
        restartAnim(s, 'blip');
    }

    function updateStatus() {
        if (!cfg || !cfg.status) return;
        const l = document.getElementById('os-status-l');
        if (!l) return;
        let parts = [];
        try { parts = cfg.status() || []; } catch (e) {}
        const html = parts.map(function (p, i) { return '<span class="os-st' + (i === 0 ? ' os-st-chip' : '') + '">' + p + '</span>'; }).join('');
        if (l._html !== html) { l._html = html; l.innerHTML = html; }
        const views = document.getElementById('os-views');
        if (views && cfg.views) {
            [].forEach.call(views.children, function (b, i) {
                const v = cfg.views[i];
                if (v && v.active) b.classList.toggle('on', !!v.active());
            });
        }
        const z = cfg.zoom;
        if (z) {
            const pct = Math.round(z.get() * 100);
            const sl = document.getElementById('os-zoom');
            const lab = document.getElementById('os-zoom-lab');
            if (sl && document.activeElement !== sl) sl.value = pct;
            if (lab) lab.textContent = pct + '%';
        }
    }

    /* ---------- Backstage (File) ---------- */
    function openBackstage(page) {
        closeMenu();
        const bs = document.getElementById('os-backstage');
        bs.hidden = false;
        restartAnim(bs, 'os-bs-in');
        showBackstagePage(page || (cfg.backstage[0] && cfg.backstage[0].id) || 'settings');
    }

    function closeBackstage() {
        const bs = document.getElementById('os-backstage');
        if (bs.hidden) return;
        if (animOn()) {
            bs.classList.add('os-bs-out');
            setTimeout(function () { bs.hidden = true; bs.classList.remove('os-bs-out'); }, 190);
        } else bs.hidden = true;
        if (cfg.keepSelection) setTimeout(restoreSelection, 200);
    }

    function backstagePages() {
        return cfg.backstage.concat([{ id: 'settings', label: 'Settings', icon: 'gear', bottom: true, render: renderSettings }]);
    }

    function buildBackstage() {
        const bs = document.getElementById('os-backstage');
        const nav = bs.querySelector('.os-bs-nav');
        nav.innerHTML = '<button type="button" class="os-bs-back" data-bs="close">' + ico('chevLeft') + '<span>Back</span></button>';
        let addedGrow = false;
        backstagePages().forEach(function (p) {
            if (p.bottom && !addedGrow) { nav.appendChild(el('span', 'os-grow')); addedGrow = true; }
            const b = el('button', null, ico(p.icon) + '<span>' + esc(p.label) + '</span>');
            b.type = 'button';
            b.dataset.bs = p.id;
            nav.appendChild(b);
        });
        nav.addEventListener('click', function (e) {
            const b = e.target.closest('[data-bs]');
            if (!b) return;
            click(560);
            if (b.dataset.bs === 'close') closeBackstage();
            else {
                const p = backstagePages().find(function (x) { return x.id === b.dataset.bs; });
                if (p && p.action) { closeBackstage(); p.action(); }
                else showBackstagePage(b.dataset.bs);
            }
        });
        bs.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeBackstage(); } });
    }

    function showBackstagePage(id) {
        const bs = document.getElementById('os-backstage');
        bs.querySelectorAll('.os-bs-nav [data-bs]').forEach(function (b) { b.classList.toggle('on', b.dataset.bs === id); });
        const body = bs.querySelector('.os-bs-body');
        const p = backstagePages().find(function (x) { return x.id === id; });
        body.innerHTML = '';
        if (p && p.render) p.render(body, api);
        restartAnim(body, 'os-panel-in');
        const f = bs.querySelector('.os-bs-nav [data-bs="' + id + '"]');
        if (f) f.focus({ preventScroll: true });
    }

    // Big clickable cards for File pages!
    function bsCards(cards) {
        const box = el('div', 'os-bs-cards');
        cards.forEach(function (c) {
            const b = el('button', 'os-bs-card' + (c.cls ? ' ' + c.cls : ''), (c.preview || ico(c.icon || 'file')) + '<b>' + esc(c.label) + '</b>' + (c.hint ? '<span>' + esc(c.hint) + '</span>' : ''));
            b.type = 'button';
            b.addEventListener('click', function (e) {
                if (!c.stay) closeBackstage();
                run(c, e);
            });
            box.appendChild(b);
        });
        return box;
    }

    /* ---------- Layout switching + Settings ---------- */
    function layoutKey() { return cfg.key + '_layout'; }
    function prefsKey() { return cfg.key + '_office_prefs'; }

    function currentLayout() {
        return lsGet(layoutKey(), 'office') === 'classic' ? 'classic' : 'office';
    }

    function applyLayout(l) {
        const b = document.body;
        b.classList.toggle('os-office', l === 'office');
        b.classList.toggle('os-classic', l !== 'office');
        b.classList.toggle('os-dark', !!prefs.dark);
        b.classList.toggle('os-no-anim', !prefs.anim);
        b.classList.toggle('os-ribbon-min', !!prefs.ribbonMin);
        if (l === 'office') requestAnimationFrame(function () { moveInk(); sync(); });
    }

    function setLayout(l) {
        l = l === 'classic' ? 'classic' : 'office';
        if (currentLayout() === l && document.body.classList.contains(l === 'office' ? 'os-office' : 'os-classic')) {
            toast(l === 'office' ? 'Already in the ' + cfg.officeName + ' layout!' : 'Already in ' + cfg.app + ' Classic!');
            syncLayoutCards();
            return;
        }
        lsSet(layoutKey(), l);
        const swap = function () {
            closeMenu();
            const bs = document.getElementById('os-backstage');
            if (bs) bs.hidden = true;
            applyLayout(l);
            syncLayoutCards();
            try { if (cfg.onLayout) cfg.onLayout(l); } catch (e) { console.error(e); }
            window.dispatchEvent(new Event('resize'));
            toast(l === 'office' ? cfg.officeName + ' layout: ribbon, tabs and a status bar!' : (cfg.classicToast || cfg.app + ' Classic: the original glassy layout!'));
        };
        if (!animOn()) { swap(); return; }
        const cur = el('div', 'os-curtain', '<img src="' + esc(cfg.icon) + '" alt="">');
        document.body.appendChild(cur);
        requestAnimationFrame(function () { cur.classList.add('in'); });
        setTimeout(function () {
            swap();
            cur.classList.remove('in');
            cur.classList.add('out');
            setTimeout(function () { cur.remove(); }, 420);
        }, 230);
    }

    function thumbHTML(kind) {
        const k = cfg.kind || 'word';
        const inner = k === 'ppt'
            ? '<i class="lt-strip"></i><i class="lt-slide"></i>'
            : k === 'onenote' ? '<i class="lt-list"></i><i class="lt-note"></i>' : '<i class="lt-page"></i>';
        return '<div class="os-lay-thumb os-lt-' + kind + ' os-lt-' + k + '"><i class="lt-bar"></i><i class="lt-side"></i>' + inner + '<i class="lt-orb"></i></div>';
    }

    // Two cards: the Office layout and the original Classic layout!
    function layoutCards() {
        const box = el('div', 'os-lay-cards');
        [
            { id: 'office', name: cfg.officeName, hint: cfg.officeHint || ('A ribbon, tabs and a status bar, like ' + cfg.officeName + '!') },
            { id: 'classic', name: cfg.app + ' Classic', hint: cfg.classicHint || ('The original ' + cfg.app + ': glass sidebars, gel buttons and floating orbs!') }
        ].forEach(function (c) {
            const b = el('button', 'os-lay-card', thumbHTML(c.id) + '<b>' + esc(c.name) + '</b><span>' + esc(c.hint) + '</span>');
            b.type = 'button';
            b.dataset.layout = c.id;
            b.addEventListener('click', function () { click(620); setLayout(c.id); });
            box.appendChild(b);
        });
        setTimeout(syncLayoutCards, 0);
        return box;
    }

    function syncLayoutCards() {
        const l = currentLayout();
        document.querySelectorAll('.os-lay-card').forEach(function (b) { b.classList.toggle('on', b.dataset.layout === l); });
    }

    function optRow(label, hint, get, set) {
        const lab = el('label', 'os-opt');
        const cb = el('input');
        cb.type = 'checkbox';
        cb.checked = !!get();
        cb.addEventListener('change', function () { click(); set(cb.checked); });
        lab.appendChild(cb);
        lab.appendChild(el('span', null, '<b>' + esc(label) + '</b>' + (hint ? '<em>' + esc(hint) + '</em>' : '')));
        return lab;
    }

    function renderSettings(body) {
        body.appendChild(el('h1', null, 'Settings'));
        body.appendChild(el('h2', 'first', 'Layout'));
        body.appendChild(layoutCards());
        if (cfg.settings) cfg.settings(body, api);
        body.appendChild(el('h2', null, 'Ribbon'));
        const opts = el('div', 'os-opts');
        opts.appendChild(optRow('Dark ribbon', 'A dark title bar, ribbon and status bar!', function () { return prefs.dark; }, function (v) { prefs.dark = v; savePrefs(); applyLayout(currentLayout()); }));
        opts.appendChild(optRow('Ribbon animations', 'Sliding tab ink, popping menus and the layout swap curtain!', function () { return prefs.anim; }, function (v) { prefs.anim = v; savePrefs(); applyLayout(currentLayout()); }));
        opts.appendChild(optRow('Collapse the ribbon', 'Show just the tabs until you click one!', function () { return prefs.ribbonMin; }, function (v) { prefs.ribbonMin = v; savePrefs(); applyLayout(currentLayout()); }));
        body.appendChild(opts);
    }

    function savePrefs() { lsSet(prefsKey(), JSON.stringify(prefs)); }

    /* ---------- Command search ---------- */
    function wireSearch() {
        const inp = document.getElementById('os-search');
        const res = document.getElementById('os-search-res');
        let hits = [], idx = 0;
        const render = function () {
            const q = inp.value.trim().toLowerCase();
            if (!q) { res.hidden = true; return; }
            const extra = (cfg.searchExtra ? cfg.searchExtra(q) : []) || [];
            const pages = backstagePages().map(function (p) { return { label: p.label, icon: p.icon, where: 'File', it: { run: function () { if (p.action) p.action(); else openBackstage(p.id); } } }; });
            const all = commandIndex.concat(pages, [{ label: 'Switch to ' + cfg.app + ' Classic layout', icon: 'layout', where: 'Settings', it: { run: function () { setLayout('classic'); } } }]);
            hits = extra.concat(all.filter(function (c) { return c.label.toLowerCase().indexOf(q) !== -1 || (c.where || '').toLowerCase() === q; })).slice(0, 12);
            idx = 0;
            res.innerHTML = hits.length ? hits.map(function (h, i) {
                return '<button type="button" class="os-mitem' + (i === 0 ? ' kb' : '') + '" data-i="' + i + '"><span class="os-mico">' + ico(h.icon) + '</span><span class="os-mlabel">' + esc(h.label) + '<small>' + esc(h.where || '') + '</small></span></button>';
            }).join('') : '<div class="os-mhead">No matches!</div>';
            res.hidden = false;
        };
        const go = function (i) {
            const h = hits[i];
            if (!h) return;
            inp.value = '';
            res.hidden = true;
            inp.blur();
            run(h.it);
        };
        inp.addEventListener('input', render);
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!hits.length) return;
                idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
                res.querySelectorAll('.os-mitem').forEach(function (b, i) { b.classList.toggle('kb', i === idx); });
            } else if (e.key === 'Enter') { e.preventDefault(); go(idx); }
            else if (e.key === 'Escape') { inp.value = ''; res.hidden = true; inp.blur(); restoreSelection(); }
        });
        res.addEventListener('mousedown', function (e) { e.preventDefault(); });
        res.addEventListener('click', function (e) {
            const b = e.target.closest('[data-i]');
            if (b) go(+b.dataset.i);
        });
        inp.addEventListener('blur', function () { setTimeout(function () { res.hidden = true; }, 150); });
    }

    /* ---------- Build the chrome ---------- */
    function buildChrome() {
        const top = el('header', null);
        top.id = 'os-top';
        top.innerHTML =
            '<div id="os-title">' +
                '<div class="os-tl"><img class="os-logo" src="' + esc(cfg.icon) + '" alt=""><div class="os-qat"></div><span class="os-brand">' + esc(cfg.app) + '</span></div>' +
                '<div class="os-tc"><input id="os-docname" spellcheck="false" aria-label="Name"><span id="os-saved" class="os-saved">Saved</span></div>' +
                '<div class="os-tr"><div class="os-search">' + ico('search') + '<input id="os-search" placeholder="Search for tools and help (⌘K)" spellcheck="false" autocomplete="off"><div id="os-search-res" class="os-menu os-search-res" hidden></div></div>' +
                '<button type="button" class="os-qbtn" data-os="layout" title="Layout: ' + esc(cfg.officeName) + ' or ' + esc(cfg.app) + ' Classic">' + ico('layout') + '</button>' +
                '<button type="button" class="os-qbtn" data-os="settings" title="Settings">' + ico('gear') + '</button></div>' +
            '</div>' +
            '<nav id="os-tabs" role="tablist"><button type="button" class="os-tab os-file">File</button><span id="os-ink"></span>' +
                '<button type="button" id="os-collapse" title="Collapse the ribbon">' + ico('chevUp') + '</button></nav>' +
            '<section id="os-ribbon"></section>';
        document.body.insertBefore(top, document.body.firstChild);

        const qat = top.querySelector('.os-qat');
        (cfg.qat || []).forEach(function (q) {
            const b = el('button', 'os-qbtn', ico(q.icon));
            b.type = 'button';
            b.title = q.title || q.label;
            b.addEventListener('click', function (e) { run(q, e); restartAnim(b, 'os-pop'); });
            qat.appendChild(b);
            controls.push({ it: q, el: b });
        });

        const status = el('footer', null, '<div id="os-status-l"></div><span class="os-grow"></span><div id="os-views"></div><div class="os-zoom-box"></div>');
        status.id = 'os-status';
        document.body.appendChild(status);
        const views = status.querySelector('#os-views');
        (cfg.views || []).forEach(function (v) {
            const b = el('button', 'os-view-btn', ico(v.icon));
            b.type = 'button';
            b.title = v.title;
            b.addEventListener('click', function (e) { run(v, e); });
            views.appendChild(b);
        });
        if (cfg.zoom) {
            const z = cfg.zoom;
            const zb = status.querySelector('.os-zoom-box');
            zb.innerHTML = '<button type="button" class="os-zbtn" data-z="-" title="Zoom Out">−</button><input type="range" id="os-zoom" min="' + (z.min || 50) + '" max="' + (z.max || 200) + '" step="10" value="100" aria-label="Zoom"><button type="button" class="os-zbtn" data-z="+" title="Zoom In">+</button><button type="button" id="os-zoom-lab" title="Reset zoom to 100%">100%</button>';
            const sl = zb.querySelector('#os-zoom');
            sl.addEventListener('input', function () { z.set(+sl.value / 100); updateStatus(); });
            zb.addEventListener('click', function (e) {
                const b = e.target.closest('button');
                if (!b) return;
                const cur = Math.round(z.get() * 100);
                if (b.dataset.z === '-') z.set(Math.max(z.min || 50, cur - 10) / 100);
                else if (b.dataset.z === '+') z.set(Math.min(z.max || 200, cur + 10) / 100);
                else z.set(1);
                updateStatus();
            });
        }

        const bs = el('div', null, '<nav class="os-bs-nav"></nav><div class="os-bs-body"></div>');
        bs.id = 'os-backstage';
        bs.hidden = true;
        document.body.appendChild(bs);

        const t = el('div');
        t.id = 'os-toast';
        document.body.appendChild(t);
    }

    function wireChrome() {
        const tabs = document.getElementById('os-tabs');
        tabs.addEventListener('click', function (e) {
            const t = e.target.closest('.os-tab');
            if (!t) return;
            click(520);
            if (t.classList.contains('os-file')) { openBackstage(); return; }
            showTab(t.dataset.tab);
        });
        tabs.addEventListener('dblclick', function (e) {
            if (!e.target.closest('.os-tab:not(.os-file)')) return;
            prefs.ribbonMin = !prefs.ribbonMin;
            savePrefs();
            document.body.classList.remove('os-ribbon-peek');
            applyLayout(currentLayout());
        });
        document.getElementById('os-collapse').addEventListener('click', function () {
            prefs.ribbonMin = !prefs.ribbonMin;
            savePrefs();
            document.body.classList.remove('os-ribbon-peek');
            applyLayout(currentLayout());
            click(480);
        });
        document.querySelector('#os-title').addEventListener('click', function (e) {
            const b = e.target.closest('[data-os]');
            if (!b) return;
            if (b.dataset.os === 'settings') openBackstage('settings');
            else if (b.dataset.os === 'layout') {
                openMenu(b, [
                    { label: cfg.officeName, icon: 'layout', checked: currentLayout() === 'office', run: function () { setLayout('office'); } },
                    { label: cfg.app + ' Classic', icon: 'sparkle', checked: currentLayout() === 'classic', run: function () { setLayout('classic'); } },
                    { sep: true },
                    { label: 'Settings…', icon: 'gear', run: function () { openBackstage('settings'); } }
                ]);
            }
        });
        const dn = document.getElementById('os-docname');
        dn.addEventListener('change', function () {
            if (cfg.rename) { try { cfg.rename(dn.value.trim() || 'Untitled'); } catch (e) { console.error(e); } }
            queueSync();
        });
        dn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Escape') { dn.value = cfg.title(); } dn.blur(); restoreSelection(); }
        });
        if (!cfg.rename) dn.readOnly = true;

        // Ribbon clicks never steal the editor's focus/selection (inputs still can)!
        document.getElementById('os-top').addEventListener('mousedown', function (e) {
            if (e.target.closest('input, select, textarea, label.os-check')) return;
            if (e.target.closest('button')) e.preventDefault();
        });
        document.addEventListener('mousedown', function (e) {
            if (menuEl && !menuEl.contains(e.target) && !(menuAnchor && menuAnchor.contains(e.target))) closeMenu();
            if (document.body.classList.contains('os-ribbon-peek') && !e.target.closest('#os-top') && !e.target.closest('.os-menu')) document.body.classList.remove('os-ribbon-peek');
        }, true);
        document.addEventListener('mousedown', function (e) {
            if (menuEl && menuEl.contains(e.target) && e.target.closest('button')) e.preventDefault();
        });
        document.addEventListener('keydown', function (e) {
            if (!isOffice()) return;
            if (e.key === 'Escape' && menuEl) { e.preventDefault(); e.stopPropagation(); closeMenu(); restoreSelection(); return; }
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                document.getElementById('os-search').focus();
            }
        }, true);
        document.addEventListener('selectionchange', trackSelection);
        window.addEventListener('resize', function () { moveInk(); closeMenu(); });
        wireSearch();
    }

    function init(config) {
        cfg = config;
        try { Object.assign(prefs, JSON.parse(lsGet(prefsKey(), '{}')) || {}); } catch (e) {}
        const root = document.documentElement.style;
        const th = cfg.theme || {};
        Object.keys(th).forEach(function (k) { root.setProperty('--os-' + k, th[k]); });
        document.body.classList.add('os-app-' + (cfg.kind || 'word'));
        buildChrome();
        buildRibbon();
        buildBackstage();
        wireChrome();
        applyLayout(currentLayout());
        try { if (cfg.onLayout) cfg.onLayout(currentLayout()); } catch (e) { console.error(e); }
        updateTitle();
        updateStatus();
        setInterval(function () { if (isOffice() && !document.hidden) updateStatus(); }, 1500);
    }

    const api = {
        init: init,
        ico: ico,
        icons: ICONS,
        esc: esc,
        toast: toast,
        dialog: dialog,
        prompt: prompt,
        confirm: confirmBox,
        openMenu: openMenu,
        closeMenu: closeMenu,
        openBackstage: openBackstage,
        closeBackstage: closeBackstage,
        bsCards: bsCards,
        layoutCards: layoutCards,
        syncLayoutCards: syncLayoutCards,
        setLayout: setLayout,
        layout: currentLayout,
        isOffice: isOffice,
        sync: queueSync,
        showTab: showTab,
        flashSaved: flashSaved,
        restoreSelection: restoreSelection,
        rebuild: function () { buildRibbon(); queueSync(); },
        optRow: optRow,
        el: el,
        prefs: function () { return prefs; }
    };
    window.OfficeShell = api;
})();
