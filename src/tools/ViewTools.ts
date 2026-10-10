/**
 * View tools: Hand (H), Zoom (Z), Eyedropper (I).
 * These never touch document pixels.
 */

import type { Tool, ToolPointerEvent } from "./types";
import type { Point } from "@/utils/math";
import { clamp } from "@/utils/math";
import { getEngine } from "@/engine/registry";
import { useColorStore } from "@/store/useColorStore";

export class HandTool implements Tool {
  readonly id = "hand" as const;
  readonly name = "Hand Tool";
  readonly cursor = "grab";

  private dragging = false;
  private last: Point | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    this.dragging = true;
    this.last = { x: e.view.x, y: e.view.y };
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (!this.dragging || !this.last) return;
    getEngine()?.panBy(e.view.x - this.last.x, e.view.y - this.last.y);
    this.last = { x: e.view.x, y: e.view.y };
  }

  onPointerUp(): void {
    this.dragging = false;
    this.last = null;
  }

  cancel(): void {
    this.dragging = false;
    this.last = null;
  }
}

export class ZoomTool implements Tool {
  readonly id = "zoom" as const;
  readonly name = "Zoom Tool";
  readonly cursor = "zoom-in";

  onPointerDown(e: ToolPointerEvent): void {
    // Alt = zoom out, otherwise in (Photoshop).
    getEngine()?.zoomBy(e.alt ? 1 / 1.5 : 1.5, e.view);
  }
}

export class EyedropperTool implements Tool {
  readonly id = "eyedropper" as const;
  readonly name = "Eyedropper Tool";
  readonly cursor = "crosshair";

  private sampling = false;

  onPointerDown(e: ToolPointerEvent): void {
    this.sampling = true;
    this.sample(e);
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (this.sampling) this.sample(e);
  }

  onPointerUp(): void {
    this.sampling = false;
  }

  cancel(): void {
    this.sampling = false;
  }

  private sample(e: ToolPointerEvent): void {
    const engine = getEngine();
    const docId = documentIdForSample();
    const doc = docId ? engine?.compositeToCanvas(docId) : null;
    if (!doc) return;
    const ctx = doc.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const x = Math.round(clamp(e.doc.x, 0, doc.width - 1));
    const y = Math.round(clamp(e.doc.y, 0, doc.height - 1));
    const px = ctx.getImageData(x, y, 1, 1).data;
    useColorStore.getState().setForeground({
      r: px[0]!,
      g: px[1]!,
      b: px[2]!,
      a: (px[3] ?? 255) / 255,
    });
  }
}

/**
 * Eyedropper samples the composite of the *active* document. Resolved through
 * a tiny indirection so this module never imports the document store types.
 */
let documentIdForSample: () => string | null = () => null;

export function setSampleDocumentResolver(fn: () => string | null): void {
  documentIdForSample = fn;
}
