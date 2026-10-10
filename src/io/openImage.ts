/**
 * Open an image file as a new document.
 *
 * Inside Tauri: native file picker → `open_image` (raw RGBA over IPC, no JSON
 * per-pixel encoding) → new document.
 * In a browser tab: `<input type="file">` → canvas decode → new document.
 */

import { loadProject } from "./project";
import { rememberBrowser, rememberNative } from "./recentFiles";
import { isTauri, tauriApi } from "@/hooks/useTauri";
import { useDocumentStore } from "@/store/useDocumentStore";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "tif", "tiff", "bmp"];

export interface DecodedImage {
  name: string;
  width: number;
  height: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
}

/** Parse the `open_image` binary payload: u32 width, u32 height, RGBA8 bytes. */
export function parseOpenedImage(buffer: ArrayBuffer, name: string): DecodedImage {
  const view = new DataView(buffer);
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  const expected = width * height * 4;
  if (buffer.byteLength !== 8 + expected) {
    throw new Error("Image data was incomplete; the file may be corrupt.");
  }
  // Copy so the buffer can be released; the document owns its pixels.
  const pixels = new Uint8ClampedArray(buffer.slice(8, 8 + expected));
  return { name, width, height, pixels };
}

async function decodeInBrowser(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return {
    name: file.name.replace(/\.[^.]+$/, "") || "Untitled",
    width: canvas.width,
    height: canvas.height,
    pixels: new Uint8ClampedArray(data),
  };
}

/** Let the user pick an image and decode it. Returns null when cancelled. */
export async function pickAndDecodeImage(): Promise<DecodedImage | null> {
  if (isTauri()) {
    const path = await tauriApi.openFileDialog([
      { name: "Images", extensions: IMAGE_EXTENSIONS },
    ]);
    if (!path) return null;
    const name = path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || "Untitled";
    const buffer = await tauriApi.openImageRaw(path);
    return parseOpenedImage(buffer, name);
  }
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_EXTENSIONS.map((e) => `.${e}`).join(",");
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
  return file ? decodeInBrowser(file) : null;
}

/** File ▸ Open: pick, decode and open as a new document. */
export async function openImageAsDocument(): Promise<string | null> {
  try {
    if (isTauri()) {
      const path = await tauriApi.openFileDialog([{ name: "Images and Diffract Projects", extensions: [...IMAGE_EXTENSIONS, "diffract"] }]);
      return path ? await openPathAsDocument(path) : null;
    }
    const file = await new Promise<File | null>(resolve => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = [...IMAGE_EXTENSIONS.map(e => `.${e}`), ".diffract"].join(",");
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.addEventListener("cancel", () => resolve(null));
      input.click();
    });
    return file ? await openFileAsDocument(file) : null;
  } catch (err) {
    window.alert(`Open failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** Also used by drag-and-drop and browser Recent; errors propagate to the caller. */
export async function openFileAsDocument(file: File, addToRecent = true): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "diffract" && !IMAGE_EXTENSIONS.includes(ext ?? "")) {
    throw new Error(`Unsupported file: ${file.name}`);
  }
  const id = ext === "diffract" ?
    await loadProject(await file.text()) : createImageDocument(await decodeInBrowser(file));
  if (addToRecent) await rememberBrowser(file);
  return id;
}

/** Native Recent can reopen a real disk path, unlike the browser file picker. */
export async function openPathAsDocument(path: string): Promise<string> {
  if (!isTauri()) throw new Error("Native file paths are unavailable in the browser.");
  let id: string;
  if (path.toLowerCase().endsWith(".diffract")) {
    const text = await tauriApi.readTextFile(path);
    if (text === null) throw new Error("Unable to read the project.");
    id = await loadProject(text, path);
  } else {
    const name = path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || "Untitled";
    id = createImageDocument(parseOpenedImage(await tauriApi.openImageRaw(path), name));
  }
  rememberNative(path);
  return id;
}

function createImageDocument(image: DecodedImage): string {
  return useDocumentStore.getState().createDocument({
    name: image.name, width: image.width, height: image.height,
    dpi: 72, colorMode: "rgb", background: "transparent", pixels: image.pixels,
  });
}
