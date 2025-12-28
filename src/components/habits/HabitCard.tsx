import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, TrendingUp, CheckCircle2, Circle, RefreshCw, Target, Trophy, Star, Zap, Pause, MousePointer } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HabitCardProps {
  habitStats: HabitStats;
  onClick?: () => void;
  isPaused?: boolean;
}

export const HabitCard = ({ habitStats, onClick, isPaused = false }: HabitCardProps) => {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={cn(
          "border-border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group",
          isPaused && "opacity-75 border-slate-500/30"
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-16">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
                {isPaused ? (
                  <Pause className="h-4 w-4 text-slate-500" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-primary" />
                )}
                {goal.title}
              </CardTitle>
              {goal.recurring_objective_text && goal.recurring_objective_text !== goal.title && (
                <p className="text-sm text-muted-foreground mt-1">
                  {goal.recurring_objective_text}
                </p>
              )}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary flex items-center gap-1 mt-1">
                <MousePointer className="h-3 w-3" />
                Click to view details
              </div>
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
                    className="relative group/week"
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
    </motion.div>
  );
};
