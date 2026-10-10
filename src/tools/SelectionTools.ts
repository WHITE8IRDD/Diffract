/**
 * Rectangular Marquee (M) — drag to select a rectangle of the document.
 *
 * The selection clips brush, eraser, bucket and gradient edits. Clicking
 * without dragging deselects (Photoshop behaviour).
 */

import type { Tool, ToolPointerEvent } from "./types";
import type { PixelRect } from "@/engine/snapshot";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useSelectionStore } from "@/store/useSelectionStore";

export class RectMarqueeTool implements Tool {
  readonly id = "marquee-rect" as const;
  readonly name = "Rectangular Marquee Tool";
  readonly cursor = "crosshair";

  private start: { x: number; y: number } | null = null;
  private docId: string | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    const doc = useDocumentStore.getState().activeDocument();
    if (!doc) return;
    this.docId = doc.id;
    this.start = clampPoint(e.doc.x, e.doc.y, doc.width, doc.height);
    useSelectionStore.getState().setSelection(doc.id, null);
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (!this.start || !this.docId) return;
    const doc = useDocumentStore.getState().activeDocument();
    if (!doc) return;
    const cur = clampPoint(e.doc.x, e.doc.y, doc.width, doc.height);
    useSelectionStore.getState().setSelection(this.docId, rectBetween(this.start, cur));
  }

  onPointerUp(e: ToolPointerEvent): void {
    if (!this.start || !this.docId) return;
    const doc = useDocumentStore.getState().activeDocument();
    if (doc) {
      const cur = clampPoint(e.doc.x, e.doc.y, doc.width, doc.height);
      useSelectionStore.getState().setSelection(this.docId, rectBetween(this.start, cur));
    }
    this.start = null;
    this.docId = null;
  }

  cancel(): void {
    this.start = null;
    this.docId = null;
  }
}

function clampPoint(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return {
    x: Math.min(w, Math.max(0, Math.round(x))),
    y: Math.min(h, Math.max(0, Math.round(y))),
  };
}

function rectBetween(a: { x: number; y: number }, b: { x: number; y: number }): PixelRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}
