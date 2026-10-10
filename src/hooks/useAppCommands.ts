/**
 * App command dispatcher.
 *
 * One entry point for every menu action (and later, the command palette and
 * automation channel — PhotoCraft's "every action is a command" insight).
 * Keyboard shortcuts dispatch the same ids via `useKeyboardShortcuts`.
 */

import type { MenuActionId } from "@/components/layout/menuData";
import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { selectionFor, useSelectionStore } from "@/store/useSelectionStore";
import { useColorStore } from "@/store/useColorStore";
import { commitRegionEdit } from "@/tools/region";
import { getEngine } from "@/engine/registry";
import { saveProject } from "@/io/project";
import { openImageAsDocument } from "@/io/openImage";

export interface AppCommands {
  run: (id: MenuActionId) => void;
}

export function runAppCommand(id: MenuActionId): void {
    const ui = useUIStore.getState();
    const docs = useDocumentStore.getState();
    const history = useHistoryStore.getState();
    const doc = docs.activeDocument();
    const engine = getEngine();

    switch (id) {
      // ── File ───────────────────────────────────────────────────────────
      case "file.new":
        ui.openDialog("newDocument");
        break;
      case "file.open":
        void openImageAsDocument();
        break;
      case "file.openRecent":
        ui.setHomeVisible(true);
        break;
      case "file.save":
        void saveProject().catch(err => window.alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`));
        break;
      case "file.saveAs":
        void saveProject(true).catch(err => window.alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`));
        break;
      case "file.export":
      case "file.exportAs":
        ui.openDialog("exportAs");
        break;
      case "file.close":
        if (doc) docs.closeDocument(doc.id);
        break;
      case "file.documentInfo":
        console.info("[cmd] file.documentInfo");
        break;

      // ── Edit ───────────────────────────────────────────────────────────
      case "edit.undo":
        if (doc) history.undo(doc.id);
        break;
      case "edit.redo":
        if (doc) history.redo(doc.id);
        break;
      case "edit.transform":
        if (doc?.activeLayerId) ui.setTransformVisible(true);
        break;
      case "edit.cut":
      case "edit.copy":
      case "edit.paste":
      case "edit.stroke":
      case "edit.prefs":
        console.info(`[cmd] ${id}`);
        break;
      case "edit.fill": {
        if (!doc?.activeLayerId || !engine) break;
        const layer = doc.layers.find(l => l.id === doc.activeLayerId);
        const surface = engine.getSurface(doc.activeLayerId);
        if (!layer || layer.locked || !layer.visible || !surface) break;
        const before = engine.captureSnapshot(layer.id);
        if (!before) break;
        const sel = selectionFor(doc.id) ?? { x: 0, y: 0, w: doc.width, h: doc.height };
        const fg = useColorStore.getState().foreground;
        surface.ctx.fillStyle = `rgba(${fg.r},${fg.g},${fg.b},${fg.a})`;
        surface.ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
        engine.markDirty(layer.id);
        commitRegionEdit(doc.id, layer.id, before, sel, "Fill with Foreground Color");
        break;
      }

      // ── Image ──────────────────────────────────────────────────────────
      case "image.canvasSize":
      case "image.imageSize":
      case "image.adjustments":
      case "image.rotate":
      case "image.trim":
        console.info(`[cmd] ${id} — Phase 2`);
        break;
      case "image.crop":
        if (doc) { const sel = selectionFor(doc.id); if (sel) docs.cropDocument(doc.id, sel); }
        break;

      // ── Layer ──────────────────────────────────────────────────────────
      case "layer.new":
        if (doc) docs.addLayer(doc.id);
        break;
      case "layer.duplicate":
        if (doc?.activeLayerId) docs.duplicateLayer(doc.id, doc.activeLayerId);
        break;
      case "layer.delete":
        if (doc?.activeLayerId) docs.deleteLayer(doc.id, doc.activeLayerId);
        break;
      case "layer.layerMask":
        if (doc?.activeLayerId) {
          const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
          if (layer?.mask) docs.deleteLayerMask(doc.id, layer.id);
          else docs.addLayerMask(doc.id, doc.activeLayerId);
        }
        break;
      case "layer.clippingMask":
        if (doc?.activeLayerId) {
          const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
          docs.setLayerMeta(doc.id, doc.activeLayerId, { clipped: !layer?.clipped });
        }
        break;
      case "layer.newAdjustment":
      case "layer.layerStyle":
      case "layer.group":
      case "layer.ungroup":
      case "layer.mergeDown":
      case "layer.flatten":
        console.info(`[cmd] ${id} — Phase 2`);
        break;

      // ── Select ─────────────────────────────────────────────────────────
      case "select.all":
        if (doc) useSelectionStore.getState().setSelection(doc.id, { x: 0, y: 0, w: doc.width, h: doc.height });
        break;
      case "select.deselect":
        if (doc) useSelectionStore.getState().setSelection(doc.id, null);
        break;
      case "select.inverse":
      case "select.colorRange":
      case "select.expand":
      case "select.contract":
      case "select.feather":
      case "select.selectSubject":
      case "select.selectAndMask":
        console.info(`[cmd] ${id}`);
        break;

      // ── Filter ─────────────────────────────────────────────────────────
      case "filter.blur":
      case "filter.sharpen":
      case "filter.noise":
      case "filter.liquify":
      case "filter.cameraRaw":
      case "filter.stylize":
        console.info(`[cmd] ${id} — Phase 2 filter pipeline`);
        break;

      // ── View ───────────────────────────────────────────────────────────
      case "view.zoomIn":
        engine?.zoomBy(1.25);
        break;
      case "view.zoomOut":
        engine?.zoomBy(1 / 1.25);
        break;
      case "view.zoomFit":
        engine?.fitToScreen();
        break;
      case "view.zoomActual":
        engine?.setZoom(1);
        break;
      case "view.toggleRulers":
        if (doc) docs.setView(doc.id, { showRulers: !doc.view.showRulers });
        break;
      case "view.toggleGrid":
        if (doc) docs.setView(doc.id, { showGrid: !doc.view.showGrid });
        break;
      case "view.toggleGuides":
        break;

      // ── Window ─────────────────────────────────────────────────────────
      case "window.workspace":
        break;
      case "window.toggleToolbar":
        ui.toggleToolbar();
        break;
      case "window.toggleRightDock":
        ui.toggleRightDock();
        break;
      case "window.toggleLayers":
        ui.togglePanel("layers");
        break;
      case "window.toggleProperties":
        ui.togglePanel("properties");
        break;
      case "window.toggleHistory":
        ui.togglePanel("history");
        break;
      case "window.toggleColor":
        ui.togglePanel("color");
        break;
      case "window.toggleStatusBar":
        ui.toggleStatusBar();
        break;

      // ── Help ───────────────────────────────────────────────────────────
      case "help.about":
        ui.openDialog("about");
        break;
      case "help.shortcuts":
        ui.openDialog("shortcuts");
        break;
      case "help.docs":
      case "help.aiModels":
      case "help.checkUpdates":
        console.info(`[cmd] ${id}`);
        break;
    }
}

export function useAppCommands(): AppCommands {
  return { run: runAppCommand };
}
