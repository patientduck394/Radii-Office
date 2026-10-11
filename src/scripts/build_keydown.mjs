// build_keydown.mjs — build-time entry point, Node stdlib only, zero dependencies!
// Run from repo root: node scripts/build_keydown.mjs
// Emits: imbuer/keydown.json, formly/keydown.json (committed data artifacts)!

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APPS } from "./keydown.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const app of ["imbuer", "formly"]) {
    const bundle = APPS[app];
    writeFileSync(join(ROOT, app, "keydown.json"), JSON.stringify(bundle));
    console.log(`${app}: ${bundle.length} definitions -> ${app}/keydown.json!`);
}
console.log("Wrote imbuer/keydown.json, formly/keydown.json!");
