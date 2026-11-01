# Pages written in Elm!

Why Elm lives here: a few of the site's pages are written in [Elm](https://elm-lang.org), a friendly
language that compiles to JavaScript with no runtime errors!

Pages:
- `src/SourcePage.elm` → `/source` (download the site, with live file counts and sizes!)
- `src/ConductPage.elm` → `/code-of-conduct` (sections fold open and shut, chips jump to each one!)
- `src/NotFound.elm` → `/not_found.html` (shows the missing address and guesses the page you meant!)
- `src/Layout.elm` → the top bar and footer they share!

Files:
- `pages.js` — the committed build output (all three pages in one file), served statically!
- `pages.css` — their styles!
- The `.html` pages themselves are tiny shells that start the right Elm program!

Rebuild any time (needs Elm 0.19.1, e.g. `npm install -g elm`, plus `terser` to shrink it):
```sh
cd elm
elm make src/SourcePage.elm src/ConductPage.elm src/NotFound.elm --optimize --output=pages.big.js
terser pages.big.js --compress 'pure_funcs=[F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9],pure_getters,keep_fargs=false,unsafe_comps,unsafe' | terser --mangle --output pages.js
rm pages.big.js
```
Then bump the `?v=` on `pages.js` in the three pages!
