import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { CarryOverObjective, WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { RotateCcw, Target, ChevronRight, EyeOff, Eye, ChevronDown, Clock } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { DismissedObjective } from "@/hooks/useCarryOverObjectives";

interface CarryOverObjectivesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incompleteObjectives: CarryOverObjective[] | WeeklyObjective[];
  goals: Goal[];
  onConfirmCarryOver: (objectivesWithWeeks: { objectiveId: string; targetWeek: string }[]) => void;
  onDismissObjective?: (objectiveText: string, goalId: string | null) => void;
  onRestoreObjective?: (objectiveText: string, goalId: string | null) => void;
  dismissedObjectives?: DismissedObjective[];
  isCarryingOver: boolean;
  title?: string;
  description?: string;
  defaultTargetWeek?: string;
}

export const CarryOverObjectivesModal = ({
  open,
  onOpenChange,
  incompleteObjectives,
  goals,
  onConfirmCarryOver,
  onDismissObjective,
  onRestoreObjective,
  dismissedObjectives = [],
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
  const [showDismissed, setShowDismissed] = useState(false);

  // Reset selections when modal opens
  useEffect(() => {
    if (open) {
      setSelectedObjectives(new Map());
      setShowDismissed(false);
    }
  }, [open]);

  const handleToggleObjective = (objectiveId: string) => {
    const newSelected = new Map(selectedObjectives);
    if (newSelected.has(objectiveId)) {
      newSelected.delete(objectiveId);
    } else {
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

  const formatLastScheduled = (weekStart: string) => {
    const [year, month, day] = weekStart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Summary of where objectives will go
  const targetWeekSummary = useMemo(() => {
    const summary = new Map<string, number>();
    selectedObjectives.forEach((weekStart) => {
      summary.set(weekStart, (summary.get(weekStart) || 0) + 1);
    });
    return summary;
  }, [selectedObjectives]);

  const hasDismissedObjectives = dismissedObjectives.length > 0;

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
          {incompleteObjectives.length === 0 && !hasDismissedObjectives ? (
            <div className="text-center py-8">
              <p className="text-foreground text-lg mb-2">🎉 All caught up!</p>
              <p className="text-muted-foreground text-sm">
                You don't have any incomplete objectives to carry over.
              </p>
            </div>
          ) : (
            <>
              {incompleteObjectives.length > 0 && (
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

                  {/* Flat list of deduplicated objectives (sorted by most recent week) */}
                  <div className="space-y-3">
                    {incompleteObjectives.map((objective) => {
                      const goalName = getGoalName(objective.goal_id);
                      const isSelected = selectedObjectives.has(objective.id);
                      const targetWeek = selectedObjectives.get(objective.id) || nextWeekStart;
                      const carryOverCount = objective.carry_over_count || 1;
                      
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
                                
                                {/* Metadata row: Goal, Last scheduled, Carry-over count */}
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  {goalName && (
                                    <div className="flex items-center gap-1">
                                      <Target className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">{goalName}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Last: {formatLastScheduled(objective.week_start)}</span>
                                  </div>
                                  
                                  {carryOverCount > 1 && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                      {carryOverCount}x
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Target week selector - only show when selected */}
                              {isSelected && (
                                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                  <ChevronRight className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-muted-foreground">Move to:</span>
                                  <Select
                                    value={targetWeek}
                                    defaultValue={nextWeekStart}
                                    onValueChange={(value) => handleChangeTargetWeek(objective.id, value)}
                                  >
                                    <SelectTrigger className="h-8 w-auto min-w-[200px] text-xs">
                                      <SelectValue placeholder={futureWeeks[0]?.label || "Select week"} />
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
                            
                            {/* Dismiss button */}
                            {onDismissObjective && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDismissObjective(objective.text, objective.goal_id);
                                      }}
                                    >
                                      <EyeOff className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p>Don't show this again</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {incompleteObjectives.length === 0 && hasDismissedObjectives && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">
                    No objectives to carry over. You have {dismissedObjectives.length} hidden objective{dismissedObjectives.length !== 1 ? 's' : ''}.
                  </p>
                </div>
              )}

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

              {/* Hidden objectives section */}
              {hasDismissedObjectives && onRestoreObjective && (
                <Collapsible open={showDismissed} onOpenChange={setShowDismissed}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4" />
                        Hidden objectives ({dismissedObjectives.length})
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showDismissed ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground mb-3">
                      These objectives won't appear in carry-over suggestions. Click to restore.
                    </p>
                    {dismissedObjectives.map((dismissed) => {
                      const goalName = getGoalName(dismissed.goal_id);
                      return (
                        <div
                          key={dismissed.id}
                          className="p-3 rounded-lg border border-border bg-muted/20 flex items-start justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-sm">{dismissed.objective_text}</p>
                            {goalName && (
                              <div className="flex items-center gap-1 mt-1">
                                <Target className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{goalName}</span>
                              </div>
                            )}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                                  onClick={() => onRestoreObjective(dismissed.objective_text, dismissed.goal_id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p>Restore this objective</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
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
