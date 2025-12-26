import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Flame, CheckCircle2, Circle, ChevronRight, Check } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { cn } from "@/lib/utils";

interface HabitsDueThisWeekProps {
  habits: HabitStats[];
  objectives: WeeklyObjective[];
  onHabitClick?: (habit: HabitStats) => void;
  onToggleObjective?: (objectiveId: string, isCompleted: boolean) => void;
}

export const HabitsDueThisWeek = ({ habits, objectives, onHabitClick, onToggleObjective }: HabitsDueThisWeekProps) => {
  if (habits.length === 0) return null;

  // Check if each habit's objective for this week is completed
  const habitsWithStatus = habits.map(habit => {
    // Find the objective created from this recurring goal
    const matchingObjective = objectives.find(obj => obj.goal_id === habit.goal.id);
    return {
      ...habit,
      objective: matchingObjective,
      isCompletedThisWeek: matchingObjective?.is_completed ?? false
    };
  });

  const completedCount = habitsWithStatus.filter(h => h.isCompletedThisWeek).length;
  const totalCount = habitsWithStatus.length;

  const handleToggle = (e: React.MouseEvent, habit: typeof habitsWithStatus[0]) => {
    e.stopPropagation();
    if (habit.objective && onToggleObjective) {
      onToggleObjective(habit.objective.id, habit.isCompletedThisWeek);
    }
  };

  return (
    <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Habits Due This Week
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{totalCount} done
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {habitsWithStatus.map((habit) => (
          <div
            key={habit.goal.id}
            onClick={() => onHabitClick?.(habit)}
            className={cn(
              "flex items-center gap-3 p-2 sm:p-3 rounded-lg border transition-all cursor-pointer group",
              habit.isCompletedThisWeek
                ? "bg-success/10 border-success/20"
                : "bg-background/50 border-border hover:border-primary/30 hover:bg-primary/5"
            )}
          >
            {/* Completion Status Icon */}
            <div className="flex-shrink-0">
              {habit.isCompletedThisWeek ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Habit Info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                habit.isCompletedThisWeek && "line-through text-muted-foreground"
              )}>
                {habit.goal.recurring_objective_text || habit.goal.title}
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
                onClick={(e) => handleToggle(e, habit)}
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
                onClick={(e) => handleToggle(e, habit)}
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
