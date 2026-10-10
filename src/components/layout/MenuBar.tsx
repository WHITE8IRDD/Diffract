/**
 * MenuBar — Windows 11 Fluent application menu.
 *
 * Photoshop-style behaviour:
 *  * click to open, then hover other titles with the menu open (they switch);
 *  * keyboard shortcuts are shown right-aligned;
 *  * items outside the current phase render disabled with a phase badge.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { clearRecent, listRecent, openRecent, subscribeRecent, type RecentFile } from "@/io/recentFiles";
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
import { useDocumentStore } from "@/store/useDocumentStore";
import { useUIStore } from "@/store/useUIStore";
import { useAppCommands } from "@/hooks/useAppCommands";
import { cn } from "@/utils/cn";

export function MenuBar({ compact = false }: { compact?: boolean }) {
  const openMenuId = useUIStore((s) => s.openMenuId);
  const setOpenMenuId = useUIStore((s) => s.setOpenMenuId);
  const commands = useAppCommands();
  const [recent, setRecent] = useState<RecentFile[]>(() => listRecent());
  useEffect(() => subscribeRecent(() => setRecent(listRecent())), []);
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
      className={cn("flex h-[30px] shrink-0 items-stretch gap-0.5 px-1", compact ? "bg-transparent" : "border-b border-stroke-subtle bg-surface")}
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
              ) : item.id === "file.openRecent" ? (
                <RecentMenu key="recent" items={recent} />
              ) : (
                <MenuRow key={`${item.id}-${i}`} item={item} onAction={commands.run} />
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}

      {!compact && <div className="ml-auto flex items-center pr-1 text-[11px] text-foreground-disabled">Diffract</div>}
    </div>
  );
}

function RecentMenu({ items }: { items: RecentFile[] }) {
  return <DropdownMenuSub>
    <DropdownMenuSubTrigger>Open Recent</DropdownMenuSubTrigger>
    <DropdownMenuSubContent className="min-w-[230px]">
      {items.length === 0 ? <DropdownMenuItem disabled>No recent files</DropdownMenuItem> : items.map(entry =>
        <DropdownMenuItem key={entry.id} title={entry.kind === "native" ? entry.id : entry.name}
          onSelect={() => void openRecent(entry).catch(error => window.alert(error instanceof Error ? error.message : String(error)))}>
          <span className="max-w-[210px] truncate">{entry.name}</span>
        </DropdownMenuItem>)}
      {items.length > 0 && <><DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void clearRecent()}>Clear Recent Files</DropdownMenuItem></>}
    </DropdownMenuSubContent>
  </DropdownMenuSub>;
}

function MenuRow({
  item,
  onAction,
}: {
  item: MenuItem;
  onAction: (id: MenuActionId) => void;
}) {
  const hasDocument = useDocumentStore(s => s.activeDocumentId !== null);
  const needsDocument = !item.id.startsWith("help.") && !item.id.startsWith("window.") &&
    !["file.new", "file.open", "file.openRecent"].includes(item.id);
  const disabled = (item.phase !== undefined && item.phase > 1) || (needsDocument && !hasDocument);

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
