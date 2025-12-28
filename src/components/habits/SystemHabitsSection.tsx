import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Lock, Sparkles } from "lucide-react";
import { useAllDailyCheckIns } from "@/hooks/useAllDailyCheckIns";
import { useAllWeeklyPlanningSessions } from "@/hooks/useAllWeeklyPlanningSessions";
import { cn } from "@/lib/utils";

interface SystemHabit {
  id: string;
  name: string;
  description: string;
  frequency: string;
  completions: number;
  possible: number;
}

export const SystemHabitsSection = () => {
  const { checkIns, isLoading: checkInsLoading } = useAllDailyCheckIns(84); // 12 weeks
  const { sessions, isLoading: sessionsLoading } = useAllWeeklyPlanningSessions();

  const isLoading = checkInsLoading || sessionsLoading;

  // Calculate completions for last 12 weeks
  const systemHabits: SystemHabit[] = [
    {
      id: 'daily-checkin',
      name: 'Daily Check-in',
      description: 'Track your mood, energy, and focus daily',
      frequency: 'daily',
      completions: checkIns.length,
      possible: 12 * 7 // 12 weeks * 7 days
    },
    {
      id: 'weekly-planning',
      name: 'Weekly Planning',
      description: 'Plan your week and reflect on the previous one',
      frequency: 'weekly',
      completions: sessions.filter(s => s.is_completed).length,
      possible: 12 // 12 weeks
    }
  ];

  if (isLoading) {
    return null;
  }

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
          
          return (
            <Card key={habit.id} className="glass-card border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{habit.name}</h4>
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {habit.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {habit.frequency}
                  </Badge>
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
