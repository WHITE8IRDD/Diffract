/**
 * LayersPanel — the layer stack.
 *
 * Photoshop conventions implemented in Phase 1:
 *  * top-of-stack rows at the top of the list;
 *  * eye column toggles visibility; lock column locks pixels;
 *  * active layer highlighted with the accent rail;
 *  * blend-mode dropdown + opacity slider in the panel footer;
 *  * toolbar actions: new layer, duplicate, add mask, delete;
 *  * double-click renames inline.
 *
 * Layer thumbnails render from the engine's raster surface (live pixels).
 */

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Plus,
  RectangleHorizontal,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BLEND_MODES, type BlendModeId } from "@/utils/blendModes";
import { useDocumentStore } from "@/store/useDocumentStore";
import { getEngine } from "@/engine/registry";
import type { LayerState } from "@/store/types";
import { cn } from "@/utils/cn";

export function LayersPanel() {
  const doc = useDocumentStore((s) => {
    const d = s.documents.find((x) => x.id === s.activeDocumentId);
    return d ?? null;
  });
  const {
    addLayer,
    deleteLayer,
    duplicateLayer,
    renameLayer,
    setLayerMeta,
    setActiveLayer,
    addLayerMask,
    deleteLayerMask,
  } = useDocumentStore();

  if (!doc) {
    return <EmptyHint text="Open or create a document to edit layers." />;
  }

  const activeLayer =
    doc.layers.find((l) => l.id === doc.activeLayerId) ?? doc.layers[doc.layers.length - 1] ?? null;
  // Photoshop shows the topmost layer first.
  const rows = [...doc.layers].reverse();

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      {/* Footer controls (Photoshop places them at the bottom) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="difr-focus-ring h-6 flex-1 truncate rounded-md border border-stroke bg-surface-2 px-2 text-left text-[11px] text-foreground hover:border-stroke-strong"
              >
                {BLEND_MODES.find((m) => m.id === activeLayer?.blendMode)?.label ?? "Normal"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[320px] overflow-y-auto">
              {BLEND_MODES.map((mode) => (
                <DropdownMenuItem
                  key={mode.id}
                  onSelect={() =>
                    activeLayer &&
                    setLayerMeta(doc.id, activeLayer.id, {
                      blendMode: mode.id as BlendModeId,
                    })
                  }
                >
                  {mode.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-[42px] text-[10px] text-foreground-disabled">Opacity</span>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Math.round((activeLayer?.opacity ?? 1) * 100)]}
            onValueChange={([v]) =>
              activeLayer &&
              setLayerMeta(doc.id, activeLayer.id, { opacity: (v ?? 100) / 100 })
            }
          />
          <span className="w-[32px] text-right text-[10px] text-foreground-secondary">
            {Math.round((activeLayer?.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Layer rows */}
      <ScrollArea className="min-h-[120px] flex-1 rounded-md border border-stroke-subtle">
        <div className="flex flex-col gap-px p-1">
          {rows.map((layer) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              active={layer.id === doc.activeLayerId}
              onSelect={() => setActiveLayer(doc.id, layer.id)}
              onToggleVisible={() =>
                setLayerMeta(doc.id, layer.id, { visible: !layer.visible })
              }
              onToggleLock={() =>
                setLayerMeta(doc.id, layer.id, { locked: !layer.locked })
              }
              onRename={(name) => renameLayer(doc.id, layer.id, name)}
            />
          ))}
          {rows.length === 0 && (
            <p className="p-3 text-center text-[11px] text-foreground-disabled">
              No layers
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Action strip */}
      <div className="flex items-center gap-0.5 pt-0.5">
        <PanelAction
          label="New layer"
          onClick={() => addLayer(doc.id)}
        >
          <Plus className="h-3.5 w-3.5" />
        </PanelAction>
        <PanelAction
          label="Duplicate layer"
          disabled={!activeLayer}
          onClick={() => activeLayer && duplicateLayer(doc.id, activeLayer.id)}
        >
          <Copy className="h-3.5 w-3.5" />
        </PanelAction>
        <PanelAction
          label={activeLayer?.mask ? "Delete layer mask" : "Add layer mask"}
          disabled={!activeLayer}
          onClick={() => {
            if (!activeLayer) return;
            if (activeLayer.mask) deleteLayerMask(doc.id, activeLayer.id);
            else addLayerMask(doc.id, activeLayer.id);
          }}
        >
          <RectangleHorizontal className="h-3.5 w-3.5" />
        </PanelAction>
        <PanelAction
          label="Delete layer"
          disabled={!activeLayer}
          danger
          onClick={() => activeLayer && deleteLayer(doc.id, activeLayer.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </PanelAction>
      </div>
    </div>
  );
}

function LayerRow({
  layer,
  active,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onRename,
}: {
  layer: LayerState;
  active: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);

  return (
    <div
      className={cn(
        "flex cursor-default items-center gap-1.5 rounded-md px-1 py-1 transition-colors",
        active ? "bg-accent/15" : "hover:bg-surface-hover",
      )}
      onClick={onSelect}
      onDoubleClick={() => {
        setDraft(layer.name);
        setEditing(true);
      }}
    >
      <button
        type="button"
        aria-label={layer.visible ? "Hide layer" : "Show layer"}
        className="rounded-sm p-0.5 text-foreground-secondary hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
      >
        {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-foreground-disabled" />}
      </button>

      <LayerThumb layerId={layer.id} mask={false} />

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            className="difr-focus-ring w-full rounded-sm border border-accent bg-surface-2 px-1 text-[11px] text-foreground"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim() && draft !== layer.name) onRename(draft.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (draft.trim() && draft !== layer.name) onRename(draft.trim());
                setEditing(false);
              } else if (e.key === "Escape") {
                setEditing(false);
              }
              e.stopPropagation();
            }}
          />
        ) : (
          <p
            className={cn(
              "truncate text-[11px]",
              layer.visible ? "text-foreground" : "text-foreground-disabled",
            )}
          >
            {layer.name}
          </p>
        )}
        <p className="text-[9px] uppercase tracking-wide text-foreground-disabled">
          {layer.kind}
          {layer.mask ? " · mask" : ""}
          {layer.clipped ? " · clipped" : ""}
        </p>
      </div>

      {layer.mask && <LayerThumb layerId={layer.id} mask />}

      <button
        type="button"
        aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
        className="rounded-sm p-0.5 text-foreground-secondary hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
      >
        {layer.locked ? <Lock className="h-3 w-3 text-warning" /> : <Unlock className="h-3 w-3" />}
      </button>
    </div>
  );
}

/**
 * Live layer thumbnail: draws the engine's raster surface into a 32×32
 * canvas. Refreshes on a light interval (full event wiring in Phase 2).
 */
function LayerThumb({ layerId, mask }: { layerId: string; mask: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = ref.current;
      const engine = getEngine();
      const surface = engine?.getSurface(layerId);
      if (canvas && surface) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (mask && surface.mask) {
            ctx.drawImage(surface.mask.canvas, 0, 0, canvas.width, canvas.height);
          } else if (!mask) {
            ctx.drawImage(surface.canvas, 0, 0, canvas.width, canvas.height);
          }
        }
      }
      raf = window.setTimeout(draw, 320);
    };
    draw();
    return () => {
      clearTimeout(raf);
    };
  }, [layerId, mask]);

  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      className={cn(
        "difr-checkerboard h-8 w-8 shrink-0 rounded-sm border border-stroke",
        mask && "grayscale",
      )}
    />
  );
}

function PanelAction({
  children,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "difr-focus-ring difr-press flex h-6 w-6 items-center justify-center rounded-md text-foreground-secondary transition-colors",
        disabled
          ? "opacity-30"
          : danger
            ? "hover:bg-destructive/20 hover:text-destructive"
            : "hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="px-4 text-center text-[11px] text-foreground-disabled">{text}</p>
    </div>
  );
}
