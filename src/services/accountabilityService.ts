import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, format, addDays } from 'date-fns';
import { authStore } from '@/stores/authStore';

export type CheckInCadence = 'none' | 'daily' | 'twice_weekly' | 'weekly' | 'biweekly';

export interface AccountabilityPartner {
  partner_id: string;
  full_name: string;
  avatar_url: string | null;
  partnership_id: string;
  status: string;
  last_check_in_at: string | null;
  my_last_check_in_at: string | null; // Current user's last check-in with this partner
  can_view_partner_goals: boolean;
  partner_can_view_my_goals: boolean;
  my_check_in_cadence: CheckInCadence;
  partnership_created_at: string | null;
}

export interface AccountabilityPartnerRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  sender_can_view_receiver_goals: boolean;
  receiver_can_view_sender_goals: boolean;
  sender_profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  receiver_profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

export interface PartnerGoal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  timeframe: string;
  category: string | null;
  created_at: string;
  target_date: string | null;
  is_recurring: boolean;
}

export interface PartnerWeeklyObjective {
  id: string;
  text: string;
  is_completed: boolean;
  week_start: string;
  goal_id: string | null;
  scheduled_day: string | null;
  scheduled_time: string | null;
  goal?: {
    title: string;
  } | null;
}

export interface CheckInRecord {
  id: string;
  partnership_id: string;
  initiated_by: string;
  week_start: string;
  message: string | null;
  created_at: string;
  reply_to_id: string | null;
  initiator_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  reactions?: CheckInReaction[];
  replies?: CheckInRecord[]; // Nested replies
}

export interface CheckInReaction {
  id: string;
  check_in_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  reactor_name?: string;
}

class AccountabilityService {
  async getPartners(): Promise<AccountabilityPartner[]> {
    const user = authStore.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('get_accountability_partners');
    
    if (error) {
      console.error('Error fetching partners:', error);
      throw error;
    }
    
    if (!data || data.length === 0) return [];

    // Fetch cadence info and created_at from partnerships
    const partnershipIds = data.map((p: any) => p.partnership_id);
    const { data: partnerships } = await supabase
      .from('accountability_partnerships')
      .select('id, user1_id, user2_id, my_check_in_cadence_user1, my_check_in_cadence_user2, created_at')
      .in('id', partnershipIds);

    // Fetch the current user's last check-in for each partnership
    const { data: myCheckIns } = await supabase
      .from('accountability_check_ins')
      .select('partnership_id, created_at')
      .eq('initiated_by', user.id)
      .in('partnership_id', partnershipIds)
      .order('created_at', { ascending: false });

    // Build a map of partnership_id -> my last check-in timestamp
    const myLastCheckInMap = new Map<string, string>();
    if (myCheckIns) {
      for (const checkIn of myCheckIns) {
        // Only store the first (most recent) check-in for each partnership
        if (!myLastCheckInMap.has(checkIn.partnership_id)) {
          myLastCheckInMap.set(checkIn.partnership_id, checkIn.created_at);
        }
      }
    }

    const partnershipMap = new Map(partnerships?.map(p => [p.id, p]) || []);

    return data.map((partner: any) => {
      const partnership = partnershipMap.get(partner.partnership_id);
      let myCheckInCadence: CheckInCadence = 'weekly';
      let partnershipCreatedAt: string | null = null;
      
      if (partnership) {
        partnershipCreatedAt = partnership.created_at;
        // Determine which user we are and get our cadence
        if (partnership.user1_id === user.id) {
          myCheckInCadence = (partnership.my_check_in_cadence_user1 as CheckInCadence) || 'weekly';
        } else {
          myCheckInCadence = (partnership.my_check_in_cadence_user2 as CheckInCadence) || 'weekly';
        }
      }

      return {
        ...partner,
        my_check_in_cadence: myCheckInCadence,
        partnership_created_at: partnershipCreatedAt,
        // Override last_check_in_at with the user's own last check-in
        my_last_check_in_at: myLastCheckInMap.get(partner.partnership_id) || null,
      };
    });
  }

  async getPartnerRequests(existingPartnerIds?: Set<string>): Promise<{
    sent: AccountabilityPartnerRequest[];
    received: AccountabilityPartnerRequest[];
  }> {
    const user = authStore.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch sent requests
    const { data: sentData, error: sentError } = await supabase
      .from('accountability_partner_requests')
      .select(`
        *,
        receiver_profile:profiles!accountability_partner_requests_receiver_id_fkey (
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('sender_id', user.id)
      .eq('status', 'pending');

    if (sentError) {
      console.error('Error fetching sent requests:', sentError);
      throw sentError;
    }

    // Fetch received requests
    const { data: receivedData, error: receivedError } = await supabase
      .from('accountability_partner_requests')
      .select(`
        *,
        sender_profile:profiles!accountability_partner_requests_sender_id_fkey (
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (receivedError) {
      console.error('Error fetching received requests:', receivedError);
      throw receivedError;
    }

    // Filter out requests where a partnership already exists (if partnerIds provided)
    const sent = sentData || [];
    const received = receivedData || [];
    
    if (existingPartnerIds && existingPartnerIds.size > 0) {
      return {
        sent: sent.filter(r => !existingPartnerIds.has(r.receiver_id)) as AccountabilityPartnerRequest[],
        received: received.filter(r => !existingPartnerIds.has(r.sender_id)) as AccountabilityPartnerRequest[],
      };
    }

    return {
      sent: sent as AccountabilityPartnerRequest[],
      received: received as AccountabilityPartnerRequest[],
    };
  }

  async sendPartnerRequest(
    receiverId: string, 
    message: string = '',
    visibilitySettings?: { senderCanViewReceiverGoals?: boolean; receiverCanViewSenderGoals?: boolean }
  ): Promise<{ success: boolean; error?: string; requestId?: string }> {
    try {
      const { data, error } = await supabase.rpc('send_accountability_partner_request', {
        _receiver_id: receiverId,
        _message: message,
        _sender_can_view_receiver_goals: visibilitySettings?.senderCanViewReceiverGoals ?? true,
        _receiver_can_view_sender_goals: visibilitySettings?.receiverCanViewSenderGoals ?? true,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, requestId: data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async respondToPartnerRequest(
    requestId: string, 
    response: 'accepted' | 'rejected',
    visibilityOverrides?: { senderCanViewReceiverGoals?: boolean; receiverCanViewSenderGoals?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('respond_to_accountability_partner_request', {
        _request_id: requestId,
        _response: response,
        _override_sender_can_view_receiver_goals: visibilityOverrides?.senderCanViewReceiverGoals ?? null,
        _override_receiver_can_view_sender_goals: visibilityOverrides?.receiverCanViewSenderGoals ?? null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async cancelPartnerRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('accountability_partner_requests')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async removePartner(partnerId: string): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Delete the partnership
      const { error } = await supabase
        .from('accountability_partnerships')
        .delete()
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async getPartnerGoals(partnerId: string): Promise<PartnerGoal[]> {
    const user = authStore.getUser();
    if (!user) throw new Error('Not authenticated');

    // First verify they are accountability partners
    const partners = await this.getPartners();
    const isPartner = partners.some(p => p.partner_id === partnerId);
    
    if (!isPartner) {
      throw new Error('Not authorized to view this user\'s goals');
    }

    const { data, error } = await supabase
      .from('goals')
      .select('id, title, description, status, timeframe, category, created_at, target_date, is_recurring')
      .eq('user_id', partnerId)
      .in('status', ['active', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partner goals:', error);
      throw error;
    }

    return data || [];
  }

  async getPartnerWeeklyObjectives(partnerId: string, weekStart: string): Promise<PartnerWeeklyObjective[]> {
    const user = authStore.getUser();
    if (!user) throw new Error('Not authenticated');

    // First verify they are accountability partners
    const partners = await this.getPartners();
    const isPartner = partners.some(p => p.partner_id === partnerId);
    
    if (!isPartner) {
      throw new Error('Not authorized to view this user\'s objectives');
    }

    const { data, error } = await supabase
      .from('weekly_objectives')
      .select('id, text, is_completed, week_start, goal_id, scheduled_day, scheduled_time, goal:goals(title)')
      .eq('user_id', partnerId)
      .eq('week_start', weekStart)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching partner objectives:', error);
      throw error;
    }

    return data || [];
  }

  async getPartnerProfile(partnerId: string): Promise<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    about_me: string | null;
  } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email, about_me')
      .eq('id', partnerId)
      .single();

    if (error) {
      console.error('Error fetching partner profile:', error);
      return null;
    }

    return data;
  }

  async recordCheckIn(partnershipId: string, message?: string, replyToId?: string): Promise<{ success: boolean; error?: string; checkInId?: string }> {
    try {
      // Single optimized RPC call that handles insert, update timestamp, and notification
      const { data, error } = await supabase.rpc('record_accountability_check_in', {
        p_partnership_id: partnershipId,
        p_message: message || null,
        p_reply_to_id: replyToId || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // RPC returns jsonb with success/error/check_in_id
      const result = data as { success: boolean; error?: string; check_in_id?: string };
      
      if (!result.success) {
        return { success: false, error: result.error || 'Unknown error' };
      }

      return { success: true, checkInId: result.check_in_id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async updateCheckIn(checkInId: string, message: string): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('accountability_check_ins')
        .update({ message: message || null })
        .eq('id', checkInId)
        .eq('initiated_by', user.id); // Only allow editing own check-ins

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async deleteCheckIn(checkInId: string): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // First delete any reactions to this check-in
      await supabase
        .from('check_in_reactions')
        .delete()
        .eq('check_in_id', checkInId);

      // Then delete the check-in (only if user owns it)
      const { error } = await supabase
        .from('accountability_check_ins')
        .delete()
        .eq('id', checkInId)
        .eq('initiated_by', user.id); // Only allow deleting own check-ins

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async updateVisibilitySettings(
    partnerId: string, 
    settings: { canViewPartnerGoals?: boolean; partnerCanViewMyGoals?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Determine if current user is user1 or user2 in the partnership
      const { data: partnership, error: fetchError } = await supabase
        .from('accountability_partnerships')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`)
        .eq('status', 'active')
        .single();

      if (fetchError || !partnership) {
        return { success: false, error: 'Partnership not found' };
      }

      const isUser1 = partnership.user1_id === user.id;
      const updateData: Record<string, boolean> = {};

      // Map the settings to the correct columns
      if (settings.canViewPartnerGoals !== undefined) {
        // Current user's ability to view partner's goals
        updateData[isUser1 ? 'user1_can_view_user2_goals' : 'user2_can_view_user1_goals'] = settings.canViewPartnerGoals;
      }
      if (settings.partnerCanViewMyGoals !== undefined) {
        // Partner's ability to view current user's goals
        updateData[isUser1 ? 'user2_can_view_user1_goals' : 'user1_can_view_user2_goals'] = settings.partnerCanViewMyGoals;
      }

      const { error } = await supabase
        .from('accountability_partnerships')
        .update(updateData)
        .eq('id', partnership.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async getPartnershipDetails(partnerId: string): Promise<{
    id: string;
    user1_id: string;
    user2_id: string;
    can_view_partner_goals: boolean;
    last_check_in_at: string | null;
  } | null> {
    const user = authStore.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('accountability_partnerships')
      .select('id, user1_id, user2_id, user1_can_view_user2_goals, user2_can_view_user1_goals, last_check_in_at')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching partnership details:', error);
      return null;
    }

    if (!data) return null;

    // Determine if current user can view partner's goals
    const isUser1 = data.user1_id === user.id;
    const canViewPartnerGoals = isUser1 ? data.user1_can_view_user2_goals : data.user2_can_view_user1_goals;

    return {
      id: data.id,
      user1_id: data.user1_id,
      user2_id: data.user2_id,
      can_view_partner_goals: canViewPartnerGoals,
      last_check_in_at: data.last_check_in_at,
    };
  }
  async getCheckInHistory(partnershipId: string): Promise<CheckInRecord[]> {
    const { data, error } = await supabase
      .from('accountability_check_ins')
      .select(`
        id,
        partnership_id,
        initiated_by,
        week_start,
        message,
        created_at,
        reply_to_id,
        initiator_profile:profiles!accountability_check_ins_initiated_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching check-in history:', error);
      return [];
    }

    // Organize into parent check-ins with nested replies
    const allCheckIns = (data || []) as CheckInRecord[];
    const checkInIds = allCheckIns.map(c => c.id);
    
    // Fetch reactions for all check-ins in one query
    let reactions: CheckInReaction[] = [];
    if (checkInIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from('check_in_reactions')
        .select(`
          id,
          check_in_id,
          user_id,
          reaction,
          created_at,
          reactor:profiles!check_in_reactions_user_id_fkey (
            full_name
          )
        `)
        .in('check_in_id', checkInIds);
      
      reactions = (reactionsData || []).map(r => ({
        id: r.id,
        check_in_id: r.check_in_id,
        user_id: r.user_id,
        reaction: r.reaction,
        created_at: r.created_at,
        reactor_name: (r.reactor as any)?.full_name || 'Unknown',
      })) as CheckInReaction[];
    }

    const parentCheckIns = allCheckIns.filter(c => !c.reply_to_id);
    const repliesMap = new Map<string, CheckInRecord[]>();
    
    allCheckIns.filter(c => c.reply_to_id).forEach(reply => {
      const existing = repliesMap.get(reply.reply_to_id!) || [];
      existing.push({
        ...reply,
        reactions: reactions.filter(r => r.check_in_id === reply.id),
      });
      repliesMap.set(reply.reply_to_id!, existing);
    });

    // Attach replies and reactions to their parents
    return parentCheckIns.map(parent => ({
      ...parent,
      reactions: reactions.filter(r => r.check_in_id === parent.id),
      replies: (repliesMap.get(parent.id) || []).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));
  }

  async getWeekCheckIns(partnershipId: string, weekStart: string): Promise<CheckInRecord[]> {
    const { data, error } = await supabase
      .from('accountability_check_ins')
      .select(`
        id,
        partnership_id,
        initiated_by,
        week_start,
        message,
        created_at,
        initiator_profile:profiles!accountability_check_ins_initiated_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('partnership_id', partnershipId)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching week check-ins:', error);
      return [];
    }

    // Fetch reactions for all check-ins
    const checkInIds = data?.map(c => c.id) || [];
    let reactions: CheckInReaction[] = [];
    
    if (checkInIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from('check_in_reactions')
        .select(`
          id,
          check_in_id,
          user_id,
          reaction,
          created_at,
          reactor:profiles!check_in_reactions_user_id_fkey (
            full_name
          )
        `)
        .in('check_in_id', checkInIds);
      reactions = (reactionsData || []).map(r => ({
        id: r.id,
        check_in_id: r.check_in_id,
        user_id: r.user_id,
        reaction: r.reaction,
        created_at: r.created_at,
        reactor_name: (r.reactor as any)?.full_name || 'Unknown',
      })) as CheckInReaction[];
    }

    return (data || []).map(checkIn => ({
      ...checkIn,
      reactions: reactions.filter(r => r.check_in_id === checkIn.id),
    })) as CheckInRecord[];
  }

  async addReactionToCheckIn(checkInId: string, reaction: string): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Note: partnership_id is auto-set by trigger from check_in_id
      const { error } = await supabase
        .from('check_in_reactions')
        .insert({
          check_in_id: checkInId,
          user_id: user.id,
          reaction,
        } as any); // Type bypass: trigger auto-sets partnership_id

      if (error) {
        // If it's a unique constraint violation, the user already reacted
        if (error.code === '23505') {
          return { success: false, error: 'Already reacted' };
        }
        return { success: false, error: error.message };
      }

      // Send notification to the check-in author (if not reacting to own check-in)
      const { data: checkIn } = await supabase
        .from('accountability_check_ins')
        .select('initiated_by, partnership_id')
        .eq('id', checkInId)
        .single();

      if (checkIn && checkIn.initiated_by !== user.id) {
        // Get reactor's name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const reactorName = profile?.full_name || 'Someone';

        await supabase.rpc('create_notification', {
          _user_id: checkIn.initiated_by,
          _type: 'accountability_check_in',
          _message: `${reactorName} reacted ${reaction} to your check-in`,
          _triggered_by_user_id: user.id,
          _related_request_id: checkIn.partnership_id,
        });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async removeReactionFromCheckIn(checkInId: string, reaction: string): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('check_in_reactions')
        .delete()
        .eq('check_in_id', checkInId)
        .eq('user_id', user.id)
        .eq('reaction', reaction);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async toggleReaction(checkInId: string, reaction: string): Promise<{ success: boolean; added: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, added: false, error: 'Not authenticated' };

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('check_in_reactions')
      .select('id')
      .eq('check_in_id', checkInId)
      .eq('user_id', user.id)
      .eq('reaction', reaction)
      .maybeSingle();

    if (existing) {
      const result = await this.removeReactionFromCheckIn(checkInId, reaction);
      return { ...result, added: false };
    } else {
      const result = await this.addReactionToCheckIn(checkInId, reaction);
      return { ...result, added: true };
    }
  }

  async updateCheckInCadence(
    partnerId: string, 
    cadence: CheckInCadence
  ): Promise<{ success: boolean; error?: string }> {
    const user = authStore.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Find the partnership
      const { data: partnership, error: fetchError } = await supabase
        .from('accountability_partnerships')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`)
        .eq('status', 'active')
        .single();

      if (fetchError || !partnership) {
        return { success: false, error: 'Partnership not found' };
      }

      // Update the appropriate cadence field based on which user we are
      const updateField = partnership.user1_id === user.id 
        ? 'my_check_in_cadence_user1' 
        : 'my_check_in_cadence_user2';

      const { error } = await supabase
        .from('accountability_partnerships')
        .update({ [updateField]: cadence })
        .eq('id', partnership.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  // Get partners with due/overdue check-ins based on their cadence
  async getDueCheckIns(): Promise<{
    partner_id: string;
    partner_name: string;
    avatar_url: string | null;
    cadence: CheckInCadence;
    last_check_in_at: string | null;
    is_overdue: boolean;
    days_until_due: number;
  }[]> {
    const user = authStore.getUser();
    if (!user) return [];

    try {
      const partners = await this.getPartners();
      const now = new Date();
      
      return partners.map(partner => {
        const cadence = partner.my_check_in_cadence || 'weekly';
        
        // Use last check-in date, or fall back to partnership creation date
        const referenceDate = partner.last_check_in_at 
          ? new Date(partner.last_check_in_at)
          : partner.partnership_created_at 
            ? new Date(partner.partnership_created_at)
            : null;
        
        // Calculate days between check-ins based on cadence
        const cadenceDays: Record<CheckInCadence, number> = {
          'none': Infinity, // Never due if disabled
          'daily': 1,
          'twice_weekly': 3.5,
          'weekly': 7,
          'biweekly': 14,
        };
        
        const expectedDays = cadenceDays[cadence];
        
        // If no reference date, treat as just starting (not overdue)
        let daysSinceReference = referenceDate 
          ? Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        const daysUntilDue = expectedDays - daysSinceReference;
        const isOverdue = daysUntilDue < 0;
        
        return {
          partner_id: partner.partner_id,
          partner_name: partner.full_name,
          avatar_url: partner.avatar_url,
          cadence,
          last_check_in_at: partner.last_check_in_at,
          is_overdue: isOverdue,
          days_until_due: Math.ceil(daysUntilDue),
        };
      }).filter(p => p.days_until_due <= 1); // Only return partners due today or overdue
    } catch (err) {
      console.error('Error getting due check-ins:', err);
      return [];
    }
  }

  /**
   * Get partner's habit stats (goals with habit_items and their completion data)
   */
  async getPartnerHabitStats(partnerId: string): Promise<{
    goal: {
      id: string;
      title: string;
      habit_items: any[];
    };
    currentStreak: number;
    completionRate: number;
    totalWeeks: number;
    completedWeeks: number;
    weeklyHistory: { weekStart: string; isCompleted: boolean }[];
  }[]> {
    const user = authStore.getUser();
    if (!user) throw new Error('Not authenticated');

    // First verify they are accountability partners
    const partners = await this.getPartners();
    const isPartner = partners.some(p => p.partner_id === partnerId);
    
    if (!isPartner) {
      throw new Error('Not authorized to view this user\'s habits');
    }

    // Get partner's goals with habit_items
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, habit_items, status, start_date')
      .eq('user_id', partnerId)
      .neq('status', 'deleted');

    if (goalsError) {
      console.error('Error fetching partner goals for habits:', goalsError);
      return [];
    }

    // Filter to only goals with habit_items
    const habitGoals = (goals || []).filter(g => {
      const items = g.habit_items as any;
      return items && Array.isArray(items) && items.length > 0;
    });

    if (habitGoals.length === 0) return [];

    // Get objectives for these goals
    const goalIds = habitGoals.map(g => g.id);
    const { data: objectives, error: objError } = await supabase
      .from('weekly_objectives')
      .select('id, is_completed, week_start, goal_id')
      .eq('user_id', partnerId)
      .in('goal_id', goalIds)
      .order('week_start', { ascending: false });

    if (objError) {
      console.error('Error fetching partner objectives for habits:', objError);
      return [];
    }

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    return habitGoals.map(goal => {
      const goalObjectives = (objectives || [])
        .filter(obj => obj.goal_id === goal.id)
        .sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime());

      // Build weekly history
      const weeklyHistory = goalObjectives.slice(0, 8).map(obj => ({
        weekStart: obj.week_start,
        isCompleted: obj.is_completed,
      }));

      // Calculate completion stats
      const totalWeeks = goalObjectives.length;
      const completedWeeks = goalObjectives.filter(obj => obj.is_completed).length;
      const completionRate = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

      // Calculate current streak
      let currentStreak = 0;
      const sortedObjectives = [...goalObjectives].sort(
        (a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
      );

      for (const obj of sortedObjectives) {
        const objWeekStart = new Date(obj.week_start);
        if (objWeekStart > currentWeekStart) continue;
        
        if (obj.is_completed) {
          currentStreak++;
        } else {
          if (format(objWeekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd')) {
            continue;
          }
          break;
        }
      }

      return {
        goal: {
          id: goal.id,
          title: goal.title,
          habit_items: goal.habit_items as any[],
        },
        currentStreak,
        completionRate,
        totalWeeks,
        completedWeeks,
        weeklyHistory,
      };
    });
  }

  /**
   * Get partner's habit completions for a specific week
   * Returns daily completion status for each habit item
   */
  async getPartnerHabitCompletions(
    partnerId: string,
    weekStart: Date
  ): Promise<{ habit_item_id: string; completion_date: string }[]> {
    const user = authStore.getUser();
    if (!user) throw new Error('Not authenticated');

    // First verify they are accountability partners with visibility permissions
    const partners = await this.getPartners();
    const partner = partners.find(p => p.partner_id === partnerId);
    
    if (!partner || !partner.can_view_partner_goals) {
      // If not a partner or no visibility permission, return empty
      return [];
    }

    const weekEnd = addDays(weekStart, 6);
    
    const { data, error } = await supabase
      .from('habit_completions')
      .select('habit_item_id, completion_date')
      .eq('user_id', partnerId)
      .gte('completion_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('completion_date', format(weekEnd, 'yyyy-MM-dd'));

    if (error) {
      console.error('Error fetching partner habit completions:', error);
      return [];
    }

    return data || [];
  }
}

export const accountabilityService = new AccountabilityService();
