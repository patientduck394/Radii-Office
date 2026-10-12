// engines/mainkey.ts — TypeScript source of the build-time database engine!
// Compiles to mainkey.js (committed, Node runs the output as-is)!
// Recompile with: npx -y -p typescript tsc --project tsconfig.json
// Substring filter, sort, numeric aggregation, search index and histograms!
// Deterministic lowercase text: id, then title, status, value!
export function rowText(rec) {
    return [rec.id ?? "", rec.title ?? "", rec.status ?? "", rec.value ?? ""]
        .map((v) => String(v)).join(" ").toLowerCase();
}
export function filterRecords(records, query) {
    const q = String(query).trim().toLowerCase();
    if (!q)
        return [...records];
    return records.filter((r) => rowText(r).includes(q));
}
export function sortRecords(records, field) {
    return [...records].sort((a, b) => {
        const x = String(a[field] ?? "");
        const y = String(b[field] ?? "");
        return x < y ? -1 : x > y ? 1 : 0;
    });
}
export function aggregateNumeric(records, field) {
    const vals = [];
    for (const r of records) {
        const raw = r[field];
        const v = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
        if (!isNaN(v))
            vals.push(v);
    }
    if (vals.length === 0)
        return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
        count: vals.length, sum, avg: sum / vals.length,
        min: Math.min(...vals), max: Math.max(...vals),
    };
}
export function buildIndex(records, fields) {
    const fieldIds = fields.map((f) => f.id);
    const searchIndex = records.map((r, i) => ({ id: r.id ?? i + 1, text: rowText(r) }));
    const histograms = {};
    for (const f of fields) {
        const counts = {};
        for (const r of records) {
            const key = String(r[f.id] ?? "");
            counts[key] = (counts[key] || 0) + 1;
        }
        histograms[f.id] = counts;
    }
    return {
        app: "Radii Base",
        version: "1.0",
        record_count: records.length,
        field_ids: fieldIds,
        search_index: searchIndex,
        histograms,
        value_stats: aggregateNumeric(records, "value"),
    };
}
