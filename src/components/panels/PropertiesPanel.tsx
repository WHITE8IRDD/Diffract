/**
 * PropertiesPanel — context-sensitive inspector for the active layer and the
 * current tool. Photoshop's Properties panel behaviour: what you see depends
 * on what is selected.
 */

import { selectionFor } from "@/store/useSelectionStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useUIStore } from "@/store/useUIStore";
import { getTool } from "@/tools/ToolRegistry";
import { updateText } from "@/tools/TextTool";
import type { BrushToolOptions } from "@/tools/types";
import { rgbaToHex } from "@/utils/color";

export function PropertiesPanel() {
  const doc = useDocumentStore((s) => {
    const d = s.documents.find((x) => x.id === s.activeDocumentId);
    return d ?? null;
  });
  const setLayerMeta = useDocumentStore((s) => s.setLayerMeta);
  const renameLayer = useDocumentStore((s) => s.renameLayer);
  const activeToolId = useUIStore((s) => s.activeToolId);
  const toolOptions = useUIStore((s) => s.toolOptions);
  const setBrushOptions = useUIStore((s) => s.setBrushOptions);
  const setMagicWandOptions = useUIStore((s) => s.setMagicWandOptions);
  const setCropOptions = useUIStore((s) => s.setCropOptions);

  const layer = doc
    ? (doc.layers.find((l) => l.id === doc.activeLayerId) ?? null)
    : null;
  const tool = getTool(activeToolId);
  const isBrushFamily = activeToolId === "brush" || activeToolId === "eraser";
  const brushOpts: BrushToolOptions =
    activeToolId === "eraser" ? toolOptions.eraser : toolOptions.brush;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Tool section ─────────────────────────────────────────────── */}
      <div>
        <p className="difr-panel-title mb-2">{tool.name}</p>

        {isBrushFamily && (
          <div className="flex flex-col gap-2.5">
            <PropRow label="Size">
              <Slider
                min={1}
                max={400}
                value={[brushOpts.size]}
                onValueChange={([v]) =>
                  setBrushOptions({ size: v ?? 24 }, activeToolId === "eraser")
                }
              />
              <ValueBox value={`${brushOpts.size}px`} />
            </PropRow>
            <PropRow label="Hardness">
              <Slider
                min={0}
                max={100}
                value={[Math.round(brushOpts.hardness * 100)]}
                onValueChange={([v]) =>
                  setBrushOptions({ hardness: (v ?? 80) / 100 }, activeToolId === "eraser")
                }
              />
              <ValueBox value={`${Math.round(brushOpts.hardness * 100)}%`} />
            </PropRow>
            <PropRow label="Opacity">
              <Slider
                min={0}
                max={100}
                value={[Math.round(brushOpts.opacity * 100)]}
                onValueChange={([v]) =>
                  setBrushOptions({ opacity: (v ?? 100) / 100 }, activeToolId === "eraser")
                }
              />
              <ValueBox value={`${Math.round(brushOpts.opacity * 100)}%`} />
            </PropRow>
            <PropRow label="Flow">
              <Slider
                min={0}
                max={100}
                value={[Math.round(brushOpts.flow * 100)]}
                onValueChange={([v]) =>
                  setBrushOptions({ flow: (v ?? 100) / 100 }, activeToolId === "eraser")
                }
              />
              <ValueBox value={`${Math.round(brushOpts.flow * 100)}%`} />
            </PropRow>
            <PropRow label="Spacing">
              <Slider
                min={1}
                max={100}
                value={[Math.round(brushOpts.spacing * 100)]}
                onValueChange={([v]) =>
                  setBrushOptions({ spacing: (v ?? 10) / 100 }, activeToolId === "eraser")
                }
              />
              <ValueBox value={`${Math.round(brushOpts.spacing * 100)}%`} />
            </PropRow>
          </div>
        )}

        {layer?.text && doc && <div className="flex flex-col gap-2 pb-2">
          <Label htmlFor="text-content">Type layer · editable</Label>
          <textarea id="text-content" key={layer.id + layer.text.content}
            defaultValue={layer.text.content} rows={3}
            onBlur={e => updateText(doc.id, layer.id, { content: e.target.value })}
            className="w-full rounded border border-stroke bg-surface-2 p-2 text-xs text-foreground" />
          <PropRow label="Size"><Input type="number" min={1} max={1000}
            value={layer.text.fontSize} onChange={e => updateText(doc.id, layer.id, { fontSize: Number(e.target.value) })} /></PropRow>
          <PropRow label="Color"><input type="color" aria-label="Text color"
            value={textColorHex(layer.text.color)}
            onChange={e => updateText(doc.id, layer.id, { color: e.target.value })} /></PropRow>
        </div>}

        {activeToolId === "magic-wand" && (
          <div className="flex flex-col gap-2.5">
            <PropRow label="Tolerance">
              <Slider
                min={0}
                max={255}
                value={[toolOptions.magicWand.tolerance]}
                onValueChange={([v]) => setMagicWandOptions({ tolerance: v ?? 32 })}
              />
              <ValueBox value={String(toolOptions.magicWand.tolerance)} />
            </PropRow>
            <label className="flex items-center gap-2 text-[11px] text-foreground-secondary">
              <Switch
                checked={toolOptions.magicWand.contiguous}
                onCheckedChange={(checked) =>
                  setMagicWandOptions({ contiguous: checked })
                }
              />
              Contiguous
            </label>
          </div>
        )}

        {activeToolId === "crop" && (<div className="flex flex-col gap-2">
          <PropRow label="Ratio">
            <Input
              placeholder="Free"
              value={toolOptions.crop.aspect ? String(toolOptions.crop.aspect) : ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setCropOptions({ aspect: Number.isFinite(v) && v > 0 ? v : null });
              }}
            />
          </PropRow>
          <Button size="sm" disabled={!doc || !selectionFor(doc.id)}
            onClick={() => { if (doc) { const sel = selectionFor(doc.id); if (sel) useDocumentStore.getState().cropDocument(doc.id, sel); } }}>
            Crop selection · Enter
          </Button>
        </div>)}

        {!isBrushFamily &&
          activeToolId !== "magic-wand" &&
          activeToolId !== "crop" && (
            <p className="text-[11px] text-foreground-disabled">
              Select a layer to edit its properties, or drag on the canvas with {tool.name}.
            </p>
          )}
      </div>

      <Separator />

      {/* ── Layer section ────────────────────────────────────────────── */}
      <div>
        <p className="difr-panel-title mb-2">Layer</p>
        {doc && layer ? (
          <div className="flex flex-col gap-2.5">
            <PropRow label="Name">
              <Input
                value={layer.name}
                onChange={(e) => renameLayer(doc.id, layer.id, e.target.value)}
                className="h-6"
              />
            </PropRow>
            <PropRow label="Fill">
              <Slider
                min={0}
                max={100}
                value={[Math.round(layer.fillOpacity * 100)]}
                onValueChange={([v]) =>
                  setLayerMeta(doc.id, layer.id, { fillOpacity: (v ?? 100) / 100 })
                }
              />
              <ValueBox value={`${Math.round(layer.fillOpacity * 100)}%`} />
            </PropRow>
            <label className="flex items-center gap-2 text-[11px] text-foreground-secondary">
              <Switch
                checked={layer.locked}
                onCheckedChange={(checked) =>
                  setLayerMeta(doc.id, layer.id, { locked: checked })
                }
              />
              Lock pixels
            </label>
            {/* Clipping masks are not composited yet. Do not expose a toggle
                that changes only metadata while leaving pixels unchanged. */}
          </div>
        ) : (
          <p className="text-[11px] text-foreground-disabled">
            Select a layer to edit its properties.
          </p>
        )}
      </div>
    </div>
  );
}

function textColorHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  return match ? rgbaToHex({ r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: 1 }) : "#000000";
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-[52px] shrink-0">{label}</Label>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

function ValueBox({ value }: { value: string }) {
  return (
    <span className="w-[38px] shrink-0 rounded-sm border border-stroke bg-surface-2 px-1 py-0.5 text-right text-[10px] text-foreground-secondary">
      {value}
    </span>
  );
}
