// A Radii Office app in its own desktop window!
// The window comes from the app's config (scripts/build-all.mjs writes one per app), and anything the app
// downloads (a .kd export, a .csv...) lands in the Downloads folder.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::{webview::DownloadEvent, Manager, State, WebviewWindowBuilder};

// Safety: the page may only touch files and folders the person picked in this app's own dialogs (remembered between runs in
// radii-grants.json in the app's data folder). Without this, any script that ever ran inside a page (a note with a script in it,
// a program, a bad import) could read or overwrite any file on the computer!
#[derive(Default, Serialize, Deserialize)]
struct Saved {
    files: Vec<PathBuf>,
    dirs: Vec<PathBuf>,
}

struct Grants {
    files: Mutex<HashSet<PathBuf>>,
    dirs: Mutex<HashSet<PathBuf>>,
    store: Option<PathBuf>,
}

// a path in one fixed spelling: symlinks resolved, and a file that does not exist yet (a fresh Save) by its folder plus its name
fn norm(path: &str) -> Result<PathBuf, String> {
    let p = Path::new(path);
    if let Ok(c) = std::fs::canonicalize(p) {
        return Ok(c);
    }
    let name = p.file_name().ok_or("That is not a file path")?;
    let parent = p.parent().filter(|x| !x.as_os_str().is_empty()).unwrap_or_else(|| Path::new("."));
    Ok(std::fs::canonicalize(parent).map_err(|e| e.to_string())?.join(name))
}

impl Grants {
    fn load(store: Option<PathBuf>) -> Grants {
        let saved: Saved = store
            .as_ref()
            .and_then(|f| std::fs::read_to_string(f).ok())
            .and_then(|t| serde_json::from_str(&t).ok())
            .unwrap_or_default();
        Grants { files: Mutex::new(saved.files.into_iter().collect()), dirs: Mutex::new(saved.dirs.into_iter().collect()), store }
    }
    fn save(&self) {
        if let Some(f) = &self.store {
            let saved = Saved {
                files: self.files.lock().map(|g| g.iter().cloned().collect()).unwrap_or_default(),
                dirs: self.dirs.lock().map(|g| g.iter().cloned().collect()).unwrap_or_default(),
            };
            if let Some(dir) = f.parent() {
                let _ = std::fs::create_dir_all(dir);
            }
            if let Ok(t) = serde_json::to_string(&saved) {
                let _ = std::fs::write(f, t);
            }
        }
    }
    fn allow_file(&self, path: &str) {
        if let Ok(p) = norm(path) {
            if let Ok(mut g) = self.files.lock() {
                g.insert(p);
            }
            self.save();
        }
    }
    fn allow_dir(&self, path: &str) {
        if let Ok(p) = norm(path) {
            if let Ok(mut g) = self.dirs.lock() {
                g.insert(p);
            }
            self.save();
        }
    }
    // a file is fine if it was picked itself, or sits inside a folder that was picked
    fn file_ok(&self, path: &str) -> Result<PathBuf, String> {
        let p = norm(path)?;
        let hit = self.files.lock().map(|g| g.contains(&p)).unwrap_or(false) || self.dirs.lock().map(|g| g.iter().any(|d| p.starts_with(d))).unwrap_or(false);
        if hit {
            Ok(p)
        } else {
            Err("This app has not been given that file. Pick it again (Share, then Keep a file on this computer)!".to_string())
        }
    }
    fn dir_ok(&self, path: &str) -> Result<PathBuf, String> {
        let p = norm(path)?;
        if self.dirs.lock().map(|g| g.contains(&p)).unwrap_or(false) {
            Ok(p)
        } else {
            Err("This app has not been given that folder. Pick it again!".to_string())
        }
    }
}

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
async fn radii_pick(app: tauri::AppHandle, grants: State<'_, Grants>, save: bool, name: String, exts: Option<Vec<String>>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let list: Vec<String> = exts.unwrap_or_else(|| vec!["radii".to_string(), "json".to_string()]);
    let refs: Vec<&str> = list.iter().map(|s| s.as_str()).collect();
    let mut d = app.dialog().file().add_filter("Document", &refs);
    if save {
        d = d.set_file_name(&name);
    }
    let picked = if save { d.blocking_save_file() } else { d.blocking_pick_file() };
    let out = picked.and_then(|f| f.into_path().ok()).map(|p| p.to_string_lossy().to_string());
    if let Some(p) = &out {
        grants.allow_file(p);
    }
    Ok(out)
}

#[tauri::command]
fn radii_read(grants: State<'_, Grants>, path: String) -> Result<FileRead, String> {
    let p = grants.file_ok(&path)?;
    let text = std::fs::read_to_string(&p).map_err(|e| e.to_string())?;
    Ok(FileRead { text, mtime: mtime_of(&p.to_string_lossy())? })
}

#[tauri::command]
fn radii_write(grants: State<'_, Grants>, path: String, text: String) -> Result<u64, String> {
    let p = grants.file_ok(&path)?;
    std::fs::write(&p, text).map_err(|e| e.to_string())?;
    mtime_of(&p.to_string_lossy())
}

#[tauri::command]
async fn radii_pick_dir(app: tauri::AppHandle, grants: State<'_, Grants>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let out = app.dialog().file().blocking_pick_folder().and_then(|f| f.into_path().ok()).map(|p| p.to_string_lossy().to_string());
    if let Some(p) = &out {
        grants.allow_dir(p);
    }
    Ok(out)
}

#[derive(Serialize)]
struct FolderFile {
    name: String,
    mtime: u64,
}

#[tauri::command]
fn radii_list(grants: State<'_, Grants>, path: String) -> Result<Vec<FolderFile>, String> {
    let dir = grants.dir_ok(&path)?;
    let mut out = Vec::new();
    for e in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
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
fn radii_stat(grants: State<'_, Grants>, path: String) -> Result<u64, String> {
    let p = grants.file_ok(&path)?;
    mtime_of(&p.to_string_lossy())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![radii_pick, radii_pick_dir, radii_list, radii_read, radii_write, radii_stat])
        .setup(|app| {
            let handle = app.handle().clone();
            app.manage(Grants::load(handle.path().app_data_dir().ok().map(|d| d.join("radii-grants.json"))));
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

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("radii-grants-test-{}-{}", name, std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn unpicked_files_are_refused_and_picked_ones_work() {
        let d = temp("files");
        let a = d.join("a.kd");
        let b = d.join("b.kd");
        std::fs::write(&a, "hi").unwrap();
        std::fs::write(&b, "secret").unwrap();
        let g = Grants::load(None);
        assert!(g.file_ok(a.to_str().unwrap()).is_err());
        g.allow_file(a.to_str().unwrap());
        assert!(g.file_ok(a.to_str().unwrap()).is_ok());
        assert!(g.file_ok(b.to_str().unwrap()).is_err(), "a neighbour of a picked file is not picked");
        // a path that wanders out of the folder with .. is still the same file after resolving
        let sneaky = d.join("x").join("..").join("b.kd");
        std::fs::create_dir_all(d.join("x")).unwrap();
        assert!(g.file_ok(sneaky.to_str().unwrap()).is_err());
    }

    #[test]
    fn a_new_save_target_can_be_granted_before_it_exists() {
        let d = temp("new");
        let f = d.join("fresh.kd");
        let g = Grants::load(None);
        g.allow_file(f.to_str().unwrap());
        assert!(g.file_ok(f.to_str().unwrap()).is_ok());
    }

    #[test]
    fn a_picked_folder_covers_what_is_inside_but_not_beside() {
        let d = temp("dirs");
        let inside = d.join("sub");
        let outside = temp("outside");
        std::fs::create_dir_all(&inside).unwrap();
        std::fs::write(inside.join("n.kd"), "x").unwrap();
        std::fs::write(outside.join("o.kd"), "y").unwrap();
        let g = Grants::load(None);
        assert!(g.dir_ok(inside.to_str().unwrap()).is_err());
        g.allow_dir(inside.to_str().unwrap());
        assert!(g.dir_ok(inside.to_str().unwrap()).is_ok());
        assert!(g.file_ok(inside.join("n.kd").to_str().unwrap()).is_ok());
        assert!(g.file_ok(outside.join("o.kd").to_str().unwrap()).is_err());
        assert!(g.dir_ok(d.to_str().unwrap()).is_err(), "the parent folder is not covered");
    }

    #[test]
    fn grants_survive_a_restart() {
        let d = temp("persist");
        let store = d.join("radii-grants.json");
        let f = d.join("keep.kd");
        std::fs::write(&f, "k").unwrap();
        Grants::load(Some(store.clone())).allow_file(f.to_str().unwrap());
        let again = Grants::load(Some(store));
        assert!(again.file_ok(f.to_str().unwrap()).is_ok());
    }
}
