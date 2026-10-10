/**
 * AppShell — the complete Windows 11 Fluent workspace:
 *
 *   ┌───────────────────────────────────────────┐
 *   │ TitleBar (caption)                        │
 *   │ MenuBar  File Edit Image Layer …          │
 *   ├──────┬──────────────────────┬─────────────┤
 *   │ tools│ DocumentTabs        │ Layers      │
 *   │      │ ─────────────────── │ Properties  │
 *   │      │ Canvas (Pixi/ WebGPU)│ History    │
 *   │      │                      │ Color      │
 *   ├──────┴──────────────────────┴─────────────┤
 *   │ StatusBar  zoom · xy · doc · GPU badge    │
 *   └───────────────────────────────────────────┘
 */

import { TitleBar } from "./TitleBar";
import { MenuBar } from "./MenuBar";
import { LeftToolbar } from "./LeftToolbar";
import { RightDock } from "./RightDock";
import { StatusBar } from "./StatusBar";
import { DocumentTabs } from "./DocumentTabs";
import { CanvasViewport } from "@/components/canvas/CanvasViewport";
import { NewDocumentDialog } from "@/components/dialogs/NewDocumentDialog";
import { ExportAsDialog } from "@/components/dialogs/ExportAsDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/utils/cn";

export function AppShell() {
  const panelsHidden = useUIStore((s) => s.panelsHidden);
  const rightDockVisible = useUIStore((s) => s.rightDockVisible);
  const statusBarVisible = useUIStore((s) => s.statusBarVisible);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <MenuBar />

      <div className="flex min-h-0 flex-1">
        <div className={cn(panelsHidden && "hidden")}>
          <LeftToolbar />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <DocumentTabs />
          <CanvasViewport />
        </main>

        {rightDockVisible && !panelsHidden && <RightDock />}
      </div>

      {statusBarVisible && <StatusBar />}

      {/* Modal layer */}
      <NewDocumentDialog />
      <ExportAsDialog />
      <AboutDialog />
    </div>
  );
}
