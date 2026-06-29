import { Goal, GoalStatus } from "@/types/goals";
import { Clock, Play, CheckCircle } from "lucide-react";
import { GoalCard } from "./GoalCard";
import { KanbanBoard, type KanbanColumnDef } from "@/components/kanban/KanbanBoard";

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

type BoardStatus = "not_started" | "in_progress" | "completed";

const COLUMNS: KanbanColumnDef<BoardStatus>[] = [
  {
    id: "not_started",
    title: "Not Started",
    icon: Clock,
    accentDot: "bg-muted-foreground/50",
    emptyMessage: "No not started goals yet",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: Play,
    accentDot: "bg-amber-500",
    emptyMessage: "No in progress goals yet",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle,
    accentDot: "bg-emerald-500",
    emptyMessage: "No completed goals yet",
  },
];

export const GoalsKanban = ({
  goalsByStatus,
  onEdit,
  onDelete,
  onStatusChange,
  onGoalClick,
  onReorder,
}: GoalsKanbanProps) => {
  const items: Goal[] = [
    ...goalsByStatus.not_started,
    ...goalsByStatus.in_progress,
    ...goalsByStatus.completed,
  ];

  const renderCard = (goal: Goal) => (
    <GoalCard
      goal={goal}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatusChange={onStatusChange}
      onClick={onGoalClick}
    />
  );

  return (
    <KanbanBoard
      columns={COLUMNS}
      items={items}
      getId={(g) => g.id}
      getStatus={(g) => g.status as BoardStatus}
      renderCard={renderCard}
      renderDragOverlay={(g) => <div className="opacity-95">{renderCard(g)}</div>}
      onMove={(id, _from, to) => {
        onStatusChange(id, to);
      }}
      onReorder={(_col, orderedIds) => {
        if (!onReorder) return;
        // Persist the moved item's new index within its destination column.
        // KanbanBoard fires onReorder with the active item's id last-known position;
        // we detect "the changed one" by trusting orderedIds and emitting for each shifted
        // card is overkill — instead, find the most recently moved by comparing with the
        // server's column order. Simplest: emit for every id whose index changed.
        const before: string[] = [
          ...goalsByStatus.not_started,
          ...goalsByStatus.in_progress,
          ...goalsByStatus.completed,
        ]
          .filter((g) => orderedIds.includes(g.id))
          .map((g) => g.id);
        for (let i = 0; i < orderedIds.length; i++) {
          if (before[i] !== orderedIds[i]) {
            onReorder(orderedIds[i], i);
            break;
          }
        }
      }}
    />
  );
};
