/**
 * StatusBar — bottom strip: zoom %, cursor coordinates, document size,
 * colour mode and a WebGPU/WebGL renderer badge.
 */

import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { formatDocSize, formatZoom } from "@/utils/shortcuts";
import { Separator } from "@/components/ui/separator";

export function StatusBar() {
  const zoom = useUIStore((s) => s.zoom);
  const cursorX = useUIStore((s) => s.cursorDocX);
  const cursorY = useUIStore((s) => s.cursorDocY);
  const cursorInside = useUIStore((s) => s.cursorInside);
  const doc = useDocumentStore((s) => {
    const d = s.documents.find((x) => x.id === s.activeDocumentId);
    return d
      ? { width: d.width, height: d.height, colorMode: d.colorMode, name: d.name }
      : null;
  });

  return (
    <div className="flex h-[24px] shrink-0 items-center gap-3 border-t border-stroke-subtle bg-surface px-3 text-[11px] text-foreground-tertiary">
      <StatusChip label="Zoom" value={formatZoom(zoom)} />
      <Separator orientation="vertical" className="h-3.5" />
      <StatusChip
        label="X / Y"
        value={
          cursorInside
            ? `${Math.round(cursorX)}, ${Math.round(cursorY)}`
            : "—, —"
        }
        mono
      />
      <Separator orientation="vertical" className="h-3.5" />
      <StatusChip
        label="Doc"
        value={doc ? formatDocSize(doc.width, doc.height) : "—"}
      />
      <Separator orientation="vertical" className="h-3.5" />
      <StatusChip
        label="Mode"
        value={doc ? doc.colorMode.toUpperCase() : "—"}
      />

      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="difr-spectrum h-1.5 w-1.5 rounded-full" />
          Local AI · Offline
        </span>
        <Separator orientation="vertical" className="h-3.5" />
        <span className="rounded-sm bg-surface-2 px-1.5 py-px font-medium text-foreground-secondary">
          WebGPU
        </span>
      </div>
    </div>
  );
}

function StatusChip({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-foreground-disabled">{label}</span>
      <span
        className={
          mono ? "font-mono text-foreground-secondary" : "text-foreground-secondary"
        }
      >
        {value}
      </span>
    </span>
  );
}
