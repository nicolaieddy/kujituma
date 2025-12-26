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
      // Delete the completion
      const { error: deleteError } = await supabase
        .from("habit_completions")
        .delete()
        .eq("id", existing.id);

      if (deleteError) throw deleteError;
      return false;
    } else {
      // Create the completion
      const { error: insertError } = await supabase
        .from("habit_completions")
        .insert({
          user_id: user.user.id,
          goal_id: goalId,
          habit_item_id: habitItemId,
          completion_date: dateStr,
        });

      if (insertError) throw insertError;
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
}
