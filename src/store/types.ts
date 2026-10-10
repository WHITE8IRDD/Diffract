/**
 * Shared document model types (serializable state).
 *
 * Pixels live in the PixiJS engine (`RasterSurface` handles); this module
 * holds everything the UI needs to render panels, menus and the status bar.
 * The model mirrors PhotoCraft's `Layer` / `LayerContent` design: one generic
 * Layer with a discriminated `kind`, so adjustment layers, masks and groups
 * slot in without schema churn (Phase 2).
 */

import type { BlendModeId } from "@/utils/blendModes";

export type ColorMode = "rgb" | "grayscale" | "cmyk";
export type LayerKind = "raster" | "adjustment" | "text" | "shape" | "group";

/** Black/white layer mask (Phase 1: basic channel; refine in Phase 2). */
export interface LayerMask {
  /** Mask id so the engine can address the mask texture. */
  id: string;
  enabled: boolean;
  /** True when the mask is being edited instead of the pixels. */
  linked: boolean;
}

export interface LayerState {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  /** Pixel lock (Phase 1: single toggle; PhotoCraft-style granular locks in Phase 4). */
  locked: boolean;
  opacity: number; // 0..1
  fillOpacity: number; // 0..1 (content only, not effects)
  blendMode: BlendModeId;
  /** Clipping mask: layer clipped to the layer below. */
  clipped: boolean;
  mask: LayerMask | null;
  /** Nesting depth for groups (0 = root). */
  depth: number;
  /** Group membership. */
  parentId: string | null;
}

export interface DocumentState {
  id: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: ColorMode;
  layers: LayerState[];
  /** Top-most selected layer (Photoshop activates one layer at a time in Phase 1). */
  activeLayerId: string | null;
  /** File path on disk once saved (Tauri only). */
  filePath: string | null;
  /** Dirty flag — true when unsaved changes exist. */
  dirty: boolean;
  /** View state is per-document so tabs keep their own pan/zoom. */
  view: ViewState;
}

export interface ViewState {
  zoom: number; // 1 = 100%
  /** Pan offset in CSS pixels. */
  panX: number;
  panY: number;
  showGrid: boolean;
  showRulers: boolean;
}

export interface NewDocumentOptions {
  name: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: ColorMode;
  /** Fill of the initial background layer. */
  background: "white" | "transparent";
  /** Optional RGBA8 pixels (opened images) written into the background layer. */
  pixels?: Uint8ClampedArray<ArrayBuffer>;
}

export const DEFAULT_VIEW: ViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: false,
  showRulers: true,
};

export const defaultLayer = (
  id: string,
  name: string,
  overrides: Partial<LayerState> = {},
): LayerState => ({
  id,
  name,
  kind: "raster",
  visible: true,
  locked: false,
  opacity: 1,
  fillOpacity: 1,
  blendMode: "normal",
  clipped: false,
  mask: null,
  depth: 0,
  parentId: null,
  ...overrides,
});
