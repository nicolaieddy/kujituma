import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, TrendingUp, CheckCircle2, Circle, RefreshCw, Target, Trophy, Star, Zap } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { format, parseISO } from "date-fns";

interface HabitCardProps {
  habitStats: HabitStats;
  onClick?: () => void;
}

export const HabitCard = ({ habitStats, onClick }: HabitCardProps) => {
  const { goal, currentStreak, longestStreak, completionRate, totalWeeks, completedWeeks, weeklyHistory } = habitStats;

  const getStreakColor = (streak: number) => {
    if (streak >= 12) return "text-orange-500";
    if (streak >= 8) return "text-yellow-500";
    if (streak >= 4) return "text-green-500";
    if (streak >= 1) return "text-emerald-400";
    return "text-muted-foreground";
  };

  const getStreakBadge = (streak: number) => {
    if (streak >= 12) return { icon: Trophy, label: "12+ weeks!", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" };
    if (streak >= 8) return { icon: Star, label: "8+ weeks!", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" };
    if (streak >= 4) return { icon: Zap, label: "4+ weeks!", color: "bg-green-500/20 text-green-500 border-green-500/30" };
    return null;
  };

  const streakBadge = getStreakBadge(currentStreak);

  const frequencyLabel = {
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly"
  }[goal.recurrence_frequency || 'weekly'];

  return (
    <Card 
      className="glass-card hover:shadow-lift transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              {goal.title}
            </CardTitle>
            {goal.recurring_objective_text && goal.recurring_objective_text !== goal.title && (
              <p className="text-sm text-muted-foreground mt-1">
                {goal.recurring_objective_text}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {frequencyLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Streak Milestone Badge */}
        {streakBadge && (
          <div className="flex justify-center">
            <Badge variant="outline" className={`${streakBadge.color} flex items-center gap-1.5 py-1 px-3 animate-fade-in`}>
              <streakBadge.icon className="h-3.5 w-3.5" />
              {streakBadge.label}
            </Badge>
          </div>
        )}

        {/* Streak Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame className={`h-5 w-5 ${getStreakColor(currentStreak)} ${currentStreak >= 4 ? 'animate-pulse' : ''}`} />
              <span className={`font-bold text-lg ${getStreakColor(currentStreak)}`}>
                {currentStreak}
              </span>
              <span className="text-sm text-muted-foreground">current</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{longestStreak} best</span>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress 
            value={completionRate} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {completedWeeks} of {totalWeeks} weeks completed
          </p>
        </div>

        {/* Weekly History (last 12 weeks) */}
        {weeklyHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Recent weeks</p>
            <div className="flex gap-1 flex-wrap">
              {weeklyHistory.slice(0, 12).reverse().map((week, index) => (
                <div
                  key={week.weekStart}
                  className="relative group"
                  title={`Week of ${format(parseISO(week.weekStart), 'MMM d')}: ${week.isCompleted ? 'Completed' : 'Not completed'}`}
                >
                  {week.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category if exists */}
        {goal.category && (
          <div className="pt-2 border-t">
            <Badge variant="secondary" className="text-xs">
              {goal.category}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
