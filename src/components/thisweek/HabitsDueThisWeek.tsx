import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Flame, Check, ChevronRight, ChevronDown } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal, HabitItem } from "@/types/goals";
import { cn } from "@/lib/utils";
import { format, startOfWeek, eachDayOfInterval, endOfWeek, isToday, isBefore } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { celebrateGoalComplete } from "@/utils/confetti";
import { hapticSuccess } from "@/utils/haptic";

interface HabitsDueThisWeekProps {
  habits: HabitStats[];
  objectives: WeeklyObjective[];
  onToggleObjective?: (objectiveId: string, isCompleted: boolean) => void;
  weekStart?: Date;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const HabitsDueThisWeek = ({ 
  habits, 
  objectives, 
  onToggleObjective,
  weekStart: propWeekStart 
}: HabitsDueThisWeekProps) => {
  const currentWeekStart = propWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const { completions, toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  if (habits.length === 0) return null;

  // Get habits with their habit_items (multi-habit goals)
  const goalsWithHabitItems = habits.filter(h => h.goal.habit_items && h.goal.habit_items.length > 0);
  const legacyHabits = habits.filter(h => !h.goal.habit_items || h.goal.habit_items.length === 0);

  // Count completed habits across all types
  const legacyHabitsWithStatus = legacyHabits.map(habit => {
    const matchingObjective = objectives.find(obj => obj.goal_id === habit.goal.id);
    return {
      ...habit,
      objective: matchingObjective,
      isCompletedThisWeek: matchingObjective?.is_completed ?? false
    };
  });

  const legacyCompletedCount = legacyHabitsWithStatus.filter(h => h.isCompletedThisWeek).length;
  const totalLegacyCount = legacyHabitsWithStatus.length;

  // Count habit items completions
  let habitItemsCompletedToday = 0;
  let habitItemsTotal = 0;
  const todayIndex = weekDates.findIndex(d => isToday(d));
  
  goalsWithHabitItems.forEach(h => {
    habitItemsTotal += h.goal.habit_items.length;
    h.goal.habit_items.forEach(item => {
      const status = getCompletionStatus(item.id);
      // Count today's completion
      if (todayIndex >= 0 && status[todayIndex]) {
        habitItemsCompletedToday++;
      }
    });
  });

  // Track if all habits for today are complete and celebrate
  const allTodayHabitsComplete = habitItemsTotal > 0 && habitItemsCompletedToday === habitItemsTotal;
  const prevAllCompleteRef = useRef(allTodayHabitsComplete);
  
  useEffect(() => {
    // Only celebrate when transitioning from incomplete to complete
    if (allTodayHabitsComplete && !prevAllCompleteRef.current) {
      celebrateGoalComplete();
      hapticSuccess();
    }
    prevAllCompleteRef.current = allTodayHabitsComplete;
  }, [allTodayHabitsComplete]);

  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const handleToggleLegacy = (e: React.MouseEvent, habit: typeof legacyHabitsWithStatus[0]) => {
    e.stopPropagation();
    if (habit.objective && onToggleObjective) {
      onToggleObjective(habit.objective.id, habit.isCompletedThisWeek);
    }
  };

  const handleDayToggle = (goalId: string, habitItemId: string, dayIndex: number) => {
    const date = weekDates[dayIndex];
    if (!date) return;
    toggleCompletion(goalId, habitItemId, date);
  };

  const getHabitItemCompletionCount = (habitItem: HabitItem): number => {
    const status = getCompletionStatus(habitItem.id);
    return Object.values(status).filter(Boolean).length;
  };

  // Determine if this habit needs daily checkboxes or just a single weekly checkbox
  const isDailyTracking = (frequency: string): boolean => {
    return frequency === 'daily' || frequency === 'weekdays';
  };

  const getDaysToShow = (frequency: string): number[] => {
    switch (frequency) {
      case 'daily':
        return [0, 1, 2, 3, 4, 5, 6]; // All days
      case 'weekdays':
        return [0, 1, 2, 3, 4]; // Mon-Fri
      default:
        return [0, 1, 2, 3, 4, 5, 6]; // Show all by default (but will use single checkbox UI)
    }
  };

  // Check if a weekly habit is completed (has at least one completion this week)
  const isWeeklyHabitCompleted = (habitItemId: string): boolean => {
    const status = getCompletionStatus(habitItemId);
    return Object.values(status).some(Boolean);
  };

  // Toggle weekly habit - use today's date or first available date
  const handleWeeklyToggle = (goalId: string, habitItemId: string) => {
    const todayIndex = weekDates.findIndex(d => isToday(d));
    const dateIndex = todayIndex >= 0 ? todayIndex : 0;
    const date = weekDates[dateIndex];
    if (!date) return;
    toggleCompletion(goalId, habitItemId, date);
  };

  return (
    <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Habits This Week
          </CardTitle>
          <div className="flex items-center gap-2">
            {habitItemsTotal > 0 && (
              <Badge variant="outline" className="text-xs">
                {habitItemsCompletedToday}/{habitItemsTotal} today
              </Badge>
            )}
            {totalLegacyCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {legacyCompletedCount}/{totalLegacyCount} weekly
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Goals with multiple habit items (daily checkboxes) */}
        {goalsWithHabitItems.map((habit) => {
          const isExpanded = expandedGoals.has(habit.goal.id);
          const habitItems = habit.goal.habit_items;
          
          return (
            <div
              key={habit.goal.id}
              className="rounded-lg border bg-background/50"
            >
              {/* Goal Header */}
              <div
                onClick={() => toggleGoalExpanded(habit.goal.id)}
                className="flex items-center gap-3 p-2 sm:p-3 cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGoalExpanded(habit.goal.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{habit.goal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {habitItems.length} habit{habitItems.length > 1 ? 's' : ''}
                  </p>
                </div>

                {habit.currentStreak > 0 && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Flame className={cn(
                      "h-4 w-4",
                      habit.currentStreak >= 12 ? "text-orange-500" :
                      habit.currentStreak >= 8 ? "text-yellow-500" :
                      habit.currentStreak >= 4 ? "text-green-500" :
                      "text-emerald-400"
                    )} />
                    <span className="text-xs font-medium">{habit.currentStreak}</span>
                  </div>
                )}
              </div>

              {/* Expanded Habit Items */}
              {isExpanded && (
                <div className="border-t px-3 py-2 space-y-3">
                  {habitItems.map((item) => {
                    const completionStatus = getCompletionStatus(item.id);
                    const daysToShow = getDaysToShow(item.frequency);
                    const completedDays = getHabitItemCompletionCount(item);
                    const showDailyCheckboxes = isDailyTracking(item.frequency);
                    const isWeeklyCompleted = isWeeklyHabitCompleted(item.id);
                    
                    // Frequency label for weekly habits
                    const frequencyLabel = item.frequency === 'weekly' ? 'Weekly' 
                      : item.frequency === 'biweekly' ? 'Biweekly'
                      : item.frequency === 'monthly' ? 'Monthly'
                      : item.frequency === 'monthly_last_week' ? 'Monthly (last week)'
                      : item.frequency === 'quarterly' ? 'Quarterly'
                      : item.frequency;
                    
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate flex-1">{item.text}</p>
                          {showDailyCheckboxes ? (
                            <Badge variant="secondary" className="text-xs ml-2">
                              {completedDays}/{daysToShow.length}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs ml-2 capitalize">
                              {frequencyLabel}
                            </Badge>
                          )}
                        </div>
                        
                        {showDailyCheckboxes ? (
                          /* Day checkboxes for daily/weekday habits */
                          <div className="flex items-center gap-1">
                            {DAY_LABELS.map((label, index) => {
                              const isActiveDay = daysToShow.includes(index);
                              const isChecked = completionStatus[index] || false;
                              const date = weekDates[index];
                              const isPast = date && isBefore(date, new Date()) && !isToday(date);
                              const isTodayDate = date && isToday(date);
                              
                              return (
                                <div
                                  key={index}
                                  className={cn(
                                    "flex flex-col items-center gap-0.5",
                                    !isActiveDay && "opacity-30"
                                  )}
                                >
                                  <span className={cn(
                                    "text-[10px] font-medium",
                                    isTodayDate ? "text-primary" : "text-muted-foreground"
                                  )}>
                                    {label}
                                  </span>
                                  <Checkbox
                                    checked={isChecked}
                                    disabled={!isActiveDay || isToggling}
                                    onCheckedChange={() => {
                                      if (isActiveDay) {
                                        handleDayToggle(habit.goal.id, item.id, index);
                                      }
                                    }}
                                    className={cn(
                                      "h-6 w-6 rounded",
                                      isTodayDate && "ring-2 ring-primary ring-offset-1",
                                      isChecked && "bg-success border-success",
                                      !isActiveDay && "cursor-not-allowed"
                                    )}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Single "Done this week" checkbox for weekly/less frequent habits */
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isWeeklyCompleted}
                              disabled={isToggling}
                              onCheckedChange={() => handleWeeklyToggle(habit.goal.id, item.id)}
                              className={cn(
                                "h-5 w-5 rounded",
                                isWeeklyCompleted && "bg-success border-success"
                              )}
                            />
                            <span className={cn(
                              "text-sm",
                              isWeeklyCompleted ? "text-success line-through" : "text-muted-foreground"
                            )}>
                              {isWeeklyCompleted ? "Completed this week" : "Mark as done"}
                            </span>
                            {isWeeklyCompleted && (
                              <Check className="h-4 w-4 text-success" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Legacy habits (single objective per week) */}
        {legacyHabitsWithStatus.map((habit) => (
          <div
            key={habit.goal.id}
            className={cn(
              "flex items-center gap-3 p-2 sm:p-3 rounded-lg border transition-all",
              habit.isCompletedThisWeek
                ? "bg-success/10 border-success/20"
                : "bg-background/50 border-border"
            )}
          >
            {/* Completion Status */}
            <Checkbox
              checked={habit.isCompletedThisWeek}
              onCheckedChange={() => {
                if (habit.objective && onToggleObjective) {
                  onToggleObjective(habit.objective.id, habit.isCompletedThisWeek);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "h-5 w-5",
                habit.isCompletedThisWeek && "bg-success border-success"
              )}
            />

            {/* Habit Info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                habit.isCompletedThisWeek && "line-through text-muted-foreground"
              )}>
                {habit.goal.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {habit.goal.title}
              </p>
            </div>

            {/* Streak */}
            {habit.currentStreak > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Flame className={cn(
                  "h-4 w-4",
                  habit.currentStreak >= 12 ? "text-orange-500" :
                  habit.currentStreak >= 8 ? "text-yellow-500" :
                  habit.currentStreak >= 4 ? "text-green-500" :
                  "text-emerald-400"
                )} />
                <span className="text-xs font-medium">{habit.currentStreak}</span>
              </div>
            )}

            {/* Quick Complete Button */}
            {habit.objective && !habit.isCompletedThisWeek && (
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={(e) => handleToggleLegacy(e, habit)}
              >
                <Check className="h-3 w-3" />
                <span className="hidden sm:inline">Complete</span>
              </Button>
            )}

            {/* Undo button for completed */}
            {habit.objective && habit.isCompletedThisWeek && (
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0 h-7 px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleToggleLegacy(e, habit)}
              >
                Undo
              </Button>
            )}

            {/* Arrow - only show when no action buttons */}
            {!habit.objective && (
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
