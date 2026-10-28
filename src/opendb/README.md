# OpenDB!

A free, open-access database of **articles** (like Wikipedia), **media** (like Wikimedia Commons)
and **papers** (like arXiv). Everything in it is dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/): copy, change and reuse anything,
for any purpose, with no credit needed!

## How it works

OpenDB is a static site with no server or database:

- Every entry is a Keydown (`.kd`) file in `data/entries/`, with a short header of facts between `---` lines.
  Keydown is the formatting language of Radii Office, and entries can also hold LaTeX math.
- Media files live in `data/media/`.
- `node scripts/build_opendb.mjs` (from the Radii Office folder) checks every entry and compiles them
  all into `data/index.json`, which the site loads once and searches in the browser.
  `scripts/build_source.mjs` runs it automatically.

## Writing entries

Entry bodies use **Keydown** (`~H2~Heading~H2~`, `**bold**`, `*italic*`, `~BUL~list item~BUL~`,
`#G#chip#`, `=B=gel orb=B=`, `::glass` blocks and hundreds more) plus OpenDB's extras: `$inline$` and
`$$display$$` LaTeX math, `[[wiki links]]`, `![caption](media:id)` embeds, links and footnotes.
The editor's Keydown link opens the full guide!

```text
---
id: honey-bee                 # must match the file name, lowercase-with-dashes
type: article                 # article, media or paper
title: Honey bee
summary: One sentence about it.
tags: [biology, insects]
created: 2026-10-27
updated: 2026-10-27
authors: [Your Name]
license: CC0-1.0              # required: OpenDB only accepts CC0
infobox.Kingdom: Animalia     # optional facts for the side box
---
The **honey bee** lives in #G#colonies#. Link other entries with [[photosynthesis]]
or [[water-cycle|custom text]], and cite with footnotes.[^1]

![Caption](media:water-cycle-diagram)

~H2~Math~H2~

A bee cell is a hexagon with area $\frac{3\sqrt{3}}{2}s^2$, and display math works too:

$$A = \frac{3\sqrt{3}}{2}s^2$$

~BUL~Queen~BUL~
~BUL~Workers~BUL~

~H2~References~H2~

[^1]: A source, https://example.com
```

Media entries add `file: media/name.svg`, `mime`, `width` and `height`. Papers add `abstract:`
(one line) and `categories: [cs.DL]`.

## Contributing from the site

Press **Contribute**, write the entry with a live preview, and tick the CC0 box!

- **Save on this device** keeps it in your browser and shows it in OpenDB for you right away.
- **Publish for everyone** opens GitHub with the file filled in (media and long entries are downloaded
  for uploading instead), so it becomes a proposed change that a maintainer reviews.

## For maintainers

Review proposed entries for accuracy, sources and the right to dedicate them to the public domain,
then merge and run `node scripts/build_opendb.mjs`. The build refuses entries that aren't CC0, whose id
doesn't match the file name, or whose media file is missing.
