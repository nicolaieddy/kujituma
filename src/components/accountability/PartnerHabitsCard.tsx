import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Flame, Target, CheckCircle2, Circle, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { useState } from "react";

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
}

export const PartnerHabitsCard = ({ habitStats, isLoading }: PartnerHabitsCardProps) => {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
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

                  {/* Habit items */}
                  {habitItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Habits</p>
                      <div className="flex flex-wrap gap-1.5">
                        {habitItems.map((item: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs font-normal">
                            {item.name || item.text || `Habit ${idx + 1}`}
                          </Badge>
                        ))}
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
