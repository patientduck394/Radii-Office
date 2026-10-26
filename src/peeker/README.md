# Peeker!

A PDF editor that runs fully in your browser! Nothing gets uploaded anywhere!

## What it does!

- **Open** any PDF (button or drag and drop), or start a **blank PDF**!
- **Mark it up:** Text, Highlight, Draw, Box, Whiteout, Image and Sign (draw a signature and drop it in)!
- **Move things around:** the Select tool drags marks, the orange dot resizes boxes and pictures, Delete removes them!
- **Pages:** rotate, move, duplicate, add blank pages, delete, or drag thumbnails to reorder!
  Ctrl+click (or Shift+click) thumbnails to work on several pages at once!
- **Add Pages...** merges another PDF onto the end!
- **Fill Forms** lists the PDF's fillable fields! Answers are written in (and flattened) when you save!
- **Find Text** searches the words on every page!
- **Save PDF** downloads the edited file, **Extract Pages** downloads just the picked pages!
- Undo and redo for everything (Ctrl+Z / Ctrl+Y)!

Documents are kept in your browser (IndexedDB), so they are still there next time!

## Keys!

V select · T text · H highlight · D draw · B box · W whiteout · Delete removes a mark ·
Ctrl+S save · Ctrl+F find · Ctrl+= / Ctrl+- zoom · Ctrl+0 fit · PageUp / PageDown pages!

## Under the hood!

- [pdf.js](https://mozilla.github.io/pdf.js/) (Apache-2.0, version 5.7) draws the pages and reads the words, gradients included!
- [pdf-lib](https://pdf-lib.js.org/) (MIT) writes the saved PDF!

Both load from jsDelivr, so Peeker needs the internet the first time it runs!
Edits are drawn onto the pages when you save, so existing PDF text can be covered
(Whiteout) and typed over, but not retyped in place! Added text uses Helvetica, so
letters outside Latin get swapped for "?"! Locked PDFs open but can't be saved with edits!

This is the Classic layout: an orange glass sidebar with gel buttons!
