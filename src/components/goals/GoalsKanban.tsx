import { Goal, GoalStatus } from "@/types/goals";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableGoalCard } from "./SortableGoalCard";
import { useState, useEffect, useMemo } from "react";

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

const COLUMNS: { status: BoardStatus; title: string; icon: typeof Clock; color: string }[] = [
  { status: 'not_started', title: 'Not Started', icon: Clock, color: 'bg-secondary text-secondary-foreground' },
  { status: 'in_progress', title: 'In Progress', icon: Play, color: 'bg-accent text-accent-foreground' },
  { status: 'completed', title: 'Completed', icon: CheckCircle, color: 'bg-primary/10 text-primary' },
];

type LocalState = Record<BoardStatus, Goal[]>;

function findColumn(state: LocalState, id: string): GoalStatus | null {
  if ((["not_started", "in_progress", "completed"] as GoalStatus[]).includes(id as GoalStatus)) {
    return id as GoalStatus;
  }
  for (const col of COLUMNS) {
    if (state[col.status].some((g) => g.id === id)) return col.status;
  }
  return null;
}

const KanbanColumn = ({
  status,
  title,
  icon: IconComponent,
  color,
  goals,
  isMobile,
  onEdit,
  onDelete,
  onStatusChange,
  onGoalClick,
}: {
  status: GoalStatus;
  title: string;
  icon: typeof Clock;
  color: string;
  goals: Goal[];
  isMobile: boolean;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onGoalClick?: (goal: Goal) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isMobile ? 'py-3 px-4 bg-muted rounded-lg' : ''}`}>
        <div className="flex items-center gap-2">
          <IconComponent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-foreground`} />
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground font-heading`}>{title}</h3>
        </div>
        <Badge className={`${color} text-xs shadow-sm`}>{goals.length}</Badge>
      </div>

      <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-3 rounded-lg transition-colors ${isMobile ? 'min-h-[200px]' : 'min-h-[300px]'} ${isOver ? 'bg-primary/5 ring-1 ring-primary/30' : ''}`}
        >
          {goals.length === 0 ? (
            <div className={`glass-card border-2 border-dashed rounded-lg ${isMobile ? 'p-6' : 'p-8'} text-center hover:border-primary/30 transition-colors`}>
              <IconComponent className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-muted-foreground mx-auto mb-2`} />
              <p className="text-muted-foreground text-sm">No {title.toLowerCase()} goals yet</p>
            </div>
          ) : (
            goals.map((goal) => (
              <SortableGoalCard
                key={goal.id}
                goal={goal}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onClick={onGoalClick}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
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
