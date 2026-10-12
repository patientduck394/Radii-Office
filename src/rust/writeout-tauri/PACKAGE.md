# Writeout Tauri desktop shell!

Your ACTUAL web files (`../../writeout`) in a native window, via Tauri (Rust)!
Looks identical because it IS identical, minus the browser chrome!

Rebuild the bundle any time:
```sh
npx -y @tauri-apps/cli@2 build --bundles app
```

The finished app lands at BOTH:
- `target/release/bundle/macos/Writeout.app` (build output)
- `Writeout.app` (friendly copy, about 14 MB)!

Notes:
- No HTML/CSS/JS-to-Rust conversion exists anywhere: any tool claiming that
  sells vapor! This embeds the real frontend in the system webview instead!
- First launch needs internet for the app's CDN scripts, like the website!
- `target/` holds build artifacts: exclude it from any static upload!
- The pure-Rust egui twin lives on at `../writeout-desktop/`!
