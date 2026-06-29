import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Target, Pencil, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WeeklyObjective, ObjectiveStatus } from "@/types/weeklyProgress";
import type { Goal } from "@/types/goals";
import { STATUS_COLUMNS, STATUS_META, deriveStatus } from "@/lib/objectiveStatus";
import {
  KanbanBoard,
  type KanbanColumnDef,
  type RenderColumnBodyArgs,
} from "@/components/kanban/KanbanBoard";

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
  const goalById = useMemo(() => {
    const m = new Map<string, Goal>();
    for (const g of goals) m.set(g.id, g);
    return m;
  }, [goals]);

  const sortedObjectives = useMemo(
    () => [...objectives].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [objectives],
  );

  const columns: KanbanColumnDef<ObjectiveStatus>[] = STATUS_COLUMNS.map((status) => {
    const meta = STATUS_META[status];
    const emptyMessage =
      status === "not_started"
        ? "Drop or add objectives here"
        : status === "in_progress"
        ? "Nothing in progress"
        : "Nothing done yet";
    return {
      id: status,
      title: meta.label,
      accentDot: meta.dot,
      emptyMessage,
    };
  });

  const renderCard = (o: WeeklyObjective, { dragging }: { dragging: boolean }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: dragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <KanbanCardShell
        objective={o}
        goalTitle={o.goal_id ? goalById.get(o.goal_id)?.title ?? null : null}
        dragging={dragging}
        isPending={pendingUpdateIds.has(o.id)}
        showHandle={!isWeekCompleted}
        onEdit={onEditObjective ? () => onEditObjective(o) : undefined}
        onDelete={onDeleteObjective ? () => onDeleteObjective(o.id) : undefined}
      />
    </motion.div>
  );

  const renderColumnBody = ({
    items,
    renderCard: renderOne,
  }: RenderColumnBodyArgs<WeeklyObjective, ObjectiveStatus>) => {
    // Group by goal_id within the column.
    const groups = new Map<string, WeeklyObjective[]>();
    for (const o of items) {
      const key = o.goal_id ?? UNLINKED_KEY;
      const bucket = groups.get(key) ?? [];
      bucket.push(o);
      groups.set(key, bucket);
    }
    const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === UNLINKED_KEY) return 1;
      if (b === UNLINKED_KEY) return -1;
      const ta = goalById.get(a)?.title ?? "";
      const tb = goalById.get(b)?.title ?? "";
      return ta.localeCompare(tb);
    });
    return (
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedGroupKeys.map((goalKey) => {
            const groupItems = groups.get(goalKey) ?? [];
            const goal = goalKey === UNLINKED_KEY ? null : goalById.get(goalKey);
            const groupLabel = goal?.title ?? "Unlinked";
            return (
              <div key={goalKey} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span className="truncate">{groupLabel}</span>
                  <span className="text-muted-foreground/70">· {groupItems.length}</span>
                </div>
                {groupItems.map((o) => renderOne(o))}
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <KanbanBoard
      columns={columns}
      items={sortedObjectives}
      getId={(o) => o.id}
      getStatus={(o) => deriveStatus(o)}
      renderCard={renderCard}
      renderColumnBody={renderColumnBody}
      disabled={isWeekCompleted}
      onMove={(id, _from, to) => {
        onChangeStatus(id, to);
      }}
      onReorder={(_col, _ids, allOrdered) => {
        if (!onReorderObjectives) return;
        onReorderObjectives(allOrdered.map((o, i) => ({ id: o.id, order_index: i })));
      }}
      renderDragOverlay={(o) => (
        <KanbanCardShell
          objective={o}
          goalTitle={o.goal_id ? goalById.get(o.goal_id)?.title ?? null : null}
          dragging
        />
      )}
    />
  );
}

/* -------------------- Card -------------------- */

interface CardShellProps {
  objective: WeeklyObjective;
  goalTitle: string | null;
  dragging?: boolean;
  isPending?: boolean;
  showHandle?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function KanbanCardShell({
  objective,
  goalTitle,
  dragging,
  isPending,
  showHandle,
  onEdit,
  onDelete,
}: CardShellProps) {
  const status = deriveStatus(objective);
  const meta = STATUS_META[status];
  return (
    <div
      className={cn(
        "group relative rounded-md border border-border bg-background border-l-2 p-2.5 shadow-sm",
        meta.accent,
        dragging && "shadow-lg ring-1 ring-primary/30",
        status === "done" && "opacity-80",
      )}
    >
      <div className="flex items-start gap-2">
        {showHandle && (
          <span
            className="mt-0.5 text-muted-foreground/60 cursor-grab active:cursor-grabbing"
            aria-label="Drag"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm text-foreground break-words leading-snug",
              status === "done" && "line-through decoration-muted-foreground",
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                onPointerDown={(e) => e.stopPropagation()}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                onPointerDown={(e) => e.stopPropagation()}
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
