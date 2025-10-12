
import { GoalCard } from "./GoalCard";
import { Goal, GoalStatus } from "@/types/goals";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableGoalCard } from "./SortableGoalCard";
import { useState, useEffect } from "react";

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

const COLUMNS = [
  {
    status: 'not_started' as GoalStatus,
    title: 'Not Started',
    icon: Clock,
    color: 'bg-secondary text-secondary-foreground'
  },
  {
    status: 'in_progress' as GoalStatus,
    title: 'In Progress',
    icon: Play,
    color: 'bg-accent text-accent-foreground'
  },
  {
    status: 'completed' as GoalStatus,
    title: 'Completed',
    icon: CheckCircle,
    color: 'bg-primary/10 text-primary'
  }
];

export const GoalsKanban = ({ goalsByStatus, onEdit, onDelete, onStatusChange, onGoalClick, onReorder }: GoalsKanbanProps) => {
  const isMobile = useIsMobile();
  const [localGoalsByStatus, setLocalGoalsByStatus] = useState(goalsByStatus);

  useEffect(() => {
    setLocalGoalsByStatus(goalsByStatus);
  }, [goalsByStatus]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent, status: GoalStatus) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const goals = localGoalsByStatus[status];
    const oldIndex = goals.findIndex((g) => g.id === active.id);
    const newIndex = goals.findIndex((g) => g.id === over.id);

    if (oldIndex !== newIndex) {
      const newGoals = arrayMove(goals, oldIndex, newIndex);
      
      setLocalGoalsByStatus({
        ...localGoalsByStatus,
        [status]: newGoals,
      });

      // Update order indices
      if (onReorder) {
        onReorder(active.id as string, newIndex);
      }
    }
  };
  
  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
      {COLUMNS.map((column) => {
        const goals = localGoalsByStatus[column.status];
        const IconComponent = column.icon;
        
        return (
          <div key={column.status} className="space-y-4">
            <div className={`flex items-center justify-between ${isMobile ? 'py-3 px-4 bg-muted rounded-lg' : ''}`}>
              <div className="flex items-center gap-2">
                <IconComponent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-foreground`} />
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground font-serif`}>{column.title}</h3>
              </div>
              <Badge className={`${column.color} text-xs shadow-sm`}>
                {goals.length}
              </Badge>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, column.status)}
            >
              <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                <div className={`space-y-3 ${isMobile ? 'min-h-[200px]' : 'min-h-[300px]'}`}>
                  {goals.length === 0 ? (
                    <div className={`glass-card border-2 border-dashed rounded-lg ${isMobile ? 'p-6' : 'p-8'} text-center hover:border-primary/30 transition-colors`}>
                      <IconComponent className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-muted-foreground mx-auto mb-2`} />
                      <p className="text-muted-foreground text-sm">
                        No {column.title.toLowerCase()} goals yet
                      </p>
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
            </DndContext>
          </div>
        );
      })}
    </div>
  );
};
