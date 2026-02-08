import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { useGoals } from "@/hooks/useGoals";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { useWeeklyObjectives } from "@/hooks/useWeeklyObjectives";
import { useDuePartnerCheckIns } from "@/hooks/useDuePartnerCheckIns";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Zap, Target, Loader2, RefreshCw, Flame, TrendingUp, CalendarCheck, Users, Clock, BookOpen, Lock, Pencil } from "lucide-react";
import { startOfWeek, isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import { HabitItem } from "@/types/goals";
import { celebrateGoalComplete } from "@/utils/confetti";
import { hapticSelection, hapticSuccess } from "@/utils/haptic";
import { CachedDataIndicator } from "@/components/pwa/CachedDataIndicator";

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

// Get greeting based on time of day
const getGreeting = (name?: string) => {
  const hour = new Date().getHours();
  const firstName = name?.split(' ')[0] || '';
  
  if (hour < 12) {
    return { emoji: "🌅", text: `Good morning${firstName ? `, ${firstName}` : ''}!` };
  } else if (hour < 17) {
    return { emoji: "☀️", text: `Good afternoon${firstName ? `, ${firstName}` : ''}!` };
  } else if (hour < 21) {
    return { emoji: "🌆", text: `Good evening${firstName ? `, ${firstName}` : ''}!` };
  } else {
    return { emoji: "🌙", text: `Good night${firstName ? `, ${firstName}` : ''}!` };
  }
};

// Get day name from scheduled_day format
const getDayName = (date: Date) => {
  return format(date, 'EEEE').toLowerCase();
};

export const DailyCheckInDialog = ({ open, onOpenChange }: DailyCheckInDialogProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { submitCheckIn, isSubmitting, todayCheckIn, isCached, lastSync } = useDailyCheckIn();
  const { goals } = useGoals();
  const { overdueCheckIns, dueTodayCheckIns, hasOverdue, hasDueToday } = useDuePartnerCheckIns();
  const navigate = useNavigate();
  
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  const { completions, toggleCompletion, getCompletionStatus, weekDates, isToggling } = useHabitCompletions(currentWeekStart);
  const { objectives, updateObjective, isUpdating } = useWeeklyObjectives(weekStartStr);
  
  const [moodRating, setMoodRating] = useState<number>(3);
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [focusToday, setFocusToday] = useState("");
  const [journalEntry, setJournalEntry] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isEditingJournal, setIsEditingJournal] = useState(false);
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  
  // Reset form state when dialog opens - only populate if todayCheckIn matches today's date
  useEffect(() => {
    if (open) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const hasTodayCheckIn = todayCheckIn && todayCheckIn.check_in_date === today;
      
      if (hasTodayCheckIn) {
        // Populate with today's saved data
        setMoodRating(todayCheckIn.mood_rating || 3);
        setEnergyLevel(todayCheckIn.energy_level || 3);
        setFocusToday(todayCheckIn.focus_today || "");
        setJournalEntry(todayCheckIn.journal_entry || "");
      } else {
        // Clear form for new day
        setMoodRating(3);
        setEnergyLevel(3);
        setFocusToday("");
        setJournalEntry("");
      }
      // Reset edit states
      setIsEditingJournal(false);
      setIsEditingFocus(false);
      setHasInitialized(true);
    }
  }, [open, todayCheckIn]);

  // Get greeting
  const greeting = useMemo(() => getGreeting(user?.user_metadata?.full_name), [user]);

  // Get today's index in the week (0 = Monday, 6 = Sunday)
  const todayIndex = weekDates.findIndex(d => isToday(d));
  const todayDayName = getDayName(new Date());

  // Get objectives scheduled for today
  const todaysObjectives = useMemo(() => {
    return objectives.filter(obj => 
      obj.scheduled_day?.toLowerCase() === todayDayName && !obj.is_completed
    );
  }, [objectives, todayDayName]);

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

  // Get today's day of week as number (0 = Sunday, 1 = Monday, etc.)
  const todayDayOfWeek = new Date().getDay();

  // Flatten all habit items with their goal info, filtering by frequency
  const habitItemsDueToday = goalsWithHabits.flatMap(goal => {
    const items = goal.habit_items as HabitItem[];
    return items
      .filter(item => {
        // Check if habit is due today based on frequency
        if (item.frequency === 'daily') return true;
        
        // Weekdays = Monday-Friday (todayIndex 0-4 in our week array, or day 1-5)
        if (item.frequency === 'weekdays') {
          return todayIndex >= 0 && todayIndex <= 4;
        }
        
        // Weekly habits - check customSchedule.daysOfWeek, otherwise default to Monday
        if (item.frequency === 'weekly') {
          if (item.customSchedule?.daysOfWeek && item.customSchedule.daysOfWeek.length > 0) {
            return item.customSchedule.daysOfWeek.includes(todayDayOfWeek);
          }
          // Default weekly to Monday (1)
          return todayDayOfWeek === 1;
        }
        
        // Biweekly - simplified: check if it's the right day
        if (item.frequency === 'biweekly') {
          if (item.customSchedule?.daysOfWeek && item.customSchedule.daysOfWeek.length > 0) {
            return item.customSchedule.daysOfWeek.includes(todayDayOfWeek);
          }
          return todayDayOfWeek === 1; // Default to Monday
        }
        
        // Monthly / quarterly - check day of week if specified
        if (item.frequency === 'monthly' || item.frequency === 'monthly_last_week' || item.frequency === 'quarterly') {
          // These are less frequent, show if today matches specified day
          if (item.customSchedule?.daysOfWeek && item.customSchedule.daysOfWeek.length > 0) {
            return item.customSchedule.daysOfWeek.includes(todayDayOfWeek);
          }
          // For monthly/quarterly without specific days, don't show in daily check-in
          return false;
        }
        
        // Custom frequency - check customSchedule.daysOfWeek
        if (item.frequency === 'custom' && item.customSchedule?.daysOfWeek) {
          return item.customSchedule.daysOfWeek.includes(todayDayOfWeek);
        }
        
        // Unknown frequency - don't show
        return false;
      })
      .map(item => ({
        ...item,
        goalId: goal.id,
        goalTitle: goal.title,
        weekStreak: habitWeekStreaks[item.id] || 0,
      }));
  });

  // Track previous completion count to detect when all habits are completed
  const prevCompletedRef = useRef<number>(0);

  const handleHabitToggle = (goalId: string, habitItemId: string) => {
    hapticSelection();
    const today = new Date();
    toggleCompletion(goalId, habitItemId, today);
  };

  const handleObjectiveToggle = (objectiveId: string, currentCompleted: boolean) => {
    hapticSelection();
    updateObjective(objectiveId, { is_completed: !currentCompleted });
  };

  const getHabitChecked = (habitItemId: string): boolean => {
    const status = getCompletionStatus(habitItemId);
    return todayIndex >= 0 ? status[todayIndex] || false : false;
  };

  const completedTodayCount = habitItemsDueToday.filter(h => getHabitChecked(h.id)).length;
  const allHabitsCompleted = habitItemsDueToday.length > 0 && completedTodayCount === habitItemsDueToday.length;

  // Trigger confetti when all habits are completed
  useEffect(() => {
    if (allHabitsCompleted && prevCompletedRef.current < habitItemsDueToday.length) {
      celebrateGoalComplete();
    }
    prevCompletedRef.current = completedTodayCount;
  }, [completedTodayCount, allHabitsCompleted, habitItemsDueToday.length]);

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
  
  // Get dynamic journal prompt based on mood and energy
  const getJournalPrompt = () => {
    if (moodRating <= 2 && energyLevel <= 2) {
      return "It sounds like a tough day. What's weighing on you? Getting it out can help...";
    } else if (moodRating <= 2) {
      return "What's on your mind today? Why might you be feeling this way?";
    } else if (energyLevel <= 2) {
      return "Energy seems low - what's draining you? What would help recharge?";
    } else if (moodRating >= 4 && energyLevel >= 4) {
      return "You're feeling great! What's contributing to this positive energy?";
    } else if (moodRating >= 4) {
      return "Good mood today! What's making you feel this way?";
    }
    return "What's on your mind? Take a moment to reflect...";
  };
  
  const handleSubmit = async () => {
    hapticSuccess();
    await submitCheckIn({
      mood_rating: moodRating,
      energy_level: energyLevel,
      focus_today: focusToday || undefined,
      journal_entry: journalEntry || undefined,
    });
    onOpenChange(false);
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 6) return "text-orange-500";
    if (streak >= 4) return "text-yellow-500";
    if (streak >= 2) return "text-green-500";
    return "text-emerald-400";
  };
  
  const content = (
    <div className="space-y-5">
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
          <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-3">
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

      {/* Today's Scheduled Objectives */}
      {todaysObjectives.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Scheduled for Today ({todaysObjectives.length})
          </Label>
          <div className="space-y-2 max-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-3">
            {todaysObjectives.map((objective) => (
              <div
                key={objective.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={objective.is_completed}
                  disabled={isUpdating}
                  onCheckedChange={() => handleObjectiveToggle(objective.id, objective.is_completed)}
                  className="h-5 w-5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {objective.text}
                  </p>
                  {objective.scheduled_time && (
                    <p className="text-xs text-muted-foreground">
                      {objective.scheduled_time}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner Check-in Reminders */}
      {(hasOverdue || hasDueToday) && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Partner Check-ins
            {hasOverdue && (
              <Badge variant="destructive" className="text-xs">
                {overdueCheckIns.length} overdue
              </Badge>
            )}
          </Label>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            {overdueCheckIns.map((checkIn) => (
              <div
                key={checkIn.partner_id}
                className="flex items-center gap-3 p-2 rounded-md bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/partner/${checkIn.partner_id}`);
                }}
              >
                <Avatar className="h-8 w-8">
                  {checkIn.avatar_url && <AvatarImage src={checkIn.avatar_url} />}
                  <AvatarFallback className="text-xs bg-destructive/20 text-destructive">
                    {checkIn.partner_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{checkIn.partner_name}</p>
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.abs(checkIn.days_until_due)} day{Math.abs(checkIn.days_until_due) !== 1 ? 's' : ''} overdue
                  </p>
                </div>
                <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                  {checkIn.cadence.replace('_', ' ')}
                </Badge>
              </div>
            ))}
            {dueTodayCheckIns.map((checkIn) => (
              <div
                key={checkIn.partner_id}
                className="flex items-center gap-3 p-2 rounded-md bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/partner/${checkIn.partner_id}`);
                }}
              >
                <Avatar className="h-8 w-8">
                  {checkIn.avatar_url && <AvatarImage src={checkIn.avatar_url} />}
                  <AvatarFallback className="text-xs bg-warning/20 text-warning-foreground">
                    {checkIn.partner_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{checkIn.partner_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Due today
                  </p>
                </div>
                <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                  {checkIn.cadence.replace('_', ' ')}
                </Badge>
              </div>
            ))}
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
              <span className="text-xl">{option.emoji}</span>
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
              <span className="text-xl">{option.emoji}</span>
              <span className="text-xs text-muted-foreground mt-1">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Private Journal Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          What's on your mind?
          <span className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
            <Lock className="h-3 w-3" />
            Private
          </span>
          {todayCheckIn && journalEntry && !isEditingJournal && (
            <button
              onClick={() => setIsEditingJournal(true)}
              className="ml-auto p-1 rounded hover:bg-accent transition-colors"
              aria-label="Edit journal entry"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </Label>
        {todayCheckIn && journalEntry && !isEditingJournal ? (
          <div 
            className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap min-h-[80px] cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => setIsEditingJournal(true)}
          >
            {journalEntry}
          </div>
        ) : (
          <Textarea
            value={journalEntry}
            onChange={(e) => setJournalEntry(e.target.value)}
            placeholder={getJournalPrompt()}
            className="resize-none"
            rows={3}
            autoFocus={isEditingJournal}
          />
        )}
      </div>
      
      {/* Focus Today */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          What's your #1 focus today?
          {todayCheckIn && focusToday && !isEditingFocus && (
            <button
              onClick={() => setIsEditingFocus(true)}
              className="ml-auto p-1 rounded hover:bg-accent transition-colors"
              aria-label="Edit focus"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </Label>
        {todayCheckIn && focusToday && !isEditingFocus ? (
          <div 
            className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap min-h-[60px] cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => setIsEditingFocus(true)}
          >
            {focusToday}
          </div>
        ) : (
          <Textarea
            value={focusToday}
            onChange={(e) => setFocusToday(e.target.value)}
            placeholder="e.g., Finish the project proposal..."
            className="resize-none"
            rows={2}
            autoFocus={isEditingFocus}
          />
        )}
      </div>
    </div>
  );

  const hasExistingCheckIn = !!todayCheckIn;

  const footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        {hasExistingCheckIn ? "Close" : "Skip for now"}
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : hasExistingCheckIn ? (
          "Save Changes ✓"
        ) : (
          "Let's Go! 🚀"
        )}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <span className="text-2xl">{greeting.emoji}</span>
                {greeting.text}
              </DrawerTitle>
              <CachedDataIndicator isCached={isCached} lastSync={lastSync} />
            </div>
            <DrawerDescription>
              Take 30 seconds to set your intention for today
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto flex-1 pb-4">
            {content}
          </div>
          <DrawerFooter className="pt-2">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{greeting.emoji}</span>
              {greeting.text}
            </DialogTitle>
            <CachedDataIndicator isCached={isCached} lastSync={lastSync} />
          </div>
          <DialogDescription>
            Take 30 seconds to set your intention for today
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {content}
        </div>
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};