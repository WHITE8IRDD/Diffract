/**
 * Diffract — application root.
 *
 * Wires the global tooltip provider, keyboard shortcuts and the shell.
 * Everything below this file is organised by the monorepo layout:
 *   components/ · engine/ · tools/ · ai/ · store/ · hooks/ · utils/
 */

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { setSampleDocumentResolver } from "@/tools/ViewTools";
import { useDocumentStore } from "@/store/useDocumentStore";

export default function App() {
  useKeyboardShortcuts();

  // The Eyedropper samples the flattened composite of the active document;
  // wire the resolver once at startup (tools stay free of store imports).
  useEffect(() => {
    setSampleDocumentResolver(() => useDocumentStore.getState().activeDocumentId);
  }, []);

  return (
    <TooltipProvider delayDuration={400}>
      <AppShell />
    </TooltipProvider>
  );
}
