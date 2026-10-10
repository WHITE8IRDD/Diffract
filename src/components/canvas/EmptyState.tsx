/** PhotoCraft-style Home: compact central wordmark, working New/Open, drop and Recent. */
import { useEffect, useState } from "react";
import { FileImage, FilePlus2, FolderOpen, Keyboard, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { openFileAsDocument, openImageAsDocument } from "@/io/openImage";
import { clearRecent, listRecent, openRecent, recentFileType, subscribeRecent, type RecentFile } from "@/io/recentFiles";

export function EmptyState() {
  const openDialog = useUIStore(s => s.openDialog);
  const [recent, setRecent] = useState<RecentFile[]>(() => listRecent());
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeRecent(() => setRecent(listRecent())), []);

  const openItem = async (entry: RecentFile) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await openRecent(entry); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  };
  const dropFile = async (file: File) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await openFileAsDocument(file); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  };

  return <div
    className="difr-home-surface relative flex h-full w-full items-center justify-center overflow-y-auto px-5 py-8"
    onDragEnter={e => { if (Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); setDragOver(true); } }}
    onDragOver={e => { if (Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
    onDrop={e => {
      e.preventDefault(); setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void dropFile(file);
    }}
  >
    <div className="w-full max-w-[460px] text-center">
      <div className="flex items-baseline justify-center gap-2.5">
        <h1 className="text-[38px] font-semibold leading-tight tracking-[-0.035em] text-foreground">Diffract</h1>
        <span className="text-[13px] text-foreground-disabled">open source</span>
      </div>
      <p className="mt-1 text-[14px] text-foreground-tertiary">Create a new document or open an existing file.</p>

      <div className="mt-7 flex items-center justify-center gap-3">
        <button type="button" onClick={() => openDialog("newDocument")}
          className="difr-focus-ring flex h-9 w-[190px] items-center justify-center gap-2 rounded bg-accent text-[12px] font-medium text-accent-fg transition-colors hover:bg-accent-hover">
          <FilePlus2 size={15} /> New document…
          <kbd className="ml-auto mr-2 rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-normal">Ctrl+N</kbd>
        </button>
        <button type="button" onClick={() => void openImageAsDocument()}
          className="difr-focus-ring flex h-9 w-[190px] items-center justify-center gap-2 rounded border border-stroke-strong bg-surface-2 text-[12px] font-medium text-foreground-secondary transition-colors hover:border-foreground-disabled hover:bg-surface-hover hover:text-foreground">
          <FolderOpen size={15} /> Open…
          <kbd className="ml-auto mr-2 rounded bg-background px-1.5 py-0.5 text-[10px] font-normal text-foreground-tertiary">Ctrl+O</kbd>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-foreground-disabled">
        <FileImage size={16} strokeWidth={1.7} />
        Drop an image or .diffract project here to open it.
      </div>

      {recent.length > 0 && <div className="mx-auto mt-7 w-full max-w-[390px] text-left">
        <div className="mb-1 flex items-center justify-between px-2">
          <h2 className="text-[12px] font-semibold text-foreground-secondary">Recent</h2>
          <button type="button" onClick={() => void clearRecent()} className="text-[11px] text-foreground-disabled hover:text-foreground">Clear list</button>
        </div>
        <div className="flex flex-col gap-px">
          {recent.map(entry => <button key={entry.id} type="button" disabled={busy}
            title={entry.kind === "native" ? entry.id : entry.name}
            onClick={() => void openItem(entry)}
            className="difr-focus-ring flex h-[32px] w-full items-center gap-2 rounded px-2 text-left text-[12px] text-foreground-secondary transition-colors hover:bg-surface-hover disabled:opacity-50">
            <FileImage size={15} className="shrink-0 text-foreground-tertiary" />
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            <span className="max-w-[116px] truncate text-[11px] text-foreground-disabled">{entry.location || recentFileType(entry.name)}</span>
          </button>)}
        </div>
      </div>}

      {error && <div role="alert" className="mx-auto mt-5 flex max-w-[390px] items-center justify-between gap-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-left text-xs text-destructive">
        <span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X size={14} /></button>
      </div>}

      <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-foreground-disabled">
        <button type="button" onClick={() => openDialog("shortcuts")} className="flex items-center gap-1.5 hover:text-foreground-secondary"><Keyboard size={14} /> Keyboard shortcuts</button>
        <span className="h-3 w-px bg-stroke-strong" />
        <button type="button" onClick={() => openDialog("about")} className="hover:text-foreground-secondary">About Diffract</button>
      </div>
    </div>
    {dragOver && <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded border-2 border-dashed border-accent bg-accent/10 text-[14px] font-medium text-accent">Drop to open</div>}
  </div>;
}
