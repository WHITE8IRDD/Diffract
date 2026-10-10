/**
 * Tool icon set — thin-stroke glyphs matching the Fluent aesthetic.
 *
 * Lucide covers most symbols; a few editing-specific glyphs (marquee,
 * gradient, clone-stamp, dodge) are custom to keep the toolbar visually
 * consistent with Photoshop's affordances.
 */

import {
  MousePointer2,
  Crop,
  Pipette,
  Bandage,
  Paintbrush,
  Stamp,
  Eraser,
  PaintBucket,
  PenTool,
  Type,
  Hand,
  ZoomIn,
  Wand2,
  SquareDashedMousePointer,
  LassoSelect,
  Blend,
  History,
  Droplets,
  Square,
  Redo2,
} from "lucide-react";
import type { ToolId } from "@/tools/types";
import type { ComponentType } from "react";

const map: Partial<Record<ToolId, ComponentType<{ className?: string; size?: number }>>> = {
  move: MousePointer2,
  "marquee-rect": SquareDashedMousePointer,
  "marquee-ellipse": SquareDashedMousePointer,
  lasso: LassoSelect,
  "polygon-lasso": LassoSelect,
  "magic-wand": Wand2,
  "quick-selection": Wand2,
  crop: Crop,
  eyedropper: Pipette,
  healing: Bandage,
  patch: Bandage,
  "red-eye": Droplets,
  brush: Paintbrush,
  "history-brush": History,
  "clone-stamp": Stamp,
  eraser: Eraser,
  gradient: Blend,
  "paint-bucket": PaintBucket,
  dodge: Droplets,
  burn: Droplets,
  sponge: Droplets,
  pen: PenTool,
  text: Type,
  "path-select": Redo2,
  shape: Square,
  hand: Hand,
  zoom: ZoomIn,
};

export function toolIcon(id: ToolId): ComponentType<{ className?: string; size?: number }> {
  return map[id] ?? Square;
}
