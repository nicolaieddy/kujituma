import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Target, 
  RefreshCw, 
  Flame, 
  ChevronRight,
  Calendar,
  CheckCircle2,
  Circle
} from "lucide-react";
import { Goal, HabitItem } from "@/types/goals";
import { HabitStats } from "@/services/habitStreaksService";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format, startOfWeek, parseISO } from "date-fns";
import { Link } from "react-router-dom";

interface GoalHabitGroupProps {
  goal: Goal;
  habitStats?: HabitStats;
  onClick?: () => void;
  isPaused?: boolean;
}

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  monthly_last_week: 'Monthly (Last Week)',
  quarterly: 'Quarterly'
};

export const GoalHabitGroup = ({ 
  goal, 
  habitStats, 
  onClick,
  isPaused = false 
}: GoalHabitGroupProps) => {
  const habitItems = goal.habit_items || [];
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  
  const { completions, toggleCompletion, isLoading } = useHabitCompletions(currentWeekStart);
  
  // Check if a habit is completed for today
  const isHabitCompletedToday = (habitItemId: string) => {
    return completions.some(c => c.habit_item_id === habitItemId && c.completion_date === todayStr);
  };

  // Calculate weekly completion for each habit
  const getWeeklyCompletionCount = (habitItem: HabitItem) => {
    const weekCompletions = completions.filter(c => {
      const completionDate = parseISO(c.completion_date);
      const weekStart = startOfWeek(completionDate, { weekStartsOn: 1 });
      return c.habit_item_id === habitItem.id && 
             format(weekStart, 'yyyy-MM-dd') === currentWeekStartStr;
    });
    return weekCompletions.length;
  };

  const getExpectedCompletions = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 7;
      case 'weekdays': return 5;
      case 'weekly': return 1;
      default: return 1;
    }
  };

  if (habitItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "border-border hover:border-primary/30 hover:shadow-lg transition-all group",
          isPaused && "opacity-75 border-slate-500/30"
        )}
      >
        {/* Goal Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div 
              className="flex-1 cursor-pointer"
              onClick={onClick}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Goal
                </span>
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors flex items-center gap-2">
                {goal.title}
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              {goal.category && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {goal.category}
                </Badge>
              )}
            </div>
            
            {/* Streak display if available */}
            {habitStats && habitStats.currentStreak > 0 && (
              <div className="flex items-center gap-1.5 text-orange-500">
                <Flame className={cn(
                  "h-5 w-5",
                  habitStats.currentStreak >= 4 && "animate-pulse"
                )} />
                <span className="font-bold">{habitStats.currentStreak}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Habit Items */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
              <RefreshCw className="h-3.5 w-3.5" />
              Habits ({habitItems.length})
            </div>
            
            <div className="space-y-2">
              {habitItems.map((habit) => {
                const isCompleted = isHabitCompletedToday(habit.id);
                const weeklyCount = getWeeklyCompletionCount(habit);
                const expectedCount = getExpectedCompletions(habit.frequency);
                const weeklyProgress = Math.min(100, (weeklyCount / expectedCount) * 100);
                
                return (
                  <div 
                    key={habit.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      isCompleted 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-muted/30 border-border/30 hover:border-border/50"
                    )}
                  >
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => toggleCompletion(goal.id, habit.id, today)}
                      disabled={isLoading || isPaused}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isCompleted && "text-primary"
                      )}>
                        {habit.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-muted/50 border-border/50"
                        >
                          {frequencyLabels[habit.frequency] || habit.frequency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {weeklyCount}/{expectedCount} this week
                        </span>
                      </div>
                    </div>
                    
                    {/* Weekly mini progress */}
                    <div className="w-16 flex-shrink-0">
                      <Progress value={weeklyProgress} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall stats if available */}
          {habitStats && (
            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall completion</span>
                <span className="font-medium">{habitStats.completionRate}%</span>
              </div>
              <Progress value={habitStats.completionRate} className="h-1.5 mt-2" />
            </div>
          )}

          {/* View Goal Link */}
          <Link
            to={`/?tab=goals&goalId=${goal.id}`}
            className="block text-center text-xs text-primary hover:text-primary/80 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            View goal details →
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
};
