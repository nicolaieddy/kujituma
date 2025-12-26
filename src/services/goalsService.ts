
import { supabase } from "@/integrations/supabase/client";
import { Goal, CreateGoalData, UpdateGoalData, GoalStatusHistory } from "@/types/goals";
import { parseGoal, parseGoals } from "@/utils/goalUtils";

export class GoalsService {
  static async createGoal(data: CreateGoalData): Promise<Goal> {
    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        title: data.title,
        description: data.description || '',
        timeframe: data.timeframe,
        start_date: data.start_date || null,
        target_date: data.target_date || null,
        category: data.category || '',
        is_public: data.is_public ?? true,
        is_recurring: data.is_recurring ?? false,
        recurrence_frequency: data.is_recurring ? (data.recurrence_frequency || 'weekly') : null,
        recurring_objective_text: data.is_recurring ? (data.recurring_objective_text || null) : null,
        habit_items: data.habit_items ? JSON.parse(JSON.stringify(data.habit_items)) : [],
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return parseGoal(goal);
  }

  static async getGoals(): Promise<Goal[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.user.id)
      .neq('status', 'deleted')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return parseGoals(goals);
  }

  static async deprioritizeGoal(id: string): Promise<Goal> {
    const { data: goal, error } = await supabase
      .from('goals')
      .update({ 
        status: 'deprioritized',
        deprioritized_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseGoal(goal);
  }

  static async reprioritizeGoal(id: string): Promise<Goal> {
    const { data: goal, error } = await supabase
      .from('goals')
      .update({ 
        status: 'not_started',
        deprioritized_at: null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseGoal(goal);
  }

  static async getPublicGoals(userId: string): Promise<Goal[]> {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .neq('status', 'deleted')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return parseGoals(goals);
  }

  static async updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
    // Convert habit_items to JSON-compatible format for Supabase
    const updateData: any = { ...data };
    if (data.habit_items) {
      updateData.habit_items = JSON.parse(JSON.stringify(data.habit_items));
    }
    
    const { data: goal, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseGoal(goal);
  }

  static async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) throw error;
  }

  static async getGoalHistory(goalId: string): Promise<GoalStatusHistory[]> {
    const { data: history, error } = await supabase
      .from('goal_status_history')
      .select('*')
      .eq('goal_id', goalId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return (history || []) as GoalStatusHistory[];
  }

  static async updateGoalOrder(goalId: string, newOrderIndex: number): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .update({ order_index: newOrderIndex })
      .eq('id', goalId);

    if (error) throw error;
  }

  static async reorderGoals(reorderedGoals: { id: string; order_index: number }[]): Promise<void> {
    // Update all goals with their new order indices
    const promises = reorderedGoals.map(({ id, order_index }) =>
      supabase
        .from('goals')
        .update({ order_index })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    const error = results.find(r => r.error)?.error;
    if (error) throw error;
  }
}
