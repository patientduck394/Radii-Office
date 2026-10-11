# Lua build-time content data! Runtime JS stays as-is — data artifacts only!

Why Lua lives here: Imbuer (29 defs) and Formly (135 defs) each hand-carry a
`keydownDefinitions` table that has drifted apart with no shared source!
Lua owns them as one truth and rebuilds per-app bundles!

Files:
- `keydown.lua` — every definition once, built from shared chunks (`core_orbs`,
  `flashes`, `fx_core`, ...) so common entries stay in sync by construction!
- `build_keydown.lua` — pure-Lua builder, zero dependencies, fixed key order!

Rebuild any time from the repo root (needs Lua: `brew install lua`):
```sh
lua lua/build_keydown.lua
```

Outputs (committed, optional for apps to fetch later):
- `imbuer/keydown.json` — Imbuer's exact 29, in order!
- `formly/keydown.json` — Formly's exact 135, in order, `isItalic` preserved!

Drift check: the bundles must stay byte-comparable to each app's table —
verified exact on every build, so runtime behavior never changes by accident!
