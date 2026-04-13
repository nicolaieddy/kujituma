import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ArrowRight, Lock, Loader2, RefreshCw } from "lucide-react";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal, HabitItem } from "@/types/goals";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { useGoals } from "@/hooks/useGoals";
import { parseLocalDate } from "@/utils/dateUtils";

interface CloseWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedObjectives: WeeklyObjective[];
  incompleteObjectives: WeeklyObjective[];
  movedCount?: number;
  goals: Goal[];
  onConfirmClose: (carryOverIds: string[]) => void;
  isClosing: boolean;
  weekStart?: string;
}

export const CloseWeekDialog = ({
  open,
  onOpenChange,
  completedObjectives,
  incompleteObjectives,
  movedCount = 0,
  goals,
  onConfirmClose,
  isClosing,
}: CloseWeekDialogProps) => {
  const [selectedCarryOver, setSelectedCarryOver] = useState<Set<string>>(
    new Set(incompleteObjectives.map(obj => obj.id))
  );

  const getGoalTitle = (goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  };

  const handleToggleCarryOver = (objectiveId: string) => {
    setSelectedCarryOver(prev => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedCarryOver.size === incompleteObjectives.length) {
      setSelectedCarryOver(new Set());
    } else {
      setSelectedCarryOver(new Set(incompleteObjectives.map(obj => obj.id)));
    }
  };

  const handleConfirm = () => {
    onConfirmClose(Array.from(selectedCarryOver));
  };

  const totalOriginal = completedObjectives.length + incompleteObjectives.length + movedCount;
  const completionRate = totalOriginal > 0
    ? Math.round((completedObjectives.length / totalOriginal) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Close This Week
          </DialogTitle>
          <DialogDescription>
            Review your progress and choose which incomplete objectives to carry over to next week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Week Summary</span>
              <Badge variant={completionRate >= 70 ? "default" : "secondary"}>
                {completionRate}% Complete
              </Badge>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {completedObjectives.length} completed
              </span>
              <span className="flex items-center gap-1">
                <Circle className="h-4 w-4 text-muted-foreground" />
                {incompleteObjectives.length} incomplete
              </span>
              {movedCount > 0 && (
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  {movedCount} rescheduled
                </span>
              )}
            </div>
          </div>

          {/* Carry Over Selection */}
          {incompleteObjectives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Carry Over to Next Week
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs h-7"
                >
                  {selectedCarryOver.size === incompleteObjectives.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {incompleteObjectives.map(objective => {
                  const goalTitle = getGoalTitle(objective.goal_id);
                  const isSelected = selectedCarryOver.has(objective.id);
                  
                  return (
                    <div
                      key={objective.id}
                      onClick={() => handleToggleCarryOver(objective.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-primary/50 bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleCarryOver(objective.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">
                          {objective.text}
                        </p>
                        {goalTitle && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {goalTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <p className="text-xs text-muted-foreground">
                {selectedCarryOver.size} objective{selectedCarryOver.size !== 1 ? 's' : ''} will be copied to next week
              </p>
            </div>
          )}

          {incompleteObjectives.length === 0 && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                All objectives completed! Great work this week.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isClosing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isClosing}
          >
            {isClosing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Closing Week...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Close Week
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
