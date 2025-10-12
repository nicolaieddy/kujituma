
import { GoalCard } from "./GoalCard";
import { Goal, GoalStatus } from "@/types/goals";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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

export const GoalsKanban = ({ goalsByStatus, onEdit, onDelete, onStatusChange, onGoalClick }: GoalsKanbanProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
      {COLUMNS.map((column) => {
        const goals = goalsByStatus[column.status];
        const IconComponent = column.icon;
        
        return (
          <div key={column.status} className="space-y-4">
            <div className={`flex items-center justify-between ${isMobile ? 'py-3 px-4 bg-muted rounded-lg' : ''}`}>
              <div className="flex items-center gap-2">
                <IconComponent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-foreground`} />
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground`}>{column.title}</h3>
              </div>
              <Badge className={`${column.color} text-xs`}>
                {goals.length}
              </Badge>
            </div>
            
            <div className={`space-y-3 ${isMobile ? 'min-h-[200px]' : 'min-h-[300px]'}`}>
              {goals.length === 0 ? (
                <div className={`bg-muted/50 backdrop-blur-lg border-border border-2 border-dashed rounded-lg ${isMobile ? 'p-6' : 'p-8'} text-center hover:border-primary/30 transition-colors`}>
                  <IconComponent className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-muted-foreground mx-auto mb-2`} />
                  <p className="text-muted-foreground text-sm">
                    No {column.title.toLowerCase()} goals yet
                  </p>
                </div>
              ) : (
                goals.map((goal) => (
                  <GoalCard
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
          </div>
        );
      })}
    </div>
  );
};
