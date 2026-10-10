/**
 * Paint Bucket (G) and Gradient (G) tools.
 *
 * Both edit the active layer inside the selection (or the whole layer) and
 * record a region-sized history entry.
 */

import type { Tool, ToolPointerEvent } from "./types";
import type { PixelRect, PixelSnapshot } from "@/engine/snapshot";
import { clipRect } from "@/engine/snapshot";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useColorStore } from "@/store/useColorStore";
import { useUIStore } from "@/store/useUIStore";
import { selectionFor } from "@/store/useSelectionStore";
import { clipToSelection, commitRegionEdit } from "./region";

export class PaintBucketTool implements Tool {
  readonly id = "paint-bucket" as const;
  readonly name = "Paint Bucket Tool";
  readonly cursor = "crosshair";

  onPointerDown(e: ToolPointerEvent): void {
    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    if (!engine || !doc?.activeLayerId) return;
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!layer || layer.locked || !layer.visible) return;
    const surface = engine.getSurface(layer.id);
    if (!surface) return;

    const seedX = Math.floor(e.doc.x);
    const seedY = Math.floor(e.doc.y);
    if (seedX < 0 || seedY < 0 || seedX >= surface.width || seedY >= surface.height) return;

    const before = engine.captureSnapshot(layer.id);
    if (!before) return;
    const data = new Uint8ClampedArray(before.imageData.data);
    const tolerance = useUIStore.getState().toolOptions.magicWand.tolerance;
    const contiguous = useUIStore.getState().toolOptions.magicWand.contiguous;
    const sel = selectionFor(doc.id) ?? { x: 0, y: 0, w: surface.width, h: surface.height };
    const area = clipRect(sel, surface.width, surface.height);
    const fg = useColorStore.getState().foreground;
    const fill: [number, number, number, number] = [
      Math.round(fg.r),
      Math.round(fg.g),
      Math.round(fg.b),
      Math.round(fg.a * 255),
    ];

    const bounds = floodFill({
      data,
      width: surface.width,
      height: surface.height,
      seedX,
      seedY,
      tolerance,
      contiguous,
      area,
      fill,
    });
    if (!bounds) return;

    surface.ctx.putImageData(new ImageData(data, surface.width, surface.height), 0, 0);
    engine.markDirty(layer.id);
    commitRegionEdit(doc.id, layer.id, before, bounds, "Paint Bucket");
  }
}

interface FloodArgs {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  seedX: number;
  seedY: number;
  tolerance: number;
  contiguous: boolean;
  area: PixelRect;
  fill: [number, number, number, number];
}

/**
 * Fill pixels matching the seed colour (within `tolerance` per channel).
 * Returns the bounding box of the changed pixels, or null if nothing changed.
 */
export function floodFill(a: FloodArgs): PixelRect | null {
  const { data, width, height, seedX, seedY, tolerance, contiguous, area, fill } = a;
  const seed = (seedY * width + seedX) * 4;
  const target = [data[seed]!, data[seed + 1]!, data[seed + 2]!, data[seed + 3]!];
  const inArea = (x: number, y: number) =>
    x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h;
  if (!inArea(seedX, seedY)) return null;

  const matches = (i: number) =>
    Math.abs(data[i]! - target[0]!) <= tolerance &&
    Math.abs(data[i + 1]! - target[1]!) <= tolerance &&
    Math.abs(data[i + 2]! - target[2]!) <= tolerance &&
    Math.abs(data[i + 3]! - target[3]!) <= tolerance;

  const visited = new Uint8Array(width * height);
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  const paint = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  if (contiguous) {
    const stack: number[] = [seedY * width + seedX];
    while (stack.length) {
      const p = stack.pop()!;
      if (visited[p]) continue;
      const x = p % width;
      const y = (p - x) / width;
      if (!inArea(x, y)) continue;
      const i = p * 4;
      if (!matches(i)) continue;
      visited[p] = 1;
      paint(x, y);
      if (x > 0) stack.push(p - 1);
      if (x < width - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - width);
      if (y < height - 1) stack.push(p + width);
    }
  } else {
    for (let y = area.y; y < area.y + area.h; y++) {
      for (let x = area.x; x < area.x + area.w; x++) {
        if (matches((y * width + x) * 4)) paint(x, y);
      }
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export class GradientTool implements Tool {
  readonly id = "gradient" as const;
  readonly name = "Gradient Tool";
  readonly cursor = "crosshair";

  private start: { x: number; y: number } | null = null;
  private layerId: string | null = null;
  private docId: string | null = null;
  private before: PixelSnapshot | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    const engine = getEngine();
    const doc = useDocumentStore.getState().activeDocument();
    if (!engine || !doc?.activeLayerId) return;
    const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!layer || layer.locked || !layer.visible) return;
    this.before = engine.captureSnapshot(layer.id);
    if (!this.before) return;
    this.start = { x: e.doc.x, y: e.doc.y };
    this.layerId = layer.id;
    this.docId = doc.id;
  }

  onPointerUp(e: ToolPointerEvent): void {
    const start = this.start;
    const layerId = this.layerId;
    const docId = this.docId;
    const before = this.before;
    this.start = null;
    this.layerId = null;
    this.docId = null;
    this.before = null;
    if (!start || !layerId || !docId || !before) return;

    const dx = e.doc.x - start.x;
    const dy = e.doc.y - start.y;
    if (Math.hypot(dx, dy) < 1) return;

    const engine = getEngine();
    const surface = engine?.getSurface(layerId);
    if (!engine || !surface) return;

    const colors = useColorStore.getState();
    const fg = colors.foreground;
    const bg = colors.background;
    const ctx = surface.ctx;
    const grad = ctx.createLinearGradient(start.x, start.y, e.doc.x, e.doc.y);
    grad.addColorStop(0, `rgba(${fg.r},${fg.g},${fg.b},${fg.a})`);
    grad.addColorStop(1, `rgba(${bg.r},${bg.g},${bg.b},${bg.a})`);

    ctx.save();
    clipToSelection(ctx, docId, surface.width, surface.height);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, surface.width, surface.height);
    ctx.restore();

    const sel = selectionFor(docId) ?? { x: 0, y: 0, w: surface.width, h: surface.height };
    engine.markDirty(layerId);
    commitRegionEdit(docId, layerId, before, clipRect(sel, surface.width, surface.height), "Gradient");
  }

  cancel(): void {
    this.start = null;
    this.layerId = null;
    this.docId = null;
    this.before = null;
  }
}
