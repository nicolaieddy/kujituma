import { Flame, TrendingUp, Target, Award } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { cn } from "@/lib/utils";

interface HabitStreaksSummaryProps {
  habitStats: HabitStats[];
  averageCompletionRate: number;
}

export const HabitStreaksSummary = ({ 
  habitStats, 
  averageCompletionRate 
}: HabitStreaksSummaryProps) => {
  if (habitStats.length === 0) return null;

  // Calculate aggregate stats
  const totalCurrentStreak = habitStats.reduce((sum, h) => sum + h.currentStreak, 0);
  const longestOverallStreak = Math.max(...habitStats.map(h => h.longestStreak), 0);
  const activeHabits = habitStats.length;
  
  // Find the habit with the best current streak
  const bestCurrentStreak = habitStats.reduce((best, h) => 
    h.currentStreak > best.currentStreak ? h : best
  , habitStats[0]);

  // Find the habit with the longest ever streak
  const bestLongestStreak = habitStats.reduce((best, h) => 
    h.longestStreak > best.longestStreak ? h : best
  , habitStats[0]);

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/10">
      {/* Current Streaks */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center justify-center h-8 w-8 rounded-full",
          totalCurrentStreak > 0 ? "bg-orange-500/20" : "bg-muted"
        )}>
          <Flame className={cn(
            "h-4 w-4",
            totalCurrentStreak >= 10 ? "text-orange-500" :
            totalCurrentStreak >= 5 ? "text-yellow-500" :
            totalCurrentStreak > 0 ? "text-emerald-500" :
            "text-muted-foreground"
          )} />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none">{totalCurrentStreak}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Active</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-border" />

      {/* Longest Streak */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20">
          <Award className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none">{longestOverallStreak}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Best</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-border" />

      {/* Completion Rate */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center justify-center h-8 w-8 rounded-full",
          averageCompletionRate >= 80 ? "bg-success/20" :
          averageCompletionRate >= 50 ? "bg-yellow-500/20" :
          "bg-muted"
        )}>
          <TrendingUp className={cn(
            "h-4 w-4",
            averageCompletionRate >= 80 ? "text-success" :
            averageCompletionRate >= 50 ? "text-yellow-500" :
            "text-muted-foreground"
          )} />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none">{averageCompletionRate}%</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Rate</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-border hidden sm:block" />

      {/* Active Habits Count */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none">{activeHabits}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Habits</span>
        </div>
      </div>
    </div>
  );
};
