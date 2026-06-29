import { forwardRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface KanbanColumnShellProps {
  /** Ref from `useDroppable` (parent owns the DnD wiring). */
  droppableRef?: (el: HTMLElement | null) => void;
  /** True when a draggable is currently over this column. */
  isOver?: boolean;

  /** Column header label. */
  title: string;
  /** Optional accent icon next to the title. */
  icon?: LucideIcon;
  /** Tailwind class for an optional colored dot (e.g. "bg-emerald-500"). */
  accentDot?: string;
  /** Item count rendered in the badge on the right. */
  count: number;

  /** Empty-state copy shown when there are no children to render. */
  emptyMessage?: string;
  /** Optional icon for the empty state. */
  emptyIcon?: LucideIcon;
  /** When true, render the empty state instead of `children`. */
  isEmpty?: boolean;

  /** Body content — typically `<SortableContext>` + cards. */
  children?: ReactNode;
  className?: string;
}

/**
 * Shared visual shell for kanban columns.
 * Owns: wrapper, header, count badge, drop highlight, empty state.
 * Does NOT own: DnD wiring, sorting, or card rendering — parents pass those in.
 */
export const KanbanColumnShell = forwardRef<HTMLDivElement, KanbanColumnShellProps>(
  function KanbanColumnShell(
    {
      droppableRef,
      isOver,
      title,
      icon: Icon,
      accentDot,
      count,
      emptyMessage = "Nothing here yet",
      emptyIcon: EmptyIcon,
      isEmpty,
      children,
      className,
    },
    ref,
  ) {
    const setRefs = (el: HTMLDivElement | null) => {
      droppableRef?.(el);
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    return (
      <div
        ref={setRefs}
        className={cn(
          "flex flex-col rounded-lg border border-border bg-muted/30 min-h-[200px] md:min-h-[300px] transition-colors",
          isOver && "bg-primary/5 ring-1 ring-primary/30",
          className,
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            {accentDot && <span className={cn("h-2 w-2 rounded-full shrink-0", accentDot)} />}
            {Icon && <Icon className="h-4 w-4 text-foreground shrink-0" />}
            <h3 className="text-sm font-semibold text-foreground font-heading truncate">
              {title}
            </h3>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 px-2 tabular-nums shrink-0">
            {count}
          </Badge>
        </div>

        <div className="flex-1 p-2 space-y-2">
          {isEmpty ? (
            <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center text-xs text-muted-foreground py-6 px-2">
              {EmptyIcon && <EmptyIcon className="h-5 w-5 mb-2 opacity-50" />}
              <p>{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    );
  },
);
