/**
 * Pixel snapshots for history entries.
 *
 * A snapshot stores only a rectangle of a layer's pixels (plus its origin),
 * so a small brush stroke costs a few KB of history instead of a full layer
 * copy. Kept free of PixiJS imports so tools can use it directly.
 */

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PixelSnapshot {
  /** Top-left of `imageData` in document pixels. */
  x: number;
  y: number;
  imageData: ImageData;
}

/** Clip a rect to `[0, width) × [0, height)`. Returns `w,h ≤ 0` if empty. */
export function clipRect(rect: PixelRect, width: number, height: number): PixelRect {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(width, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(height, Math.ceil(rect.y + rect.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Grow a rect to include a point (used to track a stroke's bounds). */
export function expandRect(rect: PixelRect | null, px: number, py: number, pad: number): PixelRect {
  const x0 = px - pad;
  const y0 = py - pad;
  const x1 = px + pad;
  const y1 = py + pad;
  if (!rect) return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const nx0 = Math.min(rect.x, x0);
  const ny0 = Math.min(rect.y, y0);
  const nx1 = Math.max(rect.x + rect.w, x1);
  const ny1 = Math.max(rect.y + rect.h, y1);
  return { x: nx0, y: ny0, w: nx1 - nx0, h: ny1 - ny0 };
}

/**
 * Cut the part of `snap` that lies inside `rect` into its own snapshot.
 * Used to shrink a full-layer "before" capture down to the stroke bounds.
 */
export function sliceSnapshot(snap: PixelSnapshot, rect: PixelRect): PixelSnapshot | null {
  const sw = snap.imageData.width;
  const sh = snap.imageData.height;
  const ix0 = Math.max(rect.x, snap.x);
  const iy0 = Math.max(rect.y, snap.y);
  const ix1 = Math.min(rect.x + rect.w, snap.x + sw);
  const iy1 = Math.min(rect.y + rect.h, snap.y + sh);
  const w = ix1 - ix0;
  const h = iy1 - iy0;
  if (w <= 0 || h <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  // putImageData writes raw pixels at the offset; parts outside are clipped.
  ctx.putImageData(snap.imageData, snap.x - ix0, snap.y - iy0);
  return { x: ix0, y: iy0, imageData: ctx.getImageData(0, 0, w, h) };
}
