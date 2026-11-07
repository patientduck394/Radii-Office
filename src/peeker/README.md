# Peeker!

A PDF editor that runs fully in your browser! Nothing gets uploaded anywhere!

## What it does!

- **Open** any PDF (button or drag and drop), or start a **blank PDF**!
- **Edit what is already in the PDF** (Edit tool, E): every line of text and every picture on the page gets an outline! Click a line to retype it (same size, font and color), or a picture to move, resize or delete it! A cover in the paper's color hides the original, and the edit sits on top!
- **Mark it up:** Text, Highlight, Draw, Box, Whiteout, Image and Sign (draw a signature and drop it in)!
- **Annotate inks in Draw:** the Ink menu has Bitbook's Annotate inks (Gel Ink, Felt Pen, Highlighter, Neon, Crayon) and every Theme Pack style, in the 13 Annotate colors! Saved PDFs carry them as sharp pictures (4 pixels per point), exactly as they look; the plain pen stays a real PDF line!
- **Font controls for text:** Sans (Helvetica), Serif (Times) or Mono (Courier), **Bold**, *Italic*, Underline, Strikethrough and size (Ctrl+B / Ctrl+I / Ctrl+U on a picked text mark)!
- **Keydown in text:** type `#G#chips#`, `#Y#highlights##`, `**bold**`, the Gel Series and every other Keydown style; it shows as you click away!
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
- [html-to-image](https://github.com/bubkoo/html-to-image) (MIT) turns Keydown text into a picture for the saved PDF!

Both load from jsDelivr, so Peeker needs the internet the first time it runs!
Edits are drawn onto the pages when you save, so edited PDF text and pictures are covered by the paper's color and redrawn on top (the original is still in the file under the cover, and
shapes drawn as lines can only be covered, not edited)! Plain added text is saved as real PDF text
in Helvetica, Times or Courier! Text with Keydown (or letters those fonts lack) is saved as a
sharp picture of how it looks, with invisible real text on top, so it can still be searched and copied! Locked PDFs open but can't be saved with edits!

This is the Classic layout: an orange glass sidebar with gel buttons!
