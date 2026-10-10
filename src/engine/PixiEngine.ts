/**
 * PixiEngine — WebGPU-first canvas compositor.
 *
 * Architecture
 * ------------
 *   Application (WebGPU preferred, WebGL2 fallback)
 *     └─ stage
 *         ├─ checkerboard   (transparency backdrop, screen-space)
 *         └─ world          (pan + zoom transform)
 *             └─ docRoot    (per-document origin)
 *                 └─ layer sprites (bottom → top), each with blend/opacity/mask
 *
 * Performance rules that hold from Phase 1 onwards:
 *  * **Render on demand** — the ticker is stopped; `requestRender()` batches a
 *    single `renderer.render()` per animation frame. Idle CPU usage ≈ 0,
 *    which keeps the "< 200 MB idle RAM / fast launch" budgets honest.
 *  * **Texture upload on dirty only** — brush strokes mark their surface
 *    dirty; the engine re-uploads at most once per frame.
 *  * **One container per document** — switching tabs toggles visibility, so
 *    pan/zoom state is preserved per document.
 *
 * WebGPU gives the raw throughput for 8K pan/zoom; the same scene graph runs
 * on WebGL2 when WebGPU is unavailable (the fallback is automatic).
 */

import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
  TilingSprite,
  type BLEND_MODES,
} from "pixi.js";
import type { DocumentState } from "@/store/types";
import type { BlendModeId } from "@/utils/blendModes";
import type { MaskSurface, RasterSurface } from "./types";
import { clipRect, type PixelRect, type PixelSnapshot } from "./snapshot";
import { clamp } from "@/utils/math";

/** Zoom limits (Photoshop-like): 0.1 % … 3200 %. */
export const MIN_ZOOM = 0.001;
export const MAX_ZOOM = 32;

/**
 * Diffract blend ids → PixiJS blend modes.
 *
 * PixiJS v8 models blend modes as string-literal types; our ids happen to
 * match its spellings exactly, so the map is explicit but trivial. Phase 2
 * extends both tables with the full Photoshop set.
 */
const BLEND_MAP: Record<BlendModeId, BLEND_MODES> = {
  normal: "normal",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  "soft-light": "soft-light",
  "hard-light": "hard-light",
  "color-dodge": "color-dodge",
  "color-burn": "color-burn",
  difference: "difference",
};

interface DocRoot {
  id: string;
  container: Container;
  /** Checkerboard + artboard outline, sized to the document. */
  backdrop: TilingSprite;
  frame: Graphics;
  surfaces: Map<string, RasterSurface>;
  width: number;
  height: number;
  /** Dashed selection outline (drawn above layers). */
  selection: Graphics | null;
}

export interface EngineEvents {
  onZoomChange?: (zoom: number) => void;
  onPointerDocMove?: (x: number, y: number, inside: boolean) => void;
}

export class PixiEngine {
  readonly app = new Application();
  ready = false;
  private disposed = false;
  private initialized = false;
  private tornDown = false;
  private initPromise: Promise<void> | null = null;

  /** Screen-space pan (CSS px) and zoom. */
  private panX = 0;
  private panY = 0;
  private zoom = 1;

  private world = new Container();
  private docs = new Map<string, DocRoot>();
  private activeDocId: string | null = null;
  private renderQueued = false;
  private events: EngineEvents = {};
  private checkerTile: Texture | null = null;

  // ── lifecycle ──────────────────────────────────────────────────────────

  async init(canvas: HTMLCanvasElement, events: EngineEvents = {}): Promise<void> {
    this.events = events;
    this.initPromise = this.start(canvas);
    return this.initPromise;
  }

  private async start(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      // WebGL is available in desktop WebView2 and ordinary browsers; WebGPU
      // initialization can reject before the first document ever appears.
      preference: "webgl",
      backgroundAlpha: 0,
      // The renderer paints only when dirty. Without preservation WebGL clears
      // the backbuffer after presenting, leaving a blank artboard on idle frames.
      preserveDrawingBuffer: true,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      powerPreference: "high-performance",
    });
    this.initialized = true;
    // destroy() ran while the renderer was still starting up (React StrictMode
    // unmounts/remounts effects in dev). Tear down now that it is safe to do so.
    if (this.disposed) {
      this.teardown();
      return;
    }
    this.app.stage.addChild(this.world);
    this.app.stage.sortableChildren = false;
    // On-demand rendering: stop the ticker, render explicitly.
    this.app.ticker.stop();
    this.ready = true;
    this.requestRender();
  }

  destroy(): void {
    this.disposed = true;
    this.ready = false;
    if (!this.initPromise) {
      this.teardown();
      return;
    }
    // Calling app.destroy() before app.init() settles throws (the renderer's
    // resize plugin is not attached yet), so defer teardown until it has.
    void this.initPromise
      .then(() => this.teardown())
      .catch(error => console.warn("Renderer initialization stopped during shutdown", error));
  }

  private teardown(): void {
    if (this.tornDown || !this.initialized) return;
    this.tornDown = true;
    for (const doc of this.docs.values()) this.destroyDocRoot(doc);
    this.docs.clear();
    // The <canvas> is owned by React — keep it in the DOM (removeView: false).
    this.app.destroy({ removeView: false }, { children: true });
    this.ready = false;
  }

  // ── viewport ───────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    if (!this.ready || width <= 0 || height <= 0) return;
    const oldWidth = this.viewportWidth();
    const oldHeight = this.viewportHeight();
    if (width === oldWidth && height === oldHeight) return;
    this.app.renderer.resize(width, height);
    // The sidebars and tabs change the viewport size when leaving Home. Keep
    // the same document point at the centre instead of leaving the artboard
    // centred in the former (larger) Home viewport.
    if (this.activeDocRoot()) {
      this.panX += (width - oldWidth) / 2;
      this.panY += (height - oldHeight) / 2;
    }
    this.applyTransform();
    // Resizing clears the WebGL drawing buffer even with preservation enabled.
    this.requestRender();
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(zoom: number, anchorScreen?: { x: number; y: number }): void {
    const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const anchor = anchorScreen ?? {
      x: this.app.renderer.width / (this.app.renderer.resolution || 1) / 2,
      y: this.app.renderer.height / (this.app.renderer.resolution || 1) / 2,
    };
    // Keep the anchor point stationary on screen.
    this.panX = anchor.x - ((anchor.x - this.panX) * next) / this.zoom;
    this.panY = anchor.y - ((anchor.y - this.panY) * next) / this.zoom;
    this.zoom = next;
    this.applyTransform();
    this.events.onZoomChange?.(this.zoom);
    this.requestRender();
  }

  zoomBy(factor: number, anchorScreen?: { x: number; y: number }): void {
    this.setZoom(this.zoom * factor, anchorScreen);
  }

  setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.applyTransform();
    this.requestRender();
  }

  panBy(dx: number, dy: number): void {
    this.setPan(this.panX + dx, this.panY + dy);
  }

  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  /** Fit the active document to the viewport with margin. */
  fitToScreen(margin = 48): void {
    const doc = this.activeDocRoot();
    if (!doc) return;
    const vw = this.viewportWidth();
    const vh = this.viewportHeight();
    const z = clamp(
      Math.min((vw - margin * 2) / doc.width, (vh - margin * 2) / doc.height),
      MIN_ZOOM,
      1,
    );
    this.zoom = z;
    this.panX = (vw - doc.width * z) / 2;
    this.panY = (vh - doc.height * z) / 2;
    this.applyTransform();
    this.events.onZoomChange?.(this.zoom);
    this.requestRender();
  }

  /** Viewport size in CSS pixels. */
  viewportWidth(): number {
    return this.app.renderer.width / (this.app.renderer.resolution || 1);
  }
  viewportHeight(): number {
    return this.app.renderer.height / (this.app.renderer.resolution || 1);
  }

  /** Screen (CSS px) → document coordinates. */
  screenToDoc(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.panX) / this.zoom, y: (y - this.panY) / this.zoom };
  }

  docToScreen(x: number, y: number): { x: number; y: number } {
    return { x: x * this.zoom + this.panX, y: y * this.zoom + this.panY };
  }

  // ── documents & layers ─────────────────────────────────────────────────

  /** Make `docId` the visible document (others are hidden). */
  setActiveDocument(docId: string | null): void {
    this.activeDocId = docId;
    for (const [id, root] of this.docs) root.container.visible = id === docId;
    this.requestRender();
  }

  /** Allocate the pixel surface for a new layer. */
  createLayerSurface(
    doc: DocumentState,
    layerId: string,
    fill: "white" | "transparent",
  ): void {
    const root = this.docs.get(doc.id) ?? this.createDocRoot(doc);
    if (root.surfaces.has(layerId)) return;

    const surface = this.makeSurface(layerId, root.width, root.height);
    if (fill === "white") {
      surface.ctx.fillStyle = "#ffffff";
      surface.ctx.fillRect(0, 0, root.width, root.height);
      surface.dirty = true;
    }
    root.surfaces.set(layerId, surface);
    root.container.addChildAt(surface.sprite, 2); // above checker + frame
    this.syncLayerOrderAndProps(doc.id, doc.layers);
    this.requestRender();
  }

  deleteLayerSurface(layerId: string): void {
    for (const root of this.docs.values()) {
      const surface = root.surfaces.get(layerId);
      if (!surface) continue;
      root.container.removeChild(surface.sprite);
      surface.sprite.destroy();
      surface.texture.destroy(true);
      if (surface.mask) {
        surface.sprite.mask = null;
        surface.mask.sprite.destroy();
        surface.mask.texture.destroy(true);
      }
      root.surfaces.delete(layerId);
    }
    this.requestRender();
  }

  duplicateLayerSurface(sourceId: string, targetId: string): void {
    for (const root of this.docs.values()) {
      const source = root.surfaces.get(sourceId);
      if (!source) continue;
      const copy = this.makeSurface(targetId, root.width, root.height);
      copy.ctx.drawImage(source.canvas, 0, 0);
      copy.dirty = true;
      root.surfaces.set(targetId, copy);
      root.container.addChildAt(copy.sprite, 2);
    }
    this.requestRender();
  }

  getSurface(layerId: string): RasterSurface | null {
    for (const root of this.docs.values()) {
      const s = root.surfaces.get(layerId);
      if (s) return s;
    }
    return null;
  }

  /** Mark a layer's pixels dirty (re-upload on next frame). */
  markDirty(layerId: string): void {
    const surface = this.getSurface(layerId);
    if (surface) {
      surface.dirty = true;
      this.requestRender();
    }
  }

  createMaskSurface(layerId: string, maskId: string): void {
    const surface = this.getSurface(layerId);
    if (!surface || surface.mask) return;
    const mask = this.makeMask(maskId, surface.width, surface.height);
    // White = fully visible initially.
    mask.ctx.fillStyle = "#ffffff";
    mask.ctx.fillRect(0, 0, surface.width, surface.height);
    mask.dirty = true;
    surface.mask = mask;
    surface.sprite.mask = mask.sprite;
    surface.sprite.parent?.addChild(mask.sprite);
    this.requestRender();
  }

  deleteMaskSurface(layerId: string): void {
    const surface = this.getSurface(layerId);
    if (!surface?.mask) return;
    surface.sprite.mask = null;
    surface.mask.sprite.parent?.removeChild(surface.mask.sprite);
    surface.mask.sprite.destroy();
    surface.mask.texture.destroy(true);
    surface.mask = null;
    this.requestRender();
  }

  destroyDocument(docId: string): void {
    const root = this.docs.get(docId);
    if (!root) return;
    this.destroyDocRoot(root);
    this.docs.delete(docId);
    if (this.activeDocId === docId) this.activeDocId = null;
    this.requestRender();
  }

  /** Rebuild raster surfaces for a resized/cropped document. Pixels are copied by
   * the caller; this also updates the artboard, textures and export dimensions. */
  replaceDocumentPixels(doc: DocumentState, pixels: Map<string, ImageData>, masks?: Map<string, ImageData>): void {
    this.destroyDocument(doc.id);
    this.setActiveDocument(doc.id);
    for (const layer of doc.layers) {
      this.createLayerSurface(doc, layer.id, "transparent");
      const image = pixels.get(layer.id);
      const surface = this.getSurface(layer.id);
      if (image && surface) {
        surface.ctx.putImageData(image, 0, 0);
        this.markDirty(layer.id);
      }
      if (layer.mask && surface) {
        this.createMaskSurface(layer.id, layer.mask.id);
        const mask = masks?.get(layer.id);
        if (mask && surface.mask) {
          surface.mask.ctx.putImageData(mask, 0, 0);
          surface.mask.dirty = true;
        }
      }
    }
    this.syncLayerOrderAndProps(doc.id, doc.layers);
    this.fitToScreen();
  }

  /** Draw (or clear, with `null`) the marching-ants selection outline. */
  setSelectionOverlay(docId: string, rect: PixelRect | null): void {
    const root = this.docs.get(docId);
    if (!root) return;
    if (!root.selection) {
      root.selection = new Graphics();
      root.container.addChild(root.selection);
    }
    const g = root.selection;
    g.clear();
    if (rect && rect.w > 0 && rect.h > 0) {
      const line = 1 / this.zoom; // stays 1 screen pixel wide at 100 %
      // Dashed outline: white dashes over a dark base so it reads on any pixels.
      strokeDashedRect(g, rect, 6 / this.zoom, { width: line * 2, color: 0x000000, alpha: 0.55 });
      strokeDashedRect(g, rect, 6 / this.zoom, { width: line, color: 0xffffff, alpha: 0.95 });
    }
    this.requestRender();
  }

  // ── sync from the document store ───────────────────────────────────────

  /**
   * Reconcile the Pixi scene with the store's layer stack:
   * z-order, blend mode, opacity, visibility, locks.
   * Cheap enough to run after every store change (metadata only).
   */
  syncLayerOrderAndProps(
    docId: string,
    layers: {
      id: string;
      visible: boolean;
      opacity: number;
      fillOpacity?: number;
      blendMode: BlendModeId;
    }[],
  ): void {
    const root = this.docs.get(docId);
    if (!root) return;
    let z = 2; // above checker + frame
    const liveIds = new Set(layers.map(layer => layer.id));
    for (const [id, surface] of root.surfaces) {
      if (!liveIds.has(id)) surface.sprite.visible = false;
    }
    for (const layer of layers) {
      const surface = root.surfaces.get(layer.id);
      if (!surface) continue;
      root.container.setChildIndex(surface.sprite, z++);
      surface.sprite.visible = layer.visible;
      // Until layer effects exist, Fill controls the pixel content's opacity;
      // combine it with the layer-wide opacity for display and CPU export.
      surface.sprite.alpha = layer.opacity * (layer.fillOpacity ?? 1);
      surface.sprite.blendMode = BLEND_MAP[layer.blendMode] ?? "normal";
    }
    // Selection overlay must stay above every layer, even after reordering.
    if (root.selection) root.container.setChildIndex(root.selection, root.container.children.length - 1);
    this.requestRender();
  }

  // ── export ─────────────────────────────────────────────────────────────

  /**
   * Flatten the document to an offscreen canvas (CPU composite using the same
   * blend/opacity rules as the GPU path). Used by Export As ▸ PNG/JPEG/WebP.
   */
  compositeToCanvas(docId: string): HTMLCanvasElement | null {
    const root = this.docs.get(docId);
    if (!root) return null;
    const out = document.createElement("canvas");
    out.width = root.width;
    out.height = root.height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    // Bottom → top is child order after index 2.
    for (const layer of this.layersBottomToTop(root)) {
      const surface = root.surfaces.get(layer.id);
      if (!surface || !layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      const cssBlend = blendCssName(layer.blendMode);
      ctx.globalCompositeOperation =
        cssBlend === "normal" ? "source-over" : (cssBlend as GlobalCompositeOperation);
      ctx.drawImage(surface.canvas, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    return out;
  }

  /**
   * Snapshot a layer's pixels (history). Pass `rect` to capture only that
   * area — brush strokes do this so history stays small.
   */
  captureSnapshot(layerId: string, rect?: PixelRect): PixelSnapshot | null {
    const surface = this.getSurface(layerId);
    if (!surface) return null;
    const r = clipRect(
      rect ?? { x: 0, y: 0, w: surface.width, h: surface.height },
      surface.width,
      surface.height,
    );
    if (r.w <= 0 || r.h <= 0) return null;
    return {
      x: r.x,
      y: r.y,
      imageData: surface.ctx.getImageData(r.x, r.y, r.w, r.h),
    };
  }

  /** Restore a snapshot (history undo/redo). */
  restoreSnapshot(layerId: string, snapshot: PixelSnapshot): void {
    const surface = this.getSurface(layerId);
    if (!surface) return;
    surface.ctx.putImageData(snapshot.imageData, snapshot.x, snapshot.y);
    surface.dirty = true;
    this.requestRender();
  }

  /**
   * Visually offset a layer while a Move drag is in progress. Pixels are not
   * changed; the offset is applied on commit (see MoveTool).
   */
  setLayerOffset(layerId: string, dx: number, dy: number): void {
    const surface = this.getSurface(layerId);
    if (!surface) return;
    surface.sprite.position.set(dx, dy);
    this.requestRender();
  }

  /**
   * Colour of the flattened document at one pixel (Eyedropper). Composites
   * just that pixel across visible layers instead of the whole document.
   */
  sampleComposite(
    docId: string,
    x: number,
    y: number,
  ): { r: number; g: number; b: number; a: number } | null {
    const root = this.docs.get(docId);
    if (!root) return null;
    const px = Math.min(root.width - 1, Math.max(0, Math.round(x)));
    const py = Math.min(root.height - 1, Math.max(0, Math.round(y)));
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const ctx = probe.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    for (const layer of this.layersBottomToTop(root)) {
      const surface = root.surfaces.get(layer.id);
      if (!surface || !layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      const cssBlend = blendCssName(layer.blendMode);
      ctx.globalCompositeOperation =
        cssBlend === "normal" ? "source-over" : (cssBlend as GlobalCompositeOperation);
      ctx.drawImage(surface.canvas, px, py, 1, 1, 0, 0, 1, 1);
    }
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0] ?? 0, g: d[1] ?? 0, b: d[2] ?? 0, a: (d[3] ?? 0) / 255 };
  }

  // ── rendering ──────────────────────────────────────────────────────────

  /** Schedule a render for the next animation frame (coalesced). */
  requestRender(): void {
    if (!this.ready || this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      if (!this.ready) return;
      this.uploadDirty();
      this.app.render();
    });
  }

  private uploadDirty(): void {
    for (const root of this.docs.values()) {
      for (const surface of root.surfaces.values()) {
        if (surface.dirty) {
          surface.texture.source.update();
          surface.dirty = false;
        }
        if (surface.mask?.dirty) {
          surface.mask.texture.source.update();
          surface.mask.dirty = false;
        }
      }
    }
  }

  private applyTransform(): void {
    this.world.scale.set(this.zoom);
    this.world.position.set(this.panX, this.panY);
  }

  // ── internals ──────────────────────────────────────────────────────────

  private activeDocRoot(): DocRoot | null {
    return this.activeDocId ? (this.docs.get(this.activeDocId) ?? null) : null;
  }

  private layersBottomToTop(
    root: DocRoot,
  ): { id: string; visible: boolean; opacity: number; blendMode: BlendModeId }[] {
    // Child order after index 2 encodes z-order; reconstruct descriptors from
    // the sprites we manage.
    const out: {
      id: string;
      visible: boolean;
      opacity: number;
      blendMode: BlendModeId;
    }[] = [];
    root.container.children.forEach((child, i) => {
      if (i < 2) return;
      for (const [id, surface] of root.surfaces) {
        if (surface.sprite === child) {
          out.push({
            id,
            visible: child.visible,
            opacity: child.alpha,
            blendMode: blendModeFromPixi(child.blendMode),
          });
        }
      }
    });
    return out;
  }

  private createDocRoot(doc: DocumentState): DocRoot {
    const container = new Container();
    this.world.addChild(container);

    const checker = this.checkerTexture();
    // 16 px checker tile at natural scale (tileScale defaults to 1).
    const backdrop = new TilingSprite({
      texture: checker,
      width: doc.width,
      height: doc.height,
    });
    container.addChild(backdrop);

    const frame = new Graphics()
      .rect(0, 0, doc.width, doc.height)
      .stroke({ width: 1, color: 0x505050, alpha: 1 });
    container.addChild(frame);

    const root: DocRoot = {
      id: doc.id,
      container,
      backdrop,
      frame,
      surfaces: new Map(),
      width: doc.width,
      height: doc.height,
      selection: null,
    };
    this.docs.set(doc.id, root);
    container.visible = doc.id === this.activeDocId;
    return root;
  }

  private destroyDocRoot(root: DocRoot): void {
    for (const surface of root.surfaces.values()) {
      surface.sprite.destroy();
      surface.texture.destroy(true);
      if (surface.mask) {
        surface.mask.sprite.destroy();
        surface.mask.texture.destroy(true);
      }
    }
    root.surfaces.clear();
    root.backdrop.destroy();
    root.frame.destroy();
    root.container.destroy({ children: true });
  }

  private makeSurface(
    id: string,
    width: number,
    height: number,
  ): RasterSurface {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const texture = Texture.from(canvas);
    texture.source.scaleMode = "nearest";
    const sprite = new Sprite(texture);
    sprite.width = width;
    sprite.height = height;
    return { id, width, height, canvas, ctx, texture, sprite, dirty: true, mask: null };
  }

  private makeMask(id: string, width: number, height: number): MaskSurface {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const texture = Texture.from(canvas);
    texture.source.scaleMode = "nearest";
    const sprite = new Sprite(texture);
    sprite.width = width;
    sprite.height = height;
    return { id, canvas, ctx, texture, sprite, dirty: true };
  }

  /** 16 px checker tile texture (generated once). */
  private checkerTexture(): Texture {
    if (this.checkerTile) return this.checkerTile;
    const tile = document.createElement("canvas");
    tile.width = 16;
    tile.height = 16;
    const ctx = tile.getContext("2d")!;
    ctx.fillStyle = "#24262a";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#191b1e";
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillRect(8, 8, 8, 8);
    this.checkerTile = Texture.from(tile);
    return this.checkerTile;
  }
}

/** Dashed rectangle outline (Pixi Graphics has no dash style). */
function strokeDashedRect(
  g: Graphics,
  r: PixelRect,
  dash: number,
  style: { width: number; color: number; alpha: number },
): void {
  const x0 = r.x;
  const y0 = r.y;
  const x1 = r.x + r.w;
  const y1 = r.y + r.h;
  const edges: [number, number, number, number][] = [
    [x0, y0, x1, y0],
    [x1, y0, x1, y1],
    [x1, y1, x0, y1],
    [x0, y1, x0, y0],
  ];
  for (const [ax, ay, bx, by] of edges) {
    const len = Math.hypot(bx - ax, by - ay);
    if (len === 0) continue;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    for (let d = 0; d < len; d += dash * 2) {
      const e = Math.min(d + dash, len);
      g.moveTo(ax + ux * d, ay + uy * d).lineTo(ax + ux * e, ay + uy * e);
    }
  }
  g.stroke(style);
}

// ---------------------------------------------------------------------------
// blend helpers
// ---------------------------------------------------------------------------

function blendCssName(mode: BlendModeId): string {
  return mode === "normal" ? "normal" : mode;
}

function blendModeFromPixi(mode: BLEND_MODES): BlendModeId {
  const found = (Object.entries(BLEND_MAP) as [BlendModeId, BLEND_MODES][]).find(
    ([, v]) => v === mode,
  );
  return found?.[0] ?? "normal";
}

// Re-export for callers that only need the type.
export type { RasterSurface, PixelSnapshot, MaskSurface };
export { Rectangle };
