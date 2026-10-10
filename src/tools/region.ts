/**
 * Shared helpers for region-sized pixel edits.
 *
 * Every raster tool follows the same pattern: capture the layer before the
 * edit, change pixels, then record a history entry that stores only the
 * changed rectangle. These helpers keep that logic in one place.
 */

import type { PixelRect, PixelSnapshot } from "@/engine/snapshot";
import { clipRect, sliceSnapshot } from "@/engine/snapshot";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { selectionFor } from "@/store/useSelectionStore";

/** The active document id, or null. */
export function activeDocId(): string | null {
  return useDocumentStore.getState().activeDocumentId;
}

/** Clip a 2D context to the selection rectangle (caller must save/restore). */
export function clipToSelection(ctx: CanvasRenderingContext2D, docId: string, width: number, height: number): void {
  const sel = selectionFor(docId);
  if (!sel) return;
  const r = clipRect(sel, width, height);
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
}

/**
 * Record a finished edit on `layerId`. `before` is a full-layer capture taken
 * before the edit; `bounds` is the area that changed. Only that area is kept.
 */
export function commitRegionEdit(
  docId: string,
  layerId: string,
  before: PixelSnapshot,
  bounds: PixelRect,
  label: string,
): void {
  const engine = getEngine();
  if (!engine) return;
  const beforeSlice = sliceSnapshot(before, bounds);
  const after = engine.captureSnapshot(layerId, bounds);
  if (!beforeSlice || !after) return;
  useHistoryStore.getState().push(docId, {
    label,
    undo: () => engine.restoreSnapshot(layerId, beforeSlice),
    redo: () => engine.restoreSnapshot(layerId, after),
  });
  useDocumentStore.getState().setDocumentDirty(docId, true);
}
