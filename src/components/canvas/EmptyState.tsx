/**
 * EmptyState — shown when no document is open: brand moment + primary CTAs.
 */

import { FilePlus2, FolderOpen, Sparkles } from "lucide-react";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/useUIStore";

export function EmptyState() {
  const openDialog = useUIStore((s) => s.openDialog);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-background">
      <div className="flex flex-col items-center gap-3">
        <Logo size={72} />
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Diffract
        </h1>
        <p className="-mt-2 text-[12px] text-foreground-tertiary">
          AI-Native Image Editor — fast, offline, yours.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => openDialog("newDocument")}>
          <FilePlus2 className="h-3.5 w-3.5" />
          New document
          <kbd className="ml-1 rounded-sm bg-black/15 px-1 text-[10px]">Ctrl+N</kbd>
        </Button>
        <Button variant="secondary" onClick={() => openDialog("newDocument")}>
          <FolderOpen className="h-3.5 w-3.5" />
          Open image
        </Button>
      </div>

      <div className="mt-2 flex max-w-[420px] items-start gap-2.5 rounded-lg border border-stroke-subtle bg-surface px-3.5 py-2.5">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <p className="text-[11px] leading-relaxed text-foreground-secondary">
          Phase 1 foundation is live: layer engine, brush &amp; move tools, undo
          history, and the WebGPU canvas. AI features (background removal,
          generative fill, upscaling) run locally in Phase 3 — no cloud, no
          subscriptions.
        </p>
      </div>
    </div>
  );
}
