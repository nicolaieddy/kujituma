import { supabase } from '@/integrations/supabase/client';

export class AuthUtils {
  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static async requireAuth() {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user;
  }

  static async getUserProfile(userId?: string) {
    const user = userId ? { id: userId } : await this.getCurrentUser();
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