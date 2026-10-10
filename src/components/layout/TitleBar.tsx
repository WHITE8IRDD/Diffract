/** PhotoCraft-style single-row menu / document title / desktop caption. */
import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { MenuBar } from "./MenuBar";
import { useDocumentStore } from "@/store/useDocumentStore";
import { isTauri } from "@/hooks/useTauri";
import { cn } from "@/utils/cn";

export function TitleBar() {
  const activeDoc = useDocumentStore(s => s.documents.find(x => x.id === s.activeDocumentId) ?? null);
  const [maximized, setMaximized] = useState(false);
  const native = isTauri();

  useEffect(() => {
    if (!native) return;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        setMaximized(await getCurrentWindow().isMaximized());
      } catch { /* unavailable in browser preview */ }
    })();
  }, [native]);

  const call = async (fn: "minimize" | "toggleMaximize" | "close") => {
    if (!native) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (fn === "minimize") await win.minimize();
      else if (fn === "toggleMaximize") { await win.toggleMaximize(); setMaximized(await win.isMaximized()); }
      else await win.close();
    } catch (error) { console.error("Window action failed", error); }
  };

  return <header data-tauri-drag-region className="relative flex h-[34px] shrink-0 items-center border-b border-stroke-subtle bg-surface px-1">
    <MenuBar compact />
    <div className="pointer-events-none absolute inset-x-[380px] hidden truncate text-center text-[11px] text-foreground-tertiary lg:block">
      {activeDoc ? <>{activeDoc.name}{activeDoc.dirty && <span className="ml-1 text-foreground-disabled">•</span>}</> : "Diffract"}
    </div>
    <div className="ml-auto flex h-full items-center gap-1">
      <span className="mr-3 hidden text-[10px] tracking-[0.02em] text-foreground-disabled md:inline">ESSENTIALS</span>
      {native && <div className="flex h-full items-stretch">
        <CaptionButton label="Minimize" onClick={() => void call("minimize")}><Minus size={13} /></CaptionButton>
        <CaptionButton label={maximized ? "Restore" : "Maximize"} onClick={() => void call("toggleMaximize")}>
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </CaptionButton>
        <CaptionButton label="Close" onClick={() => void call("close")} danger><X size={14} /></CaptionButton>
      </div>}
    </div>
  </header>;
}

function CaptionButton({ children, label, onClick, danger = false }: {
  children: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return <button type="button" aria-label={label} title={label} onClick={onClick}
    className={cn("flex w-[42px] items-center justify-center text-foreground-secondary transition-colors",
      danger ? "hover:bg-destructive hover:text-white" : "hover:bg-surface-hover")}>
    {children}
  </button>;
}
