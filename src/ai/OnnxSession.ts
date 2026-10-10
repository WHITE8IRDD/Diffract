/**
 * ONNX Runtime Web session manager.
 *
 * Phase 1 ships the runtime scaffolding: lazy-loading `onnxruntime-web`
 * (installed in Phase 3), provider negotiation (WebGPU → WebGL → WASM) and a
 * download/checkpoint contract so every AI feature is a pure function of
 * (model, tensors) once the weights exist.
 *
 * Design rules
 * ------------
 * * **Offline-first**: nothing phones home; downloads are user-initiated.
 * * **GPU-first**: prefer the WebGPU EP, fall back transparently.
 * * **One session per model**, kept warm across invocations (idle RAM budget
 *   is protected by `releaseAll()` on document close).
 */

import { MODEL_ROOT, modelById, type ModelId, type ExecutionProvider } from "./ModelRegistry";

export interface SessionStatus {
  state: "absent" | "downloading" | "ready" | "error";
  /** 0..1 while downloading. */
  progress: number;
  provider: ExecutionProvider | null;
  error?: string;
}

type Listener = (status: SessionStatus) => void;

/** Minimal structural type for an ONNX InferenceSession (from onnxruntime-web). */
export interface OnnxInferenceSession {
  run(feeds: Record<string, unknown>): Promise<Record<string, { data: Float32Array }>>;
  release?(): Promise<void>;
}

interface SessionEntry {
  session: OnnxInferenceSession | null;
  status: SessionStatus;
  listeners: Set<Listener>;
}

/**
 * Session manager. Deliberately framework-free (no React imports) so the
 * Rust-side batch runner could reuse the same registry in Phase 4.
 */
export class OnnxRuntime {
  private entries = new Map<ModelId, SessionEntry>();

  private entry(id: ModelId): SessionEntry {
    let e = this.entries.get(id);
    if (!e) {
      e = {
        session: null,
        status: { state: "absent", progress: 0, provider: null },
        listeners: new Set(),
      };
      this.entries.set(id, e);
    }
    return e;
  }

  status(id: ModelId): SessionStatus {
    return this.entry(id).status;
  }

  subscribe(id: ModelId, listener: Listener): () => void {
    const e = this.entry(id);
    e.listeners.add(listener);
    return () => e.listeners.delete(listener);
  }

  /**
   * Ensure a model is downloaded and a session is warm.
   *
   * Phase 1: the plumbing is real but `loadSession` reports the model as
   * absent until `onnxruntime-web` is added in Phase 3 (kept out of the
   * installer on purpose — see ModelRegistry).
   */
  async ensure(id: ModelId): Promise<SessionStatus> {
    const manifest = modelById(id);
    const e = this.entry(id);
    if (e.status.state === "ready" && e.session) return e.status;

    this.update(id, { state: "downloading", progress: 0, provider: null });

    try {
      // Download checkpoint into the app model cache (models/ in dev).
      const response = await fetch(MODEL_ROOT + manifest.url);
      if (!response.ok) {
        throw new Error(
          `Model not present locally (HTTP ${response.status}). ` +
            `Download ${manifest.name} from Settings ▸ AI Models.`,
        );
      }
      // Phase 3 wires onnxruntime-web `InferenceSession.create` here with
      // provider negotiation: webgpu → webgl → wasm.
      void response;
      throw new Error("ONNX runtime not installed in this phase — see Phase 3 plan.");
    } catch (err) {
      const status: SessionStatus = {
        state: "error",
        progress: 0,
        provider: null,
        error: err instanceof Error ? err.message : String(err),
      };
      this.update(id, status);
      return status;
    }
  }

  /** Free every warm session (document close / memory pressure). */
  async releaseAll(): Promise<void> {
    for (const e of this.entries.values()) {
      await e.session?.release?.();
      e.session = null;
      e.status = { state: "absent", progress: 0, provider: null };
    }
    this.entries.clear();
  }

  private update(id: ModelId, status: SessionStatus): void {
    const e = this.entry(id);
    e.status = status;
    for (const l of e.listeners) l(status);
  }
}

/** App-wide runtime singleton. */
export const onnxRuntime = new OnnxRuntime();
