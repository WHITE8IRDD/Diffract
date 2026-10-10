/**
 * DocumentTabs — multi-document tab strip above the canvas.
 *
 * Shows one tab per open document with a dirty dot and close button;
 * the + button opens the New Document dialog. Ctrl+Tab cycling is wired
 * through `useKeyboardShortcuts` (Phase 2 polish).
 */

import { Plus, X } from "lucide-react";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/utils/cn";

export function DocumentTabs() {
  const documents = useDocumentStore((s) => s.documents);
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId);
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument);
  const closeDocument = useDocumentStore((s) => s.closeDocument);
  const openDialog = useUIStore((s) => s.openDialog);

  return (
    <div className="flex h-[30px] shrink-0 items-stretch gap-px border-b border-stroke-subtle bg-background pl-1">
      {documents.map((doc) => {
        const active = doc.id === activeDocumentId;
        return (
          <div
            key={doc.id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => setActiveDocument(doc.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActiveDocument(doc.id);
            }}
            className={cn(
              "difr-focus-ring group flex min-w-[120px] max-w-[220px] cursor-default items-center gap-2 rounded-t-md border-x border-t px-3 text-[12px] transition-colors",
              active
                ? "border-stroke bg-surface text-foreground"
                : "border-transparent text-foreground-tertiary hover:bg-surface/60 hover:text-foreground-secondary",
            )}
          >
            {doc.dirty && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
            <span className="truncate">{doc.name}</span>
            <button
              type="button"
              aria-label={`Close ${doc.name}`}
              className="ml-auto rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-surface-hover group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                closeDocument(doc.id);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        aria-label="New document"
        title="New document (Ctrl+N)"
        className="mx-1 my-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-foreground-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
        onClick={() => openDialog("newDocument")}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
