// Writeout desktop shell: your ACTUAL web files in a native window!
// No conversion exists from HTML/CSS/JS to Rust widgets, so this embeds the
// real Writeout (../../writeout) in the system webview via Tauri (Rust)!
// Looks identical because it IS identical, minus the browser chrome!

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run Writeout");
}
