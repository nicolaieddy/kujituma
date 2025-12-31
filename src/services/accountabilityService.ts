import { supabase } from '@/integrations/supabase/client';

export interface AccountabilityPartner {
  partner_id: string;
  full_name: string;
  avatar_url: string | null;
  partnership_id: string;
  status: string;
  last_check_in_at: string | null;
}

export interface AccountabilityPartnerRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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

    return {
      sent: (sentData || []) as AccountabilityPartnerRequest[],
      received: (receivedData || []) as AccountabilityPartnerRequest[],
    };
  }

  async sendPartnerRequest(receiverId: string, message: string = ''): Promise<{ success: boolean; error?: string; requestId?: string }> {
    try {
      const { data, error } = await supabase.rpc('send_accountability_partner_request', {
        _receiver_id: receiverId,
        _message: message,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, requestId: data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async respondToPartnerRequest(requestId: string, response: 'accepted' | 'rejected'): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('respond_to_accountability_partner_request', {
        _request_id: requestId,
        _response: response,
      });

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
      .select('id, text, is_completed, week_start, goal_id, scheduled_day, scheduled_time')
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

  async recordCheckIn(partnershipId: string, message?: string): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Get current week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);

      const { error } = await supabase
        .from('accountability_check_ins')
        .insert({
          partnership_id: partnershipId,
          initiated_by: user.id,
          week_start: weekStart.toISOString().split('T')[0],
          message: message || null,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update last check-in timestamp on partnership
      await supabase
        .from('accountability_partnerships')
        .update({ last_check_in_at: new Date().toISOString() })
        .eq('id', partnershipId);

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

export const accountabilityService = new AccountabilityService();
