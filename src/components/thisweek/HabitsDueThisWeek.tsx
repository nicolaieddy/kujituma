import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Flame, Check, ChevronRight, ChevronDown, Snowflake, AlertTriangle, Zap } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal, HabitItem } from "@/types/goals";
import { cn } from "@/lib/utils";
import { format, startOfWeek, eachDayOfInterval, endOfWeek, isToday, isBefore } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { useDailyStreaks } from "@/hooks/useDailyStreaks";
import { useSyncedActivities } from "@/hooks/useSyncedActivities";
import { useActivityMappings } from "@/hooks/useActivityMappings";
import { StravaActivityBadge } from "@/components/strava/StravaActivityBadge";
import { celebrateGoalComplete, celebrateWeekComplete } from "@/utils/confetti";
import { hapticSuccess } from "@/utils/haptic";
import { toast } from "@/hooks/use-toast";

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
  const { streaks: dailyStreaks, getHabitStreak, activeStreaks, atRiskStreaks, totalFreezesRemaining } = useDailyStreaks();
  const { isStravaCompletion, getStravaCompletionsForDate, getStravaCompletionsForHabit, formatDuration } = useSyncedActivities(currentWeekStart);
  const { getMappingForHabitItem } = useActivityMappings();
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

  // Helper functions for frequency checks (defined inline to use before main helpers)
  const getDaysForFrequency = (frequency: string): number[] => {
    switch (frequency) {
      case 'daily': return [0, 1, 2, 3, 4, 5, 6];
      case 'weekdays': return [0, 1, 2, 3, 4];
      default: return [0, 1, 2, 3, 4, 5, 6];
    }
  };
  
  const isFrequencyDaily = (frequency: string): boolean => {
    return frequency === 'daily' || frequency === 'weekdays';
  };

  // Count habit items completions for today AND for the week
  let habitItemsCompletedToday = 0;
  let habitItemsTotal = 0;
  let habitItemsCompletedThisWeek = 0;
  let habitItemsExpectedThisWeek = 0;
  const todayIndex = weekDates.findIndex(d => isToday(d));
  
  goalsWithHabitItems.forEach(h => {
    habitItemsTotal += h.goal.habit_items.length;
    h.goal.habit_items.forEach(item => {
      const status = getCompletionStatus(item.id);
      // Count today's completion
      if (todayIndex >= 0 && status[todayIndex]) {
        habitItemsCompletedToday++;
      }
      
      // Count weekly expected and completed based on frequency
      const daysToCheck = getDaysForFrequency(item.frequency);
      const isDailyType = isFrequencyDaily(item.frequency);
      
      if (isDailyType) {
        // For daily/weekday habits, count expected days up to today
        const expectedDays = daysToCheck.filter(dayIdx => {
          const date = weekDates[dayIdx];
          return date && (isBefore(date, new Date()) || isToday(date));
        }).length;
        habitItemsExpectedThisWeek += expectedDays;
        
        // Count completed days
        daysToCheck.forEach(dayIdx => {
          if (status[dayIdx]) {
            habitItemsCompletedThisWeek++;
          }
        });
      } else {
        // For weekly/other habits, just need 1 completion
        habitItemsExpectedThisWeek += 1;
        if (Object.values(status).some(Boolean)) {
          habitItemsCompletedThisWeek++;
        }
      }
    });
  });

  // Track if all habits for today are complete and celebrate
  const allTodayHabitsComplete = habitItemsTotal > 0 && habitItemsCompletedToday === habitItemsTotal;
  const prevAllTodayCompleteRef = useRef(allTodayHabitsComplete);
  
  // Track if all weekly habit expectations are met
  const allWeeklyHabitsComplete = habitItemsExpectedThisWeek > 0 && habitItemsCompletedThisWeek >= habitItemsExpectedThisWeek;
  const prevAllWeeklyCompleteRef = useRef(allWeeklyHabitsComplete);
  
  useEffect(() => {
    // Celebrate daily completion
    if (allTodayHabitsComplete && !prevAllTodayCompleteRef.current) {
      celebrateGoalComplete();
      hapticSuccess();
    }
    prevAllTodayCompleteRef.current = allTodayHabitsComplete;
  }, [allTodayHabitsComplete]);
  
  useEffect(() => {
    // Celebrate weekly completion - bigger celebration!
    if (allWeeklyHabitsComplete && !prevAllWeeklyCompleteRef.current) {
      celebrateWeekComplete();
      hapticSuccess();
      toast({
        title: "🎉 Perfect Week!",
        description: "You've completed all your habits for the week!",
      });
    }
    prevAllWeeklyCompleteRef.current = allWeeklyHabitsComplete;
  }, [allWeeklyHabitsComplete]);

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

  // Calculate aggregate streak info using daily streaks
  const bestDailyStreak = dailyStreaks.reduce((max, s) => Math.max(max, s.longestStreak), 0);
  const avgCompletionRate = habits.length > 0 
    ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length) 
    : 0;

  // Removed nested TooltipProvider - using App-level provider to prevent stack overflow on iOS Safari
  return (
    <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Habits This Week
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Daily streak summary - show count of active streaks */}
            {activeStreaks > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-orange-500 cursor-help">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs font-semibold">{activeStreaks} active</span>
                    {atRiskStreaks > 0 && (
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{activeStreaks} habit{activeStreaks > 1 ? 's' : ''} with active streaks</p>
                  {bestDailyStreak > 0 && (
                    <p className="text-xs text-muted-foreground">Best streak: {bestDailyStreak} days</p>
                  )}
                  {atRiskStreaks > 0 && (
                    <p className="text-yellow-500 text-xs mt-1">
                      {atRiskStreaks} at risk (no freezes left)
                    </p>
                  )}
                  {totalFreezesRemaining > 0 && (
                    <p className="text-muted-foreground text-xs mt-1">
                      <Snowflake className="h-3 w-3 inline mr-1" />
                      {totalFreezesRemaining} freeze{totalFreezesRemaining > 1 ? 's' : ''} remaining this week
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
            {habitItemsTotal > 0 && (
              <Badge variant="outline" className="text-xs">
                {habitItemsCompletedToday}/{habitItemsTotal} today
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
                    {habit.completionRate > 0 && ` · ${habit.completionRate}% rate`}
                  </p>
                </div>

                {/* Streak info - aggregate daily streaks for this goal */}
                {(() => {
                  const goalHabitStreaks = habitItems
                    .map(item => getHabitStreak(item.id))
                    .filter(Boolean);
                  const totalGoalStreak = goalHabitStreaks.reduce((sum, s) => sum + (s?.currentStreak || 0), 0);
                  const maxGoalStreak = goalHabitStreaks.reduce((max, s) => Math.max(max, s?.longestStreak || 0), 0);
                  const hasAtRisk = goalHabitStreaks.some(s => s?.streakStatus === 'at_risk');
                  
                  return totalGoalStreak > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "flex items-center gap-1 cursor-help flex-shrink-0",
                          hasAtRisk ? "text-yellow-500" : "text-orange-500"
                        )}>
                          <Flame className="h-4 w-4" />
                          <span className="text-xs font-medium">{totalGoalStreak}d</span>
                          {hasAtRisk && <AlertTriangle className="h-3 w-3" />}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="font-medium">{totalGoalStreak} day streak (total)</p>
                        <p className="text-xs text-muted-foreground">Best: {maxGoalStreak} days</p>
                        {hasAtRisk && (
                          <p className="text-xs text-yellow-500 mt-1">Some habits at risk!</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : null;
                })()}
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
                    
                    // Check if this habit is Strava-mapped
                    const stravaMapping = getMappingForHabitItem(item.id);
                    const isStravaMapped = !!stravaMapping;
                    const stravaCompletions = getStravaCompletionsForHabit(item.id);
                    
                    // Get daily streak for this habit item
                    const habitStreak = getHabitStreak(item.id);
                    
                    // Frequency label for weekly habits
                    const frequencyLabel = item.frequency === 'weekly' ? 'Weekly' 
                      : item.frequency === 'biweekly' ? 'Biweekly'
                      : item.frequency === 'monthly' ? 'Monthly'
                      : item.frequency === 'monthly_last_week' ? 'Monthly (last week)'
                      : item.frequency === 'quarterly' ? 'Quarterly'
                      : item.frequency;
                    
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate flex-1">
                            {/* Strava indicator */}
                            {isStravaMapped && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-shrink-0">
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#FC4C02">
                                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                    </svg>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="font-medium flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    Auto-tracked via Strava
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    This habit is automatically marked complete when you log a matching activity on Strava.
                                  </p>
                                  {stravaCompletions.length > 0 && (
                                    <p className="text-xs text-primary mt-1">
                                      {stravaCompletions.length} activit{stravaCompletions.length === 1 ? 'y' : 'ies'} synced this week
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <p className="text-sm font-medium truncate">{item.text}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Per-item daily streak with freeze status */}
                            {showDailyCheckboxes && habitStreak && habitStreak.currentStreak > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    "flex items-center gap-0.5 cursor-help",
                                    habitStreak.streakStatus === 'at_risk' ? "text-yellow-500" : "text-orange-500"
                                  )}>
                                    <Flame className="h-3 w-3" />
                                    <span className="text-xs font-medium">{habitStreak.currentStreak}d</span>
                                    {habitStreak.freezesRemaining > 0 && (
                                      <Snowflake className="h-3 w-3 text-blue-400" />
                                    )}
                                    {habitStreak.streakStatus === 'at_risk' && (
                                      <AlertTriangle className="h-3 w-3" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p className="font-medium">{habitStreak.currentStreak} day streak</p>
                                  <p className="text-xs text-muted-foreground">Best: {habitStreak.longestStreak} days</p>
                                  {habitStreak.freezesRemaining > 0 ? (
                                    <p className="text-xs text-blue-400 flex items-center gap-1 mt-1">
                                      <Snowflake className="h-3 w-3" />
                                      {habitStreak.freezesRemaining} freeze left this week
                                    </p>
                                  ) : (
                                    <p className="text-xs text-yellow-500 mt-1">
                                      No freezes left - don't miss!
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {showDailyCheckboxes && (!habitStreak || habitStreak.currentStreak === 0) && completedDays > 0 && (
                              <div className="flex items-center gap-0.5 text-muted-foreground">
                                <Flame className="h-3 w-3" />
                                <span className="text-xs">{completedDays}</span>
                              </div>
                            )}
                            {isStravaMapped ? (
                              <Badge 
                                variant="outline" 
                                className="text-xs border-[#FC4C02]/30 text-[#FC4C02] bg-[#FC4C02]/5"
                              >
                                Strava
                              </Badge>
                            ) : showDailyCheckboxes ? (
                              <Badge variant="secondary" className="text-xs">
                                {completedDays}/{daysToShow.length}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs capitalize">
                                {frequencyLabel}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Strava-mapped habits: show read-only progress */}
                        {isStravaMapped ? (
                          <div className="flex items-center gap-1">
                            {DAY_LABELS.map((label, index) => {
                              const isChecked = completionStatus[index] || false;
                              const date = weekDates[index];
                              const isTodayDate = date && isToday(date);
                              const stravaActivitiesForDay = date ? getStravaCompletionsForDate(item.id, date) : [];
                              
                              return (
                                <Tooltip key={index}>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className={cn(
                                        "text-[10px] font-medium",
                                        isTodayDate ? "text-primary" : "text-muted-foreground"
                                      )}>
                                        {label}
                                      </span>
                                      <div className={cn(
                                        "h-6 w-6 rounded flex items-center justify-center border transition-all",
                                        isChecked 
                                          ? "bg-[#FC4C02]/10 border-[#FC4C02]/30" 
                                          : "bg-muted/30 border-border",
                                        isTodayDate && !isChecked && "ring-2 ring-primary/30 ring-offset-1"
                                      )}>
                                        {isChecked ? (
                                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="#FC4C02">
                                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                          </svg>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">—</span>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    {stravaActivitiesForDay.length > 0 ? (
                                      <div className="space-y-2">
                                        {stravaActivitiesForDay.map((activity, idx) => (
                                          <div key={activity.id} className={idx > 0 ? "pt-2 border-t border-border" : ""}>
                                            <p className="font-medium">{activity.activity_name || 'Activity'}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {activity.activity_type}
                                              {activity.duration_seconds && ` • ${formatDuration(activity.duration_seconds)}`}
                                              {activity.start_date && ` • ${format(new Date(activity.start_date), 'h:mm a')}`}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : isChecked ? (
                                      <p>Completed via Strava</p>
                                    ) : (
                                      <p className="text-muted-foreground">Waiting for Strava activity</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        ) : showDailyCheckboxes ? (
                          /* Day checkboxes for daily/weekday habits */
                          <div className="flex items-center gap-1">
                            {DAY_LABELS.map((label, index) => {
                              const isActiveDay = daysToShow.includes(index);
                              const isChecked = completionStatus[index] || false;
                              const date = weekDates[index];
                              const isPast = date && isBefore(date, new Date()) && !isToday(date);
                              const isTodayDate = date && isToday(date);
                              
                              // Get all Strava completions for this day
                              const stravaActivitiesForDay = date ? getStravaCompletionsForDate(item.id, date) : [];
                              
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
                                  <div className="relative">
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
                                    {/* Strava badge overlay */}
                                    {stravaActivitiesForDay.length > 0 && isChecked && (
                                      <div className="absolute -top-1 -right-1">
                                        <StravaActivityBadge activities={stravaActivitiesForDay} />
                                      </div>
                                    )}
                                  </div>
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
