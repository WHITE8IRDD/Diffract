// Diffract — Tauri binary entry point.
//
// `windows_subsystem = "windows"` keeps the console hidden in release builds;
// debug builds keep the console for logs.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    diffract_lib::run()
}
