/**
 * Blend modes.
 *
 * The subset required by Phase 1 (Normal + the 8 Photoshop modes listed in
 * the spec). The identifiers map 1:1 onto the Canvas2D/PixiJS
 * `globalCompositeOperation` names so the CPU compositor and the WebGPU
 * compositor agree. Phase 2 extends this table with the full Photoshop set
 * (matching PhotoCraft's `BlendMode` enum: PassThrough, Dissolve, Linear
 * Burn/Dodge, Vivid/Linear/Pin Light, Hard Mix, Exclusion, Subtract, Divide,
 * Hue, Saturation, Color, Luminosity, …).
 */

export type BlendModeId =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "color-dodge"
  | "color-burn"
  | "difference";

export interface BlendModeInfo {
  id: BlendModeId;
  label: string;
  /** CSS `mix-blend-mode` / canvas `globalCompositeOperation` name. */
  cssName: string;
}

export const BLEND_MODES: BlendModeInfo[] = [
  { id: "normal", label: "Normal", cssName: "normal" },
  { id: "multiply", label: "Multiply", cssName: "multiply" },
  { id: "screen", label: "Screen", cssName: "screen" },
  { id: "overlay", label: "Overlay", cssName: "overlay" },
  { id: "soft-light", label: "Soft Light", cssName: "soft-light" },
  { id: "hard-light", label: "Hard Light", cssName: "hard-light" },
  { id: "color-dodge", label: "Color Dodge", cssName: "color-dodge" },
  { id: "color-burn", label: "Color Burn", cssName: "color-burn" },
  { id: "difference", label: "Difference", cssName: "difference" },
];

export const blendModeLabel = (id: BlendModeId): string =>
  BLEND_MODES.find((m) => m.id === id)?.label ?? "Normal";
