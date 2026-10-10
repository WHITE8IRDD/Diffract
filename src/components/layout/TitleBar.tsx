/**
 * TitleBar — Windows 11 caption strip.
 *
 * Runs under the menu bar (Photoshop ordering) and carries the document
 * identity plus native window controls. In the Tauri build the traffic-light
 * buttons call `window.*` commands from `@tauri-apps/api/window`; in the
 * browser preview they degrade to decorative affordances.
 */

import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { Logo } from "@/components/icons/Logo";
import { useDocumentStore } from "@/store/useDocumentStore";
import { isTauri } from "@/hooks/useTauri";
import { cn } from "@/utils/cn";

export function TitleBar() {
  // Select the stored document (stable reference), not a fresh object literal —
  // a new object per call makes the subscription loop forever (error #185).
  const activeDoc = useDocumentStore(
    (s) => s.documents.find((x) => x.id === s.activeDocumentId) ?? null,
  );
  const doc = activeDoc ? { name: activeDoc.name, dirty: activeDoc.dirty } : null;
  const [maximized, setMaximized] = useState(false);

  // Tauri: real window controls.
  const windowApi = isTauri();
  useEffect(() => {
    if (!windowApi) return;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        setMaximized(await win.isMaximized());
      } catch {
        /* preview environment */
      }
    })();
  }, [windowApi]);

  const call = async (
    fn: "minimize" | "toggleMaximize" | "close",
  ): Promise<void> => {
    if (!windowApi) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (fn === "minimize") await win.minimize();
      else if (fn === "toggleMaximize") {
        await win.toggleMaximize();
        setMaximized(await win.isMaximized());
      } else await win.close();
    } catch {
      /* preview environment */
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="flex h-[32px] shrink-0 select-none items-center gap-2 border-b border-stroke-subtle bg-surface pl-2 pr-0"
    >
      <Logo size={18} compact />
      <span className="text-[12px] font-semibold text-foreground">Diffract</span>
      <span className="text-foreground-disabled">—</span>
      <span className="text-[12px] text-foreground-secondary">
        {doc ? (
          <>
            {doc.dirty && <span className="text-warning">● </span>}
            {doc.name}
          </>
        ) : (
          <span className="text-foreground-disabled">No document</span>
        )}
      </span>

      {/* Window controls */}
      <div className="ml-auto flex h-full items-stretch">
        <CaptionButton label="Minimize" onClick={() => void call("minimize")}>
          <Minus className="h-3.5 w-3.5" />
        </CaptionButton>
        <CaptionButton
          label={maximized ? "Restore" : "Maximize"}
          onClick={() => void call("toggleMaximize")}
        >
          {maximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </CaptionButton>
        <CaptionButton
          label="Close"
          onClick={() => void call("close")}
          danger
        >
          <X className="h-3.5 w-3.5" />
        </CaptionButton>
      </div>
    </div>
  );
}

function CaptionButton({
  children,
  label,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex w-[46px] items-center justify-center text-foreground-secondary transition-colors",
        danger ? "hover:bg-destructive hover:text-white" : "hover:bg-surface-hover",
      )}
    >
      {children}
    </button>
  );
}
