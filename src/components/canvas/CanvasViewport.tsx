/**
 * CanvasViewport — the centre-stage editing surface.
 *
 * Responsibilities:
 *  * host the PixiJS canvas and forward resize/zoom/pan;
 *  * translate DOM pointer events into document-space tool events;
 *  * Photoshop navigation: wheel zooms at the cursor, Space or middle-drag
 *    temporarily pans, Ctrl+0 fits, Ctrl+1 is 100 %;
 *  * cursor reflection for the active tool (brush circle in Phase 2).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePixiEngine } from "@/hooks/usePixiEngine";
import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { getEngine } from "@/engine/registry";
import { getTool } from "@/tools/ToolRegistry";
import type { ToolPointerEvent } from "@/tools/types";
import { EmptyState } from "./EmptyState";
import { cn } from "@/utils/cn";

export function CanvasViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  usePixiEngine(canvasRef);

  const docCount = useDocumentStore((s) => s.documents.length);
  const activeToolId = useUIStore((s) => s.activeToolId);
  const toolCursor = getTool(activeToolId).cursor;

  // Space-bar temporary hand pan.
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panning = useRef(false);
  const panLast = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        setSpaceHeld(true);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /** Build the tool event from a DOM pointer event. */
  const toolEvent = useCallback((e: React.PointerEvent): ToolPointerEvent | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const engine = getEngine();
    if (!rect || !engine) return null;
    const viewX = e.clientX - rect.left;
    const viewY = e.clientY - rect.top;
    const doc = engine.screenToDoc(viewX, viewY);
    return {
      doc,
      view: { x: viewX, y: viewY },
      pressure: e.pressure > 0 ? e.pressure : 1,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
      button: e.button,
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const ev = toolEvent(e);
    if (!ev) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Middle button or Space = pan (Photoshop navigation).
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      panning.current = true;
      panLast.current = { x: ev.view.x, y: ev.view.y };
      return;
    }
    getTool(activeToolId).onPointerDown?.(ev);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const ev = toolEvent(e);
    if (!ev) return;

    // Status bar cursor readout.
    useUIStore.getState().setCursor(ev.doc.x, ev.doc.y, true);

    if (panning.current && panLast.current) {
      const engine = getEngine();
      engine?.panBy(ev.view.x - panLast.current.x, ev.view.y - panLast.current.y);
      panLast.current = { x: ev.view.x, y: ev.view.y };
      return;
    }
    getTool(activeToolId).onPointerMove?.(ev);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const ev = toolEvent(e);
    if (panning.current) {
      panning.current = false;
      panLast.current = null;
      return;
    }
    if (ev) getTool(activeToolId).onPointerUp?.(ev);
  };

  const onPointerLeave = () => {
    useUIStore.getState().setCursor(0, 0, false);
    getTool(activeToolId).cancel?.();
    panning.current = false;
    panLast.current = null;
  };

  /** Wheel = zoom at cursor (Photoshop). Shift+wheel = vertical pan. */
  const onWheel = (e: React.WheelEvent) => {
    const engine = getEngine();
    if (!engine) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const anchor = {
      x: (rect ? e.clientX - rect.left : 0),
      y: (rect ? e.clientY - rect.top : 0),
    };
    if (e.shiftKey) {
      engine.panBy(-e.deltaY, 0);
      return;
    }
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    engine.zoomBy(factor, anchor);
    const doc = useDocumentStore.getState().activeDocument();
    if (doc) useDocumentStore.getState().setView(doc.id, { zoom: engine.getZoom() });
  };

  const cursorClass = spaceHeld
    ? "cursor-grab active:cursor-grabbing"
    : toolCursor === "crosshair"
      ? "cursor-crosshair"
      : toolCursor === "move"
        ? "cursor-move"
        : toolCursor === "zoom-in"
          ? "cursor-zoom-in"
          : toolCursor === "text"
            ? "cursor-text"
            : "cursor-default";

  return (
    <div
      ref={containerRef}
      className={cn(
        "difr-checkerboard relative flex-1 overflow-hidden",
        cursorClass,
      )}
      onWheel={onWheel}
    >
      {/* The Pixi canvas is always mounted — the engine binds to it on startup. */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full",
          docCount === 0 && "invisible",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      />
      {docCount === 0 && (
        <div className="absolute inset-0">
          <EmptyState />
        </div>
      )}
      {/* Rulers are Phase 2 — the view flag already exists per document. */}
    </div>
  );
}
