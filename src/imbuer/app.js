// Imbuer — Radii Office's spreadsheet!
// app.js: Keydown text styles, the workbook model, the grid, selection (with
// its animations), editing, keyboard, clipboard, fill handle, moving and undo!
// ribbon.js builds the Excel-style ribbon, menus, dialogs and every feature
// panel on top of the globals defined here!

// ==========================================
// AERO AUDIO SOUND EFFECTS SYNTHESIZER
// ==========================================
function playAeroClickSound(frequency = 600, duration = 0.08) {
    try {
        if (typeof prefs !== 'undefined' && prefs && !prefs.sound) return;
        const ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!window.audioCtx) window.audioCtx = ctx;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {}
}

const keydownDefinitions = [
    { open: '=Y=',  close: '=Y=',  className: 'gel-orb gel-y' },
    { open: '=R=',  close: '=R=',  className: 'gel-orb gel-r' },
    { open: '=G=',  close: '=G=',  className: 'gel-orb gel-g' },
    { open: '=C=',  close: '=C=',  className: 'gel-orb gel-c' },
    { open: '=B=',  close: '=B=',  className: 'gel-orb gel-b' },
    { open: '&&',   close: '&&',   className: 'spark-text' },
    { open: '~G~',  close: '~G~',  className: 'gel-green-flash' },
    { open: '~U~',  close: '~U~',  className: 'liquid-underline' },
    { open: '~B~',  close: '~B~',  className: 'glossy-border-badge' },
    { open: '~S~',  close: '~S~',  className: 'cyber-glow-spark' },
    { open: '~L~',  close: '~L~',  className: 'liquid-text-glow' },
    { open: '~E~',  close: '~E~',  className: 'embossed-glass-text' },
    { open: '~WD~', close: '~WD~', className: 'gel-chip-waterdrop' },
    { open: '~AW~', close: '~AW~', className: 'gel-chip-aurorawave' },
    { open: '~SF~', close: '~SF~', className: 'gel-chip-solarflare' },
    { open: '!#A#', close: '#',    className: 'aero-tag-chip tag-chip-a' },
    { open: '!#G#', close: '#',    className: 'aero-tag-chip tag-chip-g' },
    { open: '!#O#', close: '#',    className: 'aero-tag-chip tag-chip-o' },
    { open: '#C#',  close: '#',    className: 'gel-bubble-chip gel-chip-cyan' },
    { open: '#O#',  close: '#',    className: 'gel-bubble-chip gel-chip-orange' },
    { open: '#G#',  close: '#',    className: 'gel-bubble-chip gel-chip-green' },
    { open: '~MP~', close: '~MP~', className: 'effect-mercury-pearl' },
    { open: '~CB~', close: '~CB~', className: 'effect-screen-cavity' },
    { open: '~DS~', close: '~DS~', className: 'effect-drop-shadow-window' },
    { open: '~GL~', close: '~GL~', className: 'effect-glow-tube' },
    { open: '~PM~', close: '~PM~', className: 'effect-plasma-gel' },
    { open: '=V=',  close: '=V=',  className: 'gel-orb gel-v' },
    { open: '=P=',  close: '=P=',  className: 'gel-orb gel-p' },
    { open: '=O=',  close: '=O=',  className: 'gel-orb gel-o' },
    { open: '=MG=', close: '=MG=', className: 'gel-orb gel-mg' },
    { open: '=LM=', close: '=LM=', className: 'gel-orb gel-lm' },
    { open: '=AQ=', close: '=AQ=', className: 'gel-orb gel-aq' },
    { open: '=SL=', close: '=SL=', className: 'gel-orb gel-sl' },
    { open: '!#R#', close: '#',    className: 'aero-tag-chip tag-chip-r' },
    { open: '!#PR#', close: '#',   className: 'aero-tag-chip tag-chip-pr' },
    { open: '!#PK#', close: '#',   className: 'aero-tag-chip tag-chip-pk' },
    { open: '!#Y#', close: '#',    className: 'aero-tag-chip tag-chip-y' },
    { open: '!#SL#', close: '#',   className: 'aero-tag-chip tag-chip-sl' },
    { open: '#R#',  close: '#',    className: 'gel-bubble-chip gel-chip-red' },
    { open: '#PR#', close: '#',    className: 'gel-bubble-chip gel-chip-purple' },
    { open: '#PK#', close: '#',    className: 'gel-bubble-chip gel-chip-pink' },
    { open: '#Y#',  close: '#',    className: 'gel-bubble-chip gel-chip-yellow' },
    { open: '#B#',  close: '#',    className: 'gel-bubble-chip gel-chip-blue' },
    { open: '#L#',  close: '#',    className: 'gel-bubble-chip gel-chip-lime' },
    { open: '#T#',  close: '#',    className: 'gel-bubble-chip gel-chip-teal' },
    { open: '#GL#', close: '#',    className: 'gel-bubble-chip gel-chip-gold' },
    { open: '#SL#', close: '#',    className: 'gel-bubble-chip gel-chip-slate' },
    { open: '#W#',  close: '#',    className: 'gel-bubble-chip gel-chip-white' },
    { open: '#BK#', close: '#',    className: 'gel-bubble-chip gel-chip-black' },
    { open: '#FG#', close: '#',    className: 'gel-bubble-chip gel-chip-fog' },
    { open: '#TU#', close: '#',    className: 'gel-bubble-chip gel-chip-turquoise' },
    { open: '~SM~', close: '~SM~', className: 'applet-glass-stamp' },
    { open: '~PG~', close: '~PG~', className: 'effect-prism-refract' },
    { open: '~SR~', close: '~SR~', className: 'effect-sunlight-ray' },
    { open: '~OA~', close: '~OA~', className: 'effect-abyssal-plate' },
    { open: '~MM~', close: '~MM~', className: 'effect-metallic-mesh' },
    { open: '~FE~', close: '~FE~', className: 'effect-fluid-expand' },
    { open: '~MR~', close: '~MR~', className: 'effect-metric-cavity' },
    { open: '~PO~', close: '~PO~', className: 'effect-pearl-orb' },
    { open: '~LF~', close: '~LF~', className: 'effect-lens-flare' },
    { open: '~HB~', close: '~HB~', className: 'effect-hardware-bevel' },
    { open: '~IS~', close: '~IS~', className: 'effect-screen-segment' },
    { open: '~GC~', close: '~GC~', className: 'effect-gel-capsule' },
    { open: '~KO~', close: '~KO~', className: 'effect-fluid-orbit' },
    { open: '~XG~', close: '~XG~', className: 'effect-xray-glass' },
    { open: '~WL~', close: '~WL~', className: 'effect-waveform-line' },
    { open: '~WB~', close: '~WB~', className: 'effect-water-bubble' },
    { open: '~GLO~', close: '~GLO~', className: 'effect-glow-tracer' },
    { open: '~ST~', close: '~ST~', className: 'effect-shimmer-title' },
    { open: '~TL~', close: '~TL~', className: 'effect-tinted-lens' },
    { open: '~SL~', close: '~SL~', className: 'effect-audio-stream-loop' },
    { open: '~BG~', close: '~BG~', className: 'effect-biogel-capsule' },
    { open: '~FT~', close: '~FT~', className: 'jr-folder-tab' },
    { open: '~MC~', close: '~MC~', className: 'jr-digital-counter' },
    { open: '~WR~', close: '~WR~', className: 'effect-neon-ribbon' },
    { open: '~WD-Y~', close: '~',  className: 'droplet-amber' },
    { open: '~WD-R~', close: '~',  className: 'droplet-crimson' },
    { open: '~WD-PK~', close: '~', className: 'droplet-fuchsia' },
    { open: '~WD-PR~', close: '~', className: 'droplet-amethyst' },
    { open: '~WD-O~', close: '~',  className: 'droplet-tangerine' },
    { open: '~WD-SL~', close: '~', className: 'droplet-slate' },
    { open: '~FUNC~', close: '~FUNC~', className: 'dev-chip-function' },
    { open: '~VAR~', close: '~VAR~', className: 'dev-chip-variable' },
    { open: '~STR~', close: '~STR~', className: 'dev-chip-string' },
    { open: '~RS~', close: '~RS~', className: 'av-chip-radar-sweep' },
    { open: '~HD~', close: '~HD~', className: 'av-chip-heading' },
    { open: '~AL~', close: '~AL~', className: 'av-chip-altimeter' },
    { open: '~PP-C~', close: '~',  className: 'megachip-plasma plasma-cyan' },
    { open: '~PP-O~', close: '~',  className: 'megachip-plasma plasma-orange' },
    { open: '~PP-R~', close: '~',  className: 'megachip-plasma plasma-crimson' },
    { open: '~PP-L~', close: '~',  className: 'megachip-plasma plasma-lime' },
    { open: '~GB-B~', close: '~',  className: 'megachip-glass-bracket bracket-blue' },
    { open: '~GB-PR~', close: '~', className: 'megachip-glass-bracket bracket-amethyst' },
    { open: '~GB-PK~', close: '~', className: 'megachip-glass-bracket bracket-fuchsia' },
    { open: '~GB-Y~', close: '~',  className: 'megachip-glass-bracket bracket-amber' },
    { open: '~B-B~', close: '~',   className: 'aero-glass-badge-chip badge-frame-sky' },
    { open: '~B-G~', close: '~',   className: 'aero-glass-badge-chip badge-frame-emerald' },
    { open: '~B-O~', close: '~',   className: 'aero-glass-badge-chip badge-frame-orange' },
    { open: '~B-R~', close: '~',   className: 'aero-glass-badge-chip badge-frame-crimson' },
    { open: '~B-PR~', close: '~',  className: 'aero-glass-badge-chip badge-frame-amethyst' },
    { open: '~B-Y~', close: '~',   className: 'aero-glass-badge-chip badge-frame-gold' },
    { open: '~SH-B~', close: '~',  className: 'gel-chip-swayed swayed-sky' },
    { open: '~SH-G~', close: '~',  className: 'gel-chip-swayed swayed-emerald' },
    { open: '~SH-O~', close: '~',  className: 'gel-chip-swayed swayed-orange' },
    { open: '~SH-PR~', close: '~', className: 'gel-chip-swayed swayed-amethyst' },
    { open: '~PH-B~', close: '~',  className: 'gel-chip-pill-variant pill-sky' },
    { open: '~PH-G~', close: '~',  className: 'gel-chip-pill-variant pill-emerald' },
    { open: '~PH-O~', close: '~',  className: 'gel-chip-pill-variant pill-orange' },
    { open: '~PH-PR~', close: '~', className: 'gel-chip-pill-variant pill-amethyst' },
    { open: '~PC-Y~', close: '~',  className: 'gel-chip-pastel pastel-yellow' },
    { open: '~PC-B~', close: '~',  className: 'gel-chip-pastel pastel-blue' },
    { open: '~PC-G~', close: '~',  className: 'gel-chip-pastel pastel-green' },
    { open: '~PC-PK~', close: '~', className: 'gel-chip-pastel pastel-pink' },
    { open: '~PC-PR~', close: '~', className: 'gel-chip-pastel pastel-purple' },
    { open: '~PC-O~', close: '~',  className: 'gel-chip-pastel pastel-orange' },
    { open: '~DR-O~', close: '~',  className: 'gel-chip-droplet-ribbon droplet-ribbon-tangerine' },
    { open: '~DR-Y~', close: '~',  className: 'gel-chip-droplet-ribbon droplet-ribbon-citrus' },
    { open: '~DR-G~', close: '~',  className: 'gel-chip-droplet-ribbon droplet-ribbon-emerald' },
    { open: '~DR-B~', close: '~',  className: 'gel-chip-droplet-ribbon droplet-ribbon-sapphire' },
    { open: '~DR-PR~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-amethyst' },
    { open: '~DR-PK~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-fuchsia' },
    { open: '~DR-R~', close: '~',  className: 'gel-chip-droplet-ribbon droplet-ribbon-crimson' },
    { open: '~DR-SL~', close: '~', className: 'gel-chip-droplet-ribbon droplet-ribbon-slate' },
    { open: '~H1~',  close: '~H1~',  className: 'header-1' },
    { open: '~H2~',  close: '~H2~',  className: 'header-2' },
    { open: '~H3~',  close: '~H3~',  className: 'header-3' },
    { open: '~BQ~',  close: '~BQ~',  className: 'blockquote-list' },
    { open: '~MH~',  close: '~MH~',  className: 'mega-header' },
    { open: '`',    close: '`',    tagName: 'code' },
    { open: '**',   close: '**',   tagName: 'strong' },
    { open: '*',    close: '*',    tagName: 'em' },
    { open: '~OL~',     close: '~OL~',     className: 'mkt-outline-glow' },
    { open: '~OLM~',    close: '~OLM~',    className: 'mkt-ol-magenta' },
    { open: '~OLV~',    close: '~OLV~',    className: 'mkt-ol-violet' },
    { open: '~OLE~',    close: '~OLE~',    className: 'mkt-ol-emerald' },
    { open: '~OLA~',    close: '~OLA~',    className: 'mkt-ol-amber' },
    { open: '~OLR~',    close: '~OLR~',    className: 'mkt-ol-rose' },
    { open: '~SUN~',    close: '~SUN~',    className: 'mkt-kp-sunset' },
    { open: '~FOAM~',   close: '~FOAM~',   className: 'mkt-kp-foam' },
    { open: '~GRAPE~',  close: '~GRAPE~',  className: 'mkt-kp-grape' },
    { open: '~MATCHA~', close: '~MATCHA~', className: 'mkt-kp-matcha' },
    { open: '~GUM~',    close: '~GUM~',    className: 'mkt-kp-gum' },
    { open: '~LEMON~',  close: '~LEMON~',  className: 'mkt-kp-lemon' },
    { open: '~NIGHT~',  close: '~NIGHT~',  className: 'mkt-kp-night' },
    { open: '~CANDY~',  close: '~CANDY~',  className: 'mkt-kp-candy' },
    { open: '~LAVA~',   close: '~LAVA~',   className: 'mkt-kp-lava' },
    { open: '~FROST~',  close: '~FROST~',  className: 'mkt-kp-frost' },
    { open: '~GOLD~',   close: '~GOLD~',   className: 'mkt-kp-gold' },
    { open: '~MINT~',   close: '~MINT~',   className: 'mkt-kp-mint' },
    { open: '~UV~',     close: '~UV~',     className: 'mkt-kp-uv' },
    { open: '~KEY~',    close: '~KEY~',    className: 'mkt-kp-key' },
    { open: '~STICK~',  close: '~STICK~',  className: 'mkt-kp-stick' },
    { open: '~OR1~',    close: '~OR1~',    className: 'orange-hl-1' },
    { open: '~OR2~',    close: '~OR2~',    className: 'orange-hl-2' },
    { open: '~OR3~',    close: '~OR3~',    className: 'orange-hl-3' },
    { open: '~OR4~',    close: '~OR4~',    className: 'orange-hl-4' },
    { open: '~OR5~',    close: '~OR5~',    className: 'orange-hl-5' },
    { open: '~OR6~',    close: '~OR6~',    className: 'orange-hl-6' },
    { open: '~OR7~',    close: '~OR7~',    className: 'orange-hl-7' },
    { open: '~OR8~',    close: '~OR8~',    className: 'orange-hl-8' },
    { open: '~OR9~',    close: '~OR9~',    className: 'orange-hl-9' },
    { open: '~OR10~',   close: '~OR10~',   className: 'orange-hl-10' },
    { open: '~OR11~',   close: '~OR11~',   className: 'orange-hl-11' },
    { open: '~OR12~',   close: '~OR12~',   className: 'orange-hl-12' },
    { open: '~OR13~',   close: '~OR13~',   className: 'orange-hl-13' },
    { open: '~OR14~',   close: '~OR14~',   className: 'orange-hl-14' },
    { open: '~OR15~',   close: '~OR15~',   className: 'orange-hl-15' },
    { open: '~OR16~',   close: '~OR16~',   className: 'orange-hl-16' },
    { open: '~OR17~',   close: '~OR17~',   className: 'orange-hl-17' },
    { open: '~OR18~',   close: '~OR18~',   className: 'orange-hl-18' },
    { open: '~OR19~',   close: '~OR19~',   className: 'orange-hl-19' },
    { open: '~OR20~',   close: '~OR20~',   className: 'orange-hl-20' },
    { open: '~OR21~',   close: '~OR21~',   className: 'orange-hl-21' },
    { open: '~OR22~',   close: '~OR22~',   className: 'orange-hl-22' },
    { open: '~OR23~',   close: '~OR23~',   className: 'orange-hl-23' },
    { open: '~OR24~',   close: '~OR24~',   className: 'orange-hl-24' },
    { open: '~OR25~',   close: '~OR25~',   className: 'orange-hl-25' },
    { open: '~OR26~',   close: '~OR26~',   className: 'orange-hl-26' },
    { open: '~OR27~',   close: '~OR27~',   className: 'orange-hl-27' },
    { open: '~OR28~',   close: '~OR28~',   className: 'orange-hl-28' },
    { open: '~OR29~',   close: '~OR29~',   className: 'orange-hl-29' },
    { open: '~OR30~',   close: '~OR30~',   className: 'orange-hl-30' },
    { open: '~OR31~',   close: '~OR31~',   className: 'orange-hl-31' },
    { open: '~OR32~',   close: '~OR32~',   className: 'orange-hl-32' },
    { open: '~OR33~',   close: '~OR33~',   className: 'orange-hl-33' },
    { open: '~OR34~',   close: '~OR34~',   className: 'orange-hl-34' },
    { open: '~OR35~',   close: '~OR35~',   className: 'orange-hl-35' },
    { open: '~OR36~',   close: '~OR36~',   className: 'orange-hl-36' },
    { open: '~OR37~',   close: '~OR37~',   className: 'orange-hl-37' },
    { open: '~OR38~',   close: '~OR38~',   className: 'orange-hl-38' },
    { open: '~OR39~',   close: '~OR39~',   className: 'orange-hl-39' },
    { open: '~OR40~',   close: '~OR40~',   className: 'orange-hl-40' },
    { open: '~OR41~',   close: '~OR41~',   className: 'orange-hl-41' },
    { open: '~OR42~',   close: '~OR42~',   className: 'orange-hl-42' },
    { open: '~OR43~',   close: '~OR43~',   className: 'orange-hl-43' },
    { open: '~OR44~',   close: '~OR44~',   className: 'orange-hl-44' },
    { open: '~OR45~',   close: '~OR45~',   className: 'orange-hl-45' },
    { open: '~OR46~',   close: '~OR46~',   className: 'orange-hl-46' },
    { open: '~OR47~',   close: '~OR47~',   className: 'orange-hl-47' },
    { open: '~OR48~',   close: '~OR48~',   className: 'orange-hl-48' },
    { open: '~OR49~',   close: '~OR49~',   className: 'orange-hl-49' },
    { open: '~OR50~',   close: '~OR50~',   className: 'orange-hl-50' },
    { open: '~GR1~',    close: '~GR1~',    className: 'green-hl-1' },
    { open: '~GR2~',    close: '~GR2~',    className: 'green-hl-2' },
    { open: '~GR3~',    close: '~GR3~',    className: 'green-hl-3' },
    { open: '~GR4~',    close: '~GR4~',    className: 'green-hl-4' },
    { open: '~GR5~',    close: '~GR5~',    className: 'green-hl-5' },
    { open: '~GR6~',    close: '~GR6~',    className: 'green-hl-6' },
    { open: '~GR7~',    close: '~GR7~',    className: 'green-hl-7' },
    { open: '~GR8~',    close: '~GR8~',    className: 'green-hl-8' },
    { open: '~GR9~',    close: '~GR9~',    className: 'green-hl-9' },
    { open: '~GR10~',   close: '~GR10~',   className: 'green-hl-10' },
    { open: '~GR11~',   close: '~GR11~',   className: 'green-hl-11' },
    { open: '~GR12~',   close: '~GR12~',   className: 'green-hl-12' },
    { open: '~GR13~',   close: '~GR13~',   className: 'green-hl-13' },
    { open: '~GR14~',   close: '~GR14~',   className: 'green-hl-14' },
    { open: '~GR15~',   close: '~GR15~',   className: 'green-hl-15' },
    { open: '~GR16~',   close: '~GR16~',   className: 'green-hl-16' },
    { open: '~GR17~',   close: '~GR17~',   className: 'green-hl-17' },
    { open: '~GR18~',   close: '~GR18~',   className: 'green-hl-18' },
    { open: '~GR19~',   close: '~GR19~',   className: 'green-hl-19' },
    { open: '~GR20~',   close: '~GR20~',   className: 'green-hl-20' },
    { open: '~GR21~',   close: '~GR21~',   className: 'green-hl-21' },
    { open: '~GR22~',   close: '~GR22~',   className: 'green-hl-22' },
    { open: '~GR23~',   close: '~GR23~',   className: 'green-hl-23' },
    { open: '~GR24~',   close: '~GR24~',   className: 'green-hl-24' },
    { open: '~GR25~',   close: '~GR25~',   className: 'green-hl-25' },
    { open: '~GR26~',   close: '~GR26~',   className: 'green-hl-26' },
    { open: '~GR27~',   close: '~GR27~',   className: 'green-hl-27' },
    { open: '~GR28~',   close: '~GR28~',   className: 'green-hl-28' },
    { open: '~GR29~',   close: '~GR29~',   className: 'green-hl-29' },
    { open: '~GR30~',   close: '~GR30~',   className: 'green-hl-30' },
    { open: '~GR31~',   close: '~GR31~',   className: 'green-hl-31' },
    { open: '~GR32~',   close: '~GR32~',   className: 'green-hl-32' },
    { open: '~GR33~',   close: '~GR33~',   className: 'green-hl-33' },
    { open: '~GR34~',   close: '~GR34~',   className: 'green-hl-34' },
    { open: '~GR35~',   close: '~GR35~',   className: 'green-hl-35' },
    { open: '~GR36~',   close: '~GR36~',   className: 'green-hl-36' },
    { open: '~GR37~',   close: '~GR37~',   className: 'green-hl-37' },
    { open: '~GR38~',   close: '~GR38~',   className: 'green-hl-38' },
    { open: '~GR39~',   close: '~GR39~',   className: 'green-hl-39' },
    { open: '~GR40~',   close: '~GR40~',   className: 'green-hl-40' },
    { open: '~GR41~',   close: '~GR41~',   className: 'green-hl-41' },
    { open: '~GR42~',   close: '~GR42~',   className: 'green-hl-42' },
    { open: '~GR43~',   close: '~GR43~',   className: 'green-hl-43' },
    { open: '~GR44~',   close: '~GR44~',   className: 'green-hl-44' },
    { open: '~GR45~',   close: '~GR45~',   className: 'green-hl-45' },
    { open: '~GR46~',   close: '~GR46~',   className: 'green-hl-46' },
    { open: '~GR47~',   close: '~GR47~',   className: 'green-hl-47' },
    { open: '~GR48~',   close: '~GR48~',   className: 'green-hl-48' },
    { open: '~GR49~',   close: '~GR49~',   className: 'green-hl-49' },
    { open: '~GR50~',   close: '~GR50~',   className: 'green-hl-50' },
    { open: '~BL1~',    close: '~BL1~',    className: 'blue-hl-1' },
    { open: '~BL2~',    close: '~BL2~',    className: 'blue-hl-2' },
    { open: '~BL3~',    close: '~BL3~',    className: 'blue-hl-3' },
    { open: '~BL4~',    close: '~BL4~',    className: 'blue-hl-4' },
    { open: '~BL5~',    close: '~BL5~',    className: 'blue-hl-5' },
    { open: '~BL6~',    close: '~BL6~',    className: 'blue-hl-6' },
    { open: '~BL7~',    close: '~BL7~',    className: 'blue-hl-7' },
    { open: '~BL8~',    close: '~BL8~',    className: 'blue-hl-8' },
    { open: '~BL9~',    close: '~BL9~',    className: 'blue-hl-9' },
    { open: '~BL10~',   close: '~BL10~',   className: 'blue-hl-10' },
    { open: '~BL11~',   close: '~BL11~',   className: 'blue-hl-11' },
    { open: '~BL12~',   close: '~BL12~',   className: 'blue-hl-12' },
    { open: '~BL13~',   close: '~BL13~',   className: 'blue-hl-13' },
    { open: '~BL14~',   close: '~BL14~',   className: 'blue-hl-14' },
    { open: '~BL15~',   close: '~BL15~',   className: 'blue-hl-15' },
    { open: '~BL16~',   close: '~BL16~',   className: 'blue-hl-16' },
    { open: '~BL17~',   close: '~BL17~',   className: 'blue-hl-17' },
    { open: '~BL18~',   close: '~BL18~',   className: 'blue-hl-18' },
    { open: '~BL19~',   close: '~BL19~',   className: 'blue-hl-19' },
    { open: '~BL20~',   close: '~BL20~',   className: 'blue-hl-20' },
    { open: '~BL21~',   close: '~BL21~',   className: 'blue-hl-21' },
    { open: '~BL22~',   close: '~BL22~',   className: 'blue-hl-22' },
    { open: '~BL23~',   close: '~BL23~',   className: 'blue-hl-23' },
    { open: '~BL24~',   close: '~BL24~',   className: 'blue-hl-24' },
    { open: '~BL25~',   close: '~BL25~',   className: 'blue-hl-25' },
    { open: '~BL26~',   close: '~BL26~',   className: 'blue-hl-26' },
    { open: '~BL27~',   close: '~BL27~',   className: 'blue-hl-27' },
    { open: '~BL28~',   close: '~BL28~',   className: 'blue-hl-28' },
    { open: '~BL29~',   close: '~BL29~',   className: 'blue-hl-29' },
    { open: '~BL30~',   close: '~BL30~',   className: 'blue-hl-30' },
    { open: '~BL31~',   close: '~BL31~',   className: 'blue-hl-31' },
    { open: '~BL32~',   close: '~BL32~',   className: 'blue-hl-32' },
    { open: '~BL33~',   close: '~BL33~',   className: 'blue-hl-33' },
    { open: '~BL34~',   close: '~BL34~',   className: 'blue-hl-34' },
    { open: '~BL35~',   close: '~BL35~',   className: 'blue-hl-35' },
    { open: '~BL36~',   close: '~BL36~',   className: 'blue-hl-36' },
    { open: '~BL37~',   close: '~BL37~',   className: 'blue-hl-37' },
    { open: '~BL38~',   close: '~BL38~',   className: 'blue-hl-38' },
    { open: '~BL39~',   close: '~BL39~',   className: 'blue-hl-39' },
    { open: '~BL40~',   close: '~BL40~',   className: 'blue-hl-40' },
    { open: '~BL41~',   close: '~BL41~',   className: 'blue-hl-41' },
    { open: '~BL42~',   close: '~BL42~',   className: 'blue-hl-42' },
    { open: '~BL43~',   close: '~BL43~',   className: 'blue-hl-43' },
    { open: '~BL44~',   close: '~BL44~',   className: 'blue-hl-44' },
    { open: '~BL45~',   close: '~BL45~',   className: 'blue-hl-45' },
    { open: '~BL46~',   close: '~BL46~',   className: 'blue-hl-46' },
    { open: '~BL47~',   close: '~BL47~',   className: 'blue-hl-47' },
    { open: '~BL48~',   close: '~BL48~',   className: 'blue-hl-48' },
    { open: '~BL49~',   close: '~BL49~',   className: 'blue-hl-49' },
    { open: '~BL50~',   close: '~BL50~',   className: 'blue-hl-50' },
    { open: '~PU1~',    close: '~PU1~',    className: 'pool-hl-1' },
    { open: '~PU2~',    close: '~PU2~',    className: 'pool-hl-2' },
    { open: '~PU3~',    close: '~PU3~',    className: 'pool-hl-3' },
    { open: '~PU4~',    close: '~PU4~',    className: 'pool-hl-4' },
    { open: '~PU5~',    close: '~PU5~',    className: 'pool-hl-5' },
    { open: '~PU6~',    close: '~PU6~',    className: 'pool-hl-6' },
    { open: '~PU7~',    close: '~PU7~',    className: 'pool-hl-7' },
    { open: '~PU8~',    close: '~PU8~',    className: 'pool-hl-8' },
    { open: '~PU9~',    close: '~PU9~',    className: 'pool-hl-9' },
    { open: '~PU10~',   close: '~PU10~',   className: 'pool-hl-10' },
    { open: '~PU11~',   close: '~PU11~',   className: 'pool-hl-11' },
    { open: '~PU12~',   close: '~PU12~',   className: 'pool-hl-12' },
    { open: '~PU13~',   close: '~PU13~',   className: 'pool-hl-13' },
    { open: '~PU14~',   close: '~PU14~',   className: 'pool-hl-14' },
    { open: '~PU15~',   close: '~PU15~',   className: 'pool-hl-15' },
    { open: '~PU16~',   close: '~PU16~',   className: 'pool-hl-16' },
    { open: '~PU17~',   close: '~PU17~',   className: 'pool-hl-17' },
    { open: '~PU18~',   close: '~PU18~',   className: 'pool-hl-18' },
    { open: '~PU19~',   close: '~PU19~',   className: 'pool-hl-19' },
    { open: '~PU20~',   close: '~PU20~',   className: 'pool-hl-20' },
    { open: '~PU21~',   close: '~PU21~',   className: 'pool-hl-21' },
    { open: '~PU22~',   close: '~PU22~',   className: 'pool-hl-22' },
    { open: '~PU23~',   close: '~PU23~',   className: 'pool-hl-23' },
    { open: '~PU24~',   close: '~PU24~',   className: 'pool-hl-24' },
    { open: '~PU25~',   close: '~PU25~',   className: 'pool-hl-25' },
    { open: '~PU26~',   close: '~PU26~',   className: 'pool-hl-26' },
    { open: '~PU27~',   close: '~PU27~',   className: 'pool-hl-27' },
    { open: '~PU28~',   close: '~PU28~',   className: 'pool-hl-28' },
    { open: '~PU29~',   close: '~PU29~',   className: 'pool-hl-29' },
    { open: '~PU30~',   close: '~PU30~',   className: 'pool-hl-30' },
    { open: '~PU31~',   close: '~PU31~',   className: 'pool-hl-31' },
    { open: '~PU32~',   close: '~PU32~',   className: 'pool-hl-32' },
    { open: '~PU33~',   close: '~PU33~',   className: 'pool-hl-33' },
    { open: '~PU34~',   close: '~PU34~',   className: 'pool-hl-34' },
    { open: '~PU35~',   close: '~PU35~',   className: 'pool-hl-35' },
    { open: '~PU36~',   close: '~PU36~',   className: 'pool-hl-36' },
    { open: '~PU37~',   close: '~PU37~',   className: 'pool-hl-37' },
    { open: '~PU38~',   close: '~PU38~',   className: 'pool-hl-38' },
    { open: '~PU39~',   close: '~PU39~',   className: 'pool-hl-39' },
    { open: '~PU40~',   close: '~PU40~',   className: 'pool-hl-40' },
    { open: '~PU41~',   close: '~PU41~',   className: 'pool-hl-41' },
    { open: '~PU42~',   close: '~PU42~',   className: 'pool-hl-42' },
    { open: '~PU43~',   close: '~PU43~',   className: 'pool-hl-43' },
    { open: '~PU44~',   close: '~PU44~',   className: 'pool-hl-44' },
    { open: '~PU45~',   close: '~PU45~',   className: 'pool-hl-45' },
    { open: '~PU46~',   close: '~PU46~',   className: 'pool-hl-46' },
    { open: '~PU47~',   close: '~PU47~',   className: 'pool-hl-47' },
    { open: '~PU48~',   close: '~PU48~',   className: 'pool-hl-48' },
    { open: '~PU49~',   close: '~PU49~',   className: 'pool-hl-49' },
    { open: '~PU50~',   close: '~PU50~',   className: 'pool-hl-50' },
    { open: '~CPR~',    close: '~CPR~',    className: 'mkt-cp-red' },
    { open: '~CPO~',    close: '~CPO~',    className: 'mkt-cp-orange' },
    { open: '~CPA~',    close: '~CPA~',    className: 'mkt-cp-amber' },
    { open: '~CPY~',    close: '~CPY~',    className: 'mkt-cp-yellow' },
    { open: '~CPL~',    close: '~CPL~',    className: 'mkt-cp-lime' },
    { open: '~CPG~',    close: '~CPG~',    className: 'mkt-cp-green' },
    { open: '~CPE~',    close: '~CPE~',    className: 'mkt-cp-emerald' },
    { open: '~CPT~',    close: '~CPT~',    className: 'mkt-cp-teal' },
    { open: '~CPC~',    close: '~CPC~',    className: 'mkt-cp-cyan' },
    { open: '~CPS~',    close: '~CPS~',    className: 'mkt-cp-sky' },
    { open: '~CPB~',    close: '~CPB~',    className: 'mkt-cp-blue' },
    { open: '~CPI~',    close: '~CPI~',    className: 'mkt-cp-indigo' },
    { open: '~CPV~',    close: '~CPV~',    className: 'mkt-cp-violet' },
    { open: '~CPF~',    close: '~CPF~',    className: 'mkt-cp-fuchsia' },
    { open: '~CPP~',    close: '~CPP~',    className: 'mkt-cp-pink' },
    { open: '~CPQ~',    close: '~CPQ~',    className: 'mkt-cp-slate' },
    { open: '~BP1~',    close: '~BP1~',    className: 'bcp-tide' },
    { open: '~BP2~',    close: '~BP2~',    className: 'bcp-highlighter' },
    { open: '~BP3~',    close: '~BP3~',    className: 'bcp-bevel' },
    { open: '~BP4~',    close: '~BP4~',    className: 'bcp-stitch' },
    { open: '~BP5~',    close: '~BP5~',    className: 'bcp-scan' },
    { open: '~BP6~',    close: '~BP6~',    className: 'bcp-hatch' },
    { open: '~BP7~',    close: '~BP7~',    className: 'bcp-emboss' },
    { open: '~BP8~',    close: '~BP8~',    className: 'bcp-halo' },
    { open: '~BP9~',    close: '~BP9~',    className: 'bcp-dots' },
    { open: '~BP10~',   close: '~BP10~',   className: 'bcp-marker' },
    { open: '~PL1~',    close: '~PL1~',    className: 'pill-hl-red' },
    { open: '~PL2~',    close: '~PL2~',    className: 'pill-hl-orange' },
    { open: '~PL3~',    close: '~PL3~',    className: 'pill-hl-amber' },
    { open: '~PL4~',    close: '~PL4~',    className: 'pill-hl-yellow' },
    { open: '~PL5~',    close: '~PL5~',    className: 'pill-hl-lime' },
    { open: '~PL6~',    close: '~PL6~',    className: 'pill-hl-green' },
    { open: '~PL7~',    close: '~PL7~',    className: 'pill-hl-emerald' },
    { open: '~PL8~',    close: '~PL8~',    className: 'pill-hl-teal' },
    { open: '~PL9~',    close: '~PL9~',    className: 'pill-hl-cyan' },
    { open: '~PL10~',   close: '~PL10~',   className: 'pill-hl-sky' },
    { open: '~PL11~',   close: '~PL11~',   className: 'pill-hl-blue' },
    { open: '~PL12~',   close: '~PL12~',   className: 'pill-hl-indigo' },
    { open: '~PL13~',   close: '~PL13~',   className: 'pill-hl-violet' },
    { open: '~PL14~',   close: '~PL14~',   className: 'pill-hl-fuchsia' },
    { open: '~PL15~',   close: '~PL15~',   className: 'pill-hl-pink' },
    { open: '~PL16~',   close: '~PL16~',   className: 'pill-hl-slate' },
    { open: '~PS1~',    close: '~PS1~',    className: 'mkt-pool-tide' },
    { open: '~PS2~',    close: '~PS2~',    className: 'mkt-pool-sunset' },
    { open: '~PS3~',    close: '~PS3~',    className: 'mkt-pool-chlorine' },
    { open: '~PS4~',    close: '~PS4~',    className: 'mkt-pool-beachball' },
    { open: '~PS5~',    close: '~PS5~',    className: 'mkt-pool-wave' },
    { open: '~PS6~',    close: '~PS6~',    className: 'mkt-pool-lounger' },
    { open: '~PS7~',    close: '~PS7~',    className: 'mkt-pool-deep' },
    { open: '~PS8~',    close: '~PS8~',    className: 'mkt-pool-foam' },
    { open: '~PS9~',    close: '~PS9~',    className: 'mkt-pool-lifeguard' },
    { open: '~PS10~',   close: '~PS10~',   className: 'mkt-pool-fusion' },
    { open: '~AU1~',    close: '~AU1~',    className: 'mkt-autumn-harvest' },
    { open: '~AU2~',    close: '~AU2~',    className: 'mkt-autumn-pumpkin' },
    { open: '~AU3~',    close: '~AU3~',    className: 'mkt-autumn-cider' },
    { open: '~AU4~',    close: '~AU4~',    className: 'mkt-autumn-candy' },
    { open: '~AU5~',    close: '~AU5~',    className: 'mkt-autumn-leaves' },
    { open: '~AU6~',    close: '~AU6~',    className: 'mkt-autumn-golden' },
    { open: '~AU7~',    close: '~AU7~',    className: 'mkt-autumn-bonfire' },
    { open: '~AU8~',    close: '~AU8~',    className: 'mkt-autumn-frost' },
    { open: '~AU9~',    close: '~AU9~',    className: 'mkt-autumn-flannel' },
    { open: '~AU10~',   close: '~AU10~',   className: 'mkt-autumn-orchard' },
    { open: '~WN1~',    close: '~WN1~',    className: 'mkt-winter-icicle' },
    { open: '~WN2~',    close: '~WN2~',    className: 'mkt-winter-frost' },
    { open: '~WN3~',    close: '~WN3~',    className: 'mkt-winter-pine' },
    { open: '~WN4~',    close: '~WN4~',    className: 'mkt-winter-garnet' },
    { open: '~WN5~',    close: '~WN5~',    className: 'mkt-winter-snowdrift' },
    { open: '~WN6~',    close: '~WN6~',    className: 'mkt-winter-aurora' },
    { open: '~WN7~',    close: '~WN7~',    className: 'mkt-winter-pond' },
    { open: '~WN8~',    close: '~WN8~',    className: 'mkt-winter-seal' },
    { open: '~WN9~',    close: '~WN9~',    className: 'mkt-winter-blizzard' },
    { open: '~WN10~',   close: '~WN10~',   className: 'mkt-winter-cranberry' },
    { open: '~FR1~',    close: '~FR1~',    className: 'mkt-fruit-apple' },
    { open: '~FR2~',    close: '~FR2~',    className: 'mkt-fruit-mango' },
    { open: '~FR3~',    close: '~FR3~',    className: 'mkt-fruit-grape' },
    { open: '~FR4~',    close: '~FR4~',    className: 'mkt-fruit-strawberry' },
    { open: '~FR5~',    close: '~FR5~',    className: 'mkt-fruit-blueberry' },
    { open: '~FR6~',    close: '~FR6~',    className: 'mkt-fruit-orange' },
    { open: '~FR7~',    close: '~FR7~',    className: 'mkt-fruit-lemon' },
    { open: '~FR8~',    close: '~FR8~',    className: 'mkt-fruit-lime' },
    { open: '~FR9~',    close: '~FR9~',    className: 'mkt-fruit-cherry' },
    { open: '~FR10~',   close: '~FR10~',   className: 'mkt-fruit-peach' },
    { open: '~FR11~',   close: '~FR11~',   className: 'mkt-fruit-pear' },
    { open: '~FR12~',   close: '~FR12~',   className: 'mkt-fruit-plum' },
    { open: '~FR13~',   close: '~FR13~',   className: 'mkt-fruit-kiwi' },
    { open: '~FR14~',   close: '~FR14~',   className: 'mkt-fruit-pineapple' },
    { open: '~FR15~',   close: '~FR15~',   className: 'mkt-fruit-watermelon' },
    { open: '~FR16~',   close: '~FR16~',   className: 'mkt-fruit-banana' },
    { open: '~FR17~',   close: '~FR17~',   className: 'mkt-fruit-coconut' },
    { open: '~FR18~',   close: '~FR18~',   className: 'mkt-fruit-raspberry' },
    { open: '~FR19~',   close: '~FR19~',   className: 'mkt-fruit-blackberry' },
    { open: '~FR20~',   close: '~FR20~',   className: 'mkt-fruit-pomegranate' },
    { open: '~HK1~',    close: '~HK1~',    className: 'mkt-hacker-prompt' },
    { open: '~HK2~',    close: '~HK2~',    className: 'mkt-hacker-matrix' },
    { open: '~HK3~',    close: '~HK3~',    className: 'mkt-hacker-amber' },
    { open: '~HK4~',    close: '~HK4~',    className: 'mkt-hacker-scan' },
    { open: '~HK5~',    close: '~HK5~',    className: 'mkt-hacker-alert' },
    { open: '~HK6~',    close: '~HK6~',    className: 'mkt-hacker-hex' },
    { open: '~HK7~',    close: '~HK7~',    className: 'mkt-hacker-root' },
    { open: '~HK8~',    close: '~HK8~',    className: 'mkt-hacker-ghost' },
    { open: '~HK9~',    close: '~HK9~',    className: 'mkt-hacker-ice' },
    { open: '~HK10~',   close: '~HK10~',   className: 'mkt-hacker-panic' },
    { open: '~HK11~',   close: '~HK11~',   className: 'mkt-hacker-null' },
    { open: '~HK12~',   close: '~HK12~',   className: 'mkt-hacker-bitflip' },
    { open: '~HK13~',   close: '~HK13~',   className: 'mkt-hacker-firewall' },
    { open: '~HK14~',   close: '~HK14~',   className: 'mkt-hacker-darknet' },
    { open: '~HK15~',   close: '~HK15~',   className: 'mkt-hacker-sniffer' },
    { open: '~HK16~',   close: '~HK16~',   className: 'mkt-hacker-overclock' },
    { open: '~HK17~',   close: '~HK17~',   className: 'mkt-hacker-leak' },
    { open: '~HK18~',   close: '~HK18~',   className: 'mkt-hacker-zeroday' },
    { open: '~HK19~',   close: '~HK19~',   className: 'mkt-hacker-backdoor' },
    { open: '~HK20~',   close: '~HK20~',   className: 'mkt-hacker-cipher' },
    { open: '~HK21~',   close: '~HK21~',   className: 'mkt-hacker-daemon' },
    { open: '~HK22~',   close: '~HK22~',   className: 'mkt-hacker-fork' },
    { open: '~HK23~',   close: '~HK23~',   className: 'mkt-hacker-segfault' },
    { open: '~HK24~',   close: '~HK24~',   className: 'mkt-hacker-uptime' },
    { open: '~HK25~',   close: '~HK25~',   className: 'mkt-hacker-latency' },
    { open: '~HK26~',   close: '~HK26~',   className: 'mkt-hacker-mainframe' },
    { open: '~HK27~',   close: '~HK27~',   className: 'mkt-hacker-punchcard' },
    { open: '~HK28~',   close: '~HK28~',   className: 'mkt-hacker-turing' },
    { open: '~HK29~',   close: '~HK29~',   className: 'mkt-hacker-quantum' },
    { open: '~HK30~',   close: '~HK30~',   className: 'mkt-hacker-sudo' },
    { open: '~MG1~',    close: '~MG1~',    className: 'mkt-mg-red' },
    { open: '~MG2~',    close: '~MG2~',    className: 'mkt-mg-orange' },
    { open: '~MG3~',    close: '~MG3~',    className: 'mkt-mg-amber' },
    { open: '~MG4~',    close: '~MG4~',    className: 'mkt-mg-yellow' },
    { open: '~MG5~',    close: '~MG5~',    className: 'mkt-mg-lime' },
    { open: '~MG6~',    close: '~MG6~',    className: 'mkt-mg-green' },
    { open: '~MG7~',    close: '~MG7~',    className: 'mkt-mg-emerald' },
    { open: '~MG8~',    close: '~MG8~',    className: 'mkt-mg-teal' },
    { open: '~MG9~',    close: '~MG9~',    className: 'mkt-mg-cyan' },
    { open: '~MG10~',   close: '~MG10~',   className: 'mkt-mg-sky' },
    { open: '~MG11~',   close: '~MG11~',   className: 'mkt-mg-blue' },
    { open: '~MG12~',   close: '~MG12~',   className: 'mkt-mg-indigo' },
    { open: '~MG13~',   close: '~MG13~',   className: 'mkt-mg-violet' },
    { open: '~MG14~',   close: '~MG14~',   className: 'mkt-mg-fuchsia' },
    { open: '~MG15~',   close: '~MG15~',   className: 'mkt-mg-pink' },
    { open: '~MG16~',   close: '~MG16~',   className: 'mkt-mg-slate' },
    { open: '~DW1~',    close: '~DW1~',    className: 'mkt-dew-cyan' },
    { open: '~DW2~',    close: '~DW2~',    className: 'mkt-dew-orange' },
    { open: '~DW3~',    close: '~DW3~',    className: 'mkt-dew-green' },
    { open: '~DW4~',    close: '~DW4~',    className: 'mkt-dew-red' },
    { open: '~DW5~',    close: '~DW5~',    className: 'mkt-dew-purple' },
    { open: '~DW6~',    close: '~DW6~',    className: 'mkt-dew-pink' },
    { open: '~DW7~',    close: '~DW7~',    className: 'mkt-dew-yellow' },
    { open: '~DW8~',    close: '~DW8~',    className: 'mkt-dew-blue' },
    { open: '~DW9~',    close: '~DW9~',    className: 'mkt-dew-lime' },
    { open: '~DW10~',   close: '~DW10~',   className: 'mkt-dew-teal' },
    { open: '~DW11~',   close: '~DW11~',   className: 'mkt-dew-gold' },
    { open: '~DW12~',   close: '~DW12~',   className: 'mkt-dew-slate' },
    { open: '~DW13~',   close: '~DW13~',   className: 'mkt-dew-white' },
    { open: '~DW14~',   close: '~DW14~',   className: 'mkt-dew-black' },
    { open: '~DW15~',   close: '~DW15~',   className: 'mkt-dew-fog' },
    { open: '~DW16~',   close: '~DW16~',   className: 'mkt-dew-turquoise' },
    { open: '~BB1~',    close: '~BB1~',    className: 'mkt-bubble-red' },
    { open: '~BB2~',    close: '~BB2~',    className: 'mkt-bubble-coral' },
    { open: '~BB3~',    close: '~BB3~',    className: 'mkt-bubble-orange' },
    { open: '~BB4~',    close: '~BB4~',    className: 'mkt-bubble-amber' },
    { open: '~BB5~',    close: '~BB5~',    className: 'mkt-bubble-gold' },
    { open: '~BB6~',    close: '~BB6~',    className: 'mkt-bubble-yellow' },
    { open: '~BB7~',    close: '~BB7~',    className: 'mkt-bubble-cream' },
    { open: '~BB8~',    close: '~BB8~',    className: 'mkt-bubble-lime' },
    { open: '~BB9~',    close: '~BB9~',    className: 'mkt-bubble-olive' },
    { open: '~BB10~',   close: '~BB10~',   className: 'mkt-bubble-green' },
    { open: '~BB11~',   close: '~BB11~',   className: 'mkt-bubble-emerald' },
    { open: '~BB12~',   close: '~BB12~',   className: 'mkt-bubble-mint' },
    { open: '~BB13~',   close: '~BB13~',   className: 'mkt-bubble-teal' },
    { open: '~BB14~',   close: '~BB14~',   className: 'mkt-bubble-turquoise' },
    { open: '~BB15~',   close: '~BB15~',   className: 'mkt-bubble-cyan' },
    { open: '~BB16~',   close: '~BB16~',   className: 'mkt-bubble-sky' },
    { open: '~BB17~',   close: '~BB17~',   className: 'mkt-bubble-blue' },
    { open: '~BB18~',   close: '~BB18~',   className: 'mkt-bubble-navy' },
    { open: '~BB19~',   close: '~BB19~',   className: 'mkt-bubble-indigo' },
    { open: '~BB20~',   close: '~BB20~',   className: 'mkt-bubble-violet' },
    { open: '~BB21~',   close: '~BB21~',   className: 'mkt-bubble-purple' },
    { open: '~BB22~',   close: '~BB22~',   className: 'mkt-bubble-lavender' },
    { open: '~BB23~',   close: '~BB23~',   className: 'mkt-bubble-fuchsia' },
    { open: '~BB24~',   close: '~BB24~',   className: 'mkt-bubble-pink' },
    { open: '~BB25~',   close: '~BB25~',   className: 'mkt-bubble-rose' },
    { open: '~BB26~',   close: '~BB26~',   className: 'mkt-bubble-brown' },
    { open: '~BB27~',   close: '~BB27~',   className: 'mkt-bubble-white' },
    { open: '~BB28~',   close: '~BB28~',   className: 'mkt-bubble-fog' },
    { open: '~BB29~',   close: '~BB29~',   className: 'mkt-bubble-slate' },
    { open: '~BB30~',   close: '~BB30~',   className: 'mkt-bubble-black' },
];

function getColumnName(colIndex) {
    let name = "";
    while (colIndex >= 0) {
        name = String.fromCharCode((colIndex % 26) + 65) + name;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return name;
}

// Parse "A1" into { col: 0, row: 1 }
function parseCellId(cellId) {
    const colMatch = cellId.match(/[A-Z]+/)[0];
    const rowMatch = parseInt(cellId.match(/\d+/)[0]);
    let colIdx = 0;
    for (let i = 0; i < colMatch.length; i++) {
        colIdx = colIdx * 26 + (colMatch.charCodeAt(i) - 64);
    }
    return { col: colIdx - 1, row: rowMatch };
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applyKeydownFormatting(text) {
    if (!text) return "";
    // Placeholder alphabet: private-use chars (never typed, grep-safe)!
    const PH = (i) => `${i}`;
    const PH_RE = /(\d+)/g;
    // Protect already-styled spans FIRST: re-renders must never destroy them!
    // (Without this, the escaping below turns live spans into dead text!)
    const kept = [];
    const stash = (html) => {
        kept.push(html);
        return PH(kept.length - 1);
    };
    // Spark markers before escaping: & escaping would eat the && delimiters!
    let html = text.toString().replace(/&&([\s\S]*?)&&/g, (m, inner) => {
        const safe = inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return stash(`<span class="spark-text">${safe}</span>`);
    });
    html = html.replace(/<span class="[^"<>]*">[^<]*?<\/span>/g, stash);

    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    keydownDefinitions.forEach(def => {
        const regex = new RegExp(escapeRegExp(def.open) + '(.*?)' + escapeRegExp(def.close), 'g');
        if (def.className) {
            html = html.replace(regex, `<span class="${def.className}">$1</span>`);
        } else if (def.tagName) {
            html = html.replace(regex, `<${def.tagName}>$1</${def.tagName}>`);
        }
    });

    html = html.replace(PH_RE, (m, i) => kept[+i]);
    return html;
}

// Markers for a toolbar class, so styles stay as typeable Keydown text!
function keydownMarkersFor(className) {
    const def = keydownDefinitions.find(d => d.className === className);
    return def ? { open: def.open, close: def.close } : null;
}

// ==========================================
// WORKBOOK MODEL
// ==========================================
const BOOK_KEY = 'imbuer-book-v2';
const LEGACY_KEY = 'imbuer-sheet-v1';
const PREFS_KEY = 'imbuer-prefs-v1';
const DEF_W = 88, DEF_H = 24, HDR_H = 24, ROWHDR_W = 46;
const MAX_ROWS = 2000, MAX_COLS = 104;
const REF_COLORS = ['#3b6fd8', '#d64545', '#8e44ad', '#1f9d55', '#e07b00', '#0e9fb8', '#d63384', '#6d5d00'];

let book = null;
let prefs = { gridlines: true, headings: true, formulaBar: true, dark: false, anim: true, sound: true, zoom: 1, showFormulas: false, layout: 'excel', sideCollapsed: false };
let calc = { values: [], hints: [] };

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function newSheet(name, rows, cols) {
    return {
        id: uid(), name, rows: rows || 100, cols: cols || 26,
        data: {}, styles: {}, notes: {}, colW: {}, rowH: {}, hiddenRows: {}, hiddenCols: {},
        freeze: { r: 0, c: 0 }, cf: [], charts: [], sparks: {}, filter: null, tabColor: null,
    };
}

function newBook() {
    return { name: 'Book1', sheets: [newSheet('Sheet1')], active: 0 };
}

function fixSheet(s) {
    const d = newSheet(s.name || 'Sheet');
    for (const k of Object.keys(d)) if (s[k] === undefined || s[k] === null && k !== 'filter' && k !== 'tabColor') s[k] = d[k];
    s.rows = Math.max(1, Math.min(MAX_ROWS, s.rows | 0 || 100));
    s.cols = Math.max(1, Math.min(MAX_COLS, s.cols | 0 || 26));
    return s;
}

function sh() {
    return book.sheets[book.active];
}

function idOf(r, c) {
    return getColumnName(c) + r;
}

function rcOf(id) {
    const p = parseCellId(id);
    return { r: p.row, c: p.col };
}

function persistSheets() {
    clearTimeout(persistSheets.t);
    persistSheets.t = setTimeout(saveNow, 250);
}

function saveNow() {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(BOOK_KEY, JSON.stringify(book));
    } catch (e) {}
}

function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
}

// Old single-sheet saves (imbuer-sheet-v1) become Sheet1 of a new workbook!
function migrateLegacy(doc) {
    const b = newBook();
    const s = b.sheets[0];
    if (doc.cellData && typeof doc.cellData === 'object') {
        for (const k of Object.keys(doc.cellData)) {
            if (/^[A-Z]+\d+$/.test(k) && doc.cellData[k] !== '') s.data[k] = String(doc.cellData[k]);
        }
    }
    if (doc.cellStyles && typeof doc.cellStyles === 'object') {
        for (const k of Object.keys(doc.cellStyles)) {
            const o = doc.cellStyles[k] || {};
            const st = {};
            if (o.bg && o.bg.toLowerCase() !== '#ffffff') st.fill = o.bg;
            if (o.border && o.border.toLowerCase() !== '#cbd5e1') { st.bt = st.bb = st.bl = st.br = 'thin ' + o.border; }
            if (Object.keys(st).length) s.styles[k] = st;
        }
    }
    if (Number.isInteger(doc.numRows)) s.rows = Math.max(100, Math.min(MAX_ROWS, doc.numRows));
    if (Number.isInteger(doc.numCols)) s.cols = Math.max(26, Math.min(MAX_COLS, doc.numCols));
    return b;
}

let firstVisit = false;

function restoreSheets() {
    book = null;
    try {
        if (typeof localStorage !== 'undefined') {
            firstVisit = !localStorage.getItem(BOOK_KEY) && !localStorage.getItem(LEGACY_KEY);
            const raw = localStorage.getItem(BOOK_KEY);
            if (raw) {
                const b = JSON.parse(raw);
                if (b && Array.isArray(b.sheets) && b.sheets.length) {
                    b.sheets.forEach(fixSheet);
                    b.active = Math.max(0, Math.min(b.sheets.length - 1, b.active | 0));
                    b.name = b.name || 'Book1';
                    book = b;
                }
            }
            if (!book) {
                const old = localStorage.getItem(LEGACY_KEY);
                if (old) book = migrateLegacy(JSON.parse(old));
            }
            const p = localStorage.getItem(PREFS_KEY);
            if (p) Object.assign(prefs, JSON.parse(p));
            else if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) prefs.anim = false;
        }
    } catch (e) {}
    if (!book) book = newBook();
}

// ==========================================
// VALUES & DISPLAY FORMATTING
// ==========================================
function valueAt(r, c, si) {
    const v = (calc.values[si === undefined ? book.active : si] || {})[idOf(r, c)];
    return v === undefined ? null : v;
}

function isErrVal(v) {
    return !!v && typeof v === 'object' && typeof v.code === 'string';
}

function plainValue(v) {
    return isErrVal(v) ? v.code : v;
}

function fmtGeneral(n) {
    if (Number.isInteger(n) && Math.abs(n) < 1e11) return String(n);
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e11 || abs < 1e-9)) return n.toExponential(5).replace(/\.?0+e/, 'E').replace('E+', 'E+').replace(/e/, 'E');
    let s = String(parseFloat(n.toPrecision(10)));
    if (s.length > 11) {
        const intLen = String(Math.trunc(abs)).length + (n < 0 ? 1 : 0);
        s = String(parseFloat(n.toFixed(Math.max(0, 10 - intLen))));
    }
    return s;
}

function withCommas(s) {
    const p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FORMATS = {
    general: { label: 'General', sample: 'Abc 123' },
    number: { label: 'Number', sample: '1234.00', dec: 2 },
    currency: { label: 'Currency', sample: '$1,234.00', dec: 2 },
    accounting: { label: 'Accounting', sample: '$ 1,234.00', dec: 2 },
    date: { label: 'Short Date', sample: '10/18/2026' },
    longdate: { label: 'Long Date', sample: 'Sunday, October 18, 2026' },
    time: { label: 'Time', sample: '2:30:00 PM' },
    percent: { label: 'Percentage', sample: '12.34%', dec: 2 },
    comma: { label: 'Comma', sample: '1,234.00', dec: 2 },
    fraction: { label: 'Fraction', sample: '1 1/4' },
    scientific: { label: 'Scientific', sample: '1.23E+03', dec: 2 },
    text: { label: 'Text', sample: 'Abc' },
};

function fmtFraction(n) {
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    const whole = Math.floor(n);
    const frac = n - whole;
    if (frac < 1e-9) return sign + whole;
    let best = [0, 1], err = 1;
    for (let d = 1; d <= 16; d++) {
        const nu = Math.round(frac * d);
        const e = Math.abs(frac - nu / d);
        if (e < err - 1e-12) { err = e; best = [nu, d]; }
    }
    if (best[0] === 0) return sign + whole;
    if (best[0] === best[1]) return sign + (whole + 1);
    return sign + (whole ? whole + ' ' : '') + best[0] + '/' + best[1];
}

function formatValue(v, st, hint) {
    if (v === null || v === undefined) return '';
    if (isErrVal(v)) return v.code;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v !== 'number') return String(v);
    const fmt = (st && st.fmt) || hint || 'general';
    const dec = st && st.dec !== undefined ? st.dec : (FORMATS[fmt] && FORMATS[fmt].dec !== undefined ? FORMATS[fmt].dec : 2);
    switch (fmt) {
        case 'number': return (v < 0 ? '-' : '') + (st && st.sep ? withCommas(Math.abs(v).toFixed(dec)) : Math.abs(v).toFixed(dec));
        case 'currency': return (v < 0 ? '-' : '') + '$' + withCommas(Math.abs(v).toFixed(dec));
        case 'accounting': return v < 0 ? '$ (' + withCommas(Math.abs(v).toFixed(dec)) + ')' : (v === 0 ? '$ -' : '$ ' + withCommas(v.toFixed(dec)));
        case 'percent': return (v * 100).toFixed(st && st.dec !== undefined ? st.dec : 0) + '%';
        case 'comma': return (v < 0 ? '-' : '') + withCommas(Math.abs(v).toFixed(dec));
        case 'scientific': return v.toExponential(dec).replace('e', 'E').replace(/E(\d)/, 'E+$1');
        case 'fraction': return fmtFraction(v);
        case 'date': case 'longdate': case 'time': case 'datetime': {
            const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000));
            if (isNaN(d.getTime())) return '#####';
            const time = () => {
                const h = d.getUTCHours();
                return ((h + 11) % 12 + 1) + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ':' + String(d.getUTCSeconds()).padStart(2, '0') + (h < 12 ? ' AM' : ' PM');
            };
            const short = (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear();
            if (fmt === 'date') return short;
            if (fmt === 'longdate') return DAYS_LONG[d.getUTCDay()] + ', ' + MONTHS_LONG[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
            if (fmt === 'time') return time();
            return short + ' ' + time().replace(/:\d\d (AM|PM)$/, ' $1');
        }
        case 'text': return fmtGeneral(v);
        default: return fmtGeneral(v);
    }
}

// What a cell shows (string) given its raw entry and computed value!
function displayText(r, c, si) {
    const s = si === undefined ? sh() : book.sheets[si];
    const id = idOf(r, c);
    const raw = s.data[id];
    if (raw === undefined || raw === '') return '';
    if (prefs.showFormulas && String(raw)[0] === '=') return String(raw);
    const st = s.styles[id];
    if (st && st.fmt === 'text') return String(raw).replace(/^'/, '');
    const hint = (calc.hints[si === undefined ? book.active : si] || {})[id];
    return formatValue(valueAt(r, c, si), st, hint);
}

// ==========================================
// LAYOUT (pixel positions from sizes, so overlays line up exactly)
// ==========================================
let layout = { colX: [0], rowY: [0, 0] };
let cellEls = [];
let colHdrEls = [];
let rowHdrEls = [];
let filterHidden = {};

function zf() {
    return prefs.zoom || 1;
}

function colWidth(c) {
    const s = sh();
    return s.hiddenCols[c] ? 0 : (s.colW[c] || DEF_W);
}

function rowHeight(r) {
    const s = sh();
    return s.hiddenRows[r] || filterHidden[r] ? 0 : (s.rowH[r] || DEF_H);
}

function isRowHidden(r) {
    return !!(sh().hiddenRows[r] || filterHidden[r]);
}

function hdrW() {
    return prefs.headings ? Math.round(ROWHDR_W * zf()) : 0;
}

function hdrH() {
    return prefs.headings ? Math.round(HDR_H * zf()) : 0;
}

function computeLayout() {
    const s = sh();
    const z = zf();
    const colX = [hdrW()];
    for (let c = 0; c < s.cols; c++) colX.push(colX[c] + Math.round(colWidth(c) * z));
    const rowY = [0, hdrH()];
    for (let r = 1; r <= s.rows; r++) rowY.push(rowY[r] + Math.round(rowHeight(r) * z));
    layout = { colX, rowY };
}

function scroller() {
    return document.getElementById('grid-scroll');
}

// Frozen cells are sticky, so their on-screen spot follows the scroll!
function cellRect(r, c) {
    const L = layout;
    let x = L.colX[c], y = L.rowY[r];
    const w = L.colX[c + 1] - x, h = L.rowY[r + 1] - y;
    const f = sh().freeze;
    const sc = scroller();
    if (sc) {
        if (f.r && r <= f.r) y += sc.scrollTop;
        if (f.c && c < f.c) x += sc.scrollLeft;
    }
    return { x, y, w, h };
}

function rangeRect(R) {
    const a = cellRect(R.r0, R.c0);
    const b = cellRect(R.r1, R.c1);
    return { x: a.x, y: a.y, w: Math.max(0, b.x + b.w - a.x), h: Math.max(0, b.y + b.h - a.y) };
}

// Content coordinates under a pointer, honoring frozen panes!
function cellAtPoint(clientX, clientY) {
    const sc = scroller();
    const box = sc.getBoundingClientRect();
    const s = sh();
    const vx = clientX - box.left, vy = clientY - box.top;
    let x = vx + sc.scrollLeft, y = vy + sc.scrollTop;
    if (s.freeze.c && vx < layout.colX[s.freeze.c]) x = vx;
    if (s.freeze.r && vy < layout.rowY[s.freeze.r + 1]) y = vy;
    const L = layout;
    let c = 0;
    while (c < s.cols - 1 && L.colX[c + 1] <= x) c++;
    let r = 1;
    while (r < s.rows && L.rowY[r + 1] <= y) r++;
    while (c > 0 && colWidth(c) === 0) c--;
    return { r, c };
}

// ==========================================
// GRID BUILD & RENDER
// ==========================================
function stickyStyle(r, c) {
    const f = sh().freeze;
    let css = '';
    const fr = f.r && r <= f.r, fc = f.c && c < f.c;
    if (fr) css += `position:sticky;top:${layout.rowY[r]}px;z-index:${fc ? 4 : 3};`;
    if (fc) css += `${fr ? '' : 'position:sticky;'}left:${layout.colX[c]}px;${fr ? '' : 'z-index:3;'}`;
    return css;
}

function initGrid() {
    const s = sh();
    computeLayout();
    computeFilterHidden();
    computeLayout();
    const L = layout;
    const table = document.getElementById('grid');
    const colgroup = document.getElementById('grid-cols');
    let cols = `<col style="width:${hdrW()}px">`;
    for (let c = 0; c < s.cols; c++) cols += `<col style="width:${L.colX[c + 1] - L.colX[c]}px">`;
    colgroup.innerHTML = cols;
    table.style.width = L.colX[s.cols] + 'px';
    table.style.setProperty('--z', zf());

    let head = `<th class="corner" title="Select all"><span class="corner-tri"></span></th>`;
    for (let c = 0; c < s.cols; c++) {
        head += `<th class="ch${s.hiddenCols[c] ? ' hc' : ''}" data-c="${c}"><span>${getColumnName(c)}</span><i class="rz rz-c" data-c="${c}"></i></th>`;
    }
    const headRow = document.getElementById('table-header-row');
    headRow.innerHTML = head;
    headRow.style.height = hdrH() + 'px';

    let body = '';
    for (let r = 1; r <= s.rows; r++) {
        const h = L.rowY[r + 1] - L.rowY[r];
        body += `<tr data-r="${r}" style="height:${h}px;--rh:${h}px"${h === 0 ? ' class="hr"' : ''}><th class="rh" data-r="${r}">${r}<i class="rz rz-r" data-r="${r}"></i></th>`;
        for (let c = 0; c < s.cols; c++) body += `<td data-r="${r}" data-c="${c}"${s.hiddenCols[c] ? ' class="hc"' : ''}></td>`;
        body += '</tr>';
    }
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = body;

    cellEls = [null];
    rowHdrEls = [null];
    const trs = tbody.children;
    for (let i = 0; i < trs.length; i++) {
        const tr = trs[i];
        rowHdrEls.push(tr.firstChild);
        const row = [];
        for (let k = 1; k < tr.children.length; k++) row.push(tr.children[k]);
        cellEls.push(row);
    }
    colHdrEls = Array.from(headRow.querySelectorAll('th.ch'));
    applyFreezeChrome();
    document.getElementById('grid-inner').style.width = L.colX[s.cols] + 'px';
    document.getElementById('grid-inner').style.height = L.rowY[s.rows + 1] + 'px';
    renderAll(false);
    if (typeof renderCharts === 'function') renderCharts(false);
    drawSel({ animate: false });
}

function applyFreezeChrome() {
    const s = sh();
    const f = s.freeze;
    for (let c = 0; c < colHdrEls.length; c++) {
        const th = colHdrEls[c];
        th.style.left = '';
        th.style.zIndex = '';
        if (f.c && c < f.c) { th.style.left = layout.colX[c] + 'px'; th.style.zIndex = 9; th.classList.add('frz'); }
        else th.classList.remove('frz');
        th.classList.toggle('frz-edge', !!f.c && c === f.c - 1);
    }
    for (let r = 1; r < rowHdrEls.length; r++) {
        const th = rowHdrEls[r];
        if (f.r && r <= f.r) { th.style.top = layout.rowY[r] + 'px'; th.style.zIndex = 8; th.classList.add('frz'); }
        else { th.style.top = ''; th.style.zIndex = ''; th.classList.remove('frz'); }
        th.classList.toggle('frz-edge', !!f.r && r === f.r);
    }
    document.getElementById('grid').classList.toggle('has-freeze', !!(f.r || f.c));
}

function borderShadow(st, edge) {
    // "thin #333", "thick #333", "double #333" → [border color override, inset shadows]
    const v = st && st[edge];
    if (!v) return null;
    const [kind, color] = v.split(' ');
    return { kind, color: color || '#000' };
}

function cellView(r, c) {
    const s = sh();
    const id = idOf(r, c);
    const raw = s.data[id];
    const st = s.styles[id] || {};
    const v = valueAt(r, c);
    const isFormula = FormulaEngine.isFormulaText(raw);
    let cls = '';
    let style = stickyStyle(r, c);
    let text = displayText(r, c);
    const cf = typeof cfFor === 'function' ? cfFor(r, c, v) : null;

    // Fill & font
    const fill = (cf && cf.fill) || st.fill;
    if (fill) style += `background:${fill};`;
    if (cf && cf.bar) style += `background-image:${cf.bar};background-repeat:no-repeat;background-position:2px 50%;background-size:${cf.barSize} 72%;`;
    let color = (cf && cf.color) || st.color;
    // Dark mode: automatic text on a light fill turns dark so it stays readable!
    if (!color && fill && prefs.dark && isLightFill(fill)) color = '#1b1b1b';
    // ...and dark text colors on the dark grid get lifted so they still show!
    else if (color && prefs.dark && !(fill && isLightFill(fill)) && hexLum(color) < 0.45) color = liftHex(color);
    if (color) style += `color:${color};`;
    if (st.font) style += `font-family:${st.font};`;
    if (st.size) style += `font-size:${(st.size * zf()).toFixed(2)}px;`;
    if (st.b || (cf && cf.b)) style += 'font-weight:700;';
    if (st.i) style += 'font-style:italic;';
    const deco = [];
    if (st.u) deco.push('underline');
    if (st.s) deco.push('line-through');
    if (deco.length) style += `text-decoration:${deco.join(' ')};`;

    // Borders (bottom/right ride the gridline, top/left are inset shadows)
    const shadows = [];
    const bb = borderShadow(st, 'bb'), brr = borderShadow(st, 'br'), bt = borderShadow(st, 'bt'), bl = borderShadow(st, 'bl');
    if (bb) {
        style += `border-bottom-color:${bb.color};`;
        if (bb.kind === 'thick') shadows.push(`inset 0 -1px 0 ${bb.color}`);
        if (bb.kind === 'double') shadows.push(`inset 0 -2px 0 var(--cell-bg)`, `inset 0 -3px 0 ${bb.color}`);
    }
    if (brr) {
        style += `border-right-color:${brr.color};`;
        if (brr.kind === 'thick') shadows.push(`inset -1px 0 0 ${brr.color}`);
    }
    if (bt) shadows.unshift(`inset 0 ${bt.kind === 'thick' ? 2 : 1}px 0 ${bt.color}`);
    if (bl) shadows.unshift(`inset ${bl.kind === 'thick' ? 2 : 1}px 0 0 ${bl.color}`);
    if (shadows.length) style += `box-shadow:${shadows.join(',')};`;

    // Alignment: numbers right, booleans & errors centered, text left (like Excel)!
    let h = st.align;
    if (!h) h = (typeof v === 'number' && !prefs.showFormulas) ? 'right' : (typeof v === 'boolean' || isErrVal(v)) ? 'center' : 'left';
    const va = st.valign || 'bottom';
    if (st.wrap) cls += ' wrap';
    if (isErrVal(v)) cls += ' is-err';
    if (s.notes[id]) cls += ' has-note';
    if (s.hiddenCols[c]) cls += ' hc';
    if (isFormula) cls += ' is-formula';

    let inner = '';
    if (st.check) {
        const on = v === true || (typeof v === 'number' && v !== 0) || (typeof v === 'string' && v.toUpperCase() === 'TRUE');
        inner = `<span class="xcb${on ? ' on' : ''}" data-cb="1"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg></span>`;
        h = st.align || 'center';
    } else if (s.sparks && s.sparks[id] && typeof sparkSvg === 'function') {
        inner = sparkSvg(s.sparks[id], r, c);
    } else if (text !== '') {
        const asText = typeof v === 'string' && !prefs.showFormulas && st.fmt !== 'text';
        inner = asText ? applyKeydownFormatting(text) : escapeHtml(text);
        if (cf && cf.icon) inner = `<b class="cf-ico" style="color:${cf.icon.color}">${cf.icon.ch}</b>` + inner;
    } else if (cf && cf.icon) {
        inner = `<b class="cf-ico" style="color:${cf.icon.color}">${cf.icon.ch}</b>`;
    }

    // Long text spills into empty neighbors on the right, just like Excel!
    let spill = false;
    if (inner && !st.wrap && h === 'left' && typeof v === 'string') {
        const next = s.data[idOf(r, c + 1)];
        spill = c + 1 < s.cols && (next === undefined || next === '');
    }
    const indent = st.indent ? `padding-left:${st.indent * 10 * zf() + 4}px;` : '';
    let html = inner ? `<div class="cv a-${h} v-${va}${spill ? ' spill' : ''}" style="${indent}"><span class="ct">${inner}</span></div>` : '';
    if (s.filter && r === s.filter.r0 && c >= s.filter.c0 && c <= s.filter.c1) {
        const on = s.filter.cols && s.filter.cols[c] && s.filter.cols[c].length;
        html += `<button class="flt-btn${on ? ' on' : ''}" data-flt="${c}" tabindex="-1" title="Filter"><svg viewBox="0 0 16 16">${on ? '<path d="M2.5 3h11l-4.2 5v4.5l-2.6 1V8z"/>' : '<path d="M4 6l4 4 4-4"/>'}</svg></button>`;
        cls += ' flt-head';
    }
    return { html, cls: cls.trim(), style };
}

function hexLum(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return 1;
    const n = parseInt(m[1], 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function liftHex(hex) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (v) => Math.round(v + (255 - v) * 0.55).toString(16).padStart(2, '0');
    return '#' + mix((n >> 16) & 255) + mix((n >> 8) & 255) + mix(n & 255);
}

function isLightFill(fill) {
    if (/gradient/.test(fill)) return true;
    if (!/^#[0-9a-f]{6}$/i.test(fill)) return true;
    return hexLum(fill) > 0.6;
}

function renderCell(r, c) {
    const row = cellEls[r];
    if (!row) return false;
    const td = row[c];
    if (!td) return false;
    const v = cellView(r, c);
    const sig = v.html + '\u0001' + v.cls + '\u0001' + v.style;
    if (td._sig === sig) return false;
    const had = td._sig !== undefined;
    td._sig = sig;
    td.className = v.cls;
    td.style.cssText = v.style;
    td.innerHTML = v.html;
    return had;
}

// Re-renders every cell; formula cells whose value changed get a flash!
function renderAll(flash, skipId) {
    const s = sh();
    const changed = [];
    for (let r = 1; r <= s.rows; r++) {
        for (let c = 0; c < s.cols; c++) {
            const was = cellEls[r] && cellEls[r][c] && cellEls[r][c]._sig;
            if (renderCell(r, c) && flash && was !== undefined) {
                const raw = s.data[idOf(r, c)];
                if (typeof raw === 'string' && raw[0] === '=' && idOf(r, c) !== skipId) changed.push([r, c]);
            }
        }
    }
    if (flash) changed.slice(0, 200).forEach(([r, c]) => animCell(r, c, 'flash'));
    if (typeof renderCharts === 'function') renderCharts(false);
}

function animCell(r, c, name, delay) {
    if (!prefs.anim) return;
    const td = cellEls[r] && cellEls[r][c];
    if (!td) return;
    td.classList.remove('fx-flash', 'fx-in', 'fx-pop');
    void td.offsetWidth;
    if (delay) td.style.animationDelay = delay + 'ms';
    td.classList.add('fx-' + name);
    clearTimeout(td._fxT);
    td._fxT = setTimeout(() => {
        td.classList.remove('fx-' + name);
        td.style.animationDelay = '';
    }, 900 + (delay || 0));
}

// ==========================================
// RECALC
// ==========================================
function recalc() {
    const sheets = book.sheets.map(s => ({ name: s.name, data: s.data, rows: s.rows, cols: s.cols }));
    try {
        calc = FormulaEngine.evaluateWorkbook(sheets);
    } catch (e) {
        calc = { values: book.sheets.map(() => ({})), hints: book.sheets.map(() => ({})) };
    }
    if (typeof cfPrepare === 'function') cfPrepare();
    if (typeof FengariFormula !== 'undefined') {
        try {
            const plain = {};
            const vals = calc.values[book.active] || {};
            for (const k of Object.keys(vals)) plain[k] = plainValue(vals[k]);
            FengariFormula.verifyAsync(sh().data, plain);
        } catch (e) {}
    }
}

function evaluateFormulas() {
    recalc();
    renderAll(true);
}

function computeFormula(formula) {
    // Live engine (see formula_engine.js + scripts/engines/imbuer.mjs)!
    return FormulaEngine.computeFormula(formula, sh().data);
}

// ==========================================
// UNDO / REDO
// ==========================================
const undoStack = [];
const redoStack = [];

function snapshot() {
    return { book: JSON.stringify(book), sel: JSON.stringify({ sel, extras }) };
}

function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 120) undoStack.shift();
    redoStack.length = 0;
    updateUndoButtons();
}

function updateUndoButtons() {
    document.querySelectorAll('[data-cmd="undo"]').forEach(b => b.disabled = !undoStack.length);
    document.querySelectorAll('[data-cmd="redo"]').forEach(b => b.disabled = !redoStack.length);
}

function restoreSnap(snap) {
    const before = sh();
    const beforeData = before.data;
    const beforeId = before.id;
    book = JSON.parse(snap.book);
    book.sheets.forEach(fixSheet);
    const S = JSON.parse(snap.sel);
    sel = S.sel;
    extras = S.extras || [];
    recalc();
    initGrid();
    renderSheetTabs();
    // Flash what the undo touched!
    if (sh().id === beforeId) {
        const now = sh().data;
        const keys = new Set([...Object.keys(beforeData), ...Object.keys(now)]);
        let n = 0;
        for (const k of keys) {
            if (beforeData[k] !== now[k] && n++ < 300) {
                const p = rcOf(k);
                if (p.r <= sh().rows && p.c < sh().cols) animCell(p.r, p.c, 'pop');
            }
        }
    }
    drawSel({ scroll: true });
    persistSheets();
}

function undo() {
    if (mode !== 'ready') { cancelEdit(); return; }
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restoreSnap(undoStack.pop());
    updateUndoButtons();
    toast('Undone!');
}

function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restoreSnap(redoStack.pop());
    updateUndoButtons();
    toast('Redone!');
}

// Every edit goes through here: snapshot → change → recalc → render → save!
function change(fn, opts) {
    opts = opts || {};
    pushUndo();
    fn();
    if (opts.rebuild) { recalc(); initGrid(); }
    else { recalc(); renderAll(true, opts.skipFlash); }
    drawSel({ animate: opts.animate !== false });
    persistSheets();
}

// ==========================================
// SELECTION
// ==========================================
let sel = { anchor: { r: 1, c: 0 }, focus: { r: 1, c: 0 }, act: { r: 1, c: 0 } };
let extras = [];
let mode = 'ready';
let drag = null;

function rng() {
    const a = sel.anchor, f = sel.focus;
    return { r0: Math.min(a.r, f.r), r1: Math.max(a.r, f.r), c0: Math.min(a.c, f.c), c1: Math.max(a.c, f.c) };
}

function allRanges() {
    return [rng(), ...extras];
}

function rangeSize(R) {
    return (R.r1 - R.r0 + 1) * (R.c1 - R.c0 + 1);
}

function inRange(R, r, c) {
    return r >= R.r0 && r <= R.r1 && c >= R.c0 && c <= R.c1;
}

function rangeText(R) {
    const a = idOf(R.r0, R.c0), b = idOf(R.r1, R.c1);
    return a === b ? a : a + ':' + b;
}

function clampCell(p) {
    const s = sh();
    return { r: Math.max(1, Math.min(s.rows, p.r)), c: Math.max(0, Math.min(s.cols - 1, p.c)) };
}

function selectCell(r, c, opts) {
    const p = clampCell({ r, c });
    sel = { anchor: { ...p }, focus: { ...p }, act: { ...p } };
    extras = [];
    drawSel(Object.assign({ scroll: true }, opts || {}));
}

function selectRange(R, opts) {
    const s = sh();
    const r0 = Math.max(1, R.r0), r1 = Math.min(s.rows, R.r1), c0 = Math.max(0, R.c0), c1 = Math.min(s.cols - 1, R.c1);
    sel = { anchor: { r: r0, c: c0 }, focus: { r: r1, c: c1 }, act: { r: r0, c: c0 } };
    extras = [];
    drawSel(Object.assign({ scroll: true }, opts || {}));
}

// Legacy helper (old drag-select API) — still selects a rectangle!
function selectCellRange(startId, endId) {
    const a = rcOf(startId), b = rcOf(endId);
    sel = { anchor: a, focus: b, act: { ...a } };
    drawSel({});
}

let lastActRect = null;
let lastHdr = { cols: new Set(), rows: new Set() };

function placeBox(el, R, pad) {
    pad = pad || 0;
    el.style.left = (R.x - pad) + 'px';
    el.style.top = (R.y - pad) + 'px';
    el.style.width = Math.max(0, R.w + pad * 2) + 'px';
    el.style.height = Math.max(0, R.h + pad * 2) + 'px';
}

function restartAnim(el, cls) {
    if (!prefs.anim) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
}

// Draws the selection overlays (they glide between cells thanks to CSS transitions)!
function drawSel(opts) {
    opts = opts || {};
    const ov = document.getElementById('ov');
    if (!ov) return;
    const animate = opts.animate !== false && prefs.anim;
    ov.classList.toggle('snap', !animate);
    ov.classList.toggle('dragging', !!(drag && (drag.kind === 'select' || drag.kind === 'hsel')));
    const act = document.getElementById('sel-active');
    const range = document.getElementById('sel-range');
    const R = rng();
    const a = sel.act;
    const ar = cellRect(a.r, a.c);

    // Comet trail + landing ring when the active box jumps somewhere new!
    const moved = !lastActRect || lastActRect.x !== ar.x || lastActRect.y !== ar.y || lastActRect.w !== ar.w || lastActRect.h !== ar.h;
    if (moved && animate && lastActRect && !(drag && drag.kind === 'select')) {
        const dist = Math.hypot(lastActRect.x - ar.x, lastActRect.y - ar.y);
        if (dist > 2) {
            const trail = document.createElement('div');
            trail.className = 'sel-trail';
            placeBox(trail, lastActRect);
            ov.appendChild(trail);
            removeAfterAnim(trail);
            ov.style.setProperty('--glide', Math.min(0.36, 0.16 + dist / 3000) + 's');
            if (dist > Math.max(ar.w, ar.h) * 1.6) comet(lastActRect, ar, dist);
        }
        restartAnim(act, 'land');
    }
    lastActRect = ar;
    placeBox(act, ar);
    act.hidden = false;

    const multi = rangeSize(R) > 1 || extras.length > 0;
    act.classList.toggle('in-range', rangeSize(R) > 1);
    if (multi) {
        const wasHidden = range.hidden;
        range.hidden = false;
        if (wasHidden && animate) {
            ov.classList.add('snap');
            placeBox(range, ar);
            void range.offsetWidth;
            ov.classList.remove('snap');
        }
        placeBox(range, rangeRect(R));
        if (opts.shine && animate && rangeSize(R) > 1) restartAnim(range, 'shine');
    } else {
        range.hidden = true;
        range.classList.remove('shine');
    }

    // Ctrl/Cmd-click ranges bloom in on their own!
    const ex = document.getElementById('sel-extras');
    while (ex.children.length > extras.length) ex.lastChild.remove();
    extras.forEach((E, i) => {
        let el = ex.children[i];
        if (!el) {
            el = document.createElement('div');
            el.className = 'sel-extra';
            ex.appendChild(el);
            if (animate) restartAnim(el, 'bloom');
        }
        placeBox(el, rangeRect(E));
    });

    // Fill handle & move edges follow the main range!
    const rr = rangeRect(R);
    const fh = document.getElementById('fill-handle');
    fh.hidden = mode !== 'ready' || extras.length > 0;
    fh.style.left = (rr.x + rr.w - 4) + 'px';
    fh.style.top = (rr.y + rr.h - 4) + 'px';
    const edges = document.getElementById('sel-edges');
    edges.hidden = mode !== 'ready' || extras.length > 0;
    placeBox(edges, rr);

    const ants = document.getElementById('copy-ants');
    if (ants && ants._R) {
        const here = ants._sheet === sh().id && (typeof clip !== 'undefined' && (clip || (typeof painterApply === 'function' && painterApply.pending)));
        ants.hidden = !here;
        if (here) placeBox(ants, rangeRect(ants._R), 1);
    }

    updateHeaders();
    if (opts.scroll) scrollIntoView(a.r, a.c);
    updateNameBox();
    if (mode === 'ready') updateFormulaBar();
    if (typeof updateStatus === 'function') updateStatus();
    if (typeof syncRibbonState === 'function') syncRibbonState();
    if (typeof positionEditorSink === 'function') positionEditorSink();
}

// A glowing streak shoots from the old cell to the new one on long jumps!
function comet(from, to, dist) {
    const ov = document.getElementById('ov');
    const fx = from.x + from.w / 2, fy = from.y + from.h / 2;
    const tx = to.x + to.w / 2, ty = to.y + to.h / 2;
    const el = document.createElement('div');
    el.className = 'comet';
    el.style.left = fx + 'px';
    el.style.top = fy + 'px';
    el.style.width = dist + 'px';
    el.style.transform = `rotate(${Math.atan2(ty - fy, tx - fx)}rad)`;
    ov.appendChild(el);
    removeAfterAnim(el);
}

// Effects clean themselves up when their animation ends (timer as a backstop)!
function removeAfterAnim(el, backstop) {
    el.addEventListener('animationend', (e) => { if (e.target === el) el.remove(); });
    setTimeout(() => el.remove(), backstop || 3000);
}

// Cells shimmer as a drag-selection sweeps over them!
let lastDragRange = null;
function shimmerNewCells(R) {
    if (!prefs.anim) { lastDragRange = R; return; }
    const P = lastDragRange;
    let n = 0;
    for (let r = R.r0; r <= R.r1 && n < 160; r++) {
        for (let c = R.c0; c <= R.c1 && n < 160; c++) {
            if (P && r >= P.r0 && r <= P.r1 && c >= P.c0 && c <= P.c1) continue;
            const td = cellEls[r] && cellEls[r][c];
            if (!td) continue;
            td.classList.remove('fx-tick');
            void td.offsetWidth;
            td.classList.add('fx-tick');
            clearTimeout(td._tickT);
            td._tickT = setTimeout(() => td.classList.remove('fx-tick'), 420);
            n++;
        }
    }
    lastDragRange = R;
}

function updateHeaders() {
    const s = sh();
    const cols = new Set(), rows = new Set(), fullC = new Set(), fullR = new Set();
    for (const R of allRanges()) {
        for (let c = R.c0; c <= R.c1; c++) { cols.add(c); if (R.r0 === 1 && R.r1 === s.rows) fullC.add(c); }
        for (let r = R.r0; r <= R.r1; r++) { rows.add(r); if (R.c0 === 0 && R.c1 === s.cols - 1) fullR.add(r); }
    }
    for (const c of lastHdr.cols) if (!cols.has(c) && colHdrEls[c]) colHdrEls[c].classList.remove('on', 'full');
    for (const r of lastHdr.rows) if (!rows.has(r) && rowHdrEls[r]) rowHdrEls[r].classList.remove('on', 'full');
    for (const c of cols) if (colHdrEls[c]) { colHdrEls[c].classList.add('on'); colHdrEls[c].classList.toggle('full', fullC.has(c)); }
    for (const r of rows) if (rowHdrEls[r]) { rowHdrEls[r].classList.add('on'); rowHdrEls[r].classList.toggle('full', fullR.has(r)); }
    lastHdr = { cols, rows };
}

function scrollIntoView(r, c) {
    const sc = scroller();
    if (!sc) return;
    const s = sh();
    const rect = { x: layout.colX[c], y: layout.rowY[r], w: layout.colX[c + 1] - layout.colX[c], h: layout.rowY[r + 1] - layout.rowY[r] };
    const left = layout.colX[s.freeze.c || 0];
    const top = layout.rowY[(s.freeze.r || 0) + 1];
    if (!(s.freeze.c && c < s.freeze.c)) {
        if (rect.x - left < sc.scrollLeft) sc.scrollLeft = rect.x - left;
        else if (rect.x + rect.w > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = rect.x + rect.w - sc.clientWidth;
    }
    if (!(s.freeze.r && r <= s.freeze.r)) {
        if (rect.y - top < sc.scrollTop) sc.scrollTop = rect.y - top;
        else if (rect.y + rect.h > sc.scrollTop + sc.clientHeight) sc.scrollTop = rect.y + rect.h - sc.clientHeight;
    }
}

function updateNameBox() {
    const nb = document.getElementById('name-box');
    if (!nb || document.activeElement === nb) return;
    const R = rng();
    if (drag && drag.kind === 'select' && rangeSize(R) > 1) nb.value = (R.r1 - R.r0 + 1) + 'R × ' + (R.c1 - R.c0 + 1) + 'C';
    else nb.value = idOf(sel.act.r, sel.act.c);
}

function updateFormulaBar() {
    const fi = document.getElementById('formula-input');
    if (!fi) return;
    const raw = sh().data[idOf(sel.act.r, sel.act.c)];
    fi.value = raw === undefined ? '' : String(raw);
    paintHighlight(fi, document.getElementById('fbar-hl'));
}

// Moving: arrows, Tab, Enter (inside a range it cycles like Excel)!
function moveAct(dr, dc, extend) {
    if (extend) {
        let f = { r: sel.focus.r + dr, c: sel.focus.c + dc };
        f = skipHidden(clampCell(f), dr, dc);
        sel.focus = f;
        drawSel({});
        scrollIntoView(f.r, f.c);
        return;
    }
    const p = skipHidden(clampCell({ r: sel.act.r + dr, c: sel.act.c + dc }), dr, dc);
    selectCell(p.r, p.c);
}

function skipHidden(p, dr, dc) {
    const s = sh();
    let guard = 0;
    while (dr && isRowHidden(p.r) && guard++ < s.rows) {
        const n = p.r + Math.sign(dr);
        if (n < 1 || n > s.rows) break;
        p.r = n;
    }
    while (dc && s.hiddenCols[p.c] && guard++ < s.cols * 2) {
        const n = p.c + Math.sign(dc);
        if (n < 0 || n >= s.cols) break;
        p.c = n;
    }
    return p;
}

function cycleInRange(dr, dc) {
    const R = rng();
    if (rangeSize(R) <= 1 || extras.length) {
        moveAct(dr, dc, false);
        return;
    }
    let { r, c } = sel.act;
    if (dc) {
        c += dc;
        if (c > R.c1) { c = R.c0; r++; if (r > R.r1) r = R.r0; }
        if (c < R.c0) { c = R.c1; r--; if (r < R.r0) r = R.r1; }
    } else {
        r += dr;
        if (r > R.r1) { r = R.r0; c++; if (c > R.c1) c = R.c0; }
        if (r < R.r0) { r = R.r1; c--; if (c < R.c0) c = R.c1; }
    }
    sel.act = { r, c };
    drawSel({ scroll: true });
}

function hasData(r, c) {
    const v = sh().data[idOf(r, c)];
    return v !== undefined && v !== '';
}

// Ctrl/Cmd + arrow: jump to the edge of the data block, like Excel!
function jumpEdge(dr, dc, extend) {
    const s = sh();
    const from = extend ? sel.focus : sel.act;
    let { r, c } = from;
    const inb = (rr, cc) => rr >= 1 && rr <= s.rows && cc >= 0 && cc < s.cols;
    const nr = r + dr, nc = c + dc;
    if (!inb(nr, nc)) return;
    if (hasData(r, c) && hasData(nr, nc)) {
        while (inb(r + dr, c + dc) && hasData(r + dr, c + dc)) { r += dr; c += dc; }
    } else {
        r = nr; c = nc;
        while (inb(r, c) && !hasData(r, c) && inb(r + dr, c + dc)) { r += dr; c += dc; }
    }
    if (extend) {
        sel.focus = { r, c };
        drawSel({});
        scrollIntoView(r, c);
    } else selectCell(r, c);
}

function usedBounds(s) {
    s = s || sh();
    let r1 = 0, c1 = -1;
    for (const k of Object.keys(s.data)) {
        if (s.data[k] === '') continue;
        const p = rcOf(k);
        if (p.r > r1) r1 = p.r;
        if (p.c > c1) c1 = p.c;
    }
    return { r1, c1 };
}

// The contiguous block of data around a cell (Ctrl+A, sort, charts, filters)!
function currentRegion(r, c) {
    const s = sh();
    let R = { r0: r, r1: r, c0: c, c1: c };
    let grew = true, guard = 0;
    while (grew && guard++ < 500) {
        grew = false;
        const rowHas = (rr) => { for (let cc = Math.max(0, R.c0 - 1); cc <= Math.min(s.cols - 1, R.c1 + 1); cc++) if (hasData(rr, cc)) return true; return false; };
        const colHas = (cc) => { for (let rr = Math.max(1, R.r0 - 1); rr <= Math.min(s.rows, R.r1 + 1); rr++) if (hasData(rr, cc)) return true; return false; };
        if (R.r0 > 1 && rowHas(R.r0 - 1)) { R.r0--; grew = true; }
        if (R.r1 < s.rows && rowHas(R.r1 + 1)) { R.r1++; grew = true; }
        if (R.c0 > 0 && colHas(R.c0 - 1)) { R.c0--; grew = true; }
        if (R.c1 < s.cols - 1 && colHas(R.c1 + 1)) { R.c1++; grew = true; }
    }
    return R;
}

// ==========================================
// CELL WRITES
// ==========================================
function setRaw(s, r, c, val) {
    const id = idOf(r, c);
    if (val === '' || val === null || val === undefined) delete s.data[id];
    else s.data[id] = String(val);
}

// Typing "12%", "$5", "10/18/2026" picks a number format automatically!
function autoFormat(s, r, c, val) {
    const id = idOf(r, c);
    if (typeof val !== 'string' || val === '' || val[0] === '=') return;
    const st = s.styles[id];
    if (st && st.fmt) return;
    const lit = FormulaEngine.parseLiteral(val);
    if (!lit.fmt || lit.fmt === 'text') return;
    const nst = Object.assign({}, st || {});
    nst.fmt = lit.fmt;
    if (lit.fmt === 'percent') nst.dec = /\.\d/.test(val) ? (val.split('.')[1] || '').replace(/\D/g, '').length : 0;
    if (lit.fmt === 'currency' || lit.fmt === 'comma') nst.dec = /\.\d/.test(val) ? 2 : 0;
    s.styles[id] = nst;
}

function setStyleProp(R, key, value) {
    const s = sh();
    for (let r = R.r0; r <= R.r1; r++) {
        for (let c = R.c0; c <= R.c1; c++) {
            const id = idOf(r, c);
            const st = Object.assign({}, s.styles[id] || {});
            if (value === null || value === undefined || value === false) delete st[key];
            else st[key] = value;
            if (Object.keys(st).length) s.styles[id] = st;
            else delete s.styles[id];
        }
    }
}

function forEachSelected(fn) {
    for (const R of allRanges()) {
        for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) fn(r, c, R);
    }
}

function clearContents(R, what) {
    what = what || 'contents';
    const s = sh();
    const ranges = R ? [R] : allRanges();
    let any = false;
    for (const Q of ranges) {
        for (let r = Q.r0; r <= Q.r1; r++) {
            for (let c = Q.c0; c <= Q.c1; c++) {
                const id = idOf(r, c);
                if ((what === 'contents' || what === 'all') && s.data[id] !== undefined) { delete s.data[id]; any = true; }
                if ((what === 'formats' || what === 'all') && s.styles[id]) { delete s.styles[id]; any = true; }
                if ((what === 'notes' || what === 'all') && s.notes[id]) { delete s.notes[id]; any = true; }
                if (what === 'all' && s.sparks[id]) { delete s.sparks[id]; any = true; }
            }
        }
    }
    return any;
}

function poof(R) {
    if (!prefs.anim) return;
    const ov = document.getElementById('ov');
    const el = document.createElement('div');
    el.className = 'fx-poof';
    placeBox(el, rangeRect(R));
    ov.appendChild(el);
    setTimeout(() => el.remove(), 520);
}

function deleteSelection() {
    const ranges = allRanges();
    const s = sh();
    const any = ranges.some(R => {
        for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) if (s.data[idOf(r, c)] !== undefined) return true;
        return false;
    });
    if (!any) return;
    ranges.forEach(poof);
    change(() => clearContents(null, 'contents'));
}

// ==========================================
// EDITING (in-cell editor + formula bar, with point mode)
// ==========================================
let edit = null;
let pointRef = null;
let tabStartCol = null;

function editorEl() {
    return document.getElementById('cell-editor');
}

function isEditing() {
    return mode === 'enter' || mode === 'edit' || mode === 'point';
}

function setMode(m) {
    mode = m;
    const lbl = { ready: 'Ready', enter: 'Enter', edit: 'Edit', point: 'Point' }[m];
    const el = document.getElementById('status-mode');
    if (el) el.textContent = lbl;
    document.body.classList.toggle('is-editing', m !== 'ready');
}

// The editor textarea doubles as the keyboard sink while not editing (so IME works)!
function positionEditorSink() {
    if (isEditing()) return;
    const wrap = document.getElementById('editor-wrap');
    if (!wrap) return;
    const r = cellRect(sel.act.r, sel.act.c);
    wrap.style.left = r.x + 'px';
    wrap.style.top = r.y + 'px';
}

function cellFontCss(st) {
    const z = zf();
    return {
        font: st.font || '',
        size: ((st.size || 13) * z).toFixed(2) + 'px',
        weight: st.b ? '700' : '400',
        style: st.i ? 'italic' : 'normal',
    };
}

function startEdit(opts) {
    opts = opts || {};
    if (isEditing()) return;
    const s = sh();
    const { r, c } = sel.act;
    const id = idOf(r, c);
    const raw = s.data[id];
    const st = s.styles[id] || {};
    if (st.check && opts.initial === undefined) { toggleCheckbox(r, c); return; }
    edit = { r, c, si: book.active, orig: raw === undefined ? '' : String(raw), via: opts.via || 'cell' };
    pointRef = null;
    const ed = editorEl();
    const wrap = document.getElementById('editor-wrap');
    const f = cellFontCss(st);
    wrap.style.fontFamily = f.font;
    wrap.style.fontSize = f.size;
    wrap.style.fontWeight = f.weight;
    wrap.style.fontStyle = f.style;
    wrap.style.color = st.color || '';
    wrap.style.background = st.fill && !/gradient/.test(st.fill) ? st.fill : '';
    wrap.classList.toggle('wrap', !!st.wrap);
    wrap.classList.toggle('a-right', st.align === 'right');
    wrap.classList.toggle('a-center', st.align === 'center');
    if (opts.initial !== undefined) ed.value = opts.initial;
    else ed.value = edit.orig;
    setMode(opts.initial !== undefined ? 'enter' : 'edit');
    wrap.classList.add('on');
    placeEditor();
    if (opts.via === 'bar') {
        document.getElementById('formula-input').focus();
    } else {
        ed.focus();
        const end = ed.value.length;
        ed.setSelectionRange(end, end);
    }
    syncBarFromEditor();
    drawSel({ animate: false });
    if (prefs.anim) restartAnim(wrap, 'pop-in');
    edInput();
}

function placeEditor() {
    if (!edit) return;
    const wrap = document.getElementById('editor-wrap');
    const ed = editorEl();
    const visible = edit.si === book.active;
    wrap.classList.toggle('away', !visible);
    if (!visible) return;
    const rect = cellRect(edit.r, edit.c);
    wrap.style.left = rect.x + 'px';
    wrap.style.top = rect.y + 'px';
    wrap.style.minWidth = rect.w + 'px';
    wrap.style.minHeight = rect.h + 'px';
    // Grow with the text, like Excel's in-cell editor!
    const meas = document.getElementById('edit-measure');
    meas.style.font = getComputedStyle(ed).font;
    const lines = ed.value.split('\n');
    let w = 0;
    for (const line of lines) {
        meas.textContent = line || ' ';
        w = Math.max(w, meas.offsetWidth);
    }
    const sc = scroller();
    const maxW = Math.max(rect.w, sc.scrollLeft + sc.clientWidth - rect.x - 8);
    const wrapOn = wrap.classList.contains('wrap');
    const width = wrapOn ? rect.w : Math.min(maxW, Math.max(rect.w, w + 14));
    wrap.style.width = width + 'px';
    ed.style.height = 'auto';
    ed.style.height = Math.max(rect.h, ed.scrollHeight) + 'px';
}

function syncBarFromEditor() {
    const fi = document.getElementById('formula-input');
    fi.value = editorEl().value;
    paintHighlight(fi, document.getElementById('fbar-hl'));
}

function syncEditorFromBar() {
    editorEl().value = document.getElementById('formula-input').value;
    placeEditor();
}

// Colors each reference in a formula (and its box on the grid)!
function formulaRefs(text) {
    if (!text || text[0] !== '=') return [];
    const refs = FormulaEngine.refsIn(text);
    const colorOf = {};
    let n = 0;
    return refs.map(x => {
        const key = x.text.toUpperCase().replace(/\$/g, '');
        if (!(key in colorOf)) colorOf[key] = REF_COLORS[n++ % REF_COLORS.length];
        return Object.assign({}, x, { color: colorOf[key] });
    });
}

function paintHighlight(input, hl) {
    if (!hl) return;
    const text = input.value;
    const isF = text[0] === '=' && !isKdText(text) && (isEditing() || input.id === 'formula-input');
    input.classList.toggle('hl-on', isF);
    hl.hidden = !isF;
    if (!isF) return;
    const refs = formulaRefs(text);
    let html = '', last = 0;
    const toks = FormulaEngine.tokensOf(text);
    const fnStarts = new Set();
    toks.forEach((t, i) => { if (t.t === 'ident' && toks[i + 1] && toks[i + 1].t === 'lp') fnStarts.add(t.s); });
    const marks = [];
    refs.forEach(x => marks.push({ s: x.s, e: x.e, style: `color:${x.color}` }));
    toks.forEach(t => {
        if (t.t === 'str') marks.push({ s: t.s, e: t.e, cls: 'tk-str' });
        else if (t.t === 'num') marks.push({ s: t.s, e: t.e, cls: 'tk-num' });
        else if (t.t === 'ident' && fnStarts.has(t.s)) marks.push({ s: t.s, e: t.e, cls: 'tk-fn' });
        else if (t.t === 'err') marks.push({ s: t.s, e: t.e, cls: 'tk-err' });
    });
    marks.sort((a, b) => a.s - b.s);
    for (const m of marks) {
        if (m.s < last) continue;
        html += escapeHtml(text.slice(last, m.s));
        html += `<span${m.cls ? ` class="${m.cls}"` : ''}${m.style ? ` style="${m.style}"` : ''}>${escapeHtml(text.slice(m.s, m.e))}</span>`;
        last = m.e;
    }
    html += escapeHtml(text.slice(last)) + '\n';
    hl.innerHTML = html;
    hl.scrollTop = input.scrollTop;
    hl.scrollLeft = input.scrollLeft;
}

function drawRefBoxes() {
    const layer = document.getElementById('ref-boxes');
    if (!layer) return;
    layer.innerHTML = '';
    if (!isEditing() || !edit) return;
    const text = editorEl().value;
    const curName = sh().name.toLowerCase();
    const editName = book.sheets[edit.si].name.toLowerCase();
    const s = sh();
    const seen = new Set();
    formulaRefs(text).forEach(x => {
        const target = x.ref.sheet ? x.ref.sheet.toLowerCase() : editName;
        if (target !== curName) return;
        const key = x.text.toUpperCase();
        if (seen.has(key)) return;
        seen.add(key);
        const R = { r0: Math.max(1, x.ref.r0), r1: Math.min(s.rows, x.ref.r1), c0: Math.max(0, x.ref.c0), c1: Math.min(s.cols - 1, x.ref.c1) };
        if (R.r0 > R.r1 || R.c0 > R.c1) return;
        const el = document.createElement('div');
        el.className = 'ref-box';
        el.style.setProperty('--rc', x.color);
        placeBox(el, rangeRect(R));
        layer.appendChild(el);
    });
}

function edInput(fromBar) {
    if (!isEditing()) return;
    if (fromBar) syncEditorFromBar(); else syncBarFromEditor();
    placeEditor();
    paintHighlight(editorEl(), document.getElementById('editor-hl'));
    drawRefBoxes();
    if (typeof updateAutocomplete === 'function') updateAutocomplete(fromBar ? document.getElementById('formula-input') : editorEl());
}

function activeInput() {
    return edit && edit.via === 'bar' ? document.getElementById('formula-input') : editorEl();
}

// Point mode: clicking cells while typing a formula drops in references!
function canPoint() {
    if (!isEditing() || !edit) return false;
    const inp = activeInput();
    const text = inp.value;
    if (text[0] !== '=' || isKdText(text)) return false;
    const caret = inp.selectionStart;
    if (inp.selectionEnd !== caret) return false;
    if (pointRef && caret === pointRef.e) return true;
    const before = text.slice(0, caret).replace(/\s+$/, '');
    if (before === '=') return true;
    const after = text.slice(caret);
    if (/^[A-Za-z0-9_.$]/.test(after)) return false;
    return /[(,;+\-*/^&=<>:]$/.test(before);
}

function insertPointRef(R, sheetIdx) {
    const inp = activeInput();
    const s = book.sheets[sheetIdx];
    let txt = rangeText(R);
    if (sheetIdx !== edit.si) {
        const nm = s.name;
        txt = (/^[A-Za-z_][\w.]*$/.test(nm) && !/^[A-Za-z]{1,3}\d+$/.test(nm) ? nm : "'" + nm.replace(/'/g, "''") + "'") + '!' + txt;
    }
    const caret = inp.selectionStart;
    let start = caret;
    if (pointRef && caret === pointRef.e) start = pointRef.s;
    inp.value = inp.value.slice(0, start) + txt + inp.value.slice(caret);
    const end = start + txt.length;
    inp.setSelectionRange(end, end);
    pointRef = { s: start, e: end, R, si: sheetIdx };
    setMode('point');
    edInput(inp.id === 'formula-input');
    pointRef = { s: start, e: end, R, si: sheetIdx };
}

// "=Y=hi=Y=" is Keydown gel-orb text, not a formula!
function isKdText(t) {
    return /^=[A-Z]{1,2}=/.test(t);
}

function closeParens(v) {
    if (v[0] !== '=' || isKdText(v)) return v;
    let depth = 0, inStr = false;
    for (const ch of v) {
        if (ch === '"') inStr = !inStr;
        else if (!inStr && ch === '(') depth++;
        else if (!inStr && ch === ')') depth--;
    }
    return depth > 0 && !inStr ? v + ')'.repeat(depth) : v;
}

// Commit: Enter/Tab/arrows. allCells = Ctrl/Cmd+Enter fills the whole selection!
function commitEdit(dr, dc, allCells) {
    if (!isEditing() || !edit) return;
    let val = closeParens(activeInput().value);
    if (val === '=') val = '';
    const E = edit;
    endEdit();
    if (book.active !== E.si) switchSheet(E.si, true);
    const s = book.sheets[E.si];
    const R = rng();
    const ranges = allRanges();
    const multi = allCells && (rangeSize(R) > 1 || extras.length);
    const single = rangeSize(R) <= 1 && !extras.length;
    const tabStart = tabStartCol;
    if (dc && single) tabStartCol = tabStartCol === null ? E.c : tabStartCol;
    else tabStartCol = null;
    const move = () => {
        if (dr > 0 && single && tabStart !== null) { selectCell(E.r + 1, tabStart); return; }
        if (dr || dc) cycleInRange(dr, dc);
    };
    if (!multi && val === E.orig) {
        move();
        return;
    }
    change(() => {
        if (multi) {
            for (const Q of ranges) {
                for (let r = Q.r0; r <= Q.r1; r++) {
                    for (let c = Q.c0; c <= Q.c1; c++) {
                        const v = val[0] === '=' ? FormulaEngine.shiftFormula(val, r - E.r, c - E.c) : val;
                        setRaw(s, r, c, v);
                        autoFormat(s, r, c, v);
                    }
                }
            }
        } else {
            setRaw(s, E.r, E.c, val);
            autoFormat(s, E.r, E.c, val);
        }
    }, { skipFlash: idOf(E.r, E.c) });
    if (multi) {
        for (const Q of ranges) for (let r = Q.r0; r <= Q.r1; r++) for (let c = Q.c0; c <= Q.c1; c++) animCell(r, c, 'in', ((r - Q.r0) + (c - Q.c0)) * 18);
    } else animCell(E.r, E.c, 'in');
    if (typeof autoGrowRow === 'function') autoGrowRow(E.r, E.c);
    move();
}

function cancelEdit() {
    if (!isEditing()) return;
    const si = edit.si;
    endEdit();
    if (book.active !== si) switchSheet(si, true);
    updateFormulaBar();
    drawSel({ animate: false });
}

function endEdit() {
    const wrap = document.getElementById('editor-wrap');
    wrap.classList.remove('on', 'away');
    const ed = editorEl();
    ed.value = '';
    ed.style.height = '';
    wrap.style.width = '';
    edit = null;
    pointRef = null;
    setMode('ready');
    document.getElementById('ref-boxes').innerHTML = '';
    if (typeof hideAutocomplete === 'function') hideAutocomplete();
    if (typeof hideKeydownBar === 'function') hideKeydownBar();
    paintHighlight(document.getElementById('formula-input'), document.getElementById('fbar-hl'));
    focusGrid();
}

function focusGrid() {
    const ed = editorEl();
    if (document.activeElement !== ed) ed.focus({ preventScroll: true });
}

function toggleCheckbox(r, c) {
    const s = sh();
    const id = idOf(r, c);
    const v = valueAt(r, c);
    const on = v === true || (typeof v === 'number' && v !== 0) || (typeof v === 'string' && v.toUpperCase() === 'TRUE');
    if (typeof s.data[id] === 'string' && s.data[id][0] === '=') { toast('That checkbox is driven by a formula!'); return; }
    change(() => setRaw(s, r, c, on ? 'FALSE' : 'TRUE'));
    animCell(r, c, 'pop');
    playAeroClickSound(on ? 500 : 760, 0.06);
}

// ==========================================
// KEYBOARD
// ==========================================
function isMac() {
    return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

function modKey(e) {
    return isMac() ? e.metaKey : e.ctrlKey;
}

function onSinkKeyDown(e) {
    if (typeof menuOpen === 'function' && menuOpen() && e.key === 'Escape') { closeMenus(); e.preventDefault(); return; }
    if (isEditing()) { onEditKeyDown(e); return; }
    const k = e.key;
    const mod = modKey(e);
    const pageRows = Math.max(1, Math.floor(scroller().clientHeight / (DEF_H * zf())) - 2);
    if (typeof handleShortcut === 'function' && handleShortcut(e)) { e.preventDefault(); return; }
    switch (k) {
        case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': {
            tabStartCol = null;
            const dr = k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0;
            const dc = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0;
            if (mod) jumpEdge(dr, dc, e.shiftKey);
            else moveAct(dr, dc, e.shiftKey);
            e.preventDefault();
            return;
        }
        case 'Tab': cycleInRange(0, e.shiftKey ? -1 : 1); e.preventDefault(); return;
        case 'Enter':
            if (mod) { startEdit(); e.preventDefault(); return; }
            cycleInRange(e.shiftKey ? -1 : 1, 0); e.preventDefault(); return;
        case 'Home':
            if (mod) selectCell(1, 0); else selectCell(sel.act.r, 0);
            e.preventDefault(); return;
        case 'End':
            if (mod) { const u = usedBounds(); selectCell(Math.max(1, u.r1), Math.max(0, u.c1)); e.preventDefault(); }
            return;
        case 'PageDown': case 'PageUp': {
            const d = k === 'PageDown' ? pageRows : -pageRows;
            if (e.altKey) moveAct(0, d > 0 ? 10 : -10, e.shiftKey);
            else moveAct(d, 0, e.shiftKey);
            e.preventDefault(); return;
        }
        case 'F2': startEdit(); e.preventDefault(); return;
        case 'Delete': case 'Backspace':
            if (k === 'Backspace' && !mod) {
                // Backspace clears the active cell and starts editing, like Excel!
                if (rangeSize(rng()) === 1 && !extras.length) { startEdit({ initial: '' }); e.preventDefault(); return; }
            }
            deleteSelection(); e.preventDefault(); return;
        case 'Escape':
            if (typeof clearClip === 'function') clearClip();
            if (typeof closeFind === 'function') closeFind();
            e.preventDefault(); return;
        case ' ':
            if (e.shiftKey && !mod) { selectRange({ r0: sel.act.r, r1: sel.act.r, c0: 0, c1: sh().cols - 1 }, { scroll: false }); e.preventDefault(); return; }
            if (e.ctrlKey) { selectRange({ r0: 1, r1: sh().rows, c0: sel.act.c, c1: sel.act.c }, { scroll: false }); e.preventDefault(); return; }
            if (sh().styles[idOf(sel.act.r, sel.act.c)] && sh().styles[idOf(sel.act.r, sel.act.c)].check) { toggleCheckbox(sel.act.r, sel.act.c); e.preventDefault(); return; }
            break;
    }
}

function onEditKeyDown(e) {
    const k = e.key;
    const mod = modKey(e);
    if (typeof autocompleteKey === 'function' && autocompleteKey(e)) return;
    if (k === 'Enter') {
        if (e.altKey || (e.ctrlKey && isMac())) {
            const inp = activeInput();
            const a = inp.selectionStart, b = inp.selectionEnd;
            inp.value = inp.value.slice(0, a) + '\n' + inp.value.slice(b);
            inp.setSelectionRange(a + 1, a + 1);
            edInput(inp.id === 'formula-input');
            e.preventDefault();
            return;
        }
        e.preventDefault();
        commitEdit(mod ? 0 : (e.shiftKey ? -1 : 1), 0, mod);
        return;
    }
    if (k === 'Tab') { e.preventDefault(); commitEdit(0, e.shiftKey ? -1 : 1); return; }
    if (k === 'Escape') { e.preventDefault(); cancelEdit(); return; }
    if (k === 'F2') { e.preventDefault(); setMode(mode === 'edit' ? 'enter' : 'edit'); return; }
    if (k === 'F4') { e.preventDefault(); toggleAbsolute(); return; }
    if (/^Arrow/.test(k) && (mode === 'enter' || mode === 'point')) {
        const dr = k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0;
        const dc = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0;
        if (canPoint()) {
            e.preventDefault();
            // Arrows walk a reference around; Shift+arrows stretch it into a range!
            let anchor = pointRef ? (pointRef.anchor || { r: pointRef.R.r0, c: pointRef.R.c0 }) : { r: edit.r, c: edit.c };
            let focus = pointRef ? (pointRef.focus || { r: pointRef.R.r1, c: pointRef.R.c1 }) : { r: edit.r, c: edit.c };
            if (e.shiftKey && pointRef) focus = clampCell({ r: focus.r + dr, c: focus.c + dc });
            else { anchor = clampCell({ r: anchor.r + dr, c: anchor.c + dc }); focus = { ...anchor }; }
            const R = { r0: Math.min(anchor.r, focus.r), r1: Math.max(anchor.r, focus.r), c0: Math.min(anchor.c, focus.c), c1: Math.max(anchor.c, focus.c) };
            insertPointRef(R, book.active);
            pointRef.anchor = anchor;
            pointRef.focus = focus;
            scrollIntoView(focus.r, focus.c);
            return;
        }
        if (mode === 'enter' && edit.via === 'cell' && !(dc && activeInput().value[0] === '=')) {
            e.preventDefault();
            commitEdit(dr, dc);
            return;
        }
    }
    if (mod && (k === 'b' || k === 'i' || k === 'u') && typeof wrapEditorSelection === 'function') {
        const marks = { b: ['**', '**'], i: ['*', '*'], u: ['~U~', '~U~'] }[k];
        if (wrapEditorSelection(marks[0], marks[1])) e.preventDefault();
    }
}

// F4 cycles A1 → $A$1 → A$1 → $A1 on the reference under the caret!
function toggleAbsolute() {
    const inp = activeInput();
    const text = inp.value;
    const caret = inp.selectionStart;
    const refs = FormulaEngine.refsIn(text);
    const hit = refs.find(x => caret >= x.s && caret <= x.e);
    if (!hit || hit.ref.kind !== 'cell') return;
    const bang = hit.text.lastIndexOf('!');
    const pre = bang >= 0 ? hit.text.slice(0, bang + 1) : '';
    const body = hit.text.slice(pre.length);
    const m = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(body);
    if (!m) return;
    const state = (m[1] ? 2 : 0) + (m[3] ? 1 : 0);
    const next = { 0: 3, 3: 1, 1: 2, 2: 0 }[state];
    const nb = (next & 2 ? '$' : '') + m[2] + (next & 1 ? '$' : '') + m[4];
    inp.value = text.slice(0, hit.s) + pre + nb + text.slice(hit.e);
    const end = hit.s + pre.length + nb.length;
    inp.setSelectionRange(end, end);
    edInput(inp.id === 'formula-input');
}

// ==========================================
// MOUSE: select, drag-select, headers, fill handle, move, resize
// ==========================================
function ripple(e) {
    if (!prefs.anim) return;
    const sc = scroller();
    const box = sc.getBoundingClientRect();
    const p = cellAtPoint(e.clientX, e.clientY);
    const cr = cellRect(p.r, p.c);
    const host = document.createElement('div');
    host.className = 'ripple-host';
    placeBox(host, cr);
    const dot = document.createElement('i');
    const s = sh();
    let x = e.clientX - box.left + sc.scrollLeft, y = e.clientY - box.top + sc.scrollTop;
    if (s.freeze.c && p.c < s.freeze.c) x = e.clientX - box.left + sc.scrollLeft;
    if (s.freeze.r && p.r <= s.freeze.r) y = e.clientY - box.top + sc.scrollTop;
    dot.style.left = (x - cr.x) + 'px';
    dot.style.top = (y - cr.y) + 'px';
    const size = Math.max(cr.w, cr.h) * 2.4;
    dot.style.width = dot.style.height = size + 'px';
    host.appendChild(dot);
    document.getElementById('ov').appendChild(host);
    setTimeout(() => host.remove(), 600);
}

function onGridMouseDown(e) {
    if (e.button === 1) return;
    const t = e.target;
    if (t.closest('.chart-obj') || t.closest('.note-pop')) return;
    if (t.closest('#editor-wrap') && isEditing()) return;
    if (typeof closeMenus === 'function') closeMenus();
    const rz = t.closest('.rz');
    if (rz && e.button === 0) { startResize(e, rz); return; }
    const fb = t.closest('.flt-btn');
    if (fb) { e.preventDefault(); if (typeof openFilterMenu === 'function') openFilterMenu(+fb.dataset.flt, fb); return; }
    if (t.closest('#fill-handle') && e.button === 0) { startFill(e); return; }
    if (t.closest('#sel-edges') && e.button === 0) { startMove(e); return; }
    const corner = t.closest('th.corner');
    if (corner) { e.preventDefault(); if (isEditing()) commitEdit(0, 0); selectRange({ r0: 1, r1: sh().rows, c0: 0, c1: sh().cols - 1 }, { scroll: false, shine: true }); return; }
    const ch = t.closest('th.ch');
    const rh = t.closest('th.rh');
    if (ch || rh) {
        e.preventDefault();
        if (isEditing()) {
            if (canPoint()) {
                const R = ch ? { r0: 1, r1: sh().rows, c0: +ch.dataset.c, c1: +ch.dataset.c } : { r0: +rh.dataset.r, r1: +rh.dataset.r, c0: 0, c1: sh().cols - 1 };
                insertPointRef(R, book.active);
                return;
            }
            commitEdit(0, 0);
        }
        if (e.button === 2) {
            const idx = ch ? +ch.dataset.c : +rh.dataset.r;
            const R = rng();
            const inside = ch ? (idx >= R.c0 && idx <= R.c1 && R.r0 === 1 && R.r1 === sh().rows) : (idx >= R.r0 && idx <= R.r1 && R.c0 === 0 && R.c1 === sh().cols - 1);
            if (inside) return;
        }
        const s = sh();
        if (ch) {
            const c = +ch.dataset.c;
            if (e.shiftKey) { sel.focus = { r: s.rows, c }; sel.anchor = { r: 1, c: sel.anchor.c }; }
            else {
                if (modKey(e)) extras.push(rng()); else extras = [];
                sel = { anchor: { r: 1, c }, focus: { r: s.rows, c }, act: { r: firstVisibleRow(), c } };
            }
            drag = { kind: 'hsel', axis: 'c', start: sel.anchor.c };
        } else {
            const r = +rh.dataset.r;
            if (e.shiftKey) { sel.focus = { r, c: s.cols - 1 }; sel.anchor = { r: sel.anchor.r, c: 0 }; }
            else {
                if (modKey(e)) extras.push(rng()); else extras = [];
                sel = { anchor: { r, c: 0 }, focus: { r, c: s.cols - 1 }, act: { r, c: 0 } };
            }
            drag = { kind: 'hsel', axis: 'r', start: sel.anchor.r };
        }
        drawSel({});
        bindDrag();
        return;
    }
    const td = t.closest('td[data-c]');
    if (!td && !t.closest('#ov')) return;
    e.preventDefault();
    const p = td ? { r: +td.dataset.r, c: +td.dataset.c } : cellAtPoint(e.clientX, e.clientY);
    if (!isEditing()) tabStartCol = null;

    if (isEditing()) {
        if (canPoint() || (pointRef && edit)) {
            if (canPoint()) {
                insertPointRef({ r0: p.r, r1: p.r, c0: p.c, c1: p.c }, book.active);
                pointRef.anchor = { ...p };
                pointRef.focus = { ...p };
                drag = { kind: 'point', anchor: p };
                bindDrag();
                return;
            }
        }
        if (edit && edit.si === book.active && p.r === edit.r && p.c === edit.c) return;
        commitEdit(0, 0);
    }
    if (e.target.closest('.xcb') && e.button === 0) {
        selectCell(p.r, p.c, { scroll: false });
        toggleCheckbox(p.r, p.c);
        return;
    }
    if (e.button === 2) {
        if (allRanges().some(R => inRange(R, p.r, p.c))) return;
        selectCell(p.r, p.c, { scroll: false });
        return;
    }
    if (e.shiftKey) {
        sel.focus = p;
        drawSel({});
    } else {
        if (modKey(e)) extras.push(rng()); else extras = [];
        sel = { anchor: { ...p }, focus: { ...p }, act: { ...p } };
        drawSel({});
        ripple(e);
    }
    if (typeof painterApply === 'function' && painterApply.pending) { drag = { kind: 'select', painter: true }; bindDrag(); return; }
    drag = { kind: 'select' };
    lastDragRange = rng();
    bindDrag();
    playAeroClickSound(880, 0.03);
}

function firstVisibleRow() {
    const sc = scroller();
    const top = sc.scrollTop + layout.rowY[1];
    let r = 1;
    while (r < sh().rows && layout.rowY[r + 1] <= top) r++;
    return r;
}

let autoScrollTimer = null;
let lastPointer = null;

function bindDrag() {
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragUp, { once: true });
}

function autoScroll() {
    if (!drag || !lastPointer) return;
    const sc = scroller();
    const box = sc.getBoundingClientRect();
    const { x, y } = lastPointer;
    let dx = 0, dy = 0;
    const edge = 24;
    if (x < box.left + layout.colX[0] + 4) dx = -Math.min(40, box.left + edge - x);
    else if (x > box.right - edge) dx = Math.min(40, x - (box.right - edge));
    if (y < box.top + layout.rowY[1] + 4) dy = -Math.min(40, box.top + edge - y);
    else if (y > box.bottom - edge) dy = Math.min(40, y - (box.bottom - edge));
    if (drag.kind === 'hsel' && drag.axis === 'c') dy = 0;
    if (drag.kind === 'hsel' && drag.axis === 'r') dx = 0;
    if (dx || dy) {
        sc.scrollLeft += dx;
        sc.scrollTop += dy;
        dragTo(x, y);
    }
    autoScrollTimer = requestAnimationFrame(autoScroll);
}

function onDragMove(e) {
    lastPointer = { x: e.clientX, y: e.clientY };
    if (!autoScrollTimer) autoScrollTimer = requestAnimationFrame(autoScroll);
    dragTo(e.clientX, e.clientY, e);
}

function dragTo(x, y, e) {
    if (!drag) return;
    const p = cellAtPoint(x, y);
    const s = sh();
    switch (drag.kind) {
        case 'select':
            if (sel.focus.r !== p.r || sel.focus.c !== p.c) {
                sel.focus = p;
                drawSel({});
                shimmerNewCells(rng());
            }
            break;
        case 'hsel':
            if (drag.axis === 'c') { if (sel.focus.c !== p.c) { sel.focus = { r: s.rows, c: p.c }; drawSel({}); } }
            else if (sel.focus.r !== p.r) { sel.focus = { r: p.r, c: s.cols - 1 }; drawSel({}); }
            break;
        case 'point': {
            const a = drag.anchor;
            const R = { r0: Math.min(a.r, p.r), r1: Math.max(a.r, p.r), c0: Math.min(a.c, p.c), c1: Math.max(a.c, p.c) };
            if (!pointRef || rangeText(pointRef.R) !== rangeText(R)) {
                insertPointRef(R, book.active);
                pointRef.anchor = a;
                pointRef.focus = p;
            }
            break;
        }
        case 'fill': fillDragTo(p); break;
        case 'move': moveDragTo(p, e); break;
        case 'resize': resizeDragTo(x, y); break;
    }
}

function onDragUp(e) {
    document.removeEventListener('mousemove', onDragMove);
    cancelAnimationFrame(autoScrollTimer);
    autoScrollTimer = null;
    lastPointer = null;
    const d = drag;
    drag = null;
    if (!d) return;
    switch (d.kind) {
        case 'select':
            drawSel({ shine: rangeSize(rng()) > 1 });
            if (d.painter && typeof painterApply === 'function') painterApply();
            focusGrid();
            break;
        case 'hsel': drawSel({ shine: true }); focusGrid(); break;
        case 'point': {
            const inp = activeInput();
            inp.focus();
            break;
        }
        case 'fill': finishFill(d); break;
        case 'move': finishMove(d); break;
        case 'resize': finishResize(d); break;
    }
}

// ---------- Fill handle (series, copies, shifted formulas) ----------
function startFill(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isEditing()) commitEdit(0, 0);
    drag = { kind: 'fill', src: rng(), target: null };
    const pv = document.getElementById('fill-preview');
    pv.hidden = false;
    placeBox(pv, rangeRect(drag.src));
    bindDrag();
}

function fillDragTo(p) {
    const S = drag.src;
    const s = sh();
    let T = { ...S };
    const below = p.r - S.r1, above = S.r0 - p.r, right = p.c - S.c1, left = S.c0 - p.c;
    const best = Math.max(below, above, right, left);
    if (best <= 0) T = { ...S };
    else if (best === below) T.r1 = p.r;
    else if (best === above) T.r0 = p.r;
    else if (best === right) T.c1 = p.c;
    else T.c0 = p.c;
    T.r1 = Math.min(T.r1, s.rows);
    T.c1 = Math.min(T.c1, s.cols - 1);
    drag.target = T;
    placeBox(document.getElementById('fill-preview'), rangeRect(T));
    const tip = document.getElementById('drag-tip');
    const preview = fillPreviewValue(S, T);
    if (preview !== null) {
        tip.hidden = false;
        tip.textContent = preview;
        const rr = rangeRect(T);
        tip.style.left = (rr.x + rr.w + 6) + 'px';
        tip.style.top = (rr.y + rr.h + 4) + 'px';
    } else tip.hidden = true;
}

const SERIES_LISTS = [
    MONTHS_SHORT, MONTHS_LONG, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DAYS_LONG,
    ['Q1', 'Q2', 'Q3', 'Q4'],
];

// Works out what comes next in a run of cells (numbers, dates, "Item 3", months...)!
function seriesFor(raws) {
    // raws: raw strings along the fill axis!
    const n = raws.length;
    const allNum = raws.every(x => x !== undefined && x !== '' && x[0] !== '=' && typeof FormulaEngine.parseLiteral(x).value === 'number');
    if (allNum && n >= 2) {
        const nums = raws.map(x => FormulaEngine.parseLiteral(x).value);
        const step = (nums[n - 1] - nums[0]) / (n - 1);
        return (k) => fmtSeriesNum(nums[0] + step * k, raws[0]);
    }
    if (allNum && n === 1) {
        const lit = FormulaEngine.parseLiteral(raws[0]);
        if (lit.fmt === 'date') return (k) => fmtSeriesNum(lit.value + k, raws[0]);
        return null;
    }
    if (n === 1 && raws[0] && raws[0][0] !== '=') {
        const t = raws[0];
        for (const list of SERIES_LISTS) {
            const i = list.findIndex(x => x.toLowerCase() === t.toLowerCase());
            if (i >= 0) {
                const caseFn = t === t.toUpperCase() ? (x) => x.toUpperCase() : t === t.toLowerCase() ? (x) => x.toLowerCase() : (x) => x;
                return (k) => caseFn(list[((i + k) % list.length + list.length) % list.length]);
            }
        }
        const m = /^(.*?)(\d+)(\D*)$/.exec(t);
        if (m && !/^\d+$/.test(t)) return (k) => m[1] + String(Math.max(0, +m[2] + k)).padStart(m[2].length, '0') + m[3];
    }
    if (n >= 2 && raws.every(x => x && x[0] !== '=')) {
        const ms = raws.map(x => /^(.*?)(\d+)(\D*)$/.exec(x));
        if (ms.every(m => m && m[1] === ms[0][1] && m[3] === ms[0][3])) {
            const a = +ms[0][2], step = (+ms[n - 1][2] - a) / (n - 1);
            if (Number.isInteger(step)) return (k) => ms[0][1] + (a + step * k) + ms[0][3];
        }
    }
    return null;
}

function fmtSeriesNum(v, sample) {
    const lit = FormulaEngine.parseLiteral(sample);
    if (lit.fmt === 'date') {
        const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
        if (/^\d{4}-/.test(sample.trim())) return d.toISOString().slice(0, 10);
        return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear();
    }
    if (lit.fmt === 'percent') return String(parseFloat((v * 100).toPrecision(12))) + '%';
    if (lit.fmt === 'currency') return '$' + String(parseFloat(v.toPrecision(12)));
    return String(parseFloat(v.toPrecision(12)));
}

// Computes the fill as a list of {r, c, raw, style} writes!
function planFill(S, T) {
    const s = sh();
    const out = [];
    const vertical = T.r0 !== S.r0 || T.r1 !== S.r1;
    if (vertical) {
        const down = T.r1 > S.r1;
        const h = S.r1 - S.r0 + 1;
        for (let c = S.c0; c <= S.c1; c++) {
            const raws = [], styles = [];
            for (let r = S.r0; r <= S.r1; r++) { raws.push(s.data[idOf(r, c)]); styles.push(s.styles[idOf(r, c)]); }
            const series = seriesFor(raws);
            const rows = down ? range(S.r1 + 1, T.r1) : range(T.r0, S.r0 - 1).reverse();
            rows.forEach((r, i) => {
                const k = down ? h + i : -(i + 1);
                const srcIdx = ((k % h) + h) % h;
                const srcR = S.r0 + srcIdx;
                const src = raws[srcIdx];
                let raw;
                if (series) raw = series(k);
                else if (src && src[0] === '=') raw = FormulaEngine.shiftFormula(src, r - srcR, 0);
                else raw = src;
                out.push({ r, c, raw, style: styles[srcIdx] });
            });
        }
    } else {
        const right = T.c1 > S.c1;
        const w = S.c1 - S.c0 + 1;
        for (let r = S.r0; r <= S.r1; r++) {
            const raws = [], styles = [];
            for (let c = S.c0; c <= S.c1; c++) { raws.push(s.data[idOf(r, c)]); styles.push(s.styles[idOf(r, c)]); }
            const series = seriesFor(raws);
            const cols = right ? range(S.c1 + 1, T.c1) : range(T.c0, S.c0 - 1).reverse();
            cols.forEach((c, i) => {
                const k = right ? w + i : -(i + 1);
                const srcIdx = ((k % w) + w) % w;
                const srcC = S.c0 + srcIdx;
                const src = raws[srcIdx];
                let raw;
                if (series) raw = series(k);
                else if (src && src[0] === '=') raw = FormulaEngine.shiftFormula(src, 0, c - srcC);
                else raw = src;
                out.push({ r, c, raw, style: styles[srcIdx] });
            });
        }
    }
    return out;
}

function range(a, b) {
    const o = [];
    for (let i = a; i <= b; i++) o.push(i);
    return o;
}

function fillPreviewValue(S, T) {
    if (T.r0 === S.r0 && T.r1 === S.r1 && T.c0 === S.c0 && T.c1 === S.c1) return null;
    const plan = planFill(S, T);
    if (!plan.length) return null;
    const last = plan[plan.length - 1];
    if (last.raw === undefined) return '(blank)';
    return String(last.raw).length > 28 ? String(last.raw).slice(0, 26) + '…' : String(last.raw);
}

function finishFill(d) {
    document.getElementById('fill-preview').hidden = true;
    document.getElementById('drag-tip').hidden = true;
    if (!d.target) return;
    applyFill(d.src, d.target);
}

function applyFill(S, T) {
    if (T.r0 === S.r0 && T.r1 === S.r1 && T.c0 === S.c0 && T.c1 === S.c1) return;
    const plan = planFill(S, T);
    const s = sh();
    change(() => {
        for (const w of plan) {
            setRaw(s, w.r, w.c, w.raw);
            const id = idOf(w.r, w.c);
            if (w.style) s.styles[id] = JSON.parse(JSON.stringify(w.style));
            else delete s.styles[id];
        }
        sel.anchor = { r: T.r0, c: T.c0 };
        sel.focus = { r: T.r1, c: T.c1 };
        sel.act = { r: S.r0, c: S.c0 };
    });
    // Cascade the new cells in, rippling away from the source!
    plan.slice(0, 400).forEach(w => {
        const dist = Math.max(Math.abs(w.r - (w.r > S.r1 ? S.r1 : S.r0)), Math.abs(w.c - (w.c > S.c1 ? S.c1 : S.c0)));
        animCell(w.r, w.c, 'in', Math.min(600, dist * 28));
    });
    drawSel({ shine: true });
}

// ---------- Move a block by dragging its border ----------
function startMove(e) {
    e.preventDefault();
    if (isEditing()) commitEdit(0, 0);
    const R = rng();
    const p = cellAtPoint(e.clientX, e.clientY);
    drag = { kind: 'move', src: R, grab: { r: p.r - R.r0, c: p.c - R.c0 }, dest: null };
    const g = document.getElementById('move-ghost');
    g.hidden = false;
    placeBox(g, rangeRect(R));
    document.body.classList.add('moving');
    bindDrag();
}

function moveDragTo(p, e) {
    const s = sh();
    const S = drag.src;
    const h = S.r1 - S.r0, w = S.c1 - S.c0;
    let r0 = Math.max(1, Math.min(s.rows - h, p.r - drag.grab.r));
    let c0 = Math.max(0, Math.min(s.cols - 1 - w, p.c - drag.grab.c));
    drag.dest = { r0, c0, r1: r0 + h, c1: c0 + w };
    drag.copy = !!(e && (e.altKey || modKey(e)));
    const g = document.getElementById('move-ghost');
    g.classList.toggle('copy', drag.copy);
    placeBox(g, rangeRect(drag.dest));
    const tip = document.getElementById('drag-tip');
    tip.hidden = false;
    tip.textContent = (drag.copy ? 'Copy to ' : '') + rangeText(drag.dest);
    const rr = rangeRect(drag.dest);
    tip.style.left = (rr.x + rr.w + 6) + 'px';
    tip.style.top = (rr.y + rr.h + 4) + 'px';
}

async function finishMove(d) {
    document.getElementById('move-ghost').hidden = true;
    document.getElementById('drag-tip').hidden = true;
    document.body.classList.remove('moving');
    if (!d.dest) return;
    const S = d.src, D = d.dest;
    if (S.r0 === D.r0 && S.c0 === D.c0) return;
    const s = sh();
    // Ask before covering data, like Excel!
    let covers = false;
    for (let r = D.r0; r <= D.r1 && !covers; r++) for (let c = D.c0; c <= D.c1; c++) if (!inRange(S, r, c) && hasData(r, c)) { covers = true; break; }
    if (covers && typeof confirmDialog === 'function') {
        const ok = await confirmDialog('Replace the data there?', 'There is already data in ' + rangeText(D) + '. Do you want to replace it?', 'Replace');
        if (!ok) return;
    }
    flyBlock(S, D);
    change(() => moveBlock(s, S, D, d.copy));
    sel = { anchor: { r: D.r0, c: D.c0 }, focus: { r: D.r1, c: D.c1 }, act: { r: D.r0 + (sel.act.r - S.r0), c: D.c0 + (sel.act.c - S.c0) } };
    drawSel({ shine: true });
    playAeroClickSound(700, 0.08);
}

function moveBlock(s, S, D, copy) {
    const cells = [];
    for (let r = S.r0; r <= S.r1; r++) {
        for (let c = S.c0; c <= S.c1; c++) {
            const id = idOf(r, c);
            cells.push({ dr: r - S.r0, dc: c - S.c0, raw: s.data[id], st: s.styles[id], note: s.notes[id], spark: s.sparks[id] });
            if (!copy) { delete s.data[id]; delete s.styles[id]; delete s.notes[id]; delete s.sparks[id]; }
        }
    }
    for (const x of cells) {
        const r = D.r0 + x.dr, c = D.c0 + x.dc;
        const id = idOf(r, c);
        let raw = x.raw;
        if (copy && raw && raw[0] === '=') raw = FormulaEngine.shiftFormula(raw, D.r0 - S.r0, D.c0 - S.c0);
        setRaw(s, r, c, raw);
        if (x.st) s.styles[id] = JSON.parse(JSON.stringify(x.st)); else delete s.styles[id];
        if (x.note) s.notes[id] = x.note; else delete s.notes[id];
        if (x.spark) s.sparks[id] = x.spark; else delete s.sparks[id];
    }
    if (!copy) followMove(s, S, D.r0 - S.r0, D.c0 - S.c0);
}

// Formulas anywhere in the workbook that pointed into a moved block follow it!
function followMove(s, S, dr, dc) {
    for (const other of book.sheets) {
        for (const k of Object.keys(other.data)) {
            const v = other.data[k];
            if (typeof v === 'string' && v[0] === '=') {
                other.data[k] = FormulaEngine.moveRefs(v, { sheet: s.name, formulaSheet: other.name, r0: S.r0, c0: S.c0, r1: S.r1, c1: S.c1, dr, dc });
            }
        }
    }
}

// FLIP-style flight: a snapshot of the block glides to its new home!
function flyBlock(S, D) {
    if (!prefs.anim) return;
    const ov = document.getElementById('ov');
    const from = rangeRect(S), to = rangeRect(D);
    const ghost = document.createElement('div');
    ghost.className = 'fly-block';
    placeBox(ghost, from);
    let html = '';
    for (let r = S.r0; r <= Math.min(S.r1, S.r0 + 60); r++) {
        const top = layout.rowY[r] - layout.rowY[S.r0];
        for (let c = S.c0; c <= Math.min(S.c1, S.c0 + 30); c++) {
            const td = cellEls[r][c];
            if (!td || !td.innerHTML) continue;
            const left = layout.colX[c] - layout.colX[S.c0];
            html += `<div class="fly-cell" style="left:${left}px;top:${top}px;width:${layout.colX[c + 1] - layout.colX[c]}px;height:${layout.rowY[r + 1] - layout.rowY[r]}px;${td.style.cssText.replace(/position:\s*sticky;?|top:[^;]+;|left:[^;]+;|z-index:[^;]+;/g, '')}">${td.innerHTML}</div>`;
        }
    }
    ghost.innerHTML = html;
    ov.appendChild(ghost);
    requestAnimationFrame(() => {
        ghost.style.transform = `translate(${to.x - from.x}px, ${to.y - from.y}px)`;
        ghost.classList.add('go');
    });
    setTimeout(() => ghost.remove(), 520);
}

// ---------- Column / row resize ----------
function startResize(e, rz) {
    e.preventDefault();
    e.stopPropagation();
    if (isEditing()) commitEdit(0, 0);
    const isCol = rz.classList.contains('rz-c');
    const idx = isCol ? +rz.dataset.c : +rz.dataset.r;
    if (e.detail === 2) { autoFit(isCol ? 'col' : 'row', idx); return; }
    const guide = document.getElementById('resize-guide');
    guide.hidden = false;
    guide.className = isCol ? 'col' : 'row';
    drag = { kind: 'resize', isCol, idx, start: isCol ? e.clientX : e.clientY, size: isCol ? colWidth(idx) : (sh().rowH[idx] || DEF_H), cur: null };
    resizeDragTo(e.clientX, e.clientY);
    bindDrag();
}

function resizeDragTo(x, y) {
    const d = drag;
    const delta = ((d.isCol ? x : y) - d.start) / zf();
    d.cur = Math.max(d.isCol ? 12 : 10, Math.round(d.size + delta));
    const guide = document.getElementById('resize-guide');
    const tip = document.getElementById('drag-tip');
    tip.hidden = false;
    if (d.isCol) {
        const gx = layout.colX[d.idx] + d.cur * zf();
        guide.style.left = gx + 'px';
        guide.style.top = scroller().scrollTop + 'px';
        tip.textContent = 'Width: ' + d.cur + 'px';
        tip.style.left = (gx + 6) + 'px';
        tip.style.top = (scroller().scrollTop + hdrH() + 4) + 'px';
    } else {
        const gy = layout.rowY[d.idx] + d.cur * zf();
        guide.style.top = gy + 'px';
        guide.style.left = scroller().scrollLeft + 'px';
        tip.textContent = 'Height: ' + d.cur + 'px';
        tip.style.left = (scroller().scrollLeft + hdrW() + 6) + 'px';
        tip.style.top = (gy + 4) + 'px';
    }
}

function finishResize(d) {
    document.getElementById('resize-guide').hidden = true;
    document.getElementById('drag-tip').hidden = true;
    if (d.cur === null) return;
    // Resizing one column inside a full-column selection resizes them all!
    const R = rng();
    const s = sh();
    let targets = [d.idx];
    if (d.isCol && R.r0 === 1 && R.r1 === s.rows && d.idx >= R.c0 && d.idx <= R.c1) targets = range(R.c0, R.c1);
    if (!d.isCol && R.c0 === 0 && R.c1 === s.cols - 1 && d.idx >= R.r0 && d.idx <= R.r1) targets = range(R.r0, R.r1);
    change(() => {
        for (const i of targets) {
            if (d.isCol) { if (d.cur === DEF_W) delete s.colW[i]; else s.colW[i] = d.cur; }
            else { if (d.cur === DEF_H) delete s.rowH[i]; else s.rowH[i] = d.cur; }
        }
    }, { rebuild: true });
}

function measureText(text, st) {
    const meas = document.getElementById('edit-measure');
    meas.style.font = `${st.i ? 'italic ' : ''}${st.b ? '700 ' : ''}${st.size || 13}px ${st.font || getComputedStyle(document.getElementById('grid')).fontFamily}`;
    meas.textContent = text;
    return meas.offsetWidth;
}

// Double-click a header border to fit the contents!
function autoFit(axis, idx, noUndo) {
    const s = sh();
    const run = () => {
        if (axis === 'col') {
            let w = 24;
            for (let r = 1; r <= s.rows; r++) {
                const t = displayText(r, idx);
                if (!t) continue;
                const st = s.styles[idOf(r, idx)] || {};
                w = Math.max(w, measureText(t.replace(/[~=#!&*`]{1,2}[A-Z0-9-]*[~=#]?/g, ''), st) + 16);
            }
            w = Math.min(600, Math.ceil(w));
            if (w === DEF_W) delete s.colW[idx]; else s.colW[idx] = w;
        } else {
            let h = DEF_H;
            for (let c = 0; c < s.cols; c++) {
                const st = s.styles[idOf(idx, c)] || {};
                const t = displayText(idx, c);
                if (!t) continue;
                const lines = st.wrap ? Math.ceil(measureText(t, st) / Math.max(20, colWidth(c) - 10)) : t.split('\n').length;
                h = Math.max(h, Math.ceil((st.size || 13) * 1.45 * lines + 6));
            }
            if (h === DEF_H) delete s.rowH[idx]; else s.rowH[idx] = h;
        }
    };
    if (noUndo) { run(); return; }
    change(run, { rebuild: true });
}

function autoGrowRow(r, c) {
    const s = sh();
    const st = s.styles[idOf(r, c)] || {};
    const t = displayText(r, c);
    if (!t) return;
    const need = st.wrap ? Math.ceil(measureText(t, st) / Math.max(20, colWidth(c) - 10)) * (st.size || 13) * 1.45 + 6
        : (t.split('\n').length) * (st.size || 13) * 1.45 + 6;
    if (need > (s.rowH[r] || DEF_H) + 1) {
        s.rowH[r] = Math.ceil(need);
        initGrid();
        persistSheets();
    }
}

// ==========================================
// SHEETS
// ==========================================
function switchSheet(i, keepEdit) {
    if (i === book.active || i < 0 || i >= book.sheets.length) return;
    if (!keepEdit && isEditing()) {
        if (canPoint()) keepEdit = true;
        else commitEdit(0, 0);
    }
    if (book.sheets[book.active]) book.sheets[book.active]._sel = JSON.parse(JSON.stringify(sel));
    book.active = i;
    filterHidden = {};
    lastActRect = null;
    sel = { anchor: { r: 1, c: 0 }, focus: { r: 1, c: 0 }, act: { r: 1, c: 0 } };
    extras = [];
    const s = sh();
    if (s._sel) { sel = JSON.parse(JSON.stringify(s._sel)); }
    initGrid();
    if (isEditing()) { placeEditor(); drawRefBoxes(); }
    renderSheetTabs();
    const inner = document.getElementById('grid-inner');
    if (prefs.anim) restartAnim(inner, 'sheet-in');
    scroller().scrollTop = 0;
    scroller().scrollLeft = 0;
    drawSel({ animate: false, scroll: true });
    persistSheets();
}

function renderSheetTabs() {
    if (typeof drawSheetTabs === 'function') drawSheetTabs();
}

// ==========================================
// TOAST
// ==========================================
function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}

// ==========================================
// BOOT
// ==========================================
function boot() {
    restoreSheets();
    applyPrefs();
    recalc();
    const s = sh();
    if (s._sel) sel = JSON.parse(JSON.stringify(s._sel));
    sel.anchor = clampCell(sel.anchor);
    sel.focus = clampCell(sel.focus);
    sel.act = clampCell(sel.act);
    if (typeof buildUi === 'function') buildUi();
    initGrid();
    renderSheetTabs();
    wireCore();
    updateUndoButtons();
    focusGrid();
    drawSel({ animate: false, scroll: true });
    if (firstVisit) setTimeout(() => toast('Welcome to the new Imbuer! File → New has templates to try!'), 700);
}

function applyPrefs() {
    document.body.classList.toggle('dark', !!prefs.dark);
    document.body.classList.toggle('no-anim', !prefs.anim);
    document.body.classList.toggle('no-grid', !prefs.gridlines);
    document.body.classList.toggle('no-heads', !prefs.headings);
    document.body.classList.toggle('no-fbar', !prefs.formulaBar);
    document.body.classList.toggle('show-formulas', !!prefs.showFormulas);
    document.body.classList.toggle('layout-classic', prefs.layout === 'classic');
    document.body.classList.toggle('side-collapsed', !!prefs.sideCollapsed);
}

function wireCore() {
    const sc = scroller();
    const inner = document.getElementById('grid-inner');
    inner.addEventListener('mousedown', onGridMouseDown);
    inner.addEventListener('dblclick', (e) => {
        if (e.target.closest('.rz') || e.target.closest('.chart-obj') || e.target.closest('th')) return;
        const td = e.target.closest('td[data-c]');
        if (!td || isEditing()) return;
        selectCell(+td.dataset.r, +td.dataset.c, { scroll: false });
        if (e.target.closest('.xcb')) return;
        startEdit();
    });
    const ed = editorEl();
    ed.addEventListener('keydown', onSinkKeyDown);
    ed.addEventListener('input', () => {
        if (!isEditing()) {
            // Typing while a cell is selected starts a fresh entry!
            const v = ed.value;
            ed.value = '';
            startEdit({ initial: v });
            return;
        }
        if (pointRef && ed.selectionStart !== pointRef.e) pointRef = null;
        if (mode === 'point') setMode('enter');
        edInput(false);
    });
    ed.addEventListener('compositionstart', () => {
        if (!isEditing()) startEdit({ initial: '' });
    });
    ed.addEventListener('select', () => { if (typeof checkKeydownBar === 'function') checkKeydownBar(); });
    ed.addEventListener('keyup', () => { if (typeof checkKeydownBar === 'function') checkKeydownBar(); if (isEditing() && typeof updateAutocomplete === 'function') updateAutocomplete(ed, true); });
    ed.addEventListener('mouseup', () => { if (typeof checkKeydownBar === 'function') checkKeydownBar(); });
    ed.addEventListener('scroll', () => paintHighlight(ed, document.getElementById('editor-hl')));

    const fi = document.getElementById('formula-input');
    fi.addEventListener('focus', () => {
        if (!isEditing()) startEdit({ via: 'bar' });
        else if (edit) edit.via = 'bar';
    });
    fi.addEventListener('input', () => {
        if (!isEditing()) startEdit({ via: 'bar' });
        if (pointRef && fi.selectionStart !== pointRef.e) pointRef = null;
        if (mode === 'point') setMode('enter');
        edInput(true);
    });
    fi.addEventListener('keydown', (e) => {
        if (!isEditing()) return;
        onEditKeyDown(e);
    });
    fi.addEventListener('keyup', () => { if (typeof checkKeydownBar === 'function') checkKeydownBar(); if (isEditing() && typeof updateAutocomplete === 'function') updateAutocomplete(fi, true); });
    fi.addEventListener('select', () => { if (typeof checkKeydownBar === 'function') checkKeydownBar(); });
    fi.addEventListener('scroll', () => paintHighlight(fi, document.getElementById('fbar-hl')));

    sc.addEventListener('scroll', () => {
        const f = sh().freeze;
        if (f.r || f.c) { drawSel({ animate: false }); if (isEditing()) { placeEditor(); drawRefBoxes(); } }
        if (typeof onGridScroll === 'function') onGridScroll();
    });
    window.addEventListener('resize', () => { if (isEditing()) placeEditor(); });

    // Clipboard events land on the focused sink textarea!
    document.addEventListener('copy', (e) => { if (!isEditing() && typeof onCopy === 'function') onCopy(e, false); });
    document.addEventListener('cut', (e) => { if (!isEditing() && typeof onCopy === 'function') onCopy(e, true); });
    document.addEventListener('paste', (e) => { if (!isEditing() && typeof onPaste === 'function') onPaste(e); });

    // Keep the keyboard sink focused when clicking empty chrome!
    document.addEventListener('mouseup', () => {
        setTimeout(() => {
            const a = document.activeElement;
            if (!isEditing() && (!a || a === document.body)) focusGrid();
        }, 0);
    });
    window.addEventListener('beforeunload', saveNow);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}

// Export helpers for build-time testing in Node!
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getColumnName, parseCellId, applyKeydownFormatting, keydownDefinitions, keydownMarkersFor,
        formatValue, fmtGeneral, seriesFor, escapeHtml,
    };
}
