
import { supabase } from "@/integrations/supabase/client";
import { Goal, CreateGoalData, UpdateGoalData, GoalStatusHistory } from "@/types/goals";

export class GoalsService {
  static async createGoal(data: CreateGoalData): Promise<Goal> {
    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        title: data.title,
        description: data.description || '',
        timeframe: data.timeframe,
        target_date: data.target_date || null,
        category: data.category || '',
        is_public: data.is_public ?? true,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return goal as Goal;
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
    return (goals || []) as Goal[];
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
    return goal as Goal;
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
    return goal as Goal;
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
    return (goals || []) as Goal[];
  }

  static async updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
    const { data: goal, error } = await supabase
      .from('goals')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return goal as Goal;
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
}
