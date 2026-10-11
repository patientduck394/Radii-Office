-- keydown.lua — single source of truth for Keydown markup definitions!
-- Imbuer and Formly each carry a hand-copied keydownDefinitions table that has
-- DRIFTED apart (29 vs 130+ entries)! Edit here, rebuild the JSON bundles!
-- Runtime JS stays as-is: these bundles are data artifacts plus drift check!

local M = {}

local function def(open, close, kind, value)
  return { open = open, close = close, [kind] = value }
end

local function cls(open, close, className)
  return def(open, close, "className", className)
end

local function tag(open, close, tagName)
  return def(open, close, "tagName", tagName)
end

-- Copy a def with one extra field (e.g. Formly's isItalic flag on <em>)!
local function with(t, k, v)
  local c = { open = t.open, close = t.close }
  for key, val in pairs(t) do
    if key ~= "open" and key ~= "close" then c[key] = val end
  end
  c[k] = v
  return c
end

-- Shared chunks (same object reused by both apps keeps them in sync)!
local core_orbs = {
  cls("=Y=", "=Y=", "gel-orb gel-y"),
  cls("=R=", "=R=", "gel-orb gel-r"),
  cls("=G=", "=G=", "gel-orb gel-g"),
  cls("=C=", "=C=", "gel-orb gel-c"),
  cls("=B=", "=B=", "gel-orb gel-b"),
}
local spark = cls("&&", "&&", "spark-text")
local flashes = {
  cls("~G~", "~G~", "gel-green-flash"),
  cls("~U~", "~U~", "liquid-underline"),
  cls("~B~", "~B~", "glossy-border-badge"),
  cls("~S~", "~S~", "cyber-glow-spark"),
  cls("~L~", "~L~", "liquid-text-glow"),
  cls("~E~", "~E~", "embossed-glass-text"),
}
local code_trio_base = {
  tag("`", "`", "code"),
  tag("**", "**", "strong"),
  tag("*", "*", "em"),
}
local tag3 = {
  cls("!#A#", "#", "aero-tag-chip tag-chip-a"),
  cls("!#G#", "#", "aero-tag-chip tag-chip-g"),
  cls("!#O#", "#", "aero-tag-chip tag-chip-o"),
}
local bub3 = {
  cls("#C#", "#", "gel-bubble-chip gel-chip-cyan"),
  cls("#O#", "#", "gel-bubble-chip gel-chip-orange"),
  cls("#G#", "#", "gel-bubble-chip gel-chip-green"),
}
local fx_core = {
  cls("~MP~", "~MP~", "effect-mercury-pearl"),
  cls("~CB~", "~CB~", "effect-screen-cavity"),
  cls("~DS~", "~DS~", "effect-drop-shadow-window"),
  cls("~GL~", "~GL~", "effect-glow-tube"),
  cls("~PM~", "~PM~", "effect-plasma-gel"),
}
local wd_aw_sf_imbuer = {
  cls("~WD~", "~WD~", "gel-chip-waterdrop"),
  cls("~AW~", "~AW~", "gel-chip-aurorawave"),
  cls("~SF~", "~SF~", "gel-chip-solarflare"),
}

-- Formly-only extras!
local extra_orbs = {
  cls("=V=", "=V=", "gel-orb gel-v"),
  cls("=P=", "=P=", "gel-orb gel-p"),
  cls("=O=", "=O=", "gel-orb gel-o"),
  cls("=MG=", "=MG=", "gel-orb gel-mg"),
  cls("=LM=", "=LM=", "gel-orb gel-lm"),
  cls("=AQ=", "=AQ=", "gel-orb gel-aq"),
  cls("=SL=", "=SL=", "gel-orb gel-sl"),
}
local tag5_extra = {
  cls("!#R#", "#", "aero-tag-chip tag-chip-r"),
  cls("!#PR#", "#", "aero-tag-chip tag-chip-pr"),
  cls("!#PK#", "#", "aero-tag-chip tag-chip-pk"),
  cls("!#Y#", "#", "aero-tag-chip tag-chip-y"),
  cls("!#SL#", "#", "aero-tag-chip tag-chip-sl"),
}
local bub13_extra = {
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
}
local wd_sf_aw_formly = {
  cls("~WD~", "~WD~", "gel-chip-waterdrop"),
  cls("~SF~", "~SF~", "gel-chip-solarflare"),
  cls("~AW~", "~AW~", "gel-chip-aurorawave"),
}
local formly_tail = {
  cls("~SM~", "~SM~", "applet-glass-stamp"),
  fx_core[1], -- ~MP~ shared with Imbuer!
  cls("~PG~", "~PG~", "effect-prism-refract"),
  fx_core[2], -- ~CB~ shared with Imbuer!
  cls("~SR~", "~SR~", "effect-sunlight-ray"),
  cls("~OA~", "~OA~", "effect-abyssal-plate"),
  cls("~MM~", "~MM~", "effect-metallic-mesh"),
  cls("~FE~", "~FE~", "effect-fluid-expand"),
  cls("~MR~", "~MR~", "effect-metric-cavity"),
  cls("~PO~", "~PO~", "effect-pearl-orb"),
  cls("~LF~", "~LF~", "effect-lens-flare"),
  fx_core[3], -- ~DS~ shared with Imbuer!
  fx_core[4], -- ~GL~ shared with Imbuer!
  cls("~HB~", "~HB~", "effect-hardware-bevel"),
  cls("~IS~", "~IS~", "effect-screen-segment"),
  cls("~GC~", "~GC~", "effect-gel-capsule"),
  cls("~KO~", "~KO~", "effect-fluid-orbit"),
  cls("~XG~", "~XG~", "effect-xray-glass"),
  cls("~WL~", "~WL~", "effect-waveform-line"),
  fx_core[5], -- ~PM~ shared with Imbuer!
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
}

local function cat(...)
  local out = {}
  for _, list in ipairs({ ... }) do
    for _, item in ipairs(list) do out[#out + 1] = item end
  end
  return out
end

-- Per-app bundles in each app's EXACT current order (runtime behavior preserved)!
-- Formly's <em> carries isItalic=true, Imbuer's does not!
M.imbuer = cat(core_orbs, { spark }, flashes, wd_aw_sf_imbuer, tag3, bub3,
  fx_core, code_trio_base)

M.formly = cat(core_orbs, extra_orbs, { spark }, flashes,
  { code_trio_base[1], code_trio_base[2], with(code_trio_base[3], "isItalic", true) },
  tag3, tag5_extra, bub3, bub13_extra, wd_sf_aw_formly, formly_tail)

return M
