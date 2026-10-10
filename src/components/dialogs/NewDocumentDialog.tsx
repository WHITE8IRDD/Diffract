/**
 * NewDocumentDialog — File ▸ New (Ctrl+N).
 *
 * Custom size, DPI, colour mode and background fill. Recent presets match
 * Photoshop's default list (Default Photoshop Size, A4, Web 1080p, …).
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import type { ColorMode } from "@/store/types";
import { cn } from "@/utils/cn";

interface Preset {
  label: string;
  width: number;
  height: number;
  dpi: number;
}

const PRESETS: Preset[] = [
  { label: "Default Photoshop Size", width: 1920, height: 1080, dpi: 72 },
  { label: "Web 1080p", width: 1920, height: 1080, dpi: 72 },
  { label: "4K UHD", width: 3840, height: 2160, dpi: 72 },
  { label: "A4 Print (300 DPI)", width: 2480, height: 3508, dpi: 300 },
  { label: "Instagram Post", width: 1080, height: 1080, dpi: 72 },
];

const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "rgb", label: "RGB Color · 8-bit" },
  { id: "grayscale", label: "Grayscale (not available yet)" },
  { id: "cmyk", label: "CMYK Color (Phase 4)" },
];

export function NewDocumentDialog() {
  const open = useUIStore((s) => s.dialogs.newDocument);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const createDocument = useDocumentStore((s) => s.createDocument);

  const [name, setName] = useState("Untitled-1");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [dpi, setDpi] = useState(72);
  const [colorMode, setColorMode] = useState<ColorMode>("rgb");
  const [background, setBackground] = useState<"white" | "transparent">("white");

  const invalid = !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 ||
    width > 8192 || height > 8192 || width * height > 24_000_000;
  const submit = () => {
    if (invalid) return;
    createDocument({
      name: name.trim() || "Untitled-1",
      width: Math.round(width),
      height: Math.round(height),
      dpi: Math.max(1, Math.min(1200, dpi)),
      colorMode,
      background,
    });
    closeDialog("newDocument");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeDialog("newDocument");
      }}
    >
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>New Document</DialogTitle>
          <DialogDescription>
            Choose canvas dimensions. You can change these later via Image ▸
            Canvas Size.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          {/* Presets */}
          <div className="flex items-center gap-2">
            <Label className="w-[70px]">Preset</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="flex-1 justify-between font-normal">
                  Choose preset…
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[240px]">
                {PRESETS.map((p) => (
                  <DropdownMenuItem
                    key={p.label}
                    onSelect={() => {
                      setWidth(p.width);
                      setHeight(p.height);
                      setDpi(p.dpi);
                    }}
                  >
                    <span className="flex-1">{p.label}</span>
                    <span className="text-[10px] text-foreground-disabled">
                      {p.width}×{p.height}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-[70px]" htmlFor="nd-name">Name</Label>
            <Input
              id="nd-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-[70px]">Size</Label>
            <div className="flex flex-1 items-center gap-1.5">
              <NumberField label="W" value={width} onChange={setWidth} />
              <span className="text-foreground-disabled">×</span>
              <NumberField label="H" value={height} onChange={setHeight} />
              <span className="text-[10px] text-foreground-disabled">px</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-[70px]">Resolution</Label>
            <div className="flex flex-1 items-center gap-1.5">
              <NumberField label="DPI" value={dpi} onChange={setDpi} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-[70px]">Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_MODES.map((m) => (
                <ChipButton
                  key={m.id}
                  active={colorMode === m.id}
                  disabled={m.id !== "rgb"}
                  onClick={() => setColorMode(m.id)}
                >
                  {m.label}
                </ChipButton>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-[70px]">Background</Label>
            <div className="flex gap-1.5">
              <ChipButton
                active={background === "white"}
                onClick={() => setBackground("white")}
              >
                White
              </ChipButton>
              <ChipButton
                active={background === "transparent"}
                onClick={() => setBackground("transparent")}
              >
                Transparent
              </ChipButton>
            </div>
          </div>
        </div>

        {invalid && <p role="alert" className="text-[11px] text-destructive">Enter dimensions between 1 and 8192 px (maximum 24 million pixels).</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => closeDialog("newDocument")}>
            Cancel
          </Button>
          <Button disabled={invalid} onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-1 rounded-md border border-stroke bg-surface-2 px-2">
      <span className="text-[10px] text-foreground-disabled">{label}</span>
      <input
        type="number"
        min={1}
        className="h-7 w-full bg-transparent text-[12px] text-foreground outline-none"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

function ChipButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "difr-focus-ring difr-press rounded-md border px-2 py-1 text-[11px] transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-stroke bg-surface-2 text-foreground-secondary hover:border-stroke-strong",
        disabled && "opacity-35",
      )}
    >
      {children}
    </button>
  );
}
