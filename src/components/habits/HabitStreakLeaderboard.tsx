import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Medal, Sparkles } from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { cn } from "@/lib/utils";

interface HabitStreakLeaderboardProps {
  habitStats: HabitStats[];
  onHabitClick?: (stats: HabitStats) => void;
}

export const HabitStreakLeaderboard = ({ habitStats, onHabitClick }: HabitStreakLeaderboardProps) => {
  // Sort by current streak (descending), then by longest streak as tiebreaker
  const rankedHabits = [...habitStats]
    .filter(h => h.goal.status === 'not_started' || h.goal.status === 'in_progress')
    .sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      return b.longestStreak - a.longestStreak;
    })
    .slice(0, 5); // Top 5

  if (rankedHabits.length === 0) {
    return null;
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 8) return "text-orange-500";
    if (streak >= 4) return "text-yellow-500";
    if (streak >= 1) return "text-green-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Streak Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rankedHabits.map((stats, index) => {
          const rank = index + 1;
          const isPersonalBest = stats.currentStreak > 0 && stats.currentStreak >= stats.longestStreak;
          
          return (
            <div
              key={stats.goal.id}
              onClick={() => onHabitClick?.(stats)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                rank === 1 && "bg-yellow-500/10 border border-yellow-500/20",
                rank === 2 && "bg-muted/50",
                rank === 3 && "bg-muted/30",
                rank > 3 && "bg-background/50",
                onHabitClick && "cursor-pointer hover:bg-muted/80"
              )}
            >
              {/* Rank */}
              <div className="flex-shrink-0">
                {getRankIcon(rank)}
              </div>

              {/* Habit Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{stats.goal.title}</p>
                  {isPersonalBest && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-1.5 py-0 h-5 flex items-center gap-1 border-0">
                      <Sparkles className="h-3 w-3" />
                      PB
                    </Badge>
                  )}
                </div>
                {stats.goal.category && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {stats.goal.category}
                  </Badge>
                )}
              </div>

              {/* Streak */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Flame className={cn("h-4 w-4", getStreakColor(stats.currentStreak))} />
                <span className={cn("font-bold text-lg", getStreakColor(stats.currentStreak))}>
                  {stats.currentStreak}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stats.currentStreak === 1 ? "week" : "weeks"}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
