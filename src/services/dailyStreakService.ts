import { supabase } from "@/integrations/supabase/client";
import { HabitCompletion, HabitItem, Goal } from "@/types/goals";
import { 
  format, 
  parseISO, 
  startOfDay, 
  subDays, 
  isAfter, 
  isBefore, 
  getDay,
  startOfWeek,
  differenceInDays
} from "date-fns";
import { parseGoals } from "@/utils/goalUtils";

export interface DailyStreakStats {
  habitItemId: string;
  habitText: string;
  goalId: string;
  goalTitle: string;
  currentStreak: number;
  longestStreak: number;
  freezesUsedThisWeek: number;
  freezesRemaining: number;
  lastCompletedDate: string | null;
  streakStatus: 'active' | 'at_risk' | 'broken';
}

const FREEZES_PER_WEEK = 1;

/**
 * Check if a date is a scheduled day for the habit based on its frequency
 */
function isScheduledDay(date: Date, habitItem: HabitItem, goalStartDate: string | null): boolean {
  // If goal has a start date and the date is before it, not scheduled
  if (goalStartDate) {
    const start = parseISO(goalStartDate);
    if (isBefore(date, startOfDay(start))) {
      return false;
    }
  }

  const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, ...
  
  switch (habitItem.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
    case 'weekly':
      // For weekly habits, only the first day of each week is scheduled
      // Or if custom schedule has specific days
      if (habitItem.customSchedule?.daysOfWeek) {
        return habitItem.customSchedule.daysOfWeek.includes(dayOfWeek);
      }
      return dayOfWeek === 1; // Default to Monday
    case 'custom':
      if (habitItem.customSchedule?.daysOfWeek) {
        return habitItem.customSchedule.daysOfWeek.includes(dayOfWeek);
      }
      return true;
    default:
      // For less frequent habits (monthly, quarterly), treat as weekly
      return dayOfWeek === 1;
  }
}

/**
 * Calculate daily streak with freeze allowance
 * Streak breaks if you miss more than FREEZES_PER_WEEK scheduled days in any 7-day period
 */
function calculateDailyStreak(
  completions: HabitCompletion[],
  habitItem: HabitItem,
  goalStartDate: string | null
): { currentStreak: number; longestStreak: number; freezesUsedThisWeek: number; streakStatus: 'active' | 'at_risk' | 'broken' } {
  const today = startOfDay(new Date());
  const completionDates = new Set(completions.map(c => c.completion_date));
  
  // Find the earliest relevant date (goal start or first completion)
  let earliestDate = today;
  if (goalStartDate) {
    const start = startOfDay(parseISO(goalStartDate));
    if (isBefore(start, earliestDate)) {
      earliestDate = start;
    }
  }
  if (completions.length > 0) {
    const dates = completions.map(c => parseISO(c.completion_date));
    const minDate = dates.reduce((min, d) => isBefore(d, min) ? d : min, dates[0]);
    if (isBefore(minDate, earliestDate)) {
      earliestDate = minDate;
    }
  }
  
  // Calculate current streak going backwards from today
  let currentStreak = 0;
  let freezesUsedInWindow: Map<string, number> = new Map(); // weekStart -> freezes used
  let streakBroken = false;
  
  // Track freezes used in current week for display
  const currentWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  for (let dayOffset = 0; dayOffset <= differenceInDays(today, earliestDate); dayOffset++) {
    const checkDate = subDays(today, dayOffset);
    const checkDateStr = format(checkDate, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(checkDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    if (!isScheduledDay(checkDate, habitItem, goalStartDate)) {
      continue; // Not a scheduled day, skip
    }
    
    // Today is special - if not completed yet, don't count as miss
    if (dayOffset === 0) {
      if (completionDates.has(checkDateStr)) {
        currentStreak++;
      }
      // If today isn't done yet, that's okay - just don't add to streak
      continue;
    }
    
    // Past scheduled day
    if (completionDates.has(checkDateStr)) {
      currentStreak++;
    } else {
      // Missed a scheduled day - try to use a freeze
      const freezesUsed = freezesUsedInWindow.get(weekStart) || 0;
      if (freezesUsed < FREEZES_PER_WEEK) {
        freezesUsedInWindow.set(weekStart, freezesUsed + 1);
        // Freeze used, streak continues
      } else {
        // No freezes left for this week - streak broken
        streakBroken = true;
        break;
      }
    }
  }
  
  // Calculate longest streak (looking at all history)
  let longestStreak = 0;
  let tempStreak = 0;
  let tempFreezes: Map<string, number> = new Map();
  
  const sortedDates: Date[] = [];
  for (let d = earliestDate; !isAfter(d, today); d = subDays(d, -1)) {
    sortedDates.push(d);
  }
  
  for (const checkDate of sortedDates) {
    const checkDateStr = format(checkDate, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(checkDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    if (!isScheduledDay(checkDate, habitItem, goalStartDate)) {
      continue;
    }
    
    if (completionDates.has(checkDateStr)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      const freezesUsed = tempFreezes.get(weekStart) || 0;
      if (freezesUsed < FREEZES_PER_WEEK) {
        tempFreezes.set(weekStart, freezesUsed + 1);
        // Freeze used, continue
      } else {
        // Streak broken, reset
        tempStreak = 0;
        tempFreezes.clear();
      }
    }
  }
  
  // Determine streak status
  const freezesUsedThisWeek = freezesUsedInWindow.get(currentWeekStart) || 0;
  let streakStatus: 'active' | 'at_risk' | 'broken' = 'active';
  
  if (streakBroken || currentStreak === 0) {
    streakStatus = 'broken';
  } else if (freezesUsedThisWeek >= FREEZES_PER_WEEK) {
    streakStatus = 'at_risk'; // No freezes left this week
  }
  
  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    freezesUsedThisWeek,
    streakStatus
  };
}

export class DailyStreakService {
  /**
   * Get all daily streak stats for the current user's habits
   */
  static async getAllHabitStreaks(): Promise<DailyStreakStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get all goals with habit_items
    const { data: goalsData, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .not('habit_items', 'is', null);

    if (goalsError) throw goalsError;
    
    const goals = parseGoals(goalsData).filter(g => g.habit_items && g.habit_items.length > 0);
    
    if (goals.length === 0) return [];

    // Get all habit completions
    const { data: completionsData, error: completionsError } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', user.id)
      .order('completion_date', { ascending: false });

    if (completionsError) throw completionsError;
    
    const completions = (completionsData || []) as HabitCompletion[];
    
    // Calculate streaks for each habit item
    const stats: DailyStreakStats[] = [];
    
    for (const goal of goals) {
      if (!goal.habit_items) continue;
      
      for (const habitItem of goal.habit_items) {
        const habitCompletions = completions.filter(c => c.habit_item_id === habitItem.id);
        const streakData = calculateDailyStreak(habitCompletions, habitItem, goal.start_date);
        
        const lastCompleted = habitCompletions.length > 0 
          ? habitCompletions[0].completion_date 
          : null;
        
        stats.push({
          habitItemId: habitItem.id,
          habitText: habitItem.text,
          goalId: goal.id,
          goalTitle: goal.title,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          freezesUsedThisWeek: streakData.freezesUsedThisWeek,
          freezesRemaining: FREEZES_PER_WEEK - streakData.freezesUsedThisWeek,
          lastCompletedDate: lastCompleted,
          streakStatus: streakData.streakStatus
        });
      }
    }
    
    return stats;
  }

  /**
   * Get streak stats for a specific habit item
   */
  static async getHabitStreak(
    habitItemId: string, 
    habitItem: HabitItem, 
    goalStartDate: string | null
  ): Promise<{ currentStreak: number; longestStreak: number; freezesUsedThisWeek: number; freezesRemaining: number; streakStatus: 'active' | 'at_risk' | 'broken' }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('habit_item_id', habitItemId)
      .order('completion_date', { ascending: false });

    if (error) throw error;
    
    const completions = (data || []) as HabitCompletion[];
    const streakData = calculateDailyStreak(completions, habitItem, goalStartDate);
    
    return {
      ...streakData,
      freezesRemaining: FREEZES_PER_WEEK - streakData.freezesUsedThisWeek
    };
  }
}
