import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notifications';

class NotificationsService {
  private async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  async getNotifications(limit = 20, offset = 0): Promise<Notification[]> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get unique triggered_by user IDs for batch fetching
    const notifications = data || [];
    const triggeredByIds = [...new Set(notifications.map(n => n.triggered_by_user_id))];
    
    // Batch fetch user profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', triggeredByIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return notifications.map(notification => ({
      ...notification,
      type: notification.type as 'post_like' | 'comment_added' | 'comment_like' | 'mention',
      triggered_by: profileMap.get(notification.triggered_by_user_id) || null
    })) as Notification[];
  }

  async getUnreadCount(): Promise<number> {
    const user = await this.getCurrentUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('mark_notification_read', {
      _notification_id: notificationId,
      _user_id: user.id
    });

    if (error) throw error;
  }

  async markAllAsRead(): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('mark_all_notifications_read', {
      _user_id: user.id
    });

    if (error) throw error;
  }

  async subscribeToNotifications(callback: (notification: Notification) => void) {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return channel;
  }
}

export const notificationsService = new NotificationsService();