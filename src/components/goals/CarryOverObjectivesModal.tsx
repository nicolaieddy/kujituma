import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { RotateCcw, Target, Calendar, ChevronRight } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

interface CarryOverObjectivesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incompleteObjectives: WeeklyObjective[];
  goals: Goal[];
  onConfirmCarryOver: (objectivesWithWeeks: { objectiveId: string; targetWeek: string }[]) => void;
  isCarryingOver: boolean;
  title?: string;
  description?: string;
  defaultTargetWeek?: string; // If provided, use this; otherwise calculate next week from current date
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
  defaultTargetWeek,
}: CarryOverObjectivesModalProps) => {
  // Calculate the default target week (next week from today or provided default)
  const nextWeekStart = useMemo(() => {
    if (defaultTargetWeek) return defaultTargetWeek;
    const currentWeekStart = WeeklyProgressService.getWeekStart(new Date());
    return WeeklyProgressService.addDaysToWeekStart(currentWeekStart, 7);
  }, [defaultTargetWeek]);

  // Generate future weeks (next 8 weeks)
  const futureWeeks = useMemo(() => {
    const weeks: { value: string; label: string; weekNumber: number }[] = [];
    let currentWeek = nextWeekStart;
    
    for (let i = 0; i < 8; i++) {
      const weekNumber = WeeklyProgressService.getWeekNumber(currentWeek);
      weeks.push({
        value: currentWeek,
        label: `Week ${weekNumber} (${WeeklyProgressService.formatWeekRange(currentWeek)})`,
        weekNumber,
      });
      currentWeek = WeeklyProgressService.addDaysToWeekStart(currentWeek, 7);
    }
    return weeks;
  }, [nextWeekStart]);

  // Track selected objectives and their target weeks
  const [selectedObjectives, setSelectedObjectives] = useState<Map<string, string>>(new Map());

  // Reset selections when modal opens
  useEffect(() => {
    if (open) {
      setSelectedObjectives(new Map());
    }
  }, [open]);

  const handleToggleObjective = (objectiveId: string) => {
    const newSelected = new Map(selectedObjectives);
    if (newSelected.has(objectiveId)) {
      newSelected.delete(objectiveId);
    } else {
      // Default to next week when selecting
      newSelected.set(objectiveId, nextWeekStart);
    }
    setSelectedObjectives(newSelected);
  };

  const handleChangeTargetWeek = (objectiveId: string, weekStart: string) => {
    const newSelected = new Map(selectedObjectives);
    newSelected.set(objectiveId, weekStart);
    setSelectedObjectives(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedObjectives.size === incompleteObjectives.length) {
      setSelectedObjectives(new Map());
    } else {
      const newSelected = new Map<string, string>();
      incompleteObjectives.forEach(obj => {
        newSelected.set(obj.id, selectedObjectives.get(obj.id) || nextWeekStart);
      });
      setSelectedObjectives(newSelected);
    }
  };

  const handleConfirm = () => {
    const objectivesWithWeeks = Array.from(selectedObjectives.entries()).map(([objectiveId, targetWeek]) => ({
      objectiveId,
      targetWeek,
    }));
    onConfirmCarryOver(objectivesWithWeeks);
    setSelectedObjectives(new Map());
  };

  const getGoalName = (goalId: string | null) => {
    if (!goalId || !goals) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  };

  const formatWeekDisplay = (weekStart: string) => {
    return WeeklyProgressService.formatWeekRange(weekStart);
  };

  // Group objectives by their source week
  const objectivesByWeek = incompleteObjectives.reduce((acc, obj) => {
    if (!acc[obj.week_start]) {
      acc[obj.week_start] = [];
    }
    acc[obj.week_start].push(obj);
    return acc;
  }, {} as Record<string, WeeklyObjective[]>);

  const sortedWeeks = Object.keys(objectivesByWeek).sort((a, b) => b.localeCompare(a));

  // Summary of where objectives will go
  const targetWeekSummary = useMemo(() => {
    const summary = new Map<string, number>();
    selectedObjectives.forEach((weekStart) => {
      summary.set(weekStart, (summary.get(weekStart) || 0) + 1);
    });
    return summary;
  }, [selectedObjectives]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                You don't have any incomplete objectives to carry over.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-muted-foreground text-sm">
                    Select objectives and choose which week to carry them to.
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
                    <h4 className="text-foreground font-medium text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      From: {formatWeekDisplay(weekStart)}
                    </h4>
                    
                    {objectivesByWeek[weekStart].map((objective) => {
                      const goalName = getGoalName(objective.goal_id);
                      const isSelected = selectedObjectives.has(objective.id);
                      const targetWeek = selectedObjectives.get(objective.id) || nextWeekStart;
                      
                      return (
                        <div 
                          key={objective.id} 
                          className={`p-4 rounded-lg border transition-all ${
                            isSelected 
                              ? 'bg-primary/10 border-primary/40' 
                              : 'bg-muted/30 border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleObjective(objective.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div 
                                className="cursor-pointer"
                                onClick={() => handleToggleObjective(objective.id)}
                              >
                                <p className="text-foreground font-medium">{objective.text}</p>
                                {goalName && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Target className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{goalName}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Target week selector - only show when selected */}
                              {isSelected && (
                                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                  <ChevronRight className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-muted-foreground">Move to:</span>
                                  <Select
                                    value={targetWeek}
                                    onValueChange={(value) => handleChangeTargetWeek(objective.id, value)}
                                  >
                                    <SelectTrigger className="h-8 w-auto min-w-[200px] text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {futureWeeks.map((week) => (
                                        <SelectItem key={week.value} value={week.value} className="text-xs">
                                          {week.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
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

              {/* Summary of selected objectives */}
              {selectedObjectives.size > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">Summary</p>
                  <div className="space-y-1">
                    {Array.from(targetWeekSummary.entries()).map(([weekStart, count]) => {
                      const weekNumber = WeeklyProgressService.getWeekNumber(weekStart);
                      return (
                        <div key={weekStart} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="h-3 w-3 text-primary" />
                          <span>{count} objective{count !== 1 ? 's' : ''}</span>
                          <span className="text-foreground font-medium">
                            → Week {weekNumber} ({WeeklyProgressService.formatWeekRange(weekStart)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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