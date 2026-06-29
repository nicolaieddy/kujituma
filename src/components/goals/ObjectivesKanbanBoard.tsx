import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
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
import { GripVertical, Target, Pencil, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WeeklyObjective, ObjectiveStatus } from "@/types/weeklyProgress";
import type { Goal } from "@/types/goals";
import { STATUS_COLUMNS, STATUS_META, deriveStatus } from "@/lib/objectiveStatus";
import { KanbanColumnShell } from "@/components/kanban/KanbanColumnShell";

interface Props {
  objectives: WeeklyObjective[];
  goals: Goal[];
  isWeekCompleted: boolean;
  onChangeStatus: (id: string, status: ObjectiveStatus) => void;
  onReorderObjectives?: (updates: { id: string; order_index: number }[]) => void;
  onEditObjective?: (objective: WeeklyObjective) => void;
  onDeleteObjective?: (id: string) => void;
  pendingUpdateIds?: Set<string>;
}

const UNLINKED_KEY = "__unlinked__";

export function ObjectivesKanbanBoard({
  objectives,
  goals,
  isWeekCompleted,
  onChangeStatus,
  onReorderObjectives,
  onEditObjective,
  onDeleteObjective,
  pendingUpdateIds = new Set(),
}: Props) {
  // Optimistic local copy so cards snap immediately on drop.
  const [local, setLocal] = useState<WeeklyObjective[]>(objectives);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setLocal(objectives);
  }, [objectives]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const goalById = useMemo(() => {
    const m = new Map<string, Goal>();
    for (const g of goals) m.set(g.id, g);
    return m;
  }, [goals]);

  // status -> goalId -> objectives[] (sorted by order_index)
  const grouped = useMemo(() => {
    const map: Record<ObjectiveStatus, Map<string, WeeklyObjective[]>> = {
      not_started: new Map(),
      in_progress: new Map(),
      done: new Map(),
    };
    const sorted = [...local].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
    for (const o of sorted) {
      const s = deriveStatus(o);
      const key = o.goal_id ?? UNLINKED_KEY;
      const bucket = map[s].get(key) ?? [];
      bucket.push(o);
      map[s].set(key, bucket);
    }
    return map;
  }, [local]);

  const idsByColumn = useMemo(() => {
    const out: Record<ObjectiveStatus, string[]> = {
      not_started: [],
      in_progress: [],
      done: [],
    };
    for (const status of STATUS_COLUMNS) {
      for (const [, items] of grouped[status]) {
        for (const i of items) out[status].push(i.id);
      }
    }
    return out;
  }, [grouped]);

  function findColumn(id: string): ObjectiveStatus | null {
    if ((STATUS_COLUMNS as string[]).includes(id)) return id as ObjectiveStatus;
    const obj = local.find((o) => o.id === id);
    return obj ? deriveStatus(obj) : null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeCol = findColumn(activeIdStr);
    const overCol = findColumn(overIdStr);
    if (!activeCol || !overCol || activeCol === overCol) return;
    // Move card into the new column optimistically (it will land at the end).
    setLocal((curr) => {
      const idx = curr.findIndex((o) => o.id === activeIdStr);
      if (idx === -1) return curr;
      const next = [...curr];
      next[idx] = { ...next[idx], status: overCol };
      return next;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeObj = local.find((o) => o.id === activeIdStr);
    if (!activeObj) return;

    const overCol = findColumn(overIdStr);
    if (!overCol) return;
    const originalStatus = deriveStatus(
      objectives.find((o) => o.id === activeIdStr) ?? activeObj
    );

    // Reorder within the column (over an id, not a column drop zone)
    let nextLocal = local;
    if (overIdStr !== overCol && overIdStr !== activeIdStr) {
      const oldIdx = local.findIndex((o) => o.id === activeIdStr);
      const newIdx = local.findIndex((o) => o.id === overIdStr);
      if (oldIdx !== -1 && newIdx !== -1) {
        nextLocal = arrayMove(local, oldIdx, newIdx);
        setLocal(nextLocal);
      }
    }

    // Persist order across the whole list (consistent with list-view reorder)
    if (onReorderObjectives) {
      onReorderObjectives(
        nextLocal.map((o, i) => ({ id: o.id, order_index: i }))
      );
    }

    // Persist status change if column changed
    if (overCol !== originalStatus) {
      onChangeStatus(activeIdStr, overCol);
    }
  }

  const activeObjective = activeId
    ? local.find((o) => o.id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {STATUS_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            groups={grouped[status]}
            goalById={goalById}
            isWeekCompleted={isWeekCompleted}
            onEditObjective={onEditObjective}
            onDeleteObjective={onDeleteObjective}
            pendingUpdateIds={pendingUpdateIds}
            itemIds={idsByColumn[status]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeObjective ? (
          <KanbanCardShell
            objective={activeObjective}
            goalTitle={
              activeObjective.goal_id
                ? goalById.get(activeObjective.goal_id)?.title ?? null
                : null
            }
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* -------------------- Column -------------------- */

interface ColumnProps {
  status: ObjectiveStatus;
  groups: Map<string, WeeklyObjective[]>;
  goalById: Map<string, Goal>;
  itemIds: string[];
  isWeekCompleted: boolean;
  onEditObjective?: (o: WeeklyObjective) => void;
  onDeleteObjective?: (id: string) => void;
  pendingUpdateIds: Set<string>;
}

function KanbanColumn({
  status,
  groups,
  goalById,
  itemIds,
  isWeekCompleted,
  onEditObjective,
  onDeleteObjective,
  pendingUpdateIds,
}: ColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = itemIds.length;

  // Stable goal order: by Goal.order_index if present, then title, with unlinked last.
  const sortedGroupKeys = useMemo(() => {
    const keys = Array.from(groups.keys());
    return keys.sort((a, b) => {
      if (a === UNLINKED_KEY) return 1;
      if (b === UNLINKED_KEY) return -1;
      const ga = goalById.get(a);
      const gb = goalById.get(b);
      const ta = ga?.title ?? "";
      const tb = gb?.title ?? "";
      return ta.localeCompare(tb);
    });
  }, [groups, goalById]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-muted/30 min-h-[200px] transition-colors",
        isOver && "bg-accent/40 ring-1 ring-primary/40"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
          <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5 px-2">
          {total}
        </Badge>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-3">
          {total === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6 px-2">
              {status === "not_started"
                ? "Drop or add objectives here"
                : status === "in_progress"
                ? "Nothing in progress"
                : "Nothing done yet"}
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {sortedGroupKeys.map((goalKey) => {
              const items = groups.get(goalKey) ?? [];
              const goal = goalKey === UNLINKED_KEY ? null : goalById.get(goalKey);
              const groupLabel = goal?.title ?? "Unlinked";
              return (
                <div key={goalKey} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span className="truncate">{groupLabel}</span>
                    <span className="text-muted-foreground/70">· {items.length}</span>
                  </div>
                  {items.map((o) => (
                    <SortableKanbanCard
                      key={o.id}
                      objective={o}
                      goalTitle={goal?.title ?? null}
                      isWeekCompleted={isWeekCompleted}
                      isPending={pendingUpdateIds.has(o.id)}
                      onEdit={onEditObjective ? () => onEditObjective(o) : undefined}
                      onDelete={onDeleteObjective ? () => onDeleteObjective(o.id) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </SortableContext>
    </div>
  );
}

/* -------------------- Card -------------------- */

interface SortableCardProps {
  objective: WeeklyObjective;
  goalTitle: string | null;
  isWeekCompleted: boolean;
  isPending: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function SortableKanbanCard({
  objective,
  goalTitle,
  isWeekCompleted,
  isPending,
  onEdit,
  onDelete,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: objective.id, disabled: isWeekCompleted });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <KanbanCardShell
        objective={objective}
        goalTitle={goalTitle}
        dragging={isDragging}
        isPending={isPending}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={!isWeekCompleted ? { ...attributes, ...listeners } : undefined}
      />
    </motion.div>
  );
}

interface CardShellProps {
  objective: WeeklyObjective;
  goalTitle: string | null;
  dragging?: boolean;
  isPending?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

function KanbanCardShell({
  objective,
  goalTitle,
  dragging,
  isPending,
  onEdit,
  onDelete,
  dragHandleProps,
}: CardShellProps) {
  const status = deriveStatus(objective);
  const meta = STATUS_META[status];
  return (
    <div
      className={cn(
        "group relative rounded-md border border-border bg-background border-l-2 p-2.5 shadow-sm",
        meta.accent,
        dragging && "shadow-lg ring-1 ring-primary/30",
        status === "done" && "opacity-80"
      )}
    >
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            className="mt-0.5 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Drag"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm text-foreground break-words leading-snug",
              status === "done" && "line-through decoration-muted-foreground"
            )}
          >
            {objective.text}
          </p>
          <div className="mt-1.5 flex items-center flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {goalTitle && (
              <span className="inline-flex items-center gap-1 max-w-[180px]">
                <Target className="h-3 w-3 shrink-0" />
                <span className="truncate">{goalTitle}</span>
              </span>
            )}
            {objective.scheduled_day && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {objective.scheduled_day}
                {objective.scheduled_time ? ` · ${objective.scheduled_time}` : ""}
              </span>
            )}
            {isPending && <span className="text-primary">Saving…</span>}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Edit"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Delete"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
