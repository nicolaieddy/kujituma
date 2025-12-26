import { supabase } from "@/integrations/supabase/client";
import { Goal } from "@/types/goals";
import { startOfWeek, subWeeks, format, parseISO, isBefore, isAfter } from "date-fns";

export interface HabitStats {
  goal: Goal;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalWeeks: number;
  completedWeeks: number;
  lastCompletedWeek: string | null;
  weeklyHistory: WeeklyCompletion[];
}

export interface WeeklyCompletion {
  weekStart: string;
  isCompleted: boolean;
  objectiveId?: string;
}

export class HabitStreaksService {
  /**
   * Get all recurring goals (habits) for the current user
   */
  static async getRecurringGoals(): Promise<Goal[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Goal[];
  }

  /**
   * Get all weekly objectives for recurring goals
   */
  static async getRecurringObjectives(goalIds: string[]): Promise<any[]> {
    if (goalIds.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('weekly_objectives')
      .select('*')
      .eq('user_id', user.id)
      .in('goal_id', goalIds)
      .order('week_start', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate habit stats for a single goal
   */
  static calculateHabitStats(goal: Goal, objectives: any[]): HabitStats {
    const goalObjectives = objectives
      .filter(obj => obj.goal_id === goal.id)
      .sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime());

    // Build weekly history
    const weeklyHistory: WeeklyCompletion[] = goalObjectives.map(obj => ({
      weekStart: obj.week_start,
      isCompleted: obj.is_completed,
      objectiveId: obj.id
    }));

    // Calculate completion stats
    const totalWeeks = goalObjectives.length;
    const completedWeeks = goalObjectives.filter(obj => obj.is_completed).length;
    const completionRate = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

    // Calculate current streak (consecutive completed weeks from most recent)
    let currentStreak = 0;
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    // Sort objectives by week_start descending
    const sortedObjectives = [...goalObjectives].sort(
      (a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
    );

    for (const obj of sortedObjectives) {
      const objWeekStart = parseISO(obj.week_start);
      
      // Skip future weeks
      if (isAfter(objWeekStart, currentWeekStart)) continue;
      
      if (obj.is_completed) {
        currentStreak++;
      } else {
        // If current week is not completed yet, continue checking
        if (format(objWeekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd')) {
          continue;
        }
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort ascending for longest streak calculation
    const ascendingObjectives = [...goalObjectives].sort(
      (a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
    );

    for (const obj of ascendingObjectives) {
      if (obj.is_completed) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Find last completed week
    const lastCompleted = sortedObjectives.find(obj => obj.is_completed);
    const lastCompletedWeek = lastCompleted ? lastCompleted.week_start : null;

    return {
      goal,
      currentStreak,
      longestStreak,
      completionRate,
      totalWeeks,
      completedWeeks,
      lastCompletedWeek,
      weeklyHistory: weeklyHistory.slice(0, 12) // Last 12 weeks for display
    };
  }

  /**
   * Get stats for all recurring goals
   */
  static async getAllHabitStats(): Promise<HabitStats[]> {
    const goals = await this.getRecurringGoals();
    if (goals.length === 0) return [];

    const goalIds = goals.map(g => g.id);
    const objectives = await this.getRecurringObjectives(goalIds);

    return goals.map(goal => this.calculateHabitStats(goal, objectives));
  }
}
