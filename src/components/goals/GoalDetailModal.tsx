import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Goal, GoalStatus } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { GoalForm } from "./GoalForm";
import { GoalDetailHabitsSection } from "./GoalDetailHabitsSection";
import { GoalDetailObjectivesSection } from "./GoalDetailObjectivesSection";
import { Edit, CheckCircle, Play, Clock, Trash2 } from "lucide-react";

interface GoalDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  weeklyObjectives: WeeklyObjective[];
  onCreateObjective: (goalId: string, text: string, weekStart?: string) => void;
  onUpdateObjective: (id: string, updates: any) => void;
  onDeleteObjective: (id: string) => void;
}

const STATUS_CONFIG = {
  not_started: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "Not Started" },
  in_progress: { color: "bg-yellow-100 text-yellow-800", icon: Play, label: "In Progress" },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Completed" },
  deprioritized: { color: "bg-gray-100 text-gray-600", icon: Clock, label: "Deprioritized" }
};

export const GoalDetailModal = ({
  goal,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  weeklyObjectives,
  onCreateObjective,
  onUpdateObjective,
  onDeleteObjective,
}: GoalDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (!goal) return null;

  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card shadow-elegant">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-5 w-5 text-primary" />
                <Badge className={`${config.color} text-sm`}>{config.label}</Badge>
              </div>
              <DialogTitle className="text-2xl text-foreground">{goal.title}</DialogTitle>
              {goal.description && <p className="text-muted-foreground mt-2">{goal.description}</p>}
            </div>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />Edit
                  </Button>
                  {goal.status === 'not_started' && (
                    <Button variant="ghost" size="sm" onClick={() => onStatusChange(goal.id, 'in_progress')}>
                      <Play className="h-4 w-4 mr-2" />Start
                    </Button>
                  )}
                  {goal.status === 'in_progress' && (
                    <Button variant="ghost" size="sm" onClick={() => onStatusChange(goal.id, 'completed')}>
                      <CheckCircle className="h-4 w-4 mr-2" />Complete
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onDelete(goal.id)} className="text-destructive hover:bg-destructive/20">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {isEditing ? (
          <div className="mt-6">
            <GoalForm 
              key={`edit-${goal.id}`} 
              onSubmit={(data) => { onEdit({ ...goal, ...data }); setIsEditing(false); }} 
              onCancel={() => setIsEditing(false)} 
              initialData={goal} 
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <GoalDetailHabitsSection 
              goal={goal} 
              onEdit={onEdit} 
            />
            
            <GoalDetailObjectivesSection
              goalId={goal.id}
              weeklyObjectives={weeklyObjectives}
              onCreateObjective={onCreateObjective}
              onUpdateObjective={onUpdateObjective}
              onDeleteObjective={onDeleteObjective}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
