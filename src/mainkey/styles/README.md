# Mainkey SCSS sources! JS stays as-is — styles only!

Files:
- `_theme.scss` — brand variables (`$brand`, `$brand-light`, `$brand-pale`), `brand-glow()` helper, and `stack` / `glass-panel` mixins!
- `app.scss` — full Mainkey stylesheet using nesting plus the theme (compiles to `../style.css`)!

Recompile any time with (no install, no `node_modules`, static hosting stays clean):
```sh
npx -y sass mainkey/styles/app.scss mainkey/style.css --no-source-map
```

`../style.css` is committed so the app works with zero build step — edit the SCSS, recompile, done!
