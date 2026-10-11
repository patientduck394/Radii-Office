# Lua build-time content data! Runtime JS stays as-is — data artifacts only!

Two pipelines live here (pure Lua, zero dependencies, needs Lua: `brew install lua`)!

## 1. Keydown markup (shared content data)!
Why: Imbuer (29 defs) and Formly (135 defs) each hand-carry a
`keydownDefinitions` table that has drifted apart with no shared source!
Lua owns them as one truth and rebuilds per-app bundles!

Files:
- `keydown.lua` — every definition once, built from shared chunks (`core_orbs`,
  `flashes`, `fx_core`, ...) so common entries stay in sync by construction!
- `build_keydown.lua` — builder with fixed key order for stable diffs!

```sh
lua lua/build_keydown.lua
```

Outputs (committed, optional for apps to fetch later):
- `imbuer/keydown.json` — Imbuer's exact 29, in order!
- `formly/keydown.json` — Formly's exact 135, in order, `isItalic` preserved!

## 2. App data bundles (replaces the removed Julia pipeline)!
Why: the old `julia/` build-time pipeline is gone — Lua now generates the same
sample-data artifacts from identical inputs, verified value-identical!

Files:
- `engines/imbuer.lua` — SUM, AVG, MIN, MAX, COUNT plus dependency ordering and cycle detection!
- `engines/mainkey.lua` — substring filter, sort, numeric aggregation, search index and histograms!
- `engines/inkpath.lua` — cubic Bezier eval, length, bbox, flatten, and SVG path builder matching JS!
- `build_data.lua` — entry point with fixed key order for stable diffs!

```sh
lua lua/build_data.lua
```

Outputs (committed):
- `imbuer/computed.json` — pre-evaluated sheet and column stats!
- `mainkey/index.json` — search index, histograms, value stats, and sample filtered views!
- `inkpath/path_data.json` — path `d`, length, bbox, and flattened polyline!

Drift check: the bundles must stay byte-comparable to each app's tables —
verified exact on every build, so runtime behavior never changes by accident!
