import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GoalCard } from "./GoalCard";
import { Goal, GoalStatus } from "@/types/goals";
import { GripVertical } from "lucide-react";

interface DraggableGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
  onDeprioritize?: (id: string) => void;
  onReprioritize?: (id: string) => void;
  isDeprioritized?: boolean;
}

export const DraggableGoalCard = ({ 
  goal, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onClick,
  onDeprioritize,
  onReprioritize,
  isDeprioritized
}: DraggableGoalCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: goal.id, 
    data: { goal, status: goal.status } 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      {/* Drop indicator line - shows above the card when hovering */}
      {isOver && !isDragging && (
        <div className="absolute -top-1.5 left-0 right-0 z-20">
          <div className="h-0.5 bg-primary rounded-full animate-pulse" />
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
      )}
      
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 rounded hover:bg-muted"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </div>
      <GoalCard
        goal={goal}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onClick={onClick}
        onDeprioritize={onDeprioritize}
        onReprioritize={onReprioritize}
        isDeprioritized={isDeprioritized}
      />
    </div>
  );
};
