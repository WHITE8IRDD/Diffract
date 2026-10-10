/** Rectangle and ellipse tools create separate, independently editable layers. */
import type { Tool, ToolId, ToolPointerEvent } from "./types";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useColorStore } from "@/store/useColorStore";
import { useHistoryStore } from "@/store/useHistoryStore";

export class ShapeTool implements Tool {
  readonly id: ToolId;
  readonly name: string;
  readonly cursor = "crosshair";
  private start: ToolPointerEvent | null = null;
  constructor(private ellipse = false) {
    this.id = ellipse ? "shape-ellipse" : "shape";
    this.name = ellipse ? "Ellipse Tool" : "Rectangle Tool";
  }
  onPointerDown(e: ToolPointerEvent): void { this.start = e; }
  onPointerUp(e: ToolPointerEvent): void {
    if (!this.start) return;
    const start = this.start; this.start = null;
    const doc = useDocumentStore.getState().activeDocument();
    if (!doc || !getEngine()) return;
    const x = Math.min(start.doc.x, e.doc.x), y = Math.min(start.doc.y, e.doc.y);
    let w = Math.abs(e.doc.x - start.doc.x), h = Math.abs(e.doc.y - start.doc.y);
    if (e.shift) w = h = Math.max(w, h);
    if (w < 2 || h < 2) return;
    const id = useDocumentStore.getState().addLayer(doc.id, { name: this.ellipse ? "Ellipse" : "Rectangle", kind: "shape" });
    const surface = getEngine()?.getSurface(id);
    if (!surface) return;
    const fg = useColorStore.getState().foreground;
    surface.ctx.fillStyle = `rgba(${fg.r},${fg.g},${fg.b},${fg.a})`;
    surface.ctx.beginPath();
    if (this.ellipse) surface.ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else surface.ctx.rect(x, y, w, h);
    surface.ctx.fill();
    getEngine()?.markDirty(id);
    const after = getEngine()?.captureSnapshot(id);
    if (after) useHistoryStore.getState().push(doc.id, {
      label: this.ellipse ? "Draw Ellipse" : "Draw Rectangle",
      undo: () => { surface.ctx.clearRect(0, 0, surface.width, surface.height); getEngine()?.markDirty(id); },
      redo: () => getEngine()?.restoreSnapshot(id, after),
    });
  }
  cancel(): void { this.start = null; }
}
