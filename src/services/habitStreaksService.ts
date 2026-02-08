import { supabase } from "@/integrations/supabase/client";
import { Goal } from "@/types/goals";
import { parseGoal, parseGoals } from "@/utils/goalUtils";
import { startOfWeek, format, parseISO, isBefore, isAfter } from "date-fns";
import { authStore } from "@/stores/authStore";

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

export interface StreakCheckResult {
  previousStreak: number;
  newStreak: number;
  isMilestone: boolean;
  goalTitle: string;
}

export class HabitStreaksService {
  /**
   * Get all goals with habits for the current user
   */
  static async getGoalsWithHabits(): Promise<Goal[]> {
    const userId = authStore.requireUserId();

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Filter to only goals with habit_items
    return parseGoals(data).filter(g => g.habit_items && g.habit_items.length > 0);
  }

  /**
   * Get all weekly objectives for goals with habits
   */
  static async getHabitObjectives(goalIds: string[]): Promise<any[]> {
    if (goalIds.length === 0) return [];

    const userId = authStore.requireUserId();

    const { data, error } = await supabase
      .from('weekly_objectives')
      .select('*')
      .eq('user_id', userId)
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
   * Get stats for all goals with habits
   */
  static async getAllHabitStats(): Promise<HabitStats[]> {
    const goals = await this.getGoalsWithHabits();
    if (goals.length === 0) return [];

    // Filter out goals that haven't started yet
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    const activeGoals = goals.filter(goal => {
      // If goal has a start_date, check if it's in the future
      if (goal.start_date) {
        const goalStartDate = parseISO(goal.start_date);
        const goalStartWeek = startOfWeek(goalStartDate, { weekStartsOn: 1 });
        // Goal hasn't started yet if its start week is after current week
        if (isAfter(goalStartWeek, currentWeekStart)) {
          return false;
        }
      }
      return true;
    });

    if (activeGoals.length === 0) return [];

    const goalIds = activeGoals.map(g => g.id);
    const objectives = await this.getHabitObjectives(goalIds);

    return activeGoals.map(goal => this.calculateHabitStats(goal, objectives));
  }

  /**
   * Get future goals with habits (habits that haven't started yet)
   */
  static async getFutureHabits(): Promise<Goal[]> {
    const goals = await this.getGoalsWithHabits();
    if (goals.length === 0) return [];

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    return goals.filter(goal => {
      if (goal.start_date) {
        const goalStartDate = parseISO(goal.start_date);
        const goalStartWeek = startOfWeek(goalStartDate, { weekStartsOn: 1 });
        return isAfter(goalStartWeek, currentWeekStart);
      }
      return false;
    }).sort((a, b) => {
      // Sort by start date ascending
      const dateA = a.start_date ? parseISO(a.start_date) : new Date();
      const dateB = b.start_date ? parseISO(b.start_date) : new Date();
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Check if completing an objective will result in a streak milestone
   * Call this BEFORE marking the objective as complete
   */
  static async checkStreakMilestone(objectiveId: string): Promise<StreakCheckResult | null> {
    const user = authStore.getUser();
    if (!user) return null;

    // Get the objective
    const { data: objective, error: objError } = await supabase
      .from('weekly_objectives')
      .select('*, goals(*)')
      .eq('id', objectiveId)
      .single();

    if (objError || !objective || !objective.goal_id) return null;

    const goal = parseGoal(objective.goals);
    const hasHabits = goal?.habit_items && goal.habit_items.length > 0;
    if (!hasHabits) return null;

    // Get all objectives for this goal
    const { data: allObjectives, error: allError } = await supabase
      .from('weekly_objectives')
      .select('*')
      .eq('user_id', user.id)
      .eq('goal_id', objective.goal_id)
      .order('week_start', { ascending: false });

    if (allError || !allObjectives) return null;

    // Calculate current streak (before this completion)
    const stats = this.calculateHabitStats(goal, allObjectives);
    const previousStreak = stats.currentStreak;

    // Simulate what the streak would be if this objective is completed
    const simulatedObjectives = allObjectives.map(obj => 
      obj.id === objectiveId ? { ...obj, is_completed: true } : obj
    );
    const simulatedStats = this.calculateHabitStats(goal, simulatedObjectives);
    const newStreak = simulatedStats.currentStreak;

    // Check if hitting a milestone (4, 8, or 12)
    const milestones = [4, 8, 12];
    const isMilestone = milestones.includes(newStreak) && newStreak > previousStreak;

    return {
      previousStreak,
      newStreak,
      isMilestone,
      goalTitle: goal.title
    };
  }
}
