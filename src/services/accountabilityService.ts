import { supabase } from '@/integrations/supabase/client';

export interface AccountabilityPartner {
  partner_id: string;
  full_name: string;
  avatar_url: string | null;
  partnership_id: string;
  status: string;
  last_check_in_at: string | null;
  can_view_partner_goals: boolean;
  partner_can_view_my_goals: boolean;
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
  initiator_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  reactions?: CheckInReaction[];
}

export interface CheckInReaction {
  id: string;
  check_in_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

class AccountabilityService {
  async getPartners(): Promise<AccountabilityPartner[]> {
    const { data, error } = await supabase.rpc('get_accountability_partners');
    
    if (error) {
      console.error('Error fetching partners:', error);
      throw error;
    }
    
    return data || [];
  }

  async getPartnerRequests(): Promise<{
    sent: AccountabilityPartnerRequest[];
    received: AccountabilityPartnerRequest[];
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get existing partners to filter out stale requests
    const existingPartners = await this.getPartners();
    const partnerIds = new Set(existingPartners.map(p => p.partner_id));

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

    // Filter out requests where a partnership already exists
    const filteredSent = (sentData || []).filter(r => !partnerIds.has(r.receiver_id));
    const filteredReceived = (receivedData || []).filter(r => !partnerIds.has(r.sender_id));

    return {
      sent: filteredSent as AccountabilityPartnerRequest[],
      received: filteredReceived as AccountabilityPartnerRequest[],
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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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

  async recordCheckIn(partnershipId: string, message?: string): Promise<{ success: boolean; error?: string; checkInId?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Get current week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);

      const { data: checkIn, error } = await supabase
        .from('accountability_check_ins')
        .insert({
          partnership_id: partnershipId,
          initiated_by: user.id,
          week_start: weekStart.toISOString().split('T')[0],
          message: message || null,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update last check-in timestamp on partnership
      await supabase
        .from('accountability_partnerships')
        .update({ last_check_in_at: new Date().toISOString() })
        .eq('id', partnershipId);

      // Get the partner's user ID and current user's name to send notification
      const { data: partnership } = await supabase
        .from('accountability_partnerships')
        .select('user1_id, user2_id')
        .eq('id', partnershipId)
        .single();

      if (partnership) {
        const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
        
        // Get current user's name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const userName = profile?.full_name || 'Your accountability partner';

        // Create notification for the partner
        await supabase.rpc('create_notification', {
          _user_id: partnerId,
          _type: 'accountability_check_in',
          _message: `${userName} recorded a check-in${message ? ': "' + message.slice(0, 50) + (message.length > 50 ? '...' : '') + '"' : ''}`,
          _triggered_by_user_id: user.id,
          _related_request_id: partnershipId,
        });
      }

      return { success: true, checkInId: checkIn?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async updateVisibilitySettings(
    partnerId: string, 
    settings: { canViewPartnerGoals?: boolean; partnerCanViewMyGoals?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
        initiator_profile:profiles!accountability_check_ins_initiated_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching check-in history:', error);
      return [];
    }

    return (data || []) as CheckInRecord[];
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
        .select('*')
        .in('check_in_id', checkInIds);
      reactions = (reactionsData || []) as CheckInReaction[];
    }

    return (data || []).map(checkIn => ({
      ...checkIn,
      reactions: reactions.filter(r => r.check_in_id === checkIn.id),
    })) as CheckInRecord[];
  }

  async addReactionToCheckIn(checkInId: string, reaction: string): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('check_in_reactions')
        .insert({
          check_in_id: checkInId,
          user_id: user.id,
          reaction,
        });

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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
}

export const accountabilityService = new AccountabilityService();
