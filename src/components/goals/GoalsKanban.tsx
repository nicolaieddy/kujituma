
import { GoalCard } from "./GoalCard";
import { Goal, GoalStatus } from "@/types/goals";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, CheckCircle } from "lucide-react";

interface GoalsKanbanProps {
  goalsByStatus: {
    coming_up: Goal[];
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
    status: 'coming_up' as GoalStatus,
    title: 'Coming Up',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    status: 'in_progress' as GoalStatus,
    title: 'In Progress',
    icon: Play,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    status: 'completed' as GoalStatus,
    title: 'Completed',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800'
  }
];

export const GoalsKanban = ({ goalsByStatus, onEdit, onDelete, onStatusChange, onGoalClick }: GoalsKanbanProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {COLUMNS.map((column) => {
        const goals = goalsByStatus[column.status];
        const IconComponent = column.icon;
        
        return (
          <div key={column.status} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconComponent className="h-5 w-5 text-white" />
                <h3 className="text-lg font-semibold text-white">{column.title}</h3>
              </div>
              <Badge className={`${column.color} text-xs`}>
                {goals.length}
              </Badge>
            </div>
            
            <div className="space-y-3 min-h-[300px]">
              {goals.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-lg border-white/10 border-2 border-dashed rounded-lg p-8 text-center">
                  <IconComponent className="h-8 w-8 text-white/40 mx-auto mb-2" />
                  <p className="text-white/60 text-sm">
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
