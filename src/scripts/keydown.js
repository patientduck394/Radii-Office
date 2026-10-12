// keydown.ts — TypeScript source of the Keydown markup truth!
// Compiles to keydown.js (committed, Node runs the output as-is)!
// Recompile with: npx -y -p typescript tsc --project tsconfig.json
// Imbuer (29 defs) and Formly (135 defs) share chunks here to prevent drift!
function cls(open, close, className) {
    return { open, close, className };
}
function tag(open, close, tagName) {
    return { open, close, tagName };
}
function withExtra(def, extra) {
    // Copy a def with one extra field (e.g. Formly's isItalic flag on <em>)!
    return { ...def, ...extra };
}
// Shared chunks (same objects reused by both apps keeps them in sync)!
const CORE_ORBS = [
    cls("=Y=", "=Y=", "gel-orb gel-y"),
    cls("=R=", "=R=", "gel-orb gel-r"),
    cls("=G=", "=G=", "gel-orb gel-g"),
    cls("=C=", "=C=", "gel-orb gel-c"),
    cls("=B=", "=B=", "gel-orb gel-b"),
];
const SPARK = cls("&&", "&&", "spark-text");
const FLASHES = [
    cls("~G~", "~G~", "gel-green-flash"),
    cls("~U~", "~U~", "liquid-underline"),
    cls("~B~", "~B~", "glossy-border-badge"),
    cls("~S~", "~S~", "cyber-glow-spark"),
    cls("~L~", "~L~", "liquid-text-glow"),
    cls("~E~", "~E~", "embossed-glass-text"),
];
const CODE_TRIO_BASE = [
    tag("`", "`", "code"),
    tag("**", "**", "strong"),
    tag("*", "*", "em"),
];
const TAG3 = [
    cls("!#A#", "#", "aero-tag-chip tag-chip-a"),
    cls("!#G#", "#", "aero-tag-chip tag-chip-g"),
    cls("!#O#", "#", "aero-tag-chip tag-chip-o"),
];
const BUB3 = [
    cls("#C#", "#", "gel-bubble-chip gel-chip-cyan"),
    cls("#O#", "#", "gel-bubble-chip gel-chip-orange"),
    cls("#G#", "#", "gel-bubble-chip gel-chip-green"),
];
const FX_CORE = [
    cls("~MP~", "~MP~", "effect-mercury-pearl"),
    cls("~CB~", "~CB~", "effect-screen-cavity"),
    cls("~DS~", "~DS~", "effect-drop-shadow-window"),
    cls("~GL~", "~GL~", "effect-glow-tube"),
    cls("~PM~", "~PM~", "effect-plasma-gel"),
];
const WD_AW_SF_IMBUER = [
    cls("~WD~", "~WD~", "gel-chip-waterdrop"),
    cls("~AW~", "~AW~", "gel-chip-aurorawave"),
    cls("~SF~", "~SF~", "gel-chip-solarflare"),
];
// Formly-only extras!
const EXTRA_ORBS = [
    cls("=V=", "=V=", "gel-orb gel-v"),
    cls("=P=", "=P=", "gel-orb gel-p"),
    cls("=O=", "=O=", "gel-orb gel-o"),
    cls("=MG=", "=MG=", "gel-orb gel-mg"),
    cls("=LM=", "=LM=", "gel-orb gel-lm"),
    cls("=AQ=", "=AQ=", "gel-orb gel-aq"),
    cls("=SL=", "=SL=", "gel-orb gel-sl"),
];
const TAG5_EXTRA = [
    cls("!#R#", "#", "aero-tag-chip tag-chip-r"),
    cls("!#PR#", "#", "aero-tag-chip tag-chip-pr"),
    cls("!#PK#", "#", "aero-tag-chip tag-chip-pk"),
    cls("!#Y#", "#", "aero-tag-chip tag-chip-y"),
    cls("!#SL#", "#", "aero-tag-chip tag-chip-sl"),
];
const BUB13_EXTRA = [
    cls("#R#", "#", "gel-bubble-chip gel-chip-red"),
    cls("#PR#", "#", "gel-bubble-chip gel-chip-purple"),
    cls("#PK#", "#", "gel-bubble-chip gel-chip-pink"),
    cls("#Y#", "#", "gel-bubble-chip gel-chip-yellow"),
    cls("#B#", "#", "gel-bubble-chip gel-chip-blue"),
    cls("#L#", "#", "gel-bubble-chip gel-chip-lime"),
    cls("#T#", "#", "gel-bubble-chip gel-chip-teal"),
    cls("#GL#", "#", "gel-bubble-chip gel-chip-gold"),
    cls("#SL#", "#", "gel-bubble-chip gel-chip-slate"),
    cls("#W#", "#", "gel-bubble-chip gel-chip-white"),
    cls("#BK#", "#", "gel-bubble-chip gel-chip-black"),
    cls("#FG#", "#", "gel-bubble-chip gel-chip-fog"),
    cls("#TU#", "#", "gel-bubble-chip gel-chip-turquoise"),
];
const WD_SF_AW_FORMLY = [
    cls("~WD~", "~WD~", "gel-chip-waterdrop"),
    cls("~SF~", "~SF~", "gel-chip-solarflare"),
    cls("~AW~", "~AW~", "gel-chip-aurorawave"),
];
const FORMLY_TAIL = [
    cls("~SM~", "~SM~", "applet-glass-stamp"),
    FX_CORE[0], // ~MP~ shared with Imbuer!
    cls("~PG~", "~PG~", "effect-prism-refract"),
    FX_CORE[1], // ~CB~ shared with Imbuer!
    cls("~SR~", "~SR~", "effect-sunlight-ray"),
    cls("~OA~", "~OA~", "effect-abyssal-plate"),
    cls("~MM~", "~MM~", "effect-metallic-mesh"),
    cls("~FE~", "~FE~", "effect-fluid-expand"),
    cls("~MR~", "~MR~", "effect-metric-cavity"),
    cls("~PO~", "~PO~", "effect-pearl-orb"),
    cls("~LF~", "~LF~", "effect-lens-flare"),
    FX_CORE[2], // ~DS~ shared with Imbuer!
    FX_CORE[3], // ~GL~ shared with Imbuer!
    cls("~HB~", "~HB~", "effect-hardware-bevel"),
    cls("~IS~", "~IS~", "effect-screen-segment"),
    cls("~GC~", "~GC~", "effect-gel-capsule"),
    cls("~KO~", "~KO~", "effect-fluid-orbit"),
    cls("~XG~", "~XG~", "effect-xray-glass"),
    cls("~WL~", "~WL~", "effect-waveform-line"),
    FX_CORE[4], // ~PM~ shared with Imbuer!
    cls("~WB~", "~WB~", "effect-water-bubble"),
    cls("~GLO~", "~GLO~", "effect-glow-tracer"),
    cls("~ST~", "~ST~", "effect-shimmer-title"),
    cls("~WD-Y~", "~", "droplet-amber"),
    cls("~WD-R~", "~", "droplet-crimson"),
    cls("~WD-PK~", "~", "droplet-fuchsia"),
    cls("~WD-PR~", "~", "droplet-amethyst"),
    cls("~WD-O~", "~", "droplet-tangerine"),
    cls("~WD-SL~", "~", "droplet-slate"),
    cls("~FUNC~", "~FUNC~", "dev-chip-function"),
    cls("~VAR~", "~VAR~", "dev-chip-variable"),
    cls("~STR~", "~STR~", "dev-chip-string"),
    cls("~RS~", "~RS~", "av-chip-radar-sweep"),
    cls("~HD~", "~HD~", "av-chip-heading"),
    cls("~AL~", "~AL~", "av-chip-altimeter"),
    cls("~PP-C~", "~", "megachip-plasma plasma-cyan"),
    cls("~PP-O~", "~", "megachip-plasma plasma-orange"),
    cls("~PP-R~", "~", "megachip-plasma plasma-crimson"),
    cls("~PP-L~", "~", "megachip-plasma plasma-lime"),
    cls("~GB-B~", "~", "megachip-glass-bracket bracket-blue"),
    cls("~GB-PR~", "~", "megachip-glass-bracket bracket-amethyst"),
    cls("~GB-PK~", "~", "megachip-glass-bracket bracket-fuchsia"),
    cls("~GB-Y~", "~", "megachip-glass-bracket bracket-amber"),
    cls("~DR~", "~DR~", "jr-chip-date-plate"),
    cls("~MD~", "~MD~", "jr-chip-mood"),
    cls("~WX~", "~WX~", "jr-chip-weather"),
    cls("~B-B~", "~", "aero-glass-badge-chip badge-frame-sky"),
    cls("~B-G~", "~", "aero-glass-badge-chip badge-frame-emerald"),
    cls("~B-O~", "~", "aero-glass-badge-chip badge-frame-orange"),
    cls("~B-R~", "~", "aero-glass-badge-chip badge-frame-crimson"),
    cls("~B-PR~", "~", "aero-glass-badge-chip badge-frame-amethyst"),
    cls("~B-Y~", "~", "aero-glass-badge-chip badge-frame-gold"),
    cls("~TL~", "~TL~", "effect-tinted-lens"),
    cls("~SL~", "~SL~", "effect-audio-stream-loop"),
    cls("~BG~", "~BG~", "effect-biogel-capsule"),
    cls("~FT~", "~FT~", "jr-folder-tab"),
    cls("~MC~", "~MC~", "jr-digital-counter"),
    cls("~WR~", "~WR~", "effect-neon-ribbon"),
    cls("~SH-B~", "~", "gel-chip-swayed swayed-sky"),
    cls("~SH-G~", "~", "gel-chip-swayed swayed-emerald"),
    cls("~SH-O~", "~", "gel-chip-swayed swayed-orange"),
    cls("~SH-PR~", "~", "gel-chip-swayed swayed-amethyst"),
    cls("~PH-B~", "~", "gel-chip-pill-variant pill-sky"),
    cls("~PH-G~", "~", "gel-chip-pill-variant pill-emerald"),
    cls("~PH-O~", "~", "gel-chip-pill-variant pill-orange"),
    cls("~PH-PR~", "~", "gel-chip-pill-variant pill-amethyst"),
    cls("~PC-Y~", "~", "gel-chip-pastel pastel-yellow"),
    cls("~PC-B~", "~", "gel-chip-pastel pastel-blue"),
    cls("~PC-G~", "~", "gel-chip-pastel pastel-green"),
    cls("~PC-PK~", "~", "gel-chip-pastel pastel-pink"),
    cls("~PC-PR~", "~", "gel-chip-pastel pastel-purple"),
    cls("~PC-O~", "~", "gel-chip-pastel pastel-orange"),
    cls("~DR-O~", "~", "gel-chip-droplet-ribbon droplet-ribbon-tangerine"),
    cls("~DR-Y~", "~", "gel-chip-droplet-ribbon droplet-ribbon-citrus"),
    cls("~DR-G~", "~", "gel-chip-droplet-ribbon droplet-ribbon-emerald"),
    cls("~DR-B~", "~", "gel-chip-droplet-ribbon droplet-ribbon-sapphire"),
    cls("~DR-PR~", "~", "gel-chip-droplet-ribbon droplet-ribbon-amethyst"),
    cls("~DR-PK~", "~", "gel-chip-droplet-ribbon droplet-ribbon-fuchsia"),
    cls("~DR-R~", "~", "gel-chip-droplet-ribbon droplet-ribbon-crimson"),
    cls("~DR-SL~", "~", "gel-chip-droplet-ribbon droplet-ribbon-slate"),
    cls("~H1~", "~H1~", "header-1"),
    cls("~H2~", "~H2~", "header-2"),
    cls("~H3~", "~H3~", "header-3"),
    cls("~BQ~", "~BQ~", "blockquote-list"),
    cls("~BUL~", "~BUL~", "bulleted-list"),
    cls("~MH~", "~MH~", "mega-header"),
];
function cat(...lists) {
    return lists.flat();
}
// Per-app bundles in each app's EXACT current order (runtime behavior preserved)!
// Formly's <em> carries isItalic: true, Imbuer's does not!
export const IMBUER = cat(CORE_ORBS, [SPARK], FLASHES, WD_AW_SF_IMBUER, TAG3, BUB3, FX_CORE, CODE_TRIO_BASE);
export const FORMLY = cat(CORE_ORBS, EXTRA_ORBS, [SPARK], FLASHES, [CODE_TRIO_BASE[0], CODE_TRIO_BASE[1],
    withExtra(CODE_TRIO_BASE[2], { isItalic: true })], TAG3, TAG5_EXTRA, BUB3, BUB13_EXTRA, WD_SF_AW_FORMLY, FORMLY_TAIL);
export const APPS = { imbuer: IMBUER, formly: FORMLY };
