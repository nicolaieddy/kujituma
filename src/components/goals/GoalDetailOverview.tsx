import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Goal } from "@/types/goals";
import { formatRelativeTime } from "@/utils/dateUtils";
import { Calendar, StickyNote, Target, RefreshCw, Flame, TrendingUp } from "lucide-react";
import { getCategoryConfig, CustomCategoryIcon } from "@/types/customCategories";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { useSyncedActivities } from "@/hooks/useSyncedActivities";
import { StravaActivityBadge } from "@/components/strava/StravaActivityBadge";
import { startOfWeek, isToday, isBefore, subWeeks, format, eachDayOfInterval, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { HabitCompletionsService } from "@/services/habitCompletionsService";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GoalDetailOverviewProps {
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
    // Removed nested TooltipProvider - using App-level provider to prevent stack overflow on iOS Safari
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
                  "bg-white/20",
                  isCurrentWeek && "ring-1 ring-white/40"
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
  );
};

export const GoalDetailOverview = ({ goal }: GoalDetailOverviewProps) => {
  const { user } = useAuth();
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);
  const { getStravaCompletionsForDate } = useSyncedActivities(currentWeekStart);

  const habitItems = goal.habit_items || [];
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

  const getTargetDateDisplay = () => {
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  const handleDayToggle = (habitItemId: string, dayIndex: number) => {
    const date = weekDates[dayIndex];
    if (!date) return;
    toggleCompletion(goal.id, habitItemId, date);
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
    return 'text-white/60';
  };

  return (
    <div className="space-y-6">
      {/* Habit Items with weekly checkboxes */}
      {hasHabits && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Habits ({habitItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-xs mb-4">Track your habits for this week</p>
            <div className="space-y-4">
              {habitItems.map((habit) => {
                const completionStatus = getCompletionStatus(habit.id);
                const daysToShow = getDaysToShow(habit.frequency);
                const completedDays = getHabitItemCompletionCount(habit.id);
                const stats = habitStats[habit.id];
                
                return (
                  <div 
                    key={habit.id} 
                    className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3"
                  >
                    {/* Habit header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-white/90 font-medium">{habit.text}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Streak indicator */}
                        {stats && stats.currentStreak > 0 && (
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10",
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
                            "flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10",
                            getCompletionRateColor(stats.completionRate)
                          )}>
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">{stats.completionRate}%</span>
                          </div>
                        )}

                        <Badge variant="outline" className="bg-white/10 text-white/80 border-white/20">
                          {frequencyLabels[habit.frequency] || habit.frequency}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            completedDays === daysToShow.length 
                              ? "bg-emerald-500/20 text-emerald-300" 
                              : "bg-white/10 text-white/70"
                          )}
                        >
                          {completedDays}/{daysToShow.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Mini history chart */}
                    {stats && stats.weeklyHistory.length > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/40 uppercase tracking-wide">8 weeks</span>
                        <MiniHistoryChart data={stats.weeklyHistory} />
                      </div>
                    )}
                    
                    {/* Day checkboxes */}
                    <div className="flex items-center justify-between gap-1">
                      {DAY_LABELS.map((label, index) => {
                        const isActiveDay = daysToShow.includes(index);
                        const isChecked = completionStatus[index] || false;
                        const date = weekDates[index];
                        const isTodayDate = date && isToday(date);
                        const isPast = date && isBefore(date, new Date()) && !isTodayDate;
                        
                        // Get all Strava completions for this day
                        const stravaActivitiesForDay = date ? getStravaCompletionsForDate(habit.id, date) : [];
                        
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
                              isTodayDate ? "text-emerald-400" : "text-white/60"
                            )}>
                              {label}
                            </span>
                            <div className="relative">
                              <Checkbox
                                checked={isChecked}
                                disabled={!isActiveDay || isToggling}
                                onCheckedChange={() => {
                                  if (isActiveDay) {
                                    handleDayToggle(habit.id, index);
                                  }
                                }}
                                className={cn(
                                  "h-7 w-7 rounded border-white/40",
                                  isTodayDate && "ring-2 ring-emerald-400/50 ring-offset-1 ring-offset-transparent",
                                  isChecked && "bg-emerald-500 border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",
                                  !isActiveDay && "cursor-not-allowed",
                                  isPast && !isChecked && "border-white/20"
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
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {goal.description && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownContent content={goal.description} className="text-white/80 leading-relaxed" />
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-white/60" />
                <span className="text-white/80 text-sm">{getTargetDateDisplay()}</span>
              </div>
              <div className="text-xs text-white/60">
                Created {formatRelativeTime(new Date(goal.created_at).getTime())}
              </div>
              {goal.completed_at && (
                <div className="text-xs text-white/60">
                  Completed {formatRelativeTime(new Date(goal.completed_at).getTime())}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {goal.category && (() => {
          const categoryConfig = getCategoryConfig(goal.category);
          const IconComponent = categoryConfig?.icon || CustomCategoryIcon;
          return (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="bg-white/20 text-white flex items-center gap-1.5 w-fit">
                  <IconComponent className="h-3 w-3" />
                  {goal.category}
                </Badge>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Notes */}
      {goal.notes && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white/80 leading-relaxed whitespace-pre-wrap">
              {goal.notes}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
