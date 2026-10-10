/** PhotoCraft-style contextual controls immediately above the artboard. */
import { House } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useColorStore } from "@/store/useColorStore";
import { rgbaToHex, hexToRgba } from "@/utils/color";
import { getTool } from "@/tools/ToolRegistry";
import { selectionFor } from "@/store/useSelectionStore";
import { runAppCommand } from "@/hooks/useAppCommands";

export function ToolOptionsBar() {
  const toolId = useUIStore(s => s.activeToolId);
  const homeVisible = useUIStore(s => s.homeVisible);
  const setHomeVisible = useUIStore(s => s.setHomeVisible);
  const options = useUIStore(s => s.toolOptions);
  const setBrushOptions = useUIStore(s => s.setBrushOptions);
  const doc = useDocumentStore(s => s.documents.find(d => d.id === s.activeDocumentId));
  const fg = useColorStore(s => s.foreground);
  const activeLayer = doc?.layers.find(l => l.id === doc.activeLayerId);
  const showHome = !doc || homeVisible;
  return <div className="flex h-[37px] shrink-0 items-center gap-3 overflow-x-auto border-b border-stroke-subtle bg-surface px-2 text-[11px] text-foreground-secondary">
    <button type="button" aria-label="Home" title="Home" disabled={!doc}
      onClick={() => setHomeVisible(!homeVisible)}
      className={`difr-focus-ring flex h-[27px] w-[29px] shrink-0 items-center justify-center rounded transition-colors ${showHome ? "bg-surface-active text-accent" : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"} disabled:opacity-60`}>
      <House size={16} strokeWidth={1.8} />
    </button>
    <span className="h-4 w-px bg-stroke-strong" />
    {showHome ? <span className="text-foreground-tertiary">Home</span> : <>
    <span className="min-w-[98px] font-medium text-foreground">{getTool(toolId).name}</span>
    <span className="h-4 w-px bg-stroke-strong" />
    {(toolId === "brush" || toolId === "eraser") && <>
      <label className="flex items-center gap-1">Size <input type="number" min="1" max="400" className="w-14 rounded border border-stroke bg-surface-2 px-1.5 py-0.5"
        value={options[toolId].size} onChange={e => setBrushOptions({ size: Math.min(400, Math.max(1, Number(e.target.value))) }, toolId === "eraser")} /> px</label>
      <label className="flex items-center gap-1">Opacity <input type="number" min="0" max="100" className="w-14 rounded border border-stroke bg-surface-2 px-1.5 py-0.5"
        value={Math.round(options[toolId].opacity * 100)} onChange={e => setBrushOptions({ opacity: Math.min(100, Math.max(0, Number(e.target.value))) / 100 }, toolId === "eraser")} /> %</label>
    </>}
    {toolId === "clone-stamp" && <span>Alt-click to set the source · drag to clone pixels</span>}
    {toolId === "text" && <span>Click on the canvas to type · Ctrl+Enter to finish · edit text in Properties</span>}
    {toolId === "crop" && <>
      <span>Drag to set the crop area</span>
      <button type="button" className="rounded border border-accent px-2 py-0.5 text-accent disabled:opacity-40"
        disabled={!doc || !selectionFor(doc.id)} onClick={() => runAppCommand("image.crop")}>Crop · Enter</button>
    </>}
    {toolId === "move" && <>
      <span>Drag to move the selected layer</span>
      <button type="button" className="rounded border border-stroke px-2 py-0.5 hover:border-accent disabled:opacity-40"
        disabled={!activeLayer} onClick={() => runAppCommand("edit.transform")}>Free Transform · Ctrl+T</button>
    </>}
    {(toolId === "shape" || toolId === "shape-ellipse") && <span>Drag to draw · hold Shift to constrain proportions</span>}
    {toolId === "marquee-rect" && <span>Drag to select · Ctrl+D to deselect</span>}
    <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
      <label className="flex items-center gap-1.5">Foreground <input type="color" aria-label="Foreground color" value={rgbaToHex(fg)}
        onChange={e => { const c = hexToRgba(e.target.value); if (c) useColorStore.getState().setForeground(c); }}
        className="h-5 w-6 cursor-pointer rounded border border-stroke bg-transparent" /></label>
      <span className="text-foreground-disabled">{doc ? `${doc.width} × ${doc.height} px` : "No document"}</span>
    </div>
    </>}
  </div>;
}
