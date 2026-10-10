/**
 * AI model registry — declares every local model Diffract can run.
 *
 * Models are **never bundled** with the installer (install budget: < 150 MB).
 * They are downloaded on first use into the app data dir and executed fully
 * offline via ONNX Runtime Web with the WebGPU execution provider (WebGL
 * fallback). This mirrors the Phase 3 plan: BiRefNet, SAM, SD-inpainting,
 * Real-ESRGAN, style transfer and sky replacement.
 */

export type ModelId =
  | "birefnet-matting"
  | "sam-vit-b"
  | "sd15-inpaint"
  | "realesrgan-x4"
  | "style-transfer-small"
  | "sky-segmentation";

export type ExecutionProvider = "webgpu" | "webgl" | "wasm";

export interface ModelManifest {
  id: ModelId;
  name: string;
  /** Human description shown in the AI panel. */
  description: string;
  /** Phase in which the model becomes user-visible. */
  phase: 2 | 3 | 4;
  /** Approx download size (MB) — shown in the download dialog. */
  downloadMB: number;
  /** Preferred ONNX Runtime execution providers, in order. */
  providers: ExecutionProvider[];
  /** Relative URL of the .onnx asset (resolved against the models root). */
  url: string;
  /** Input tensor spec (NCHW, float32) for the default variant. */
  input: { width: number; height: number };
}

export const MODEL_ROOT = "/models/";

export const MODELS: Record<ModelId, ModelManifest> = {
  "birefnet-matting": {
    id: "birefnet-matting",
    name: "BiRefNet (Background Removal)",
    description:
      "High-resolution dichotomous image matting — one-click background removal.",
    phase: 3,
    downloadMB: 82,
    providers: ["webgpu", "webgl"],
    url: "birefnet-matting.onnx",
    input: { width: 1024, height: 1024 },
  },
  "sam-vit-b": {
    id: "sam-vit-b",
    name: "Segment Anything (ViT-B)",
    description:
      "Promptable segmentation — click an object to select it, or Select Subject.",
    phase: 3,
    downloadMB: 180,
    providers: ["webgpu", "webgl"],
    url: "sam-vit-b-encoder.onnx",
    input: { width: 1024, height: 1024 },
  },
  "sd15-inpaint": {
    id: "sd15-inpaint",
    name: "Stable Diffusion 1.5 Inpainting",
    description:
      "Local generative fill — paint a mask, type a prompt, get a seamless fill.",
    phase: 3,
    downloadMB: 1700,
    providers: ["webgpu", "wasm"],
    url: "sd15-inpaint.onnx",
    input: { width: 512, height: 512 },
  },
  "realesrgan-x4": {
    id: "realesrgan-x4",
    name: "Real-ESRGAN ×4",
    description: "Detail-preserving 2×/4× upscaling for photos and artwork.",
    phase: 3,
    downloadMB: 67,
    providers: ["webgpu", "webgl"],
    url: "realesrgan-x4.onnx",
    input: { width: 256, height: 256 },
  },
  "style-transfer-small": {
    id: "style-transfer-small",
    name: "Artistic Style Transfer",
    description: "Apply painterly styles to the image or a selection.",
    phase: 3,
    downloadMB: 24,
    providers: ["webgpu", "webgl"],
    url: "style-transfer.onnx",
    input: { width: 384, height: 384 },
  },
  "sky-segmentation": {
    id: "sky-segmentation",
    name: "Sky Segmentation",
    description: "Detect the sky region for one-click sky replacement.",
    phase: 3,
    downloadMB: 45,
    providers: ["webgpu", "webgl"],
    url: "sky-seg.onnx",
    input: { width: 512, height: 512 },
  },
};

export const modelById = (id: ModelId): ModelManifest => MODELS[id];
