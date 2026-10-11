// ==========================================
// KEYDOWN FULL ENGINE (ported from Writeout!)!
// 172 core triggers + 412 marketplace triggers + 22 ::blocks!
// Static renderer: escape HTML, swap tokens for spans, restore!
// Interactive applets wire up via click delegation + sounds!
// ==========================================

function kdEscapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const KD_CORE = [{"o": "=Y=", "c": "=Y=", "cls": "gel-orb gel-y", "tag": null, "flags": []}, {"o": "=R=", "c": "=R=", "cls": "gel-orb gel-r", "tag": null, "flags": []}, {"o": "=G=", "c": "=G=", "cls": "gel-orb gel-g", "tag": null, "flags": []}, {"o": "=C=", "c": "=C=", "cls": "gel-orb gel-c", "tag": null, "flags": []}, {"o": "=B=", "c": "=B=", "cls": "gel-orb gel-b", "tag": null, "flags": []}, {"o": "=V=", "c": "=V=", "cls": "gel-orb gel-v", "tag": null, "flags": []}, {"o": "=P=", "c": "=P=", "cls": "gel-orb gel-p", "tag": null, "flags": []}, {"o": "=O=", "c": "=O=", "cls": "gel-orb gel-o", "tag": null, "flags": []}, {"o": "=MG=", "c": "=MG=", "cls": "gel-orb gel-mg", "tag": null, "flags": []}, {"o": "=LM=", "c": "=LM=", "cls": "gel-orb gel-lm", "tag": null, "flags": []}, {"o": "=AQ=", "c": "=AQ=", "cls": "gel-orb gel-aq", "tag": null, "flags": []}, {"o": "=SL=", "c": "=SL=", "cls": "gel-orb gel-sl", "tag": null, "flags": []}, {"o": "&&", "c": "&&", "cls": "spark-text", "tag": null, "flags": []}, {"o": "~G~", "c": "~G~", "cls": "gel-green-flash", "tag": null, "flags": []}, {"o": "~U~", "c": "~U~", "cls": "liquid-underline", "tag": null, "flags": []}, {"o": "~B~", "c": "~B~", "cls": "glossy-border-badge", "tag": null, "flags": []}, {"o": "~S~", "c": "~S~", "cls": "cyber-glow-spark", "tag": null, "flags": []}, {"o": "~L~", "c": "~L~", "cls": "liquid-text-glow", "tag": null, "flags": []}, {"o": "~M~", "c": "~M~", "cls": "reflected-text-block", "tag": null, "flags": ["isMirror"]}, {"o": "~E~", "c": "~E~", "cls": "embossed-glass-text", "tag": null, "flags": []}, {"o": "~W~", "c": "~W~", "cls": "kinetic-wave-text", "tag": null, "flags": ["isWave"]}, {"o": "`", "c": "`", "cls": null, "tag": "code", "flags": []}, {"o": "**", "c": "**", "cls": null, "tag": "strong", "flags": []}, {"o": "*", "c": "*", "cls": null, "tag": "em", "flags": ["isItalic"]}, {"o": "!#A#", "c": "#", "cls": "aero-tag-chip tag-chip-a", "tag": null, "flags": []}, {"o": "!#G#", "c": "#", "cls": "aero-tag-chip tag-chip-g", "tag": null, "flags": []}, {"o": "!#O#", "c": "#", "cls": "aero-tag-chip tag-chip-o", "tag": null, "flags": []}, {"o": "!#R#", "c": "#", "cls": "aero-tag-chip tag-chip-r", "tag": null, "flags": []}, {"o": "!#PR#", "c": "#", "cls": "aero-tag-chip tag-chip-pr", "tag": null, "flags": []}, {"o": "!#PK#", "c": "#", "cls": "aero-tag-chip tag-chip-pk", "tag": null, "flags": []}, {"o": "!#Y#", "c": "#", "cls": "aero-tag-chip tag-chip-y", "tag": null, "flags": []}, {"o": "!#SL#", "c": "#", "cls": "aero-tag-chip tag-chip-sl", "tag": null, "flags": []}, {"o": "#C#", "c": "#", "cls": "gel-bubble-chip gel-chip-cyan", "tag": null, "flags": []}, {"o": "#O#", "c": "#", "cls": "gel-bubble-chip gel-chip-orange", "tag": null, "flags": []}, {"o": "#G#", "c": "#", "cls": "gel-bubble-chip gel-chip-green", "tag": null, "flags": []}, {"o": "#R#", "c": "#", "cls": "gel-bubble-chip gel-chip-red", "tag": null, "flags": []}, {"o": "#PR#", "c": "#", "cls": "gel-bubble-chip gel-chip-purple", "tag": null, "flags": []}, {"o": "#PK#", "c": "#", "cls": "gel-bubble-chip gel-chip-pink", "tag": null, "flags": []}, {"o": "#Y#", "c": "#", "cls": "gel-bubble-chip gel-chip-yellow", "tag": null, "flags": []}, {"o": "#B#", "c": "#", "cls": "gel-bubble-chip gel-chip-blue", "tag": null, "flags": []}, {"o": "#L#", "c": "#", "cls": "gel-bubble-chip gel-chip-lime", "tag": null, "flags": []}, {"o": "#T#", "c": "#", "cls": "gel-bubble-chip gel-chip-teal", "tag": null, "flags": []}, {"o": "#GL#", "c": "#", "cls": "gel-bubble-chip gel-chip-gold", "tag": null, "flags": []}, {"o": "#SL#", "c": "#", "cls": "gel-bubble-chip gel-chip-slate", "tag": null, "flags": []}, {"o": "#W#", "c": "#", "cls": "gel-bubble-chip gel-chip-white", "tag": null, "flags": []}, {"o": "#BK#", "c": "#", "cls": "gel-bubble-chip gel-chip-black", "tag": null, "flags": []}, {"o": "#FG#", "c": "#", "cls": "gel-bubble-chip gel-chip-fog", "tag": null, "flags": []}, {"o": "#TU#", "c": "#", "cls": "gel-bubble-chip gel-chip-turquoise", "tag": null, "flags": []}, {"o": "~WD~", "c": "~WD~", "cls": "gel-chip-waterdrop", "tag": null, "flags": []}, {"o": "~SF~", "c": "~SF~", "cls": "gel-chip-solarflare", "tag": null, "flags": []}, {"o": "~AW~", "c": "~AW~", "cls": "gel-chip-aurorawave", "tag": null, "flags": []}, {"o": "~FN~", "c": "~FN~", "cls": "applet-foldout-tab", "tag": null, "flags": ["isFoldout"]}, {"o": "~TS~", "c": "~TS~", "cls": "applet-aqua-switch", "tag": null, "flags": ["isToggle"]}, {"o": "~SM~", "c": "~SM~", "cls": "applet-glass-stamp", "tag": null, "flags": []}, {"o": "~TB~", "c": "~TB~", "cls": "applet-state-button state-green", "tag": null, "flags": ["isStateToggle"]}, {"o": "~VD~", "c": "~VD~", "cls": "applet-volume-dial", "tag": null, "flags": ["isVolumeDial"]}, {"o": "~BC~", "c": "~BC~", "cls": "applet-battery-cell", "tag": null, "flags": ["isBatteryCell"]}, {"o": "~CD~", "c": "~CD~", "cls": "applet-calendar-desk", "tag": null, "flags": ["isCalendarDesk"]}, {"o": "~SR~", "c": "~SR~", "cls": "applet-star-rating", "tag": null, "flags": ["isStarRating"]}, {"o": "~CC~", "c": "~CC~", "cls": "applet-counter-badge", "tag": null, "flags": ["isCounterBadge"]}, {"o": "~LK~", "c": "~LK~", "cls": "applet-security-latch", "tag": null, "flags": ["isSecurityLatch"]}, {"o": "~PR~", "c": "~PR~", "cls": "applet-playback-ribbon", "tag": null, "flags": ["isPlaybackRibbon"]}, {"o": "~CR~", "c": "~CR~", "cls": "applet-cpu-gauge", "tag": null, "flags": ["isCpuGauge"]}, {"o": "~SI~", "c": "~SI~", "cls": "applet-stepper-mesh", "tag": null, "flags": ["isStepperMesh"]}, {"o": "~MP~", "c": "~MP~", "cls": "effect-mercury-pearl", "tag": null, "flags": []}, {"o": "~PG~", "c": "~PG~", "cls": "effect-prism-refract", "tag": null, "flags": []}, {"o": "~CB~", "c": "~CB~", "cls": "effect-screen-cavity", "tag": null, "flags": []}, {"o": "~SR~", "c": "~SR~", "cls": "effect-sunlight-ray", "tag": null, "flags": []}, {"o": "~OA~", "c": "~OA~", "cls": "effect-abyssal-plate", "tag": null, "flags": []}, {"o": "~MM~", "c": "~MM~", "cls": "effect-metallic-mesh", "tag": null, "flags": []}, {"o": "~FE~", "c": "~FE~", "cls": "effect-fluid-expand", "tag": null, "flags": []}, {"o": "~MR~", "c": "~MR~", "cls": "effect-metric-cavity", "tag": null, "flags": []}, {"o": "~PO~", "c": "~PO~", "cls": "effect-pearl-orb", "tag": null, "flags": []}, {"o": "~LF~", "c": "~LF~", "cls": "effect-lens-flare", "tag": null, "flags": []}, {"o": "~DS~", "c": "~DS~", "cls": "effect-drop-shadow-window", "tag": null, "flags": []}, {"o": "~GL~", "c": "~GL~", "cls": "effect-glow-tube", "tag": null, "flags": []}, {"o": "~HB~", "c": "~HB~", "cls": "effect-hardware-bevel", "tag": null, "flags": []}, {"o": "~IS~", "c": "~IS~", "cls": "effect-screen-segment", "tag": null, "flags": []}, {"o": "~GC~", "c": "~GC~", "cls": "effect-gel-capsule", "tag": null, "flags": []}, {"o": "~KO~", "c": "~KO~", "cls": "effect-fluid-orbit", "tag": null, "flags": []}, {"o": "~XG~", "c": "~XG~", "cls": "effect-xray-glass", "tag": null, "flags": []}, {"o": "~ORB~", "c": "~ORB~", "cls": "applet-hydro-orb orb-blue", "tag": null, "flags": ["isHydroOrb"]}, {"o": "~WL~", "c": "~WL~", "cls": "effect-waveform-line", "tag": null, "flags": []}, {"o": "~PM~", "c": "~PM~", "cls": "effect-plasma-gel", "tag": null, "flags": []}, {"o": "~SLS~", "c": "~SLS~", "cls": "applet-lock-slider", "tag": null, "flags": ["isLockSlider"]}, {"o": "~VM~", "c": "~VM~", "cls": "applet-gadget-clock", "tag": null, "flags": ["isGadclock"]}, {"o": "~WB~", "c": "~WB~", "cls": "effect-water-bubble", "tag": null, "flags": []}, {"o": "~GLO~", "c": "~GLO~", "cls": "effect-glow-tracer", "tag": null, "flags": []}, {"o": "~MT~", "c": "~MT~", "cls": "applet-metal-trigger", "tag": null, "flags": ["isMetalTrigger"]}, {"o": "~IC~", "c": "~IC~", "cls": "applet-inset-check", "tag": null, "flags": ["isInsetCheck"]}, {"o": "~ST~", "c": "~ST~", "cls": "effect-shimmer-title", "tag": null, "flags": []}, {"o": "~WD-Y~", "c": "~", "cls": "droplet-amber", "tag": null, "flags": []}, {"o": "~WD-R~", "c": "~", "cls": "droplet-crimson", "tag": null, "flags": []}, {"o": "~WD-PK~", "c": "~", "cls": "droplet-fuchsia", "tag": null, "flags": []}, {"o": "~WD-PR~", "c": "~", "cls": "droplet-amethyst", "tag": null, "flags": []}, {"o": "~WD-O~", "c": "~", "cls": "droplet-tangerine", "tag": null, "flags": []}, {"o": "~WD-SL~", "c": "~", "cls": "droplet-slate", "tag": null, "flags": []}, {"o": "~FUNC~", "c": "~FUNC~", "cls": "dev-chip-function", "tag": null, "flags": []}, {"o": "~VAR~", "c": "~VAR~", "cls": "dev-chip-variable", "tag": null, "flags": []}, {"o": "~HEX~", "c": "~HEX~", "cls": "dev-chip-hex", "tag": null, "flags": ["isHexSwatch"]}, {"o": "~STR~", "c": "~STR~", "cls": "dev-chip-string", "tag": null, "flags": []}, {"o": "~RS~", "c": "~RS~", "cls": "av-chip-radar-sweep", "tag": null, "flags": []}, {"o": "~HD~", "c": "~HD~", "cls": "av-chip-heading", "tag": null, "flags": []}, {"o": "~AL~", "c": "~AL~", "cls": "av-chip-altimeter", "tag": null, "flags": []}, {"o": "~SG~", "c": "~SG~", "cls": "av-chip-signal", "tag": null, "flags": ["isSignalNode"]}, {"o": "~PP-C~", "c": "~", "cls": "megachip-plasma plasma-cyan", "tag": null, "flags": []}, {"o": "~PP-O~", "c": "~", "cls": "megachip-plasma plasma-orange", "tag": null, "flags": []}, {"o": "~PP-R~", "c": "~", "cls": "megachip-plasma plasma-crimson", "tag": null, "flags": []}, {"o": "~PP-L~", "c": "~", "cls": "megachip-plasma plasma-lime", "tag": null, "flags": []}, {"o": "~GB-B~", "c": "~", "cls": "megachip-glass-bracket bracket-blue", "tag": null, "flags": []}, {"o": "~GB-PR~", "c": "~", "cls": "megachip-glass-bracket bracket-amethyst", "tag": null, "flags": []}, {"o": "~GB-PK~", "c": "~", "cls": "megachip-glass-bracket bracket-fuchsia", "tag": null, "flags": []}, {"o": "~GB-Y~", "c": "~", "cls": "megachip-glass-bracket bracket-amber", "tag": null, "flags": []}, {"o": "~CN-SL~", "c": "~", "cls": "megachip-circuit-node circuit-slate", "tag": null, "flags": ["isCircuitNode"]}, {"o": "~CN-T~", "c": "~", "cls": "megachip-circuit-node circuit-teal", "tag": null, "flags": ["isCircuitNode"]}, {"o": "~CN-GL~", "c": "~", "cls": "megachip-circuit-node circuit-gold", "tag": null, "flags": ["isCircuitNode"]}, {"o": "~CN-R~", "c": "~", "cls": "megachip-circuit-node circuit-ruby", "tag": null, "flags": ["isCircuitNode"]}, {"o": "~DR~", "c": "~DR~", "cls": "jr-chip-date-plate", "tag": null, "flags": []}, {"o": "~MD~", "c": "~MD~", "cls": "jr-chip-mood", "tag": null, "flags": []}, {"o": "~VO~", "c": "~VO~", "cls": "jr-chip-voice-tag", "tag": null, "flags": ["isVoiceTag"]}, {"o": "~WX~", "c": "~WX~", "cls": "jr-chip-weather", "tag": null, "flags": []}, {"o": "~WS~", "c": "~WS~", "cls": "jr-chip-wax-stamp", "tag": null, "flags": ["isWaxStamp"]}, {"o": "~B-B~", "c": "~", "cls": "aero-glass-badge-chip badge-frame-sky", "tag": null, "flags": []}, {"o": "~B-G~", "c": "~", "cls": "aero-glass-badge-chip badge-frame-emerald", "tag": null, "flags": []}, {"o": "~B-O~", "c": "~", "cls": "aero-glass-badge-chip badge-frame-orange", "tag": null, "flags": []}, {"o": "~B-R~", "c": "~", "cls": "aero-glass-badge-chip badge-frame-crimson", "tag": null, "flags": []}, {"o": "~B-PR~", "c": "~", "cls": "aero-glass-badge-chip badge-frame-amethyst", "tag": null, "flags": []}, {"o": "~B-Y~", "c": "~", "cls": "aero-glass-badge-chip badge-frame-gold", "tag": null, "flags": []}, {"o": "~TL~", "c": "~TL~", "cls": "effect-tinted-lens", "tag": null, "flags": []}, {"o": "~NO~", "c": "~NO~", "cls": "applet-neon-node node-cyan", "tag": null, "flags": ["isNeonNode"]}, {"o": "~SL~", "c": "~SL~", "cls": "effect-audio-stream-loop", "tag": null, "flags": []}, {"o": "~BG~", "c": "~BG~", "cls": "effect-biogel-capsule", "tag": null, "flags": []}, {"o": "~LS~", "c": "~LS~", "cls": "applet-latch-toggle", "tag": null, "flags": ["isLatchToggle"]}, {"o": "~TIM~", "c": "~TIM~", "cls": "applet-gadget-system-clock", "tag": null, "flags": ["isSystemGadclock"]}, {"o": "~FT~", "c": "~FT~", "cls": "jr-folder-tab", "tag": null, "flags": []}, {"o": "~PT~", "c": "~PT~", "cls": "jr-progress-capsule", "tag": null, "flags": ["isProgCapsule"]}, {"o": "~MC~", "c": "~MC~", "cls": "jr-digital-counter", "tag": null, "flags": []}, {"o": "~RD~", "c": "~RD~", "cls": "jr-dot-matrix", "tag": null, "flags": ["isDotMatrix"]}, {"o": "~LL~", "c": "~ST~", "cls": "jr-latch-lock", "tag": null, "flags": ["isLatchLock"]}, {"o": "~WR~", "c": "~WR~", "cls": "effect-neon-ribbon", "tag": null, "flags": []}, {"o": "~DH-B~", "c": "~", "cls": "aero-duplex-input-chassis duplex-chassis-sky", "tag": null, "flags": ["isMultiDuplex"]}, {"o": "~DH-G~", "c": "~", "cls": "aero-duplex-input-chassis duplex-chassis-emerald", "tag": null, "flags": ["isMultiDuplex"]}, {"o": "~DH-O~", "c": "~", "cls": "aero-duplex-input-chassis duplex-chassis-orange", "tag": null, "flags": ["isMultiDuplex"]}, {"o": "~DH-PR~", "c": "~", "cls": "aero-duplex-input-chassis duplex-chassis-amethyst", "tag": null, "flags": ["isMultiDuplex"]}, {"o": "~SH-B~", "c": "~", "cls": "gel-chip-swayed swayed-sky", "tag": null, "flags": []}, {"o": "~SH-G~", "c": "~", "cls": "gel-chip-swayed swayed-emerald", "tag": null, "flags": []}, {"o": "~SH-O~", "c": "~", "cls": "gel-chip-swayed swayed-orange", "tag": null, "flags": []}, {"o": "~SH-PR~", "c": "~", "cls": "gel-chip-swayed swayed-amethyst", "tag": null, "flags": []}, {"o": "~PH-B~", "c": "~", "cls": "gel-chip-pill-variant pill-sky", "tag": null, "flags": []}, {"o": "~PH-G~", "c": "~", "cls": "gel-chip-pill-variant pill-emerald", "tag": null, "flags": []}, {"o": "~PH-O~", "c": "~", "cls": "gel-chip-pill-variant pill-orange", "tag": null, "flags": []}, {"o": "~PH-PR~", "c": "~", "cls": "gel-chip-pill-variant pill-amethyst", "tag": null, "flags": []}, {"o": "~PC-Y~", "c": "~", "cls": "gel-chip-pastel pastel-yellow", "tag": null, "flags": []}, {"o": "~PC-B~", "c": "~", "cls": "gel-chip-pastel pastel-blue", "tag": null, "flags": []}, {"o": "~PC-G~", "c": "~", "cls": "gel-chip-pastel pastel-green", "tag": null, "flags": []}, {"o": "~PC-PK~", "c": "~", "cls": "gel-chip-pastel pastel-pink", "tag": null, "flags": []}, {"o": "~PC-PR~", "c": "~", "cls": "gel-chip-pastel pastel-purple", "tag": null, "flags": []}, {"o": "~PC-O~", "c": "~", "cls": "gel-chip-pastel pastel-orange", "tag": null, "flags": []}, {"o": "~DR-O~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-tangerine", "tag": null, "flags": []}, {"o": "~DR-Y~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-citrus", "tag": null, "flags": []}, {"o": "~DR-G~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-emerald", "tag": null, "flags": []}, {"o": "~DR-B~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-sapphire", "tag": null, "flags": []}, {"o": "~DR-PR~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-amethyst", "tag": null, "flags": []}, {"o": "~DR-PK~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-fuchsia", "tag": null, "flags": []}, {"o": "~DR-R~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-crimson", "tag": null, "flags": []}, {"o": "~DR-SL~", "c": "~", "cls": "gel-chip-droplet-ribbon droplet-ribbon-slate", "tag": null, "flags": []}, {"o": "~H1~", "c": "~H1~", "cls": "header-1", "tag": null, "flags": []}, {"o": "~H2~", "c": "~H2~", "cls": "header-2", "tag": null, "flags": []}, {"o": "~H3~", "c": "~H3~", "cls": "header-3", "tag": null, "flags": []}, {"o": "~BQ~", "c": "~BQ~", "cls": "blockquote-list", "tag": null, "flags": []}, {"o": "~BUL~", "c": "~BUL~", "cls": "bulleted-list", "tag": null, "flags": []}, {"o": "~MH~", "c": "~MH~", "cls": "mega-header", "tag": null, "flags": []}];
const KD_MKT = [{"o": "~AU10~", "c": "~AU10~", "cls": "mkt-autumn-orchard"}, {"o": "~AU1~", "c": "~AU1~", "cls": "mkt-autumn-harvest"}, {"o": "~AU2~", "c": "~AU2~", "cls": "mkt-autumn-pumpkin"}, {"o": "~AU3~", "c": "~AU3~", "cls": "mkt-autumn-cider"}, {"o": "~AU4~", "c": "~AU4~", "cls": "mkt-autumn-candy"}, {"o": "~AU5~", "c": "~AU5~", "cls": "mkt-autumn-leaves"}, {"o": "~AU6~", "c": "~AU6~", "cls": "mkt-autumn-golden"}, {"o": "~AU7~", "c": "~AU7~", "cls": "mkt-autumn-bonfire"}, {"o": "~AU8~", "c": "~AU8~", "cls": "mkt-autumn-frost"}, {"o": "~AU9~", "c": "~AU9~", "cls": "mkt-autumn-flannel"}, {"o": "~BB10~", "c": "~BB10~", "cls": "mkt-bubble-green"}, {"o": "~BB11~", "c": "~BB11~", "cls": "mkt-bubble-emerald"}, {"o": "~BB12~", "c": "~BB12~", "cls": "mkt-bubble-mint"}, {"o": "~BB13~", "c": "~BB13~", "cls": "mkt-bubble-teal"}, {"o": "~BB14~", "c": "~BB14~", "cls": "mkt-bubble-turquoise"}, {"o": "~BB15~", "c": "~BB15~", "cls": "mkt-bubble-cyan"}, {"o": "~BB16~", "c": "~BB16~", "cls": "mkt-bubble-sky"}, {"o": "~BB17~", "c": "~BB17~", "cls": "mkt-bubble-blue"}, {"o": "~BB18~", "c": "~BB18~", "cls": "mkt-bubble-navy"}, {"o": "~BB19~", "c": "~BB19~", "cls": "mkt-bubble-indigo"}, {"o": "~BB1~", "c": "~BB1~", "cls": "mkt-bubble-red"}, {"o": "~BB20~", "c": "~BB20~", "cls": "mkt-bubble-violet"}, {"o": "~BB21~", "c": "~BB21~", "cls": "mkt-bubble-purple"}, {"o": "~BB22~", "c": "~BB22~", "cls": "mkt-bubble-lavender"}, {"o": "~BB23~", "c": "~BB23~", "cls": "mkt-bubble-fuchsia"}, {"o": "~BB24~", "c": "~BB24~", "cls": "mkt-bubble-pink"}, {"o": "~BB25~", "c": "~BB25~", "cls": "mkt-bubble-rose"}, {"o": "~BB26~", "c": "~BB26~", "cls": "mkt-bubble-brown"}, {"o": "~BB27~", "c": "~BB27~", "cls": "mkt-bubble-white"}, {"o": "~BB28~", "c": "~BB28~", "cls": "mkt-bubble-fog"}, {"o": "~BB29~", "c": "~BB29~", "cls": "mkt-bubble-slate"}, {"o": "~BB2~", "c": "~BB2~", "cls": "mkt-bubble-coral"}, {"o": "~BB30~", "c": "~BB30~", "cls": "mkt-bubble-black"}, {"o": "~BB3~", "c": "~BB3~", "cls": "mkt-bubble-orange"}, {"o": "~BB4~", "c": "~BB4~", "cls": "mkt-bubble-amber"}, {"o": "~BB5~", "c": "~BB5~", "cls": "mkt-bubble-gold"}, {"o": "~BB6~", "c": "~BB6~", "cls": "mkt-bubble-yellow"}, {"o": "~BB7~", "c": "~BB7~", "cls": "mkt-bubble-cream"}, {"o": "~BB8~", "c": "~BB8~", "cls": "mkt-bubble-lime"}, {"o": "~BB9~", "c": "~BB9~", "cls": "mkt-bubble-olive"}, {"o": "~BL10~", "c": "~BL10~", "cls": "blue-hl-10"}, {"o": "~BL11~", "c": "~BL11~", "cls": "blue-hl-11"}, {"o": "~BL12~", "c": "~BL12~", "cls": "blue-hl-12"}, {"o": "~BL13~", "c": "~BL13~", "cls": "blue-hl-13"}, {"o": "~BL14~", "c": "~BL14~", "cls": "blue-hl-14"}, {"o": "~BL15~", "c": "~BL15~", "cls": "blue-hl-15"}, {"o": "~BL16~", "c": "~BL16~", "cls": "blue-hl-16"}, {"o": "~BL17~", "c": "~BL17~", "cls": "blue-hl-17"}, {"o": "~BL18~", "c": "~BL18~", "cls": "blue-hl-18"}, {"o": "~BL19~", "c": "~BL19~", "cls": "blue-hl-19"}, {"o": "~BL1~", "c": "~BL1~", "cls": "blue-hl-1"}, {"o": "~BL20~", "c": "~BL20~", "cls": "blue-hl-20"}, {"o": "~BL21~", "c": "~BL21~", "cls": "blue-hl-21"}, {"o": "~BL22~", "c": "~BL22~", "cls": "blue-hl-22"}, {"o": "~BL23~", "c": "~BL23~", "cls": "blue-hl-23"}, {"o": "~BL24~", "c": "~BL24~", "cls": "blue-hl-24"}, {"o": "~BL25~", "c": "~BL25~", "cls": "blue-hl-25"}, {"o": "~BL26~", "c": "~BL26~", "cls": "blue-hl-26"}, {"o": "~BL27~", "c": "~BL27~", "cls": "blue-hl-27"}, {"o": "~BL28~", "c": "~BL28~", "cls": "blue-hl-28"}, {"o": "~BL29~", "c": "~BL29~", "cls": "blue-hl-29"}, {"o": "~BL2~", "c": "~BL2~", "cls": "blue-hl-2"}, {"o": "~BL30~", "c": "~BL30~", "cls": "blue-hl-30"}, {"o": "~BL31~", "c": "~BL31~", "cls": "blue-hl-31"}, {"o": "~BL32~", "c": "~BL32~", "cls": "blue-hl-32"}, {"o": "~BL33~", "c": "~BL33~", "cls": "blue-hl-33"}, {"o": "~BL34~", "c": "~BL34~", "cls": "blue-hl-34"}, {"o": "~BL35~", "c": "~BL35~", "cls": "blue-hl-35"}, {"o": "~BL36~", "c": "~BL36~", "cls": "blue-hl-36"}, {"o": "~BL37~", "c": "~BL37~", "cls": "blue-hl-37"}, {"o": "~BL38~", "c": "~BL38~", "cls": "blue-hl-38"}, {"o": "~BL39~", "c": "~BL39~", "cls": "blue-hl-39"}, {"o": "~BL3~", "c": "~BL3~", "cls": "blue-hl-3"}, {"o": "~BL40~", "c": "~BL40~", "cls": "blue-hl-40"}, {"o": "~BL41~", "c": "~BL41~", "cls": "blue-hl-41"}, {"o": "~BL42~", "c": "~BL42~", "cls": "blue-hl-42"}, {"o": "~BL43~", "c": "~BL43~", "cls": "blue-hl-43"}, {"o": "~BL44~", "c": "~BL44~", "cls": "blue-hl-44"}, {"o": "~BL45~", "c": "~BL45~", "cls": "blue-hl-45"}, {"o": "~BL46~", "c": "~BL46~", "cls": "blue-hl-46"}, {"o": "~BL47~", "c": "~BL47~", "cls": "blue-hl-47"}, {"o": "~BL48~", "c": "~BL48~", "cls": "blue-hl-48"}, {"o": "~BL49~", "c": "~BL49~", "cls": "blue-hl-49"}, {"o": "~BL4~", "c": "~BL4~", "cls": "blue-hl-4"}, {"o": "~BL50~", "c": "~BL50~", "cls": "blue-hl-50"}, {"o": "~BL5~", "c": "~BL5~", "cls": "blue-hl-5"}, {"o": "~BL6~", "c": "~BL6~", "cls": "blue-hl-6"}, {"o": "~BL7~", "c": "~BL7~", "cls": "blue-hl-7"}, {"o": "~BL8~", "c": "~BL8~", "cls": "blue-hl-8"}, {"o": "~BL9~", "c": "~BL9~", "cls": "blue-hl-9"}, {"o": "~BP10~", "c": "~BP10~", "cls": "bcp-marker"}, {"o": "~BP1~", "c": "~BP1~", "cls": "bcp-tide"}, {"o": "~BP2~", "c": "~BP2~", "cls": "bcp-highlighter"}, {"o": "~BP3~", "c": "~BP3~", "cls": "bcp-bevel"}, {"o": "~BP4~", "c": "~BP4~", "cls": "bcp-stitch"}, {"o": "~BP5~", "c": "~BP5~", "cls": "bcp-scan"}, {"o": "~BP6~", "c": "~BP6~", "cls": "bcp-hatch"}, {"o": "~BP7~", "c": "~BP7~", "cls": "bcp-emboss"}, {"o": "~BP8~", "c": "~BP8~", "cls": "bcp-halo"}, {"o": "~BP9~", "c": "~BP9~", "cls": "bcp-dots"}, {"o": "~CANDY~", "c": "~CANDY~", "cls": "mkt-kp-candy"}, {"o": "~CHROME~", "c": "~CHROME~", "cls": "mkt-chrome-capsule"}, {"o": "~CPA~", "c": "~CPA~", "cls": "mkt-cp-amber"}, {"o": "~CPB~", "c": "~CPB~", "cls": "mkt-cp-blue"}, {"o": "~CPC~", "c": "~CPC~", "cls": "mkt-cp-cyan"}, {"o": "~CPE~", "c": "~CPE~", "cls": "mkt-cp-emerald"}, {"o": "~CPF~", "c": "~CPF~", "cls": "mkt-cp-fuchsia"}, {"o": "~CPG~", "c": "~CPG~", "cls": "mkt-cp-green"}, {"o": "~CPI~", "c": "~CPI~", "cls": "mkt-cp-indigo"}, {"o": "~CPL~", "c": "~CPL~", "cls": "mkt-cp-lime"}, {"o": "~CPO~", "c": "~CPO~", "cls": "mkt-cp-orange"}, {"o": "~CPP~", "c": "~CPP~", "cls": "mkt-cp-pink"}, {"o": "~CPQ~", "c": "~CPQ~", "cls": "mkt-cp-slate"}, {"o": "~CPR~", "c": "~CPR~", "cls": "mkt-cp-red"}, {"o": "~CPS~", "c": "~CPS~", "cls": "mkt-cp-sky"}, {"o": "~CPT~", "c": "~CPT~", "cls": "mkt-cp-teal"}, {"o": "~CPV~", "c": "~CPV~", "cls": "mkt-cp-violet"}, {"o": "~CPY~", "c": "~CPY~", "cls": "mkt-cp-yellow"}, {"o": "~DW10~", "c": "~DW10~", "cls": "mkt-dew-teal"}, {"o": "~DW11~", "c": "~DW11~", "cls": "mkt-dew-gold"}, {"o": "~DW12~", "c": "~DW12~", "cls": "mkt-dew-slate"}, {"o": "~DW13~", "c": "~DW13~", "cls": "mkt-dew-white"}, {"o": "~DW14~", "c": "~DW14~", "cls": "mkt-dew-black"}, {"o": "~DW15~", "c": "~DW15~", "cls": "mkt-dew-fog"}, {"o": "~DW16~", "c": "~DW16~", "cls": "mkt-dew-turquoise"}, {"o": "~DW1~", "c": "~DW1~", "cls": "mkt-dew-cyan"}, {"o": "~DW2~", "c": "~DW2~", "cls": "mkt-dew-orange"}, {"o": "~DW3~", "c": "~DW3~", "cls": "mkt-dew-green"}, {"o": "~DW4~", "c": "~DW4~", "cls": "mkt-dew-red"}, {"o": "~DW5~", "c": "~DW5~", "cls": "mkt-dew-purple"}, {"o": "~DW6~", "c": "~DW6~", "cls": "mkt-dew-pink"}, {"o": "~DW7~", "c": "~DW7~", "cls": "mkt-dew-yellow"}, {"o": "~DW8~", "c": "~DW8~", "cls": "mkt-dew-blue"}, {"o": "~DW9~", "c": "~DW9~", "cls": "mkt-dew-lime"}, {"o": "~FOAM~", "c": "~FOAM~", "cls": "mkt-kp-foam"}, {"o": "~FR10~", "c": "~FR10~", "cls": "mkt-fruit-peach"}, {"o": "~FR11~", "c": "~FR11~", "cls": "mkt-fruit-pear"}, {"o": "~FR12~", "c": "~FR12~", "cls": "mkt-fruit-plum"}, {"o": "~FR13~", "c": "~FR13~", "cls": "mkt-fruit-kiwi"}, {"o": "~FR14~", "c": "~FR14~", "cls": "mkt-fruit-pineapple"}, {"o": "~FR15~", "c": "~FR15~", "cls": "mkt-fruit-watermelon"}, {"o": "~FR16~", "c": "~FR16~", "cls": "mkt-fruit-banana"}, {"o": "~FR17~", "c": "~FR17~", "cls": "mkt-fruit-coconut"}, {"o": "~FR18~", "c": "~FR18~", "cls": "mkt-fruit-raspberry"}, {"o": "~FR19~", "c": "~FR19~", "cls": "mkt-fruit-blackberry"}, {"o": "~FR1~", "c": "~FR1~", "cls": "mkt-fruit-apple"}, {"o": "~FR20~", "c": "~FR20~", "cls": "mkt-fruit-pomegranate"}, {"o": "~FR2~", "c": "~FR2~", "cls": "mkt-fruit-mango"}, {"o": "~FR3~", "c": "~FR3~", "cls": "mkt-fruit-grape"}, {"o": "~FR4~", "c": "~FR4~", "cls": "mkt-fruit-strawberry"}, {"o": "~FR5~", "c": "~FR5~", "cls": "mkt-fruit-blueberry"}, {"o": "~FR6~", "c": "~FR6~", "cls": "mkt-fruit-orange"}, {"o": "~FR7~", "c": "~FR7~", "cls": "mkt-fruit-lemon"}, {"o": "~FR8~", "c": "~FR8~", "cls": "mkt-fruit-lime"}, {"o": "~FR9~", "c": "~FR9~", "cls": "mkt-fruit-cherry"}, {"o": "~FROST~", "c": "~FROST~", "cls": "mkt-kp-frost"}, {"o": "~GOLD~", "c": "~GOLD~", "cls": "mkt-kp-gold"}, {"o": "~GR10~", "c": "~GR10~", "cls": "green-hl-10"}, {"o": "~GR11~", "c": "~GR11~", "cls": "green-hl-11"}, {"o": "~GR12~", "c": "~GR12~", "cls": "green-hl-12"}, {"o": "~GR13~", "c": "~GR13~", "cls": "green-hl-13"}, {"o": "~GR14~", "c": "~GR14~", "cls": "green-hl-14"}, {"o": "~GR15~", "c": "~GR15~", "cls": "green-hl-15"}, {"o": "~GR16~", "c": "~GR16~", "cls": "green-hl-16"}, {"o": "~GR17~", "c": "~GR17~", "cls": "green-hl-17"}, {"o": "~GR18~", "c": "~GR18~", "cls": "green-hl-18"}, {"o": "~GR19~", "c": "~GR19~", "cls": "green-hl-19"}, {"o": "~GR1~", "c": "~GR1~", "cls": "green-hl-1"}, {"o": "~GR20~", "c": "~GR20~", "cls": "green-hl-20"}, {"o": "~GR21~", "c": "~GR21~", "cls": "green-hl-21"}, {"o": "~GR22~", "c": "~GR22~", "cls": "green-hl-22"}, {"o": "~GR23~", "c": "~GR23~", "cls": "green-hl-23"}, {"o": "~GR24~", "c": "~GR24~", "cls": "green-hl-24"}, {"o": "~GR25~", "c": "~GR25~", "cls": "green-hl-25"}, {"o": "~GR26~", "c": "~GR26~", "cls": "green-hl-26"}, {"o": "~GR27~", "c": "~GR27~", "cls": "green-hl-27"}, {"o": "~GR28~", "c": "~GR28~", "cls": "green-hl-28"}, {"o": "~GR29~", "c": "~GR29~", "cls": "green-hl-29"}, {"o": "~GR2~", "c": "~GR2~", "cls": "green-hl-2"}, {"o": "~GR30~", "c": "~GR30~", "cls": "green-hl-30"}, {"o": "~GR31~", "c": "~GR31~", "cls": "green-hl-31"}, {"o": "~GR32~", "c": "~GR32~", "cls": "green-hl-32"}, {"o": "~GR33~", "c": "~GR33~", "cls": "green-hl-33"}, {"o": "~GR34~", "c": "~GR34~", "cls": "green-hl-34"}, {"o": "~GR35~", "c": "~GR35~", "cls": "green-hl-35"}, {"o": "~GR36~", "c": "~GR36~", "cls": "green-hl-36"}, {"o": "~GR37~", "c": "~GR37~", "cls": "green-hl-37"}, {"o": "~GR38~", "c": "~GR38~", "cls": "green-hl-38"}, {"o": "~GR39~", "c": "~GR39~", "cls": "green-hl-39"}, {"o": "~GR3~", "c": "~GR3~", "cls": "green-hl-3"}, {"o": "~GR40~", "c": "~GR40~", "cls": "green-hl-40"}, {"o": "~GR41~", "c": "~GR41~", "cls": "green-hl-41"}, {"o": "~GR42~", "c": "~GR42~", "cls": "green-hl-42"}, {"o": "~GR43~", "c": "~GR43~", "cls": "green-hl-43"}, {"o": "~GR44~", "c": "~GR44~", "cls": "green-hl-44"}, {"o": "~GR45~", "c": "~GR45~", "cls": "green-hl-45"}, {"o": "~GR46~", "c": "~GR46~", "cls": "green-hl-46"}, {"o": "~GR47~", "c": "~GR47~", "cls": "green-hl-47"}, {"o": "~GR48~", "c": "~GR48~", "cls": "green-hl-48"}, {"o": "~GR49~", "c": "~GR49~", "cls": "green-hl-49"}, {"o": "~GR4~", "c": "~GR4~", "cls": "green-hl-4"}, {"o": "~GR50~", "c": "~GR50~", "cls": "green-hl-50"}, {"o": "~GR5~", "c": "~GR5~", "cls": "green-hl-5"}, {"o": "~GR6~", "c": "~GR6~", "cls": "green-hl-6"}, {"o": "~GR7~", "c": "~GR7~", "cls": "green-hl-7"}, {"o": "~GR8~", "c": "~GR8~", "cls": "green-hl-8"}, {"o": "~GR9~", "c": "~GR9~", "cls": "green-hl-9"}, {"o": "~GRAPE~", "c": "~GRAPE~", "cls": "mkt-kp-grape"}, {"o": "~GUM~", "c": "~GUM~", "cls": "mkt-kp-gum"}, {"o": "~HK10~", "c": "~HK10~", "cls": "mkt-hacker-panic"}, {"o": "~HK11~", "c": "~HK11~", "cls": "mkt-hacker-null"}, {"o": "~HK12~", "c": "~HK12~", "cls": "mkt-hacker-bitflip"}, {"o": "~HK13~", "c": "~HK13~", "cls": "mkt-hacker-firewall"}, {"o": "~HK14~", "c": "~HK14~", "cls": "mkt-hacker-darknet"}, {"o": "~HK15~", "c": "~HK15~", "cls": "mkt-hacker-sniffer"}, {"o": "~HK16~", "c": "~HK16~", "cls": "mkt-hacker-overclock"}, {"o": "~HK17~", "c": "~HK17~", "cls": "mkt-hacker-leak"}, {"o": "~HK18~", "c": "~HK18~", "cls": "mkt-hacker-zeroday"}, {"o": "~HK19~", "c": "~HK19~", "cls": "mkt-hacker-backdoor"}, {"o": "~HK1~", "c": "~HK1~", "cls": "mkt-hacker-prompt"}, {"o": "~HK20~", "c": "~HK20~", "cls": "mkt-hacker-cipher"}, {"o": "~HK21~", "c": "~HK21~", "cls": "mkt-hacker-daemon"}, {"o": "~HK22~", "c": "~HK22~", "cls": "mkt-hacker-fork"}, {"o": "~HK23~", "c": "~HK23~", "cls": "mkt-hacker-segfault"}, {"o": "~HK24~", "c": "~HK24~", "cls": "mkt-hacker-uptime"}, {"o": "~HK25~", "c": "~HK25~", "cls": "mkt-hacker-latency"}, {"o": "~HK26~", "c": "~HK26~", "cls": "mkt-hacker-mainframe"}, {"o": "~HK27~", "c": "~HK27~", "cls": "mkt-hacker-punchcard"}, {"o": "~HK28~", "c": "~HK28~", "cls": "mkt-hacker-turing"}, {"o": "~HK29~", "c": "~HK29~", "cls": "mkt-hacker-quantum"}, {"o": "~HK2~", "c": "~HK2~", "cls": "mkt-hacker-matrix"}, {"o": "~HK30~", "c": "~HK30~", "cls": "mkt-hacker-sudo"}, {"o": "~HK3~", "c": "~HK3~", "cls": "mkt-hacker-amber"}, {"o": "~HK4~", "c": "~HK4~", "cls": "mkt-hacker-scan"}, {"o": "~HK5~", "c": "~HK5~", "cls": "mkt-hacker-alert"}, {"o": "~HK6~", "c": "~HK6~", "cls": "mkt-hacker-hex"}, {"o": "~HK7~", "c": "~HK7~", "cls": "mkt-hacker-root"}, {"o": "~HK8~", "c": "~HK8~", "cls": "mkt-hacker-ghost"}, {"o": "~HK9~", "c": "~HK9~", "cls": "mkt-hacker-ice"}, {"o": "~HOLO~", "c": "~HOLO~", "cls": "mkt-holo-chip"}, {"o": "~KEY~", "c": "~KEY~", "cls": "mkt-kp-key"}, {"o": "~LAVA~", "c": "~LAVA~", "cls": "mkt-kp-lava"}, {"o": "~LEMON~", "c": "~LEMON~", "cls": "mkt-kp-lemon"}, {"o": "~MATCHA~", "c": "~MATCHA~", "cls": "mkt-kp-matcha"}, {"o": "~MG10~", "c": "~MG10~", "cls": "mkt-mg-sky"}, {"o": "~MG11~", "c": "~MG11~", "cls": "mkt-mg-blue"}, {"o": "~MG12~", "c": "~MG12~", "cls": "mkt-mg-indigo"}, {"o": "~MG13~", "c": "~MG13~", "cls": "mkt-mg-violet"}, {"o": "~MG14~", "c": "~MG14~", "cls": "mkt-mg-fuchsia"}, {"o": "~MG15~", "c": "~MG15~", "cls": "mkt-mg-pink"}, {"o": "~MG16~", "c": "~MG16~", "cls": "mkt-mg-slate"}, {"o": "~MG1~", "c": "~MG1~", "cls": "mkt-mg-red"}, {"o": "~MG2~", "c": "~MG2~", "cls": "mkt-mg-orange"}, {"o": "~MG3~", "c": "~MG3~", "cls": "mkt-mg-amber"}, {"o": "~MG4~", "c": "~MG4~", "cls": "mkt-mg-yellow"}, {"o": "~MG5~", "c": "~MG5~", "cls": "mkt-mg-lime"}, {"o": "~MG6~", "c": "~MG6~", "cls": "mkt-mg-green"}, {"o": "~MG7~", "c": "~MG7~", "cls": "mkt-mg-emerald"}, {"o": "~MG8~", "c": "~MG8~", "cls": "mkt-mg-teal"}, {"o": "~MG9~", "c": "~MG9~", "cls": "mkt-mg-cyan"}, {"o": "~MINT~", "c": "~MINT~", "cls": "mkt-kp-mint"}, {"o": "~NE~", "c": "~NE~", "cls": "mkt-neon-ribbon"}, {"o": "~NIGHT~", "c": "~NIGHT~", "cls": "mkt-kp-night"}, {"o": "~OLA~", "c": "~OLA~", "cls": "mkt-ol-amber"}, {"o": "~OLE~", "c": "~OLE~", "cls": "mkt-ol-emerald"}, {"o": "~OLM~", "c": "~OLM~", "cls": "mkt-ol-magenta"}, {"o": "~OLR~", "c": "~OLR~", "cls": "mkt-ol-rose"}, {"o": "~OLV~", "c": "~OLV~", "cls": "mkt-ol-violet"}, {"o": "~OL~", "c": "~OL~", "cls": "mkt-outline-glow"}, {"o": "~OR10~", "c": "~OR10~", "cls": "orange-hl-10"}, {"o": "~OR11~", "c": "~OR11~", "cls": "orange-hl-11"}, {"o": "~OR12~", "c": "~OR12~", "cls": "orange-hl-12"}, {"o": "~OR13~", "c": "~OR13~", "cls": "orange-hl-13"}, {"o": "~OR14~", "c": "~OR14~", "cls": "orange-hl-14"}, {"o": "~OR15~", "c": "~OR15~", "cls": "orange-hl-15"}, {"o": "~OR16~", "c": "~OR16~", "cls": "orange-hl-16"}, {"o": "~OR17~", "c": "~OR17~", "cls": "orange-hl-17"}, {"o": "~OR18~", "c": "~OR18~", "cls": "orange-hl-18"}, {"o": "~OR19~", "c": "~OR19~", "cls": "orange-hl-19"}, {"o": "~OR1~", "c": "~OR1~", "cls": "orange-hl-1"}, {"o": "~OR20~", "c": "~OR20~", "cls": "orange-hl-20"}, {"o": "~OR21~", "c": "~OR21~", "cls": "orange-hl-21"}, {"o": "~OR22~", "c": "~OR22~", "cls": "orange-hl-22"}, {"o": "~OR23~", "c": "~OR23~", "cls": "orange-hl-23"}, {"o": "~OR24~", "c": "~OR24~", "cls": "orange-hl-24"}, {"o": "~OR25~", "c": "~OR25~", "cls": "orange-hl-25"}, {"o": "~OR26~", "c": "~OR26~", "cls": "orange-hl-26"}, {"o": "~OR27~", "c": "~OR27~", "cls": "orange-hl-27"}, {"o": "~OR28~", "c": "~OR28~", "cls": "orange-hl-28"}, {"o": "~OR29~", "c": "~OR29~", "cls": "orange-hl-29"}, {"o": "~OR2~", "c": "~OR2~", "cls": "orange-hl-2"}, {"o": "~OR30~", "c": "~OR30~", "cls": "orange-hl-30"}, {"o": "~OR31~", "c": "~OR31~", "cls": "orange-hl-31"}, {"o": "~OR32~", "c": "~OR32~", "cls": "orange-hl-32"}, {"o": "~OR33~", "c": "~OR33~", "cls": "orange-hl-33"}, {"o": "~OR34~", "c": "~OR34~", "cls": "orange-hl-34"}, {"o": "~OR35~", "c": "~OR35~", "cls": "orange-hl-35"}, {"o": "~OR36~", "c": "~OR36~", "cls": "orange-hl-36"}, {"o": "~OR37~", "c": "~OR37~", "cls": "orange-hl-37"}, {"o": "~OR38~", "c": "~OR38~", "cls": "orange-hl-38"}, {"o": "~OR39~", "c": "~OR39~", "cls": "orange-hl-39"}, {"o": "~OR3~", "c": "~OR3~", "cls": "orange-hl-3"}, {"o": "~OR40~", "c": "~OR40~", "cls": "orange-hl-40"}, {"o": "~OR41~", "c": "~OR41~", "cls": "orange-hl-41"}, {"o": "~OR42~", "c": "~OR42~", "cls": "orange-hl-42"}, {"o": "~OR43~", "c": "~OR43~", "cls": "orange-hl-43"}, {"o": "~OR44~", "c": "~OR44~", "cls": "orange-hl-44"}, {"o": "~OR45~", "c": "~OR45~", "cls": "orange-hl-45"}, {"o": "~OR46~", "c": "~OR46~", "cls": "orange-hl-46"}, {"o": "~OR47~", "c": "~OR47~", "cls": "orange-hl-47"}, {"o": "~OR48~", "c": "~OR48~", "cls": "orange-hl-48"}, {"o": "~OR49~", "c": "~OR49~", "cls": "orange-hl-49"}, {"o": "~OR4~", "c": "~OR4~", "cls": "orange-hl-4"}, {"o": "~OR50~", "c": "~OR50~", "cls": "orange-hl-50"}, {"o": "~OR5~", "c": "~OR5~", "cls": "orange-hl-5"}, {"o": "~OR6~", "c": "~OR6~", "cls": "orange-hl-6"}, {"o": "~OR7~", "c": "~OR7~", "cls": "orange-hl-7"}, {"o": "~OR8~", "c": "~OR8~", "cls": "orange-hl-8"}, {"o": "~OR9~", "c": "~OR9~", "cls": "orange-hl-9"}, {"o": "~PASTEL~", "c": "~PASTEL~", "cls": "mkt-pastel-pop"}, {"o": "~PL10~", "c": "~PL10~", "cls": "pill-hl-sky"}, {"o": "~PL11~", "c": "~PL11~", "cls": "pill-hl-blue"}, {"o": "~PL12~", "c": "~PL12~", "cls": "pill-hl-indigo"}, {"o": "~PL13~", "c": "~PL13~", "cls": "pill-hl-violet"}, {"o": "~PL14~", "c": "~PL14~", "cls": "pill-hl-fuchsia"}, {"o": "~PL15~", "c": "~PL15~", "cls": "pill-hl-pink"}, {"o": "~PL16~", "c": "~PL16~", "cls": "pill-hl-slate"}, {"o": "~PL1~", "c": "~PL1~", "cls": "pill-hl-red"}, {"o": "~PL2~", "c": "~PL2~", "cls": "pill-hl-orange"}, {"o": "~PL3~", "c": "~PL3~", "cls": "pill-hl-amber"}, {"o": "~PL4~", "c": "~PL4~", "cls": "pill-hl-yellow"}, {"o": "~PL5~", "c": "~PL5~", "cls": "pill-hl-lime"}, {"o": "~PL6~", "c": "~PL6~", "cls": "pill-hl-green"}, {"o": "~PL7~", "c": "~PL7~", "cls": "pill-hl-emerald"}, {"o": "~PL8~", "c": "~PL8~", "cls": "pill-hl-teal"}, {"o": "~PL9~", "c": "~PL9~", "cls": "pill-hl-cyan"}, {"o": "~PS10~", "c": "~PS10~", "cls": "mkt-pool-fusion"}, {"o": "~PS1~", "c": "~PS1~", "cls": "mkt-pool-tide"}, {"o": "~PS2~", "c": "~PS2~", "cls": "mkt-pool-sunset"}, {"o": "~PS3~", "c": "~PS3~", "cls": "mkt-pool-chlorine"}, {"o": "~PS4~", "c": "~PS4~", "cls": "mkt-pool-beachball"}, {"o": "~PS5~", "c": "~PS5~", "cls": "mkt-pool-wave"}, {"o": "~PS6~", "c": "~PS6~", "cls": "mkt-pool-lounger"}, {"o": "~PS7~", "c": "~PS7~", "cls": "mkt-pool-deep"}, {"o": "~PS8~", "c": "~PS8~", "cls": "mkt-pool-foam"}, {"o": "~PS9~", "c": "~PS9~", "cls": "mkt-pool-lifeguard"}, {"o": "~PU10~", "c": "~PU10~", "cls": "pool-hl-10"}, {"o": "~PU11~", "c": "~PU11~", "cls": "pool-hl-11"}, {"o": "~PU12~", "c": "~PU12~", "cls": "pool-hl-12"}, {"o": "~PU13~", "c": "~PU13~", "cls": "pool-hl-13"}, {"o": "~PU14~", "c": "~PU14~", "cls": "pool-hl-14"}, {"o": "~PU15~", "c": "~PU15~", "cls": "pool-hl-15"}, {"o": "~PU16~", "c": "~PU16~", "cls": "pool-hl-16"}, {"o": "~PU17~", "c": "~PU17~", "cls": "pool-hl-17"}, {"o": "~PU18~", "c": "~PU18~", "cls": "pool-hl-18"}, {"o": "~PU19~", "c": "~PU19~", "cls": "pool-hl-19"}, {"o": "~PU1~", "c": "~PU1~", "cls": "pool-hl-1"}, {"o": "~PU20~", "c": "~PU20~", "cls": "pool-hl-20"}, {"o": "~PU21~", "c": "~PU21~", "cls": "pool-hl-21"}, {"o": "~PU22~", "c": "~PU22~", "cls": "pool-hl-22"}, {"o": "~PU23~", "c": "~PU23~", "cls": "pool-hl-23"}, {"o": "~PU24~", "c": "~PU24~", "cls": "pool-hl-24"}, {"o": "~PU25~", "c": "~PU25~", "cls": "pool-hl-25"}, {"o": "~PU26~", "c": "~PU26~", "cls": "pool-hl-26"}, {"o": "~PU27~", "c": "~PU27~", "cls": "pool-hl-27"}, {"o": "~PU28~", "c": "~PU28~", "cls": "pool-hl-28"}, {"o": "~PU29~", "c": "~PU29~", "cls": "pool-hl-29"}, {"o": "~PU2~", "c": "~PU2~", "cls": "pool-hl-2"}, {"o": "~PU30~", "c": "~PU30~", "cls": "pool-hl-30"}, {"o": "~PU31~", "c": "~PU31~", "cls": "pool-hl-31"}, {"o": "~PU32~", "c": "~PU32~", "cls": "pool-hl-32"}, {"o": "~PU33~", "c": "~PU33~", "cls": "pool-hl-33"}, {"o": "~PU34~", "c": "~PU34~", "cls": "pool-hl-34"}, {"o": "~PU35~", "c": "~PU35~", "cls": "pool-hl-35"}, {"o": "~PU36~", "c": "~PU36~", "cls": "pool-hl-36"}, {"o": "~PU37~", "c": "~PU37~", "cls": "pool-hl-37"}, {"o": "~PU38~", "c": "~PU38~", "cls": "pool-hl-38"}, {"o": "~PU39~", "c": "~PU39~", "cls": "pool-hl-39"}, {"o": "~PU3~", "c": "~PU3~", "cls": "pool-hl-3"}, {"o": "~PU40~", "c": "~PU40~", "cls": "pool-hl-40"}, {"o": "~PU41~", "c": "~PU41~", "cls": "pool-hl-41"}, {"o": "~PU42~", "c": "~PU42~", "cls": "pool-hl-42"}, {"o": "~PU43~", "c": "~PU43~", "cls": "pool-hl-43"}, {"o": "~PU44~", "c": "~PU44~", "cls": "pool-hl-44"}, {"o": "~PU45~", "c": "~PU45~", "cls": "pool-hl-45"}, {"o": "~PU46~", "c": "~PU46~", "cls": "pool-hl-46"}, {"o": "~PU47~", "c": "~PU47~", "cls": "pool-hl-47"}, {"o": "~PU48~", "c": "~PU48~", "cls": "pool-hl-48"}, {"o": "~PU49~", "c": "~PU49~", "cls": "pool-hl-49"}, {"o": "~PU4~", "c": "~PU4~", "cls": "pool-hl-4"}, {"o": "~PU50~", "c": "~PU50~", "cls": "pool-hl-50"}, {"o": "~PU5~", "c": "~PU5~", "cls": "pool-hl-5"}, {"o": "~PU6~", "c": "~PU6~", "cls": "pool-hl-6"}, {"o": "~PU7~", "c": "~PU7~", "cls": "pool-hl-7"}, {"o": "~PU8~", "c": "~PU8~", "cls": "pool-hl-8"}, {"o": "~PU9~", "c": "~PU9~", "cls": "pool-hl-9"}, {"o": "~SEAL~", "c": "~SEAL~", "cls": "mkt-crimson-seal"}, {"o": "~SHM~", "c": "~SHM~", "cls": "mkt-shimmer-title"}, {"o": "~SKY~", "c": "~SKY~", "cls": "mkt-sky-tape"}, {"o": "~STICK~", "c": "~STICK~", "cls": "mkt-kp-stick"}, {"o": "~SUN~", "c": "~SUN~", "cls": "mkt-kp-sunset"}, {"o": "~UV~", "c": "~UV~", "cls": "mkt-kp-uv"}, {"o": "~WN10~", "c": "~WN10~", "cls": "mkt-winter-cranberry"}, {"o": "~WN1~", "c": "~WN1~", "cls": "mkt-winter-icicle"}, {"o": "~WN2~", "c": "~WN2~", "cls": "mkt-winter-frost"}, {"o": "~WN3~", "c": "~WN3~", "cls": "mkt-winter-pine"}, {"o": "~WN4~", "c": "~WN4~", "cls": "mkt-winter-garnet"}, {"o": "~WN5~", "c": "~WN5~", "cls": "mkt-winter-snowdrift"}, {"o": "~WN6~", "c": "~WN6~", "cls": "mkt-winter-aurora"}, {"o": "~WN7~", "c": "~WN7~", "cls": "mkt-winter-pond"}, {"o": "~WN8~", "c": "~WN8~", "cls": "mkt-winter-seal"}, {"o": "~WN9~", "c": "~WN9~", "cls": "mkt-winter-blizzard"}];

// Longest opens first so ** beats *, =MG= beats =G=, etc!
const KD_ALL = KD_CORE.concat(KD_MKT).slice().sort((a, b) => b.o.length - a.o.length);

// Timer registry: playback ribbons register intervals, cleared on every render!
const kdTimers = new Set();
function kdClearTimers() { kdTimers.forEach(id => clearInterval(id)); kdTimers.clear(); }

function kdBlip(freq, dur) { try { if (typeof playAeroClickSound === "function") playAeroClickSound(freq, dur); } catch (e) {} }

// Inner HTML builders per applet flag (mirrors Writeout exactly)!
function kdAppletInner(el, label) {
    const kind = el.getAttribute("data-kd");
    const st = el.dataset;
    switch (kind) {
        case "toggle": return "<span>" + label + "</span>" + '<div class="switch-pill"></div>';
        case "state": return label;
        case "volume": return "<span>" + label + ": " + (st.kdLevel || "0") + "%</span>" + '<div class="dial-knob"></div>';
        case "battery": {
            const cap = parseInt(st.kdCap || "3", 10);
            let cells = "";
            for (let i = 0; i < 3; i++) cells += '<div class="juice-block' + (i < cap ? "" : " drain") + '"></div>';
            return "<span>" + label + "</span>" + '<div class="battery-juice-grid">' + cells + "</div>";
        }
        case "calendar": {
            const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
            const now = new Date();
            return '<div class="cal-deck-top">' + months[now.getMonth()] + '</div><div class="cal-deck-body">' + now.getDate() + "</div>";
        }
        case "stars": {
            const r = parseInt(st.kdRating || "0", 10);
            let out = '<span style="margin-right:6px;">' + label + "</span>";
            for (let i = 0; i < 3; i++) out += '<span class="rating-star-node' + (i < r ? " star-glow" : "") + '">★</span>';
            return out;
        }
        case "counter": return "<span>" + label + "</span>" + '<div class="badge-count-orb">' + (st.kdCount || "0") + "</div>";
        case "latch": {
            const locked = st.kdLocked !== "0";
            return '<span class="latch-icon-frame">' + (locked ? "🔒" : "🔓") + "</span> <span>" + label + ": " + (locked ? "LOCKED" : "OPEN") + "</span>";
        }
        case "playback": return "<span>" + label + "</span>" + '<div class="playback-track-bar"><div class="playback-fill-fluid" style="width:' + (st.kdPct || "0") + '%"></div></div>';
        case "cpu": return '<div class="gauge-needle-vector"></div>';
        case "stepper": return "<span>" + label + ": " + (st.kdVal || "1") + "</span>" + '<div class="stepper-arrow-box">▲<br>▼</div>';
        case "hydro": return '<div class="hydro-sphere"></div> <span>' + label + ": " + (st.kdHydro || "SAFE") + "</span>";
        case "lockslider": return "<span>" + label + "</span>" + '<div class="slider-chassis"><div class="slider-handle-metal"></div></div>';
        case "gadclock": case "sysclock": return '<div class="' + (kind === "gadclock" ? "clock-hand-vector" : "gadget-clock-hand") + '"></div>';
        case "metal": return "<span>" + ((st.kdPlaying === "1") ? "■ " : "▶ ") + label + "</span>";
        case "inset": return '<div class="check-cavity-box"></div> <span>' + label + "</span>";
        case "hex": return '<div class="hex-color-orb" style="background-color: ' + label + ';"></div> <span>' + label + "</span>";
        case "signal": {
            const on = st.kdOn !== "0";
            return '<div class="signal-ping-orb"></div> <span>' + label + ": " + (on ? "CONNECTED" : "DISCONNECT") + "</span>";
        }
        case "circuit": return '<div class="node-dot"></div> <span>' + label + "</span>";
        case "voice": return "<span>" + ((st.kdPlaying === "1") ? "⏳ PLAYING: " : "🔊 PLAY DICTATION: ") + label + "</span>";
        case "neon": return '<div class="neon-node-sphere"></div> <span>' + label + ": " + (st.kdNeon || "INFO") + "</span>";
        case "latchtoggle": return "<span>" + label + "</span>" + '<div class="latch-track-chassis"><div class="latch-slider-handle"></div></div>';
        case "prog": return "<span>" + label + "</span>" + '<div class="capsule-fluid-bar"><div class="capsule-fluid-fill" style="width:' + (st.kdFill || "35") + '%"></div></div>';
        case "dots": {
            const r = parseInt(st.kdRating || "0", 10);
            let out = '<span style="margin-right:6px;">' + label + "</span>";
            for (let i = 0; i < 3; i++) out += '<div class="matrix-bead' + (i < r ? " bead-glow" : "") + '"></div>';
            return out;
        }
        case "latchlock": return '<div class="latch-bolt"></div> <span>' + label + "</span>";
        default: return label;
    }
}

// Click delegation: one listener, all applets, all views!
function kdHandleAppletClick(el) {
    const kind = el.getAttribute("data-kd");
    if (!kind) return false;
    const label = el.getAttribute("data-label") || "";
    const st = el.dataset;
    switch (kind) {
        case "toggle": el.classList.toggle("turned-on"); kdBlip(650, 0.08); break;
        case "foldout": kdBlip(500, 0.15); break;
        case "state":
            if (el.classList.contains("state-green")) { kdBlip(400, 0.12); el.classList.remove("state-green"); el.classList.add("state-red"); }
            else { kdBlip(650, 0.08); el.classList.remove("state-red"); el.classList.add("state-green"); }
            break;
        case "volume": {
            const lv = (parseInt(st.kdLevel || "0", 10) + 25) % 125;
            st.kdLevel = String(lv);
            const knob = el.querySelector(".dial-knob");
            if (knob) knob.style.transform = "rotate(" + ((lv / 100) * 270) + "deg)";
            const sp = el.querySelector("span");
            if (sp) sp.innerText = label + ": " + lv + "%";
            kdBlip(400 + lv * 2, 0.08); break;
        }
        case "battery": {
            let cap = parseInt(st.kdCap || "3", 10);
            cap = cap === 0 ? 3 : cap - 1;
            st.kdCap = String(cap); kdBlip(300 + cap * 100, 0.1);
            el.querySelectorAll(".juice-block").forEach((b, i) => b.classList.toggle("drain", i >= cap));
            break;
        }
        case "calendar": kdBlip(700, 0.05); break;
        case "stars": {
            const r = (parseInt(st.kdRating || "0", 10) + 1) % 4;
            st.kdRating = String(r); kdBlip(600 + r * 50, 0.06);
            el.querySelectorAll(".rating-star-node").forEach((s, i) => s.classList.toggle("star-glow", i < r));
            break;
        }
        case "counter": {
            const n = parseInt(st.kdCount || "0", 10) + 1;
            st.kdCount = String(n); kdBlip(800, 0.05);
            const orb = el.querySelector(".badge-count-orb");
            if (orb) orb.innerText = String(n);
            break;
        }
        case "latch": {
            const locked = st.kdLocked !== "0";
            st.kdLocked = locked ? "0" : "1"; kdBlip(locked ? 900 : 350, locked ? 0.15 : 0.12);
            el.classList.toggle("latch-unlocked", locked);
            el.innerHTML = kdAppletInner(el, label);
            break;
        }
        case "playback": {
            if (st.kdPlaying === "1") {
                st.kdPlaying = "0"; kdBlip(400, 0.05);
                if (st.kdTimer) { clearInterval(parseInt(st.kdTimer, 10)); kdTimers.delete(parseInt(st.kdTimer, 10)); delete st.kdTimer; }
            } else {
                st.kdPlaying = "1"; kdBlip(600, 0.05);
                const id = setInterval(() => {
                    let p = parseInt(st.kdPct || "0", 10);
                    p = p >= 100 ? 0 : p + 2;
                    st.kdPct = String(p);
                    const fill = el.querySelector(".playback-fill-fluid");
                    if (fill) fill.style.width = p + "%"; else { clearInterval(id); kdTimers.delete(id); }
                }, 100);
                st.kdTimer = String(id); kdTimers.add(id);
            }
            break;
        }
        case "cpu": {
            const angles = [-90, -45, 0, 45, 90];
            const step = (parseInt(st.kdStep || "0", 10) + 1) % angles.length;
            st.kdStep = String(step); kdBlip(500 + step * 80, 0.06);
            const n = el.querySelector(".gauge-needle-vector");
            if (n) n.style.transform = "rotate(" + angles[step] + "deg)";
            break;
        }
        case "stepper": {
            const v = parseInt(st.kdVal || "1", 10) + 1;
            st.kdVal = String(v); kdBlip(750, 0.04);
            const sp = el.querySelector("span");
            if (sp) sp.innerText = label + ": " + v;
            break;
        }
        case "hydro": {
            const order = ["SAFE", "WARN", "CRIT"];
            const i = (order.indexOf(st.kdHydro || "SAFE") + 1) % 3;
            st.kdHydro = order[i]; kdBlip([700, 550, 350][i], i === 2 ? 0.12 : 0.07);
            el.className = "applet-hydro-orb " + ["orb-blue", "orb-yellow", "orb-red"][i];
            const sp = el.querySelector("span");
            if (sp) sp.innerText = label + ": " + order[i];
            break;
        }
        case "lockslider": {
            const open = st.kdOpen === "1";
            st.kdOpen = open ? "0" : "1"; kdBlip(open ? 400 : 850, open ? 0.08 : 0.1);
            el.classList.toggle("unlocked-state", !open);
            break;
        }
        case "gadclock": case "sysclock": kdBlip(700, 0.05); break;
        case "metal": {
            const playing = st.kdPlaying !== "1";
            st.kdPlaying = playing ? "1" : "0"; kdBlip(playing ? 650 : 450, 0.08);
            el.classList.toggle("trigger-playing", playing);
            el.innerHTML = kdAppletInner(el, label);
            break;
        }
        case "inset": el.classList.toggle("box-checked"); kdBlip(600, 0.05); break;
        case "hex": el.classList.toggle("swatch-active"); kdBlip(750, 0.05); break;
        case "signal": {
            const on = st.kdOn !== "0";
            st.kdOn = on ? "0" : "1"; kdBlip(on ? 300 : 800, on ? 0.12 : 0.05);
            el.classList.toggle("sig-disconnect", on);
            el.innerHTML = kdAppletInner(el, label);
            break;
        }
        case "circuit": kdBlip(750, 0.05); break;
        case "voice": {
            const playing = st.kdPlaying !== "1";
            st.kdPlaying = playing ? "1" : "0"; kdBlip(playing ? 500 : 350, 0.2);
            el.innerHTML = kdAppletInner(el, label);
            break;
        }
        case "wax": kdBlip(250, 0.15); break;
        case "neon": {
            const order = ["INFO", "WARN", "ALERT"];
            const i = (order.indexOf(st.kdNeon || "INFO") + 1) % 3;
            st.kdNeon = order[i]; kdBlip([750, 550, 350][i], i === 2 ? 0.12 : 0.07);
            el.className = "applet-neon-node " + ["node-cyan", "node-yellow", "node-pink"][i];
            el.setAttribute("data-kd", "neon");
            const sp = el.querySelector("span");
            if (sp) sp.innerText = label + ": " + order[i];
            break;
        }
        case "latchtoggle": {
            const active = st.kdActive === "1";
            st.kdActive = active ? "0" : "1"; kdBlip(active ? 400 : 800, 0.08);
            el.classList.toggle("latch-active-state", !active);
            break;
        }
        case "prog": {
            let f = parseInt(st.kdFill || "35", 10);
            f = f >= 95 ? 15 : f + 20;
            st.kdFill = String(f); kdBlip(550 + f, 0.05);
            const fill = el.querySelector(".capsule-fluid-fill");
            if (fill) fill.style.width = f + "%";
            break;
        }
        case "dots": {
            const r = (parseInt(st.kdRating || "0", 10) + 1) % 4;
            st.kdRating = String(r); kdBlip(600, 0.05);
            el.querySelectorAll(".matrix-bead").forEach((b, i) => b.classList.toggle("bead-glow", i < r));
            break;
        }
        case "latchlock": {
            const secure = st.kdSecure === "1";
            st.kdSecure = secure ? "0" : "1"; kdBlip(secure ? 350 : 850, 0.1);
            el.classList.toggle("latch-secure", !secure);
            break;
        }
        default: kdBlip(700, 0.05); break;
    }
    return true;
}

if (typeof document !== "undefined") {
    document.addEventListener("click", function (e) {
        const el = e.target && e.target.closest ? e.target.closest("[data-kd]") : null;
        if (el) kdHandleAppletClick(el);
    });
    setInterval(function () {
        const now = new Date();
        const a = now.getSeconds() * 6;
        document.querySelectorAll(".clock-hand-vector, .gadget-clock-hand").forEach(function (h) { h.style.transform = "rotate(" + a + "deg)"; });
    }, 1000);
}

// ::block triggers (exact cell match renders a full block)!
const KD_BLOCKS = ["glass","bubble","alert","media","aqua","code","emerald","amber","crimson","amethyst","gsky","gemerald","gamber","gcrimson","foldout","divider","console","diff","horizon","waypoint","entry","draw"];
function kdRenderBlock(name) {
    switch (name) {
        case "glass": return '<div class="aero-glass-block">Glass Header</div>';
        case "bubble": return '<span class="aqua-bubble-text">Liquid Stream</span>';
        case "alert": return '<div class="tactile-alert-plate"><div class="alert-icon-orb">!</div> ⚠️ CRITICAL WARNING SYSTEM INITIALIZED</div>';
        case "media": return '<div class="media-track-wrap"><span class="media-track-text">NOW PLAYING: Track_Audio_Stream.wav</span><div class="media-control-orb"></div></div>';
        case "aqua": return '<div class="aqua-aero-box"><div class="aqua-box-content">🌊 Aqua notes...</div></div>';
        case "emerald": return '<div class="aqua-aero-box aqua-emerald-box"><div class="aqua-box-content">🌿 Eco logs...</div></div>';
        case "amber": return '<div class="aqua-aero-box aqua-amber-box"><div class="aqua-box-content">☀️ Highlights...</div></div>';
        case "crimson": return '<div class="aqua-aero-box aqua-crimson-box"><div class="aqua-box-content">🚨 Urgent tasks...</div></div>';
        case "amethyst": return '<div class="aqua-aero-box aqua-amethyst-box"><div class="aqua-box-content">🔮 Creative drafts...</div></div>';
        case "gsky": return '<div class="aero-glass-panel panel-sky"><div class="glass-panel-header"><span>🔹 SKY COMPONENT</span></div><p class="glass-panel-content">Sky log notes...</p></div>';
        case "gemerald": return '<div class="aero-glass-panel panel-emerald"><div class="glass-panel-header"><span>🌿 ECO COMPONENT</span></div><p class="glass-panel-content">Organic project logs...</p></div>';
        case "gamber": return '<div class="aero-glass-panel panel-amber"><div class="glass-panel-header"><span>☀️ AMBER MATRIX</span></div><p class="glass-panel-content">Highlights...</p></div>';
        case "gcrimson": return '<div class="aero-glass-panel panel-crimson"><div class="glass-panel-header"><span>🚨 ALERT MANIFEST</span></div><p class="glass-panel-content">Urgent warnings...</p></div>';
        case "foldout": return '<div class="aero-foldout-panel"><div class="foldout-panel-header"><div class="foldout-arrow-orb">▲</div><div class="foldout-panel-title-input">TITLE</div></div><div class="foldout-panel-content"><p>TEXT</p></div></div>';
        case "divider": return '<div class="aero-liquid-divider"></div>';
        case "code": return '<div class="writedown-code-block"><div class="code-block-header"><span>CODE SPEC</span></div><pre class="code-block-content">// Write text lines here...</pre></div>';
        case "console": return '<div class="writedown-console-block"><div class="console-block-header"><span>⚠️ SYSTEM DEBUG CONSOLE</span></div><pre class="console-block-content">error: Undefined reference tracking index bounds fault.</pre></div>';
        case "diff": return '<div class="writedown-diff-block"><div class="diff-row-content"><p class="diff-add">+ function initializeWorkspace() {</p><p class="diff-del">- function setupOldEngine() {</p></div></div>';
        case "horizon": return '<div class="writedown-horizon-block"><div class="horizon-pitch-line"></div></div>';
        case "waypoint": return '<div class="writedown-waypoint-block"><div class="waypoint-block-header"><span>🛰️ FLIGHT WAYPOINT MONITOR</span></div><div class="waypoint-block-content">NAV: WP_01 // COORD: 34.1803° N, 118.3090° W // ALT: ~2,400 FT</div></div>';
        case "entry": return '<div class="writedown-journal-entry"><div class="journal-entry-content"><p>Ring binder entry...</p></div></div>';
        case "draw": return '<div class="writedown-code-block"><div class="code-block-header"><span>SKETCHPAD</span></div><pre class="code-block-content">🎨 Sketchpad lives in Writeout!</pre></div>';
        default: return "";}
}

// Flag -> applet kind mapping!
function kdKindFor(def) {
    const f = def.flags || [];
    if (f.includes("isToggle")) return "toggle";
    if (f.includes("isStateToggle")) return "state";
    if (f.includes("isVolumeDial")) return "volume";
    if (f.includes("isBatteryCell")) return "battery";
    if (f.includes("isCalendarDesk")) return "calendar";
    if (f.includes("isStarRating")) return "stars";
    if (f.includes("isCounterBadge")) return "counter";
    if (f.includes("isSecurityLatch")) return "latch";
    if (f.includes("isPlaybackRibbon")) return "playback";
    if (f.includes("isCpuGauge")) return "cpu";
    if (f.includes("isStepperMesh")) return "stepper";
    if (f.includes("isHydroOrb")) return "hydro";
    if (f.includes("isLockSlider")) return "lockslider";
    if (f.includes("isGadclock")) return "gadclock";
    if (f.includes("isMetalTrigger")) return "metal";
    if (f.includes("isInsetCheck")) return "inset";
    if (f.includes("isHexSwatch")) return "hex";
    if (f.includes("isSignalNode")) return "signal";
    if (f.includes("isCircuitNode")) return "circuit";
    if (f.includes("isVoiceTag")) return "voice";
    if (f.includes("isWaxStamp")) return "wax";
    if (f.includes("isNeonNode")) return "neon";
    if (f.includes("isLatchToggle")) return "latchtoggle";
    if (f.includes("isSystemGadclock")) return "sysclock";
    if (f.includes("isProgCapsule")) return "prog";
    if (f.includes("isDotMatrix")) return "dots";
    if (f.includes("isLatchLock")) return "latchlock";
    if (f.includes("isFoldout")) return "foldout";
    if (f.includes("isMirror")) return "mirror";
    if (f.includes("isWave")) return "wave";
    if (f.includes("isItalic")) return "em";
    if (f.includes("isMultiDuplex")) return "duplex";
    return "";
}

// Full static renderer!
function kdRender(raw) {
    if (raw === undefined || raw === null) return "";
    if (typeof raw === "number") return String(raw);
    const text = String(raw);
    const trimmed = text.trim();
    if (trimmed.startsWith("::") && KD_BLOCKS.includes(trimmed.slice(2))) return kdRenderBlock(trimmed.slice(2));
    let s = kdEscapeHtml(text);
    const store = [];
    const stash = (html) => { store.push(html); return "\u0000" + (store.length - 1) + "\u0000"; };
    const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    KD_ALL.forEach((def) => {
        const kind = kdKindFor(def);
        let idx = s.indexOf(def.o);
        while (idx !== -1) {
            const j = s.indexOf(def.c, idx + def.o.length);
            if (j === -1) break;
            let inner = s.slice(idx + def.o.length, j).trim();
            if (!inner) { idx = s.indexOf(def.o, idx + def.o.length); continue; }
            let html = "";
            if (def.tag === "code") html = "<code class=\"kd-code\">" + inner + "</code>";
            else if (def.tag === "strong") html = "<strong>" + inner + "</strong>";
            else if (def.tag === "em" || kind === "em") html = "<em>" + inner + "</em>";
            else if (kind === "mirror") html = '<span class="reflected-text-block" data-text="' + inner + '">' + inner + "</span>";
            else if (kind === "wave") html = '<span class="kinetic-wave-text">' + inner.split("").map((ch, i) => '<span class="kinetic-wave-char" style="animation-delay:' + (i * 90) + 'ms">' + ch + "</span>").join("") + "</span>";
            else if (kind === "hex") html = '<span class="' + def.cls + '" data-kd="hex" data-label="' + inner + '">' + kdAppletInner({ getAttribute: (k) => k === "data-kd" ? "hex" : inner, dataset: {} }, inner) + "</span>";
            else if (kind && kind !== "duplex") html = '<span class="' + def.cls + '" data-kd="' + kind + '" data-label="' + inner + '">' + kdAppletInner({ getAttribute: (k) => k === "data-kd" ? kind : inner, dataset: {} }, inner) + "</span>";
            else if (kind === "duplex") html = '<span class="' + def.cls + '"><div class="input-left">Hello</div><div class="input-right">World</div></span>';
            else html = '<span class="' + def.cls + '">' + inner + "</span>";
            s = s.slice(0, idx) + stash(html) + s.slice(j + def.c.length);
            idx = s.indexOf(def.o);
        }
    });
    s = s.replace(/\u0000(\d+)\u0000/g, (m, n) => store[parseInt(n, 10)]);
    return s;
}

// Guide content builder for the Help Deck modal!
function kdGuideSection(title, items) {
    return "<div class=\"kd-guide-group\"><div class=\"kd-guide-title\">" + title + " (" + items.length + ")" + "</div>" + items.map((d) => {
        const code = kdEscapeHtml(d.o + "text" + (d.c === d.o ? "" : d.c));
        let preview = "";
        try { preview = kdRender(d.o + "Demo" + (d.c === d.o || d.c === "#" || d.c === "~" ? d.o : d.c)); } catch (e) { preview = "Demo"; }
        return '<div class="kd-guide-row"><code>' + code + "</code><span>" + preview + "</span></div>";
    }).join("") + "</div>";
}
function kdBuildGuideHTML() {
    const gels = KD_CORE.filter((d) => (d.cls || "").startsWith("gel-orb"));
    const chips = KD_CORE.filter((d) => (d.cls || "").startsWith("gel-bubble-chip"));
    const tags = KD_CORE.filter((d) => (d.cls || "").startsWith("aero-tag-chip"));
    const fx = KD_CORE.filter((d) => ["gel-green-flash","liquid-underline","glossy-border-badge","cyber-glow-spark","liquid-text-glow","reflected-text-block","embossed-glass-text","kinetic-wave-text"].includes(d.cls));
    const applets = KD_CORE.filter((d) => (d.cls || "").startsWith("applet-"));
    const eff = KD_CORE.filter((d) => (d.cls || "").startsWith("effect-") || (d.cls || "").startsWith("mega") || (d.cls || "").startsWith("aero-glass-badge") || (d.cls || "").startsWith("aero-duplex") || (d.cls || "").startsWith("gel-chip-") || (d.cls || "").startsWith("droplet"));
    const dev = KD_CORE.filter((d) => (d.cls || "").startsWith("dev-") || (d.cls || "").startsWith("av-") || (d.cls || "").startsWith("jr-"));
    const blocks = KD_BLOCKS.map((b) => ({ o: "::" + b, c: "", cls: "" }));
    return '<div class="kd-guide-note">Type any trigger around your text — it renders live in every view! Click applets to play with them!</div>'
        + kdGuideSection("Basics (!! ** * ` &&)", [{o:"**",c:"**"},{o:"*",c:"*"},{o:"`",c:"`",tag:"code"},{o:"&&",c:"&&",cls:"spark-text"}])
        + kdGuideSection("Gel Orbs", gels)
        + kdGuideSection("Bubble Chips", chips)
        + kdGuideSection("Prefix Tags", tags)
        + kdGuideSection("Text FX", fx)
        + kdGuideSection("Applets (clickable!)", applets)
        + kdGuideSection("Effects + Megachips", eff)
        + kdGuideSection("Dev / Avionics / Journal", dev)
        + '<div class="kd-guide-group"><div class="kd-guide-title">Blocks — whole cell is ::name (22)</div>' + blocks.map((b) => '<div class="kd-guide-row"><code>::' + b.o.slice(2) + "</code><span>" + kdRenderBlock(b.o.slice(2)) + "</span></div>").join("") + "</div>"
        + kdGuideSection("Marketplace Packs", KD_MKT);
}
