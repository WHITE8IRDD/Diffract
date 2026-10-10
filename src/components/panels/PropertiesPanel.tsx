/**
 * PropertiesPanel — context-sensitive inspector for the active layer and the
 * current tool. Photoshop's Properties panel behaviour: what you see depends
 * on what is selected.
 */

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useUIStore } from "@/store/useUIStore";
import { getTool } from "@/tools/ToolRegistry";
import type { BrushToolOptions } from "@/tools/types";

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

        {activeToolId === "crop" && (
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
        )}

        {!isBrushFamily &&
          activeToolId !== "magic-wand" &&
          activeToolId !== "crop" && (
            <p className="text-[11px] text-foreground-disabled">
              {tool.name} options appear here as the tool matures (Phase 1 step 2).
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
            <label className="flex items-center gap-2 text-[11px] text-foreground-secondary">
              <Switch
                checked={layer.clipped}
                onCheckedChange={(checked) =>
                  setLayerMeta(doc.id, layer.id, { clipped: checked })
                }
              />
              Clipping mask
            </label>
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
