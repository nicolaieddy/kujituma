import { supabase } from '@/integrations/supabase/client';
import { GoalUpdate, GoalUpdateCheer, GoalUpdateComment, CheerType, ObjectiveSnapshot, UpdateType, MilestoneType } from '@/types/goalUpdates';

interface WeeklyObjective {
  id: string;
  text: string;
  is_completed: boolean;
  goal_id: string | null;
}

interface GoalProgressSummary {
  goal_id: string;
  goal_title: string;
  objectives: ObjectiveSnapshot[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
}

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
  },

  // Determine milestone type based on completion percentage
  determineMilestone(currentPercent: number, previousPercent: number): MilestoneType | null {
    if (currentPercent >= 100 && previousPercent < 100) return 'completed';
    if (currentPercent >= 75 && previousPercent < 75) return '75_percent';
    if (currentPercent >= 50 && previousPercent < 50) return '50_percent';
    if (currentPercent >= 25 && previousPercent < 25) return '25_percent';
    return null;
  },

  // Create goal updates from weekly objectives when sharing a week
  async createGoalUpdatesFromWeeklyShare(params: {
    userId: string;
    weekStart: string;
    objectives: WeeklyObjective[];
    weeklyReflection?: string;
  }): Promise<GoalUpdate[]> {
    const { userId, weekStart, objectives, weeklyReflection } = params;
    
    // Group objectives by goal
    const goalGroups = new Map<string, { objectives: WeeklyObjective[]; goalId: string }>();
    
    for (const obj of objectives) {
      if (obj.goal_id) {
        const existing = goalGroups.get(obj.goal_id) || { objectives: [], goalId: obj.goal_id };
        existing.objectives.push(obj);
        goalGroups.set(obj.goal_id, existing);
      }
    }

    if (goalGroups.size === 0) {
      console.log('[GoalUpdatesService] No objectives linked to goals, skipping goal updates');
      return [];
    }

    // Fetch goal titles
    const goalIds = Array.from(goalGroups.keys());
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, status')
      .in('id', goalIds);

    const goalTitles = new Map<string, string>();
    goals?.forEach(g => goalTitles.set(g.id, g.title));

    // Get previous updates for each goal to calculate milestone progression
    const { data: previousUpdates } = await supabase
      .from('goal_updates')
      .select('goal_id, objectives_snapshot')
      .in('goal_id', goalIds)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Calculate previous completion percentages
    const previousProgress = new Map<string, number>();
    previousUpdates?.forEach(update => {
      if (!previousProgress.has(update.goal_id)) {
        const snapshots = (Array.isArray(update.objectives_snapshot) ? update.objectives_snapshot : []) as unknown as ObjectiveSnapshot[];
        const percent = this.calculateGoalProgress(snapshots);
        previousProgress.set(update.goal_id, percent);
      }
    });

    // Get ALL objectives for each goal to calculate true progress
    const { data: allGoalObjectives } = await supabase
      .from('weekly_objectives')
      .select('id, text, is_completed, goal_id')
      .in('goal_id', goalIds)
      .eq('user_id', userId);

    // Calculate total goal progress (all weeks, not just this week)
    const totalGoalProgress = new Map<string, { completed: number; total: number }>();
    allGoalObjectives?.forEach(obj => {
      if (obj.goal_id) {
        const current = totalGoalProgress.get(obj.goal_id) || { completed: 0, total: 0 };
        current.total++;
        if (obj.is_completed) current.completed++;
        totalGoalProgress.set(obj.goal_id, current);
      }
    });

    // Create updates for each goal with progress this week
    const createdUpdates: GoalUpdate[] = [];

    for (const [goalId, group] of goalGroups) {
      const thisWeekObjectives: ObjectiveSnapshot[] = group.objectives.map(o => ({
        id: o.id,
        text: o.text,
        is_completed: o.is_completed
      }));

      const completedThisWeek = thisWeekObjectives.filter(o => o.is_completed).length;
      const totalThisWeek = thisWeekObjectives.length;

      // Calculate overall goal progress
      const overallProgress = totalGoalProgress.get(goalId) || { completed: 0, total: 0 };
      const currentPercent = overallProgress.total > 0 
        ? Math.round((overallProgress.completed / overallProgress.total) * 100) 
        : 0;
      const previousPercent = previousProgress.get(goalId) || 0;

      // Determine milestone
      const milestone = this.determineMilestone(currentPercent, previousPercent);

      // Determine update type
      let updateType: UpdateType = 'weekly_progress';
      if (milestone === 'completed') {
        updateType = 'completed';
      } else if (milestone) {
        updateType = 'milestone';
      }

      // Create content summary
      let content = `Completed ${completedThisWeek}/${totalThisWeek} objectives this week.`;
      if (milestone) {
        const goalTitle = goalTitles.get(goalId) || 'this goal';
        if (milestone === 'completed') {
          content = `🎉 Completed "${goalTitle}"! All objectives done.`;
        } else {
          content = `Hit ${milestone.replace('_', ' ')} milestone on "${goalTitle}"!`;
        }
      }

      try {
        const update = await this.createUpdate({
          goal_id: goalId,
          user_id: userId,
          update_type: updateType,
          content,
          objectives_snapshot: thisWeekObjectives,
          milestone_type: milestone || undefined,
          week_start: weekStart
        });
        createdUpdates.push(update);
        console.log(`[GoalUpdatesService] Created ${updateType} update for goal ${goalId}`, { milestone });
      } catch (err) {
        console.error(`[GoalUpdatesService] Failed to create update for goal ${goalId}:`, err);
      }
    }

    return createdUpdates;
  }
};
