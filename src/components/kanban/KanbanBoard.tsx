import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanColumnShell } from "./KanbanColumnShell";

export interface KanbanColumnDef<TStatus extends string> {
  id: TStatus;
  title: string;
  icon?: LucideIcon;
  accentDot?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

export interface KanbanRenderCardOpts {
  dragging: boolean;
}

export interface RenderColumnBodyArgs<TItem, TStatus extends string> {
  column: KanbanColumnDef<TStatus>;
  items: TItem[];
  /** Wrap each card in the centrally-managed sortable wrapper. */
  renderCard: (item: TItem) => ReactNode;
}

export interface KanbanBoardProps<TItem, TStatus extends string> {
  columns: KanbanColumnDef<TStatus>[];
  items: TItem[];
  getId: (item: TItem) => string;
  getStatus: (item: TItem) => TStatus;

  renderCard: (item: TItem, opts: KanbanRenderCardOpts) => ReactNode;
  renderColumnBody?: (args: RenderColumnBodyArgs<TItem, TStatus>) => ReactNode;

  /**
   * Called when a card is dropped into a different column.
   * Return `false` to cancel the default persist (the optimistic move is kept,
   * so callers can prompt for extra info before persisting themselves).
   */
  onMove?: (itemId: string, from: TStatus, to: TStatus, item: TItem) => boolean | void;
  /** Called when items in a column are reordered. Receives the column's new ordered ids
   *  plus a snapshot of the full local item list (for boards that persist a global order). */
  onReorder?: (columnId: TStatus, orderedIds: string[], allOrderedItems: TItem[]) => void;

  renderDragOverlay?: (item: TItem) => ReactNode;

  /** Disable all DnD wiring; renders the same column layout read-only. */
  readOnly?: boolean;
  /** Disable interaction without skipping DnD wiring entirely (e.g. while week is closed). */
  disabled?: boolean;
  /** Custom grid classes (defaults to a 3-col responsive grid). */
  gridClassName?: string;
}

const DEFAULT_GRID = "grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4";

export function KanbanBoard<TItem, TStatus extends string>({
  columns,
  items,
  getId,
  getStatus,
  renderCard,
  renderColumnBody,
  onMove,
  onReorder,
  renderDragOverlay,
  readOnly,
  disabled,
  gridClassName,
}: KanbanBoardProps<TItem, TStatus>) {
  const [local, setLocal] = useState<TItem[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setLocal(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const itemsByColumn = useMemo(() => {
    const map = new Map<TStatus, TItem[]>();
    for (const col of columns) map.set(col.id, []);
    for (const item of local) {
      const status = getStatus(item);
      const bucket = map.get(status);
      if (bucket) bucket.push(item);
    }
    return map;
  }, [local, columns, getStatus]);

  const findColumn = (id: string): TStatus | null => {
    if ((columnIds as string[]).includes(id)) return id as TStatus;
    const item = local.find((i) => getId(i) === id);
    return item ? getStatus(item) : null;
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const aId = String(active.id);
    const oId = String(over.id);
    const from = findColumn(aId);
    const to = findColumn(oId);
    if (!from || !to || from === to) return;

    setLocal((curr) => {
      const idx = curr.findIndex((i) => getId(i) === aId);
      if (idx === -1) return curr;
      const moved = curr[idx];
      // Mutate the item's status via a shallow clone — works for object items
      // where status is a top-level prop. Callers that derive status from a
      // computed field should still be fine since findColumn re-reads getStatus.
      const next = [...curr];
      next[idx] = { ...(moved as object), status: to } as TItem;
      return next;
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const aId = String(active.id);
    const oId = String(over.id);

    const originalItem = items.find((i) => getId(i) === aId);
    const movedItem = local.find((i) => getId(i) === aId);
    if (!movedItem) return;

    const fromCol = originalItem ? getStatus(originalItem) : null;
    const toCol = findColumn(aId); // post-optimistic
    if (!toCol) return;

    // Same-column reorder (only if dropped on another card, not the column itself).
    let nextLocal = local;
    if (oId !== toCol && oId !== aId) {
      const oldIdx = local.findIndex((i) => getId(i) === aId);
      const newIdx = local.findIndex((i) => getId(i) === oId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        nextLocal = arrayMove(local, oldIdx, newIdx);
        setLocal(nextLocal);
      }
    }

    // Cross-column status change.
    if (fromCol && fromCol !== toCol) {
      const result = onMove?.(aId, fromCol, toCol, movedItem);
      if (result === false) {
        // Caller is taking over persistence; keep optimistic state, skip reorder persist.
        return;
      }
    }

    // Reorder persistence for the destination column.
    if (onReorder) {
      const colIds = nextLocal
        .filter((i) => getStatus(i) === toCol || getId(i) === aId)
        .filter((i) => {
          // After the optimistic over-handler, the moved item already has toCol status.
          return getStatus(i) === toCol;
        })
        .map((i) => getId(i));
      onReorder(toCol, colIds);
    }
  };

  // Read-only branch — render the same shells without DnD.
  if (readOnly) {
    return (
      <div className={cn(gridClassName ?? DEFAULT_GRID)}>
        {columns.map((col) => {
          const colItems = itemsByColumn.get(col.id) ?? [];
          return (
            <KanbanColumnShell
              key={col.id}
              title={col.title}
              icon={col.icon}
              accentDot={col.accentDot}
              count={colItems.length}
              isEmpty={colItems.length === 0}
              emptyIcon={col.emptyIcon ?? col.icon}
              emptyMessage={col.emptyMessage}
            >
              {renderColumnBody ? (
                renderColumnBody({
                  column: col,
                  items: colItems,
                  renderCard: (item) => renderCard(item, { dragging: false }),
                })
              ) : (
                <div className="space-y-3">
                  {colItems.map((item) => (
                    <div key={getId(item)}>{renderCard(item, { dragging: false })}</div>
                  ))}
                </div>
              )}
            </KanbanColumnShell>
          );
        })}
      </div>
    );
  }

  const activeItem = activeId ? local.find((i) => getId(i) === activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn(gridClassName ?? DEFAULT_GRID)}>
        {columns.map((col) => {
          const colItems = itemsByColumn.get(col.id) ?? [];
          return (
            <DroppableColumn
              key={col.id}
              column={col}
              items={colItems}
              getId={getId}
              renderCard={renderCard}
              renderColumnBody={renderColumnBody}
              disabled={disabled}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeItem && renderDragOverlay ? renderDragOverlay(activeItem) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn<TItem, TStatus extends string>({
  column,
  items,
  getId,
  renderCard,
  renderColumnBody,
  disabled,
}: {
  column: KanbanColumnDef<TStatus>;
  items: TItem[];
  getId: (i: TItem) => string;
  renderCard: (i: TItem, opts: KanbanRenderCardOpts) => ReactNode;
  renderColumnBody?: (args: RenderColumnBodyArgs<TItem, TStatus>) => ReactNode;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled });
  const ids = items.map(getId);

  const renderOne = (item: TItem) => (
    <SortableItem key={getId(item)} id={getId(item)} disabled={disabled}>
      {(dragging) => renderCard(item, { dragging })}
    </SortableItem>
  );

  return (
    <KanbanColumnShell
      droppableRef={setNodeRef}
      isOver={isOver}
      title={column.title}
      icon={column.icon}
      accentDot={column.accentDot}
      count={items.length}
      isEmpty={items.length === 0}
      emptyIcon={column.emptyIcon ?? column.icon}
      emptyMessage={column.emptyMessage}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {renderColumnBody ? (
          renderColumnBody({ column, items, renderCard: renderOne })
        ) : (
          <div className="space-y-3">{items.map(renderOne)}</div>
        )}
      </SortableContext>
    </KanbanColumnShell>
  );
}

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (dragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children(isDragging)}
    </div>
  );
}
