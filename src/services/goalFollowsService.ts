import { supabase } from '@/integrations/supabase/client';
import { GoalFollow } from '@/types/goalUpdates';

export const GoalFollowsService = {
  async getFollowedGoals(userId: string): Promise<GoalFollow[]> {
    const { data, error } = await supabase
      .from('goal_follows')
      .select('*')
      .eq('follower_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch goal details separately
    const goalIds = (data || []).map(f => f.goal_id);
    if (goalIds.length === 0) return [];

    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, user_id, status')
      .in('id', goalIds);

    const goalsMap = new Map<string, { id: string; title: string; user_id: string; status: string }>();
    goals?.forEach(g => goalsMap.set(g.id, g));

    return (data || []).map(follow => ({
      id: follow.id,
      follower_user_id: follow.follower_user_id,
      goal_id: follow.goal_id,
      created_at: follow.created_at,
      goal: goalsMap.get(follow.goal_id)
    }));
  },

  async isFollowing(userId: string, goalId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('goal_follows')
      .select('id')
      .eq('follower_user_id', userId)
      .eq('goal_id', goalId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  async followGoal(userId: string, goalId: string): Promise<void> {
    const { error } = await supabase
      .from('goal_follows')
      .insert({ follower_user_id: userId, goal_id: goalId });

    if (error) throw error;
  },

  async unfollowGoal(userId: string, goalId: string): Promise<void> {
    const { error } = await supabase
      .from('goal_follows')
      .delete()
      .eq('follower_user_id', userId)
      .eq('goal_id', goalId);

    if (error) throw error;
  },

  async toggleFollow(userId: string, goalId: string): Promise<boolean> {
    const isFollowing = await this.isFollowing(userId, goalId);
    
    if (isFollowing) {
      await this.unfollowGoal(userId, goalId);
      return false;
    } else {
      await this.followGoal(userId, goalId);
      return true;
    }
  },

  async getFollowersCount(goalId: string): Promise<number> {
    const { count, error } = await supabase
      .from('goal_follows')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goalId);

    if (error) throw error;
    return count || 0;
  },

  async getGoalFollowers(goalId: string): Promise<Array<{ user_id: string; full_name: string; avatar_url: string | null }>> {
    const { data, error } = await supabase
      .from('goal_follows')
      .select('follower_user_id')
      .eq('goal_id', goalId);

    if (error) throw error;

    const userIds = (data || []).map(d => d.follower_user_id);
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    return (profiles || []).map(p => ({
      user_id: p.id,
      full_name: p.full_name || '',
      avatar_url: p.avatar_url
    }));
  }
};
