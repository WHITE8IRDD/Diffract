/**
 * React lifecycle for the PixiJS engine.
 *
 * Owns creation/destruction of the engine for a canvas element and keeps the
 * engine's scene graph in sync with the document store (layer order, blend
 * modes, opacity, visibility) via subscriptions.
 */

import { useEffect, useRef, type RefObject } from "react";
import { PixiEngine, registerEngine } from "@/engine";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useUIStore } from "@/store/useUIStore";

export function usePixiEngine(
  canvasRef: RefObject<HTMLCanvasElement | null>,
): { engineRef: React.RefObject<PixiEngine | null> } {
  const engineRef = useRef<PixiEngine | null>(null);

  // ── create / destroy ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    const engine = new PixiEngine();
    engineRef.current = engine;
    registerEngine(engine);

    const parent = canvas.parentElement;
    const fitToParent = () => {
      if (disposed || !parent) return;
      engine.resize(parent.clientWidth, parent.clientHeight);
    };

    // Init asynchronously (WebGPU/WebGL negotiation), then size the renderer
    // to the container — ResizeObserver's initial fire can beat `init()`.
    void engine
      .init(canvas, {
        onZoomChange: (zoom) => useUIStore.getState().setZoom(zoom),
        onPointerDocMove: (x, y, inside) =>
          useUIStore.getState().setCursor(x, y, inside),
      })
      .then(fitToParent);

    const observer = new ResizeObserver(fitToParent);
    if (parent) observer.observe(parent);

    return () => {
      disposed = true;
      observer.disconnect();
      registerEngine(null);
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvasRef]);

  // ── store → engine sync ───────────────────────────────────────────────
  useEffect(() => {
    // 1) Active document switches the visible scene.
    const unsubDoc = useDocumentStore.subscribe((state) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setActiveDocument(state.activeDocumentId);
      const doc = state.documents.find((d) => d.id === state.activeDocumentId);
      if (doc) engine.syncLayerOrderAndProps(doc.id, doc.layers);
    });

    // 2) Fit on first document of a tab set.
    const unsubFit = useDocumentStore.subscribe((state, prev) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (state.activeDocumentId && state.activeDocumentId !== prev.activeDocumentId) {
        engine.fitToScreen();
      }
    });

    return () => {
      unsubDoc();
      unsubFit();
    };
  }, []);

  return { engineRef };
}
