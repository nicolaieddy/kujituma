import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { RotateCcw, Target } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

interface CarryOverObjectivesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incompleteObjectives: WeeklyObjective[];
  goals: Goal[];
  onConfirmCarryOver: (objectiveIds: string[]) => void;
  isCarryingOver: boolean;
  title?: string;
  description?: string;
}

export const CarryOverObjectivesModal = ({
  open,
  onOpenChange,
  incompleteObjectives,
  goals,
  onConfirmCarryOver,
  isCarryingOver,
  title = "Carry Over Incomplete Objectives",
  description,
}: CarryOverObjectivesModalProps) => {
  const [selectedObjectives, setSelectedObjectives] = useState<Set<string>>(new Set());

  const handleToggleObjective = (objectiveId: string) => {
    const newSelected = new Set(selectedObjectives);
    if (newSelected.has(objectiveId)) {
      newSelected.delete(objectiveId);
    } else {
      newSelected.add(objectiveId);
    }
    setSelectedObjectives(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedObjectives.size === incompleteObjectives.length) {
      setSelectedObjectives(new Set());
    } else {
      setSelectedObjectives(new Set(incompleteObjectives.map(obj => obj.id)));
    }
  };

  const handleConfirm = () => {
    onConfirmCarryOver(Array.from(selectedObjectives));
    setSelectedObjectives(new Set());
  };

  const getGoalName = (goalId: string | null) => {
    if (!goalId || !goals) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  };

  const formatWeekDisplay = (weekStart: string) => {
    return WeeklyProgressService.formatWeekRange(weekStart);
  };

  // Group objectives by week
  const objectivesByWeek = incompleteObjectives.reduce((acc, obj) => {
    if (!acc[obj.week_start]) {
      acc[obj.week_start] = [];
    }
    acc[obj.week_start].push(obj);
    return acc;
  }, {} as Record<string, WeeklyObjective[]>);

  const sortedWeeks = Object.keys(objectivesByWeek).sort((a, b) => b.localeCompare(a));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-card shadow-elegant">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </DialogHeader>
        
        <div className="space-y-6">
          {incompleteObjectives.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-foreground text-lg mb-2">🎉 All caught up!</p>
              <p className="text-muted-foreground text-sm">
                You don't have any incomplete objectives from previous weeks.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    You have {incompleteObjectives.length} incomplete objective{incompleteObjectives.length > 1 ? 's' : ''} from previous weeks. 
                    Select which ones you'd like to carry over to this week.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedObjectives.size === incompleteObjectives.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {sortedWeeks.map(weekStart => (
                  <div key={weekStart} className="space-y-3">
                    <h4 className="text-foreground font-medium text-sm">
                      Week of {formatWeekDisplay(weekStart)}
                    </h4>
                    
                    {objectivesByWeek[weekStart].map((objective) => {
                      const goalName = getGoalName(objective.goal_id);
                      const isSelected = selectedObjectives.has(objective.id);
                      
                      return (
                        <div 
                          key={objective.id} 
                          className={`p-4 rounded-lg border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-primary/20 border-primary/40' 
                              : 'bg-muted/30 border-border hover:bg-muted/50'
                          }`}
                          onClick={() => handleToggleObjective(objective.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleObjective(objective.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground font-medium mb-1">{objective.text}</p>
                              {goalName && (
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Goal: {goalName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isCarryingOver}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={selectedObjectives.size === 0 || isCarryingOver}
                  className="gradient-primary shadow-elegant hover:shadow-lift"
                >
                  {isCarryingOver ? (
                    "Carrying Over..."
                  ) : (
                    `Carry Over ${selectedObjectives.size} Objective${selectedObjectives.size !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};