/**
 * HistoryPanel — the undo stack as a navigable list.
 *
 * Mirrors Photoshop: the initial "New Document" state sits at the top, each
 * subsequent command below it. Clicking a state steps the document back to
 * it (multi-level undo), and the redo stack is shown grayed below.
 */

import { useMemo } from "react";
import { History, Redo2, Undo2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export function HistoryPanel() {
  const docId = useDocumentStore((s) => s.activeDocumentId);
  // Select the stored per-document history (a stable reference) and derive the
  // label lists in render. `s.undoLabels()` builds a new array on every call,
  // which would make the subscription re-render forever.
  const history = useHistoryStore((s) => (docId ? s.byDocument[docId] : undefined));
  const undoLabels = useMemo(
    () => (history ? [...history.undoStack].reverse().map((e) => e.label) : []),
    [history],
  );
  const redoLabels = useMemo(
    () => (history ? [...history.redoStack].reverse().map((e) => e.label) : []),
    [history],
  );
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => (docId ? s.canUndo(docId) : false));
  const canRedo = useHistoryStore((s) => (docId ? s.canRedo(docId) : false));

  if (!docId) {
    return (
      <p className="py-3 text-center text-[11px] text-foreground-disabled">
        No open document.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-[120px] flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="iconSm"
          disabled={!canUndo}
          onClick={() => undo(docId)}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          disabled={!canRedo}
          onClick={() => redo(docId)}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-foreground-disabled">
          <History className="h-3 w-3" />
          {undoLabels.length + redoLabels.length}/60
        </span>
      </div>

      <ScrollArea className="flex-1 rounded-md border border-stroke-subtle">
        <div className="flex flex-col gap-px p-1">
          {/* Redo states (grayed, bottom-up) */}
          {[...redoLabels].reverse().map((label, i) => (
            <div
              key={`redo-${i}`}
              className="cursor-default rounded-sm px-2 py-1 text-[11px] text-foreground-disabled"
            >
              {label}
            </div>
          ))}

          {/* Undo states — newest last, current state highlighted */}
          {[...undoLabels].reverse().map((label, i) => {
            const isCurrent = i === 0;
            return (
              <div
                key={`undo-${i}`}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1 text-[11px]",
                  isCurrent
                    ? "bg-accent/15 text-foreground"
                    : "text-foreground-secondary hover:bg-surface-hover",
                )}
              >
                {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                <span className="truncate">{label}</span>
              </div>
            );
          })}

          {undoLabels.length === 0 && (
            <p className="p-3 text-center text-[11px] text-foreground-disabled">
              No history yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
