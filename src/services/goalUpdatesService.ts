import { supabase } from '@/integrations/supabase/client';
import { GoalUpdate, GoalUpdateCheer, GoalUpdateComment, CheerType, ObjectiveSnapshot, UpdateType, MilestoneType } from '@/types/goalUpdates';

export const GoalUpdatesService = {
  async getFeedUpdates(options: {
    feedType: 'all' | 'following';
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<GoalUpdate[]> {
    const { feedType, userId, limit = 20, offset = 0 } = options;

    let query = supabase
      .from('goal_updates')
      .select(`
        *,
        goal:goals!inner(id, title, description, status, category, target_date, user_id, visibility)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (feedType === 'following') {
      // Get updates only from goals the user follows
      const { data: follows } = await supabase
        .from('goal_follows')
        .select('goal_id')
        .eq('follower_user_id', userId);

      const followedGoalIds = follows?.map(f => f.goal_id) || [];
      if (followedGoalIds.length === 0) return [];
      
      query = query.in('goal_id', followedGoalIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const updateIds = (data || []).map(u => u.id);
    const userIds = [...new Set((data || []).map(u => u.user_id))];
    
    if (updateIds.length === 0) return [];

    // Fetch user profiles, cheers, comments in parallel
    const [profilesResult, cheersResult, commentsResult, userCheersResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
      supabase.from('goal_update_cheers').select('update_id').in('update_id', updateIds),
      supabase.from('goal_update_comments').select('update_id').in('update_id', updateIds),
      supabase.from('goal_update_cheers').select('update_id, cheer_type').in('update_id', updateIds).eq('user_id', userId)
    ]);

    const profilesMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
    profilesResult.data?.forEach(p => profilesMap.set(p.id, p));

    const cheersCount = new Map<string, number>();
    cheersResult.data?.forEach(c => {
      cheersCount.set(c.update_id, (cheersCount.get(c.update_id) || 0) + 1);
    });

    const commentsCount = new Map<string, number>();
    commentsResult.data?.forEach(c => {
      commentsCount.set(c.update_id, (commentsCount.get(c.update_id) || 0) + 1);
    });

    const userCheers = new Map<string, CheerType>();
    userCheersResult.data?.forEach(c => {
      userCheers.set(c.update_id, c.cheer_type as CheerType);
    });

    return (data || []).map(update => ({
      id: update.id,
      goal_id: update.goal_id,
      user_id: update.user_id,
      update_type: update.update_type as UpdateType,
      content: update.content,
      objectives_snapshot: (Array.isArray(update.objectives_snapshot) ? update.objectives_snapshot : []) as unknown as ObjectiveSnapshot[],
      milestone_type: update.milestone_type as MilestoneType | null,
      week_start: update.week_start,
      created_at: update.created_at,
      goal: update.goal,
      user: profilesMap.get(update.user_id) || undefined,
      cheers_count: cheersCount.get(update.id) || 0,
      comments_count: commentsCount.get(update.id) || 0,
      user_has_cheered: userCheers.has(update.id),
      user_cheer_type: userCheers.get(update.id) || null
    }));
  },

  async getGoalUpdates(goalId: string): Promise<GoalUpdate[]> {
    const { data, error } = await supabase
      .from('goal_updates')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const userIds = [...new Set((data || []).map(u => u.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
    
    const profilesMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
    profiles?.forEach(p => profilesMap.set(p.id, p));

    return (data || []).map(update => ({
      id: update.id,
      goal_id: update.goal_id,
      user_id: update.user_id,
      update_type: update.update_type as UpdateType,
      content: update.content,
      objectives_snapshot: (Array.isArray(update.objectives_snapshot) ? update.objectives_snapshot : []) as unknown as ObjectiveSnapshot[],
      milestone_type: update.milestone_type as MilestoneType | null,
      week_start: update.week_start,
      created_at: update.created_at,
      user: profilesMap.get(update.user_id) || undefined
    }));
  },

  async createUpdate(data: {
    goal_id: string;
    user_id: string;
    update_type: UpdateType;
    content?: string;
    objectives_snapshot?: ObjectiveSnapshot[];
    milestone_type?: MilestoneType;
    week_start?: string;
  }): Promise<GoalUpdate> {
    const insertData = {
      goal_id: data.goal_id,
      user_id: data.user_id,
      update_type: data.update_type,
      content: data.content || null,
      objectives_snapshot: JSON.stringify(data.objectives_snapshot || []),
      milestone_type: data.milestone_type || null,
      week_start: data.week_start || null
    };

    const { data: update, error } = await supabase
      .from('goal_updates')
      .insert(insertData as any)
      .select()
      .single();

    if (error) throw error;
    return {
      id: update.id,
      goal_id: update.goal_id,
      user_id: update.user_id,
      update_type: update.update_type as UpdateType,
      content: update.content,
      objectives_snapshot: (Array.isArray(update.objectives_snapshot) ? update.objectives_snapshot : []) as unknown as ObjectiveSnapshot[],
      milestone_type: update.milestone_type as MilestoneType | null,
      week_start: update.week_start,
      created_at: update.created_at
    };
  },

  async toggleCheer(updateId: string, userId: string, cheerType: CheerType, message?: string): Promise<boolean> {
    // Check if user already cheered
    const { data: existing } = await supabase
      .from('goal_update_cheers')
      .select('id, cheer_type')
      .eq('update_id', updateId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // If same type, remove it
      if (existing.cheer_type === cheerType) {
        await supabase.from('goal_update_cheers').delete().eq('id', existing.id);
        return false;
      }
      // If different type, update it
      await supabase
        .from('goal_update_cheers')
        .update({ cheer_type: cheerType, message: message || null })
        .eq('id', existing.id);
      return true;
    }

    // Insert new cheer
    await supabase.from('goal_update_cheers').insert({
      update_id: updateId,
      user_id: userId,
      cheer_type: cheerType,
      message: message || null
    });
    return true;
  },

  async getCheers(updateId: string): Promise<GoalUpdateCheer[]> {
    const { data, error } = await supabase
      .from('goal_update_cheers')
      .select('*')
      .eq('update_id', updateId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const userIds = [...new Set((data || []).map(c => c.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
    
    const profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    profiles?.forEach(p => profilesMap.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url }));

    return (data || []).map(cheer => ({
      id: cheer.id,
      update_id: cheer.update_id,
      user_id: cheer.user_id,
      cheer_type: cheer.cheer_type as CheerType,
      message: cheer.message,
      created_at: cheer.created_at,
      user: profilesMap.get(cheer.user_id)
    }));
  },

  async addComment(updateId: string, userId: string, message: string): Promise<GoalUpdateComment> {
    const { data, error } = await supabase
      .from('goal_update_comments')
      .insert({ update_id: updateId, user_id: userId, message })
      .select()
      .single();

    if (error) throw error;

    const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', userId).single();

    return {
      id: data.id,
      update_id: data.update_id,
      user_id: data.user_id,
      message: data.message,
      created_at: data.created_at,
      user: profile ? { id: profile.id, full_name: profile.full_name || '', avatar_url: profile.avatar_url } : undefined
    };
  },

  async getComments(updateId: string): Promise<GoalUpdateComment[]> {
    const { data, error } = await supabase
      .from('goal_update_comments')
      .select('*')
      .eq('update_id', updateId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const userIds = [...new Set((data || []).map(c => c.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
    
    const profilesMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
    profiles?.forEach(p => profilesMap.set(p.id, { id: p.id, full_name: p.full_name || '', avatar_url: p.avatar_url }));

    return (data || []).map(comment => ({
      id: comment.id,
      update_id: comment.update_id,
      user_id: comment.user_id,
      message: comment.message,
      created_at: comment.created_at,
      user: profilesMap.get(comment.user_id)
    }));
  },

  // Calculate goal progress percentage based on objectives
  calculateGoalProgress(objectives: ObjectiveSnapshot[]): number {
    if (objectives.length === 0) return 0;
    const completed = objectives.filter(o => o.is_completed).length;
    return Math.round((completed / objectives.length) * 100);
  }
};
