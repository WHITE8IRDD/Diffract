/**
 * UI store — everything about *how* the shell looks and which tool is live.
 *
 * Keeping shell state out of the document store means switching documents
 * never resets the workspace, and the History panel stays free of UI noise.
 */

import { create } from "zustand";
import {
  DEFAULT_TOOL_OPTIONS,
  type ToolId,
  type ToolOptions,
  type BrushToolOptions,
  type GradientToolOptions,
  type CropToolOptions,
  type MagicWandOptions,
} from "@/tools/types";

/** Saved workspace presets (Window ▸ Workspace). */
export type WorkspaceLayout = "photography" | "painting" | "ai" | "essential";

export interface PanelState {
  collapsed: boolean;
  visible: boolean;
}

interface UIState {
  // ── Tools ──────────────────────────────────────────────────────────────
  activeToolId: ToolId;
  transformVisible: boolean;
  setTransformVisible: (visible: boolean) => void;
  toolOptions: ToolOptions;
  setActiveTool: (id: ToolId) => void;
  setBrushOptions: (patch: Partial<BrushToolOptions>, forEraser?: boolean) => void;
  setGradientOptions: (patch: Partial<GradientToolOptions>) => void;
  setCropOptions: (patch: Partial<CropToolOptions>) => void;
  setMagicWandOptions: (patch: Partial<MagicWandOptions>) => void;

  // ── Canvas cursor readout (status bar) ─────────────────────────────────
  cursorDocX: number;
  cursorDocY: number;
  cursorInside: boolean;
  /** Zoom as a fraction (1 = 100%) — mirrored from the engine. */
  zoom: number;
  setCursor: (x: number, y: number, inside: boolean) => void;
  setZoom: (zoom: number) => void;

  // ── Panels / dock ──────────────────────────────────────────────────────
  panels: Record<"layers" | "properties" | "history" | "color", PanelState>;
  toolbarVisible: boolean;
  toggleToolbar: () => void;
  rightDockVisible: boolean;
  statusBarVisible: boolean;
  togglePanel: (id: "layers" | "properties" | "history" | "color") => void;
  collapsePanel: (
    id: "layers" | "properties" | "history" | "color",
    collapsed: boolean,
  ) => void;
  toggleRightDock: () => void;
  toggleStatusBar: () => void;
  /** Tab key — hides all panels for a clean canvas. */
  panelsHidden: boolean;
  setPanelsHidden: (hidden: boolean) => void;

  // ── Workspace ──────────────────────────────────────────────────────────
  /** Home can be opened over existing documents without closing them. */
  homeVisible: boolean;
  setHomeVisible: (visible: boolean) => void;
  workspace: WorkspaceLayout;
  setWorkspace: (w: WorkspaceLayout) => void;

  // ── Menus & dialogs ────────────────────────────────────────────────────
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  dialogs: {
    newDocument: boolean;
    exportAs: boolean;
    about: boolean;
    shortcuts: boolean;
  };
  openDialog: (id: keyof UIState["dialogs"]) => void;
  closeDialog: (id: keyof UIState["dialogs"]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeToolId: "move",
  transformVisible: false,
  setTransformVisible: (visible) => set({ transformVisible: visible }),
  toolOptions: DEFAULT_TOOL_OPTIONS,
  setActiveTool: (id) => set({ activeToolId: id }),
  setBrushOptions: (patch, forEraser = false) =>
    set((s) => ({
      toolOptions: {
        ...s.toolOptions,
        [forEraser ? "eraser" : "brush"]: {
          ...s.toolOptions[forEraser ? "eraser" : "brush"],
          ...patch,
        },
      },
    })),
  setGradientOptions: (patch) =>
    set((s) => ({
      toolOptions: { ...s.toolOptions, gradient: { ...s.toolOptions.gradient, ...patch } },
    })),
  setCropOptions: (patch) =>
    set((s) => ({
      toolOptions: { ...s.toolOptions, crop: { ...s.toolOptions.crop, ...patch } },
    })),
  setMagicWandOptions: (patch) =>
    set((s) => ({
      toolOptions: { ...s.toolOptions, magicWand: { ...s.toolOptions.magicWand, ...patch } },
    })),

  cursorDocX: 0,
  cursorDocY: 0,
  cursorInside: false,
  zoom: 1,
  setCursor: (x, y, inside) =>
    set({ cursorDocX: x, cursorDocY: y, cursorInside: inside }),
  setZoom: (zoom) => set({ zoom }),

  panels: {
    layers: { collapsed: false, visible: true },
    properties: { collapsed: false, visible: true },
    history: { collapsed: true, visible: true },
    color: { collapsed: false, visible: true },
  },
  toolbarVisible: true,
  toggleToolbar: () => set(s => ({ toolbarVisible: !s.toolbarVisible })),
  rightDockVisible: true,
  statusBarVisible: true,
  togglePanel: (id) =>
    set((s) => ({
      panels: {
        ...s.panels,
        [id]: { ...s.panels[id], visible: !s.panels[id].visible },
      },
    })),
  collapsePanel: (id, collapsed) =>
    set((s) => ({
      panels: { ...s.panels, [id]: { ...s.panels[id], collapsed } },
    })),
  toggleRightDock: () => set((s) => ({ rightDockVisible: !s.rightDockVisible })),
  toggleStatusBar: () => set((s) => ({ statusBarVisible: !s.statusBarVisible })),
  panelsHidden: false,
  setPanelsHidden: (hidden) => set({ panelsHidden: hidden }),

  homeVisible: false,
  setHomeVisible: (visible) => set({ homeVisible: visible }),
  workspace: "essential",
  setWorkspace: (w) => set({ workspace: w }),

  openMenuId: null,
  setOpenMenuId: (id) => set({ openMenuId: id }),
  dialogs: { newDocument: false, exportAs: false, about: false, shortcuts: false },
  openDialog: (id) =>
    set((s) => ({ dialogs: { ...s.dialogs, [id]: true } })),
  closeDialog: (id) =>
    set((s) => ({ dialogs: { ...s.dialogs, [id]: false } })),
}));
