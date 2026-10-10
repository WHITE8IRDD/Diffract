/**
 * RightDock — the stacked panel column (Photoshop's right-hand dock).
 *
 * Panels are collapsible and can be hidden individually (Window menu).
 * Order: Layers, Properties, History, Color — matching the workspace spec.
 * Docking/undocking of individual panels is Phase 2 (the shell keeps the
 * structure already: visibility + collapse state per panel).
 */

import { useUIStore } from "@/store/useUIStore";
import { PanelShell } from "@/components/panels/PanelShell";
import { LayersPanel } from "@/components/panels/LayersPanel";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { HistoryPanel } from "@/components/panels/HistoryPanel";
import { ColorPickerPanel } from "@/components/panels/ColorPickerPanel";

const PANELS = [
  { id: "layers" as const, title: "Layers", Component: LayersPanel },
  { id: "properties" as const, title: "Properties", Component: PropertiesPanel },
  { id: "history" as const, title: "History", Component: HistoryPanel },
  { id: "color" as const, title: "Color", Component: ColorPickerPanel },
];

export function RightDock() {
  const panels = useUIStore((s) => s.panels);
  const collapsePanel = useUIStore((s) => s.collapsePanel);

  return (
    <aside className="flex w-[268px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-stroke-subtle bg-background p-2">
      {PANELS.map(({ id, title, Component }) => {
        const state = panels[id];
        if (!state.visible) return null;
        return (
          <PanelShell
            key={id}
            title={title}
            collapsed={state.collapsed}
            onCollapsedChange={(c) => collapsePanel(id, c)}
            className={id === "layers" ? "min-h-[220px]" : undefined}
            bodyClassName={id === "layers" ? "flex" : undefined}
          >
            <Component />
          </PanelShell>
        );
      })}
    </aside>
  );
}
