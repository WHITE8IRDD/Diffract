/**
 * ColorPickerPanel — Photoshop-style picker:
 *  * stacked foreground/background swatches (click to edit, X swaps, D resets);
 *  * saturation/value square + hue strip;
 *  * hex field;
 *  * recent colours row.
 */

import { useCallback, useRef } from "react";
import { useColorStore } from "@/store/useColorStore";
import {
  contrastText,
  hexToRgba,
  hsvToRgba,
  rgbaToHex,
  rgbaToHsv,
  rgbaToCss,
  type HSV,
  type RGBA,
} from "@/utils/color";
import { clamp } from "@/utils/math";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ColorPickerPanel() {
  const foreground = useColorStore((s) => s.foreground);
  const background = useColorStore((s) => s.background);
  const recent = useColorStore((s) => s.recent);
  const setForeground = useColorStore((s) => s.setForeground);
  const setBackground = useColorStore((s) => s.setBackground);
  const swap = useColorStore((s) => s.swap);
  const resetDefaults = useColorStore((s) => s.resetDefaults);

  const hsv = rgbaToHsv(foreground);
  const editingRef = useRef<"fg" | "bg">("fg");

  const applyHsv = useCallback(
    (next: HSV) => {
      const color = hsvToRgba(next);
      if (editingRef.current === "fg") setForeground(color);
      else setBackground(color);
    },
    [setForeground, setBackground],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Swatch stack */}
      <div className="flex items-start gap-3">
        <div className="relative h-[42px] w-[52px]">
          {/* background swatch */}
          <button
            type="button"
            aria-label="Background colour"
            className="difr-focus-ring absolute bottom-0 right-0 h-[30px] w-[30px] rounded-sm border-2 border-stroke-strong"
            style={{ background: rgbaToCss(background) }}
            onClick={() => {
              editingRef.current = "bg";
            }}
          />
          {/* foreground swatch */}
          <button
            type="button"
            aria-label="Foreground colour"
            className="difr-focus-ring absolute left-0 top-0 z-10 h-[30px] w-[30px] rounded-sm border-2 border-background shadow-md"
            style={{ background: rgbaToCss(foreground) }}
            onClick={() => {
              editingRef.current = "fg";
            }}
          />
        </div>
        <div className="flex flex-col gap-1 pt-0.5">
          <MiniButton onClick={swap} title="Swap foreground/background (X)">
            ⇄ Swap
          </MiniButton>
          <MiniButton onClick={resetDefaults} title="Default colours (D)">
            ↺ Default
          </MiniButton>
        </div>
      </div>

      {/* Saturation / value square */}
      <SVSquare
        hsv={hsv}
        onChange={applyHsv}
      />

      {/* Hue strip */}
      <HueStrip value={hsv.h} onChange={(h) => applyHsv({ ...hsv, h })} />

      {/* Hex input */}
      <div className="flex items-center gap-2">
        <Label className="w-[32px]">Hex</Label>
        <Input
          value={rgbaToHex(foreground)}
          onChange={(e) => {
            const parsed = hexToRgba(e.target.value, foreground.a);
            if (parsed) {
              if (editingRef.current === "fg") setForeground(parsed);
              else setBackground(parsed);
            }
          }}
          className="h-6 font-mono uppercase"
        />
      </div>

      {/* RGB readout */}
      <div className="flex gap-2 text-[10px] text-foreground-tertiary">
        <span>R {Math.round(foreground.r)}</span>
        <span>G {Math.round(foreground.g)}</span>
        <span>B {Math.round(foreground.b)}</span>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <Label className="mb-1.5 block">Recent</Label>
          <div className="flex flex-wrap gap-1">
            {recent.slice(0, 12).map((c, i) => (
              <button
                key={`${c.r}-${c.g}-${c.b}-${i}`}
                type="button"
                aria-label={`Recent colour ${rgbaToHex(c)}`}
                className="h-4 w-4 rounded-sm border border-stroke"
                style={{ background: rgbaToCss(c) }}
                onClick={() => setForeground(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Photoshop's SV square: x = saturation, y = value (inverted). */
function SVSquare({ hsv, onChange }: { hsv: HSV; onChange: (hsv: HSV) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const handle = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const v = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
      onChange({ ...hsv, s, v });
    },
    [hsv, onChange],
  );

  const pure = hsvToRgba({ h: hsv.h, s: 1, v: 1 });

  return (
    <div
      ref={ref}
      className="difr-focus-ring relative h-[120px] w-full cursor-crosshair rounded-md border border-stroke"
      style={{
        background: `
          linear-gradient(to top, #000, transparent),
          linear-gradient(to right, #fff, ${rgbaToCss(pure)})
        `,
      }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handle(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) handle(e);
      }}
    >
      {/* cursor */}
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
        }}
      />
    </div>
  );
}

function HueStrip({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const handle = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      onChange(clamp((e.clientX - rect.left) / rect.width, 0, 1) * 360);
    },
    [onChange],
  );

  return (
    <div
      ref={ref}
      className="difr-focus-ring relative h-3.5 w-full cursor-ew-resize rounded-full border border-stroke"
      style={{
        background:
          "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
      }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handle(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) handle(e);
      }}
    >
      <div
        className="pointer-events-none absolute top-1/2 h-4 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow"
        style={{ left: `${(value / 360) * 100}%` }}
      />
    </div>
  );
}

function MiniButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="difr-focus-ring difr-press rounded-md border border-stroke bg-surface-2 px-2 py-1 text-[10px] text-foreground-secondary hover:border-stroke-strong hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** Helper used by swatch tooltips. */
export const swatchText = (c: RGBA): string =>
  `${rgbaToHex(c)} — ${contrastText(c)}`;
