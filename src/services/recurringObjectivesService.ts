import { supabase } from "@/integrations/supabase/client";
import { Goal } from "@/types/goals";
import { startOfWeek, addWeeks, addMonths, isBefore, isAfter, parseISO, format } from "date-fns";

export class RecurringObjectivesService {
  /**
   * Get all active recurring goals for the current user
   */
  static async getRecurringGoals(): Promise<Goal[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .in('status', ['not_started', 'in_progress'])
      .neq('status', 'deleted');

    if (error) throw error;
    return (data || []) as Goal[];
  }

  /**
   * Check if a recurring objective already exists for a goal in a specific week
   */
  static async objectiveExistsForWeek(goalId: string, weekStart: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('weekly_objectives')
      .select('id')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .eq('week_start', weekStart)
      .limit(1);

    if (error) {
      console.error('Error checking existing objective:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Create a recurring objective for a specific week if it doesn't exist
   */
  static async createRecurringObjectiveIfNeeded(
    goal: Goal,
    weekStart: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if goal is still valid for this week
    if (!this.isGoalActiveForWeek(goal, weekStart)) {
      return false;
    }

    // Check if objective already exists
    const exists = await this.objectiveExistsForWeek(goal.id, weekStart);
    if (exists) {
      return false;
    }

    // Check if this week matches the recurrence pattern
    if (!this.shouldCreateForWeek(goal, weekStart)) {
      return false;
    }

    // Create the objective
    const objectiveText = goal.recurring_objective_text || goal.title;
    
    const { error } = await supabase
      .from('weekly_objectives')
      .insert({
        user_id: user.id,
        goal_id: goal.id,
        text: objectiveText,
        week_start: weekStart,
        is_completed: false
      });

    if (error) {
      console.error('Error creating recurring objective:', error);
      return false;
    }

    console.log(`Created recurring objective for goal "${goal.title}" for week ${weekStart}`);
    return true;
  }

  /**
   * Check if a goal is still active for a given week
   */
  static isGoalActiveForWeek(goal: Goal, weekStart: string): boolean {
    const weekDate = parseISO(weekStart);
    const goalCreatedDate = parseISO(goal.created_at);
    
    // Don't create objectives for weeks before the goal was created
    const goalCreatedWeekStart = startOfWeek(goalCreatedDate, { weekStartsOn: 1 });
    if (isBefore(weekDate, goalCreatedWeekStart)) {
      return false;
    }

    // Check if goal has a target date and we're past it
    if (goal.target_date) {
      const targetDate = parseISO(goal.target_date);
      if (isAfter(weekDate, targetDate)) {
        return false;
      }
    }

    // Goal is completed or deprioritized
    if (goal.status === 'completed' || goal.status === 'deprioritized' || goal.status === 'deleted') {
      return false;
    }

    return true;
  }

  /**
   * Check if an objective should be created for this week based on recurrence frequency
   */
  static shouldCreateForWeek(goal: Goal, weekStart: string): boolean {
    const frequency = goal.recurrence_frequency || 'weekly';
    const goalCreatedDate = parseISO(goal.created_at);
    const weekDate = parseISO(weekStart);
    const goalCreatedWeekStart = startOfWeek(goalCreatedDate, { weekStartsOn: 1 });

    if (frequency === 'weekly') {
      // Always create for weekly
      return true;
    }

    if (frequency === 'biweekly') {
      // Calculate weeks since goal creation
      let checkDate = goalCreatedWeekStart;
      while (isBefore(checkDate, weekDate)) {
        checkDate = addWeeks(checkDate, 2);
      }
      // Check if weekStart matches a biweekly interval
      return format(checkDate, 'yyyy-MM-dd') === weekStart;
    }

    if (frequency === 'monthly') {
      // Check if this is the first week of the month or matches monthly pattern
      let checkDate = goalCreatedWeekStart;
      while (isBefore(checkDate, weekDate)) {
        checkDate = addMonths(checkDate, 1);
        // Adjust to the start of the week
        checkDate = startOfWeek(checkDate, { weekStartsOn: 1 });
      }
      return format(checkDate, 'yyyy-MM-dd') === weekStart;
    }

    return true;
  }

  /**
   * Generate any missing recurring objectives for a given week
   * This is the main function called when loading weekly objectives
   */
  static async generateRecurringObjectivesForWeek(weekStart: string): Promise<number> {
    const recurringGoals = await this.getRecurringGoals();
    let created = 0;

    for (const goal of recurringGoals) {
      const wasCreated = await this.createRecurringObjectiveIfNeeded(goal, weekStart);
      if (wasCreated) created++;
    }

    return created;
  }
}
