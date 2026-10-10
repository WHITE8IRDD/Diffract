/** Clone stamp: Alt-click the source, then paint from that offset on the active layer. */
import type { Tool, ToolPointerEvent } from "./types";
import type { PixelSnapshot } from "@/engine/snapshot";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useUIStore } from "@/store/useUIStore";
import { clipToSelection, commitRegionEdit } from "./region";

export class CloneStampTool implements Tool {
  readonly id = "clone-stamp" as const;
  readonly name = "Clone Stamp Tool";
  readonly cursor = "crosshair";
  private source: { x: number; y: number } | null = null;
  private origin: { x: number; y: number } | null = null;
  private last: { x: number; y: number } | null = null;
  private before: PixelSnapshot | null = null;
  private sourceCanvas: HTMLCanvasElement | null = null;
  private layerId: string | null = null;
  private docId: string | null = null;
  private bounds: { x: number; y: number; w: number; h: number } | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    if (e.alt) { this.source = { ...e.doc }; return; }
    const doc = useDocumentStore.getState().activeDocument();
    const layer = doc?.layers.find(l => l.id === doc.activeLayerId);
    const surface = layer && getEngine()?.getSurface(layer.id);
    if (!doc || !layer || !surface || !this.source || layer.locked || !layer.visible) return;
    this.layerId = layer.id; this.docId = doc.id;
    this.before = getEngine()?.captureSnapshot(layer.id) ?? null;
    this.sourceCanvas = document.createElement("canvas");
    this.sourceCanvas.width = surface.width; this.sourceCanvas.height = surface.height;
    this.sourceCanvas.getContext("2d")?.drawImage(surface.canvas, 0, 0);
    this.origin = e.doc; this.last = e.doc; this.bounds = null;
    this.paint(e.doc);
  }
  onPointerMove(e: ToolPointerEvent): void {
    if (!this.origin || !this.last) return;
    const from = this.last;
    const distance = Math.hypot(e.doc.x - from.x, e.doc.y - from.y);
    const step = Math.max(1, useUIStore.getState().toolOptions.brush.size / 5);
    for (let n = 1; n <= Math.max(1, Math.ceil(distance / step)); n++) {
      const t = n / Math.max(1, Math.ceil(distance / step));
      this.paint({ x: from.x + (e.doc.x - from.x) * t, y: from.y + (e.doc.y - from.y) * t });
    }
    this.last = e.doc;
  }
  onPointerUp(): void {
    if (this.docId && this.layerId && this.before && this.bounds)
      commitRegionEdit(this.docId, this.layerId, this.before, this.bounds, "Clone Stamp");
    this.origin = null; this.last = null; this.before = null; this.sourceCanvas = null;
    this.bounds = null; this.layerId = null; this.docId = null;
  }
  cancel(): void {
    if (this.layerId && this.before) getEngine()?.restoreSnapshot(this.layerId, this.before);
    this.origin = null; this.last = null; this.before = null; this.sourceCanvas = null;
  }
  private paint(at: { x: number; y: number }): void {
    const surface = this.layerId && getEngine()?.getSurface(this.layerId);
    if (!surface || !this.origin || !this.source || !this.sourceCanvas || !this.docId) return;
    const size = useUIStore.getState().toolOptions.brush.size;
    const sx = this.source.x + at.x - this.origin.x, sy = this.source.y + at.y - this.origin.y;
    const radius = size / 2;
    const ctx = surface.ctx;
    ctx.save(); clipToSelection(ctx, this.docId, surface.width, surface.height);
    ctx.beginPath(); ctx.arc(at.x, at.y, radius, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = useUIStore.getState().toolOptions.brush.opacity;
    ctx.drawImage(this.sourceCanvas, at.x - sx, at.y - sy);
    ctx.restore();
    const x = Math.max(0, Math.floor(at.x - radius - 1)), y = Math.max(0, Math.floor(at.y - radius - 1));
    const right = Math.min(surface.width, Math.ceil(at.x + radius + 1)), bottom = Math.min(surface.height, Math.ceil(at.y + radius + 1));
    const b = this.bounds;
    this.bounds = b ? { x: Math.min(b.x, x), y: Math.min(b.y, y),
      w: Math.max(b.x + b.w, right) - Math.min(b.x, x), h: Math.max(b.y + b.h, bottom) - Math.min(b.y, y) } :
      { x, y, w: right - x, h: bottom - y };
    getEngine()?.markDirty(this.layerId!);
  }
}
