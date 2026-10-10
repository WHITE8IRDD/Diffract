/**
 * Move tool (V) — drag the active layer's pixels around the canvas.
 *
 * Phase 1 moves the layer content by translating the sprite and committing a
 * pixel-space translation on pointer-up (so history restores exact pixels).
 * Snap-to-grid (Shift = constrain to axis) follows Photoshop's modifier
 * behaviour; grid snapping is wired for Phase 2's snap engine.
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
  private startPan: Point | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    if (!engine || !doc?.activeLayerId) return;
    this.dragging = true;
    this.origin = { x: e.doc.x, y: e.doc.y };
    this.startPan = engine.getPan();
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (!this.dragging || !this.origin || !this.startPan) return;
    let dx = e.doc.x - this.origin.x;
    let dy = e.doc.y - this.origin.y;
    if (e.shift) {
      // Constrain to the dominant axis (Photoshop behaviour).
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    if (!engine || !doc) return;
    // Live preview: pan the world so the layer appears to follow the cursor.
    // The final translation is committed to pixels on pointer-up.
    engine.setPan(
      this.startPan.x + dx * engine.getZoom(),
      this.startPan.y + dy * engine.getZoom(),
    );
  }

  onPointerUp(e: ToolPointerEvent): void {
    if (!this.dragging || !this.origin) return;
    this.dragging = false;

    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    if (!engine || !doc?.activeLayerId) return;

    let dx = e.doc.x - this.origin.x;
    let dy = e.doc.y - this.origin.y;
    if (e.shift) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    // Restore viewport, then commit the move to pixels.
    if (this.startPan) engine.setPan(this.startPan.x, this.startPan.y);
    this.origin = null;
    this.startPan = null;

    if (dx === 0 && dy === 0) return;

    const layerId = doc.activeLayerId;
    const before = engine.captureSnapshot(layerId);
    const surface = engine.getSurface(layerId);
    if (!before || !surface) return;

    // Shift content by dx/dy using a self-blit (rotate/transform in Phase 2).
    const copy = document.createElement("canvas");
    copy.width = surface.width;
    copy.height = surface.height;
    copy.getContext("2d")?.drawImage(surface.canvas, 0, 0);
    surface.ctx.clearRect(0, 0, surface.width, surface.height);
    surface.ctx.drawImage(copy, dx, dy);
    engine.markDirty(layerId);

    // Snapshot both ends of the command so undo/redo are exact restores.
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
    this.dragging = false;
    this.origin = null;
    this.startPan = null;
  }
}
