import { supabase } from '@/integrations/supabase/client';
import { authStore } from '@/stores/authStore';

export class AuthUtils {
  static getCurrentUser() {
    return authStore.getUser();
  }

  static requireAuth() {
    return authStore.requireUser();
  }

  static async getUserProfile(userId?: string) {
    const user = userId ? { id: userId } : authStore.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return profile;
  }
}
