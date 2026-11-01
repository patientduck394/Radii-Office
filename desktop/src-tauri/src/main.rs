// A Radii Office app in its own desktop window!
// The window comes from the app's config (scripts/build-all.mjs writes one per app), and anything the app
// downloads (a .kd export, a .csv...) lands in the Downloads folder.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{webview::DownloadEvent, Manager, WebviewWindowBuilder};

fn main() {
    tauri::Builder::default()
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
