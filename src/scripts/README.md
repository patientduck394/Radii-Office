# JavaScript build scripts! One language that executes everywhere!

No installs, no toolchains, no runtimes beyond the Node already on your machine!
The same JavaScript runs live in browsers AND builds the data bundles!

## 1. Keydown markup (shared content data)!
Why: Imbuer (29 defs) and Formly (135 defs) each hand-carry a
`keydownDefinitions` table that has drifted apart with no shared source!
One truth here rebuilds both per-app bundles!

Files:
- `keydown.mjs` — every definition once, built from shared chunks (`CORE_ORBS`,
  `FLASHES`, `FX_CORE`, ...) so common entries stay in sync by construction!
- `build_keydown.mjs` — builder, Node stdlib only!

```sh
node scripts/build_keydown.mjs
```

Outputs (committed, optional for apps to fetch later):
- `imbuer/keydown.json` — Imbuer's exact 29, in order!
- `formly/keydown.json` — Formly's exact 135, in order, `isItalic` preserved!

## 2. App data bundles (replaces the removed Python pipeline)!
Why: Python is gone — JavaScript now generates the same sample-data artifacts
from identical inputs, verified value-identical!

Files:
- `engines/imbuer.mjs` — SUM, AVG, MIN, MAX, COUNT plus dependency ordering and cycle detection!
- `engines/mainkey.mjs` — substring filter, sort, numeric aggregation, search index and histograms!
- `engines/inkpath.mjs` — cubic Bezier eval, length, bbox, flatten, and SVG path builder matching the apps!
- `build_data.mjs` — entry point, Node stdlib only!

```sh
node scripts/build_data.mjs
```

Outputs (committed):
- `imbuer/computed.json` — pre-evaluated sheet and column stats!
- `mainkey/index.json` — search index, histograms, value stats, and sample filtered views!
- `inkpath/path_data.json` — path `d`, length, bbox, and flattened polyline!

Drift check: the bundles must stay byte-comparable to each app's tables —
verified exact on every build, so runtime behavior never changes by accident!
