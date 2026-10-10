//! IPC command surface (`src/hooks/useTauri.ts` is the TypeScript mirror).
//!
//! Every command is pure host-side work — decode, encode, disk I/O — so the
//! WebView stays free for UI and GPU compositing. Errors cross the boundary
//! as strings with actionable text; the frontend renders them verbatim.

use serde::{Deserialize, Serialize};
use std::path::Path;

/// Structured error for command results. Kept deliberately small: Phase 2
/// introduces typed error codes for the save/recovery flow.
#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("image decode error: {0}")]
    Decode(#[from] image::ImageError),
    #[error("{0}")]
    Invalid(String),
}

type CmdResult<T> = Result<T, String>;

fn to_string_err<E: Into<CommandError>>(e: E) -> String {
    e.into().to_string()
}

// ---------------------------------------------------------------------------
// Shared types (serde camelCase ↔ idiomatic TS field names)
// ---------------------------------------------------------------------------

/// Document metadata accompanying file operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSummary {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub dpi: u32,
    pub color_mode: String,
    pub layer_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub doc: DocumentSummary,
    /// "png" | "jpeg" | "webp"
    pub format: String,
    /// Destination path chosen by the user.
    pub path: String,
    /// Flattened pixels, PNG-encoded by the frontend compositor.
    pub png_bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    pub ok: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedImage {
    pub width: u32,
    pub height: u32,
    /// RGBA8 pixels, row-major.
    pub pixels: Vec<u8>,
    /// Detected colour mode (RGB/Gray → RGB8 in Phase 1).
    pub color_mode: String,
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Application version (mirrors Cargo/package versions).
#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Encode flattened pixels and write them to `request.path`.
///
/// The frontend always flattens through the engine's CPU compositor and sends
/// a PNG payload; re-encoding host-side keeps one pixel pipeline while
/// unlocking JPEG/WebP quality controls and (Phase 4) 16-bit output.
#[tauri::command]
pub async fn export_image(request: ExportRequest) -> CmdResult<SaveResult> {
    let result = encode_and_write(&request).map_err(to_string_err)?;
    Ok(SaveResult {
        ok: true,
        path: Some(result),
        error: None,
    })
}

fn encode_and_write(request: &ExportRequest) -> Result<String, CommandError> {
    let img = image::load_from_memory(&request.png_bytes)
        .map_err(CommandError::Decode)?;

    let path = Path::new(&request.path);
    match request.format.as_str() {
        "png" => img.save_with_format(path, image::ImageFormat::Png)?,
        "jpeg" => {
            // JPEG has no alpha — flatten onto white first.
            let rgb = img.to_rgb8();
            image::DynamicImage::ImageRgb8(rgb)
                .save_with_format(path, image::ImageFormat::Jpeg)?;
        }
        "webp" => img.save_with_format(path, image::ImageFormat::WebP)?,
        other => {
            return Err(CommandError::Invalid(format!(
                "unsupported export format: {other}"
            )))
        }
    }
    Ok(request.path.clone())
}

/// Decode an image file to RGBA8 for the canvas engine.
///
/// Phase 1 formats: PNG, JPEG, WebP, TIFF, BMP. PSD/RAW arrive in Phase 4
/// behind this same command so the frontend never changes.
#[tauri::command]
pub async fn open_image(path: String) -> CmdResult<OpenedImage> {
    let img = image::open(&path).map_err(to_string_err)?;
    let rgba = img.to_rgba8();
    let (width, height) = (rgba.width(), rgba.height());
    Ok(OpenedImage {
        width,
        height,
        pixels: rgba.into_raw(),
        color_mode: "rgb".to_string(),
    })
}

/// Read a UTF-8 text sidecar (project metadata, actions, plugin manifests).
#[tauri::command]
pub async fn read_text_file(path: String) -> CmdResult<String> {
    std::fs::read_to_string(path).map_err(to_string_err)
}
