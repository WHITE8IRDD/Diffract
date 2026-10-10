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

import { useEffect, useRef } from "react";
import { useDocumentStore } from "@/store/useDocumentStore";
import { TitleBar } from "./TitleBar";
import { ToolOptionsBar } from "./ToolOptionsBar";
import { LeftToolbar } from "./LeftToolbar";
import { RightDock } from "./RightDock";
import { StatusBar } from "./StatusBar";
import { DocumentTabs } from "./DocumentTabs";
import { CanvasViewport } from "@/components/canvas/CanvasViewport";
import { NewDocumentDialog } from "@/components/dialogs/NewDocumentDialog";
import { ExportAsDialog } from "@/components/dialogs/ExportAsDialog";
import { ShortcutsDialog } from "@/components/dialogs/ShortcutsDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { useUIStore } from "@/store/useUIStore";

export function AppShell() {
  const documentCount = useDocumentStore(s => s.documents.length);
  const homeVisible = useUIStore(s => s.homeVisible);
  const setHomeVisible = useUIStore(s => s.setHomeVisible);
  const showHome = documentCount === 0 || homeVisible;
  const previousCount = useRef(documentCount);
  useEffect(() => {
    if (documentCount > previousCount.current) setHomeVisible(false);
    previousCount.current = documentCount;
  }, [documentCount, setHomeVisible]);
  const panelsHidden = useUIStore((s) => s.panelsHidden);
  const toolbarVisible = useUIStore((s) => s.toolbarVisible);
  const rightDockVisible = useUIStore((s) => s.rightDockVisible);
  const statusBarVisible = useUIStore((s) => s.statusBarVisible);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <ToolOptionsBar />

      <div className="flex min-h-0 flex-1">
        {!showHome && !panelsHidden && toolbarVisible && <LeftToolbar />}

        <main className="flex min-w-0 flex-1 flex-col">
          {!showHome && <DocumentTabs />}
          <CanvasViewport />
        </main>

        {!showHome && rightDockVisible && !panelsHidden && <RightDock />}
      </div>

      {statusBarVisible && <StatusBar />}

      {/* Modal layer */}
      <NewDocumentDialog />
      <ExportAsDialog />
      <AboutDialog />
      <ShortcutsDialog />
    </div>
  );
}
