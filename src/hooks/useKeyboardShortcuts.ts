/** Photoshop-style keys share the same command dispatcher as the menu. */
import { useEffect } from "react";
import { matchShortcut, readModifiers, type ShortcutAction } from "@/utils/shortcuts";
import type { ToolId } from "@/tools/types";
import { getTool, PlaceholderTool } from "@/tools/ToolRegistry";
import type { MenuActionId } from "@/components/layout/menuData";
import { runAppCommand } from "./useAppCommands";
import { useColorStore } from "@/store/useColorStore";
import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { selectionFor, useSelectionStore } from "@/store/useSelectionStore";

const TOOL_IDS = new Set<string>([
  "move", "marquee-rect", "marquee-ellipse", "lasso", "polygon-lasso", "brush",
  "eraser", "paint-bucket", "gradient", "crop", "eyedropper", "text", "zoom",
  "hand", "magic-wand", "quick-selection", "healing", "clone-stamp", "patch",
  "red-eye", "history-brush", "dodge", "burn", "sponge", "pen", "path-select", "shape", "shape-ellipse",
]);
function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest("input, textarea, [contenteditable=true]");
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const ui = useUIStore.getState();
      const doc = useDocumentStore.getState().activeDocument();
      if (e.key === "Escape" && doc) {
        useSelectionStore.getState().setSelection(doc.id, null);
        return;
      }
      if (e.key === "Enter" && ui.activeToolId === "crop" && !ui.transformVisible && doc) {
        const sel = selectionFor(doc.id);
        if (sel) { e.preventDefault(); useDocumentStore.getState().cropDocument(doc.id, sel); }
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === "x") { e.preventDefault(); useColorStore.getState().swap(); return; }
        if (e.key.toLowerCase() === "d") { e.preventDefault(); useColorStore.getState().resetDefaults(); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        const docs = useDocumentStore.getState();
        const index = docs.documents.findIndex(d => d.id === docs.activeDocumentId);
        const next = docs.documents[(index + (e.shiftKey ? docs.documents.length - 1 : 1)) % docs.documents.length];
        if (next) { e.preventDefault(); docs.setActiveDocument(next.id); }
        return;
      }
      const binding = matchShortcut(e, readModifiers(e));
      if (!binding) return;
      const action = binding.action as ShortcutAction | ToolId;
      if (TOOL_IDS.has(action) && getTool(action as ToolId) instanceof PlaceholderTool) return;
      e.preventDefault();
      e.stopPropagation();
      if (TOOL_IDS.has(action)) ui.setActiveTool(action as ToolId);
      else if (action === "window.togglePanels") ui.setPanelsHidden(!ui.panelsHidden);
      else runAppCommand(action as MenuActionId);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);
}
