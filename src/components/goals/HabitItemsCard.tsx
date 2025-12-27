import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Goal } from "@/types/goals";
import { RefreshCw, Flame, TrendingUp } from "lucide-react";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { startOfWeek, isToday, isBefore, subWeeks, format, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { HabitCompletionsService } from "@/services/habitCompletionsService";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HabitItemsCardProps {
  goal: Goal;
}

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  monthly_last_week: 'Monthly (Last Week)',
  quarterly: 'Quarterly'
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  weeklyHistory: { weekStart: string; completed: number; expected: number; rate: number }[];
}

// Mini chart component for 8-week history
const MiniHistoryChart = ({ 
  data 
}: { 
  data: { weekStart: string; completed: number; expected: number; rate: number }[] 
}) => {
  if (data.length === 0) return null;

  const maxRate = Math.max(...data.map(d => d.rate), 100);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-end gap-0.5 h-8">
        {data.map((week, index) => {
          const height = week.expected > 0 ? (week.rate / maxRate) * 100 : 0;
          const isCurrentWeek = index === data.length - 1;
          
          return (
            <Tooltip key={week.weekStart}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-3 rounded-sm transition-all cursor-pointer hover:opacity-80",
                    week.rate >= 80 ? "bg-emerald-500" :
                    week.rate >= 50 ? "bg-yellow-500" :
                    week.rate > 0 ? "bg-orange-400" :
                    "bg-muted/40",
                    isCurrentWeek && "ring-1 ring-foreground/40"
                  )}
                  style={{ height: `${Math.max(height, 8)}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">Week of {format(new Date(week.weekStart), 'MMM d')}</p>
                <p className="text-muted-foreground">
                  {week.completed}/{week.expected} ({week.rate}%)
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export const HabitItemsCard = ({ goal }: HabitItemsCardProps) => {
  const { user } = useAuth();
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);

  // Combine habit_items with recurring objective if exists
  const baseHabitItems = goal.habit_items || [];
  
  // If goal has recurring objective, treat it as a habit item too
  const recurringHabit = goal.is_recurring && goal.recurring_objective_text ? {
    id: `recurring-${goal.id}`,
    text: goal.recurring_objective_text,
    frequency: goal.recurrence_frequency || 'weekly'
  } : null;

  const habitItems = recurringHabit 
    ? [recurringHabit, ...baseHabitItems]
    : baseHabitItems;
    
  const hasHabits = habitItems.length > 0;

  // Fetch all completions for each habit to calculate stats and weekly history
  const { data: habitStats = {} } = useQuery({
    queryKey: ['habit-stats-detailed', goal.id, habitItems.map(h => h.id).join(',')],
    queryFn: async () => {
      const stats: Record<string, HabitStats> = {};
      
      await Promise.all(
        habitItems.map(async (habit) => {
          try {
            const allCompletions = await HabitCompletionsService.getHabitItemCompletions(habit.id);
            const streak = HabitCompletionsService.calculateHabitStreak(allCompletions, habit.frequency);
            const completionRate = HabitCompletionsService.calculateCompletionRate(allCompletions, habit.frequency);
            
            // Calculate weekly history for last 8 weeks
            const weeklyHistory: { weekStart: string; completed: number; expected: number; rate: number }[] = [];
            const today = new Date();
            
            for (let i = 7; i >= 0; i--) {
              const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const weekStartStr = format(weekStart, 'yyyy-MM-dd');
              const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
              
              // Count completions in this week
              const weekCompletions = allCompletions.filter(
                c => c.completion_date >= weekStartStr && c.completion_date <= weekEndStr
              );
              const uniqueDays = new Set(weekCompletions.map(c => c.completion_date)).size;
              
              // Calculate expected based on frequency
              let expected = 0;
              switch (habit.frequency) {
                case 'daily':
                  expected = 7;
                  break;
                case 'weekdays':
                  expected = 5;
                  break;
                case 'weekly':
                case 'biweekly':
                case 'monthly':
                case 'monthly_last_week':
                case 'quarterly':
                  expected = 1;
                  break;
                default:
                  expected = 7;
              }
              
              weeklyHistory.push({
                weekStart: weekStartStr,
                completed: uniqueDays,
                expected,
                rate: expected > 0 ? Math.round((uniqueDays / expected) * 100) : 0
              });
            }
            
            stats[habit.id] = {
              currentStreak: streak.current,
              longestStreak: streak.longest,
              completionRate,
              weeklyHistory
            };
          } catch (error) {
            console.error(`Error fetching stats for habit ${habit.id}:`, error);
            stats[habit.id] = { currentStreak: 0, longestStreak: 0, completionRate: 0, weeklyHistory: [] };
          }
        })
      );
      
      return stats;
    },
    enabled: !!user && hasHabits,
    staleTime: 1000 * 60 * 5,
  });

  const handleDayToggle = (habitItemId: string, dayIndex: number) => {
    const date = weekDates[dayIndex];
    if (!date) return;
    toggleCompletion(goal.id, habitItemId, date);
  };

  // Determine tracking mode based on frequency
  const getTrackingMode = (frequency: string): 'daily' | 'weekly' | 'monthly' => {
    switch (frequency) {
      case 'daily':
      case 'weekdays':
        return 'daily';
      case 'weekly':
      case 'biweekly':
        return 'weekly';
      case 'monthly':
      case 'monthly_last_week':
      case 'quarterly':
        return 'monthly';
      default:
        return 'daily';
    }
  };

  const getDaysToShow = (frequency: string): number[] => {
    switch (frequency) {
      case 'daily':
        return [0, 1, 2, 3, 4, 5, 6];
      case 'weekdays':
        return [0, 1, 2, 3, 4];
      default:
        return [0, 1, 2, 3, 4, 5, 6];
    }
  };

  const getHabitItemCompletionCount = (habitItemId: string): number => {
    const status = getCompletionStatus(habitItemId);
    return Object.values(status).filter(Boolean).length;
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 12) return 'text-orange-400';
    if (streak >= 8) return 'text-yellow-400';
    if (streak >= 4) return 'text-green-400';
    return 'text-emerald-300';
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-muted-foreground';
  };

  if (!hasHabits) return null;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Habits ({habitItems.length})
        </CardTitle>
        <p className="text-muted-foreground text-xs">Track your habits for this week</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {habitItems.map((habit) => {
            const completionStatus = getCompletionStatus(habit.id);
            const trackingMode = getTrackingMode(habit.frequency);
            const daysToShow = getDaysToShow(habit.frequency);
            const completedDays = getHabitItemCompletionCount(habit.id);
            const stats = habitStats[habit.id];
            
            // For weekly/monthly, check if any day this week is completed
            const hasCompletionThisWeek = Object.values(completionStatus).some(Boolean);
            
            return (
              <div 
                key={habit.id} 
                className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-3"
              >
                {/* Habit header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-foreground font-medium">{habit.text}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Streak indicator */}
                    {stats && stats.currentStreak > 0 && (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50",
                        getStreakColor(stats.currentStreak)
                      )}>
                        <Flame className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{stats.currentStreak}</span>
                        {stats.currentStreak === stats.longestStreak && stats.longestStreak > 1 && (
                          <span className="text-[10px] opacity-70">best!</span>
                        )}
                      </div>
                    )}
                    
                    {/* Completion rate */}
                    {stats && (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50",
                        getCompletionRateColor(stats.completionRate)
                      )}>
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{stats.completionRate}%</span>
                      </div>
                    )}

                    <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50">
                      {frequencyLabels[habit.frequency] || habit.frequency}
                    </Badge>
                    
                    {/* Only show X/7 counter for daily tracking */}
                    {trackingMode === 'daily' && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          completedDays === daysToShow.length 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {completedDays}/{daysToShow.length}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Mini history chart */}
                {stats && stats.weeklyHistory.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">8 weeks</span>
                    <MiniHistoryChart data={stats.weeklyHistory} />
                  </div>
                )}
                
                {/* Tracking UI based on frequency */}
                {trackingMode === 'daily' ? (
                  /* Day checkboxes for daily/weekdays */
                  <div className="flex items-center justify-between gap-1">
                    {DAY_LABELS.map((label, index) => {
                      const isActiveDay = daysToShow.includes(index);
                      const isChecked = completionStatus[index] || false;
                      const date = weekDates[index];
                      const isTodayDate = date && isToday(date);
                      const isPast = date && isBefore(date, new Date()) && !isTodayDate;
                      
                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex flex-col items-center gap-1 flex-1",
                            !isActiveDay && "opacity-30"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-medium",
                            isTodayDate ? "text-emerald-400" : "text-muted-foreground"
                          )}>
                            {label}
                          </span>
                          <Checkbox
                            checked={isChecked}
                            disabled={!isActiveDay || isToggling}
                            onCheckedChange={() => {
                              if (isActiveDay) {
                                handleDayToggle(habit.id, index);
                              }
                            }}
                            className={cn(
                              "h-7 w-7 rounded border-border",
                              isTodayDate && "ring-2 ring-emerald-400/50 ring-offset-1 ring-offset-transparent",
                              isChecked && "bg-emerald-500 border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",
                              !isActiveDay && "cursor-not-allowed",
                              isPast && !isChecked && "border-border/50"
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Single checkbox for weekly/monthly/quarterly */
                  <div className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={hasCompletionThisWeek}
                      disabled={isToggling}
                      onCheckedChange={() => {
                        // Toggle using today's date
                        const todayIndex = weekDates.findIndex(d => d && isToday(d));
                        handleDayToggle(habit.id, todayIndex >= 0 ? todayIndex : 0);
                      }}
                      className={cn(
                        "h-8 w-8 rounded border-border",
                        hasCompletionThisWeek && "bg-emerald-500 border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-sm font-medium",
                        hasCompletionThisWeek ? "text-emerald-400" : "text-foreground"
                      )}>
                        {hasCompletionThisWeek ? "Completed this week" : "Mark as done this week"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {trackingMode === 'weekly' ? "Track once per week" : 
                         habit.frequency === 'quarterly' ? "Track once per quarter" : "Track once per month"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
