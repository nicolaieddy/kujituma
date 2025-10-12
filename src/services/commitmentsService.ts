import { supabase } from "@/integrations/supabase/client";

export interface PublicCommitment {
  id: string;
  objective_id: string;
  objective_text: string;
  is_completed: boolean;
  rank: number;
}

class CommitmentsService {
  async setPublicCommitments(weekStart: string, objectiveIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('set_public_commitments', {
        _week_start: weekStart,
        _objective_ids: objectiveIds,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error setting public commitments:', error);
      return { success: false, error: error.message };
    }
  }

  async getPublicCommitments(userId: string, weekStart: string): Promise<PublicCommitment[]> {
    try {
      const { data, error } = await supabase.rpc('get_public_commitments', {
        _user_id: userId,
        _week_start: weekStart,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching public commitments:', error);
      return [];
    }
  }

  async updateCommitmentVisibility(visibility: 'private' | 'friends' | 'public'): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ commitment_visibility: visibility })
        .eq('id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating commitment visibility:', error);
      return { success: false, error: error.message };
    }
  }
}

export const commitmentsService = new CommitmentsService();
