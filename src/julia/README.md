# Julia build-time engines — stdlib only, no dependencies!
# Run: julia --project=julia julia/scripts/build.jl
# Outputs are static JSON consumed by the existing JS at runtime!

Engines:
- src/ImbuerEngine.jl — SUM, AVG, MIN, MAX, COUNT plus dependency ordering and cycle detection!
- src/MainkeyEngine.jl — substring filter, sort, numeric aggregation, search index and histograms!
- src/InkpathEngine.jl — cubic Bezier eval, length, bbox, flatten, and SVG path builder matching JS!

Outputs:
- imbuer/computed.json — pre-evaluated sheet and column stats!
- mainkey/index.json — search index, histograms, value stats, and sample filtered views!
- inkpath/path_data.json — path `d`, length, bbox, and flattened polyline!

JS stays the runtime — just fetch the JSON optionally, e.g.:
```js
const pre = await (await fetch('computed.json')).json().catch(() => null);
```
