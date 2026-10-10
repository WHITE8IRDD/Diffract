/**
 * Document store — open documents (tabs) and their layer stacks.
 *
 * Responsibilities
 * ---------------
 * * Owns all serializable document state (PhotoCraft's `Document`/`Layer`
 *   model, reduced to the Phase 1 schema in `./types`).
 * * Every mutation is an undoable command recorded in `useHistoryStore`.
 *   Undo/redo closures capture the previous values and re-apply them without
 *   re-recording (see `applyLayerMeta`).
 * * Pixels are NOT stored here — the PixiJS engine owns raster surfaces and
 *   is addressed by layer id.
 */

import { create } from "zustand";
import {
  defaultLayer,
  DEFAULT_VIEW,
  type DocumentState,
  type LayerState,
  type NewDocumentOptions,
} from "./types";
import { useHistoryStore } from "./useHistoryStore";
import { freshId } from "@/utils/ids";
import { getEngine } from "@/engine/registry";
import type { BlendModeId } from "@/utils/blendModes";

interface DocumentStore {
  documents: DocumentState[];
  activeDocumentId: string | null;

  // ── Documents ─────────────────────────────────────────────────────────
  activeDocument: () => DocumentState | null;
  createDocument: (opts: NewDocumentOptions) => string;
  closeDocument: (docId: string) => void;
  setActiveDocument: (docId: string) => void;
  renameDocument: (docId: string, name: string) => void;
  markSaved: (docId: string, filePath: string | null) => void;
  setDocumentDirty: (docId: string, dirty: boolean) => void;

  // ── View (per document) ───────────────────────────────────────────────
  setView: (docId: string, patch: Partial<DocumentState["view"]>) => void;

  // ── Layers ────────────────────────────────────────────────────────────
  activeLayer: () => LayerState | null;
  addLayer: (docId: string, patch?: Partial<LayerState>) => string;
  deleteLayer: (docId: string, layerId: string) => void;
  duplicateLayer: (docId: string, layerId: string) => void;
  renameLayer: (docId: string, layerId: string, name: string) => void;
  reorderLayer: (docId: string, layerId: string, toIndex: number) => void;
  setLayerMeta: (
    docId: string,
    layerId: string,
    patch: Partial<
      Pick<
        LayerState,
        "visible" | "locked" | "opacity" | "fillOpacity" | "blendMode" | "clipped"
      >
    >,
  ) => void;
  setActiveLayer: (docId: string, layerId: string) => void;
  addLayerMask: (docId: string, layerId: string) => void;
  deleteLayerMask: (docId: string, layerId: string) => void;
}

/** Internal: mutate layer metadata without recording history. */
function applyLayerMeta(
  docId: string,
  layerId: string,
  patch: Partial<LayerState>,
) {
  useDocumentStore.setState((s) => ({
    documents: s.documents.map((d) =>
      d.id !== docId
        ? d
        : {
            ...d,
            layers: d.layers.map((l) =>
              l.id !== layerId ? l : { ...l, ...patch },
            ),
          },
    ),
  }));
  // Structural changes invalidate the compositor pass.
  getEngine()?.requestRender();
}

/** Internal: replace the layer list without recording history. */
function applyLayers(docId: string, layers: LayerState[], activeLayerId: string | null) {
  useDocumentStore.setState((s) => ({
    documents: s.documents.map((d) =>
      d.id !== docId ? d : { ...d, layers, activeLayerId },
    ),
  }));
  getEngine()?.requestRender();
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  activeDocumentId: null,

  activeDocument: () => {
    const s = get();
    return s.documents.find((d) => d.id === s.activeDocumentId) ?? null;
  },

  createDocument: (opts) => {
    const docId = freshId("doc");
    const bgId = freshId("layer");
    const doc: DocumentState = {
      id: docId,
      name: opts.name,
      width: Math.round(opts.width),
      height: Math.round(opts.height),
      dpi: opts.dpi,
      colorMode: opts.colorMode,
      layers: [
        defaultLayer(
          bgId,
          opts.background === "white" ? "Background" : "Layer 1",
          opts.background === "white" ? { locked: false } : {},
        ),
      ],
      activeLayerId: bgId,
      filePath: null,
      dirty: false,
      view: { ...DEFAULT_VIEW },
    };
    set((s) => ({
      documents: [...s.documents, doc],
      activeDocumentId: docId,
    }));
    // Seed the raster surface in the engine (white or transparent).
    getEngine()?.createLayerSurface(doc, bgId, opts.background);
    useHistoryStore.getState().push(docId, {
      label: "New Document",
      undo: () => {},
      redo: () => {},
    });
    return docId;
  },

  closeDocument: (docId) => {
    getEngine()?.destroyDocument(docId);
    set((s) => {
      const documents = s.documents.filter((d) => d.id !== docId);
      return {
        documents,
        activeDocumentId:
          s.activeDocumentId === docId
            ? (documents[documents.length - 1]?.id ?? null)
            : s.activeDocumentId,
      };
    });
    useHistoryStore.getState().clear(docId);
  },

  setActiveDocument: (docId) => set({ activeDocumentId: docId }),

  renameDocument: (docId, name) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === docId ? { ...d, name } : d)),
    })),

  markSaved: (docId, filePath) =>
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId ? { ...d, filePath, dirty: false } : d,
      ),
    })),

  setDocumentDirty: (docId, dirty) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === docId ? { ...d, dirty } : d)),
    })),

  setView: (docId, patch) =>
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId ? { ...d, view: { ...d.view, ...patch } } : d,
      ),
    })),

  activeLayer: () => {
    const doc = get().activeDocument();
    if (!doc) return null;
    return doc.layers.find((l) => l.id === doc.activeLayerId) ?? null;
  },

  addLayer: (docId, patch = {}) => {
    const layerId = freshId("layer");
    const doc = get().documents.find((d) => d.id === docId);
    const n = (doc?.layers.length ?? 0) + 1;
    const layer = defaultLayer(layerId, patch.name ?? `Layer ${n}`, patch);

    set((s) => ({
      documents: s.documents.map((d) =>
        d.id !== docId
          ? d
          : {
              ...d,
              dirty: true,
              // Photoshop inserts above the active layer.
              layers: insertAbove(d.layers, d.activeLayerId, layer),
              activeLayerId: layerId,
            },
      ),
    }));
    getEngine()?.createLayerSurface(
      doc as DocumentState,
      layerId,
      "transparent",
    );

    useHistoryStore.getState().push(docId, {
      label: `New Layer "${layer.name}"`,
      undo: () => {
        applyLayers(
          docId,
          (get().documents.find((d) => d.id === docId)?.layers ?? []).filter(
            (l) => l.id !== layerId,
          ),
          doc?.activeLayerId ?? null,
        );
      },
      redo: () => {
        const d = get().documents.find((x) => x.id === docId);
        if (!d) return;
        applyLayers(docId, insertAbove(d.layers, d.activeLayerId, layer), layerId);
      },
    });
    return layerId;
  },

  deleteLayer: (docId, layerId) => {
    const doc = get().documents.find((d) => d.id === docId);
    const index = doc?.layers.findIndex((l) => l.id === layerId) ?? -1;
    if (!doc || index < 0) return;
    const removed = doc.layers[index]!;
    const layers = doc.layers.filter((l) => l.id !== layerId);
    const activeLayerId =
      doc.activeLayerId === layerId
        ? (layers[Math.min(index, layers.length - 1)]?.id ?? null)
        : doc.activeLayerId;

    applyLayers(docId, layers, activeLayerId);
    getEngine()?.deleteLayerSurface(layerId);
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId ? { ...d, dirty: true } : d,
      ),
    }));

    useHistoryStore.getState().push(docId, {
      label: `Delete Layer "${removed.name}"`,
      undo: () => {
        const d = get().documents.find((x) => x.id === docId);
        if (!d) return;
        const restored = [...d.layers];
        restored.splice(Math.min(index, restored.length), 0, removed);
        applyLayers(docId, restored, layerId);
      },
      redo: () => {
        applyLayers(
          docId,
          (get().documents.find((d2) => d2.id === docId)?.layers ?? []).filter(
            (l) => l.id !== layerId,
          ),
          activeLayerId,
        );
      },
    });
  },

  duplicateLayer: (docId, layerId) => {
    const doc = get().documents.find((d) => d.id === docId);
    const source = doc?.layers.find((l) => l.id === layerId);
    if (!doc || !source) return;
    const copyId = freshId("layer");
    const copy: LayerState = {
      ...source,
      id: copyId,
      name: `${source.name} copy`,
      mask: source.mask ? { ...source.mask, id: freshId("mask") } : null,
    };

    set((s) => ({
      documents: s.documents.map((d) =>
        d.id !== docId
          ? d
          : {
              ...d,
              dirty: true,
              layers: insertAbove(d.layers, layerId, copy),
              activeLayerId: copyId,
            },
      ),
    }));
    // Copy pixels via the engine.
    getEngine()?.duplicateLayerSurface(layerId, copyId);

    useHistoryStore.getState().push(docId, {
      label: `Duplicate Layer "${source.name}"`,
      undo: () => {
        applyLayers(
          docId,
          (get().documents.find((d) => d.id === docId)?.layers ?? []).filter(
            (l) => l.id !== copyId,
          ),
          layerId,
        );
        getEngine()?.deleteLayerSurface(copyId);
      },
      redo: () => {
        const d = get().documents.find((x) => x.id === docId);
        if (!d) return;
        applyLayers(docId, insertAbove(d.layers, layerId, copy), copyId);
        getEngine()?.duplicateLayerSurface(layerId, copyId);
      },
    });
  },

  renameLayer: (docId, layerId, name) => {
    const doc = get().documents.find((d) => d.id === docId);
    const oldName = doc?.layers.find((l) => l.id === layerId)?.name ?? "";
    applyLayerMeta(docId, layerId, { name });
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId ? { ...d, dirty: true } : d,
      ),
    }));
    // Typed renames coalesce into one undo step per layer.
    const mergeKey = `rename:${layerId}`;
    const mergeable =
      useHistoryStore.getState().byDocument[docId]?.undoStack.at(-1)?.mergeKey ===
      mergeKey;
    useHistoryStore.getState().push(docId, {
      label: `Rename Layer`,
      mergeKey: mergeable ? mergeKey : undefined,
      undo: () => applyLayerMeta(docId, layerId, { name: oldName }),
      redo: () => applyLayerMeta(docId, layerId, { name }),
    });
  },

  reorderLayer: (docId, layerId, toIndex) => {
    const doc = get().documents.find((d) => d.id === docId);
    if (!doc) return;
    const fromIndex = doc.layers.findIndex((l) => l.id === layerId);
    if (fromIndex < 0) return;
    const layers = [...doc.layers];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved!);

    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId ? { ...d, layers, dirty: true } : d,
      ),
    }));
    getEngine()?.requestRender();

    useHistoryStore.getState().push(docId, {
      label: `Reorder Layer "${moved!.name}"`,
      undo: () => {
        const d = get().documents.find((x) => x.id === docId);
        if (!d) return;
        const list = [...d.layers];
        const cur = list.findIndex((l) => l.id === layerId);
        if (cur < 0) return;
        const [m2] = list.splice(cur, 1);
        list.splice(fromIndex, 0, m2!);
        applyLayers(docId, list, d.activeLayerId);
      },
      redo: () => {
        const d = get().documents.find((x) => x.id === docId);
        if (!d) return;
        const list = [...d.layers];
        const cur = list.findIndex((l) => l.id === layerId);
        if (cur < 0) return;
        const [m2] = list.splice(cur, 1);
        list.splice(toIndex, 0, m2!);
        applyLayers(docId, list, d.activeLayerId);
      },
    });
  },

  setLayerMeta: (docId, layerId, patch) => {
    const doc = get().documents.find((d) => d.id === docId);
    const before: Partial<LayerState> = {};
    const layer = doc?.layers.find((l) => l.id === layerId);
    if (!layer) return;
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
      (before as Record<string, unknown>)[key] = layer[key];
    }
    applyLayerMeta(docId, layerId, patch);
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId ? { ...d, dirty: true } : d,
      ),
    }));

    // Coalesce rapid slider tweaks (opacity/flow) into one undo step.
    const mergeKey =
      "opacity" in patch || "fillOpacity" in patch
        ? `opacity:${layerId}`
        : undefined;

    const mergeable =
      mergeKey !== undefined &&
      useHistoryStore.getState().byDocument[docId]?.undoStack.at(-1)?.mergeKey ===
        mergeKey;

    useHistoryStore.getState().push(docId, {
      label: describeLayerPatch(patch),
      mergeKey: mergeable ? mergeKey : undefined,
      undo: () => applyLayerMeta(docId, layerId, before),
      redo: () => applyLayerMeta(docId, layerId, patch),
    });
  },

  setActiveLayer: (docId, layerId) =>
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId ? { ...d, activeLayerId: layerId } : d,
      ),
    })),

  addLayerMask: (docId, layerId) => {
    const mask = { id: freshId("mask"), enabled: true, linked: true };
    const doc = get().documents.find((d) => d.id === docId);
    const prev = doc?.layers.find((l) => l.id === layerId)?.mask ?? null;
    applyLayerMeta(docId, layerId, { mask });
    getEngine()?.createMaskSurface(layerId, mask.id);
    useHistoryStore.getState().push(docId, {
      label: "Add Layer Mask",
      undo: () => {
        applyLayerMeta(docId, layerId, { mask: prev });
        if (prev) getEngine()?.deleteMaskSurface(layerId);
      },
      redo: () => {
        applyLayerMeta(docId, layerId, { mask });
        getEngine()?.createMaskSurface(layerId, mask.id);
      },
    });
  },

  deleteLayerMask: (docId, layerId) => {
    const doc = get().documents.find((d) => d.id === docId);
    const prev = doc?.layers.find((l) => l.id === layerId)?.mask ?? null;
    applyLayerMeta(docId, layerId, { mask: null });
    getEngine()?.deleteMaskSurface(layerId);
    useHistoryStore.getState().push(docId, {
      label: "Delete Layer Mask",
      undo: () => {
        applyLayerMeta(docId, layerId, { mask: prev });
        if (prev) getEngine()?.createMaskSurface(layerId, prev.id);
      },
      redo: () => applyLayerMeta(docId, layerId, { mask: null }),
    });
  },
}));

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Insert `layer` directly above `activeId` (or at top when missing). */
function insertAbove(
  layers: LayerState[],
  activeId: string | null,
  layer: LayerState,
): LayerState[] {
  const index = layers.findIndex((l) => l.id === activeId);
  const list = [...layers];
  list.splice(index < 0 ? list.length : index + 1, 0, layer);
  return list;
}

function describeLayerPatch(patch: Partial<LayerState>): string {
  if ("opacity" in patch) return "Layer Opacity";
  if ("fillOpacity" in patch) return "Fill Opacity";
  if ("visible" in patch) return patch.visible ? "Show Layer" : "Hide Layer";
  if ("blendMode" in patch) return `Blend Mode: ${patch.blendMode}`;
  if ("locked" in patch) return patch.locked ? "Lock Layer" : "Unlock Layer";
  if ("clipped" in patch) return patch.clipped ? "Create Clipping Mask" : "Release Clipping Mask";
  return "Layer Properties";
}

export type { DocumentState, LayerState, BlendModeId };
