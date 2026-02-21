import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Check, ChevronRight, Snowflake, AlertTriangle, Zap, Clock, Loader2, RefreshCw } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal, HabitItem } from "@/types/goals";
import { cn } from "@/lib/utils";
import { format, startOfWeek, eachDayOfInterval, endOfWeek, isToday, isBefore } from "date-fns";
import { useState, useEffect, useRef, useMemo } from "react";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { useDailyStreaks } from "@/hooks/useDailyStreaks";
import { useSyncedActivities } from "@/hooks/useSyncedActivities";
import { useActivityMappings } from "@/hooks/useActivityMappings";
import { celebrateGoalComplete, celebrateWeekComplete } from "@/utils/confetti";
import { hapticSuccess } from "@/utils/haptic";
import { toast } from "@/hooks/use-toast";
import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { HabitGoalCard } from "./HabitGoalCard";

interface HabitsDueThisWeekProps {
  habits: HabitStats[];
  objectives: WeeklyObjective[];
  onToggleObjective?: (objectiveId: string, isCompleted: boolean) => void;
  weekStart?: Date;
  isReadOnly?: boolean;
}

export const HabitsDueThisWeek = ({ 
  habits, 
  objectives, 
  onToggleObjective,
  weekStart: propWeekStart,
  isReadOnly = false,
}: HabitsDueThisWeekProps) => {
  const currentWeekStart = propWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const { completions, toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);
  const { streaks: dailyStreaks, getHabitStreak, activeStreaks, atRiskStreaks, totalFreezesRemaining } = useDailyStreaks();
  const { isStravaCompletion, getStravaCompletionsForDate, getStravaCompletionsForHabit, formatDuration, formatDistance } = useSyncedActivities(currentWeekStart);
  const { getMappingForHabitItem } = useActivityMappings();
  const [expandedGoals, setExpandedGoals] = useState<Set<string> | null>(null);

  // Duolingo integration
  const { 
    isConnected: duolingoConnected, 
    connection: duolingoConnection, 
    isLoading: duolingoLoading, 
    isSyncing: duolingoSyncing,
    syncActivities: syncDuolingo,
    lastSyncDisplay: duolingoLastSync
  } = useDuolingoConnection();

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

  // Helper functions for frequency checks
  const getDaysForFrequencyWithItem = (frequency: string, habitItem?: HabitItem): number[] => {
    if (habitItem?.customSchedule?.daysOfWeek && habitItem.customSchedule.daysOfWeek.length > 0) {
      return habitItem.customSchedule.daysOfWeek.map(day => day === 0 ? 6 : day - 1);
    }
    switch (frequency) {
      case 'daily': return [0, 1, 2, 3, 4, 5, 6];
      case 'weekdays': return [0, 1, 2, 3, 4];
      default: return [0, 1, 2, 3, 4, 5, 6];
    }
  };
  
  const isFrequencyDailyWithItem = (frequency: string, habitItem?: HabitItem): boolean => {
    if (frequency === 'daily' || frequency === 'weekdays') return true;
    if (frequency === 'custom' && habitItem?.customSchedule?.daysOfWeek && habitItem.customSchedule.daysOfWeek.length > 0) {
      return true;
    }
    return false;
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
      if (todayIndex >= 0 && status[todayIndex]) {
        habitItemsCompletedToday++;
      }
      
      const daysToCheck = getDaysForFrequencyWithItem(item.frequency, item);
      const isDailyType = isFrequencyDailyWithItem(item.frequency, item);
      
      if (isDailyType) {
        const expectedDays = daysToCheck.filter(dayIdx => {
          const date = weekDates[dayIdx];
          return date && (isBefore(date, new Date()) || isToday(date));
        }).length;
        habitItemsExpectedThisWeek += expectedDays;
        
        daysToCheck.forEach(dayIdx => {
          if (status[dayIdx]) {
            habitItemsCompletedThisWeek++;
          }
        });
      } else {
        habitItemsExpectedThisWeek += 1;
        if (Object.values(status).some(Boolean)) {
          habitItemsCompletedThisWeek++;
        }
      }
    });
  });

  // Auto-expand: goals with incomplete habits due today (only set once on mount)
  // Uses null as sentinel to know we haven't initialized yet
  useEffect(() => {
    if (expandedGoals !== null || isReadOnly) return;
    
    const autoExpand = new Set<string>();
    goalsWithHabitItems.forEach(h => {
      const hasIncompleteDueToday = h.goal.habit_items.some(item => {
        const isDailyType = isDailyTracking(item.frequency, item);
        if (!isDailyType) return false;
        const daysToShow = getDaysToShow(item.frequency, item);
        if (todayIndex < 0 || !daysToShow.includes(todayIndex)) return false;
        const status = getCompletionStatus(item.id);
        return !status[todayIndex];
      });
      if (hasIncompleteDueToday) {
        autoExpand.add(h.goal.id);
      }
    });
    setExpandedGoals(autoExpand);
  }, [goalsWithHabitItems.length, todayIndex]);

  // Track if all habits for today are complete and celebrate
  const allTodayHabitsComplete = habitItemsTotal > 0 && habitItemsCompletedToday === habitItemsTotal;
  const prevAllTodayCompleteRef = useRef(allTodayHabitsComplete);
  
  const allWeeklyHabitsComplete = habitItemsExpectedThisWeek > 0 && habitItemsCompletedThisWeek >= habitItemsExpectedThisWeek;
  const prevAllWeeklyCompleteRef = useRef(allWeeklyHabitsComplete);
  
  useEffect(() => {
    if (allTodayHabitsComplete && !prevAllTodayCompleteRef.current) {
      celebrateGoalComplete();
      hapticSuccess();
    }
    prevAllTodayCompleteRef.current = allTodayHabitsComplete;
  }, [allTodayHabitsComplete]);
  
  useEffect(() => {
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

  const currentExpandedGoals = expandedGoals ?? new Set<string>();

  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(currentExpandedGoals);
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

  const isDailyTracking = (frequency: string, habitItem?: HabitItem): boolean => {
    if (frequency === 'daily' || frequency === 'weekdays') return true;
    if (frequency === 'custom' && habitItem?.customSchedule?.daysOfWeek && habitItem.customSchedule.daysOfWeek.length > 0) {
      return true;
    }
    if (frequency === 'custom' && habitItem?.customSchedule?.timesPerWeek && habitItem.customSchedule.timesPerWeek > 1) {
      return true;
    }
    return false;
  };

  const getDaysToShow = (frequency: string, habitItem?: HabitItem): number[] => {
    if (habitItem?.customSchedule?.daysOfWeek && habitItem.customSchedule.daysOfWeek.length > 0) {
      return habitItem.customSchedule.daysOfWeek.map(day => day === 0 ? 6 : day - 1);
    }
    if (habitItem?.customSchedule?.timesPerWeek && habitItem.customSchedule.timesPerWeek > 1) {
      return [0, 1, 2, 3, 4, 5, 6];
    }
    switch (frequency) {
      case 'daily': return [0, 1, 2, 3, 4, 5, 6];
      case 'weekdays': return [0, 1, 2, 3, 4];
      default: return [0, 1, 2, 3, 4, 5, 6];
    }
  };

  const isWeeklyHabitCompleted = (habitItemId: string): boolean => {
    const status = getCompletionStatus(habitItemId);
    return Object.values(status).some(Boolean);
  };

  const handleWeeklyToggle = (goalId: string, habitItemId: string) => {
    const todayIdx = weekDates.findIndex(d => isToday(d));
    const dateIndex = todayIdx >= 0 ? todayIdx : 0;
    const date = weekDates[dateIndex];
    if (!date) return;
    toggleCompletion(goalId, habitItemId, date);
  };

  const bestDailyStreak = dailyStreaks.reduce((max, s) => Math.max(max, s.longestStreak), 0);
  const avgCompletionRate = habits.length > 0 
    ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length) 
    : 0;

  if (habits.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Compact section header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {isReadOnly ? "Habits Review" : "Habits"}
        </h3>
        <span className="text-xs text-muted-foreground">
          {isReadOnly 
            ? `${habitItemsCompletedThisWeek}/${habitItemsExpectedThisWeek} completed` 
            : habitItemsTotal > 0 ? `${habitItemsCompletedToday}/${habitItemsTotal} today` : ''}
        </span>
      </div>

      {/* Goals with multiple habit items */}
        {goalsWithHabitItems.map((habit) => {
          const goalHabitStreaks = habit.goal.habit_items
            .map(item => getHabitStreak(item.id))
            .filter(Boolean);
          const goalStreakTotal = goalHabitStreaks.reduce((sum, s) => sum + (s?.currentStreak || 0), 0);
          const goalStreakMax = goalHabitStreaks.reduce((max, s) => Math.max(max, s?.longestStreak || 0), 0);
          const goalHasAtRisk = goalHabitStreaks.some(s => s?.streakStatus === 'at_risk');

          return (
            <HabitGoalCard
              key={habit.goal.id}
              goalId={habit.goal.id}
              goalTitle={habit.goal.title}
              habitItems={habit.goal.habit_items}
              completionRate={habit.completionRate}
              isExpanded={currentExpandedGoals.has(habit.goal.id)}
              onToggleExpanded={() => toggleGoalExpanded(habit.goal.id)}
              getCompletionStatus={getCompletionStatus}
              getHabitItemCompletionCount={getHabitItemCompletionCount}
              isDailyTracking={isDailyTracking}
              getDaysToShow={getDaysToShow}
              isWeeklyHabitCompleted={isWeeklyHabitCompleted}
              handleDayToggle={handleDayToggle}
              handleWeeklyToggle={handleWeeklyToggle}
              weekDates={weekDates}
              todayIndex={todayIndex}
              isToggling={isToggling}
              isReadOnly={isReadOnly}
              getHabitStreak={getHabitStreak}
              goalStreakTotal={goalStreakTotal}
              goalStreakMax={goalStreakMax}
              goalHasAtRisk={goalHasAtRisk}
              getMappingForHabitItem={getMappingForHabitItem}
              getStravaCompletionsForHabit={getStravaCompletionsForHabit}
              getStravaCompletionsForDate={getStravaCompletionsForDate}
              formatDuration={formatDuration}
              formatDistance={formatDistance}
            />
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
            <Checkbox
              checked={habit.isCompletedThisWeek}
              disabled={isReadOnly}
              onCheckedChange={() => {
                if (habit.objective && onToggleObjective && !isReadOnly) {
                  onToggleObjective(habit.objective.id, habit.isCompletedThisWeek);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "h-5 w-5",
                habit.isCompletedThisWeek && "bg-success border-success",
                isReadOnly && "cursor-not-allowed"
              )}
            />
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
            {habit.currentStreak > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs gap-1",
                  habit.currentStreak >= 8
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Flame className="h-3 w-3" />
                {habit.currentStreak}w
              </Badge>
            )}
            {habit.objective && !habit.isCompletedThisWeek && !isReadOnly && (
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
            {habit.objective && habit.isCompletedThisWeek && !isReadOnly && (
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0 h-7 px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleToggleLegacy(e, habit)}
              >
                Undo
              </Button>
            )}
            {!habit.objective && (
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </div>
        ))}
    </div>
  );
};
