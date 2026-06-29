import { Goal, GoalStatus } from "@/types/goals";
import { Clock, Play, CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableGoalCard } from "./SortableGoalCard";
import { useState, useEffect } from "react";
import { KanbanColumnShell } from "@/components/kanban/KanbanColumnShell";

interface GoalsKanbanProps {
  goalsByStatus: {
    not_started: Goal[];
    in_progress: Goal[];
    completed: Goal[];
  };
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onGoalClick?: (goal: Goal) => void;
  onReorder?: (goalId: string, newOrderIndex: number) => void;
}

type BoardStatus = 'not_started' | 'in_progress' | 'completed';

const COLUMNS: { status: BoardStatus; title: string; icon: typeof Clock; accentDot: string }[] = [
  { status: 'not_started', title: 'Not Started', icon: Clock, accentDot: 'bg-muted-foreground/50' },
  { status: 'in_progress', title: 'In Progress', icon: Play, accentDot: 'bg-amber-500' },
  { status: 'completed', title: 'Completed', icon: CheckCircle, accentDot: 'bg-emerald-500' },
];

type LocalState = Record<BoardStatus, Goal[]>;

function findColumn(state: LocalState, id: string): BoardStatus | null {
  if ((["not_started", "in_progress", "completed"] as BoardStatus[]).includes(id as BoardStatus)) {
    return id as BoardStatus;
  }
  for (const col of COLUMNS) {
    if (state[col.status].some((g) => g.id === id)) return col.status;
  }
  return null;
}

const KanbanColumn = ({
  status,
  title,
  icon,
  accentDot,
  goals,
  onEdit,
  onDelete,
  onStatusChange,
  onGoalClick,
}: {
  status: GoalStatus;
  title: string;
  icon: typeof Clock;
  accentDot: string;
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onGoalClick?: (goal: Goal) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <KanbanColumnShell
      droppableRef={setNodeRef}
      isOver={isOver}
      title={title}
      icon={icon}
      accentDot={accentDot}
      count={goals.length}
      isEmpty={goals.length === 0}
      emptyIcon={icon}
      emptyMessage={`No ${title.toLowerCase()} goals yet`}
    >
      <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {goals.map((goal) => (
            <SortableGoalCard
              key={goal.id}
              goal={goal}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onClick={onGoalClick}
            />
          ))}
        </div>
      </SortableContext>
    </KanbanColumnShell>
  );
};

export const GoalsKanban = ({ goalsByStatus, onEdit, onDelete, onStatusChange, onGoalClick, onReorder }: GoalsKanbanProps) => {
  const isMobile = useIsMobile();
  const [local, setLocal] = useState<LocalState>(goalsByStatus);

  useEffect(() => {
    setLocal(goalsByStatus);
  }, [goalsByStatus]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const fromCol = findColumn(local, activeId);
    const toCol = findColumn(local, overId);
    if (!fromCol || !toCol || fromCol === toCol) return;

    setLocal((prev) => {
      const fromItems = [...prev[fromCol]];
      const toItems = [...prev[toCol]];
      const idx = fromItems.findIndex((g) => g.id === activeId);
      if (idx === -1) return prev;
      const [moved] = fromItems.splice(idx, 1);
      const overIdx = toItems.findIndex((g) => g.id === overId);
      const insertAt = overIdx >= 0 ? overIdx : toItems.length;
      toItems.splice(insertAt, 0, { ...moved, status: toCol });
      return { ...prev, [fromCol]: fromItems, [toCol]: toItems };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const originalCol = findColumn(goalsByStatus, activeId);
    const newCol = findColumn(local, activeId);
    if (!newCol) return;

    // Cross-column move: update status
    if (originalCol && originalCol !== newCol) {
      onStatusChange(activeId, newCol);
      return;
    }

    // Same-column reorder
    if (activeId !== overId) {
      const items = local[newCol];
      const oldIndex = items.findIndex((g) => g.id === activeId);
      const newIndex = items.findIndex((g) => g.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        setLocal((prev) => ({ ...prev, [newCol]: reordered }));
        onReorder?.(activeId, newIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            title={column.title}
            icon={column.icon}
            color={column.color}
            goals={local[column.status]}
            isMobile={isMobile}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onGoalClick={onGoalClick}
          />
        ))}
      </div>
    </DndContext>
  );
};
