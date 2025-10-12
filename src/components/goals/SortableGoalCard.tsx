import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GoalCard } from "./GoalCard";
import { Goal, GoalStatus } from "@/types/goals";
import { GripVertical } from "lucide-react";

interface SortableGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
}

export const SortableGoalCard = ({ goal, onEdit, onDelete, onStatusChange, onClick }: SortableGoalCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      </div>
      <GoalCard
        goal={goal}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onClick={onClick}
      />
    </div>
  );
};
