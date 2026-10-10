/**
 * AI public API — local, free, offline. See `ModelRegistry` for the roadmap.
 */

export { MODELS, MODEL_ROOT, modelById } from "./ModelRegistry";
export type { ModelId, ModelManifest, ExecutionProvider } from "./ModelRegistry";
export { onnxRuntime, OnnxRuntime } from "./OnnxSession";
export type { SessionStatus, OnnxInferenceSession } from "./OnnxSession";
