import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Target, CheckCircle2, Circle } from "lucide-react";
import { format, parseISO } from "date-fns";

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
  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5" />
            Habits Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (habitStats.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5" />
            Habits Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Flame className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No habits tracked yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5" />
          Habits Review ({habitStats.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {habitStats.map((habit) => (
          <div
            key={habit.goal.id}
            className="p-4 rounded-lg bg-muted/50 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Target className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {habit.goal.title}
                </span>
              </div>
              {habit.currentStreak > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {habit.currentStreak} week{habit.currentStreak !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{habit.completionRate}% completion</span>
              <span>•</span>
              <span>{habit.completedWeeks}/{habit.totalWeeks} weeks</span>
            </div>

            {/* Weekly history visualization */}
            {habit.weeklyHistory.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {habit.weeklyHistory.slice().reverse().map((week, index) => (
                  <div
                    key={week.weekStart}
                    className="flex flex-col items-center"
                    title={`Week of ${format(parseISO(week.weekStart), 'MMM d')}: ${week.isCompleted ? 'Completed' : 'Not completed'}`}
                  >
                    {week.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                    {index === habit.weeklyHistory.length - 1 && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">now</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Habit items preview */}
            {habit.goal.habit_items && habit.goal.habit_items.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {habit.goal.habit_items.slice(0, 3).map((item: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs font-normal">
                    {item.name || item.text || `Habit ${idx + 1}`}
                  </Badge>
                ))}
                {habit.goal.habit_items.length > 3 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    +{habit.goal.habit_items.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
