# Parts written in Svelte!

A few parts of the site are [Svelte](https://svelte.dev) components! Svelte compiles each component into
plain JavaScript ahead of time, so the site still needs no build step on the server: the pages just load
the built file!

Parts:
- `src/ProductFinder.svelte` → the **Find an app** bar on `/products` (search box, category chips, the `/`
  shortcut, best matches first, and it opens the Archives dropdown when a search finds an archived app)!
- `src/DownloadDialog.svelte` → the **Download** popup on `/products` (pick your operating system; it asks
  GitHub which desktop builds really exist, so a button only works when its file is there)!
- `src/products.js` → mounts both on the Products page and hooks up every card's Download button!

Files:
- `products.js` — the committed build output (both components, their styles and the Svelte runtime in one
  file, about 25 KB compressed), served statically!
- `build.mjs` — the build (esbuild + esbuild-svelte, minified, production mode)!

Rebuild any time (needs Node):
```sh
cd svelte
npm install
npm run build
```
Then bump the `?v=` on `svelte/products.js` in `products.html`!

The cards themselves stay plain HTML in `products.html`, so adding an app is still just adding a card
(plus its name in the `APPS` list in `src/products.js` if it has desktop builds)!
