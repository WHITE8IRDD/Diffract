/** Layer-preserving Diffract project format. PNG per layer keeps the payload
 * portable and avoids trying to serialize GPU resources or history closures. */
import { useHistoryStore } from "@/store/useHistoryStore";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import type { DocumentState, LayerState } from "@/store/types";
import { isTauri, tauriApi } from "@/hooks/useTauri";
import { rememberBrowser, rememberNative } from "./recentFiles";

interface ProjectFile {
  format: "diffract-project";
  version: 1;
  document: Pick<DocumentState, "name" | "width" | "height" | "dpi" | "colorMode">;
  layers: { meta: Omit<LayerState, "id">; png: string; maskPng?: string }[];
}

export async function saveProject(saveAs = false): Promise<void> {
  const docs = useDocumentStore.getState();
  const doc = docs.activeDocument();
  const engine = getEngine();
  if (!doc || !engine) return;
  const layers = doc.layers.map(layer => {
    const surface = engine.getSurface(layer.id);
    if (!surface) throw new Error(`Missing pixel surface for ${layer.name}`);
    const { id: _id, ...meta } = layer;
    void _id;
    return { meta, png: surface.canvas.toDataURL("image/png"),
      maskPng: layer.mask && surface.mask ? surface.mask.canvas.toDataURL("image/png") : undefined };
  });
  const project: ProjectFile = {
    format: "diffract-project", version: 1,
    document: { name: doc.name, width: doc.width, height: doc.height, dpi: doc.dpi, colorMode: doc.colorMode },
    layers,
  };
  const filename = `${doc.name.replace(/[\\/:*?"<>|]/g, "_")}.diffract`;
  if (isTauri()) {
    const path = !saveAs && doc.filePath?.endsWith(".diffract") ? doc.filePath :
      await tauriApi.saveFileDialog(filename, [{ name: "Diffract Project", extensions: ["diffract"] }]);
    if (!path) return;
    await tauriApi.writeTextFile(path, JSON.stringify(project));
    docs.markSaved(doc.id, path);
    rememberNative(path);
  } else {
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    docs.markSaved(doc.id, null);
    await rememberBrowser(new File([blob], filename, { type: blob.type }));
  }
}

export async function loadProject(raw: string, path: string | null = null): Promise<string> {
  const file: unknown = JSON.parse(raw);
  if (!file || typeof file !== "object" || !("format" in file) || file.format !== "diffract-project" ||
    !("version" in file) || file.version !== 1 || !("document" in file) || !("layers" in file))
    throw new Error("This is not a supported Diffract project.");
  const project = file as ProjectFile;
  const { width, height, dpi, name, colorMode } = project.document;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > 8192 || height > 8192 || width * height > 24_000_000 || !Array.isArray(project.layers) || project.layers.length > 300)
    throw new Error("Project dimensions or layer count are invalid.");
  const decoded = await Promise.all(project.layers.map(async layer => {
    if (typeof layer.png !== "string" || !layer.png.startsWith("data:image/png;base64,"))
      throw new Error("Project contains an invalid layer image.");
    const bitmap = await createImageBitmap(await (await fetch(layer.png)).blob());
    if (bitmap.width !== width || bitmap.height !== height) { bitmap.close(); throw new Error("Layer size does not match the project."); }
    let maskBitmap: ImageBitmap | null = null;
    if (layer.maskPng) {
      if (!layer.maskPng.startsWith("data:image/png;base64,")) throw new Error("Project contains an invalid mask image.");
      maskBitmap = await createImageBitmap(await (await fetch(layer.maskPng)).blob());
      if (maskBitmap.width !== width || maskBitmap.height !== height) {
        maskBitmap.close(); bitmap.close(); throw new Error("Mask size does not match the project.");
      }
    }
    return { meta: layer.meta, bitmap, maskBitmap };
  }));
  const docs = useDocumentStore.getState();
  const docId = docs.createDocument({ name, width, height, dpi, colorMode, background: "transparent" });
  const engine = getEngine();
  const initialId = docs.activeDocument()?.activeLayerId;
  if (initialId) docs.deleteLayer(docId, initialId);
  for (const { meta, bitmap, maskBitmap } of decoded) {
    const id = docs.addLayer(docId, { ...meta, mask: null });
    const surface = engine?.getSurface(id);
    surface?.ctx.drawImage(bitmap, 0, 0);
    if (surface) engine?.markDirty(id);
    bitmap.close();
    if (meta.mask && maskBitmap && surface) {
      engine?.createMaskSurface(id, meta.mask.id);
      surface.mask?.ctx.clearRect(0, 0, width, height);
      surface.mask?.ctx.drawImage(maskBitmap, 0, 0);
      if (surface.mask) surface.mask.dirty = true;
      useDocumentStore.setState(state => ({ documents: state.documents.map(d => d.id !== docId ? d : {
        ...d, layers: d.layers.map(l => l.id === id ? { ...l, mask: meta.mask } : l),
      }) }));
      engine?.requestRender();
    }
    maskBitmap?.close();
  }
  useDocumentStore.getState().markSaved(docId, path);
  // The import is a single starting state, not a long series of user actions.
  useHistoryStore.getState().clear(docId);
  return docId;
}
