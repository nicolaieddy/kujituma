import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Lock, Sparkles, Flame, Trophy, Calendar, Bell } from "lucide-react";
import { useAllDailyCheckIns } from "@/hooks/useAllDailyCheckIns";
import { useAllWeeklyPlanningSessions } from "@/hooks/useAllWeeklyPlanningSessions";
import { useSystemHabitStreaks } from "@/hooks/useSystemHabitStreaks";
import { cn } from "@/lib/utils";

interface SystemHabit {
  id: string;
  name: string;
  description: string;
  frequency: string;
  completions: number;
  possible: number;
  currentStreak: number;
  longestStreak: number;
  isDue: boolean;
  unit: 'day' | 'week';
}

export const SystemHabitsSection = () => {
  const { checkIns, isLoading: checkInsLoading } = useAllDailyCheckIns(84); // 12 weeks
  const { sessions, isLoading: sessionsLoading } = useAllWeeklyPlanningSessions();
  const streaks = useSystemHabitStreaks();
  
  const isLoading = checkInsLoading || sessionsLoading || streaks.isLoading;

  // Return null early if still loading or data not available
  if (isLoading || !streaks.dailyCheckIn || !streaks.weeklyPlanning) {
    return null;
  }

  const { dailyCheckIn, weeklyPlanning } = streaks;

  // Calculate completions for last 12 weeks
  const systemHabits: SystemHabit[] = [
    {
      id: 'daily-checkin',
      name: 'Daily Check-in',
      description: 'Track your mood, energy, and focus daily',
      frequency: 'daily',
      completions: checkIns?.length || 0,
      possible: 12 * 7, // 12 weeks * 7 days
      currentStreak: dailyCheckIn?.currentStreak || 0,
      longestStreak: dailyCheckIn?.longestStreak || 0,
      isDue: dailyCheckIn?.isDueToday || false,
      unit: 'day'
    },
    {
      id: 'weekly-planning',
      name: 'Weekly Planning',
      description: 'Plan your week and reflect on the previous one',
      frequency: 'weekly',
      completions: sessions?.filter(s => s.is_completed).length || 0,
      possible: 12, // 12 weeks
      currentStreak: weeklyPlanning?.currentStreak || 0,
      longestStreak: weeklyPlanning?.longestStreak || 0,
      isDue: weeklyPlanning?.isDueToday || false,
      unit: 'week'
    }
  ];

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return "text-orange-500";
    if (streak >= 3) return "text-yellow-500";
    if (streak >= 1) return "text-green-500";
    return "text-muted-foreground";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          System Habits
        </h3>
        <Badge variant="outline" className="gap-1">
          <Lock className="h-3 w-3" />
          Built-in
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {systemHabits.map(habit => {
          const rate = habit.possible > 0 ? (habit.completions / habit.possible) * 100 : 0;
          const isPersonalBest = habit.currentStreak > 0 && habit.currentStreak >= habit.longestStreak;
          
          return (
            <Card key={habit.id} className={cn(
              "glass-card border-primary/20 transition-all",
              habit.isDue && "border-orange-500/30"
            )}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{habit.name}</h4>
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      {habit.isDue && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-orange-500/30 text-orange-500 gap-1">
                          <Bell className="h-3 w-3" />
                          Due
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {habit.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {habit.frequency}
                  </Badge>
                </div>

                {/* Streak display */}
                <div className="flex items-center gap-4 mt-3 p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Flame className={cn("h-4 w-4", getStreakColor(habit.currentStreak))} />
                    <span className={cn("font-bold", getStreakColor(habit.currentStreak))}>
                      {habit.currentStreak}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {habit.unit === 'day' 
                        ? (habit.currentStreak === 1 ? 'day' : 'days')
                        : (habit.currentStreak === 1 ? 'week' : 'weeks')
                      }
                    </span>
                    {isPersonalBest && habit.currentStreak > 0 && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-1.5 py-0 h-5 flex items-center gap-1 border-0 ml-1">
                        <Trophy className="h-3 w-3" />
                        PB
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground border-l pl-4">
                    Best: <span className="font-medium text-foreground">{habit.longestStreak}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          rate >= 80 ? "bg-green-500" : 
                          rate >= 50 ? "bg-yellow-500" : 
                          "bg-muted-foreground/50"
                        )}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {habit.completions} completions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {habit.completions}/{habit.possible} ({rate.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
