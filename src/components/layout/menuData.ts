/**
 * Menu catalogue — the complete application menu tree.
 *
 * Every item carries its command id and display accelerator. Items beyond
 * the current phase are present but disabled and tagged with the phase in
 * which they ship, so the roadmap is visible inside the product.
 */

export type MenuActionId =
  | "file.new" | "file.open" | "file.openRecent" | "file.save" | "file.saveAs"
  | "file.export" | "file.exportAs" | "file.documentInfo" | "file.close"
  | "edit.undo" | "edit.redo" | "edit.cut" | "edit.copy" | "edit.paste"
  | "edit.fill" | "edit.stroke" | "edit.prefs"
  | "image.adjustments" | "image.canvasSize" | "image.imageSize" | "image.rotate" | "image.crop" | "image.trim"
  | "layer.new" | "layer.duplicate" | "layer.delete" | "layer.layerMask"
  | "layer.newAdjustment" | "layer.layerStyle" | "layer.mergeDown" | "layer.flatten"
  | "layer.group" | "layer.ungroup" | "layer.clippingMask"
  | "select.all" | "select.deselect" | "select.inverse" | "select.colorRange"
  | "select.expand" | "select.contract" | "select.feather" | "select.selectSubject" | "select.selectAndMask"
  | "filter.blur" | "filter.sharpen" | "filter.noise" | "filter.liquify" | "filter.cameraRaw" | "filter.stylize"
  | "view.zoomIn" | "view.zoomOut" | "view.zoomFit" | "view.zoomActual"
  | "view.toggleRulers" | "view.toggleGrid" | "view.toggleGuides"
  | "window.workspace" | "window.toggleToolbar" | "window.toggleRightDock"
  | "window.toggleLayers" | "window.toggleProperties" | "window.toggleHistory" | "window.toggleColor" | "window.toggleStatusBar"
  | "help.about" | "help.docs" | "help.shortcuts" | "help.aiModels" | "help.checkUpdates";

export interface MenuItem {
  id: MenuActionId;
  label: string;
  shortcut?: string;
  /** Disabled entries show which phase unlocks them. */
  phase?: 1 | 2 | 3 | 4;
  /** Toggle state (checkmark) resolved at render time. */
  kind?: "item" | "checkbox" | "separator" | "submenu";
  submenu?: MenuItem[];
}

export interface MenuDef {
  id: string;
  label: string;
  items: MenuItem[];
}

const sep = { id: "edit.fill" as MenuActionId, label: "-", kind: "separator" as const };

export const MENUS: MenuDef[] = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "file.new", label: "New…", shortcut: "Ctrl+N" },
      { id: "file.open", label: "Open…", shortcut: "Ctrl+O", phase: 1 },
      { id: "file.openRecent", label: "Open Recent", phase: 2, submenu: [] },
      sep,
      { id: "file.save", label: "Save", shortcut: "Ctrl+S", phase: 1 },
      { id: "file.saveAs", label: "Save As…", shortcut: "Ctrl+Shift+S", phase: 1 },
      sep,
      { id: "file.export", label: "Export", shortcut: "Ctrl+Shift+E", phase: 1 },
      { id: "file.exportAs", label: "Export As…", phase: 1 },
      sep,
      { id: "file.documentInfo", label: "Document Info…", phase: 2 },
      { id: "file.close", label: "Close", phase: 1 },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    items: [
      { id: "edit.undo", label: "Undo", shortcut: "Ctrl+Z" },
      { id: "edit.redo", label: "Redo", shortcut: "Ctrl+Shift+Z" },
      sep,
      { id: "edit.cut", label: "Cut", shortcut: "Ctrl+X", phase: 2 },
      { id: "edit.copy", label: "Copy", shortcut: "Ctrl+C", phase: 2 },
      { id: "edit.paste", label: "Paste", shortcut: "Ctrl+V", phase: 2 },
      sep,
      { id: "edit.fill", label: "Fill…", shortcut: "Shift+F5", phase: 1 },
      { id: "edit.stroke", label: "Stroke…", phase: 2 },
      sep,
      { id: "edit.prefs", label: "Preferences…", phase: 2 },
    ],
  },
  {
    id: "image",
    label: "Image",
    items: [
      { id: "image.adjustments", label: "Adjustments", phase: 2, submenu: [] },
      sep,
      { id: "image.imageSize", label: "Image Size…", shortcut: "Ctrl+Alt+I", phase: 2 },
      { id: "image.canvasSize", label: "Canvas Size…", shortcut: "Ctrl+Alt+C", phase: 1 },
      sep,
      { id: "image.rotate", label: "Image Rotation", phase: 2, submenu: [] },
      { id: "image.crop", label: "Crop", phase: 1 },
      { id: "image.trim", label: "Trim…", phase: 2 },
    ],
  },
  {
    id: "layer",
    label: "Layer",
    items: [
      { id: "layer.new", label: "New Layer…", shortcut: "Ctrl+Shift+N" },
      { id: "layer.duplicate", label: "Duplicate Layer…", shortcut: "Ctrl+J" },
      { id: "layer.delete", label: "Delete Layer", shortcut: "Delete" },
      sep,
      { id: "layer.layerMask", label: "Layer Mask", phase: 1, submenu: [] },
      { id: "layer.newAdjustment", label: "New Adjustment Layer", phase: 2, submenu: [] },
      { id: "layer.layerStyle", label: "Layer Style", phase: 2, submenu: [] },
      sep,
      { id: "layer.clippingMask", label: "Create Clipping Mask", shortcut: "Ctrl+Alt+G", phase: 1 },
      { id: "layer.group", label: "Group Layers", shortcut: "Ctrl+G", phase: 2 },
      { id: "layer.ungroup", label: "Ungroup", phase: 2 },
      sep,
      { id: "layer.mergeDown", label: "Merge Down", shortcut: "Ctrl+E", phase: 2 },
      { id: "layer.flatten", label: "Flatten Image", phase: 2 },
    ],
  },
  {
    id: "select",
    label: "Select",
    items: [
      { id: "select.all", label: "All", shortcut: "Ctrl+A" },
      { id: "select.deselect", label: "Deselect", shortcut: "Ctrl+D" },
      { id: "select.inverse", label: "Inverse", shortcut: "Ctrl+Shift+I" },
      sep,
      { id: "select.colorRange", label: "Color Range…", phase: 2 },
      { id: "select.expand", label: "Expand…", phase: 2 },
      { id: "select.contract", label: "Contract…", phase: 2 },
      { id: "select.feather", label: "Feather…", shortcut: "Shift+F6", phase: 2 },
      sep,
      { id: "select.selectSubject", label: "Select Subject", phase: 3 },
      { id: "select.selectAndMask", label: "Select and Mask…", phase: 2 },
    ],
  },
  {
    id: "filter",
    label: "Filter",
    items: [
      { id: "filter.blur", label: "Blur", phase: 2, submenu: [] },
      { id: "filter.sharpen", label: "Sharpen", phase: 2, submenu: [] },
      { id: "filter.noise", label: "Noise", phase: 2, submenu: [] },
      { id: "filter.stylize", label: "Stylize", phase: 2, submenu: [] },
      sep,
      { id: "filter.liquify", label: "Liquify…", phase: 2 },
      { id: "filter.cameraRaw", label: "Camera Raw Filter…", phase: 2 },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { id: "view.zoomIn", label: "Zoom In", shortcut: "Ctrl++" },
      { id: "view.zoomOut", label: "Zoom Out", shortcut: "Ctrl+-" },
      { id: "view.zoomFit", label: "Fit on Screen", shortcut: "Ctrl+0" },
      { id: "view.zoomActual", label: "100%", shortcut: "Ctrl+1" },
      sep,
      { id: "view.toggleRulers", label: "Rulers", shortcut: "Ctrl+R", kind: "checkbox" },
      { id: "view.toggleGrid", label: "Grid", shortcut: "Ctrl+'", kind: "checkbox" },
      { id: "view.toggleGuides", label: "Guides", shortcut: "Ctrl+;", kind: "checkbox", phase: 2 },
    ],
  },
  {
    id: "window",
    label: "Window",
    items: [
      { id: "window.workspace", label: "Workspace", phase: 1, submenu: [] },
      sep,
      { id: "window.toggleToolbar", label: "Tools", kind: "checkbox", phase: 1 },
      { id: "window.toggleRightDock", label: "Properties / Layers", kind: "checkbox", phase: 1 },
      sep,
      { id: "window.toggleColor", label: "Color", kind: "checkbox", phase: 1 },
      { id: "window.toggleLayers", label: "Layers", kind: "checkbox", phase: 1 },
      { id: "window.toggleProperties", label: "Properties", kind: "checkbox", phase: 1 },
      { id: "window.toggleHistory", label: "History", kind: "checkbox", phase: 1 },
      sep,
      { id: "window.toggleStatusBar", label: "Status Bar", kind: "checkbox", phase: 1 },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      { id: "help.docs", label: "Diffract Handbook", phase: 2 },
      { id: "help.shortcuts", label: "Keyboard Shortcuts", phase: 1 },
      { id: "help.aiModels", label: "AI Models…", phase: 3 },
      sep,
      { id: "help.checkUpdates", label: "Check for Updates…", phase: 2 },
      { id: "help.about", label: "About Diffract", phase: 1 },
    ],
  },
];
