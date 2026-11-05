// build_keydown_rust.mjs: tables -> Rust -> WebAssembly -> writeout/keydown-core.wasm -> comparison test!
// Run from the repo root: node scripts/build_keydown_rust.mjs   (needs Rust with the wasm32 target: rustup target add wasm32-unknown-unknown)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
run('node', ['scripts/gen_keydown_rust.mjs']);
run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', 'rust/keydown-core/Cargo.toml']);
fs.copyFileSync(path.join(ROOT, 'rust/keydown-core/target/wasm32-unknown-unknown/release/keydown_core.wasm'), path.join(ROOT, 'writeout/keydown-core.wasm'));
console.log('writeout/keydown-core.wasm: ' + fs.statSync(path.join(ROOT, 'writeout/keydown-core.wasm')).size + ' bytes!');
run('node', ['scripts/test_keydown_rust.mjs']);
