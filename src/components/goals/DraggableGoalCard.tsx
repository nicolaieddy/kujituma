import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GoalCard } from "./GoalCard";
import { Goal, GoalStatus, GoalVisibility } from "@/types/goals";
import { GripVertical } from "lucide-react";

interface DraggableGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
  onDeprioritize?: (id: string) => void;
  onReprioritize?: (id: string) => void;
  onPauseToggle?: (id: string, isPaused: boolean) => void;
  onVisibilityChange?: (id: string, visibility: GoalVisibility) => void;
  isDeprioritized?: boolean;
  currentStreak?: number;
}

export const DraggableGoalCard = ({ 
  goal, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onClick,
  onDeprioritize,
  onReprioritize,
  onPauseToggle,
  onVisibilityChange,
  isDeprioritized,
  currentStreak
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
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative group"
    >
      {/* Drop indicator line - shows above the card when hovering */}
      {isOver && !isDragging && (
        <div className="absolute -top-1.5 left-0 right-0 z-20">
          <div className="h-0.5 bg-primary rounded-full animate-pulse" />
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
      )}
      
      {/* Always visible drag handle on the left side */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 cursor-grab active:cursor-grabbing z-10 flex items-center justify-center bg-gradient-to-r from-muted/50 to-transparent opacity-60 hover:opacity-100 transition-opacity rounded-l-lg touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="pl-6">
        <GoalCard
          goal={goal}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onClick={onClick}
          onDeprioritize={onDeprioritize}
          onReprioritize={onReprioritize}
          onPauseToggle={onPauseToggle}
          isDeprioritized={isDeprioritized}
          currentStreak={currentStreak}
        />
      </div>
    </div>
  );
};
