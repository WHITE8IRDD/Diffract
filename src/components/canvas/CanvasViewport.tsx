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
import { TransformOverlay } from "./TransformOverlay";
import { createText, updateText } from "@/tools/TextTool";
import { cn } from "@/utils/cn";

export function CanvasViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  usePixiEngine(canvasRef);

  const docCount = useDocumentStore((s) => s.documents.length);
  const homeVisible = useUIStore(s => s.homeVisible);
  const showHome = docCount === 0 || homeVisible;
  const activeDoc = useDocumentStore(s => s.documents.find(d => d.id === s.activeDocumentId) ?? null);
  const [panVersion, setPanVersion] = useState(0);
  const activeToolId = useUIStore((s) => s.activeToolId);
  const toolCursor = getTool(activeToolId).cursor;
  const [textEdit, setTextEdit] = useState<{ docId: string; layerId: string; x: number; y: number; content: string } | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const textFocusReady = useRef(false);
  const zoom = useUIStore(s => s.zoom);
  useEffect(() => {
    textFocusReady.current = false;
    if (!textEdit) return;
    // A canvas click still has a pointerup/default focus action pending. Focus
    // after it completes or the browser immediately blurs the new editor.
    const timer = window.setTimeout(() => {
      textRef.current?.focus();
      textFocusReady.current = true;
    }, 80);
    return () => window.clearTimeout(timer);
  }, [textEdit?.layerId]);

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
    if (activeToolId === "text") {
      const doc = useDocumentStore.getState().activeDocument();
      if (!doc || ev.doc.x < 0 || ev.doc.y < 0 || ev.doc.x >= doc.width || ev.doc.y >= doc.height) return;
      const layerId = createText(ev.doc.x, ev.doc.y);
      if (layerId) setTextEdit({ docId: doc.id, layerId, x: ev.doc.x, y: ev.doc.y, content: "" });
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
      setPanVersion(v => v + 1);
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
    // A captured pointer may leave the canvas while dragging. Do not cancel
    // the stroke until pointerup; otherwise painting at the edge disappears.
    useUIStore.getState().setCursor(0, 0, false);
  };
  const onPointerCancel = () => {
    getTool(activeToolId).cancel?.();
    panning.current = false;
    panLast.current = null;
  };

  /** Wheel = zoom at cursor (Photoshop). Shift+wheel = vertical pan. */
  const onWheel = (e: React.WheelEvent) => {
    if (showHome) return;
    const engine = getEngine();
    if (!engine) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const anchor = {
      x: (rect ? e.clientX - rect.left : 0),
      y: (rect ? e.clientY - rect.top : 0),
    };
    if (e.shiftKey) {
      engine.panBy(-e.deltaY, 0);
      setPanVersion(v => v + 1);
      return;
    }
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    engine.zoomBy(factor, anchor);
    const doc = useDocumentStore.getState().activeDocument();
    if (doc) useDocumentStore.getState().setView(doc.id, { zoom: engine.getZoom() });
  };

  // Guides are DOM-only overlays, never included in exports or tool input.
  void panVersion;
  const engine = getEngine();
  const origin = engine?.docToScreen(0, 0);
  const gridStep = Math.max(4, 32 * zoom);
  const rulerStep = zoom < .25 ? 500 : zoom < .5 ? 200 : zoom < 1 ? 100 : 50;
  const xTicks = activeDoc && origin ? Array.from({ length: Math.ceil(activeDoc.width / rulerStep) + 1 }, (_, i) => i * rulerStep) : [];
  const yTicks = activeDoc && origin ? Array.from({ length: Math.ceil(activeDoc.height / rulerStep) + 1 }, (_, i) => i * rulerStep) : [];
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
        "difr-canvas-surface relative flex-1 overflow-hidden",
        !showHome && cursorClass,
      )}
      onWheel={onWheel}
    >
      {/* The Pixi canvas is always mounted — the engine binds to it on startup. */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full",
          showHome && "invisible",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
      />
      {showHome && <div className="absolute inset-0"><EmptyState /></div>}
      {!showHome && activeDoc?.view.showGrid && origin && <div className="pointer-events-none absolute z-10 border border-accent/25"
        style={{ left: origin.x, top: origin.y, width: activeDoc.width * zoom, height: activeDoc.height * zoom,
          backgroundImage: "linear-gradient(to right, rgba(170,190,210,.17) 1px, transparent 1px), linear-gradient(to bottom, rgba(170,190,210,.17) 1px, transparent 1px)",
          backgroundSize: `${gridStep}px ${gridStep}px` }} />}
      {!showHome && activeDoc?.view.showRulers && origin && <>
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-[18px] overflow-hidden border-b border-stroke-strong bg-surface/90 font-mono text-[9px] text-foreground-tertiary">
          {xTicks.map(value => <span key={value} className="absolute bottom-0 h-3 border-l border-stroke-strong pl-0.5"
            style={{ left: origin.x + value * zoom }}>{value}</span>)}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 top-[18px] z-10 w-[18px] overflow-hidden border-r border-stroke-strong bg-surface/90 font-mono text-[8px] text-foreground-tertiary">
          {yTicks.map(value => <span key={value} className="absolute left-0 w-[18px] border-t border-stroke-strong"
            style={{ top: origin.y + value * zoom - 18 }}>{value}</span>)}
        </div>
      </>}
      {!showHome && textEdit && <textarea
        ref={textRef}
        aria-label="Type text; Ctrl+Enter to finish"
        placeholder="Type here…"
        className="absolute z-30 min-h-[64px] min-w-[220px] resize border border-accent bg-surface/90 p-1 text-white outline-none"
        style={{ left: getEngine()?.docToScreen(textEdit.x, textEdit.y).x ?? 0,
          top: getEngine()?.docToScreen(textEdit.x, textEdit.y).y ?? 0,
          fontSize: Math.max(14, 48 * zoom) }}
        value={textEdit.content}
        onChange={e => setTextEdit(t => t ? { ...t, content: e.target.value } : t)}
        onBlur={() => { if (!textFocusReady.current) return; updateText(textEdit.docId, textEdit.layerId, { content: textEdit.content }); setTextEdit(null); }}
        onKeyDown={e => { if (e.key === "Escape") { e.currentTarget.blur(); } if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.blur(); }}
      />}
      {!showHome && <TransformOverlay />}
    </div>
  );
}
