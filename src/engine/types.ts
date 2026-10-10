/**
 * Engine-side types. Pixel data lives here (never in the Zustand stores).
 */

import type * as PIXI from "pixi.js";

/**
 * A raster surface owned by the engine: an offscreen 2D canvas of document
 * dimensions plus its Pixi texture. Tools paint into `ctx`; the engine
 * re-uploads on `markDirty()`.
 *
 * Tile-based rendering (Phase 2 optimization target) swaps the single canvas
 * for 256×256 tiles behind this same interface.
 */
export interface RasterSurface {
  id: string;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: PIXI.Texture;
  sprite: PIXI.Sprite;
  /** Set when pixels changed and the texture must re-upload. */
  dirty: boolean;
  /** Optional grayscale mask surface (white = reveal). */
  mask: MaskSurface | null;
}

export interface MaskSurface {
  id: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: PIXI.Texture;
  sprite: PIXI.Sprite;
  dirty: boolean;
}

/** Snapshot of a surface's pixels, used by history entries. */
export interface PixelSnapshot {
  imageData: ImageData;
}
