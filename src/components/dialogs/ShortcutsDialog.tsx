import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTool, PlaceholderTool } from "@/tools/ToolRegistry";
import type { ToolId } from "@/tools/types";
import { SHORTCUTS } from "@/utils/shortcuts";
import { useUIStore } from "@/store/useUIStore";

export function ShortcutsDialog() {
  const open = useUIStore(s => s.dialogs.shortcuts);
  const close = useUIStore(s => s.closeDialog);
  return <Dialog open={open} onOpenChange={value => { if (!value) close("shortcuts"); }}>
    <DialogContent className="max-h-[80vh] max-w-[500px] overflow-y-auto">
      <DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle></DialogHeader>
      <p className="text-xs text-foreground-tertiary">Ctrl on Windows/Linux · Command on macOS. Shortcuts pause while typing in a field.</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1">
        {SHORTCUTS.filter(s => !["image.canvasSize", "select.inverse", "window.toggleStatusBar"].includes(s.action) &&
          (s.action.includes(".") || s.action === "window.togglePanels" || !(getTool(s.action as ToolId) instanceof PlaceholderTool))).map(s =>
          <div key={s.keys} className="flex items-center justify-between border-b border-stroke-subtle py-1 text-xs">
            <span className="text-foreground-secondary">{s.action.replaceAll(".", " · ").replaceAll("-", " ")}</span>
            <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-foreground">{s.keys}</kbd>
          </div>)}
      </div>
    </DialogContent>
  </Dialog>;
}
