/**
 * Shared tool utilities: brush dab stamping and stroke sampling.
 */

import type { RasterSurface } from "@/engine/types";
import type { BrushToolOptions } from "./types";
import { clamp, distance, type Point } from "@/utils/math";

/**
 * Stamp one soft round dab.
 *
 * `hardness` blends a solid core with a radial falloff — same model as
 * Photoshop's round brush. Alpha combines `opacity` (stroke-level) and
 * `flow` (per-dab), which is what makes built-up strokes behave naturally.
 */
export function stampDab(
  ctx: CanvasRenderingContext2D,
  at: Point,
  opts: BrushToolOptions,
  color: { r: number; g: number; b: number; a: number },
  erase = false,
): void {
  const radius = Math.max(0.5, opts.size / 2);
  const hardness = clamp(opts.hardness, 0, 1);
  const flow = clamp(opts.flow, 0, 1);

  const gradient = ctx.createRadialGradient(at.x, at.y, radius * hardness, at.x, at.y, radius);
  const rgb = `${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}`;
  if (hardness >= 0.999) {
    gradient.addColorStop(0, `rgba(${rgb}, ${flow * color.a})`);
    gradient.addColorStop(1, `rgba(${rgb}, ${flow * color.a})`);
  } else {
    gradient.addColorStop(0, `rgba(${rgb}, ${flow * color.a})`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  }

  ctx.save();
  if (erase) {
    // Eraser removes pixels; `destination-out` with the same falloff.
    ctx.globalCompositeOperation = "destination-out";
    const g2 = ctx.createRadialGradient(at.x, at.y, radius * hardness, at.x, at.y, radius);
    g2.addColorStop(0, `rgba(0,0,0,${flow})`);
    g2.addColorStop(hardness >= 0.999 ? 0.999 : 1, `rgba(0,0,0,0)`);
    ctx.fillStyle = g2;
    ctx.fillRect(at.x - radius, at.y - radius, radius * 2, radius * 2);
    ctx.restore();
    return;
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(at.x - radius, at.y - radius, radius * 2, radius * 2);
  ctx.restore();
}

/**
 * Interpolate stamp positions between two pointer samples honouring
 * `spacing` (fraction of brush size). Returns points after `from`.
 */
export function strokePoints(
  from: Point,
  to: Point,
  opts: BrushToolOptions,
  lastStamp: Point | null,
): Point[] {
  const spacingPx = Math.max(1, opts.size * clamp(opts.spacing, 0.01, 1));
  const dist = distance(from, to);
  if (dist === 0) return lastStamp ? [] : [to];

  const out: Point[] = [];
  if (!lastStamp) out.push(from);

  let travelled = lastStamp ? distance(lastStamp, from) : 0;
  while (travelled + spacingPx <= dist) {
    travelled += spacingPx;
    const t = travelled / dist;
    out.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return out;
}

/** Number of opaque pixels under a surface — cheap thumbnail/statistics helper. */
export function surfaceBounds(surface: RasterSurface): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return { x: 0, y: 0, w: surface.width, h: surface.height };
}
