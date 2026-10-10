/**
 * ExportAsDialog — File ▸ Export As (Ctrl+Shift+E).
 *
 * Flattens the document with the engine's CPU compositor and hands the PNG
 * payload to the Rust backend (`export_image`) for encoding to
 * PNG/JPEG/WebP at the chosen quality/scale. In the browser preview the same
 * payload triggers a download.
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
import { Slider } from "@/components/ui/slider";
import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { getEngine } from "@/engine/registry";
import { isTauri, tauriApi } from "@/hooks/useTauri";
import { cn } from "@/utils/cn";

type Format = "png" | "jpeg" | "webp";

const FORMATS: { id: Format; label: string; ext: string; note: string }[] = [
  { id: "png", label: "PNG", ext: ".png", note: "Lossless · transparency" },
  { id: "jpeg", label: "JPEG", ext: ".jpg", note: "Small · photographic" },
  { id: "webp", label: "WebP", ext: ".webp", note: "Modern · compact" },
];

export function ExportAsDialog() {
  const open = useUIStore((s) => s.dialogs.exportAs);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const doc = useDocumentStore((s) => {
    const d = s.documents.find((x) => x.id === s.activeDocumentId);
    return d ?? null;
  });

  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(100);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const doExport = async () => {
    const engine = getEngine();
    if (!doc || !engine) return;
    setBusy(true);
    setStatus(null);
    try {
      const flat = engine.compositeToCanvas(doc.id);
      if (!flat) throw new Error("Nothing to export — document has no pixels.");
      const output = document.createElement("canvas");
      output.width = Math.max(1, Math.round(flat.width * scale / 100));
      output.height = Math.max(1, Math.round(flat.height * scale / 100));
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("Canvas export is not available.");
      if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, output.width, output.height); }
      ctx.drawImage(flat, 0, 0, output.width, output.height);
      const ext = FORMATS.find(f => f.id === format)?.ext ?? ".png";
      const filename = `${doc.name.replace(/[\\/:*?"<>|]/g, "_")}${ext}`;
      let result: { ok: boolean; path: string | null; error?: string };
      if (isTauri()) {
        const path = await tauriApi.saveFileDialog(filename, [{ name: format.toUpperCase(), extensions: [ext.slice(1)] }]);
        if (!path) { setBusy(false); return; }
        const png = await new Promise<Blob | null>(resolve => output.toBlob(resolve, "image/png"));
        if (!png) throw new Error("PNG encoding failed.");
        result = await tauriApi.exportImage(
          { name: doc.name, width: output.width, height: output.height, dpi: doc.dpi,
            colorMode: doc.colorMode, layerCount: doc.layers.length },
          new Uint8Array(await png.arrayBuffer()), format, path, quality,
        );
      } else {
        const mime = `image/${format}`;
        const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, mime, quality / 100));
        if (!blob || blob.type !== mime) throw new Error(`${format.toUpperCase()} export is not supported by this browser.`);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = filename;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        result = { ok: true, path: null };
      }
      if (result.ok) {
        // Flattened exports are not layered project saves; keep the dirty flag.
        setStatus(
          result.path
            ? `Saved to ${result.path}`
            : "Downloaded via the browser preview.",
        );
      } else {
        setStatus(result.error ?? "Export failed.");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeDialog("exportAs");
      }}
    >
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Export As</DialogTitle>
          <DialogDescription>
            {doc
              ? `Export “${doc.name}” (${doc.width}×${doc.height}).`
              : "No document is open."}
          </DialogDescription>
        </DialogHeader>

        {doc && (
          <div className="flex flex-col gap-3.5">
            <div>
              <Label className="mb-1.5 block">Format</Label>
              <div className="flex gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "difr-focus-ring flex-1 rounded-md border px-2 py-2 text-left transition-colors",
                      format === f.id
                        ? "border-accent bg-accent/10"
                        : "border-stroke bg-surface-2 hover:border-stroke-strong",
                    )}
                  >
                    <p className="text-[12px] font-medium text-foreground">
                      {f.label}
                      <span className="ml-1 text-[10px] text-foreground-disabled">
                        {f.ext}
                      </span>
                    </p>
                    <p className="text-[10px] text-foreground-tertiary">{f.note}</p>
                  </button>
                ))}
              </div>
            </div>

            {format !== "png" && (
              <div className="flex items-center gap-2">
                <Label className="w-[52px]">Quality</Label>
                <Slider
                  min={1}
                  max={100}
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v ?? 92)}
                />
                <span className="w-[36px] text-right text-[11px] text-foreground-secondary">
                  {quality}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label className="w-[52px]">Scale</Label>
              <Slider
                min={25}
                max={400}
                step={25}
                value={[scale]}
                onValueChange={([v]) => setScale(v ?? 100)}
              />
              <span className="w-[36px] text-right text-[11px] text-foreground-secondary">
                {scale}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="w-[52px]">Name</Label>
              <Input
                readOnly
                value={`${doc.name}${FORMATS.find((f) => f.id === format)?.ext ?? ".png"}`}
              />
            </div>

            {status && (
              <p className="rounded-md border border-stroke bg-surface-2 px-2.5 py-1.5 text-[11px] text-foreground-secondary">
                {status}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => closeDialog("exportAs")}>
            Close
          </Button>
          <Button disabled={!doc || busy} onClick={() => void doExport()}>
            {busy ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
