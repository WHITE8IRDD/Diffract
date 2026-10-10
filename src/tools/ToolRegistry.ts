/**
 * Tool registry — the single source of truth for which tools exist, how they
 * appear in the toolbar, and which cursor they use.
 *
 * Phase 1 ships fully-functional Move / Brush / Eraser / Hand / Zoom /
 * Eyedropper. The remaining Phase 1 tools are registered with correct ids,
 * icons and shortcuts so the toolbar and menus are complete; their
 * interaction implementations land in the next step (the placeholder class
 * keeps the contract honest instead of silently doing the wrong thing).
 */

import type { Tool, ToolId } from "./types";
import { TextTool } from "./TextTool";
import { CloneStampTool } from "./CloneStampTool";
import { CropTool } from "./CropTool";
import { ShapeTool } from "./ShapeTools";
import { MoveTool } from "./MoveTool";
import { BrushTool } from "./BrushTool";
import { HandTool, ZoomTool, EyedropperTool } from "./ViewTools";
import { RectMarqueeTool } from "./SelectionTools";
import { PaintBucketTool, GradientTool } from "./FillTools";

/** Placeholder for tools whose interaction ships in the next phase step. */
export class PlaceholderTool implements Tool {
  constructor(
    readonly id: ToolId,
    readonly name: string,
    readonly cursor: string = "crosshair",
  ) {}
}

/** Toolbar groups (Photoshop's flyout structure). */
export interface ToolGroup {
  /** Tool shown on the button face. */
  primary: ToolId;
  /** Tools in the flyout (including the primary). */
  members: ToolId[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  { primary: "move", members: ["move"] },
  { primary: "marquee-rect", members: ["marquee-rect", "marquee-ellipse"] },
  { primary: "lasso", members: ["lasso", "polygon-lasso"] },
  { primary: "magic-wand", members: ["magic-wand", "quick-selection"] },
  { primary: "crop", members: ["crop"] },
  { primary: "eyedropper", members: ["eyedropper"] },
  { primary: "healing", members: ["healing", "patch", "red-eye"] },
  { primary: "brush", members: ["brush", "history-brush"] },
  { primary: "clone-stamp", members: ["clone-stamp"] },
  { primary: "eraser", members: ["eraser"] },
  { primary: "gradient", members: ["gradient", "paint-bucket"] },
  { primary: "dodge", members: ["dodge", "burn", "sponge"] },
  { primary: "pen", members: ["pen"] },
  { primary: "text", members: ["text"] },
  { primary: "path-select", members: ["path-select"] },
  { primary: "shape", members: ["shape", "shape-ellipse"] },
  { primary: "hand", members: ["hand"] },
  { primary: "zoom", members: ["zoom"] },
];

const registry = new Map<ToolId, Tool>();

function register(tool: Tool): void {
  registry.set(tool.id, tool);
}

register(new MoveTool());
register(new BrushTool("brush", false));
register(new BrushTool("eraser", true));
register(new HandTool());
register(new ZoomTool());
register(new EyedropperTool());

// Phase 1 step-2 placeholders (real implementations follow the plan order).
register(new RectMarqueeTool());
register(new PlaceholderTool("marquee-ellipse", "Elliptical Marquee Tool", "crosshair"));
register(new PlaceholderTool("lasso", "Lasso Tool", "crosshair"));
register(new PlaceholderTool("polygon-lasso", "Polygonal Lasso Tool", "crosshair"));
register(new PaintBucketTool());
register(new GradientTool());
register(new CropTool());
register(new TextTool());

// Phase 2/3/4 tools (registered so the keyboard map and menus are complete).
register(new PlaceholderTool("magic-wand", "Magic Wand Tool", "crosshair"));
register(new PlaceholderTool("quick-selection", "Quick Selection Tool", "crosshair"));
register(new PlaceholderTool("healing", "Spot Healing Brush Tool", "crosshair"));
register(new PlaceholderTool("patch", "Patch Tool", "crosshair"));
register(new PlaceholderTool("red-eye", "Red Eye Tool", "crosshair"));
register(new PlaceholderTool("history-brush", "History Brush Tool", "crosshair"));
register(new CloneStampTool());
register(new PlaceholderTool("dodge", "Dodge Tool", "crosshair"));
register(new PlaceholderTool("burn", "Burn Tool", "crosshair"));
register(new PlaceholderTool("sponge", "Sponge Tool", "crosshair"));
register(new PlaceholderTool("pen", "Pen Tool", "crosshair"));
register(new PlaceholderTool("path-select", "Path Selection Tool", "default"));
register(new ShapeTool());
register(new ShapeTool(true));

export function getTool(id: ToolId): Tool {
  return registry.get(id) ?? registry.get("move")!;
}

export function allTools(): Tool[] {
  return [...registry.values()];
}
