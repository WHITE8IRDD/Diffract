/**
 * MenuBar — Windows 11 Fluent application menu.
 *
 * Photoshop-style behaviour:
 *  * click to open, then hover other titles with the menu open (they switch);
 *  * keyboard shortcuts are shown right-aligned;
 *  * items outside the current phase render disabled with a phase badge.
 */

import { useCallback, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENUS, type MenuActionId, type MenuItem } from "./menuData";
import { useUIStore } from "@/store/useUIStore";
import { useAppCommands } from "@/hooks/useAppCommands";
import { cn } from "@/utils/cn";

export function MenuBar() {
  const openMenuId = useUIStore((s) => s.openMenuId);
  const setOpenMenuId = useUIStore((s) => s.setOpenMenuId);
  const commands = useAppCommands();
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Photoshop's "menu stays open" behaviour: once any menu is open, pointer
   * enter on another title switches directly to it.
   */
  const onTitlePointerEnter = useCallback(
    (id: string) => {
      if (openMenuId !== null && openMenuId !== id) setOpenMenuId(id);
    },
    [openMenuId, setOpenMenuId],
  );

  return (
    <div
      ref={rootRef}
      className="flex h-[30px] shrink-0 items-stretch gap-0.5 border-b border-stroke-subtle bg-surface px-1"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {MENUS.map((menu) => (
        <DropdownMenu
          key={menu.id}
          open={openMenuId === menu.id}
          onOpenChange={(open) => setOpenMenuId(open ? menu.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onPointerEnter={() => onTitlePointerEnter(menu.id)}
              className={cn(
                "difr-focus-ring rounded-sm px-2.5 text-[12px] text-foreground-secondary transition-colors",
                openMenuId === menu.id
                  ? "bg-surface-hover text-foreground"
                  : "hover:bg-surface-hover hover:text-foreground",
              )}
            >
              {menu.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={0} className="min-w-[220px]">
            {menu.items.map((item, i) =>
              item.kind === "separator" ? (
                <DropdownMenuSeparator key={`${item.id}-sep-${i}`} />
              ) : (
                <MenuRow key={`${item.id}-${i}`} item={item} onAction={commands.run} />
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}

      {/* Brand badge pinned to the right of the menu strip */}
      <div className="ml-auto flex items-center pr-1 text-[11px] text-foreground-disabled">
        <span className="difr-spectrum mr-1.5 h-1.5 w-1.5 rounded-full" />
        AI-Native Image Editor
      </div>
    </div>
  );
}

function MenuRow({
  item,
  onAction,
}: {
  item: MenuItem;
  onAction: (id: MenuActionId) => void;
}) {
  const disabled = item.phase !== undefined && item.phase > 1;

  if (item.submenu !== undefined && item.submenu.length === 0) {
    // Placeholder submenu — enabled only when it gains real entries.
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled>
          {item.label}
          <PhaseBadge phase={item.phase} />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuLabel className="py-2">
            Coming in Phase {item.phase ?? 2}
          </DropdownMenuLabel>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={() => onAction(item.id)}
      className="gap-3"
    >
      <span className="flex-1">{item.label}</span>
      {item.shortcut && (
        <span className="ml-6 text-[10px] text-foreground-disabled">{item.shortcut}</span>
      )}
      <PhaseBadge phase={item.phase} />
    </DropdownMenuItem>
  );
}

function PhaseBadge({ phase }: { phase?: 1 | 2 | 3 | 4 }) {
  if (phase === undefined || phase === 1) return null;
  return (
    <span className="rounded-sm bg-surface-3 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-foreground-tertiary">
      P{phase}
    </span>
  );
}
