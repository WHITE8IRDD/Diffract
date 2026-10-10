/**
 * Small math helpers shared by the engine, tools and UI.
 */

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Round to `decimals` places without float noise (0.1 + 0.2 → 0.3). */
export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Document-space point. */
export interface Point {
  x: number;
  y: number;
}

export const distance = (a: Point, b: Point): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

/** Snap a value to the nearest multiple of `step`. */
export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** True when `value` is a finite number. */
export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
