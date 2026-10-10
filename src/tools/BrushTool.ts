/**
 * Brush / Eraser tools (B / E).
 *
 * Full round-brush pipeline for Phase 1: size, hardness, opacity, flow and
 * spacing. Strokes are stamped into the active layer's raster surface and
 * coalesced into one history entry per stroke.
 */

import type { BrushToolOptions, Tool, ToolId, ToolPointerEvent } from "./types";
import { stampDab, strokePoints } from "./base";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useColorStore } from "@/store/useColorStore";
import { useUIStore } from "@/store/useUIStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import type { PixelSnapshot } from "@/engine/types";
import type { Point } from "@/utils/math";

export class BrushTool implements Tool {
  readonly id: ToolId;
  readonly name: string;
  readonly cursor = "crosshair";

  private readonly erase: boolean;
  private painting = false;
  private last: Point | null = null;
  private lastStamp: Point | null = null;
  private strokeBefore: PixelSnapshot | null = null;
  private strokeLayerId: string | null = null;

  constructor(id: ToolId = "brush", erase = false) {
    this.id = id;
    this.erase = erase;
    this.name = erase ? "Eraser Tool" : "Brush Tool";
  }

  private options(): BrushToolOptions {
    const ui = useUIStore.getState();
    return this.erase ? ui.toolOptions.eraser : ui.toolOptions.brush;
  }

  onPointerDown(e: ToolPointerEvent): void {
    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    if (!engine || !doc?.activeLayerId) return;
    const layerId = doc.activeLayerId;

    const layer = doc.layers.find((l) => l.id === layerId);
    if (layer?.locked || layer?.visible === false) return;

    this.painting = true;
    this.strokeLayerId = layerId;
    this.strokeBefore = engine.captureSnapshot(layerId);
    this.last = { x: e.doc.x, y: e.doc.y };
    this.lastStamp = null;

    this.stampTo({ x: e.doc.x, y: e.doc.y });
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (!this.painting || !this.last) return;
    const engine = getEngine();
    if (!engine) return;

    const from = this.last;
    const to = { x: e.doc.x, y: e.doc.y };
    const points = strokePoints(from, to, this.options(), this.lastStamp);
    for (const p of points) this.stampTo(p);
    this.last = to;
  }

  onPointerUp(): void {
    if (!this.painting) return;
    this.painting = false;
    this.last = null;
    this.lastStamp = null;

    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    const layerId = this.strokeLayerId;
    const before = this.strokeBefore;
    this.strokeLayerId = null;
    this.strokeBefore = null;

    if (!engine || !doc || !layerId || !before) return;

    const after = engine.captureSnapshot(layerId);
    if (!after) return;

    const label = this.erase ? "Eraser" : "Brush Stroke";
    useHistoryStore.getState().push(doc.id, {
      label,
      undo: () => engine.restoreSnapshot(layerId, before),
      redo: () => engine.restoreSnapshot(layerId, after),
    });
    useDocumentStore.getState().setDocumentDirty(doc.id, true);
  }

  cancel(): void {
    // Restore pre-stroke pixels on Escape mid-stroke.
    if (this.painting && this.strokeBefore && this.strokeLayerId) {
      getEngine()?.restoreSnapshot(this.strokeLayerId, this.strokeBefore);
    }
    this.painting = false;
    this.last = null;
    this.lastStamp = null;
    this.strokeBefore = null;
    this.strokeLayerId = null;
  }

  private stampTo(p: Point): void {
    const engine = getEngine();
    const surface = this.strokeLayerId ? engine?.getSurface(this.strokeLayerId) : null;
    if (!engine || !surface) return;
    const color = useColorStore.getState().foreground;
    stampDab(surface.ctx, p, this.options(), color, this.erase);
    this.lastStamp = p;
    engine.markDirty(surface.id);
  }
}
