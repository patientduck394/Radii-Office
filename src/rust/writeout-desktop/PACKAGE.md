# Writeout Desktop — packaging guide!

Entirely Rust (eframe/egui + rfd): native editor, Keydown marker toggles,
live stripped preview, word counts, real file open/save!

Develop:
```sh
cargo test --manifest-path rust/writeout-desktop/Cargo.toml
cargo run --manifest-path rust/writeout-desktop/Cargo.toml
```

Ship a Mac app (rebuilds `Writeout.app` from scratch):
```sh
cargo build --release --manifest-path rust/writeout-desktop/Cargo.toml
APP="rust/writeout-desktop/Writeout.app"
rm -rf "$APP" && mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp rust/writeout-desktop/target/release/writeout-desktop "$APP/Contents/MacOS/"
# Info.plist + AppIcon.icns (from writeout/icon-512.png via sips/iconutil)
# live in the bundle already — keep them when rebuilding!
```

Deploy note: `target/` holds build artifacts (hundreds of MB) — exclude it
from any static upload, ship only `Writeout.app` (about 6 MB)!
