import { supabase } from "@/integrations/supabase/client";

export interface AccountabilityPartner {
  partner_id: string;
  full_name: string;
  avatar_url: string | null;
  partnership_id: string;
  status: string;
  last_check_in_at: string | null;
}

export interface AccountabilityGroup {
  group_id: string;
  group_name: string;
  group_description: string | null;
  member_count: number;
  last_check_in_at: string | null;
  user_role: string;
}

export interface AccountabilityPartnerRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface CheckIn {
  id: string;
  partnership_id: string;
  initiated_by: string;
  week_start: string;
  message: string | null;
  created_at: string;
}

class AccountabilityService {
  async sendPartnerRequest(receiverId: string, message?: string): Promise<{ success: boolean; error?: string; requestId?: string }> {
    try {
      const { data, error } = await supabase.rpc('send_accountability_partner_request', {
        _receiver_id: receiverId,
        _message: message || null,
      });

      if (error) throw error;

      return { success: true, requestId: data };
    } catch (error: any) {
      console.error('Error sending partner request:', error);
      return { success: false, error: error.message };
    }
  }

  async respondToPartnerRequest(requestId: string, response: 'accepted' | 'rejected'): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('respond_to_accountability_partner_request', {
        _request_id: requestId,
        _response: response,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error responding to partner request:', error);
      return { success: false, error: error.message };
    }
  }

  async getAccountabilityPartner(): Promise<AccountabilityPartner | null> {
    try {
      const { data, error } = await supabase.rpc('get_accountability_partner');

      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching accountability partner:', error);
      return null;
    }
  }

  async getAccountabilityPartners(): Promise<AccountabilityPartner[]> {
    try {
      const { data, error } = await supabase.rpc('get_accountability_partners');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching accountability partners:', error);
      return [];
    }
  }

  async getAccountabilityGroups(): Promise<AccountabilityGroup[]> {
    try {
      const { data, error } = await supabase.rpc('get_accountability_groups');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching accountability groups:', error);
      return [];
    }
  }

  async getPartnerRequests(): Promise<{ sent: AccountabilityPartnerRequest[]; received: AccountabilityPartnerRequest[] }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: sentRequests, error: sentError } = await supabase
        .from('accountability_partner_requests')
        .select(`
          *,
          receiver:profiles!accountability_partner_requests_receiver_id_fkey(full_name, avatar_url)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      const { data: receivedRequests, error: receivedError } = await supabase
        .from('accountability_partner_requests')
        .select(`
          *,
          sender:profiles!accountability_partner_requests_sender_id_fkey(full_name, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;
      if (receivedError) throw receivedError;

      return {
        sent: (sentRequests as any) || [],
        received: (receivedRequests as any) || [],
      };
    } catch (error) {
      console.error('Error fetching partner requests:', error);
      return { sent: [], received: [] };
    }
  }

  async createCheckIn(
    partnershipId: string | null, 
    groupId: string | null,
    weekStart: string, 
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('accountability_check_ins')
        .insert({
          partnership_id: partnershipId,
          group_id: groupId,
          initiated_by: user.id,
          week_start: weekStart,
          message: message || null,
        });

      if (error) throw error;

      // Update last check-in time for partnerships
      if (partnershipId) {
        const { data: partnership } = await supabase
          .from('accountability_partnerships')
          .select('user1_id, user2_id')
          .eq('id', partnershipId)
          .single();

        if (partnership) {
          await supabase
            .from('accountability_partnerships')
            .update({ last_check_in_at: new Date().toISOString() })
            .eq('id', partnershipId);

          const partnerId = partnership.user1_id === user.id 
            ? partnership.user2_id 
            : partnership.user1_id;

          await supabase.rpc('create_notification', {
            _user_id: partnerId,
            _type: 'accountability_check_in',
            _message: `${profile?.full_name || 'Your partner'} sent you a check-in message`,
            _triggered_by_user_id: user.id
          });
        }
      }

      // Notify group members
      if (groupId) {
        const { data: members } = await supabase
          .from('accountability_group_members')
          .select('user_id')
          .eq('group_id', groupId)
          .neq('user_id', user.id);

        if (members) {
          for (const member of members) {
            await supabase.rpc('create_notification', {
              _user_id: member.user_id,
              _type: 'accountability_check_in',
              _message: `${profile?.full_name || 'A group member'} sent a check-in message`,
              _triggered_by_user_id: user.id
            });
          }
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error creating check-in:', error);
      return { success: false, error: error.message };
    }
  }

  async getCheckIns(partnershipId: string | null, groupId: string | null, weekStart: string): Promise<CheckIn[]> {
    try {
      let query = supabase
        .from('accountability_check_ins')
        .select('*')
        .eq('week_start', weekStart)
        .order('created_at', { ascending: false });

      if (partnershipId) {
        query = query.eq('partnership_id', partnershipId).is('group_id', null);
      } else if (groupId) {
        query = query.eq('group_id', groupId).is('partnership_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      return [];
    }
  }

  async updatePartnershipStatus(partnershipId: string, status: 'active' | 'paused' | 'ended'): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('accountability_partnerships')
        .update({ status })
        .eq('id', partnershipId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating partnership status:', error);
      return { success: false, error: error.message };
    }
  }
}

export const accountabilityService = new AccountabilityService();
