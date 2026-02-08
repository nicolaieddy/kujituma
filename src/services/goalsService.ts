import { supabase } from "@/integrations/supabase/client";
import { Goal, CreateGoalData, UpdateGoalData, GoalStatusHistory } from "@/types/goals";
import { parseGoal, parseGoals } from "@/utils/goalUtils";
import { authStore } from "@/stores/authStore";

export class GoalsService {
  static async createGoal(data: CreateGoalData): Promise<Goal> {
    const userId = authStore.requireUserId();
    
    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        title: data.title,
        description: data.description || '',
        timeframe: data.timeframe,
        start_date: data.start_date || null,
        target_date: data.target_date || null,
        category: data.category || '',
        visibility: data.visibility ?? 'public',
        habit_items: data.habit_items ? JSON.parse(JSON.stringify(data.habit_items)) : [],
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return parseGoal(goal);
  }

  static async getGoals(): Promise<Goal[]> {
    const user = authStore.getUser();
    if (!user) {
      console.warn('GoalsService.getGoals: No user found, returning empty array');
      return [];
    }

    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GoalsService.getGoals fetch error:', error);
      throw error;
    }
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
      .eq('visibility', 'public')
      .neq('status', 'deleted')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return parseGoals(goals);
  }

  static async getVisibleGoals(userId: string, isFriend: boolean): Promise<Goal[]> {
    const visibilities = isFriend ? ['public', 'friends'] : ['public'];
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .in('visibility', visibilities)
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
    // Convert to object format for batch RPC: { "goal-id-1": 0, "goal-id-2": 1, ... }
    const goalOrders: Record<string, number> = {};
    reorderedGoals.forEach(({ id, order_index }) => {
      goalOrders[id] = order_index;
    });

    const { error } = await supabase.rpc('reorder_goals', {
      p_goal_orders: goalOrders
    });

    if (error) throw error;
  }
}
