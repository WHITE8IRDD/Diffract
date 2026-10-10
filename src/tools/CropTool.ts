/** Crop: drag out a crop region; press Enter or click Crop in Properties. */
import type { Tool, ToolPointerEvent } from "./types";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useUIStore } from "@/store/useUIStore";
import { useSelectionStore } from "@/store/useSelectionStore";

export class CropTool implements Tool {
  readonly id = "crop" as const;
  readonly name = "Crop Tool";
  readonly cursor = "crosshair";
  private start: { x: number; y: number } | null = null;
  onPointerDown(e: ToolPointerEvent) { this.start = e.doc; }
  onPointerMove(e: ToolPointerEvent) { if (this.start) this.update(e); }
  onPointerUp(e: ToolPointerEvent) { if (this.start) this.update(e); this.start = null; }
  private update(e: ToolPointerEvent) {
    const doc = useDocumentStore.getState().activeDocument();
    if (!this.start || !doc) return;
    const x = Math.max(0, Math.min(doc.width, this.start.x, e.doc.x));
    const y = Math.max(0, Math.min(doc.height, this.start.y, e.doc.y));
    let w = Math.min(doc.width - x, Math.abs(e.doc.x - this.start.x));
    let h = Math.min(doc.height - y, Math.abs(e.doc.y - this.start.y));
    const aspect = useUIStore.getState().toolOptions.crop.aspect;
    if (aspect) { h = Math.min(h, w / aspect); w = h * aspect; }
    useSelectionStore.getState().setSelection(doc.id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  }
  cancel() { this.start = null; }
}
