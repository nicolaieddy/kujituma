import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Goal, GoalStatus } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { GoalForm } from "./GoalForm";
import { GoalObjectivesList } from "./GoalObjectivesList";
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
  not_started: { 
    color: "bg-blue-100 text-blue-800", 
    icon: Clock, 
    label: "Not Started" 
  },
  in_progress: { 
    color: "bg-yellow-100 text-yellow-800", 
    icon: Play, 
    label: "In Progress" 
  },
  completed: { 
    color: "bg-green-100 text-green-800", 
    icon: CheckCircle, 
    label: "Completed" 
  }
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

  // Debug logging to check if modal is being rendered
  console.log('=== GoalDetailModal RENDER START ===');
  console.log('isOpen:', isOpen);
  console.log('goal:', goal);
  console.log('weeklyObjectives length:', weeklyObjectives?.length || 0);
  console.log('=== GoalDetailModal RENDER END ===');

  if (!goal) return null;

  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;
  const relatedObjectives = weeklyObjectives.filter(obj => obj.goal_id === goal.id);
  
  // Debug logging to help identify the linking issue
  console.log('=== GoalDetailModal Debug START ===');
  console.log('Goal ID:', goal.id);
  console.log('Goal Title:', goal.title);
  console.log('Total Weekly Objectives:', weeklyObjectives.length);
  console.log('Weekly Objectives Data:', weeklyObjectives);
  console.log('Related Objectives:', relatedObjectives);
  console.log('Related Objectives Count:', relatedObjectives.length);
  console.log('=== GoalDetailModal Debug END ===');

  const handleStatusChange = (newStatus: GoalStatus) => {
    if (newStatus !== goal.status) {
      onStatusChange(goal.id, newStatus);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (data: any) => {
    onEdit({ ...goal, ...data });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-lg border-white/20">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-5 w-5 text-white" />
                <Badge className={`${config.color} text-sm`}>
                  {config.label}
                </Badge>
              </div>
              <DialogTitle className="text-2xl text-white">
                {goal.title}
              </DialogTitle>
              {goal.description && (
                <p className="text-white/80 mt-2">{goal.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="text-white hover:bg-white/20"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {goal.status === 'not_started' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('in_progress')}
                      className="text-white hover:bg-white/20"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {goal.status === 'in_progress' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('completed')}
                      className="text-white hover:bg-white/20"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(goal.id)}
                    className="text-red-400 hover:bg-red-500/20"
                  >
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
              onSubmit={handleSave}
              onCancel={handleCancel}
              initialData={goal}
            />
          </div>
        ) : (
          <div className="mt-6">
            <GoalObjectivesList
              goal={goal}
              objectives={relatedObjectives}
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