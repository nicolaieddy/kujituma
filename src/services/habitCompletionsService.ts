import { supabase } from "@/integrations/supabase/client";
import { HabitCompletion } from "@/types/goals";
import { startOfWeek, endOfWeek, format, eachDayOfInterval, parseISO } from "date-fns";

export class HabitCompletionsService {
  /**
   * Get all habit completions for a user within a date range
   */
  static async getCompletions(
    startDate: Date,
    endDate: Date
  ): Promise<HabitCompletion[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.user.id)
      .gte("completion_date", format(startDate, "yyyy-MM-dd"))
      .lte("completion_date", format(endDate, "yyyy-MM-dd"))
      .order("completion_date", { ascending: true });

    if (error) throw error;
    return (data || []) as HabitCompletion[];
  }

  /**
   * Get completions for the current week
   */
  static async getWeekCompletions(weekStart: Date): Promise<HabitCompletion[]> {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return this.getCompletions(weekStart, weekEnd);
  }

  /**
   * Toggle a habit completion for a specific day
   * Returns true if completed, false if uncompleted
   */
  static async toggleCompletion(
    goalId: string,
    habitItemId: string,
    date: Date
  ): Promise<boolean> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("User not authenticated");

    const dateStr = format(date, "yyyy-MM-dd");

    // Check if completion exists
    const { data: existing, error: checkError } = await supabase
      .from("habit_completions")
      .select("id")
      .eq("user_id", user.user.id)
      .eq("goal_id", goalId)
      .eq("habit_item_id", habitItemId)
      .eq("completion_date", dateStr)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Delete the completion - use a more robust approach
      const { error: deleteError } = await supabase
        .from("habit_completions")
        .delete()
        .eq("user_id", user.user.id)
        .eq("goal_id", goalId)
        .eq("habit_item_id", habitItemId)
        .eq("completion_date", dateStr);

      if (deleteError) {
        // If delete fails, it might already be deleted - verify
        const { data: stillExists } = await supabase
          .from("habit_completions")
          .select("id")
          .eq("user_id", user.user.id)
          .eq("goal_id", goalId)
          .eq("habit_item_id", habitItemId)
          .eq("completion_date", dateStr)
          .maybeSingle();
        
        // If it doesn't exist anymore, treat as successful delete
        if (!stillExists) {
          return false;
        }
        throw deleteError;
      }
      return false;
    } else {
      // Create the completion - handle unique constraint violation
      const { error: insertError } = await supabase
        .from("habit_completions")
        .insert({
          user_id: user.user.id,
          goal_id: goalId,
          habit_item_id: habitItemId,
          completion_date: dateStr,
        });

      if (insertError) {
        // If insert fails due to unique constraint, it already exists - that's fine
        if (insertError.code === '23505') {
          return true; // Already completed
        }
        throw insertError;
      }
      return true;
    }
  }

  /**
   * Get completion status for a habit for each day of a week
   * Returns an object mapping day index (0-6, Mon-Sun) to completion status
   */
  static getWeeklyCompletionStatus(
    completions: HabitCompletion[],
    habitItemId: string,
    weekStart: Date
  ): Record<number, boolean> {
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    });

    const status: Record<number, boolean> = {};
    weekDays.forEach((day, index) => {
      const dayStr = format(day, "yyyy-MM-dd");
      status[index] = completions.some(
        (c) => c.habit_item_id === habitItemId && c.completion_date === dayStr
      );
    });

    return status;
  }

  /**
   * Get the dates for a week based on the week start
   */
  static getWeekDates(weekStart: Date): Date[] {
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    });
  }

  /**
   * Get all completions for a specific habit item
   */
  static async getHabitItemCompletions(
    habitItemId: string
  ): Promise<HabitCompletion[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.user.id)
      .eq("habit_item_id", habitItemId)
      .order("completion_date", { ascending: false });

    if (error) throw error;
    return (data || []) as HabitCompletion[];
  }

  /**
   * Calculate streak for a habit item based on completions
   * Returns current streak and longest streak
   */
  static calculateHabitStreak(
    completions: HabitCompletion[],
    frequency: string
  ): { current: number; longest: number } {
    if (completions.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Sort by date descending
    const sortedDates = [...new Set(completions.map(c => c.completion_date))]
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) {
      return { current: 0, longest: 0 };
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const prevDate = i > 0 ? sortedDates[i - 1] : null;

      if (i === 0) {
        // Check if streak is current (today or yesterday)
        if (date === today || date === yesterday) {
          tempStreak = 1;
          currentStreak = 1;
        } else {
          tempStreak = 1;
          currentStreak = 0; // Streak is broken
        }
      } else if (prevDate) {
        const prevDateObj = parseISO(prevDate);
        const currDateObj = parseISO(date);
        const dayDiff = Math.round(
          (prevDateObj.getTime() - currDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );

        // For daily habits, consecutive means 1 day apart
        // For weekly habits, we'd use 7 days, but for simplicity we use 1
        if (dayDiff === 1) {
          tempStreak++;
          if (currentStreak > 0) {
            currentStreak = tempStreak;
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Calculate completion rate for a habit over the last N days
   */
  static calculateCompletionRate(
    completions: HabitCompletion[],
    frequency: string,
    days: number = 28 // 4 weeks
  ): number {
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    // Filter completions within the date range
    const recentCompletions = completions.filter(
      c => c.completion_date >= startDateStr && c.completion_date <= todayStr
    );

    // Calculate expected completions based on frequency
    let expectedCompletions = 0;
    switch (frequency) {
      case 'daily':
        expectedCompletions = days;
        break;
      case 'weekdays':
        // Roughly 5/7 of the days
        expectedCompletions = Math.round(days * (5 / 7));
        break;
      case 'weekly':
        expectedCompletions = Math.ceil(days / 7);
        break;
      case 'biweekly':
        expectedCompletions = Math.ceil(days / 14);
        break;
      case 'monthly':
      case 'monthly_last_week':
        expectedCompletions = Math.ceil(days / 30);
        break;
      case 'quarterly':
        expectedCompletions = Math.ceil(days / 90);
        break;
      default:
        expectedCompletions = days;
    }

    if (expectedCompletions === 0) return 0;

    // Count unique completion dates
    const uniqueDates = new Set(recentCompletions.map(c => c.completion_date));
    const actualCompletions = uniqueDates.size;

    return Math.min(100, Math.round((actualCompletions / expectedCompletions) * 100));
  }
}
