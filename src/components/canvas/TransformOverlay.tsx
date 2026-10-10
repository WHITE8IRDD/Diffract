/** Free Transform: drag the selection box or its corner handles, Enter to apply, Esc to cancel. */
import { useEffect, useRef, useState } from "react";
import { getEngine } from "@/engine/registry";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useUIStore } from "@/store/useUIStore";
import type { PixelSnapshot } from "@/engine/snapshot";

type Box = { x: number; y: number; w: number; h: number };
const handles = ["nw", "ne", "sw", "se"] as const;

function contentBounds(data: ImageData): Box {
  let left = data.width, top = data.height, right = -1, bottom = -1;
  const pixels = data.data;
  for (let y = 0; y < data.height; y++) for (let x = 0; x < data.width; x++) {
    if (pixels[(y * data.width + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < 0 ? { x: 0, y: 0, w: data.width, h: data.height } :
    { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

export function TransformOverlay() {
  const visible = useUIStore(s => s.transformVisible);
  const setVisible = useUIStore(s => s.setTransformVisible);
  const zoom = useUIStore(s => s.zoom);
  const doc = useDocumentStore(s => s.documents.find(d => d.id === s.activeDocumentId));
  const layerId = doc?.activeLayerId;
  const [box, setBox] = useState<Box | null>(null);
  const original = useRef<{ snapshot: PixelSnapshot; bounds: Box; canvas: HTMLCanvasElement; docId: string; layerId: string } | null>(null);
  const drag = useRef<{ handle: string; start: { x: number; y: number }; box: Box } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!visible || !doc || !layerId) { original.current = null; setBox(null); return; }
    const engine = getEngine();
    const snapshot = engine?.captureSnapshot(layerId);
    if (!snapshot) { setVisible(false); return; }
    const canvas = document.createElement("canvas");
    canvas.width = doc.width; canvas.height = doc.height;
    canvas.getContext("2d")?.putImageData(snapshot.imageData, 0, 0);
    const bounds = contentBounds(snapshot.imageData);
    original.current = { snapshot, bounds, canvas, docId: doc.id, layerId };
    setBox(bounds);
    return () => { original.current = null; };
  }, [visible, doc?.id, layerId]); // snapshot only when entering or changing layers

  const draw = (next: Box) => {
    const o = original.current;
    const engine = getEngine();
    const surface = o && engine?.getSurface(o.layerId);
    if (!o || !surface) return;
    surface.ctx.clearRect(0, 0, surface.width, surface.height);
    // Only transform content bounds; untouched pixels outside are transparent.
    surface.ctx.drawImage(o.canvas, o.bounds.x, o.bounds.y, o.bounds.w, o.bounds.h,
      Math.round(next.x), Math.round(next.y), Math.max(1, Math.round(next.w)), Math.max(1, Math.round(next.h)));
    engine?.markDirty(o.layerId);
    setBox(next);
  };
  const finish = (apply: boolean) => {
    const o = original.current;
    if (o) {
      const engine = getEngine();
      if (!apply) engine?.restoreSnapshot(o.layerId, o.snapshot);
      else {
        const after = engine?.captureSnapshot(o.layerId);
        if (after && box && (box.x !== o.bounds.x || box.y !== o.bounds.y || box.w !== o.bounds.w || box.h !== o.bounds.h)) {
          const text = useDocumentStore.getState().documents.find(d => d.id === o.docId)
            ?.layers.find(l => l.id === o.layerId)?.text;
          const scaledText = text ? { ...text,
            x: Math.round(box.x + (text.x - o.bounds.x) * box.w / o.bounds.w),
            y: Math.round(box.y + (text.y - o.bounds.y) * box.h / o.bounds.h),
            fontSize: Math.max(1, Math.round(text.fontSize * box.h / o.bounds.h)),
          } : null;
          const applyText = (value: typeof text) => {
            if (!value) return;
            useDocumentStore.setState(s => ({ documents: s.documents.map(d => d.id !== o.docId ? d : {
              ...d, layers: d.layers.map(l => l.id === o.layerId ? { ...l, text: value } : l),
            }) }));
          };
          applyText(scaledText ?? undefined);
          useHistoryStore.getState().push(o.docId, {
            label: "Free Transform",
            undo: () => { getEngine()?.restoreSnapshot(o.layerId, o.snapshot); applyText(text); },
            redo: () => { getEngine()?.restoreSnapshot(o.layerId, after); applyText(scaledText ?? undefined); },
          });
          useDocumentStore.getState().setDocumentDirty(o.docId, true);
        }
      }
    }
    setVisible(false);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault(); e.stopPropagation(); finishRef.current(e.key === "Enter");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    const update = () => { const pan = getEngine()?.getPan(); if (pan) setPosition(pan); };
    update();
    const timer = window.setInterval(update, 50);
    return () => clearInterval(timer);
  }, [visible]);
  if (!visible || !box || !original.current) return null;
  const onDown = (e: React.PointerEvent, handle: string) => {
    e.preventDefault(); e.stopPropagation();
    drag.current = { handle, start: { x: e.clientX, y: e.clientY }, box };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    const dx = (e.clientX - d.start.x) / zoom, dy = (e.clientY - d.start.y) / zoom;
    const b = d.box;
    if (d.handle === "move") draw({ ...b, x: b.x + dx, y: b.y + dy });
    else {
      const left = d.handle.includes("w") ? Math.min(b.x + b.w - 1, b.x + dx) : b.x;
      const top = d.handle.includes("n") ? Math.min(b.y + b.h - 1, b.y + dy) : b.y;
      const right = d.handle.includes("e") ? Math.max(b.x + 1, b.x + b.w + dx) : b.x + b.w;
      const bottom = d.handle.includes("s") ? Math.max(b.y + 1, b.y + b.h + dy) : b.y + b.h;
      draw({ x: left, y: top, w: right - left, h: bottom - top });
    }
  };
  return <div className="absolute z-20 border border-accent cursor-move touch-none"
    style={{ left: position.x + box.x * zoom, top: position.y + box.y * zoom, width: box.w * zoom, height: box.h * zoom }}
    onPointerDown={e => onDown(e, "move")} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }}>
    {handles.map(h => <div key={h} className="absolute h-3 w-3 border border-accent bg-white cursor-nwse-resize"
      style={{ left: h.includes("w") ? -6 : "calc(100% - 6px)", top: h.includes("n") ? -6 : "calc(100% - 6px)" }}
      onPointerDown={e => onDown(e, h)} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} />)}
    <div className="absolute -top-10 left-0 flex gap-1 whitespace-nowrap rounded bg-surface px-2 py-1 text-xs text-foreground shadow-xl"
      onPointerDown={e => e.stopPropagation()}>
      <button type="button" onClick={() => finish(true)}>Apply · Enter</button>
      <span className="text-foreground-disabled">|</span>
      <button type="button" onClick={() => finish(false)}>Cancel · Esc</button>
    </div>
  </div>;
}
