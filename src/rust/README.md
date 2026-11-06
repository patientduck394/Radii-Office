# Rust Bezier math, compiled to WebAssembly and executed for real!

Why Rust lives here: it genuinely executes — in browsers via `bezmath.wasm`
and in Node for verification — giving the site a second executing language!

Files:
- `bezmath/` — tiny `cdylib` crate with `cubic_len` (same 32-sample loop as
  `scripts/engines/inkpath.js`)!
- `../inkpath/bezmath.wasm` — committed 592-byte build output, served statically!
- `../inkpath/bezmath.js` — loader with a JS fallback (`window.BezMath`)!

Rebuild any time (needs Rust with the wasm32 target):
```sh
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown --manifest-path rust/bezmath/Cargo.toml
cp rust/bezmath/target/wasm32-unknown-unknown/release/bezmath.wasm inkpath/bezmath.wasm
```

Verified: the WASM total matches the JS engine to 6e-14 on the sample curve!
