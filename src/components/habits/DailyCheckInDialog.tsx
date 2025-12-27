import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Zap, Target, AlertTriangle, Trophy, Loader2, RefreshCw, Flame } from "lucide-react";
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
  const { toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);
  
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

  const completedCount = habitItemsDueToday.filter(h => getHabitChecked(h.id)).length;
  
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Today's Habits ({completedCount}/{habitItemsDueToday.length})
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