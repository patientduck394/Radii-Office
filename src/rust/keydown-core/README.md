# keydown-core: Keydown's text engine in Rust

Keydown text to HTML (`**bold**`, chips, highlights, headings, lists, quotes, tables, footnotes, links, code), written in Rust with no
dependencies and compiled to WebAssembly (`writeout/keydown-core.wasm`, 190 KB). The JavaScript engine in `writeout/keydown-doc.js`
is still the reference and the fallback: the Rust one hands back `null` for anything it does not do yet, and the JavaScript draws that.

**What it does now:** `inline()` (code and fences, escapes, footnote references, links, Unique Styles `@family-N@x@`, highlights `#R#x##`,
Annotate names `#R.halo(x)`, Color Ink `#R(x)`, and all 817 chip and format triggers) and `textToHtml()` (headings, bullets, quotes,
pipe tables, code fences, footnote definitions, `|` indents, `{align=...}`, plain lines).
**Not yet (falls back to JavaScript):** math (`$x^2$`, KaTeX), `{{templates}}`, `[[links]]`, pictures and files inside the text,
`@@` Skills and `@@table`, `[words]{color=...}`, `::blocks` and `$$` display math lines, and the editor side (HTML back to text,
live typing), which needs the page's DOM.

## Use it
`writeout/keydown-rust.js` loads the module (`window.KeydownRust`). It is **off** until you switch it on, so nothing changes by default:
`KeydownRust.enable()` in the console (it remembers in `localStorage` as `kd_rust`), `KeydownRust.disable()` to go back.
Then `kdDoc.textToHtml` tries Rust first (Writeout and Bitbook both load it).

## Build and check
```sh
node scripts/build_keydown_rust.mjs      # tables from keydown-doc.js -> cargo build (wasm) -> copy -> the comparison test
```
`scripts/gen_keydown_rust.mjs` copies the tables (chips, colors, Annotate styles, Unique families) out of `keydown-doc.js` into `src/tables.rs`, so
both engines always know the same chips: run the build again after adding a chip family.
`scripts/test_keydown_rust.mjs` draws every OpenDB document (as lines and as whole texts), hand-made edge cases and 60,000 random
fuzz texts with both engines, and fails on the first byte of difference in anything Rust drew. `cargo test` has the small unit tests.

Last run: Rust drew 92.6% of the OpenDB lines and 89.4% of whole documents, and 104,148 fuzz results, all identical to JavaScript.

## Layout
- `src/util.rs` JavaScript-compatible helpers (`\s`, trim, escaping, slug)
- `src/inline.rs` the stash pipeline of `inline()` ported rule by rule
- `src/blocks.rs` `textToHtml()`
- `src/tables.rs` GENERATED
- `src/lib.rs` the public functions, tests, and the plain `extern "C"` WebAssembly exports (no wasm-bindgen needed)
