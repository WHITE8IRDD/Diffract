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
  // Select the stored document reference (stable between unrelated updates)
  // and derive the display fields in render. Returning a freshly built object
  // from a selector makes every store update look like a change, which loops
  // React forever (error #185) once a document exists.
  const activeDoc = useDocumentStore(
    (s) => s.documents.find((x) => x.id === s.activeDocumentId) ?? null,
  );
  const doc = activeDoc
    ? {
        width: activeDoc.width,
        height: activeDoc.height,
        colorMode: activeDoc.colorMode,
        name: activeDoc.name,
      }
    : null;

  return (
    <div className="flex h-[24px] shrink-0 items-center gap-3 border-t border-stroke-subtle bg-surface px-3 text-[11px] text-foreground-tertiary">
      {doc ? <>
        <StatusChip label="Zoom" value={formatZoom(zoom)} />
        <Separator orientation="vertical" className="h-3.5" />
        <StatusChip
          label="X / Y"
          value={cursorInside ? `${Math.round(cursorX)}, ${Math.round(cursorY)}` : "—, —"}
          mono
        />
        <Separator orientation="vertical" className="h-3.5" />
        <StatusChip label="Doc" value={formatDocSize(doc.width, doc.height)} />
        <Separator orientation="vertical" className="h-3.5" />
        <StatusChip label="Mode" value={doc.colorMode.toUpperCase()} />
      </> : <span>No document</span>}

      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="difr-spectrum h-1.5 w-1.5 rounded-full" />
          Layered editing · Offline
        </span>
        <Separator orientation="vertical" className="h-3.5" />
        <span className="rounded-sm bg-surface-2 px-1.5 py-px font-medium text-foreground-secondary">
          WebGL
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
