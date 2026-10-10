//! Diffract application library.
//!
//! Responsibilities of the Rust side (Phase 1):
//!  * host the WebView2 shell (window, menus, dialogs);
//!  * file I/O: decode/encode PNG · JPEG · WebP · TIFF via the `image` crate;
//!  * export pipeline: receive flattened pixels from the frontend, encode to
//!    the requested format and write to disk.
//!
//! Phase 4 extends this surface with PSD read/write, RAW import (libraw),
//! colour management and the batch/automation runner — all behind the same
//! command contract in [`commands`].

mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::app_version,
            commands::export_image,
            commands::open_image,
            commands::read_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Diffract");
}
