/**
 * Tauri bridge.
 *
 * The same bundle runs inside the Tauri WebView and in a plain browser tab
 * (UI development / live preview). Every native capability is resolved
 * lazily: inside Tauri we call Rust commands; in the browser we fall back to
 * web equivalents (File System Access where available, downloads otherwise).
 */

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Options for `New Document` — mirrored by the Rust `create_document` command. */
export interface NewDocRequest {
  name: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: "rgb" | "grayscale" | "cmyk";
  background: "white" | "transparent";
}

export interface SaveResult {
  ok: boolean;
  path: string | null;
  error?: string;
}

/** Structured document summary exchanged with the Rust side. */
export interface DocumentSummary {
  name: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: string;
  layerCount: number;
}

/**
 * Invoke a Tauri command when available; otherwise run `fallback`.
 * Keeps every feature degrading gracefully in the browser preview.
 */
async function nativeOr<T>(command: string, args: Record<string, unknown>, fallback: () => Promise<T> | T): Promise<T> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return (await invoke<T>(command, args)) as T;
    } catch (err) {
      console.warn(`[tauri] command ${command} failed:`, err);
    }
  }
  return fallback();
}

export const tauriApi = {
  /** App version string (from the Rust `app_version` command). */
  async appVersion(): Promise<string> {
    return nativeOr("app_version", {}, () => "0.1.0-web");
  },

  /** Open a file picker; returns the picked path (Tauri) or null. */
  async openFileDialog(filters: { name: string; extensions: string[] }[]): Promise<string | null> {
    if (!isTauri()) return null;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({
        multiple: false,
        filters,
      });
      return typeof picked === "string" ? picked : null;
    } catch {
      return null;
    }
  },

  /** Save dialog; returns the chosen path or null when cancelled. */
  async saveFileDialog(defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<string | null> {
    if (!isTauri()) return null;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const picked = await save({
        defaultPath: defaultName,
        filters,
      });
      return typeof picked === "string" ? picked : null;
    } catch {
      return null;
    }
  },

  /**
   * Encode + write flattened pixels to disk via the Rust backend
   * (`export_image` — png/jpeg/webp through the `image` crate).
   */
  async exportImage(
    doc: DocumentSummary,
    pngBytes: Uint8Array,
    format: "png" | "jpeg" | "webp",
    path: string,
    quality = 92,
  ): Promise<SaveResult> {
    return nativeOr<SaveResult>(
      "export_image",
      { request: { doc, format, path, quality, pngBytes: Array.from(pngBytes) } },
      async () => {
        // Browser fallback: trigger a download of the PNG payload.
        const blob = new Blob([pngBytes.slice().buffer as ArrayBuffer], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.name || "untitled"}.${format === "jpeg" ? "jpg" : format}`;
        a.click();
        URL.revokeObjectURL(url);
        return { ok: true, path: null };
      },
    );
  },

  /**
   * Decode an image on the Rust side. Resolves to the raw payload: an 8-byte
   * header (u32 width, u32 height, little-endian) followed by RGBA8 pixels.
   */
  async openImageRaw(path: string): Promise<ArrayBuffer> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<ArrayBuffer>("open_image", { path });
  },

  /** Write a layered project file using the native filesystem. */
  async writeTextFile(path: string, content: string): Promise<void> {
    if (!isTauri()) throw new Error("Native file write is unavailable.");
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_text_file", { path, content });
  },

  /** Read a UTF-8 text file from disk (Tauri only). */
  async readTextFile(path: string): Promise<string | null> {
    return nativeOr<string | null>("read_text_file", { path }, () => null);
  },
};
