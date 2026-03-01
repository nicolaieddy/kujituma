import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Check, ChevronRight, ChevronDown, Snowflake, AlertTriangle, Zap } from "lucide-react";
import { HabitItem } from "@/types/goals";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { StravaActivityBadge } from "@/components/strava/StravaActivityBadge";

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface HabitGoalCardProps {
  goalId: string;
  goalTitle: string;
  habitItems: HabitItem[];
  completionRate: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  // Completion helpers
  getCompletionStatus: (habitItemId: string) => Record<number, boolean>;
  getHabitItemCompletionCount: (habitItem: HabitItem) => number;
  isDailyTracking: (frequency: string, habitItem?: HabitItem) => boolean;
  getDaysToShow: (frequency: string, habitItem?: HabitItem) => number[];
  isWeeklyHabitCompleted: (habitItemId: string) => boolean;
  handleDayToggle: (goalId: string, habitItemId: string, dayIndex: number) => void;
  handleWeeklyToggle: (goalId: string, habitItemId: string) => void;
  weekDates: Date[];
  todayIndex: number;
  isToggling: boolean;
  isReadOnly: boolean;
  // Streak helpers
  getHabitStreak: (habitItemId: string) => any;
  goalStreakTotal: number;
  goalStreakMax: number;
  goalHasAtRisk: boolean;
  // Integration helpers
  getMappingForHabitItem: (habitItemId: string) => any;
  getStravaCompletionsForHabit: (habitItemId: string) => any[];
  getStravaCompletionsForDate: (habitItemId: string, date: Date) => any[];
  formatDuration: (seconds: number) => string;
  formatDistance: (meters: number) => string;
}

export const HabitGoalCard = ({
  goalId,
  goalTitle,
  habitItems,
  completionRate,
  isExpanded,
  onToggleExpanded,
  getCompletionStatus,
  getHabitItemCompletionCount,
  isDailyTracking,
  getDaysToShow,
  isWeeklyHabitCompleted,
  handleDayToggle,
  handleWeeklyToggle,
  weekDates,
  todayIndex,
  isToggling,
  isReadOnly,
  getHabitStreak,
  goalStreakTotal,
  goalStreakMax,
  goalHasAtRisk,
  getMappingForHabitItem,
  getStravaCompletionsForHabit,
  getStravaCompletionsForDate,
  formatDuration,
  formatDistance,
}: HabitGoalCardProps) => {
  // Calculate today's completion for this goal
  const todayCompletions = habitItems.map(item => {
    const status = getCompletionStatus(item.id);
    const isDue = isDailyTracking(item.frequency, item)
      ? getDaysToShow(item.frequency, item).includes(todayIndex)
      : true;
    const isCompleted = isDailyTracking(item.frequency, item)
      ? (todayIndex >= 0 && status[todayIndex])
      : isWeeklyHabitCompleted(item.id);
    return { text: item.text, isDue, isCompleted };
  });

  const dueToday = todayCompletions.filter(h => h.isDue);
  const completedToday = dueToday.filter(h => h.isCompleted).length;
  const totalDueToday = dueToday.length;
  const progressPercent = totalDueToday > 0 ? Math.round((completedToday / totalDueToday) * 100) : 0;
  const allDoneToday = totalDueToday > 0 && completedToday === totalDueToday;
  const nothingDone = completedToday === 0 && totalDueToday > 0;

  // Pending daily habits for "Complete All"
  const pendingDailyHabits = habitItems.filter(item => {
    if (!isDailyTracking(item.frequency, item)) return false;
    const daysToShow = getDaysToShow(item.frequency, item);
    if (todayIndex < 0 || !daysToShow.includes(todayIndex)) return false;
    const status = getCompletionStatus(item.id);
    return !status[todayIndex];
  });

  const handleCompleteAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    pendingDailyHabits.forEach(item => {
      handleDayToggle(goalId, item.id, todayIndex);
    });
  };

  // Today's inline checkboxes for collapsed view
  const todayHabits = habitItems.map(item => {
    const status = getCompletionStatus(item.id);
    const isDue = isDailyTracking(item.frequency, item)
      ? getDaysToShow(item.frequency, item).includes(todayIndex)
      : true;
    const isCompleted = isDailyTracking(item.frequency, item)
      ? (todayIndex >= 0 && status[todayIndex])
      : isWeeklyHabitCompleted(item.id);
    return { item, isDue, isCompleted };
  });

  return (
    <div className="rounded-md border border-border/60 transition-all">
      {/* Collapsed: single-line with inline today checkboxes */}
      <div
        onClick={onToggleExpanded}
        className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-muted/40 transition-colors"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onToggleExpanded(); }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>

        <p className="text-sm font-medium truncate min-w-0 flex-shrink">{goalTitle}</p>

        {/* Inline today's checkboxes (collapsed only) */}
        {!isExpanded && totalDueToday > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {allDoneToday ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                {completedToday}/{totalDueToday}
              </span>
            )}
          </div>
        )}

        {/* Expanded header: just show count */}
        {isExpanded && (
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {goalStreakTotal > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs gap-0.5 px-1.5",
                  goalHasAtRisk
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                )}
              >
                <Flame className="h-3 w-3" />
                {goalStreakTotal}d
              </Badge>
            )}
            <Badge
              variant={allDoneToday ? "default" : "outline"}
              className={cn("text-xs", allDoneToday && "bg-success text-success-foreground")}
            >
              {completedToday}/{totalDueToday}
            </Badge>
          </div>
        )}
      </div>

      {/* Expanded Habit Items */}
      {isExpanded && (
        <div className="border-t border-border/50 px-3 py-2 space-y-3">
          {/* Complete All button */}
          {!isReadOnly && pendingDailyHabits.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={handleCompleteAll}
              disabled={isToggling}
            >
              <Check className="h-3.5 w-3.5" />
              Complete All Today ({pendingDailyHabits.length} remaining)
            </Button>
          )}

          {habitItems.map((item) => {
            const completionStatus = getCompletionStatus(item.id);
            const daysToShow = getDaysToShow(item.frequency, item);
            const completedDays = getHabitItemCompletionCount(item);
            const showDailyCheckboxes = isDailyTracking(item.frequency, item);
            const isWeeklyCompleted = isWeeklyHabitCompleted(item.id);

            const habitMapping = getMappingForHabitItem(item.id);
            const isStravaMapped = habitMapping?.integration_type === 'strava';
            const isDuolingoMapped = habitMapping?.integration_type === 'duolingo';
            const stravaCompletions = isStravaMapped ? getStravaCompletionsForHabit(item.id) : [];

            const habitStreak = getHabitStreak(item.id);

            const frequencyLabel = item.frequency === 'weekly' ? 'Weekly'
              : item.frequency === 'biweekly' ? 'Biweekly'
              : item.frequency === 'monthly' ? 'Monthly'
              : item.frequency === 'monthly_last_week' ? 'Monthly (last week)'
              : item.frequency === 'quarterly' ? 'Quarterly'
              : item.frequency === 'custom' ? 'Custom'
              : item.frequency;

            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate flex-1">
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
                            <Zap className="h-3 w-3" /> Auto-tracked via Strava
                          </p>
                          {stravaCompletions.length > 0 && (
                            <p className="text-xs text-primary mt-1">
                              {stravaCompletions.length} activit{stravaCompletions.length === 1 ? 'y' : 'ies'} synced
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {isDuolingoMapped && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-shrink-0"><span className="text-base">🦉</span></div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="font-medium flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Linked to Duolingo
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <p className="text-sm font-medium truncate">{item.text}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {showDailyCheckboxes && habitStreak && habitStreak.currentStreak > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs gap-0.5 px-1.5",
                              habitStreak.streakStatus === 'at_risk'
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            )}
                          >
                            <Flame className="h-3 w-3" />
                            {habitStreak.currentStreak}d
                            {habitStreak.freezesRemaining > 0 && <Snowflake className="h-2.5 w-2.5 text-blue-400" />}
                            {habitStreak.streakStatus === 'at_risk' && <AlertTriangle className="h-2.5 w-2.5" />}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="font-medium">{habitStreak.currentStreak} day streak</p>
                          <p className="text-xs text-muted-foreground">Best: {habitStreak.longestStreak} days</p>
                          {habitStreak.freezesRemaining > 0 ? (
                            <p className="text-xs text-blue-400 flex items-center gap-1 mt-1">
                              <Snowflake className="h-3 w-3" /> {habitStreak.freezesRemaining} freeze left
                            </p>
                          ) : (
                            <p className="text-xs text-yellow-500 mt-1">No freezes left</p>
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
                      <Badge variant="outline" className="text-xs border-[#FC4C02]/30 text-[#FC4C02] bg-[#FC4C02]/5">Strava</Badge>
                    ) : isDuolingoMapped ? (
                      <Badge variant="outline" className="text-xs border-[#58CC02]/30 text-[#58CC02] bg-[#58CC02]/5">Duolingo</Badge>
                    ) : showDailyCheckboxes ? (
                      <Badge variant="secondary" className="text-xs">{completedDays}/{daysToShow.length}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs capitalize">{frequencyLabel}</Badge>
                    )}
                  </div>
                </div>

                {/* Day checkboxes - Strava mapped */}
                {isStravaMapped ? (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {DAY_LABELS.map((label, index) => {
                      const isChecked = completionStatus[index] || false;
                      const date = weekDates[index];
                      const isTodayDate = date && isToday(date);
                      const stravaActivitiesForDay = date ? getStravaCompletionsForDate(item.id, date) : [];

                      return (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn("text-[10px] font-medium", isTodayDate ? "text-primary" : "text-muted-foreground")}>{label}</span>
                              <div className={cn(
                                "h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center border transition-all",
                                isChecked ? "bg-[#FC4C02]/10 border-[#FC4C02]/30" : "bg-muted/30 border-border",
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
                                {stravaActivitiesForDay.map((activity: any, idx: number) => (
                                  <div key={activity.id} className={idx > 0 ? "pt-2 border-t border-border" : ""}>
                                    <p className="font-medium">{activity.activity_name || 'Activity'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {activity.activity_type}
                                      {activity.duration_seconds && ` • ${formatDuration(activity.duration_seconds)}`}
                                      {activity.distance_meters && activity.distance_meters > 0 && ` • ${formatDistance(activity.distance_meters)}`}
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
                  /* Day checkboxes for daily/weekday habits - larger on mobile */
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {DAY_LABELS.map((label, index) => {
                      const isActiveDay = daysToShow.includes(index);
                      const isChecked = completionStatus[index] || false;
                      const date = weekDates[index];
                      const isTodayDate = date && isToday(date);
                      const stravaActivitiesForDay = date ? getStravaCompletionsForDate(item.id, date) : [];

                      return (
                        <div
                          key={index}
                          className={cn("flex flex-col items-center gap-0.5", !isActiveDay && "opacity-30")}
                        >
                          <span className={cn("text-[10px] font-medium", isTodayDate ? "text-primary" : "text-muted-foreground")}>{label}</span>
                          <div className="relative">
                            <Checkbox
                              checked={isChecked}
                              disabled={!isActiveDay || isToggling || isReadOnly}
                              onCheckedChange={() => {
                                if (isActiveDay && !isReadOnly) handleDayToggle(goalId, item.id, index);
                              }}
                              className={cn(
                                "h-7 w-7 sm:h-8 sm:w-8 rounded-md",
                                isTodayDate && !isReadOnly && "ring-2 ring-primary ring-offset-1",
                                isChecked && "bg-success border-success",
                                (!isActiveDay || isReadOnly) && "cursor-not-allowed"
                              )}
                            />
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
                  /* Single weekly checkbox */
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isWeeklyCompleted}
                      disabled={isToggling || isReadOnly}
                      onCheckedChange={() => !isReadOnly && handleWeeklyToggle(goalId, item.id)}
                      className={cn(
                        "h-5 w-5 rounded",
                        isWeeklyCompleted && "bg-success border-success",
                        isReadOnly && "cursor-not-allowed"
                      )}
                    />
                    <span className={cn("text-sm", isWeeklyCompleted ? "text-success line-through" : "text-muted-foreground")}>
                      {isWeeklyCompleted ? "Completed this week" : "Mark as done"}
                    </span>
                    {isWeeklyCompleted && <Check className="h-4 w-4 text-success" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
