import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Goal } from "@/types/goals";
import { formatRelativeTime } from "@/utils/dateUtils";
import { Calendar, Tag, StickyNote, Target, RefreshCw } from "lucide-react";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { startOfWeek, isToday, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

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

export const GoalDetailOverview = ({ goal }: GoalDetailOverviewProps) => {
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { completions, toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);

  const getTargetDateDisplay = () => {
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  const habitItems = goal.habit_items || [];
  const hasHabits = habitItems.length > 0;

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
                
                return (
                  <div 
                    key={habit.id} 
                    className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3"
                  >
                    {/* Habit header */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/90 font-medium">{habit.text}</span>
                      <div className="flex items-center gap-2">
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
                    
                    {/* Day checkboxes */}
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
                              isTodayDate ? "text-emerald-400" : "text-white/60"
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
                                "h-7 w-7 rounded border-white/40",
                                isTodayDate && "ring-2 ring-emerald-400/50 ring-offset-1 ring-offset-transparent",
                                isChecked && "bg-emerald-500 border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",
                                !isActiveDay && "cursor-not-allowed",
                                isPast && !isChecked && "border-white/20"
                              )}
                            />
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
            <p className="text-white/80 leading-relaxed">{goal.description}</p>
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

        {goal.category && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {goal.category}
              </Badge>
            </CardContent>
          </Card>
        )}
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
