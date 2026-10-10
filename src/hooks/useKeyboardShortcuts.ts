/**
 * Global keyboard shortcuts (Photoshop defaults — see `utils/shortcuts`).
 *
 * Installed once at the app root. Ignores keystrokes typed into inputs so
 * text fields keep their native behaviour.
 */

import { useEffect } from "react";
import { matchShortcut, readModifiers, type ShortcutAction } from "@/utils/shortcuts";
import type { ToolId } from "@/tools/types";
import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { getEngine } from "@/engine/registry";

const TOOL_IDS = new Set<string>([
  "move", "marquee-rect", "marquee-ellipse", "lasso", "polygon-lasso", "brush",
  "eraser", "paint-bucket", "gradient", "crop", "eyedropper", "text", "zoom",
  "hand", "magic-wand", "quick-selection", "healing", "clone-stamp", "patch",
  "red-eye", "history-brush", "dodge", "burn", "sponge", "pen", "path-select", "shape",
]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mods = readModifiers(e);
      const binding = matchShortcut(e, mods);
      if (!binding) return;

      e.preventDefault();
      e.stopPropagation();
      dispatch(binding.action);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);
}

function dispatch(action: ShortcutAction | ToolId): void {
  const ui = useUIStore.getState();
  const docs = useDocumentStore.getState();
  const history = useHistoryStore.getState();
  const doc = docs.activeDocument();
  const engine = getEngine();

  // Tool selection.
  if (TOOL_IDS.has(action)) {
    ui.setActiveTool(action as ToolId);
    return;
  }

  switch (action) {
    case "file.new":
      ui.openDialog("newDocument");
      break;
    case "file.open":
      // Wired to the native dialog in Phase 1 step 2 (File ▸ Open).
      console.info("[shortcut] file.open — native dialog coming online with Rust file I/O");
      break;
    case "file.save":
    case "file.saveAs":
    case "file.export":
      ui.openDialog("exportAs");
      break;

    case "edit.undo":
      if (doc) history.undo(doc.id);
      break;
    case "edit.redo":
      if (doc) history.redo(doc.id);
      break;
    case "edit.fill":
      console.info("[shortcut] edit.fill — flood fill lands with the Paint Bucket tool");
      break;

    case "image.canvasSize":
      console.info("[shortcut] image.canvasSize");
      break;

    case "layer.new":
      if (doc) docs.addLayer(doc.id);
      break;
    case "layer.duplicate":
      if (doc?.activeLayerId) docs.duplicateLayer(doc.id, doc.activeLayerId);
      break;
    case "layer.delete":
      if (doc?.activeLayerId) docs.deleteLayer(doc.id, doc.activeLayerId);
      break;
    case "layer.mergeDown":
      console.info("[shortcut] layer.mergeDown");
      break;

    case "select.all":
    case "select.deselect":
    case "select.inverse":
      console.info(`[shortcut] ${action}`);
      break;

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

    case "window.togglePanels":
      ui.setPanelsHidden(!ui.panelsHidden);
      break;
    case "window.toggleStatusBar":
      ui.toggleStatusBar();
      break;
  }
}
