# POOLSIDE

**The complete guide to Poolside: what it is, how every Poolside style is built, and how to write a new one that is indistinguishable from the 360 hand-made designs of Poolside 2, 3, 4 and 2A.**

This guide is for two kinds of readers. **AI agents** (like Claude) get exact rules, the exact numbers the existing designs use, working code to copy, and a checklist. **People** get the idea behind the look, a tour of the designs, and the steps to add their own. Everything here was read from the real stylesheet (`writeout/unique-styles.css`) and the real data (`writeout/psl-data.js`), not remembered, and every code block that is marked as an example is the exact code of an existing design.

How to read it: Part 1 says what Poolside is. Part 2 shows how one style is put together. Part 3 holds the exact color palettes. Part 4 holds the house rules. Part 5 is a library of real designs with their full code, grouped by collection. Part 6 is a step-by-step recipe with two new designs worked out and tested. Part 7 lists every place a new design must be registered. Part 8 has the full catalogue of all 360 designs. Part 9 has questions and answers.

## The 14 rules in one page (for AI agents)

1. A Poolside style is **one design rule plus five colorway rules**. The design rule is `.us-<id>`, the colorways are `.us-<id>-1` to `.us-<id>-5`. Words wear it as `<span class="us-chip us-<id> us-<id>-N">`.
2. The **id** is a two-letter collection prefix plus a slug of the name: lowercase letters and digits only, 20 characters at most. Poolside 2 uses `pw`, Poolside 3 uses `pt`, Poolside 4 uses `pf`, Poolside 2A uses `qa`.
3. There are **two variable sets**. Poolside 2 and 2A use `--m --ml --mx --md --mk` (main, light, extra light, dark, darkest). Poolside 3 and 4 use `--o --ol --c --b --w --dk` (accent, light accent, water, deep water, foam, darkest). A design uses only the variables of its own set.
4. Every colorway rule sets **all** the variables of its set, in that order, with **hex values copied exactly** from the ten palettes in Part 3. Never invent a color.
5. Colors in a design rule are **only** the variables, `#ffffff`, `#000000`, and white or black with an alpha (`rgba(255,255,255,0.5)`). The only exceptions in 360 designs are steel, brass and paper-white (Part 4.8).
6. Draw **a real thing in pure CSS**: a tile, a rope, a float, a ticket, a glass, a sign, a type effect. Use layered gradients, borders, `box-shadow`, `clip-path`, `mask`, and at most two pseudo-elements (`::before`, `::after`). No images, no `url()`, no JavaScript, no web fonts.
7. Never set `display` (a redundant `display: inline-block` is the only exception), `position` or `z-index` on the main rule. The shared `.us-chip` base already makes the chip `inline-block`, `position: relative` and `isolation: isolate`.
8. Every pseudo-element has `content`, `position: absolute` and `pointer-events: none`. Make room for ornaments with padding (inside) or margin (outside).
9. Choose a **text recipe** and copy it exactly (Part 4.1): white text with a dark halo on deep fills, dark ink with a white glow on pale fills, or a dark-on-dark neon/glow look.
10. The usual property order is: `background`, `color`, font properties, `text-shadow`, `border`, `border-radius`, `margin`, `padding`, `box-shadow`, `transform`.
11. Use the sizes the designs use: padding `1px 12px` to `1px 16px` (the base is `1px 10px`), radius `999px`, `3px`, `6px`, `4px`, `8px` or `0`, borders 1 to 3px, text weight 800 (the base) or 900.
12. Make a **new** idea, not a variation of an old one: check the catalogue in Part 8. Neighbouring designs must not look alike.
13. Test all five colorways on a light and a dark page, with a short and a long word, and run the lint script in Part 6.
14. Register the design in the places listed in Part 7, rebuild, and check it in the Poolside Style Lookup.

## Part 1. What Poolside is

**Poolside** is a design language for things that feel like a bright pool on a sunny day: clear water running from cyan to blue, with **orange** as a crisp accent, drawn from lane ropes, life rings, pool tiles, bubbles, buoys, signs, snacks and swim gear. It grew out of Frutiger Aero (the glassy 2000s look) but is flatter, simpler and keeps a very small palette on purpose.

The word is used in three connected ways in Radii Office:

- **The Poolside style**, the look itself. It is used by **PoolsideUI** (26 Svelte components), the **Waterflow** notebook app, and the Poolside layout (the Poolside layout is only for Writeout and Bitbook).
- **Poolside Keydown** (PK), a dialect of Keydown with its own marks: `/ Title` for headings, `()` rings for lists, and angle chips such as `<ring words>`.
- **Poolside styles** (this guide), the collections of hand-drawn chip designs. They are called Poolside, Poolside 2, 3, 4, 5, 6, 7, 8, 9, 10, 2A, 3A and 4A. Each collection has **90 designs with 5 colorways each = 450 styles**; together that is 1,170 designs and **5,850 styles**. They are found with **Poolside Style Lookup (PSL)** in Waterflow and Bitbook, and written `@id-N@words@` in Keydown or `<id-N words>` in Poolside Keydown.

### The look in six sentences

1. **Three families of color and nothing else**: cyan for light shallow water, blue for the deep end and for text, orange for the accent. Greens, purples and pinks do not belong in the pool. The only red-orange is Sunburn (`#f4511e`), and Poolside Keydown's tip and stop notes are the one deliberate exception.
2. **The orange is crisp.** It is never blended into the water. It shows up as stripes, edges, rings, dots and solid shapes sitting on cyan and blue, like a lane rope or a life ring. Nothing fades from blue into orange.
3. **Things, not effects.** Every design is a real object drawn in CSS: a tile, a rail, a float, a ticket, a glass, a key, a sign, or a type effect. A design that is only a random mix of gradients is wrong.
4. **Flat and clear.** Depth comes from a soft shadow, a gloss, an inner shadow or a hard offset, never from heavy glass or blur.
5. **Readable first.** Every colorway, in every palette, keeps its words readable at normal size.
6. **Round and friendly.** Pills (`999px`) are the most common shape, then small radii of 3 to 8px, and sharp corners (`0` to `2px`) only for tiles, paper and metal.

### The Poolside user-interface palette (not the style palettes)

PoolsideUI and Waterflow use these design tokens. The chip styles in this guide use their own ten-palette sets (Part 3), which are a warmer, summer version of the same idea.

| Token | Value | Meaning |
| --- | --- | --- |
| `--pool-water-1` | `#67e8f9` | sunny shallow water |
| `--pool-water-2` | `#22d3ee` | water |
| `--pool-water-3` | `#00b2e3` | the deep end: a vivid cyan (darker cyans turn teal, bluer ones turn Aero) |
| `--pool-deep` | `#075985` | text on light water |
| `--pool-ink` | `#0c4a6e` | body text |
| `--pool-orange` | `#f97316` | life rings, lane ropes, stripes |
| `--pool-orange-deep` | `#c2410c` | dark orange |
| `--pool-water-soft` | `#d6f4fc` | the light fill of a flat button (its border is the main color) |
| `--pool-orange-soft` | `#ffe9d6` | light orange |
| `--pool-tile` | `#f0fdff` | white pool tiles |
| `--pool-tile-line` | `#cff4fc` | grout |
| `--pool-line` | `rgba(14, 165, 233, 0.4)` | borders |
| `--pool-shadow` | `rgba(8, 145, 178, 0.22)` | soft blue shadow |
| `--pool-radius` | `16px` | round corners |

### The four collections this guide covers

| Collection | Id prefix | Variables | Mood |
| --- | --- | --- | --- |
| **Poolside 2** | `pw` | `--m --ml --mx --md --mk` | The first large set: water and light, tiles and deck, toys, beach kit, treats, signs, prints, badges, screens, text looks. Mostly white text on solid or gradient fills. |
| **Poolside 3** | `pt` | `--o --ol --c --b --w --dk` | Pool party and retro summer: glitter, party props, drinks, passes, 1950s Googie and boomerang signs, team jerseys, photo booth, mixtape, pop art, chrome type. |
| **Poolside 4** | `pf` | `--o --ol --c --b --w --dk` | Summer-day gear, architecture, passes and tags, snacks, postcards and diner stripes, patches; more dark-ink-on-paper designs than Poolside 3. |
| **Poolside 2A** | `qa` | `--m --ml --mx --md --mk` | A continuation of Poolside 2 with the same colorways and feel: pool structure, toys, picnic food, prints and text lines. |

Poolside 3A and 4A (ids `qb` and `qc`) continue Poolside 3 and 4 in the same way, and Poolside 5 to 10 are further collections. Everything in this guide applies to them too.

## Part 2. How one style is built

### 2.1 The three pieces

Every Poolside style is made of three pieces of CSS in `writeout/unique-styles.css`, plus one line of data:

1. The shared **base** `.us-chip` (the same for every Unique Style, not only Poolside).
2. The **design rule** `.us-<id>` (plus optional `::before` and `::after` rules): what the chip looks like.
3. Five **colorway rules** `.us-<id>-1` to `.us-<id>-5`: only CSS variables, nothing else.
4. One **data entry** in `writeout/psl-data.js` so the style can be found, searched and written in Poolside Keydown.

### 2.2 The base rule (do not repeat it, rely on it)

```css
.us-chip {
    display: inline-block; position: relative; isolation: isolate;
    padding: 1px 10px; margin: 0 2px; border-radius: 8px;
    font-weight: 800; line-height: 1.45; vertical-align: baseline; caret-color: currentColor;
}
@media (prefers-reduced-motion: reduce) {
 .us-chip, .us-chip::before, .us-chip::after { animation: none !important; }
}
```

So a design starts from **padding `1px 10px`, margin `0 2px`, radius `8px`, weight 800**, and may change any of them. `position: relative` and `isolation: isolate` are why a pseudo-element can be placed inside the chip with `position: absolute`. Because of the reduced-motion rule, animations are safe to use.

### 2.3 What the rendered text looks like

```html
<span class="us-chip us-pwcrest us-pwcrest-1" spellcheck="false">Wave Crest</span>
```

The classes are `us-chip`, then the design class, then the colorway class. The colorway class only supplies variables; the design class turns them into a picture.

### 2.4 How to write a style

| Where | Written | Example |
| --- | --- | --- |
| Keydown (Writeout, Bitbook, OpenDB, Keydown.js) | `@id-N@words@` | `@pwcrest-1@Wave Crest@` |
| Poolside Keydown (Waterflow notes, or inside `;;pk{ }` elsewhere) | `<id-N words>` | `<ptchecker-3 Checker>` |
| Poolside Style Lookup | search, click, star | Waterflow toolbar **Styles**; Bitbook gallery **Poolside Style Lookup** |

`N` is the colorway number from 1 to 5. Colorway 1 is the first name in the design's palette list (Part 3 explains the lists).

### 2.5 The two variable sets

| Set | Variables, in order | Used by |
| --- | --- | --- |
| **M** (main) | `--m --ml --mx --md --mk` | Poolside 2, Poolside 2A |
| **O** (orange and water) | `--o --ol --c --b --w --dk` | Poolside 3, 4, 3A, 4A |

**M set.** `--m` is the main color: the body fill. `--ml` is its light tone: highlights, light stripes, the light end of a gradient. `--mx` is extra light: a near-white wash, grout, foam, bubbles, the paper of a light chip. `--md` is dark: edges, shadows, the dark end of a gradient. `--mk` is the darkest: ink on pale chips and the halo around white text.

**O set.** `--c` is the water (the light, top end of the body gradient) and `--b` the deep water (the bottom end). `--o` is the accent: stripes, rings, edges, dots. In the warm palettes `--o` is orange, in the cool palettes (Deep Lane, Chlorine Blue, Splash Pad) it is cyan. `--ol` is the light accent: highlights, drops, light stripes. `--w` is foam: the paper of a pale chip, grout, bubbles. `--dk` is the darkest: ink on pale chips and the halo around white text.

## Part 3. The palettes (exact values)

There are **ten named palettes per variable set**. A design shows five of them, one per colorway number. The names and values never change from design to design. **Copy the hex values exactly.**

### 3.1 The M set: Poolside 2 and Poolside 2A

| Palette | `--m` | `--ml` | `--mx` | `--md` | `--mk` |
| --- | --- | --- | --- | --- | --- |
| Tangerine | `#ff7a1a` | `#ffb36b` | `#fff1e3` | `#c2410c` | `#4a1a03` |
| Aqua | `#0ea5e9` | `#7dd3fc` | `#f0f9ff` | `#0369a1` | `#082f49` |
| Sunburn | `#f4511e` | `#ff8a65` | `#ffece5` | `#b5300b` | `#431204` |
| Lagoon | `#06b6d4` | `#67e8f9` | `#ecfeff` | `#0e7490` | `#083344` |
| Creamsicle | `#ffa552` | `#ffd3a8` | `#fff8f0` | `#dd7420` | `#5c300a` |
| Chlorine | `#22d3ee` | `#a5f3fc` | `#f0fdff` | `#0891b2` | `#0a3a4a` |
| Marmalade | `#fb8c00` | `#ffc06b` | `#fff4e6` | `#c25e00` | `#4a2400` |
| Ice | `#38bdf8` | `#bae6fd` | `#f5fbff` | `#0284c7` | `#0c2d48` |
| Apricot | `#ff9f5a` | `#ffcba1` | `#fff5ec` | `#d0621f` | `#5a2a0d` |
| Deep Dive | `#1d4ed8` | `#60a5fa` | `#eff6ff` | `#1e3a8a` | `#0b1640` |

Tangerine, Sunburn, Creamsicle, Marmalade and Apricot are the warm palettes (orange and red-orange). Aqua, Lagoon, Chlorine, Ice and Deep Dive are the cool palettes (blue and cyan).

### 3.2 The O set: Poolside 3 and Poolside 4

| Palette | `--o` | `--ol` | `--c` | `--b` | `--w` | `--dk` |
| --- | --- | --- | --- | --- | --- | --- |
| Lido | `#ff7f11` | `#ffbf80` | `#00c2d6` | `#00609c` | `#e0fbfd` | `#06283d` |
| Orangeade | `#ff5a00` | `#ffb27a` | `#ff9a3c` | `#b84300` | `#fff3e6` | `#431800` |
| High Dive | `#ff5500` | `#ffa36b` | `#00b3ff` | `#003f8f` | `#e1f4ff` | `#001b44` |
| Deep Lane | `#00c8ff` | `#9eeaff` | `#2f80ed` | `#0b3a8c` | `#eaf4ff` | `#061a40` |
| Chlorine Blue | `#00e0ff` | `#b8f6ff` | `#13a8d6` | `#0b5f7d` | `#ebfcff` | `#063646` |
| Riviera | `#ff6a3d` | `#ffb59a` | `#27b4e8` | `#0b4f9e` | `#e7f6ff` | `#0a1f44` |
| Sunset Deck | `#e8590c` | `#ffc078` | `#ff922b` | `#a33a06` | `#fff4e6` | `#3d1502` |
| Swim Meet | `#ff9a1f` | `#ffd08a` | `#20c4f4` | `#145da0` | `#eaf8ff` | `#0c2d57` |
| Mango Float | `#ff7a00` | `#ffd08a` | `#ffb03b` | `#c25700` | `#fff8ec` | `#4a2600` |
| Splash Pad | `#3ad7ff` | `#bfefff` | `#3b82f6` | `#1e3a8a` | `#eef6ff` | `#0b1640` |

Lido, Orangeade, High Dive, Riviera, Sunset Deck, Swim Meet and Mango Float have an orange or warm accent. Deep Lane, Chlorine Blue and Splash Pad are all-blue palettes whose accent `--o` is cyan.

### 3.3 Which five palettes does a design use?

**Poolside 2 and 2A.** The five colorways slide along a ring of the ten palettes. Design 1 of Poolside 2 shows Tangerine, Aqua, Sunburn, Lagoon, Creamsicle. Every next design starts with the next palette of the start ring and then continues with the first four of the previous design. The start ring is **Tangerine, Chlorine, Marmalade, Ice, Apricot, Deep Dive, Creamsicle, Lagoon, Sunburn, Aqua** and then repeats. Poolside 2A uses the same sliding rule but starts at Chlorine.

| Collection | Design | Colorways 1 to 5 |
| --- | --- | --- |
| Poolside 2 | `pwcrest` | Tangerine, Aqua, Sunburn, Lagoon, Creamsicle |
| Poolside 2 | `pwrefract` | Chlorine, Tangerine, Aqua, Sunburn, Lagoon |
| Poolside 2 | `pwshallows` | Marmalade, Chlorine, Tangerine, Aqua, Sunburn |
| Poolside 2A | `qacannonballcrown` | Chlorine, Tangerine, Aqua, Sunburn, Lagoon |
| Poolside 2A | `qatidalstripes` | Marmalade, Chlorine, Tangerine, Aqua, Sunburn |
| Poolside 2A | `qaskippingstone` | Ice, Marmalade, Chlorine, Tangerine, Aqua |

**Poolside 3 and 4.** Twelve fixed five-palette patterns repeat in a cycle of twelve designs, and Poolside 3 and 4 use the same twelve in the same order: design 1, 13, 25 ... use pattern 1, design 2, 14, 26 ... use pattern 2, and so on up to pattern 12.

| Pattern | Designs | Colorways 1 to 5 |
| --- | --- | --- |
| 1 | 1, 13, 25, ... | Lido, Orangeade, High Dive, Deep Lane, Chlorine Blue |
| 2 | 2, 14, 26, ... | Riviera, Sunset Deck, Swim Meet, Chlorine Blue, Mango Float |
| 3 | 3, 15, 27, ... | High Dive, Mango Float, Lido, Splash Pad, Deep Lane |
| 4 | 4, 16, 28, ... | Swim Meet, Orangeade, Riviera, Deep Lane, Sunset Deck |
| 5 | 5, 17, 29, ... | Lido, Sunset Deck, High Dive, Chlorine Blue, Splash Pad |
| 6 | 6, 18, 30, ... | Riviera, Mango Float, Swim Meet, Splash Pad, Orangeade |
| 7 | 7, 19, 31, ... | High Dive, Orangeade, Lido, Deep Lane, Chlorine Blue |
| 8 | 8, 20, 32, ... | Swim Meet, Sunset Deck, Riviera, Chlorine Blue, Mango Float |
| 9 | 9, 21, 33, ... | Lido, Mango Float, High Dive, Splash Pad, Deep Lane |
| 10 | 10, 22, 34, ... | Riviera, Orangeade, Swim Meet, Deep Lane, Sunset Deck |
| 11 | 11, 23, 35, ... | High Dive, Sunset Deck, Lido, Chlorine Blue, Splash Pad |
| 12 | 12, 24, 36, ... | Swim Meet, Mango Float, Riviera, Splash Pad, Orangeade |

This is how the existing sets look; a new design in a collection that continues the pattern should follow it, so that neighbours differ and every palette is used equally. A one-off design may use any five of the ten palettes, in any order, as long as all five colorway rules exist.

The data entry in `psl-data.js` stores the five palette **names** in colorway order, so the names shown in the Style Lookup match the colors.

## Part 4. The house rules (exact numbers)

These numbers were counted across all 360 designs of Poolside 2, 3, 4 and 2A. Use them and a new design will sit comfortably between the old ones.

### 4.1 Text: choose one of five recipes

The words must stay readable in all five colorways. There are five proven recipes.

| Recipe | When | Exact CSS | Used by |
| --- | --- | --- | --- |
| **A. White on deep, M set** | Solid fill or a gradient that stays mid or dark | `color: #ffffff; text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);` | 59 designs (34 in Poolside 2, 25 in 2A) |
| **A2. White on gradient, M set** | A gradient with a light end | `color: #ffffff; text-shadow: 0 1px 2px color-mix(in srgb, var(--mk) 80%, transparent), 0 0 2px color-mix(in srgb, var(--mk) 55%, transparent);` | 42 designs |
| **B. White on deep, O set** | Water gradient, orange or dark fills | `color: #ffffff; text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);` | 76 designs (33 in Poolside 3, 43 in 4) |
| **C. Dark ink on pale** | Foam, paper, glass, any light fill | `color: var(--dk);` (O set) or `color: var(--mk);` (M set), with `font-weight: 900;` and, in Poolside 4, `text-shadow: 0 0 3px #ffffff;` | 154 designs use dark ink; the 32 pale designs of Poolside 4 add the white glow |
| **D. Glow or outline** | Dark chips, neon, type effects | Neon: `text-shadow: 0 0 2px var(--m), 0 0 6px var(--m), 0 0 12px var(--m)`. Strong halo: `text-shadow: 0 1px 2px var(--dk), 0 0 3px var(--dk)` (7 designs). | neon, marquee, beacon, jersey |

**Rule of thumb.** If the middle of the chip is darker than mid-gray, use white text with recipe A, A2 or B. If it is lighter, use dark ink with weight 900 (recipe C). Never use a palette color for text on a fill of the same family (cyan words on a cyan chip).

### 4.2 Padding

The base padding is `1px 10px`. The most used overrides are: `1px 14px` (35 designs), `1px 12px` (18), `1px 15px` (12), `1px 16px` (11), `0 13px` and `0 14px` (7 each), `1px 13px` (6). Grow the side that has an ornament: ring on the left, `1px 13px 1px 22px`; knob on the right, `1px 25px 1px 12px`; ornament on top, `6px 12px 1px`, `7px 12px 1px` or `8px 12px 1px`; underline row, `1px 12px 7px`.

### 4.3 Radius

| Radius | Designs | Meaning |
| --- | --- | --- |
| `999px` | 62 | pill: floats, drinks, rings, caps, capsules |
| `0` | 42 | sharp: paper, tiles, text-only looks, clip-path shapes |
| `3px` | 39 | signs, tags, rails |
| `6px` | 35 | general soft corner |
| `4px` | 24 | tags, ribbons |
| `8px` | 23 | the base value |
| `2px` | 19 | tiles, hardware |
| `5px`, `10px`, `9px` | 23 | varied |
| `999px 999px 4px 4px` and similar | 10 | cone, arch and dome shapes: round on one side, flat on the other |

### 4.4 Borders, weight, spacing

- **Borders**: `1px solid` (51 designs), `2px solid` (27), `3px solid` (9), `3px dotted` (4), `2px dashed` (3). The color is always a variable.
- **Weight**: the base 800 stays in 195 designs, `font-weight: 900` is set in 154 (every pale-ink design), 700 or 400 appear 8 times for type effects.
- **Letter spacing**: only for labels, passes and signs: `0.03em` to `0.12em`, with `text-transform: uppercase` and often `font-size: 0.9em`.
- **Shadows**: `box-shadow` appears in 81 designs: a ring (`0 0 0 1px var(--o)`), a hard offset (`3px 3px 0 var(--c)`), an inner edge (`inset 0 -3px 0 ...`), or a soft glow (`0 0 12px var(--c)`).

### 4.5 Gradients: how to order the layers

- In `background`, **the first layer is on top**. Put details first (dots, stripes, glints), then gloss, then the body fill last.
- The body is `linear-gradient(180deg, var(--c), var(--b))` in the O set, and `linear-gradient(180deg, var(--m), var(--md))` or `(var(--ml), var(--m))` in the M set. A flat body is just `var(--m)`, `var(--c)` or `var(--w)`.
- Patterns are **tiled** with a size and `repeat-x` or the default repeat: `radial-gradient(...) 0 0 / 12px 6px repeat-x`, `repeating-linear-gradient(90deg, A 0 10px, B 10px 20px)`, `repeating-conic-gradient(...)`.
- Make translucent parts with `color-mix(in srgb, var(--x) 40%, transparent)`. Do not write rgba values for palette colors.
- A **gradient border** is two backgrounds: `background: linear-gradient(white, white) padding-box, <gradient> border-box;` plus `border: 4px solid transparent;`.
- A **gradient inside letters**: `background: <gradient>; -webkit-background-clip: text; background-clip: text; color: transparent;`.

### 4.6 Ornaments: the pseudo-element contract

- `::before` and `::after` always have `content`, `position: absolute` and `pointer-events: none`.
- To center vertically: `top: 50%; margin-top: -Hpx` (half the height). Examples: `width: 13px; height: 13px; margin-top: -6.5px`.
- Ornaments **inside** the chip live in the padding (`left: 4px` with `padding-left: 22px`). Ornaments **outside** the chip need `margin` of the same size on that side (`bottom: -5px` with `margin-bottom: 5px`).
- Only two pseudo-elements per design. If a shape needs more, draw the rest with background layers or `box-shadow`.
- Never use `z-index`. Keep ornaments out of the text area (in the padding, or outside the box): a positioned pseudo-element paints above the words.

### 4.7 Shapes: clip-path, mask, border-image

- `clip-path: polygon(...)` for ribbons, torpedoes and gems. Set `border-radius: 0`, and do not use borders or `box-shadow`: both are clipped away.
- `mask` (with the `-webkit-mask` twin) for perforations (the Pool Stamp).
- `border-image` for airmail borders. It ignores `border-radius`, so set it to 0.

### 4.8 Allowed colors

Allowed in a design rule: the variables of its own set, `#ffffff`, `#000000`, and white or black with alpha. The only exceptions in 360 designs are materials:

| Color | Where | Why |
| --- | --- | --- |
| `#f5f7fa`, `#aeb7c0` | `pwhandrail` | steel of a handrail |
| `#c9a24a` | `ptaviator` | brass frame of aviator shades |
| `#fffbe6`, `#fffdf8`, `#fff9ef`, `#fbf7f0` | `pwarrowsign`, `pwsnackbar`, `ptvtowel`, `ptboomprint`, `ptslide` | warm paper white |
| `rgba(0,60,140,0.35)` | `pfwettext` | deep-blue water shadow |

Do not add more. Never use green, purple, pink, magenta, brown or gray as a design color.

### 4.9 Fonts

Only system stacks, and only for type effects. The stacks in use: `Impact, 'Arial Black', sans-serif` (jerseys, pop art), `'Arial Black', Impact, sans-serif` (extruded, chrome), `'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif` (bubble and outline letters), `'JetBrains Mono', ui-monospace, monospace` (LCD, pager, split-flap), `ui-monospace, Menlo, monospace`, `Georgia, 'Times New Roman', serif` (badges, trophies, snack bar), `Futura, 'Century Gothic', 'Trebuchet MS', sans-serif` (riso print), and `'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive` (club script). Most designs set no font at all.

### 4.10 Motion

Only two animations exist, both defined once at the bottom of `unique-styles.css`: `us-shimmer` (a background slide, for holographic looks) and `us-blink` (opacity 1 to 0.25, for lights). Reuse them. Do not add new keyframes without a good reason, and keep every animation slow (0.9 seconds or more).

### 4.11 What not to do (lessons from rejected versions)

- **Generated combinations.** A set made by mixing patterns, forms and treatments (a grid of "pattern x shape x border") was rejected as boring and off-vibe. Each design must be hand-drawn as one specific object.
- **Off-palette colors.** Fixed grays and electric yellows made several designs look the same and not Poolside. Use only palette variables.
- **Strangers in the family.** A continuation must take the palette rules of its parent set and the feel of its themes (gear, tiles, rails, tags, drinks, signs, text looks).
- **Near duplicates.** If you can swap two designs and nobody notices, one of them must change.
- **Tokens inside gradients.** If you build designs with a template system where a shortcut like `{PAPER}` expands to `linear-gradient(...)`, a shortcut that is itself a gradient cannot be placed inside another gradient. Write such parts out by hand.
- **Unreadable colorways.** Check all five. A pale palette (Ice, Creamsicle, Chlorine Blue, Splash Pad) is where white text most often fails.
- **Ornaments that collide.** Outside ornaments without margin overlap the next line.

## Part 5. The library: real designs with their full code

Every block below is the exact CSS of an existing design: the design rule (with pseudo-elements, if any) and its five colorway rules. The five palette names are listed in colorway order. Copy the structure, not the content: a new design draws a different thing.

### 5.1 Poolside 2

Poolside 2 uses the **M set** (`--m --ml --mx --md --mk`). White text with the dark halo (recipe A or A2) sits on solid or gradient fills; pale chips use `--mk` ink with weight 900.

#### `pwcrest`: A ruffle of foam along the top edge (Wave Crest, number 1)

The first background layer is a `radial-gradient` that is repeated sideways (`repeat-x`) every 12px and is only 6px tall, so it draws a row of little arcs along the top. The extra top padding (`6px 12px 1px`) makes room for it. White text with the dark halo.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-pwcrest {
    background: radial-gradient(circle at 6px -2px, transparent 0 5px, var(--mx) 5.5px 6.5px, transparent 7px) 0 0 / 12px 6px repeat-x, linear-gradient(180deg, var(--m), var(--md));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--mk) 80%, transparent), 0 0 2px color-mix(in srgb, var(--mk) 55%, transparent);
    border-radius: 6px;
    padding: 6px 12px 1px;
}
.us-pwcrest-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwcrest-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-pwcrest-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-pwcrest-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-pwcrest-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

#### `pwwhirl`: A pool whirl: conic stripes behind dark ink (Whirlpool, number 7)

`repeating-conic-gradient` alternates two tones every 15 degrees, and a pale radial glow in the middle keeps the words readable. A busy background gets dark ink with a three-layer pale glow, not white text.

Colorways 1 to 5: 1 Creamsicle, 2 Deep Dive, 3 Apricot, 4 Ice, 5 Marmalade.

```css
.us-pwwhirl {
    background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--mx) 88%, transparent) 0 30%, transparent 72%), repeating-conic-gradient(from 0deg at 50% 50%, var(--m) 0 15deg, var(--ml) 15deg 30deg);
    color: var(--mk);
    text-shadow: 0 0 2px var(--mx), 0 0 3px var(--mx), 0 0 4px var(--mx);
    border-radius: 999px;
    padding: 1px 14px;
    font-weight: 900;
}
.us-pwwhirl-1 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
.us-pwwhirl-2 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-pwwhirl-3 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-pwwhirl-4 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-pwwhirl-5 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
```

#### `pwbigtile`: Pool tiles: a grid in three layers (Big Tiles, number 16)

Vertical grout lines every 14px, a hairline along the top, a hairline along the bottom, and the plain fill last. Tiles are square, so the corners are only 2px.

Colorways 1 to 5: 1 Deep Dive, 2 Apricot, 3 Ice, 4 Marmalade, 5 Chlorine.

```css
.us-pwbigtile {
    background: linear-gradient(90deg, color-mix(in srgb, var(--mx) 70%, transparent) 1.5px, transparent 1.5px) 0 0 / 14px 100%, linear-gradient(var(--mx), var(--mx)) 0 0 / 100% 1.5px no-repeat, linear-gradient(var(--mx), var(--mx)) 0 100% / 100% 1.5px no-repeat, var(--m);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border: 1px solid var(--md);
    border-radius: 2px;
}
.us-pwbigtile-1 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-pwbigtile-2 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-pwbigtile-3 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-pwbigtile-4 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwbigtile-5 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
```

#### `pwhandrail`: A steel rail on top (Handrail, number 23)

A 3px strip of steel on top of the palette body. Metal is one of the few places a fixed color is allowed (`#f5f7fa` and `#aeb7c0`). The corners are round on top and almost square at the bottom, like a handle bar.

Colorways 1 to 5: 1 Marmalade, 2 Chlorine, 3 Tangerine, 4 Aqua, 5 Sunburn.

```css
.us-pwhandrail {
    background: linear-gradient(180deg, #f5f7fa, #aeb7c0 60%, #ffffff) 0 0 / 100% 3px no-repeat, linear-gradient(180deg, var(--ml), var(--m));
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 10px 10px 3px 3px;
    padding: 4px 12px 1px;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--md) 50%, transparent);
}
.us-pwhandrail-1 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwhandrail-2 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-pwhandrail-3 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwhandrail-4 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-pwhandrail-5 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
```

#### `pwdivering`: A ring drawn with ::before (Dive Ring Toy, number 36)

A 13px circle with a 3.5px border in `--m` and an inner shadow for depth. The left padding grows to 22px so the words do not sit on the ring.

Colorways 1 to 5: 1 Deep Dive, 2 Apricot, 3 Ice, 4 Marmalade, 5 Chlorine.

```css
.us-pwdivering {
    background: var(--mx);
    color: var(--mk);
    border: 1px solid var(--ml);
    border-radius: 999px;
    padding: 1px 13px 1px 22px;
    font-weight: 900;
}
.us-pwdivering::before {
    content: '';
    position: absolute;
    pointer-events: none;
    left: 4px;
    top: 50%;
    width: 13px;
    height: 13px;
    margin-top: -6.5px;
    box-sizing: border-box;
    border-radius: 50%;
    border: 3.5px solid var(--m);
    box-shadow: inset 0 1px 1px var(--md), 0 1px 0 rgba(255,255,255,0.8);
}
.us-pwdivering-1 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-pwdivering-2 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-pwdivering-3 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-pwdivering-4 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwdivering-5 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
```

#### `pwducky`: A rubber ducky: shine, beak and eye (Rubber Ducky, number 44)

A soft white radial shine, one square corner for the beak (`999px 999px 999px 5px`), and a 3px eye as `::before`.

Colorways 1 to 5: 1 Ice, 2 Marmalade, 3 Chlorine, 4 Tangerine, 5 Aqua.

```css
.us-pwducky {
    background: radial-gradient(ellipse 40% 50% at 30% 25%, rgba(255,255,255,0.75), transparent 70%), var(--m);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 999px 999px 999px 5px;
    padding: 1px 16px 1px 12px;
}
.us-pwducky::before {
    content: '';
    position: absolute;
    pointer-events: none;
    right: 7px;
    top: 4px;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--mk);
    box-shadow: 0 0 0 1px #ffffff;
}
.us-pwducky-1 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-pwducky-2 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwducky-3 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-pwducky-4 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwducky-5 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
```

#### `pwsnowcone`: Shaved ice: a dot grid and a cone-shaped radius (Snow Cone, number 53)

A tile of white dots every 4px over a light-to-main gradient. The top corners are round and the bottom corners are nearly flat (`999px 999px 4px 4px`).

Colorways 1 to 5: 1 Marmalade, 2 Chlorine, 3 Tangerine, 4 Aqua, 5 Sunburn.

```css
.us-pwsnowcone {
    background: radial-gradient(circle, rgba(255,255,255,0.75) 0.8px, transparent 1.3px) 0 0 / 4px 4px, linear-gradient(180deg, var(--ml), var(--m));
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 999px 999px 4px 4px;
    padding: 2px 14px 1px;
}
.us-pwsnowcone-1 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwsnowcone-2 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-pwsnowcone-3 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwsnowcone-4 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-pwsnowcone-5 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
```

#### `pwneontube`: A neon tube: the one dark chip of Poolside 2 (Neon Pool Tube, number 61)

The fill is `--mk` mixed 92% with black. The white text has three glow layers in `--m`, the border is `--ml`, and the box glows inside and outside.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-pwneontube {
    background: color-mix(in srgb, var(--mk) 92%, #000000);
    color: #ffffff;
    text-shadow: 0 0 2px var(--m), 0 0 6px var(--m), 0 0 12px var(--m);
    border: 2px solid var(--ml);
    border-radius: 4px;
    box-shadow: 0 0 5px var(--m), inset 0 0 5px var(--m);
}
.us-pwneontube-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwneontube-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-pwneontube-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-pwneontube-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-pwneontube-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

#### `pwribbon`: Swallowtail ribbon with clip-path (Ribbon Banner, number 71)

`clip-path: polygon(...)` cuts a notch into both ends. The radius is 0 because the clip draws the shape. Borders and box-shadows would be clipped away, so this design has none.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-pwribbon {
    background: linear-gradient(180deg, var(--ml), var(--m));
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 0;
    padding: 1px 17px;
    clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%, 6px 50%);
}
.us-pwribbon-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwribbon-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-pwribbon-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-pwribbon-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-pwribbon-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

#### `pwlcd`: Stopwatch LCD: monospace on a pale panel (Stopwatch LCD, number 76)

A pale vertical gradient, `JetBrains Mono` with a system fallback, `letter-spacing: 0.08em`, a thick 3px border in `--md` and an inset shadow like a screen set into a case.

Colorways 1 to 5: 1 Deep Dive, 2 Apricot, 3 Ice, 4 Marmalade, 5 Chlorine.

```css
.us-pwlcd {
    background: linear-gradient(180deg, var(--mx), color-mix(in srgb, var(--ml) 55%, var(--mx)));
    color: var(--mk);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    letter-spacing: 0.08em;
    border: 3px solid var(--md);
    border-radius: 4px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.25);
}
.us-pwlcd-1 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-pwlcd-2 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-pwlcd-3 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-pwlcd-4 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwlcd-5 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
```

#### `pwlongshadow`: Text only: a long shadow (Long Shadow, number 84)

`background: none`, ink in `--md`, and three 1px steps of text-shadow that fade from `--m` to a 60% `--ml`. No box at all.

Colorways 1 to 5: 1 Ice, 2 Marmalade, 3 Chlorine, 4 Tangerine, 5 Aqua.

```css
.us-pwlongshadow {
    background: none;
    color: var(--md);
    text-shadow: 1px 1px 0 var(--m), 2px 2px 0 var(--ml), 3px 3px 0 color-mix(in srgb, var(--ml) 60%, transparent);
    font-weight: 900;
    padding: 0 6px 0 3px;
    border-radius: 0;
}
.us-pwlongshadow-1 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-pwlongshadow-2 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwlongshadow-3 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-pwlongshadow-4 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwlongshadow-5 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
```

#### `pwhighlight`: A highlighter swipe (Highlighter Swipe, number 88)

One gradient bar, 60% tall and placed low (`0 75%`). The first and last stops are transparent so the ends look soft.

Colorways 1 to 5: 1 Lagoon, 2 Creamsicle, 3 Deep Dive, 4 Apricot, 5 Ice.

```css
.us-pwhighlight {
    background: linear-gradient(100deg, transparent 0 2%, var(--ml) 4% 96%, transparent 98%) 0 75% / 100% 60% no-repeat;
    color: var(--mk);
    font-weight: 900;
    padding: 0 4px;
    border-radius: 0;
}
.us-pwhighlight-1 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-pwhighlight-2 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
.us-pwhighlight-3 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-pwhighlight-4 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-pwhighlight-5 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
```

#### `pwholo`: Holographic water that moves (Holo Water, number 80)

A gradient 200% wide, slid by the shared `us-shimmer` animation (5 seconds, alternate). The base rule at the top of `unique-styles.css` switches every animation off for people who prefer reduced motion.

Colorways 1 to 5: 1 Aqua, 2 Sunburn, 3 Lagoon, 4 Creamsicle, 5 Deep Dive.

```css
.us-pwholo {
    background: linear-gradient(115deg, var(--mx) 0%, var(--ml) 25%, #ffffff 40%, var(--m) 55%, var(--mx) 75%, var(--ml) 100%) 0 0 / 200% 100%;
    color: var(--mk);
    text-shadow: 0 0 2px var(--mx), 0 0 3px var(--mx), 0 0 4px var(--mx);
    border: 1px solid #ffffff;
    border-radius: 6px;
    box-shadow: 0 1px 3px color-mix(in srgb, var(--md) 40%, transparent);
    font-weight: 900;
    animation: us-shimmer 5s linear infinite alternate;
}
.us-pwholo-1 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-pwholo-2 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-pwholo-3 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-pwholo-4 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
.us-pwholo-5 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
```

#### `pwstamp`: A perforated stamp made with a mask (Pool Stamp, number 73)

A mask cuts a row of tiny holes around the edge and keeps a solid rectangle inside. Both `-webkit-mask` and `mask` are written.

Colorways 1 to 5: 1 Marmalade, 2 Chlorine, 3 Tangerine, 4 Aqua, 5 Sunburn.

```css
.us-pwstamp {
    background: linear-gradient(var(--ml), var(--ml)) 50% 50% / calc(100% - 8px) calc(100% - 8px) no-repeat, var(--mx);
    color: var(--mk);
    border-radius: 0;
    padding: 5px 13px;
    font-weight: 900;
    -webkit-mask: radial-gradient(circle, transparent 1.4px, #000000 1.7px) -3px -3px / 6px 6px, linear-gradient(#000000, #000000) 50% 50% / calc(100% - 5px) calc(100% - 5px) no-repeat;
    mask: radial-gradient(circle, transparent 1.4px, #000000 1.7px) -3px -3px / 6px 6px, linear-gradient(#000000, #000000) 50% 50% / calc(100% - 5px) calc(100% - 5px) no-repeat;
}
.us-pwstamp-1 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-pwstamp-2 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-pwstamp-3 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-pwstamp-4 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-pwstamp-5 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
```

### 5.2 Poolside 3

Poolside 3 uses the **O set** (`--o --ol --c --b --w --dk`). The body is usually the water gradient `--c` to `--b`, with `--o` as the crisp accent and `--w` as the foam paper. Recipe B for white text, recipe C for ink.

#### `ptglitter`: Glitter on water (Glitter Water, number 1)

Five tiny radial dots near the edges (white, one in `--ol`) over the usual `--c` to `--b` water gradient, and a 1px orange ring (`box-shadow: 0 0 0 1px var(--o)`).

Colorways 1 to 5: 1 Lido, 2 Orangeade, 3 High Dive, 4 Deep Lane, 5 Chlorine Blue.

```css
.us-ptglitter {
    background: radial-gradient(circle at 5px 25%, #ffffff 0 0.9px, transparent 1.4px), radial-gradient(circle at 4px 75%, var(--ol) 0 0.9px, transparent 1.4px), radial-gradient(circle at calc(100% - 5px) 30%, #ffffff 0 1px, transparent 1.5px), radial-gradient(circle at calc(100% - 4px) 78%, #ffffff 0 0.8px, transparent 1.3px), radial-gradient(circle at 50% 10%, rgba(255,255,255,0.7) 0 0.7px, transparent 1.1px), linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 8px;
    box-shadow: 0 0 0 1px var(--o);
}
.us-ptglitter-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-ptglitter-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-ptglitter-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-ptglitter-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-ptglitter-5 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
```

#### `ptcrown`: A splash crown on top with ::before (Splash Crown, number 3)

A 6px strip above the chip repeats a half circle of foam (`--w`) every 9px. `margin-top: 5px` keeps it away from the line above.

Colorways 1 to 5: 1 High Dive, 2 Mango Float, 3 Lido, 4 Splash Pad, 5 Deep Lane.

```css
.us-ptcrown {
    background: linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 3px 3px 9px 9px;
    margin-top: 5px;
}
.us-ptcrown::before {
    content: '';
    position: absolute;
    pointer-events: none;
    left: 4px;
    right: 4px;
    top: -5px;
    height: 6px;
    background: radial-gradient(circle at 50% 100%, var(--w) 0 2.5px, transparent 3px) 0 0 / 9px 6px repeat-x;
}
.us-ptcrown-1 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-ptcrown-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-ptcrown-3 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-ptcrown-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-ptcrown-5 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
```

#### `ptwaveunder`: An orange wave underline (Wave Underline, number 6)

A repeating radial gradient pinned to the bottom edge (`0 100% / 8px 4px repeat-x`) on a pale foam chip with blue ink. The bottom padding is 6px to leave the wave its own row.

Colorways 1 to 5: 1 Riviera, 2 Mango Float, 3 Swim Meet, 4 Splash Pad, 5 Orangeade.

```css
.us-ptwaveunder {
    background: radial-gradient(circle at 4px 0, transparent 0 2.5px, var(--o) 2.6px 3.8px, transparent 4px) 0 100% / 8px 4px repeat-x, var(--w);
    color: var(--b);
    border-radius: 6px 6px 2px 2px;
    padding: 1px 12px 6px;
    font-weight: 900;
}
.us-ptwaveunder-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptwaveunder-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-ptwaveunder-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptwaveunder-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-ptwaveunder-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `ptchecker`: Checker border: the gradient-border recipe (Checker Border, number 20)

A 4px transparent border is painted by a conic-gradient in `border-box`, while the middle is painted white in `padding-box`. This is how to put a gradient on a border.

Colorways 1 to 5: 1 Swim Meet, 2 Sunset Deck, 3 Riviera, 4 Chlorine Blue, 5 Mango Float.

```css
.us-ptchecker {
    border: 4px solid transparent;
    background: linear-gradient(#ffffff, #ffffff) padding-box, conic-gradient(var(--o) 25%, var(--c) 0 50%, var(--o) 0 75%, var(--c) 0) 0 0 / 8px 8px border-box;
    color: var(--b);
    border-radius: 3px;
    padding: 0 11px;
    font-weight: 900;
}
.us-ptchecker-1 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptchecker-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-ptchecker-3 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptchecker-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-ptchecker-5 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
```

#### `ptguardseat`: A lifeguard chair with legs (Guard Seat, number 29)

An orange seat with a darker inner bottom edge, and two blue legs in `::after`. The legs hang below the chip, so `margin-bottom: 5px` makes room.

Colorways 1 to 5: 1 Lido, 2 Sunset Deck, 3 High Dive, 4 Chlorine Blue, 5 Splash Pad.

```css
.us-ptguardseat {
    background: var(--o);
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 3px;
    margin-bottom: 5px;
    box-shadow: inset 0 -3px 0 color-mix(in srgb, var(--o) 70%, #000000);
}
.us-ptguardseat::after {
    content: '';
    position: absolute;
    pointer-events: none;
    left: 15%;
    right: 15%;
    bottom: -5px;
    height: 5px;
    background: linear-gradient(90deg, var(--b) 0 3px, transparent 3px calc(100% - 3px), var(--b) calc(100% - 3px));
}
.us-ptguardseat-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-ptguardseat-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-ptguardseat-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-ptguardseat-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-ptguardseat-5 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
```

#### `ptwings`: Water wings: two pseudo-elements, one rule (Water Wings, number 36)

`::before` and `::after` share one rule for the float shape (an orange radial-gradient pillow), then only `left` and `right` are set separately. Padding of 21px on both sides makes room.

Colorways 1 to 5: 1 Swim Meet, 2 Mango Float, 3 Riviera, 4 Splash Pad, 5 Orangeade.

```css
.us-ptwings {
    background: var(--w);
    color: var(--b);
    border-radius: 6px;
    padding: 1px 21px;
    font-weight: 900;
    margin: 0 2px;
}
.us-ptwings::before, .us-ptwings::after {
    content: '';
    position: absolute;
    pointer-events: none;
    top: 50%;
    width: 13px;
    height: 16px;
    margin-top: -8px;
    border-radius: 45%;
    background: radial-gradient(ellipse 40% 30% at 40% 25%, rgba(255,255,255,0.8), transparent 70%), var(--o);
}
.us-ptwings::before {
    left: 2px;
}
.us-ptwings::after {
    right: 2px;
}
.us-ptwings-1 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptwings-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-ptwings-3 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptwings-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-ptwings-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `ptorangeade`: A glass of orangeade (Orangeade Glass, number 49)

The top 25% is clear glass (60% white), the rest is orange juice mixed from `--o` and white, a slice sits in the top corner as a radial gradient, and the bottom corners are rounder than the top.

Colorways 1 to 5: 1 Lido, 2 Orangeade, 3 High Dive, 4 Deep Lane, 5 Chlorine Blue.

```css
.us-ptorangeade {
    background: radial-gradient(circle at calc(100% - 4px) 4px, var(--ol) 0 4px, var(--o) 4.5px 6px, transparent 6.5px), linear-gradient(180deg, rgba(255,255,255,0.6) 0 25%, color-mix(in srgb, var(--o) 55%, #ffffff) 25%);
    color: var(--dk);
    border: 1px solid var(--c);
    border-radius: 2px 2px 8px 8px;
    padding: 1px 16px 1px 11px;
    font-weight: 900;
}
.us-ptorangeade-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-ptorangeade-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-ptorangeade-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-ptorangeade-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-ptorangeade-5 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
```

#### `ptjersey`: A team jersey with an outlined number (Swim Team Jersey, number 70)

Stripes at both edges, `Impact` type, and an outline built from four 1px text-shadows in `--b`.

Colorways 1 to 5: 1 Riviera, 2 Orangeade, 3 Swim Meet, 4 Deep Lane, 5 Sunset Deck.

```css
.us-ptjersey {
    background: linear-gradient(90deg, var(--o) 0 4px, transparent 4px calc(100% - 4px), var(--o) calc(100% - 4px)), var(--c);
    color: #ffffff;
    text-shadow: -1px -1px 0 var(--b), 1px -1px 0 var(--b), -1px 1px 0 var(--b), 1px 1px 0 var(--b);
    font-family: Impact, 'Arial Black', sans-serif;
    font-weight: 400;
    letter-spacing: 0.05em;
    border-radius: 6px 6px 2px 2px;
    padding: 1px 13px;
}
.us-ptjersey-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptjersey-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-ptjersey-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptjersey-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-ptjersey-5 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
```

#### `ptsplitflap`: A split-flap board (Split-Flap Board, number 71)

A 1px black line across the middle, two dark tones above and below, monospace uppercase text with wide letter-spacing in `--ol`.

Colorways 1 to 5: 1 High Dive, 2 Sunset Deck, 3 Lido, 4 Chlorine Blue, 5 Splash Pad.

```css
.us-ptsplitflap {
    background: linear-gradient(180deg, transparent calc(50% - 0.5px), #000000 calc(50% - 0.5px) calc(50% + 0.5px), transparent calc(50% + 0.5px)), linear-gradient(180deg, color-mix(in srgb, var(--dk) 85%, #ffffff) 0 50%, var(--dk) 50%);
    color: var(--ol);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border-radius: 3px;
    box-shadow: 0 0 0 1px var(--c);
}
.us-ptsplitflap-1 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-ptsplitflap-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-ptsplitflap-3 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-ptsplitflap-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-ptsplitflap-5 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
```

#### `ptadmit`: A ticket with notches (Admit One, number 72)

Two radial gradients, each 51% wide, cut half-circle notches into both ends. A dashed inner border comes from `::before`.

Colorways 1 to 5: 1 Swim Meet, 2 Mango Float, 3 Riviera, 4 Splash Pad, 5 Orangeade.

```css
.us-ptadmit {
    background: radial-gradient(circle at 0 50%, transparent 0 3.5px, var(--o) 4px) 0 0 / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 0 3.5px, var(--o) 4px) 100% 0 / 51% 100% no-repeat;
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 2px;
    padding: 1px 14px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.9em;
    text-shadow: 0 1px 2px var(--dk);
}
.us-ptadmit::before {
    content: '';
    position: absolute;
    pointer-events: none;
    inset: 3px 7px;
    border: 1px dashed color-mix(in srgb, var(--w) 80%, transparent);
    border-radius: 1px;
}
.us-ptadmit-1 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptadmit-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-ptadmit-3 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptadmit-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-ptadmit-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `ptextrude`: 3D text: stacked offsets (3D Extrude Text, number 83)

No background. Two 1px offset shadows, first in `--c` and then in `--b`, make the letters look cut from a block.

Colorways 1 to 5: 1 High Dive, 2 Sunset Deck, 3 Lido, 4 Chlorine Blue, 5 Splash Pad.

```css
.us-ptextrude {
    background: none;
    color: var(--o);
    text-shadow: 1px 1px 0 var(--c), 2px 2px 0 var(--b);
    font-family: 'Arial Black', Impact, sans-serif;
    font-weight: 900;
    letter-spacing: 0.03em;
    padding: 0 5px 2px 2px;
    border-radius: 0;
}
.us-ptextrude-1 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-ptextrude-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-ptextrude-3 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-ptextrude-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-ptextrude-5 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
```

#### `ptchrome`: Chrome text: gradient inside the letters (Chrome Pool Text, number 86)

`background-clip: text` with `color: transparent`, a hard horizon between 45% and 50%, and a thin dark outline made with `drop-shadow`.

Colorways 1 to 5: 1 Riviera, 2 Sunset Deck, 3 Swim Meet, 4 Chlorine Blue, 5 Mango Float.

```css
.us-ptchrome {
    background: linear-gradient(180deg, #ffffff 0%, color-mix(in srgb, var(--c) 40%, #ffffff) 45%, var(--b) 50%, color-mix(in srgb, var(--o) 60%, #ffffff) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    caret-color: var(--b);
    filter: drop-shadow(0 0 0.7px var(--dk)) drop-shadow(0 1px 0 var(--dk));
    font-family: 'Arial Black', Impact, sans-serif;
    font-weight: 900;
    font-style: italic;
    font-size: 1.06em;
    padding: 0 4px;
    border-radius: 0;
}
.us-ptchrome-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptchrome-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-ptchrome-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptchrome-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-ptchrome-5 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
```

#### `ptcapsule`: A two-tone capsule (Duo Capsule, number 88)

The left half is orange, the right half is water, and a gloss gradient lies on top of both.

Colorways 1 to 5: 1 Swim Meet, 2 Orangeade, 3 Riviera, 4 Deep Lane, 5 Sunset Deck.

```css
.us-ptcapsule {
    background: linear-gradient(180deg, rgba(255,255,255,0.65), transparent 50%), linear-gradient(90deg, var(--o) 0 50%, var(--c) 50%);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--dk), 0 0 3px var(--dk);
    border-radius: 999px;
    padding: 1px 15px;
    box-shadow: inset 0 -2px 3px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.25);
}
.us-ptcapsule-1 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptcapsule-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-ptcapsule-3 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptcapsule-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-ptcapsule-5 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
```

#### `pttoggle`: A switch with a knob (Pool Toggle, number 89)

The knob is `::after`: a 16px radial-gradient ball with a small drop shadow, parked on the right. The right padding is 25px.

Colorways 1 to 5: 1 Lido, 2 Sunset Deck, 3 High Dive, 4 Chlorine Blue, 5 Splash Pad.

```css
.us-pttoggle {
    background: var(--c);
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 999px;
    padding: 1px 25px 1px 12px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}
.us-pttoggle::after {
    content: '';
    position: absolute;
    pointer-events: none;
    right: 2px;
    top: 50%;
    width: 16px;
    height: 16px;
    margin-top: -8px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ffffff, var(--ol) 60%, var(--o));
    box-shadow: 0 1px 2px rgba(0,0,0,0.35);
}
.us-pttoggle-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pttoggle-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-pttoggle-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pttoggle-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-pttoggle-5 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
```

#### `ptbeacon`: A blinking alarm light (Pool Alarm Beacon, number 30)

A dark chip with a glowing `--o` dot as `::before`. The dot uses the shared `us-blink` animation.

Colorways 1 to 5: 1 Riviera, 2 Mango Float, 3 Swim Meet, 4 Splash Pad, 5 Orangeade.

```css
.us-ptbeacon {
    background: var(--dk);
    color: #ffffff;
    text-shadow: 0 1px 1px #000000;
    border-radius: 999px;
    padding: 1px 12px 1px 22px;
    border: 1px solid var(--c);
}
.us-ptbeacon::before {
    content: '';
    position: absolute;
    pointer-events: none;
    left: 6px;
    top: 50%;
    width: 9px;
    height: 9px;
    margin-top: -4.5px;
    border-radius: 50%;
    background: var(--o);
    box-shadow: 0 0 6px var(--o);
    animation: us-blink 0.9s ease-in-out infinite alternate;
}
.us-ptbeacon-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptbeacon-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-ptbeacon-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptbeacon-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-ptbeacon-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `ptstones`: Coping stones along the edge (Coping Stones, number 24)

A light cap row (`--ol`, 5px) over the water gradient, and a faint joint line every 12px along that cap.

Colorways 1 to 5: 1 Swim Meet, 2 Mango Float, 3 Riviera, 4 Splash Pad, 5 Orangeade.

```css
.us-ptstones {
    background: linear-gradient(90deg, color-mix(in srgb, var(--dk) 25%, transparent) 1px, transparent 1px) 0 0 / 12px 5px repeat-x, linear-gradient(180deg, var(--ol) 0 5px, var(--c) 5px, var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 3px;
    padding: 7px 12px 1px;
}
.us-ptstones-1 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-ptstones-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-ptstones-3 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-ptstones-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-ptstones-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

### 5.3 Poolside 4

Poolside 4 uses the **O set**. It is the flattest of the four: more paper and ink, white glow behind dark ink (`text-shadow: 0 0 3px #ffffff`), architecture, passes and patches.

#### `pfcaustics`: Caustic light: two crossing gratings (Caustic Net, number 1)

Two hairline gratings at 60 and -60 degrees cross each other (17% white), a soft elliptical glow sits on top, and the water gradient lies below all of them.

Colorways 1 to 5: 1 Lido, 2 Orangeade, 3 High Dive, 4 Deep Lane, 5 Chlorine Blue.

```css
.us-pfcaustics {
    background: repeating-linear-gradient(60deg, transparent 0 8px, rgba(255,255,255,0.17) 8px 9px), repeating-linear-gradient(-60deg, transparent 0 8px, rgba(255,255,255,0.17) 8px 9px), radial-gradient(ellipse 14px 8px at 25% 40%, rgba(255,255,255,0.35), transparent), linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 7px;
}
.us-pfcaustics-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pfcaustics-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-pfcaustics-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pfcaustics-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-pfcaustics-5 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
```

#### `pfwhitecap`: White caps along the top (White Caps, number 2)

Three radial ellipses of different sizes and positions, repeated every 44px. They sit along the top 10px, so the top padding is 8px.

Colorways 1 to 5: 1 Riviera, 2 Sunset Deck, 3 Swim Meet, 4 Chlorine Blue, 5 Mango Float.

```css
.us-pfwhitecap {
    background: radial-gradient(ellipse 7px 3px at 9px 5px, var(--w) 0 80%, transparent 86%) 0 0 / 44px 10px repeat-x, radial-gradient(ellipse 5px 2px at 26px 3px, var(--w) 0 80%, transparent 86%) 0 0 / 44px 10px repeat-x, radial-gradient(ellipse 6px 2.5px at 38px 6px, var(--w) 0 80%, transparent 86%) 0 0 / 44px 10px repeat-x, linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 8px;
    padding: 8px 12px 1px;
}
.us-pfwhitecap-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfwhitecap-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-pfwhitecap-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfwhitecap-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-pfwhitecap-5 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
```

#### `pfarchway`: An archway: elliptical corner radius (Archway, number 22)

`border-radius: 999px 999px 4px 4px / 70% 70% 4px 4px` makes the top an arch. The top padding is raised to 5px.

Colorways 1 to 5: 1 Riviera, 2 Orangeade, 3 Swim Meet, 4 Deep Lane, 5 Sunset Deck.

```css
.us-pfarchway {
    background: linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 999px 999px 4px 4px / 70% 70% 4px 4px;
    padding: 5px 18px 1px;
}
.us-pfarchway-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfarchway-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-pfarchway-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfarchway-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-pfarchway-5 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
```

#### `pfcabanastripe`: A cabana awning (Cabana Stripe, number 24)

Orange and foam stripes every 10px, with a veil layer of 86% white on top so dark ink stays readable, and a dotted orange bottom border for the fringe.

Colorways 1 to 5: 1 Swim Meet, 2 Mango Float, 3 Riviera, 4 Splash Pad, 5 Orangeade.

```css
.us-pfcabanastripe {
    background: linear-gradient(90deg, transparent 4%, rgba(255,255,255,0.86) 4% 96%, transparent), repeating-linear-gradient(90deg, var(--o) 0 10px, var(--w) 10px 20px);
    color: var(--dk);
    font-weight: 900;
    text-shadow: 0 0 3px #ffffff;
    border-radius: 3px 3px 0 0;
    border-bottom: 4px dotted var(--o);
    padding: 1px 14px;
}
.us-pfcabanastripe-1 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfcabanastripe-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pfcabanastripe-3 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfcabanastripe-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pfcabanastripe-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `pfpoolnet`: A skimmer net (Skimmer Net, number 42)

Two crossing 45 degree gratings (50% white) over the water gradient, a foam border, and a deep rounded bottom (`4px 4px 14px 14px`).

Colorways 1 to 5: 1 Riviera, 2 Mango Float, 3 Swim Meet, 4 Splash Pad, 5 Orangeade.

```css
.us-pfpoolnet {
    background: repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 6px), linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border: 2px solid var(--w);
    border-radius: 4px 4px 14px 14px;
    box-shadow: 0 0 0 1px var(--b);
}
.us-pfpoolnet-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfpoolnet-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pfpoolnet-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfpoolnet-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pfpoolnet-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `pflemonade`: Lemonade with a lemon slice (Lemonade, number 48)

Radial rings at the left (a foam ring and a light-accent ring) make a lemon slice. The drink is a foam-to-light-accent gradient with dark ink and a white glow.

Colorways 1 to 5: 1 Swim Meet, 2 Mango Float, 3 Riviera, 4 Splash Pad, 5 Orangeade.

```css
.us-pflemonade {
    background: radial-gradient(circle at 13px 50%, transparent 0 4px, var(--w) 4.6px 6px, var(--ol) 6.6px 8px, transparent 8.6px) 0 0 / 28px 100% no-repeat, linear-gradient(180deg, var(--w), var(--ol));
    color: var(--dk);
    font-weight: 900;
    text-shadow: 0 0 3px #ffffff;
    border-radius: 999px;
    padding: 1px 12px 1px 28px;
    border: 1px solid var(--ol);
}
.us-pflemonade-1 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pflemonade-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pflemonade-3 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pflemonade-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pflemonade-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `pfpopsicle`: A popsicle with a stick (Popsicle, number 50)

Water gradient with a gloss on top. A 12px right border in `--ol` is the stick, and one end is round (`12px 999px 999px 12px`).

Colorways 1 to 5: 1 Riviera, 2 Sunset Deck, 3 Swim Meet, 4 Chlorine Blue, 5 Mango Float.

```css
.us-pfpopsicle {
    background: linear-gradient(180deg, rgba(255,255,255,0.45), transparent 50%), linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-right: 12px solid var(--ol);
    border-radius: 12px 999px 999px 12px;
    padding: 1px 12px 1px 14px;
}
.us-pfpopsicle-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfpopsicle-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-pfpopsicle-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfpopsicle-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-pfpopsicle-5 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
```

#### `pfwristtag`: A wrist tag with perforations (Wrist Tag, number 57)

Foam paper with faint vertical tear lines every 15px (12% black) and cyan lines along the top and bottom.

Colorways 1 to 5: 1 Lido, 2 Mango Float, 3 High Dive, 4 Splash Pad, 5 Deep Lane.

```css
.us-pfwristtag {
    background: repeating-linear-gradient(90deg, transparent 0 14px, rgba(0,0,0,0.12) 14px 15px), var(--w);
    color: var(--dk);
    font-weight: 900;
    text-shadow: 0 0 3px #ffffff;
    border-top: 2px solid var(--c);
    border-bottom: 2px solid var(--c);
    border-radius: 3px;
}
.us-pfwristtag-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pfwristtag-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pfwristtag-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pfwristtag-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pfwristtag-5 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
```

#### `pflockerkey`: A locker key (Locker Key, number 59)

A radial gradient draws the key hole at the left (white center, dark rim). The body is an orange gradient with one rounded end.

Colorways 1 to 5: 1 High Dive, 2 Sunset Deck, 3 Lido, 4 Chlorine Blue, 5 Splash Pad.

```css
.us-pflockerkey {
    background: radial-gradient(circle at 12px 50%, var(--w) 0 4px, var(--dk) 4.4px 5.4px, transparent 6px), linear-gradient(180deg, var(--ol), var(--o));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 8px 999px 999px 8px;
    padding: 1px 14px 1px 28px;
}
.us-pflockerkey-1 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pflockerkey-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-pflockerkey-3 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pflockerkey-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-pflockerkey-5 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
```

#### `pfpostcard`: An airmail postcard border (Postcard, number 65)

`border-image` of 45 degree stripes: orange, foam, cyan, foam. The radius is 0 because `border-image` ignores it.

Colorways 1 to 5: 1 Lido, 2 Sunset Deck, 3 High Dive, 4 Chlorine Blue, 5 Splash Pad.

```css
.us-pfpostcard {
    background: var(--w);
    color: var(--dk);
    font-weight: 900;
    text-shadow: 0 0 3px #ffffff;
    border: 5px solid transparent;
    border-image: repeating-linear-gradient(45deg, var(--o) 0 8px, var(--w) 8px 16px, var(--c) 16px 24px, var(--w) 24px 32px) 5;
    border-radius: 0;
    padding: 0 10px;
}
.us-pfpostcard-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pfpostcard-2 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
.us-pfpostcard-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pfpostcard-4 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
.us-pfpostcard-5 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
```

#### `pfatomic`: Atomic age: a star glyph in ::before (Atomic Stars, number 67)

`content: '\2736'` draws a star in `--o`. Two stray dots in the background finish the look.

Colorways 1 to 5: 1 High Dive, 2 Orangeade, 3 Lido, 4 Deep Lane, 5 Chlorine Blue.

```css
.us-pfatomic {
    background: radial-gradient(circle at 92% 30%, var(--o) 0 1.6px, transparent 2.2px), radial-gradient(circle at 80% 76%, var(--c) 0 1.4px, transparent 2px), var(--w);
    color: var(--dk);
    font-weight: 900;
    text-shadow: 0 0 3px #ffffff;
    border: 1px solid var(--c);
    border-radius: 8px;
    padding: 1px 12px 1px 24px;
}
.us-pfatomic::before {
    content: '\2736';
    position: absolute;
    pointer-events: none;
    left: 7px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.95em;
    color: var(--o);
}
.us-pfatomic-1 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pfatomic-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-pfatomic-3 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pfatomic-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-pfatomic-5 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
```

#### `pfwettext`: Wet letters (Wet Letters, number 78)

A transparent-to-water wash, deep blue ink, a 1px white highlight and a soft blue drop shadow. The shadow color `rgba(0,60,140,0.35)` is the one deep-blue shadow used in these sets.

Colorways 1 to 5: 1 Riviera, 2 Mango Float, 3 Swim Meet, 4 Splash Pad, 5 Orangeade.

```css
.us-pfwettext {
    background: linear-gradient(180deg, rgba(255,255,255,0), color-mix(in srgb, var(--c) 25%, transparent));
    color: var(--b);
    font-weight: 900;
    text-shadow: 0 1px 0 #ffffff, 0 3px 4px rgba(0,60,140,0.35);
    border-radius: 6px;
}
.us-pfwettext-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfwettext-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pfwettext-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfwettext-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pfwettext-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `pfglasstext`: Glass text (Glass Text, number 81)

Water gradient, 88% white text, a 55% white line under the letters (`0 1px 0`) and a dark line above them (`0 -1px 0 var(--dk)`).

Colorways 1 to 5: 1 Lido, 2 Mango Float, 3 High Dive, 4 Splash Pad, 5 Deep Lane.

```css
.us-pfglasstext {
    background: linear-gradient(180deg, var(--c), var(--b));
    color: rgba(255,255,255,0.88);
    text-shadow: 0 1px 0 rgba(255,255,255,0.55), 0 -1px 0 var(--dk);
    border-radius: 8px;
    font-weight: 900;
    letter-spacing: 0.03em;
}
.us-pfglasstext-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pfglasstext-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pfglasstext-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pfglasstext-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pfglasstext-5 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
```

#### `pfcutpaper`: Cut paper with stacked shadows (Cut Paper, number 82)

Two hard offset shadows (3px in `--c`, 6px in `--b`) and `margin-right: 8px` to make room for them.

Colorways 1 to 5: 1 Riviera, 2 Orangeade, 3 Swim Meet, 4 Deep Lane, 5 Sunset Deck.

```css
.us-pfcutpaper {
    background: var(--w);
    color: var(--dk);
    font-weight: 900;
    text-shadow: 0 0 3px #ffffff;
    box-shadow: 3px 3px 0 var(--c), 6px 6px 0 var(--b);
    border-radius: 3px;
    margin-right: 8px;
}
.us-pfcutpaper-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfcutpaper-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-pfcutpaper-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfcutpaper-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-pfcutpaper-5 { --o: #e8590c; --ol: #ffc078; --c: #ff922b; --b: #a33a06; --w: #fff4e6; --dk: #3d1502; }
```

#### `pfhalo`: A halo ring (Halo Ring, number 90)

A foam fill, a cyan ring, a 3px translucent outer ring and a 12px glow. `text-shadow: none` because the ink is already dark.

Colorways 1 to 5: 1 Riviera, 2 Mango Float, 3 Swim Meet, 4 Splash Pad, 5 Orangeade.

```css
.us-pfhalo {
    background: var(--w);
    color: var(--b);
    font-weight: 900;
    border: 2px solid var(--c);
    border-radius: 999px;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 30%, transparent), 0 0 12px var(--c);
    text-shadow: none;
    padding: 0 14px;
}
.us-pfhalo-1 { --o: #ff6a3d; --ol: #ffb59a; --c: #27b4e8; --b: #0b4f9e; --w: #e7f6ff; --dk: #0a1f44; }
.us-pfhalo-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pfhalo-3 { --o: #ff9a1f; --ol: #ffd08a; --c: #20c4f4; --b: #145da0; --w: #eaf8ff; --dk: #0c2d57; }
.us-pfhalo-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pfhalo-5 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
```

#### `pfstamp`: A rubber hand stamp (Hand Stamp, number 63)

A thin ring with a faint inner wash, `transform: rotate(2deg)`, uppercase letters with 0.08em spacing. It is the one design that repeats `display: inline-block`, which a transform likes.

Colorways 1 to 5: 1 High Dive, 2 Mango Float, 3 Lido, 4 Splash Pad, 5 Deep Lane.

```css
.us-pfstamp {
    background: radial-gradient(circle, rgba(0,0,0,0) 40%, color-mix(in srgb, var(--b) 12%, transparent));
    color: var(--b);
    text-shadow: none;
    border: 2px solid var(--b);
    border-radius: 40% / 70%;
    transform: rotate(2deg);
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.9em;
    font-weight: 900;
    padding: 1px 12px;
}
.us-pfstamp-1 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-pfstamp-2 { --o: #ff7a00; --ol: #ffd08a; --c: #ffb03b; --b: #c25700; --w: #fff8ec; --dk: #4a2600; }
.us-pfstamp-3 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-pfstamp-4 { --o: #3ad7ff; --ol: #bfefff; --c: #3b82f6; --b: #1e3a8a; --w: #eef6ff; --dk: #0b1640; }
.us-pfstamp-5 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
```

### 5.4 Poolside 2A

Poolside 2A uses the **M set** and continues Poolside 2 with the same colorways: more pool hardware, toys, picnic food and patterns.

#### `qacannonballcrown`: A cannonball splash crown (Cannonball Crown, number 1)

Three pale circles at 18%, 50% and 82% across the top edge, on the main-to-dark gradient. The top padding is 6px.

Colorways 1 to 5: 1 Chlorine, 2 Tangerine, 3 Aqua, 4 Sunburn, 5 Lagoon.

```css
.us-qacannonballcrown {
    background: radial-gradient(circle at 18% 0, var(--mx) 0 3.5px, transparent 4px), radial-gradient(circle at 50% -2px, var(--mx) 0 5px, transparent 5.5px), radial-gradient(circle at 82% 0, var(--mx) 0 3.5px, transparent 4px), linear-gradient(180deg, var(--m), var(--md));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--mk) 80%, transparent), 0 0 2px color-mix(in srgb, var(--mk) 55%, transparent);
    border-radius: 8px;
    padding: 6px 13px 1px;
}
.us-qacannonballcrown-1 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qacannonballcrown-2 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qacannonballcrown-3 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qacannonballcrown-4 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-qacannonballcrown-5 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
```

#### `qatidalstripes`: Tidal stripes (Tidal Stripes, number 2)

Horizontal bands, 4px `--m` and 2px `--ml`, repeated down the chip. White text with the dark halo.

Colorways 1 to 5: 1 Marmalade, 2 Chlorine, 3 Tangerine, 4 Aqua, 5 Sunburn.

```css
.us-qatidalstripes {
    background: repeating-linear-gradient(180deg, var(--m) 0 4px, var(--ml) 4px 6px);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 5px;
    padding: 1px 12px;
}
.us-qatidalstripes-1 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qatidalstripes-2 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qatidalstripes-3 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qatidalstripes-4 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qatidalstripes-5 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
```

#### `qaladderrungs`: A pool ladder (Ladder Rungs, number 13)

Two side rails (3px of `--mx`) and a rung every 6px (`--ml`) over `--m`.

Colorways 1 to 5: 1 Ice, 2 Marmalade, 3 Chlorine, 4 Tangerine, 5 Aqua.

```css
.us-qaladderrungs {
    background: linear-gradient(90deg, var(--mx) 0 3px, transparent 3px calc(100% - 3px), var(--mx) calc(100% - 3px)), repeating-linear-gradient(180deg, transparent 0 5px, var(--ml) 5px 6px), var(--m);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 3px;
    padding: 1px 14px;
}
.us-qaladderrungs-1 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-qaladderrungs-2 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qaladderrungs-3 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qaladderrungs-4 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qaladderrungs-5 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
```

#### `qapoolwallclock`: A wall clock (Pool Wall Clock, number 17)

One radial gradient makes the clock face at the left: a pale face, a dark rim. The left padding is 30px.

Colorways 1 to 5: 1 Lagoon, 2 Creamsicle, 3 Deep Dive, 4 Apricot, 5 Ice.

```css
.us-qapoolwallclock {
    background: radial-gradient(circle at 14px 50%, var(--mx) 0 6px, var(--md) 6.5px 8px, transparent 8.5px), linear-gradient(180deg, var(--m), var(--md));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--mk) 80%, transparent), 0 0 2px color-mix(in srgb, var(--mk) 55%, transparent);
    border-radius: 6px;
    padding: 1px 12px 1px 30px;
}
.us-qapoolwallclock-1 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-qapoolwallclock-2 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
.us-qapoolwallclock-3 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-qapoolwallclock-4 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-qapoolwallclock-5 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
```

#### `qaslattedfence`: A slatted fence (Slatted Fence, number 20)

Vertical slats 7px wide with a 2px gap, and a 3px top rail in `--md`.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-qaslattedfence {
    background: repeating-linear-gradient(90deg, var(--ml) 0 7px, var(--m) 7px 9px);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 2px;
    border-top: 3px solid var(--md);
    padding: 2px 12px 1px;
}
.us-qaslattedfence-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qaslattedfence-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qaslattedfence-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-qaslattedfence-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-qaslattedfence-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

#### `qabeachballwedges`: A beach ball (Beach Ball Wedges, number 28)

A `conic-gradient` in six 60 degree wedges that repeat three tones: main, pale and dark.

Colorways 1 to 5: 1 Sunburn, 2 Lagoon, 3 Creamsicle, 4 Deep Dive, 5 Apricot.

```css
.us-qabeachballwedges {
    background: conic-gradient(from 0deg, var(--m) 0 60deg, var(--mx) 60deg 120deg, var(--md) 120deg 180deg, var(--m) 180deg 240deg, var(--mx) 240deg 300deg, var(--md) 300deg);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 999px;
    padding: 1px 15px;
}
.us-qabeachballwedges-1 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-qabeachballwedges-2 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-qabeachballwedges-3 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
.us-qabeachballwedges-4 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-qabeachballwedges-5 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
```

#### `qawidebrimhat`: A wide-brim hat (Wide Brim Hat, number 43)

Two layers: a crown (62% wide, centered) with a darker hat band across it, and a brim along the bottom 30%. Dark ink, because most of the chip is light.

Colorways 1 to 5: 1 Ice, 2 Marmalade, 3 Chlorine, 4 Tangerine, 5 Aqua.

```css
.us-qawidebrimhat {
    background: linear-gradient(180deg, var(--ml) 0 60%, var(--m) 60% 70%, transparent 70%) 50% 0 / 62% 100% no-repeat, linear-gradient(180deg, transparent 0 70%, var(--ml) 70%);
    color: var(--mk);
    font-weight: 900;
    border-radius: 12px;
    padding: 4px 18px 5px;
}
.us-qawidebrimhat-1 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-qawidebrimhat-2 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qawidebrimhat-3 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qawidebrimhat-4 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qawidebrimhat-5 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
```

#### `qaicedteacubes`: Iced tea with ice cubes (Iced Tea Cubes, number 52)

Two pale circles (ice) over the main-to-dark gradient. A flat top and a rounder bottom (`4px 4px 10px 10px`) make a glass.

Colorways 1 to 5: 1 Marmalade, 2 Chlorine, 3 Tangerine, 4 Aqua, 5 Sunburn.

```css
.us-qaicedteacubes {
    background: radial-gradient(circle at 16% 30%, var(--mx) 0 3px, transparent 3.5px), radial-gradient(circle at 80% 60%, var(--mx) 0 3px, transparent 3.5px), linear-gradient(180deg, var(--m), var(--md));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--mk) 80%, transparent), 0 0 2px color-mix(in srgb, var(--mk) 55%, transparent);
    border-radius: 4px 4px 10px 10px;
    padding: 1px 14px;
}
.us-qaicedteacubes-1 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qaicedteacubes-2 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qaicedteacubes-3 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qaicedteacubes-4 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qaicedteacubes-5 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
```

#### `qasundaecherry`: A sundae with a cherry (Sundae Cherry, number 60)

The top 30% is cream (`--mx`), the rest is sauce (`--ml`), and a cherry is a radial gradient at the top center. The top padding is 6px.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-qasundaecherry {
    background: radial-gradient(circle at 50% -2px, var(--md) 0 4px, transparent 4.6px), linear-gradient(180deg, var(--mx) 0 30%, var(--ml) 30%);
    color: var(--mk);
    font-weight: 900;
    border-radius: 6px 6px 14px 14px;
    padding: 6px 14px 1px;
}
.us-qasundaecherry-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qasundaecherry-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qasundaecherry-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-qasundaecherry-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-qasundaecherry-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

#### `qaswimtestsign`: A sign with a header bar (Swim Test Sign, number 64)

A 5px dark bar over a pale board and a 2px border in `--md`. The top padding is 6px.

Colorways 1 to 5: 1 Apricot, 2 Ice, 3 Marmalade, 4 Chlorine, 5 Tangerine.

```css
.us-qaswimtestsign {
    background: linear-gradient(180deg, var(--md) 0 5px, var(--mx) 5px);
    color: var(--mk);
    font-weight: 900;
    border: 2px solid var(--md);
    border-radius: 3px;
    padding: 6px 12px 1px;
}
.us-qaswimtestsign-1 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-qaswimtestsign-2 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-qaswimtestsign-3 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qaswimtestsign-4 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qaswimtestsign-5 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
```

#### `qawaxsealstamp`: A wax seal (Wax Seal Stamp, number 70)

A round chip with a dark center, and two box-shadow rings (2px `--md`, then 4px `--m`) as the scalloped rim. `margin: 0 6px` gives the rings room.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-qawaxsealstamp {
    background: radial-gradient(circle, var(--md) 0 55%, var(--m) 58%);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 999px;
    box-shadow: 0 0 0 2px var(--md), 0 0 0 4px var(--m);
    margin: 0 6px;
    padding: 1px 14px;
}
.us-qawaxsealstamp-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qawaxsealstamp-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qawaxsealstamp-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-qawaxsealstamp-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-qawaxsealstamp-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

#### `qaseigaihawaves`: Seigaiha waves (Seigaiha Waves, number 74)

One radial gradient tile, 16px by 8px, draws the overlapping arcs of the Japanese wave pattern.

Colorways 1 to 5: 1 Apricot, 2 Ice, 3 Marmalade, 4 Chlorine, 5 Tangerine.

```css
.us-qaseigaihawaves {
    background: radial-gradient(circle at 50% 100%, transparent 0 4px, var(--mx) 4.5px 5.5px, transparent 6px, var(--ml) 6.5px 8px, transparent 8.5px) 0 0 / 16px 8px, var(--m);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 6px;
    padding: 1px 12px;
}
.us-qaseigaihawaves-1 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-qaseigaihawaves-2 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-qaseigaihawaves-3 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qaseigaihawaves-4 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qaseigaihawaves-5 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
```

#### `qalifebuoybands`: Lifebuoy bands (Lifebuoy Bands, number 75)

Vertical 10px stripes of `--mx` and `--m` inside a pill. White text with the dark halo.

Colorways 1 to 5: 1 Deep Dive, 2 Apricot, 3 Ice, 4 Marmalade, 5 Chlorine.

```css
.us-qalifebuoybands {
    background: repeating-linear-gradient(90deg, var(--mx) 0 10px, var(--m) 10px 20px);
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 999px;
    padding: 1px 16px;
}
.us-qalifebuoybands-1 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-qalifebuoybands-2 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-qalifebuoybands-3 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-qalifebuoybands-4 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qalifebuoybands-5 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
```

#### `qadotmatrixsun`: A dot matrix (Dot Matrix Sun, number 80)

A 6px grid of small `--m` dots on a `--mx` fill, dark ink. No halo is needed, because the dots are small.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-qadotmatrixsun {
    background: radial-gradient(circle, var(--m) 0 1.4px, transparent 1.8px) 0 0 / 6px 6px, var(--mx);
    color: var(--mk);
    font-weight: 900;
    border-radius: 8px;
    padding: 1px 13px;
}
.us-qadotmatrixsun-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qadotmatrixsun-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qadotmatrixsun-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-qadotmatrixsun-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-qadotmatrixsun-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

#### `qafrostedlens`: Frosted glass (Frosted Lens, number 83)

A 70% translucent fill (`color-mix(... transparent)`), a light border, a white inner top line and a soft glow in `--m`.

Colorways 1 to 5: 1 Ice, 2 Marmalade, 3 Chlorine, 4 Tangerine, 5 Aqua.

```css
.us-qafrostedlens {
    background: color-mix(in srgb, var(--mx) 70%, transparent);
    color: var(--mk);
    font-weight: 900;
    border: 1px solid var(--ml);
    border-radius: 12px;
    box-shadow: inset 0 1px 0 #ffffff, 0 2px 6px color-mix(in srgb, var(--m) 40%, transparent);
    padding: 1px 14px;
}
.us-qafrostedlens-1 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-qafrostedlens-2 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
.us-qafrostedlens-3 { --m: #22d3ee; --ml: #a5f3fc; --mx: #f0fdff; --md: #0891b2; --mk: #0a3a4a; }
.us-qafrostedlens-4 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qafrostedlens-5 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
```

#### `qapagerdisplay`: A pager screen with scanlines (Pager Display, number 86)

A 3px scanline pattern (14% `--mk`) over `--ml`, monospace type and a thick `--md` border.

Colorways 1 to 5: 1 Creamsicle, 2 Deep Dive, 3 Apricot, 4 Ice, 5 Marmalade.

```css
.us-qapagerdisplay {
    background: repeating-linear-gradient(0deg, transparent 0 2px, color-mix(in srgb, var(--mk) 14%, transparent) 2px 3px), var(--ml);
    color: var(--mk);
    font-weight: 900;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    border: 3px solid var(--md);
    border-radius: 6px;
    padding: 1px 12px;
}
.us-qapagerdisplay-1 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
.us-qapagerdisplay-2 { --m: #1d4ed8; --ml: #60a5fa; --mx: #eff6ff; --md: #1e3a8a; --mk: #0b1640; }
.us-qapagerdisplay-3 { --m: #ff9f5a; --ml: #ffcba1; --mx: #fff5ec; --md: #d0621f; --mk: #5a2a0d; }
.us-qapagerdisplay-4 { --m: #38bdf8; --ml: #bae6fd; --mx: #f5fbff; --md: #0284c7; --mk: #0c2d48; }
.us-qapagerdisplay-5 { --m: #fb8c00; --ml: #ffc06b; --mx: #fff4e6; --md: #c25e00; --mk: #4a2400; }
```

#### `qacornerbrackets`: Corner brackets, no fill (Corner Brackets, number 90)

Four tiny L-shaped brackets, each made of two 2px gradient lines. No fill and no border: only the corners are drawn.

Colorways 1 to 5: 1 Tangerine, 2 Aqua, 3 Sunburn, 4 Lagoon, 5 Creamsicle.

```css
.us-qacornerbrackets {
    background: linear-gradient(var(--m), var(--m)) 0 0 / 7px 2px no-repeat, linear-gradient(var(--m), var(--m)) 0 0 / 2px 7px no-repeat, linear-gradient(var(--m), var(--m)) 100% 100% / 7px 2px no-repeat, linear-gradient(var(--m), var(--m)) 100% 100% / 2px 7px no-repeat;
    color: var(--md);
    font-weight: 900;
    padding: 2px 8px;
    border-radius: 0;
}
.us-qacornerbrackets-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-qacornerbrackets-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-qacornerbrackets-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-qacornerbrackets-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-qacornerbrackets-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

## Part 6. Make a new design, step by step

### 6.1 The recipe

1. **Pick the collection.** Poolside 2 or 2A: M set. Poolside 3 or 4: O set. Ids use the collection prefix: `pw`, `qa`, `pt`, `pf`.
2. **Pick a thing that does not exist yet.** Look through the catalogue (Part 8) and the kind of designs it lists. Choose an object (a pool noodle, a kickboard, a ladder, a snack) or a type effect. Write it in one sentence: "a kickboard: a rounded foam board with two hand holes and a stripe".
3. **Name and id.** Name it in plain words (Title Case, 2 or 3 words). The id is the prefix plus the name in lowercase letters, digits only, cut to 20 characters: `Concrete Stepping Stones` is `qaconcretesteppingst`. The id must be new.
4. **Sketch the layers.** From the top down: details (dots, stripes, glints), gloss, body fill. Decide the padding, the radius and whether a pseudo-element is needed.
5. **Choose the text recipe** from Part 4.1 by looking at how dark the middle of the chip is.
6. **Write the design rule** with the usual property order (Part 2 rule 10). Use only the variables of the set.
7. **Write five colorway rules**: copy the five palette lines from Part 3 that fit the collection's rotation (or use five different palettes).
8. **Test it** (6.3). Look at all five colorways on light and dark pages, with a one-letter word and a long phrase.
9. **Lint it** (6.4).
10. **Register it** (Part 7) and rebuild.

### 6.2 Two worked examples (both tested)

These two designs were written with the recipe above, rendered with the real `unique-styles.css`, and checked in all five colorways on light and dark pages. They are **not** part of the shipped collections, so their ids use the demo prefix `demo`. Rename them (and add the prefix of your collection) if you register them.

**Starting Block** (M set, the Poolside 2 way): a diving block with a dark top plate, grip lines and a thick dark base. Recipe A (white text, dark halo). The 5px top padding makes room for the plate.

```css
.us-demoblock {
    background: linear-gradient(180deg, var(--md) 0 4px, transparent 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 6px), linear-gradient(180deg, var(--ml), var(--m));
    color: #ffffff;
    text-shadow: 0 1px 2px var(--mk), 0 0 3px var(--mk), 0 0 4px color-mix(in srgb, var(--mk) 60%, transparent);
    border-radius: 2px 2px 0 0;
    padding: 5px 14px 1px;
    box-shadow: inset 0 -3px 0 var(--md);
}
.us-demoblock-1 { --m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03; }
.us-demoblock-2 { --m: #0ea5e9; --ml: #7dd3fc; --mx: #f0f9ff; --md: #0369a1; --mk: #082f49; }
.us-demoblock-3 { --m: #f4511e; --ml: #ff8a65; --mx: #ffece5; --md: #b5300b; --mk: #431204; }
.us-demoblock-4 { --m: #06b6d4; --ml: #67e8f9; --mx: #ecfeff; --md: #0e7490; --mk: #083344; }
.us-demoblock-5 { --m: #ffa552; --ml: #ffd3a8; --mx: #fff8f0; --md: #dd7420; --mk: #5c300a; }
```

**Shower Rail** (O set, the Poolside 3 and 4 way): a shower head with drops falling under it. Recipe B (white text, dark halo). The drops are a pseudo-element that hangs below the chip, so there is a 6px bottom margin.

```css
.us-demoshower {
    background: linear-gradient(180deg, var(--c), var(--b));
    color: #ffffff;
    text-shadow: 0 1px 2px color-mix(in srgb, var(--dk) 85%, transparent), 0 0 2px color-mix(in srgb, var(--dk) 60%, transparent);
    border-radius: 4px 4px 9px 9px;
    margin-bottom: 6px;
    padding: 1px 14px;
}
.us-demoshower::after {
    content: '';
    position: absolute;
    pointer-events: none;
    left: 10%;
    right: 10%;
    bottom: -6px;
    height: 6px;
    background: radial-gradient(circle at 3px 3px, var(--ol) 0 1.6px, transparent 2px) 0 0 / 10px 6px repeat-x;
}
.us-demoshower-1 { --o: #ff7f11; --ol: #ffbf80; --c: #00c2d6; --b: #00609c; --w: #e0fbfd; --dk: #06283d; }
.us-demoshower-2 { --o: #ff5a00; --ol: #ffb27a; --c: #ff9a3c; --b: #b84300; --w: #fff3e6; --dk: #431800; }
.us-demoshower-3 { --o: #ff5500; --ol: #ffa36b; --c: #00b3ff; --b: #003f8f; --w: #e1f4ff; --dk: #001b44; }
.us-demoshower-4 { --o: #00c8ff; --ol: #9eeaff; --c: #2f80ed; --b: #0b3a8c; --w: #eaf4ff; --dk: #061a40; }
.us-demoshower-5 { --o: #00e0ff; --ol: #b8f6ff; --c: #13a8d6; --b: #0b5f7d; --w: #ebfcff; --dk: #063646; }
```

### 6.3 Test page

Put this in a scratch folder **outside the deployment folder** and open it through any local web server that can reach `writeout/unique-styles.css`. It shows a design in all five colorways on a light and a dark background, with a short and a long text. Replace `ID` with your design id and paste your CSS into the `<style>`.

```html
<!doctype html>
<meta charset="utf-8">
<link rel="stylesheet" href="/writeout/unique-styles.css">
<style>
  /* paste your new design rules here */
  body { font: 22px system-ui; margin: 0; }
  .row { padding: 18px 24px; }
  .light { background: #ffffff; color: #111; }
  .dark { background: #10161f; color: #eee; }
</style>
<script>
  const ID = 'demoblock';
  for (const mode of ['light', 'dark']) {
    const row = document.createElement('div');
    row.className = 'row ' + mode;
    for (const text of ['A', 'Colorway', 'A much longer phrase with several words']) {
      for (let n = 1; n <= 5; n++) row.insertAdjacentHTML('beforeend', `<span class="us-chip us-${ID} us-${ID}-${n}">${text}</span> `);
      row.insertAdjacentHTML('beforeend', '<br><br>');
    }
    document.body.append(row);
  }
</script>
```

Look for: words that disappear in a pale palette (Ice, Creamsicle, Chlorine Blue, Splash Pad), ornaments that hit the next line, a pattern that stretches on long text, and a one-letter chip that looks broken.

### 6.4 The lint script

This checker encodes the rules above. It was run on all 360 designs of Poolside 2, 3, 4 and 2A and reports **no problems** for any of them, so a design that fails it is wrong, not unlucky. `rules` is a list of `(selector, declaration text)` pairs for the design rule and its pseudo-elements, `colorways` maps 1 to 5 to the declaration text of the five colorway rules.

```python
import json, re, sys
M = ['--m', '--ml', '--mx', '--md', '--mk']
O = ['--o', '--ol', '--c', '--b', '--w', '--dk']
PREFIX = {'pool2': ('pw', M), 'pool3': ('pt', O), 'pool4': ('pf', O), 'pool2a': ('qa', M)}
OK_HEX = {'#ffffff', '#000000'}
MATERIAL = {'#f5f7fa', '#aeb7c0', '#fffbe6', '#fffdf8', '#fff9ef', '#fbf7f0', '#c9a24a'}  # steel, paper whites, brass: used by 8 of 360 designs
def lint(design_id, rules, colorways, varset, prefix):
    """rules: [(selector, body)] for .us-ID and its pseudo-elements; colorways: {1..5: body}. Returns [problems]."""
    bad = []
    if not re.fullmatch(prefix + r'[a-z0-9]{1,%d}' % (20 - len(prefix)), design_id): bad.append('id must be %s + lowercase letters/digits, 20 characters at most' % prefix)
    if sorted(colorways) != [1, 2, 3, 4, 5]: bad.append('needs colorway rules -1 to -5')
    for n, body in colorways.items():
        got = re.findall(r'(--[a-z]+):\s*(#[0-9a-fA-F]{6})', body)
        if [g[0] for g in got] != varset: bad.append('colorway %d must set exactly %s in that order' % (n, ' '.join(varset)))
    other = set(M + O) - set(varset)
    for sel, body in rules:
        for v in re.findall(r'var\((--[a-z]+)', body):
            if v in other: bad.append('uses %s from the other variable set' % v)
            elif v not in varset: bad.append('unknown variable ' + v)
        for h in re.findall(r'#[0-9a-fA-F]{3,6}\b', body):
            if h.lower() not in OK_HEX and h.lower() not in MATERIAL and h.lower() != '#fff': bad.append('raw color ' + h + ' (use a palette variable)')
        if re.search(r'url\(|@import|!important', body): bad.append('no url(), @import or !important')
        if re.search(r'(?<![-\w])(display\s*:(?!\s*inline-block)|position|z-index)', body) and '::' not in sel and ':' not in sel.replace('::', ''): bad.append('the main rule must not set display, position or z-index')
    for pe in ('::before', '::after'):
        joined = ' '.join(b for s, b in rules if pe in s)
        if joined:
            for need in ('content', 'position: absolute', 'pointer-events: none'):
                if need not in joined: bad.append(pe + ' needs ' + need)
    main = ' '.join(b for s, b in rules if '::' not in s)
    if not re.search(r'(?<![-\w])color\s*:', main): bad.append('the main rule needs a text color')
    return bad
```

Example use:

```python
problems = lint('demoblock',
    [('.us-demoblock', 'background: ...; color: #ffffff; ...')],
    {1: '--m: #ff7a1a; --ml: #ffb36b; --mx: #fff1e3; --md: #c2410c; --mk: #4a1a03;', 2: '...', 3: '...', 4: '...', 5: '...'},
    ['--m', '--ml', '--mx', '--md', '--mk'], 'pw')
print(problems or 'clean')
```

## Part 7. Register a new design (every place it must go)

The paths are inside `radii-office deployment/`. Do these in order.

| # | File | What to add |
| --- | --- | --- |
| 1 | `writeout/unique-styles.css` | The design rule, its pseudo-element rules and the five colorway rules. Append them after the last rule of the same collection (or at the end of the Poolside rules). Selectors are unique, so the position does not matter for the result. |
| 2 | `writeout/psl-data.js` | One entry in `fams`: `["id","Design Name",["Palette 1","Palette 2","Palette 3","Palette 4","Palette 5"],"pool2"]`. The last value is the collection key from `cols` (`pool2`, `pool3`, `pool4`, `pool2a`). A new collection also needs an entry in `cols`: `"pool11":"Poolside 11"`. |
| 3 | Counts | Update the totals where they are written: `writeout/psl.js` (the header comment and the search box text "Search N Poolside styles"), `waterflow/app.js` (the comment above `pslOpen`), and `opendb/data/entries/poolside-keydown.kd` (the sentence "1,170 designs with 5 colorways each, 5,850 styles"). Each design adds 5 styles. |
| 4 | Cache tokens | Change the `?v=` token on every page that loads `unique-styles.css`, `psl-data.js` or `psl.js` (search for the file names in the `*/index.html` files), otherwise browsers keep the old copy. |
| 5 | Rebuild | Run `node scripts/build_keydown_js.mjs` (it bundles the stylesheet and `psl-data.js` into `Keydown.js`), `build_keydown_svelte.mjs`, `build_mobile.mjs`, `build_offline.mjs`, `build_source.mjs` and `build_opendb.mjs`. Then copy `../Keydown.js` to `waterflow/keydown-engine.js`. |
| 6 | Beta and Mintcode | They keep their own copy of `Keydown.js`. From the `Web Projects` folder run `python3 mintcode/tools/whiten_gradients.py Keydown.js <out>` and copy the result to both `public/Keydown.js` files, then bump the version numbers in their `kd.js` and `index.html`. |

Poolside styles are **Style Lookup only**: do not add them to the Unique Chip Styles gallery in Bitbook, and do not add them to Omicron's gallery list unless asked.

### 7.1 Check that it works

1. Open Writeout and run `kdDoc.textToHtml("@pwexample-1@Hi@")` in the console (use your id). The result must contain `class="us-chip us-pwexample us-pwexample-1"`.
2. Open Waterflow, press **Styles**, search for the design name or id, and check that all five colorways appear and put the style on a word.
3. In a Waterflow Poolside Keydown note, write `<id-3 words>` and check it matches the 3rd colorway.
4. Open a print preview with the style on a word. Chips are drawn with backgrounds, so check that the pattern survives.

## Part 8. The catalogue: all 360 designs

Number, id, name and kind. The kind groups follow the order of the collection (the number tells where each kind starts). The five palette names of each design are stored in `writeout/psl-data.js`.

### Poolside 2 (90 designs)

| # | Id | Name | Kind |
| --- | --- | --- | --- |
| 1 | `pwcrest` | Wave Crest | Water and light |
| 2 | `pwrefract` | Refraction | Water and light |
| 3 | `pwshallows` | Sunlit Shallows | Water and light |
| 4 | `pwringlet` | Ripple Ring | Water and light |
| 5 | `pwdroptrail` | Droplet Trail | Water and light |
| 6 | `pwfoam` | Foam Edge | Water and light |
| 7 | `pwwhirl` | Whirlpool | Water and light |
| 8 | `pwjets` | Jacuzzi Jets | Water and light |
| 9 | `pwburst` | Splash Burst | Water and light |
| 10 | `pwglass` | Water Glass | Water and light |
| 11 | `pwwetglass` | Wet Glass | Water and light |
| 12 | `pwshine` | Reflection Shine | Water and light |
| 13 | `pwundertow` | Undertow | Water and light |
| 14 | `pwmistglow` | Mist Glow | Water and light |
| 15 | `pwtidegrad` | Tide Gradient | Water and light |
| 16 | `pwbigtile` | Big Tiles | Tiles, deck and pool hardware |
| 17 | `pwsubway` | Subway Tile | Tiles, deck and pool hardware |
| 18 | `pwhexpenny` | Hex Penny | Tiles, deck and pool hardware |
| 19 | `pwbullnose` | Bullnose Edge | Tiles, deck and pool hardware |
| 20 | `pwlanenum` | Lane Number | Tiles, deck and pool hardware |
| 21 | `pwdraincover` | Drain Cover | Tiles, deck and pool hardware |
| 22 | `pwsteps` | Pool Steps | Tiles, deck and pool hardware |
| 23 | `pwhandrail` | Handrail | Tiles, deck and pool hardware |
| 24 | `pwchevron` | Lane Chevrons | Tiles, deck and pool hardware |
| 25 | `pwdashrope` | Dashed Rope | Tiles, deck and pool hardware |
| 26 | `pwplanks` | Deck Planks | Tiles, deck and pool hardware |
| 27 | `pwconcrete` | Concrete Deck | Tiles, deck and pool hardware |
| 28 | `pwgate` | Pool Gate | Tiles, deck and pool hardware |
| 29 | `pwlattice` | Fence Lattice | Tiles, deck and pool hardware |
| 30 | `pwgauge` | Pump Gauge | Tiles, deck and pool hardware |
| 31 | `pwpleats` | Filter Pleats | Tiles, deck and pool hardware |
| 32 | `pwthermo` | Thermometer | Tiles, deck and pool hardware |
| 33 | `pwcover` | Pool Cover | Tiles, deck and pool hardware |
| 34 | `pwinfinity` | Infinity Edge | Tiles, deck and pool hardware |
| 35 | `pwarc` | Water Arc | Tiles, deck and pool hardware |
| 36 | `pwdivering` | Dive Ring Toy | Pool toys |
| 37 | `pwdivestick` | Dive Stick | Pool toys |
| 38 | `pwsquirt` | Squirt Gun | Pool toys |
| 39 | `pwballoon` | Water Balloon | Pool toys |
| 40 | `pwsnorkel` | Snorkel | Pool toys |
| 41 | `pwflippers` | Flippers | Pool toys |
| 42 | `pwdonut` | Swim Donut | Pool toys |
| 43 | `pwmattress` | Float Mattress | Pool toys |
| 44 | `pwducky` | Rubber Ducky | Pool toys |
| 45 | `pwbuckethat` | Bucket Hat | Beach kit |
| 46 | `pwvisor` | Sun Visor | Beach kit |
| 47 | `pwtowelroll` | Rolled Towel | Beach kit |
| 48 | `pwbagweave` | Beach Bag Weave | Beach kit |
| 49 | `pwcooler` | Cooler Box | Beach kit |
| 50 | `pwstraw` | Cup & Straw | Drinks and treats |
| 51 | `pwsmoothie` | Smoothie Swirl | Drinks and treats |
| 52 | `pwfreezepop` | Freeze Pop | Drinks and treats |
| 53 | `pwsnowcone` | Snow Cone | Drinks and treats |
| 54 | `pwtwistrim` | Candy Twist Rim | Drinks and treats |
| 55 | `pwsunhat` | Sun Hat | Worn and carried things |
| 56 | `pwsandal` | Sandal Straps | Worn and carried things |
| 57 | `pwroundshades` | Round Shades | Worn and carried things |
| 58 | `pwdrip` | Lotion Drip | Worn and carried things |
| 59 | `pwwatch` | Swim Watch | Worn and carried things |
| 60 | `pwmegaphone` | Megaphone | Worn and carried things |
| 61 | `pwneontube` | Neon Pool Tube | Signs |
| 62 | `pwarrowsign` | Motel Arrow | Signs |
| 63 | `pwmarquee` | Marquee Bulbs | Signs |
| 64 | `pwsnackbar` | Snack Bar Board | Signs |
| 65 | `pwpolka` | Polka Swimsuit | Prints |
| 66 | `pwstripesuit` | Striped Suit | Prints |
| 67 | `pwgingham` | Gingham Picnic | Prints |
| 68 | `pwhalfsun` | Halftone Sun | Prints |
| 69 | `pwriso` | Riso Print | Prints |
| 70 | `pwbadge` | Vintage Badge | Badges and awards |
| 71 | `pwribbon` | Ribbon Banner | Badges and awards |
| 72 | `pwpennant` | Swim Pennant | Badges and awards |
| 73 | `pwstamp` | Pool Stamp | Badges and awards |
| 74 | `pwmedal` | Swim Medal | Badges and awards |
| 75 | `pwtrophy` | Trophy Plate | Badges and awards |
| 76 | `pwlcd` | Stopwatch LCD | Screens and glitches |
| 77 | `pwlapcount` | Lap Counter | Screens and glitches |
| 78 | `pwpixelwave` | Pixel Wave | Screens and glitches |
| 79 | `pwglitch` | Glitch Splash | Screens and glitches |
| 80 | `pwholo` | Holo Water | Screens and glitches |
| 81 | `pwjelly` | Jelly Float | Text looks |
| 82 | `pwmarble` | Glass Marble | Text looks |
| 83 | `pwbubble` | Bubble Letters | Text looks |
| 84 | `pwlongshadow` | Long Shadow | Text looks |
| 85 | `pwoutline` | Outline Pill | Text looks |
| 86 | `pwdotted` | Dotted Float | Text looks |
| 87 | `pwwavyline` | Wavy Underline | Text looks |
| 88 | `pwhighlight` | Highlighter Swipe | Text looks |
| 89 | `pwduo` | Duotone Split | Text looks |
| 90 | `pwsunsetmono` | Mono Sunset | Text looks |

### Poolside 3 (90 designs)

| # | Id | Name | Kind |
| --- | --- | --- | --- |
| 1 | `ptglitter` | Glitter Water | Water and light |
| 2 | `ptdapple` | Sun Dapples | Water and light |
| 3 | `ptcrown` | Splash Crown | Water and light |
| 4 | `ptcolumn` | Bubble Column | Water and light |
| 5 | `pttarget` | Ripple Target | Water and light |
| 6 | `ptwaveunder` | Wave Underline | Water and light |
| 7 | `ptombre` | Pool Ombre | Water and light |
| 8 | `ptrain` | Rain on the Pool | Water and light |
| 9 | `ptnightglow` | Night Pool Glow | Water and light |
| 10 | `ptsunbeam` | Sunbeam Rays | Water and light |
| 11 | `pthorizon` | Horizon Split | Water and light |
| 12 | `pticecube` | Ice Cube | Water and light |
| 13 | `ptsteam` | Hot Tub Steam | Water and light |
| 14 | `ptfizz` | Fizzy Splash | Water and light |
| 15 | `ptwavegloss` | Wave Gloss | Water and light |
| 16 | `ptkidney` | Kidney Pool | Pool shapes |
| 17 | `ptlapfloats` | Lap Pool Floats | Pool shapes |
| 18 | `ptdivewell` | Diving Well | Pool shapes |
| 19 | `ptspajets` | Spa Jet Ring | Pool shapes |
| 20 | `ptchecker` | Checker Border | Tiles, stone and deck |
| 21 | `ptorangegrout` | Orange Grout | Tiles, stone and deck |
| 22 | `ptmosaicstrip` | Mosaic Strip | Tiles, stone and deck |
| 23 | `ptdepthtile` | Depth Tile | Tiles, stone and deck |
| 24 | `ptstones` | Coping Stones | Tiles, stone and deck |
| 25 | `ptswag` | Rope Swag | Tiles, stone and deck |
| 26 | `ptdeckdiag` | Diagonal Deck | Tiles, stone and deck |
| 27 | `ptpickets` | Picket Fence | Tiles, stone and deck |
| 28 | `ptwaterfall` | Waterfall Wall | Tiles, stone and deck |
| 29 | `ptguardseat` | Guard Seat | Pool hardware and signs |
| 30 | `ptbeacon` | Pool Alarm Beacon | Pool hardware and signs |
| 31 | `ptpipes` | Pump Room Pipes | Pool hardware and signs |
| 32 | `ptporthole` | Underwater Window | Pool hardware and signs |
| 33 | `ptshower` | Poolside Shower | Pool hardware and signs |
| 34 | `ptrules` | Pool Rules Sign | Pool hardware and signs |
| 35 | `ptstripering` | Striped Inflatable | Toys and swim gear |
| 36 | `ptwings` | Water Wings | Toys and swim gear |
| 37 | `ptvolley` | Pool Volleyball | Toys and swim gear |
| 38 | `ptpolocap` | Water Polo Cap | Toys and swim gear |
| 39 | `ptpaddles` | Hand Paddles | Toys and swim gear |
| 40 | `pttorpedo` | Dive Torpedo | Toys and swim gear |
| 41 | `pthoop` | Pool Hoop | Toys and swim gear |
| 42 | `ptlounge` | Lounge Float | Toys and swim gear |
| 43 | `ptbucket` | Splash Bucket | Toys and swim gear |
| 44 | `ptmask` | Snorkel Mask | Toys and swim gear |
| 45 | `ptstrap` | Goggle Strap | Toys and swim gear |
| 46 | `ptvtowel` | Vertical Towel | Toys and swim gear |
| 47 | `ptaviator` | Aviator Shades | Toys and swim gear |
| 48 | `ptsqueeze` | Squeeze Tube | Drinks and treats |
| 49 | `ptorangeade` | Orangeade Glass | Drinks and treats |
| 50 | `ptlolly` | Swirl Lolly | Drinks and treats |
| 51 | `ptfloat` | Soda Float | Drinks and treats |
| 52 | `ptshaved` | Shaved Ice | Drinks and treats |
| 53 | `ptjuicebox` | Juice Box | Drinks and treats |
| 54 | `ptbitten` | Bitten Pop | Drinks and treats |
| 55 | `ptlanyard` | Pool Pass Lanyard | Passes, tags and safety |
| 56 | `ptziplock` | Dry Pouch | Passes, tags and safety |
| 57 | `ptbagtag` | Bag Tag | Passes, tags and safety |
| 58 | `ptcap` | Swim Team Cap | Passes, tags and safety |
| 59 | `ptrescueboard` | Rescue Board | Passes, tags and safety |
| 60 | `ptnoodles` | Noodle Twins | Passes, tags and safety |
| 61 | `ptfirstaid` | First Aid Cross | Passes, tags and safety |
| 62 | `ptscript` | Swim Club Script | Retro signs and prints |
| 63 | `ptinvite` | Party Invite | Retro signs and prints |
| 64 | `ptneonwave` | Neon Wave Sign | Retro signs and prints |
| 65 | `ptboomerang` | Boomerang Sign | Retro signs and prints |
| 66 | `ptgoogie` | Googie Sparkles | Retro signs and prints |
| 67 | `ptboomprint` | Boomerang Print | Retro signs and prints |
| 68 | `pttileletters` | Tile Letters | Retro signs and prints |
| 69 | `ptsleeve` | Varsity Sleeve | Team and tickets |
| 70 | `ptjersey` | Swim Team Jersey | Team and tickets |
| 71 | `ptsplitflap` | Split-Flap Board | Team and tickets |
| 72 | `ptadmit` | Admit One | Team and tickets |
| 73 | `ptbooth` | Photo Booth Strip | Keepsakes |
| 74 | `ptslide` | Film Slide | Keepsakes |
| 75 | `ptwavestamp` | Wave Postage | Keepsakes |
| 76 | `ptcalendar` | Summer Calendar | Keepsakes |
| 77 | `ptmixtape` | Summer Mixtape | Keepsakes |
| 78 | `ptspeakers` | Boombox Speakers | Keepsakes |
| 79 | `ptsurf` | Surf Sticker | Keepsakes |
| 80 | `ptgumbubble` | Gum Bubble | Pop art |
| 81 | `ptpopdots` | Pop Art Dots | Pop art |
| 82 | `ptcomicburst` | Comic Splash | Pop art |
| 83 | `ptextrude` | 3D Extrude Text | Text looks |
| 84 | `ptoutlineduo` | Outline Duo Text | Text looks |
| 85 | `ptvgrad` | Dive Gradient Text | Text looks |
| 86 | `ptchrome` | Chrome Pool Text | Text looks |
| 87 | `ptfrosted` | Frosted Cabana | Interface pieces |
| 88 | `ptcapsule` | Duo Capsule | Interface pieces |
| 89 | `pttoggle` | Pool Toggle | Interface pieces |
| 90 | `ptsunring` | Sunset Ring | Interface pieces |

### Poolside 4 (90 designs)

| # | Id | Name | Kind |
| --- | --- | --- | --- |
| 1 | `pfcaustics` | Caustic Net | Water and light |
| 2 | `pfwhitecap` | White Caps | Water and light |
| 3 | `pfeddy` | Eddy Swirl | Water and light |
| 4 | `pfrippleedge` | Ripple Edge | Water and light |
| 5 | `pftidepool` | Tide Pool | Water and light |
| 6 | `pfseafoam` | Sea Foam | Water and light |
| 7 | `pfmisting` | Misting Fan | Water and light |
| 8 | `pfwakewash` | Wake Wash | Water and light |
| 9 | `pfsurfline` | Surf Line | Water and light |
| 10 | `pfdewdrop` | Dew Drop | Water and light |
| 11 | `pfglassy` | Glassy Calm | Water and light |
| 12 | `pfmoonbeam` | Moon Beam | Water and light |
| 13 | `pfcurrentarrow` | Current Arrows | Water and light |
| 14 | `pfbubbletrail` | Bubble Trail | Water and light |
| 15 | `pfdepthfade` | Depth Fade | Water and light |
| 16 | `pfsparkleswim` | Sparkle Swim | Water and light |
| 17 | `pfmosaicfade` | Mosaic Fade | Tile and architecture |
| 18 | `pfzigtile` | Zigzag Tile | Tile and architecture |
| 19 | `pfhexpave` | Hex Pavers | Tile and architecture |
| 20 | `pfbrickborder` | Brick Border | Tile and architecture |
| 21 | `pfcolumns` | Column Row | Tile and architecture |
| 22 | `pfarchway` | Archway | Tile and architecture |
| 23 | `pfbalcony` | Balcony Rail | Tile and architecture |
| 24 | `pfcabanastripe` | Cabana Stripe | Tile and architecture |
| 25 | `pfpergola` | Pergola | Tile and architecture |
| 26 | `pfstairrail` | Stair Rail | Pool hardware |
| 27 | `pfdrain` | Drain Grate | Pool hardware |
| 28 | `pfskimmer` | Skimmer Lid | Pool hardware |
| 29 | `pflightbulb` | Pool Light | Pool hardware |
| 30 | `pfwallart` | Wall Mural | Pool hardware |
| 31 | `pfterrazzo` | Terrazzo | Pool hardware |
| 32 | `pfgateway` | Gate Bars | Pool hardware |
| 33 | `pffountain` | Fountain Arc | Pool hardware |
| 34 | `pfflippers` | Flipper Pair | Swim gear and tools |
| 35 | `pfsnorkelset` | Snorkel Set | Swim gear and tools |
| 36 | `pfswimcap` | Swim Cap | Swim gear and tools |
| 37 | `pfgoggles` | Goggle Lens | Swim gear and tools |
| 38 | `pfkickboard` | Kickboard | Swim gear and tools |
| 39 | `pfpullbuoy` | Pull Buoy | Swim gear and tools |
| 40 | `pfwhistle` | Lifeguard Whistle | Swim gear and tools |
| 41 | `pfrescuetube` | Rescue Tube | Swim gear and tools |
| 42 | `pfpoolnet` | Skimmer Net | Swim gear and tools |
| 43 | `pfhose` | Garden Hose | Swim gear and tools |
| 44 | `pfchlorine` | Chlorine Tab | Swim gear and tools |
| 45 | `pftestkit` | Test Kit | Swim gear and tools |
| 46 | `pfthermo` | Water Thermometer | Swim gear and tools |
| 47 | `pftimer` | Lap Timer | Swim gear and tools |
| 48 | `pflemonade` | Lemonade | Drinks and snacks |
| 49 | `pfpunch` | Fruit Punch | Drinks and snacks |
| 50 | `pfpopsicle` | Popsicle | Drinks and snacks |
| 51 | `pficecream` | Ice Cream Cone | Drinks and snacks |
| 52 | `pfwatermelon` | Watermelon Slice | Drinks and snacks |
| 53 | `pfcoconut` | Coconut Cup | Drinks and snacks |
| 54 | `pfsmoothie` | Smoothie Stripe | Drinks and snacks |
| 55 | `pfchips` | Chip Bag | Drinks and snacks |
| 56 | `pfseasonpass` | Season Pass | Passes and tags |
| 57 | `pfwristtag` | Wrist Tag | Passes and tags |
| 58 | `pflessoncard` | Lesson Card | Passes and tags |
| 59 | `pflockerkey` | Locker Key | Passes and tags |
| 60 | `pfcheckin` | Check-In Ticket | Passes and tags |
| 61 | `pfnametag` | Name Tag | Passes and tags |
| 62 | `pfmembercard` | Member Card | Passes and tags |
| 63 | `pfstamp` | Hand Stamp | Passes and tags |
| 64 | `pfretrosun` | Retro Sun | Retro and badges |
| 65 | `pfpostcard` | Postcard | Retro and badges |
| 66 | `pfdinerstripe` | Diner Stripe | Retro and badges |
| 67 | `pfatomic` | Atomic Stars | Retro and badges |
| 68 | `pfpalmprint` | Palm Print | Retro and badges |
| 69 | `pfsunsetband` | Sunset Bands | Retro and badges |
| 70 | `pfmotelsign` | Motel Sign | Retro and badges |
| 71 | `pfpennant` | Pennant Flag | Retro and badges |
| 72 | `pfbadge` | Swim Badge | Retro and badges |
| 73 | `pfpatch` | Camp Patch | Retro and badges |
| 74 | `pflongshadow` | Long Shadow | Text looks |
| 75 | `pfstacktext` | Stacked Text | Text looks |
| 76 | `pfgloweredge` | Glow Edge | Text looks |
| 77 | `pfsplashtext` | Splash Text | Text looks |
| 78 | `pfwettext` | Wet Letters | Text looks |
| 79 | `pfdashoutline` | Dash Outline | Text looks |
| 80 | `pfinline` | Inline Text | Text looks |
| 81 | `pfglasstext` | Glass Text | Text looks |
| 82 | `pfcutpaper` | Cut Paper | Shapes and interface pieces |
| 83 | `pfdoublewave` | Double Wave | Shapes and interface pieces |
| 84 | `pfpillswitch` | Pill Switch | Shapes and interface pieces |
| 85 | `pfcornerdot` | Corner Dots | Shapes and interface pieces |
| 86 | `pfpoolcard` | Pool Card | Shapes and interface pieces |
| 87 | `pfticker` | Ticker Tape | Shapes and interface pieces |
| 88 | `pfdivewave` | Dive Wave Rule | Shapes and interface pieces |
| 89 | `pfsplitgrad` | Split Gradient Pill | Shapes and interface pieces |
| 90 | `pfhalo` | Halo Ring | Shapes and interface pieces |

### Poolside 2A (90 designs)

| # | Id | Name | Kind |
| --- | --- | --- | --- |
| 1 | `qacannonballcrown` | Cannonball Crown | Water and light |
| 2 | `qatidalstripes` | Tidal Stripes | Water and light |
| 3 | `qaskippingstone` | Skipping Stone | Water and light |
| 4 | `qaraindroprows` | Raindrop Rows | Water and light |
| 5 | `qasprinklerfan` | Sprinkler Fan | Water and light |
| 6 | `qalapwake` | Lap Wake | Water and light |
| 7 | `qafogbank` | Fog Bank | Water and light |
| 8 | `qapondrings` | Pond Rings | Water and light |
| 9 | `qawaterlinescallop` | Waterline Scallop | Water and light |
| 10 | `qapuddleedge` | Puddle Edge | Water and light |
| 11 | `qadockreflection` | Dock Reflection | Water and light |
| 12 | `qaaquaprism` | Aqua Prism | Water and light |
| 13 | `qaladderrungs` | Ladder Rungs | Pool hardware |
| 14 | `qadivingboardgrip` | Diving Board Grip | Pool hardware |
| 15 | `qalanehook` | Lane Hook | Pool hardware |
| 16 | `qaskimmerbasket` | Skimmer Basket | Pool hardware |
| 17 | `qapoolwallclock` | Pool Wall Clock | Pool hardware |
| 18 | `qaconcretesteppingst` | Concrete Stepping Stones | Pool hardware |
| 19 | `qapoolumbrellastand` | Pool Umbrella Stand | Pool hardware |
| 20 | `qaslattedfence` | Slatted Fence | Pool hardware |
| 21 | `qapoolfloordots` | Pool Floor Dots | Pool hardware |
| 22 | `qadraincross` | Drain Cross | Pool hardware |
| 23 | `qatileborderstrip` | Tile Border Strip | Pool hardware |
| 24 | `qahottubcover` | Hot Tub Cover | Pool hardware |
| 25 | `qapoolgatelatch` | Pool Gate Latch | Pool hardware |
| 26 | `qalifeguardchairleg` | Lifeguard Chair Leg | Pool hardware |
| 27 | `qapoolnoodleends` | Pool Noodle Ends | Pool hardware |
| 28 | `qabeachballwedges` | Beach Ball Wedges | Toys and swim wear |
| 29 | `qapoolloungerback` | Pool Lounger Back | Toys and swim wear |
| 30 | `qatubevalve` | Tube Valve | Toys and swim wear |
| 31 | `qawatergunbarrel` | Water Gun Barrel | Toys and swim wear |
| 32 | `qasandpailhandle` | Sand Pail Handle | Toys and swim wear |
| 33 | `qashovelblade` | Shovel Blade | Toys and swim wear |
| 34 | `qakitetailbows` | Kite Tail Bows | Toys and swim wear |
| 35 | `qapoolraftseams` | Pool Raft Seams | Toys and swim wear |
| 36 | `qagogglestrapclip` | Goggle Strap Clip | Toys and swim wear |
| 37 | `qabathtoyboat` | Bath Toy Boat | Toys and swim wear |
| 38 | `qadivebrick` | Dive Brick | Toys and swim wear |
| 39 | `qawaterbombknot` | Water Bomb Knot | Toys and swim wear |
| 40 | `qaflipflopthong` | Flip Flop Thong | Toys and swim wear |
| 41 | `qaswimtrunkswaistban` | Swim Trunks Waistband | Toys and swim wear |
| 42 | `qarashvestpanels` | Rash Vest Panels | Toys and swim wear |
| 43 | `qawidebrimhat` | Wide Brim Hat | Beach |
| 44 | `qasunblockbottle` | Sunblock Bottle | Beach |
| 45 | `qatanlineband` | Tan Line Band | Beach |
| 46 | `qazincnosestripe` | Zinc Nose Stripe | Beach |
| 47 | `qaseashellridges` | Seashell Ridges | Beach |
| 48 | `qaanchortattoopatch` | Anchor Tattoo Patch | Beach |
| 49 | `qasandcastlecrenels` | Sandcastle Crenels | Beach |
| 50 | `qapalmfrondfan` | Palm Frond Fan | Beach |
| 51 | `qacoconutshellhalves` | Coconut Shell Halves | Beach |
| 52 | `qaicedteacubes` | Iced Tea Cubes | Food and drinks |
| 53 | `qalimewheel` | Lime Wheel | Food and drinks |
| 54 | `qapretzelsalt` | Pretzel Salt | Food and drinks |
| 55 | `qacorndogskewer` | Corn Dog Skewer | Food and drinks |
| 56 | `qanachocheesedrizzle` | Nacho Cheese Drizzle | Food and drinks |
| 57 | `qapizzasliceedge` | Pizza Slice Edge | Food and drinks |
| 58 | `qafrankbunsplit` | Frank Bun Split | Food and drinks |
| 59 | `qaicepopstick` | Ice Pop Stick | Food and drinks |
| 60 | `qasundaecherry` | Sundae Cherry | Food and drinks |
| 61 | `qaslushielayers` | Slushie Layers | Food and drinks |
| 62 | `qahoneydipper` | Honey Dipper | Food and drinks |
| 63 | `qawaterbottlecap` | Water Bottle Cap | Food and drinks |
| 64 | `qaswimtestsign` | Swim Test Sign | Signs |
| 65 | `qabewaretriangle` | Beware Triangle | Signs |
| 66 | `qahoursboard` | Hours Board | Signs |
| 67 | `qaarrowpost` | Arrow Post | Signs |
| 68 | `qashowerheadplate` | Shower Head Plate | Signs |
| 69 | `qanumberdisc` | Number Disc | Signs |
| 70 | `qawaxsealstamp` | Wax Seal Stamp | Tags and stamps |
| 71 | `qafoldedcornertag` | Folded Corner Tag | Tags and stamps |
| 72 | `qaluggagestrap` | Luggage Strap | Tags and stamps |
| 73 | `qaropeframe` | Rope Frame | Tags and stamps |
| 74 | `qaseigaihawaves` | Seigaiha Waves | Patterns |
| 75 | `qalifebuoybands` | Lifebuoy Bands | Patterns |
| 76 | `qasunburstpanel` | Sunburst Panel | Patterns |
| 77 | `qafishscaletiles` | Fish Scale Tiles | Patterns |
| 78 | `qatropicalleafrows` | Tropical Leaf Rows | Patterns |
| 79 | `qacrosshatchtowel` | Crosshatch Towel | Patterns |
| 80 | `qadotmatrixsun` | Dot Matrix Sun | Patterns |
| 81 | `qaargylefloat` | Argyle Float | Patterns |
| 82 | `qaaquabead` | Aqua Bead | Glass, screens and text lines |
| 83 | `qafrostedlens` | Frosted Lens | Glass, screens and text lines |
| 84 | `qawaterlevelgauge` | Water Level Gauge | Glass, screens and text lines |
| 85 | `qadigitaldepthsign` | Digital Depth Sign | Glass, screens and text lines |
| 86 | `qapagerdisplay` | Pager Display | Glass, screens and text lines |
| 87 | `qawetglasspane` | Wet Glass Pane | Glass, screens and text lines |
| 88 | `qadashunderglow` | Dash Under Glow | Glass, screens and text lines |
| 89 | `qadoubleunderlinewav` | Double Underline Wave | Glass, screens and text lines |
| 90 | `qacornerbrackets` | Corner Brackets | Glass, screens and text lines |

## Part 9. Questions and answers

**Why is the variable called `--o` when it is sometimes cyan?** It is the accent slot. In warm palettes the accent is orange, in the three all-blue palettes (Deep Lane, Chlorine Blue, Splash Pad) it is cyan. The designs never care: they just use "the accent".

**Why does Poolside 2 have different variables from Poolside 3?** Poolside 2 was drawn with one main color and four tones of it (`--m` to `--mk`). From Poolside 3 on, designs needed water and accent as separate roles, so the set became `--o --ol --c --b --w --dk`. Continuations keep the variables of their parent.

**Can a design use both sets?** No. A design reads only the variables its colorway rules define.

**Do I need `-webkit-` prefixes?** Only where the existing designs have them: `-webkit-background-clip: text` (always paired with `background-clip`) and `-webkit-mask` (paired with `mask`).

**Why white text with a dark halo instead of just dark text?** The chips are drawn as colored objects. White text with a halo keeps the object saturated and readable on every palette. Pale objects (paper, foam, glass) use dark ink instead.

**How wide can a chip get?** It is inline-block, so it follows the words. Patterns must tile (repeat) rather than stretch, so a long phrase still looks right.

**Do designs work on dark pages?** Yes, because each chip draws its own background. Text-only designs (`background: none`) use `--md`, `--b` or ink colors that are mid to dark; check them on a dark page and consider a thin halo.

**What about printing?** Browsers may drop backgrounds. Designs rely on `background`, so a print preview is part of the test. Keep strokes at 1px or more.

**Where do I find the live styles?** Waterflow toolbar **Styles**, Bitbook Unique Chip Styles gallery **Poolside Style Lookup**, and anywhere Keydown runs with `@id-N@words@`.

**Where is the source of truth?** `writeout/unique-styles.css` for the CSS, `writeout/psl-data.js` for names, palettes and collections. This guide was generated from both.

## Appendix: Poolside Keydown in one screen

Poolside Keydown is written between the braces of `;;pk{ }` outside Waterflow. Every mark has an exact Keydown twin, so a note can be switched either way without loss.

```text
/ A big title
// A section
<< A quiet quote
<! An alert
<? A question
() A ring bullet
<ring words>  <lap words>  <foam words>  <deep words>
<id-N words>   (any Poolside style, N from 1 to 5)
/~ rope | A lane divider | blue
```

The full reference is the OpenDB article **Poolside Keydown** and the article **Poolside style**.
