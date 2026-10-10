/**
 * AboutDialog — Help ▸ About Diffract: identity, version, runtime badges.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/icons/Logo";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/store/useUIStore";

const RUNTIME_FACTS = [
  { label: "Desktop shell", value: "Tauri v2 · Rust" },
  { label: "Canvas engine", value: "PixiJS v8 · WebGL" },
  { label: "Projects", value: "Layered .diffract files" },
  { label: "Colour", value: "sRGB (P3 / Adobe RGB in Phase 4)" },
  { label: "Licence", value: "MIT" },
];

export function AboutDialog() {
  const open = useUIStore((s) => s.dialogs.about);
  const closeDialog = useUIStore((s) => s.closeDialog);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeDialog("about");
      }}
    >
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <div>
              <DialogTitle className="text-[17px]">Diffract</DialogTitle>
              <p className="text-[11px] text-foreground-tertiary">
                AI-Native Image Editor · v0.1.0
              </p>
            </div>
          </div>
        </DialogHeader>

        <p className="text-[11px] leading-relaxed text-foreground-secondary">
          An offline layered editor. This build supports raster painting,
          editable type, shapes, crops, transforms and project files. Additional
          PhotoCraft-level tools and PSD support are not implemented yet.
        </p>

        <Separator />

        <dl className="flex flex-col gap-1.5">
          {RUNTIME_FACTS.map((fact) => (
            <div key={fact.label} className="flex items-baseline gap-3">
              <dt className="w-[110px] shrink-0 text-[10px] uppercase tracking-wide text-foreground-disabled">
                {fact.label}
              </dt>
              <dd className="text-[11px] text-foreground-secondary">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
