// A Radii Office app in its own desktop window!
// The window comes from the app's config (scripts/build-all.mjs writes one per app), and anything the app
// downloads (a .kd export, a .csv...) lands in the Downloads folder.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::time::UNIX_EPOCH;
use tauri::{webview::DownloadEvent, Manager, WebviewWindowBuilder};

// Files on this computer: the app asks for a place once, then rewrites that same file on every change
#[derive(Serialize)]
struct FileRead {
    text: String,
    mtime: u64,
}

fn mtime_of(path: &str) -> Result<u64, String> {
    let m = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let t = m.modified().map_err(|e| e.to_string())?;
    Ok(t.duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0))
}

#[tauri::command]
async fn radii_pick(app: tauri::AppHandle, save: bool, name: String) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let mut d = app.dialog().file().add_filter("Radii file", &["radii", "json"]);
    if save {
        d = d.set_file_name(&name);
    }
    let picked = if save { d.blocking_save_file() } else { d.blocking_pick_file() };
    picked.and_then(|f| f.into_path().ok()).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn radii_read(path: String) -> Result<FileRead, String> {
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(FileRead { text, mtime: mtime_of(&path)? })
}

#[tauri::command]
fn radii_write(path: String, text: String) -> Result<u64, String> {
    std::fs::write(&path, text).map_err(|e| e.to_string())?;
    mtime_of(&path)
}

#[tauri::command]
async fn radii_pick_dir(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    app.dialog().file().blocking_pick_folder().and_then(|f| f.into_path().ok()).map(|p| p.to_string_lossy().to_string())
}

#[derive(Serialize)]
struct FolderFile {
    name: String,
    mtime: u64,
}

#[tauri::command]
fn radii_list(path: String) -> Result<Vec<FolderFile>, String> {
    let mut out = Vec::new();
    for e in std::fs::read_dir(&path).map_err(|e| e.to_string())? {
        let e = e.map_err(|e| e.to_string())?;
        if e.file_type().map(|t| t.is_file()).unwrap_or(false) {
            let name = e.file_name().to_string_lossy().to_string();
            let mtime = mtime_of(&e.path().to_string_lossy()).unwrap_or(0);
            out.push(FolderFile { name, mtime });
        }
    }
    Ok(out)
}

#[tauri::command]
fn radii_stat(path: String) -> Result<u64, String> {
    mtime_of(&path)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![radii_pick, radii_pick_dir, radii_list, radii_read, radii_write, radii_stat])
        .setup(|app| {
            let handle = app.handle().clone();
            let downloads = handle.path().download_dir().ok();
            for cfg in app.config().app.windows.clone() {
                let dir = downloads.clone();
                WebviewWindowBuilder::from_config(&handle, &cfg)?
                    .on_download(move |_, event| {
                        if let DownloadEvent::Requested { destination, .. } = event {
                            if let (Some(dir), Some(name)) = (dir.as_ref(), destination.file_name().map(|n| n.to_owned())) {
                                *destination = dir.join(name);
                            }
                        }
                        true
                    })
                    .build()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Radii Office app");
}
