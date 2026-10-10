/**
 * Keyboard shortcuts.
 *
 * Diffract follows Photoshop's default keyboard map so users feel at home
 * (see the UI/UX requirements). `shortcutFor()` renders the accelerator
 * strings shown in menus and tooltips; `useKeyboardShortcuts` matches events
 * against the same source of truth.
 */

import type { ToolId } from "@/tools/types";

/** Keyboard modifiers, normalized across platforms. */
export interface Modifiers {
  ctrl: boolean; // Ctrl on Windows / Cmd on macOS
  shift: boolean;
  alt: boolean;
}

export type ShortcutAction =
  // File
  | "file.new"
  | "file.open"
  | "file.save"
  | "file.saveAs"
  | "file.export"
  // Edit
  | "edit.undo"
  | "edit.redo"
  | "edit.fill"
  | "edit.transform"
  // Layer
  | "layer.new"
  | "layer.duplicate"
  | "layer.delete"
  // Select
  | "select.all"
  | "select.deselect"
  | "select.inverse"
  // View
  | "view.zoomIn"
  | "view.zoomOut"
  | "view.zoomFit"
  | "view.zoomActual"
  | "view.toggleRulers"
  | "view.toggleGrid"
  // Window
  | "window.togglePanels";

export interface ShortcutBinding {
  /** Human-readable accelerator, Windows style (Ctrl+Z). */
  keys: string;
  action: ShortcutAction | ToolId;
  /** Normalized matcher for a `KeyboardEvent`. */
  match: (e: KeyboardEvent, mods: Modifiers) => boolean;
}

const mod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

/** Normalize event modifiers. */
export function readModifiers(e: KeyboardEvent): Modifiers {
  return { ctrl: mod(e), shift: e.shiftKey, alt: e.altKey };
}

const simple = (key: string) => (e: KeyboardEvent, m: Modifiers) =>
  !m.ctrl && !m.alt && !m.shift && e.key.toLowerCase() === key;

const ctrl = (key: string) => (e: KeyboardEvent, m: Modifiers) =>
  m.ctrl && !m.alt && !m.shift && e.key.toLowerCase() === key;

const ctrlShift = (key: string) => (e: KeyboardEvent, m: Modifiers) =>
  m.ctrl && !m.alt && m.shift && e.key.toLowerCase() === key;

/**
 * Master shortcut table. Tools use single letters (Photoshop defaults);
 * application commands use the Ctrl-suffixed chords.
 */
export const SHORTCUTS: ShortcutBinding[] = [
  // Tools — Photoshop defaults
  { keys: "V", action: "move", match: simple("v") },
  { keys: "M", action: "marquee-rect", match: simple("m") },
  { keys: "L", action: "lasso", match: simple("l") },
  { keys: "W", action: "magic-wand", match: simple("w") },
  { keys: "C", action: "crop", match: simple("c") },
  { keys: "I", action: "eyedropper", match: simple("i") },
  { keys: "J", action: "healing", match: simple("j") },
  { keys: "B", action: "brush", match: simple("b") },
  { keys: "S", action: "clone-stamp", match: simple("s") },
  { keys: "E", action: "eraser", match: simple("e") },
  { keys: "G", action: "gradient", match: simple("g") },
  { keys: "O", action: "dodge", match: simple("o") },
  { keys: "P", action: "pen", match: simple("p") },
  { keys: "T", action: "text", match: simple("t") },
  { keys: "A", action: "path-select", match: simple("a") },
  { keys: "U", action: "shape", match: simple("u") },
  { keys: "H", action: "hand", match: simple("h") },
  { keys: "Z", action: "zoom", match: simple("z") },
  { keys: "Y", action: "history-brush", match: simple("y") },

  // File
  { keys: "Ctrl+N", action: "file.new", match: ctrl("n") },
  { keys: "Ctrl+O", action: "file.open", match: ctrl("o") },
  { keys: "Ctrl+S", action: "file.save", match: ctrl("s") },
  { keys: "Ctrl+Shift+S", action: "file.saveAs", match: ctrlShift("s") },
  { keys: "Ctrl+Shift+E", action: "file.export", match: ctrlShift("e") },

  // Edit
  { keys: "Ctrl+Z", action: "edit.undo", match: ctrl("z") },
  { keys: "Ctrl+Shift+Z", action: "edit.redo", match: ctrlShift("z") },
  { keys: "Ctrl+Y", action: "edit.redo", match: ctrl("y") },
  { keys: "Shift+F5", action: "edit.fill", match: (e, m) => !m.ctrl && !m.alt && m.shift && e.key === "F5" },
  { keys: "Ctrl+T", action: "edit.transform", match: ctrl("t") },

  // Layer
  { keys: "Ctrl+Shift+N", action: "layer.new", match: ctrlShift("n") },
  { keys: "Ctrl+J", action: "layer.duplicate", match: ctrl("j") },
  { keys: "Delete", action: "layer.delete", match: simple("delete") },

  // Select
  { keys: "Ctrl+A", action: "select.all", match: ctrl("a") },
  { keys: "Ctrl+D", action: "select.deselect", match: ctrl("d") },


  // View
  { keys: "Ctrl++", action: "view.zoomIn", match: ctrl("+") },
  { keys: "Ctrl+-", action: "view.zoomOut", match: ctrl("-") },
  { keys: "Ctrl+0", action: "view.zoomFit", match: ctrl("0") },
  { keys: "Ctrl+1", action: "view.zoomActual", match: ctrl("1") },
  { keys: "Ctrl+R", action: "view.toggleRulers", match: ctrl("r") },
  { keys: "Ctrl+'", action: "view.toggleGrid", match: ctrl("'") },

  // Window
  { keys: "Tab", action: "window.togglePanels", match: simple("tab") },
];

/** Display string for a shortcut action (for menus / tooltips). */
export function shortcutFor(action: ShortcutAction | ToolId): string {
  return SHORTCUTS.find((s) => s.action === action)?.keys ?? "";
}

/** Find the binding that matches this key event, if any. */
export function matchShortcut(
  e: KeyboardEvent,
  mods: Modifiers,
): ShortcutBinding | undefined {
  return SHORTCUTS.find((s) => s.match(e, mods));
}

// --------------------------------------------------------------------------
// Formatting
// --------------------------------------------------------------------------

/** "66.7%" style zoom readout. */
export const formatZoom = (zoom: number): string => `${Math.round(zoom * 100)}%`;

/** "12.3 MB" style byte readout. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

/** "1024 × 768 px" document size readout. */
export const formatDocSize = (w: number, h: number): string =>
  `${w} × ${h} px`;
