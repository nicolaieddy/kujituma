import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { useGoals } from "@/hooks/useGoals";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { Zap, Target, AlertTriangle, Trophy, Loader2, RefreshCw, Flame, TrendingUp } from "lucide-react";
import { startOfWeek, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { HabitItem } from "@/types/goals";

interface DailyCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOOD_OPTIONS = [
  { value: 1, emoji: "😔", label: "Struggling" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

const ENERGY_OPTIONS = [
  { value: 1, emoji: "😴", label: "Depleted" },
  { value: 2, emoji: "🥱", label: "Low" },
  { value: 3, emoji: "⚡", label: "Moderate" },
  { value: 4, emoji: "💪", label: "High" },
  { value: 5, emoji: "🔥", label: "Peak" },
];

export const DailyCheckInDialog = ({ open, onOpenChange }: DailyCheckInDialogProps) => {
  const { submitCheckIn, isSubmitting, todayCheckIn } = useDailyCheckIn();
  const { goals } = useGoals();
  
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { completions, toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);
  
  const [moodRating, setMoodRating] = useState<number>(todayCheckIn?.mood_rating || 3);
  const [energyLevel, setEnergyLevel] = useState<number>(todayCheckIn?.energy_level || 3);
  const [focusToday, setFocusToday] = useState(todayCheckIn?.focus_today || "");
  const [quickWin, setQuickWin] = useState(todayCheckIn?.quick_win || "");
  const [blocker, setBlocker] = useState(todayCheckIn?.blocker || "");

  // Get today's index in the week (0 = Monday, 6 = Sunday)
  const todayIndex = weekDates.findIndex(d => isToday(d));

  // Get habits with habit_items that are due today
  const goalsWithHabits = goals.filter(g => 
    g.habit_items && 
    g.habit_items.length > 0 && 
    !g.is_paused &&
    (g.status === 'not_started' || g.status === 'in_progress')
  );

  // Calculate weekly streak (days completed this week) for each habit item
  const habitWeekStreaks = useMemo(() => {
    const streaks: Record<string, number> = {};
    completions.forEach(c => {
      if (!streaks[c.habit_item_id]) {
        streaks[c.habit_item_id] = 0;
      }
      streaks[c.habit_item_id]++;
    });
    return streaks;
  }, [completions]);

  // Flatten all habit items with their goal info, filtering by frequency
  const habitItemsDueToday = goalsWithHabits.flatMap(goal => {
    const items = goal.habit_items as HabitItem[];
    return items
      .filter(item => {
        // Check if habit is due today based on frequency
        if (item.frequency === 'daily') return true;
        if (item.frequency === 'weekdays' && todayIndex >= 0 && todayIndex <= 4) return true;
        // Weekly habits show all week
        if (item.frequency === 'weekly') return true;
        return true; // Default show
      })
      .map(item => ({
        ...item,
        goalId: goal.id,
        goalTitle: goal.title,
        weekStreak: habitWeekStreaks[item.id] || 0,
      }));
  });

  const handleHabitToggle = (goalId: string, habitItemId: string) => {
    const today = new Date();
    toggleCompletion(goalId, habitItemId, today);
  };

  const getHabitChecked = (habitItemId: string): boolean => {
    const status = getCompletionStatus(habitItemId);
    return todayIndex >= 0 ? status[todayIndex] || false : false;
  };

  const completedTodayCount = habitItemsDueToday.filter(h => getHabitChecked(h.id)).length;

  // Calculate weekly progress (total completions / expected completions)
  const weeklyProgress = useMemo(() => {
    if (habitItemsDueToday.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    // Days elapsed this week (including today)
    const daysElapsed = todayIndex + 1;
    
    let totalExpected = 0;
    let totalCompleted = 0;

    habitItemsDueToday.forEach(habit => {
      let expectedDays = 0;
      if (habit.frequency === 'daily') {
        expectedDays = daysElapsed;
      } else if (habit.frequency === 'weekdays') {
        expectedDays = Math.min(daysElapsed, 5); // Mon-Fri only
      } else if (habit.frequency === 'weekly') {
        expectedDays = 1;
      } else {
        expectedDays = daysElapsed; // Default to daily
      }
      
      totalExpected += expectedDays;
      totalCompleted += habit.weekStreak;
    });

    const percentage = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
    return { completed: totalCompleted, total: totalExpected, percentage: Math.min(percentage, 100) };
  }, [habitItemsDueToday, todayIndex]);
  
  const handleSubmit = async () => {
    await submitCheckIn({
      mood_rating: moodRating,
      energy_level: energyLevel,
      focus_today: focusToday || undefined,
      quick_win: quickWin || undefined,
      blocker: blocker || undefined,
    });
    onOpenChange(false);
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 6) return "text-orange-500";
    if (streak >= 4) return "text-yellow-500";
    if (streak >= 2) return "text-green-500";
    return "text-emerald-400";
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">☀️</span>
            Daily Check-In
          </DialogTitle>
          <DialogDescription>
            Take 30 seconds to set your intention for today
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Habits Due Today */}
          {habitItemsDueToday.length > 0 && (
            <div className="space-y-3">
              {/* Weekly Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Weekly Progress
                  </Label>
                  <span className={cn(
                    "text-sm font-semibold",
                    weeklyProgress.percentage >= 80 ? "text-success" :
                    weeklyProgress.percentage >= 50 ? "text-yellow-500" :
                    "text-muted-foreground"
                  )}>
                    {weeklyProgress.percentage}%
                  </span>
                </div>
                <Progress 
                  value={weeklyProgress.percentage} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground text-center">
                  {weeklyProgress.completed} of {weeklyProgress.total} habit check-ins completed this week
                </p>
              </div>

              {/* Today's Habits */}
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Today's Habits ({completedTodayCount}/{habitItemsDueToday.length})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                {habitItemsDueToday.map((habit) => {
                  const isChecked = getHabitChecked(habit.id);
                  return (
                    <div
                      key={habit.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md transition-colors",
                        isChecked ? "bg-success/10" : "hover:bg-accent"
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={isToggling}
                        onCheckedChange={() => handleHabitToggle(habit.goalId, habit.id)}
                        className={cn(
                          "h-5 w-5",
                          isChecked && "bg-success border-success"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isChecked && "line-through text-muted-foreground"
                        )}>
                          {habit.text}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {habit.goalTitle}
                        </p>
                      </div>
                      {/* Week streak indicator */}
                      {habit.weekStreak > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Flame className={cn("h-4 w-4", getStreakColor(habit.weekStreak))} />
                          <span className="text-xs font-medium">{habit.weekStreak}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mood Rating */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              How are you feeling today?
            </Label>
            <div className="flex justify-between">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMoodRating(option.value)}
                  className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                    moodRating === option.value 
                      ? 'bg-primary/20 ring-2 ring-primary scale-110' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-xs text-muted-foreground mt-1">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Energy Level */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Energy level?
            </Label>
            <div className="flex justify-between">
              {ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEnergyLevel(option.value)}
                  className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                    energyLevel === option.value 
                      ? 'bg-primary/20 ring-2 ring-primary scale-110' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-xs text-muted-foreground mt-1">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Focus Today */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              What's your #1 focus today?
            </Label>
            <Textarea
              value={focusToday}
              onChange={(e) => setFocusToday(e.target.value)}
              placeholder="e.g., Finish the project proposal..."
              className="resize-none"
              rows={2}
            />
          </div>
          
          {/* Quick Win */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              One quick win you can accomplish?
            </Label>
            <Textarea
              value={quickWin}
              onChange={(e) => setQuickWin(e.target.value)}
              placeholder="e.g., Reply to that important email..."
              className="resize-none"
              rows={2}
            />
          </div>
          
          {/* Blocker (Optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Any blockers to watch for? (optional)
            </Label>
            <Textarea
              value={blocker}
              onChange={(e) => setBlocker(e.target.value)}
              placeholder="e.g., Waiting on feedback from..."
              className="resize-none"
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for now
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Let's Go! 🚀
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};