/** Editable type layers: keep text metadata and regenerate their raster surface. */
import type { Tool } from "./types";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useColorStore } from "@/store/useColorStore";
import type { TextContent } from "@/store/types";

/** The viewport mounts a DOM text editor when this tool receives a click. */
export class TextTool implements Tool {
  readonly id = "text" as const;
  readonly name = "Horizontal Type Tool";
  readonly cursor = "text";
}

function render(layerId: string, text: TextContent) {
  const engine = getEngine();
  const surface = engine?.getSurface(layerId);
  if (!surface) return;
  surface.ctx.clearRect(0, 0, surface.width, surface.height);
  surface.ctx.save();
  surface.ctx.font = `${text.fontSize}px Arial, sans-serif`;
  surface.ctx.textBaseline = "top";
  surface.ctx.fillStyle = text.color;
  text.content.split("\n").forEach((line, index) => {
    surface.ctx.fillText(line, text.x, text.y + index * text.fontSize * 1.2);
  });
  surface.ctx.restore();
  engine?.markDirty(layerId);
}

export function createText(x: number, y: number): string | null {
  const docs = useDocumentStore.getState();
  const doc = docs.activeDocument();
  if (!doc) return null;
  const fg = useColorStore.getState().foreground;
  const color = `rgba(${fg.r},${fg.g},${fg.b},${fg.a})`;
  const id = docs.addLayer(doc.id, {
    name: "Type Layer", kind: "text",
    text: { content: "", x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), fontSize: 48, color },
  });
  return id;
}

export function updateText(docId: string, layerId: string, patch: Partial<TextContent>): void {
  const docs = useDocumentStore.getState();
  const layer = docs.documents.find(d => d.id === docId)?.layers.find(l => l.id === layerId);
  if (!layer?.text || layer.locked) return;
  const before = { ...layer.text };
  const after = { ...before, ...patch, fontSize: Math.max(1, Math.min(1000, patch.fontSize ?? before.fontSize)) };
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  const apply = (value: TextContent) => {
    useDocumentStore.setState(s => ({ documents: s.documents.map(d => d.id !== docId ? d : {
      ...d, dirty: true, layers: d.layers.map(l => l.id === layerId ? { ...l, text: value, name: value.content.split("\n")[0]?.slice(0, 32) || "Type Layer" } : l),
    }) }));
    render(layerId, value);
  };
  apply(after);
  useHistoryStore.getState().push(docId, { label: "Edit Type", undo: () => apply(before), redo: () => apply(after) });
}
