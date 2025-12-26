import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Goal } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { startOfWeek, addWeeks, format, isBefore, isAfter, parseISO, isSameWeek } from "date-fns";
import { CalendarDays, CheckCircle2, XCircle, Circle, Clock, Flame, Trophy, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitCompletionTimelineProps {
  goal: Goal;
  objectives: WeeklyObjective[];
}

interface WeekData {
  weekStart: string;
  weekNumber: number;
  status: 'completed' | 'missed' | 'pending' | 'future' | 'not_due' | 'paused';
  objective?: WeeklyObjective;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  isAtLongest: boolean;
}

export const HabitCompletionTimeline = ({ goal, objectives }: HabitCompletionTimelineProps) => {
  const timelineData = useMemo(() => {
    if (!goal.is_recurring) return [];

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const goalCreatedDate = parseISO(goal.created_at);
    const goalCreatedWeekStart = startOfWeek(goalCreatedDate, { weekStartsOn: 1 });
    
    // Generate 12 weeks of data (8 past + current + 3 future)
    const weeks: WeekData[] = [];
    
    for (let i = -8; i <= 3; i++) {
      const weekDate = addWeeks(currentWeekStart, i);
      const weekStart = format(weekDate, 'yyyy-MM-dd');
      const weekNumber = getWeekNumber(weekStart);
      
      // Check if this week is before the goal was created
      if (isBefore(weekDate, goalCreatedWeekStart)) {
        continue;
      }
      
      // Check if goal has a start date and this week is before it
      if (goal.start_date) {
        const goalStartDate = parseISO(goal.start_date);
        const goalStartWeek = startOfWeek(goalStartDate, { weekStartsOn: 1 });
        if (isBefore(weekDate, goalStartWeek)) {
          continue;
        }
      }
      
      // Check if goal has an end date and this week is after it
      if (goal.target_date) {
        const goalEndDate = parseISO(goal.target_date);
        if (isAfter(weekDate, goalEndDate)) {
          continue;
        }
      }
      
      const objective = objectives.find(obj => obj.week_start === weekStart);
      const isFuture = isAfter(weekDate, currentWeekStart);
      const isCurrent = format(weekDate, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');
      
      // Check if goal was paused during this week
      const isPausedWeek = goal.is_paused && goal.paused_at && 
        !isBefore(weekDate, startOfWeek(parseISO(goal.paused_at), { weekStartsOn: 1 }));
      
      let status: WeekData['status'];
      
      if (isPausedWeek && !isFuture) {
        status = 'paused';
      } else if (isFuture) {
        status = goal.is_paused ? 'paused' : 'future';
      } else if (objective) {
        status = objective.is_completed ? 'completed' : (isCurrent ? 'pending' : 'missed');
      } else {
        // No objective exists - check if it should have been created based on frequency
        status = isCurrent ? 'pending' : 'not_due';
      }
      
      weeks.push({
        weekStart,
        weekNumber,
        status,
        objective
      });
    }
    
    return weeks;
  }, [goal, objectives]);

  // Calculate streaks from timeline data
  const streakData = useMemo((): StreakData => {
    // Get only past and current weeks that are trackable (not future, not not_due)
    const trackableWeeks = timelineData.filter(w => 
      w.status === 'completed' || w.status === 'missed' || w.status === 'pending'
    );
    
    if (trackableWeeks.length === 0) {
      return { currentStreak: 0, longestStreak: 0, isAtLongest: false };
    }

    // Sort by week start date (oldest first)
    const sortedWeeks = [...trackableWeeks].sort((a, b) => 
      a.weekStart.localeCompare(b.weekStart)
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate longest streak and build streak history
    for (const week of sortedWeeks) {
      if (week.status === 'completed') {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else if (week.status === 'missed') {
        tempStreak = 0;
      }
      // 'pending' doesn't break or extend the streak calculation
    }

    // Calculate current streak (from most recent backwards)
    const reversedWeeks = [...sortedWeeks].reverse();
    for (const week of reversedWeeks) {
      if (week.status === 'pending') {
        // Skip current week in progress
        continue;
      }
      if (week.status === 'completed') {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    return {
      currentStreak,
      longestStreak,
      isAtLongest: currentStreak > 0 && currentStreak >= longestStreak
    };
  }, [timelineData]);

  const getWeekNumber = (weekStart: string) => {
    const startDate = new Date(weekStart);
    const startOfYear = new Date(startDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (startDate.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const formatWeekLabel = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
  };

  const completedCount = timelineData.filter(w => w.status === 'completed').length;
  const missedCount = timelineData.filter(w => w.status === 'missed').length;
  const totalTracked = completedCount + missedCount;
  const completionRate = totalTracked > 0 ? Math.round((completedCount / totalTracked) * 100) : 0;

  if (!goal.is_recurring || timelineData.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Completion Timeline</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Current Streak Badge */}
            {streakData.currentStreak > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "gap-1 cursor-help",
                      streakData.isAtLongest 
                        ? "border-amber-500/50 text-amber-600 bg-amber-500/10" 
                        : "border-primary/30 text-primary bg-primary/5"
                    )}
                  >
                    <Flame className="h-3 w-3" />
                    {streakData.currentStreak} week{streakData.currentStreak !== 1 ? 's' : ''}
                    {streakData.isAtLongest && <Trophy className="h-3 w-3 ml-0.5" />}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Current streak: {streakData.currentStreak} consecutive week{streakData.currentStreak !== 1 ? 's' : ''}</p>
                  {streakData.isAtLongest && <p className="text-amber-500 text-xs">Personal best!</p>}
                </TooltipContent>
              </Tooltip>
            )}
            {/* Longest Streak Badge (only show if different from current) */}
            {streakData.longestStreak > 0 && !streakData.isAtLongest && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 cursor-help border-muted-foreground/30 text-muted-foreground bg-muted/30">
                    <Trophy className="h-3 w-3" />
                    Best: {streakData.longestStreak}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Longest streak: {streakData.longestStreak} week{streakData.longestStreak !== 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {/* Completion Rate */}
            {totalTracked > 0 && (
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{completionRate}%</span> rate
              </span>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Track your habit completion over time
        </p>
      </CardHeader>
      <CardContent>
        {/* Timeline grid */}
        <div className="flex flex-wrap gap-2">
          {timelineData.map((week) => {
            const isCurrent = week.status === 'pending';
            
            return (
              <Tooltip key={week.weekStart}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center cursor-help transition-all",
                      week.status === 'completed' && "bg-primary/20 text-primary border-2 border-primary/40",
                      week.status === 'missed' && "bg-destructive/20 text-destructive border-2 border-destructive/40",
                      week.status === 'pending' && "bg-amber-500/20 text-amber-600 border-2 border-amber-500/40 ring-2 ring-amber-500/30 ring-offset-2 ring-offset-background",
                      week.status === 'future' && "bg-muted/50 text-muted-foreground border-2 border-dashed border-muted-foreground/30",
                      week.status === 'not_due' && "bg-muted/30 text-muted-foreground/50 border border-muted-foreground/20",
                      week.status === 'paused' && "bg-slate-500/20 text-slate-500 border-2 border-slate-500/40"
                    )}
                  >
                    {week.status === 'completed' && <CheckCircle2 className="h-5 w-5" />}
                    {week.status === 'missed' && <XCircle className="h-5 w-5" />}
                    {week.status === 'pending' && <Clock className="h-5 w-5" />}
                    {week.status === 'future' && <Circle className="h-4 w-4" />}
                    {week.status === 'not_due' && <span className="text-xs">—</span>}
                    {week.status === 'paused' && <Pause className="h-4 w-4" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <p className="font-medium">Week {week.weekNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatWeekLabel(week.weekStart)}</p>
                    <p className={cn(
                      "text-xs mt-1 font-medium",
                      week.status === 'completed' && "text-primary",
                      week.status === 'missed' && "text-destructive",
                      week.status === 'pending' && "text-amber-600",
                      week.status === 'future' && "text-muted-foreground",
                      week.status === 'not_due' && "text-muted-foreground",
                      week.status === 'paused' && "text-slate-500"
                    )}>
                      {week.status === 'completed' && "Completed ✓"}
                      {week.status === 'missed' && "Missed"}
                      {week.status === 'pending' && "In Progress"}
                      {week.status === 'future' && "Upcoming"}
                      {week.status === 'not_due' && "Not scheduled"}
                      {week.status === 'paused' && "Paused"}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-primary" />
            </div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/40 flex items-center justify-center">
              <XCircle className="h-3 w-3 text-destructive" />
            </div>
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Clock className="h-3 w-3 text-amber-600" />
            </div>
            <span>Current Week</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-muted/50 border border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Circle className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <span>Future</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-slate-500/20 border border-slate-500/40 flex items-center justify-center">
              <Pause className="h-2.5 w-2.5 text-slate-500" />
            </div>
            <span>Paused</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
