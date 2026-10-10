/**
 * Selection store — the active rectangular selection per document.
 *
 * Pixel edits (brush, bucket, gradient) clip to the selection. The rectangle
 * is also drawn by the engine as a dashed outline; `setSelection` keeps both
 * in step.
 */

import { create } from "zustand";
import type { PixelRect } from "@/engine/snapshot";
import { getEngine } from "@/engine/registry";

interface SelectionState {
  byDocument: Record<string, PixelRect | null>;
  setSelection: (docId: string, rect: PixelRect | null) => void;
  clear: (docId: string) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  byDocument: {},
  setSelection: (docId, rect) => {
    const normalised = rect && rect.w > 0 && rect.h > 0 ? rect : null;
    set((s) => ({ byDocument: { ...s.byDocument, [docId]: normalised } }));
    getEngine()?.setSelectionOverlay(docId, normalised);
  },
  clear: (docId) => {
    set((s) => {
      const next = { ...s.byDocument };
      delete next[docId];
      return { byDocument: next };
    });
    getEngine()?.setSelectionOverlay(docId, null);
  },
}));

export function selectionFor(docId: string): PixelRect | null {
  return useSelectionStore.getState().byDocument[docId] ?? null;
}
