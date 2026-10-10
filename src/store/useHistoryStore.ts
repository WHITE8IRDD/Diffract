/**
 * History store — non-destructive undo/redo.
 *
 * Design notes
 * ------------
 * * Command pattern: every entry knows how to `undo()` and `redo()` itself.
 *   Pixel operations capture their own snapshots (ImageData), so the store
 *   never needs to understand raster data.
 * * Per-document stacks: switching tabs switches history context.
 * * Capacity: 60 states by default (spec minimum is 50); oldest entries are
 *   dropped from the bottom of the stack.
 * * Coalescing: consecutive entries with the same `mergeKey` replace the top
 *   of the stack (used for live sliders and rapid property edits).
 */

import { create } from "zustand";
import { freshId } from "@/utils/ids";

export interface HistoryEntry {
  id: string;
  label: string;
  undo: () => void;
  redo: () => void;
  /** Entries with the same key coalesce into one undo step. */
  mergeKey?: string;
}

interface DocumentHistory {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}

interface HistoryState {
  /** History context per document id. */
  byDocument: Record<string, DocumentHistory>;
  /** Limit per stack (undo side). */
  capacity: number;

  /** Register a completed command. Clears the redo stack. */
  push: (
    docId: string,
    entry: Omit<HistoryEntry, "id"> & { id?: string },
  ) => void;
  undo: (docId: string) => void;
  redo: (docId: string) => void;
  clear: (docId: string) => void;
  canUndo: (docId: string) => boolean;
  canRedo: (docId: string) => boolean;
  /** Labels for the History panel (newest first). */
  undoLabels: (docId: string) => string[];
  redoLabels: (docId: string) => string[];
}

const emptyHistory = (): DocumentHistory => ({ undoStack: [], redoStack: [] });

export const useHistoryStore = create<HistoryState>((set, get) => ({
  byDocument: {},
  capacity: 60,

  push: (docId, entry) =>
    set((state) => {
      const hist = state.byDocument[docId] ?? emptyHistory();
      const id = entry.id ?? freshId("hist");
      const full: HistoryEntry = { ...entry, id };

      // Coalesce with the previous entry when explicitly requested.
      const top = hist.undoStack[hist.undoStack.length - 1];
      const undoStack =
        top && entry.mergeKey && top.mergeKey === entry.mergeKey
          ? [...hist.undoStack.slice(0, -1), full]
          : [...hist.undoStack, full];

      // Enforce capacity on the undo side.
      const trimmed =
        undoStack.length > state.capacity
          ? undoStack.slice(undoStack.length - state.capacity)
          : undoStack;

      return {
        byDocument: {
          ...state.byDocument,
          [docId]: { undoStack: trimmed, redoStack: [] },
        },
      };
    }),

  undo: (docId) => {
    const hist = get().byDocument[docId];
    const entry = hist?.undoStack[hist.undoStack.length - 1];
    if (!entry) return;
    entry.undo();
    set((state) => {
      const h = state.byDocument[docId] ?? emptyHistory();
      return {
        byDocument: {
          ...state.byDocument,
          [docId]: {
            undoStack: h.undoStack.slice(0, -1),
            redoStack: [...h.redoStack, entry],
          },
        },
      };
    });
  },

  redo: (docId) => {
    const hist = get().byDocument[docId];
    const entry = hist?.redoStack[hist.redoStack.length - 1];
    if (!entry) return;
    entry.redo();
    set((state) => {
      const h = state.byDocument[docId] ?? emptyHistory();
      return {
        byDocument: {
          ...state.byDocument,
          [docId]: {
            undoStack: [...h.undoStack, entry],
            redoStack: h.redoStack.slice(0, -1),
          },
        },
      };
    });
  },

  clear: (docId) =>
    set((state) => ({
      byDocument: {
        ...state.byDocument,
        [docId]: emptyHistory(),
      },
    })),

  canUndo: (docId) => (get().byDocument[docId]?.undoStack.length ?? 0) > 0,
  canRedo: (docId) => (get().byDocument[docId]?.redoStack.length ?? 0) > 0,

  undoLabels: (docId) =>
    [...(get().byDocument[docId]?.undoStack ?? [])].reverse().map((e) => e.label),
  redoLabels: (docId) =>
    [...(get().byDocument[docId]?.redoStack ?? [])].reverse().map((e) => e.label),
}));
