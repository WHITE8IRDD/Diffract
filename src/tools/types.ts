/**
 * Tool system types.
 *
 * A tool owns pointer interaction inside the canvas viewport and may render
 * transient overlays (selection marching-ants, brush cursor outline, …).
 * Tools never mutate the document directly — they dispatch commands through
 * the document store so every change is recorded in history.
 */

import type { Point } from "@/utils/math";

/**
 * All tools with a stable id. Phase 1 core tools are fully implemented;
 * the remaining ids are registered from the start so menus and the keyboard
 * map stay complete while their interactions land per the phase plan.
 */
export type ToolId =
  // Phase 1 — core tools
  | "move"
  | "marquee-rect"
  | "marquee-ellipse"
  | "lasso"
  | "polygon-lasso"
  | "brush"
  | "eraser"
  | "paint-bucket"
  | "gradient"
  | "crop"
  | "eyedropper"
  | "text"
  | "zoom"
  | "hand"
  // Phase 2 — advanced selection / retouching
  | "magic-wand"
  | "quick-selection"
  | "healing"
  | "clone-stamp"
  | "patch"
  | "red-eye"
  | "history-brush"
  | "dodge"
  | "burn"
  | "sponge"
  // Phase 4 — vector
  | "pen"
  | "path-select"
  | "shape";

/** Coalesced pointer sample delivered to tools. */
export interface ToolPointerEvent {
  /** Position in document coordinates (unaffected by pan/zoom). */
  doc: Point;
  /** Position in viewport CSS pixels. */
  view: Point;
  pressure: number;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  button: number;
}

export interface ToolKeyEvent {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  /** Return `true` to consume the event. */
  preventDefault: () => void;
}

/**
 * Tool contract. Methods are optional — a tool implements only what it needs.
 * `cursor` is the CSS cursor shown while the tool is active.
 */
export interface Tool {
  readonly id: ToolId;
  readonly name: string;
  readonly cursor: string | null;

  onActivate?(): void;
  onDeactivate?(): void;
  onPointerDown?(e: ToolPointerEvent): void;
  onPointerMove?(e: ToolPointerEvent): void;
  onPointerUp?(e: ToolPointerEvent): void;
  onDoubleClick?(e: ToolPointerEvent): void;
  onKeyDown?(e: ToolKeyEvent): void;
  onKeyUp?(e: ToolKeyEvent): void;
  /** Escape / tool-switch cancellation. */
  cancel?(): void;
}

/** Per-tool options persisted in the UI store. */
export interface BrushToolOptions {
  size: number; // px diameter
  hardness: number; // 0..1
  opacity: number; // 0..1
  flow: number; // 0..1
  spacing: number; // 0..1 (fraction of size between stamps)
}

export interface GradientToolOptions {
  kind: "linear" | "radial" | "angle";
}

export interface CropToolOptions {
  /** Free-form or locked ratio, e.g. 1.777… for 16:9. */
  aspect: number | null;
}

export interface MagicWandOptions {
  tolerance: number;
  contiguous: boolean;
}

export interface ToolOptions {
  brush: BrushToolOptions;
  eraser: BrushToolOptions;
  gradient: GradientToolOptions;
  crop: CropToolOptions;
  magicWand: MagicWandOptions;
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  brush: { size: 24, hardness: 0.8, opacity: 1, flow: 1, spacing: 0.1 },
  eraser: { size: 40, hardness: 0.8, opacity: 1, flow: 1, spacing: 0.1 },
  gradient: { kind: "linear" },
  crop: { aspect: null },
  magicWand: { tolerance: 32, contiguous: true },
};
