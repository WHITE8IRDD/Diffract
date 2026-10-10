/**
 * Move tool (V) — drag the active layer's pixels around the canvas.
 *
 * While dragging, only the active layer is visually offset (the view and the
 * other layers stay still). On release the offset is committed to pixels, so
 * history restores exact pixels. Shift constrains the drag to one axis.
 */

import type { Tool, ToolPointerEvent } from "./types";
import type { Point } from "@/utils/math";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useHistoryStore } from "@/store/useHistoryStore";

export class MoveTool implements Tool {
  readonly id = "move" as const;
  readonly name = "Move Tool";
  readonly cursor = "move";

  private dragging = false;
  private origin: Point | null = null;
  private layerId: string | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    const doc = useDocumentStore.getState().activeDocument();
    if (!getEngine() || !doc?.activeLayerId) return;
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (layer?.locked) return;
    this.dragging = true;
    this.origin = { x: e.doc.x, y: e.doc.y };
    this.layerId = doc.activeLayerId;
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (!this.dragging || !this.origin || !this.layerId) return;
    const engine = getEngine();
    if (!engine) return;
    const { dx, dy } = this.delta(e);
    // Live preview: offset just this layer in document space (no pixel work).
    engine.setLayerOffset(this.layerId, dx, dy);
  }

  onPointerUp(e: ToolPointerEvent): void {
    if (!this.dragging || !this.origin || !this.layerId) return;
    // Compute the delta before clearing the drag origin it depends on.
    const { dx, dy } = this.delta(e);
    this.dragging = false;
    const layerId = this.layerId;
    this.origin = null;
    this.layerId = null;

    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    if (!engine || !doc) return;

    engine.setLayerOffset(layerId, 0, 0);
    if (dx === 0 && dy === 0) return;

    const before = engine.captureSnapshot(layerId);
    const surface = engine.getSurface(layerId);
    if (!before || !surface) return;

    // Shift the pixels: copy out, clear, draw back at the new position.
    const copy = document.createElement("canvas");
    copy.width = surface.width;
    copy.height = surface.height;
    copy.getContext("2d")?.drawImage(surface.canvas, 0, 0);
    surface.ctx.clearRect(0, 0, surface.width, surface.height);
    surface.ctx.drawImage(copy, dx, dy);
    engine.markDirty(layerId);

    // Snapshot both ends so undo/redo are exact restores.
    const after = engine.captureSnapshot(layerId);
    if (!after) return;

    useHistoryStore.getState().push(doc.id, {
      label: "Move Layer",
      undo: () => engine.restoreSnapshot(layerId, before),
      redo: () => engine.restoreSnapshot(layerId, after),
    });
    useDocumentStore.getState().setDocumentDirty(doc.id, true);
  }

  cancel(): void {
    if (this.layerId) getEngine()?.setLayerOffset(this.layerId, 0, 0);
    this.dragging = false;
    this.origin = null;
    this.layerId = null;
  }

  /** Drag delta in document pixels, constrained to one axis with Shift. */
  private delta(e: ToolPointerEvent): { dx: number; dy: number } {
    let dx = e.doc.x - (this.origin?.x ?? e.doc.x);
    let dy = e.doc.y - (this.origin?.y ?? e.doc.y);
    if (e.shift) {
      // Constrain to the dominant axis (Photoshop behaviour).
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    return { dx: Math.round(dx), dy: Math.round(dy) };
  }
}
