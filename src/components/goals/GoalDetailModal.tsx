import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Goal, GoalStatus } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { GoalForm } from "./GoalForm";
import { GoalObjectivesList } from "./GoalObjectivesList";
import { HabitCompletionTimeline } from "./HabitCompletionTimeline";
import { HabitItemsCard } from "./HabitItemsCard";
import { Edit, CheckCircle, Play, Clock, Trash2, Plus, Target } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

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
  },
  deprioritized: {
    color: "bg-gray-100 text-gray-600",
    icon: Clock,
    label: "Deprioritized"
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
  const [quickAddText, setQuickAddText] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  if (!goal) return null;

  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;
  const relatedObjectives = weeklyObjectives.filter(obj => obj.goal_id === goal.id);

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

  const handleClose = () => {
    setIsEditing(false);
    setIsQuickAdding(false);
    setQuickAddText("");
    onClose();
  };

  const handleQuickAddObjective = () => {
    if (!quickAddText.trim()) return;
    const currentWeekStart = WeeklyProgressService.getWeekStart();
    onCreateObjective(goal.id, quickAddText.trim(), currentWeekStart);
    setQuickAddText("");
    setIsQuickAdding(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card shadow-elegant">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-5 w-5 text-primary" />
                <Badge className={`${config.color} text-sm`}>
                  {config.label}
                </Badge>
              </div>
              <DialogTitle className="text-2xl text-foreground">
                {goal.title}
              </DialogTitle>
              {goal.description && (
                <p className="text-muted-foreground mt-2">{goal.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {goal.status === 'not_started' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('in_progress')}
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
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(goal.id)}
                    className="text-destructive hover:bg-destructive/20"
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
              key={`edit-${goal.id}`}
              onSubmit={handleSave}
              onCancel={handleCancel}
              initialData={goal}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Quick Add Objective */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              {isQuickAdding ? (
                <div className="flex items-center gap-2 flex-1">
                  <Target className="h-5 w-5 text-primary flex-shrink-0" />
                  <Input
                    value={quickAddText}
                    onChange={(e) => setQuickAddText(e.target.value)}
                    placeholder="Quick add objective for this week..."
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddObjective();
                      } else if (e.key === 'Escape') {
                        setIsQuickAdding(false);
                        setQuickAddText("");
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleQuickAddObjective}
                    disabled={!quickAddText.trim()}
                    className="gradient-primary"
                  >
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setIsQuickAdding(false);
                      setQuickAddText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsQuickAdding(true)}
                >
                  <Plus className="h-4 w-4" />
                  Quick add objective for this week
                </Button>
              )}
            </div>

            {/* Habits Section - only show if has habit_items */}
            {goal.habit_items && goal.habit_items.length > 0 && (
              <>
                <HabitItemsCard goal={goal} />
                <HabitCompletionTimeline 
                  goal={goal} 
                  objectives={relatedObjectives} 
                />
              </>
            )}
            
            {/* Objectives Section - one-time tasks */}
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