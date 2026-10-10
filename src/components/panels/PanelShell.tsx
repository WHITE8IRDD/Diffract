/**
 * PanelShell — collapsible panel chrome shared by every right-dock panel
 * (header with title + collapse chevron + optional actions, body region).
 */

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface PanelShellProps {
  title: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PanelShell({
  title,
  collapsed,
  onCollapsedChange,
  actions,
  children,
  className,
  bodyClassName,
}: PanelShellProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-stroke-subtle bg-surface",
        className,
      )}
    >
      <header className="flex h-[28px] shrink-0 items-center gap-1 px-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          className="difr-focus-ring flex items-center gap-1 rounded-sm text-foreground-secondary hover:text-foreground"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          <span className="difr-panel-title">{title}</span>
        </button>
        <div className="ml-auto flex items-center gap-0.5">{actions}</div>
      </header>
      {!collapsed && (
        <div className={cn("min-h-0 flex-1 px-2 pb-2", bodyClassName)}>{children}</div>
      )}
    </section>
  );
}
