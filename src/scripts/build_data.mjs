// build_data.mjs — build-time data entry point, Node stdlib only, zero dependencies!
// Run from repo root: node scripts/build_data.mjs
// Emits: imbuer/computed.json, mainkey/index.json, inkpath/path_data.json!
// (Replaces the removed py/build_data.py with identical sample inputs)!

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as imbuer from "./engines/imbuer.mjs";
import * as mainkey from "./engines/mainkey.mjs";
import * as inkpath from "./engines/inkpath.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Imbuer: same sample sheet the old builds used!
const sheet = {
    A1: "10", A2: "20", A3: "30",
    A4: "=SUM(A1:A3)", A5: "=AVG(A1:A4)",
    B1: "=MIN(A1:A3)", B2: "=MAX(A1:A3)", B3: "=COUNT(A1:A5)",
};
const evaluated = imbuer.evaluateSheet(sheet);
const evalStr = {};
for (const k of Object.keys(evaluated)) evalStr[k] = String(evaluated[k]);
const avec = imbuer.getRangeValues(evalStr, "A1", "A5");
const stats = imbuer.columnStats(avec);

const order = ["A1", "A4", "B3", "A2", "A3", "B1", "B2", "A5"];
const imbuerOut = {
    generator: "js-build",
    column_A_stats: {
        mean: stats.mean, min: stats.min, sum: stats.sum,
        max: stats.max, count: stats.count,
    },
    evaluated: Object.fromEntries(order.map((k) => [k, evaluated[k]])),
};
writeFileSync(join(ROOT, "imbuer", "computed.json"), JSON.stringify(imbuerOut));
console.log(
    `imbuer: A4=${evaluated.A4} A5=${evaluated.A5}`
    + ` B1=${evaluated.B1} B2=${evaluated.B2} B3=${evaluated.B3}!`
);

// 2. Mainkey: same sample records the old builds used!
const fields = [
    { id: "title", name: "Title", type: "text" },
    { id: "status", name: "Status", type: "tag" },
    { id: "value", name: "Value", type: "number" },
];
const records = [
    { id: 1, title: "Project Alpha", status: "In Progress", value: 1200 },
    { id: 2, title: "Radii Game Asset", status: "Completed", value: 450 },
    { id: 3, title: "Project Beta", status: "In Progress", value: 800 },
];
const index = mainkey.buildIndex(records, fields);
const shape = (r) => ({ title: r.title, id: r.id, status: r.status, value: r.value });
const sortKeys = (obj) => Object.fromEntries(
    Object.keys(obj).sort().map((k) => [k, obj[k]])
);
const vs = index.value_stats;
const orderedIndex = {
    record_count: index.record_count,
    search_index: index.search_index,
    version: index.version,
    value_stats: { min: vs.min, sum: vs.sum, max: vs.max, avg: vs.avg, count: vs.count },
    filtered_alpha: mainkey.filterRecords(records, "alpha").map(shape),
    sorted_by_value: mainkey.sortRecords(records, "value").map(shape),
    histograms: Object.fromEntries(
        index.field_ids.map((fid) => [fid, sortKeys(index.histograms[fid])])
    ),
    field_ids: index.field_ids,
    app: index.app,
};
writeFileSync(join(ROOT, "mainkey", "index.json"), JSON.stringify(orderedIndex));
console.log(
    `mainkey: records=${index.record_count}`
    + ` alpha_hits=${orderedIndex.filtered_alpha.length}`
    + ` value_sum=${index.value_stats.sum}!`
);

// 3. Inkpath: same 3-node curve the old builds used!
const nodes = [
    inkpath.node(0.0, 0.0, 0.0, 0.0, 25.0, 50.0),
    inkpath.node(100.0, 100.0, 75.0, 50.0, 75.0, 150.0),
    inkpath.node(200.0, 0.0, 125.0, 50.0, 200.0, 0.0),
];
const flat = inkpath.flattenPath(nodes, 8);
const bb = inkpath.pathBbox(nodes);
const inkpathOut = {
    d: inkpath.buildPathData(nodes),
    bbox: { w: bb.w, h: bb.h, y: bb.y, x: bb.x },
    flattened: flat.map((p) => ({ y: p.y, x: p.x })),
    length: inkpath.pathLength(nodes),
    generator: "js-build",
};
writeFileSync(join(ROOT, "inkpath", "path_data.json"), JSON.stringify(inkpathOut));
console.log(`inkpath: length=${inkpathOut.length.toFixed(2)} points=${flat.length}!`);
console.log("Wrote imbuer/computed.json, mainkey/index.json, inkpath/path_data.json!");
