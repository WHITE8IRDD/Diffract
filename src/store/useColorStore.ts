/**
 * Colour store — foreground/background swatches, recent colours.
 *
 * Photoshop model: a stacked pair of colours (foreground over background),
 * `X` swaps them, `D` resets to black/white. The Color Picker panel and the
 * Eyedropper tool both read/write here.
 */

import { create } from "zustand";
import { type RGBA, rgba } from "@/utils/color";

interface ColorState {
  foreground: RGBA;
  background: RGBA;
  recent: RGBA[];
  setForeground: (c: RGBA) => void;
  setBackground: (c: RGBA) => void;
  swap: () => void;
  resetDefaults: () => void;
  pushRecent: (c: RGBA) => void;
}

const MAX_RECENT = 24;

const same = (a: RGBA, b: RGBA) =>
  a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;

export const useColorStore = create<ColorState>((set, get) => ({
  foreground: rgba(0, 0, 0, 1),
  background: rgba(255, 255, 255, 1),
  recent: [],

  setForeground: (c) => {
    get().pushRecent(c);
    set({ foreground: c });
  },
  setBackground: (c) => {
    get().pushRecent(c);
    set({ background: c });
  },
  swap: () =>
    set((s) => ({ foreground: s.background, background: s.foreground })),
  resetDefaults: () =>
    set({ foreground: rgba(0, 0, 0, 1), background: rgba(255, 255, 255, 1) }),

  pushRecent: (c) =>
    set((s) => ({
      recent: [c, ...s.recent.filter((r) => !same(r, c))].slice(0, MAX_RECENT),
    })),
}));
