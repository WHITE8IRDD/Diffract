/**
 * Engine registry — a single mutable slot for the live `PixiEngine`.
 *
 * Stores and tools need to touch pixels (history snapshots, layer fills)
 * without importing PixiJS into the Zustand graph. The engine registers
 * itself when a viewport mounts; everything else uses `getEngine()` which
 * may return `null` before the canvas is ready (all call sites must handle
 * that — cheap and explicit).
 */

import type { PixiEngine } from "./PixiEngine";

let engine: PixiEngine | null = null;

export function registerEngine(e: PixiEngine | null): void {
  engine = e;
}

export function getEngine(): PixiEngine | null {
  return engine;
}
