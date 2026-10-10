/**
 * LeftToolbar — Photoshop-style vertical tool strip.
 *
 * * Single click activates the group's primary tool.
 * * Long-press (or right-click) a grouped button opens the flyout.
 * * Tool tips show name + Photoshop-compatible shortcut.
 * * The active tool shows the accent rail on its left edge.
 */

import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { TOOL_GROUPS, getTool } from "@/tools/ToolRegistry";
import { toolIcon } from "@/components/icons/toolIcon";
import type { ToolId } from "@/tools/types";
import { shortcutFor } from "@/utils/shortcuts";
import { useUIStore } from "@/store/useUIStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

export function LeftToolbar() {
  const activeToolId = useUIStore((s) => s.activeToolId);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const [flyout, setFlyout] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);

  return (
    <div className="flex w-[44px] shrink-0 flex-col items-center gap-0.5 border-r border-stroke-subtle bg-surface py-1.5">
      {TOOL_GROUPS.map((group) => {
        const tool = getTool(group.primary);
        const Icon = toolIcon(group.primary);
        const active = group.members.includes(activeToolId);
        const grouped = group.members.length > 1;

        return (
          <div key={group.primary} className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={tool.name}
                  className={cn(
                    "difr-focus-ring difr-press relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground",
                  )}
                  onClick={() => setActiveTool(group.primary)}
                  onPointerDown={() => {
                    if (!grouped) return;
                    holdTimer.current = window.setTimeout(() => {
                      setFlyout(group.primary);
                    }, 420);
                  }}
                  onPointerUp={() => {
                    if (holdTimer.current !== null) {
                      clearTimeout(holdTimer.current);
                      holdTimer.current = null;
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!grouped) return;
                    e.preventDefault();
                    setFlyout((f) => (f === group.primary ? null : group.primary));
                  }}
                >
                  <Icon size={17} className={active ? "text-accent" : undefined} />
                  {active && (
                    <span className="absolute left-[-6px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  {grouped && (
                    <ChevronRight className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 text-foreground-disabled" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                {tool.name}
                <kbd className="rounded-sm border border-stroke px-1 text-[10px] text-foreground-tertiary">
                  {shortcutFor(group.primary)}
                </kbd>
              </TooltipContent>
            </Tooltip>

            {/* Flyout with the group's variants */}
            {flyout === group.primary && (
              <Flyout
                members={group.members}
                activeToolId={activeToolId}
                onPick={(id) => {
                  setActiveTool(id);
                  setFlyout(null);
                }}
                onClose={() => setFlyout(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Flyout({
  members,
  activeToolId,
  onPick,
  onClose,
}: {
  members: ToolId[];
  activeToolId: ToolId;
  onPick: (id: ToolId) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* click-catcher */}
      <div className="fixed inset-0 z-[100]" onPointerDown={onClose} />
      <div className="difr-menu-enter absolute left-[42px] top-0 z-[101] min-w-[190px] rounded-md border border-stroke bg-popover p-1 shadow-2xl">
        {members.map((id) => {
          const tool = getTool(id);
          const Icon = toolIcon(id);
          return (
            <button
              key={id}
              type="button"
              className={cn(
                "difr-focus-ring flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors",
                id === activeToolId
                  ? "bg-surface-hover text-foreground"
                  : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground",
              )}
              onClick={() => onPick(id)}
            >
              <Icon size={15} />
              <span className="flex-1">{tool.name}</span>
              <kbd className="rounded-sm border border-stroke px-1 text-[10px] text-foreground-disabled">
                {shortcutFor(id)}
              </kbd>
            </button>
          );
        })}
      </div>
    </>
  );
}
