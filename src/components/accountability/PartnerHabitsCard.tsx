import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Flame, Target, CheckCircle2, Circle, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfWeek, eachDayOfInterval, endOfWeek, isToday, isBefore } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";
import { HabitItem } from "@/types/goals";
import { accountabilityService } from "@/services/accountabilityService";
import { cn } from "@/lib/utils";

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  monthly_last_week: 'Monthly (Last Week)',
  quarterly: 'Quarterly',
  weekdays: 'Weekdays',
  custom: 'Custom',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getFrequencyLabel = (habit: HabitItem): string => {
  if (habit.frequency === 'custom' && habit.customSchedule) {
    return formatCustomSchedule(habit.customSchedule);
  }
  return frequencyLabels[habit.frequency] || habit.frequency;
};

interface PartnerHabitStats {
  goal: {
    id: string;
    title: string;
    habit_items: any[];
  };
  currentStreak: number;
  completionRate: number;
  totalWeeks: number;
  completedWeeks: number;
  weeklyHistory: { weekStart: string; isCompleted: boolean }[];
}

interface PartnerHabitsCardProps {
  habitStats: PartnerHabitStats[];
  isLoading?: boolean;
  partnerId: string;
  weekStart?: Date;
}

// Helper to check if a frequency should show daily checkboxes
const isDailyTracking = (frequency: string, habitItem?: HabitItem): boolean => {
  if (frequency === 'daily' || frequency === 'weekdays') return true;
  if (frequency === 'custom' && habitItem?.customSchedule?.daysOfWeek && habitItem.customSchedule.daysOfWeek.length > 0) {
    return true;
  }
  return false;
};

// Helper to get which days should be active based on frequency
const getDaysToShow = (frequency: string, habitItem?: HabitItem): number[] => {
  if (habitItem?.customSchedule?.daysOfWeek && habitItem.customSchedule.daysOfWeek.length > 0) {
    // Convert from 0=Sunday to 0=Monday format
    return habitItem.customSchedule.daysOfWeek.map(day => day === 0 ? 6 : day - 1);
  }
  switch (frequency) {
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'weekdays':
      return [0, 1, 2, 3, 4];
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
};

export const PartnerHabitsCard = ({ habitStats, isLoading, partnerId, weekStart: propWeekStart }: PartnerHabitsCardProps) => {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [completions, setCompletions] = useState<{ habit_item_id: string; completion_date: string }[]>([]);
  const [completionsLoading, setCompletionsLoading] = useState(true);

  const currentWeekStart = propWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDates = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  });

  // Fetch partner's habit completions for the week
  useEffect(() => {
    const fetchCompletions = async () => {
      if (!partnerId) return;
      
      setCompletionsLoading(true);
      try {
        const data = await accountabilityService.getPartnerHabitCompletions(partnerId, currentWeekStart);
        setCompletions(data);
      } catch (err) {
        console.error('Error fetching partner completions:', err);
      } finally {
        setCompletionsLoading(false);
      }
    };

    fetchCompletions();
  }, [partnerId, currentWeekStart]);

  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  // Get completion status for a specific habit item
  const getCompletionStatus = (habitItemId: string): boolean[] => {
    const status: boolean[] = [false, false, false, false, false, false, false];
    
    completions
      .filter(c => c.habit_item_id === habitItemId)
      .forEach(c => {
        const date = parseISO(c.completion_date);
        const dayIndex = weekDates.findIndex(d => 
          format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        if (dayIndex >= 0) {
          status[dayIndex] = true;
        }
      });
    
    return status;
  };

  if (isLoading) {
    return (
      <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Habits Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (habitStats.length === 0) {
    return (
      <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Habits Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No habits tracked yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate aggregate stats
  const totalHabits = habitStats.reduce((sum, h) => sum + (h.goal.habit_items?.length || 1), 0);
  const avgCompletionRate = habitStats.length > 0 
    ? Math.round(habitStats.reduce((sum, h) => sum + h.completionRate, 0) / habitStats.length) 
    : 0;
  const activeStreaks = habitStats.filter(h => h.currentStreak > 0).length;

  return (
    <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Habits Review
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Streak summary */}
            {activeStreaks > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-orange-500 cursor-help">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs font-semibold">{activeStreaks} active</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{activeStreaks} goal{activeStreaks > 1 ? 's' : ''} with active streaks</p>
                  <p className="text-xs text-muted-foreground">Avg. completion: {avgCompletionRate}%</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Badge variant="outline" className="text-xs">
              {totalHabits} habit{totalHabits !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {habitStats.map((habit) => {
          const isExpanded = expandedGoals.has(habit.goal.id);
          const habitItems = habit.goal.habit_items || [];
          
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
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{habit.goal.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {habitItems.length > 0 ? `${habitItems.length} habit${habitItems.length > 1 ? 's' : ''}` : '1 habit'}
                    {habit.completionRate > 0 && ` · ${habit.completionRate}% rate`}
                    {habit.completedWeeks > 0 && ` · ${habit.completedWeeks}/${habit.totalWeeks} weeks`}
                  </p>
                </div>

                {/* Streak badge */}
                {habit.currentStreak > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {habit.currentStreak}w
                  </Badge>
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
                  {/* Weekly history visualization */}
                  {habit.weeklyHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Weekly Progress</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {habit.weeklyHistory.slice().reverse().map((week, index) => (
                          <Tooltip key={week.weekStart}>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center cursor-help">
                                {week.isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                                )}
                                {index === habit.weeklyHistory.length - 1 && (
                                  <span className="text-[10px] text-muted-foreground mt-0.5">now</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Week of {format(parseISO(week.weekStart), 'MMM d')}</p>
                              <p className="text-xs text-muted-foreground">
                                {week.isCompleted ? 'Completed' : 'Not completed'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Habit items with daily checkboxes */}
                  {habitItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Habits</p>
                      <div className="space-y-3">
                        {habitItems.map((item: HabitItem, idx: number) => {
                          const showDailyCheckboxes = isDailyTracking(item.frequency, item);
                          const daysToShow = getDaysToShow(item.frequency, item);
                          const completionStatus = getCompletionStatus(item.id);
                          const completedDays = completionStatus.filter(Boolean).length;
                          
                          return (
                            <div 
                              key={item.id || idx}
                              className="space-y-1.5"
                            >
                              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
                                <span className="text-sm text-foreground">
                                  {item.text || `Habit ${idx + 1}`}
                                </span>
                                <div className="flex items-center gap-2">
                                  {showDailyCheckboxes && (
                                    <Badge variant="secondary" className="text-xs">
                                      {completedDays}/{daysToShow.length}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                                    {getFrequencyLabel(item)}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Day checkboxes for daily/weekday habits */}
                              {showDailyCheckboxes && (
                                <div className="flex items-center gap-1 pl-2">
                                  {DAY_LABELS.map((label, dayIndex) => {
                                    const isActiveDay = daysToShow.includes(dayIndex);
                                    const isChecked = completionStatus[dayIndex];
                                    const date = weekDates[dayIndex];
                                    const isTodayDate = date && isToday(date);
                                    
                                    return (
                                      <Tooltip key={dayIndex}>
                                        <TooltipTrigger asChild>
                                          <div
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
                                              disabled
                                              className={cn(
                                                "h-6 w-6 rounded cursor-default",
                                                isTodayDate && "ring-2 ring-primary/30 ring-offset-1",
                                                isChecked && "bg-success border-success"
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{date ? format(date, 'EEEE, MMM d') : label}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {isChecked ? 'Completed' : 'Not completed'}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};