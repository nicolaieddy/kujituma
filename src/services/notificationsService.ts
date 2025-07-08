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

    // Get triggered_by user info separately
    const notifications = data || [];
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', notification.triggered_by_user_id)
          .single();

        return {
          ...notification,
          type: notification.type as 'post_like' | 'comment_added' | 'comment_like',
          triggered_by: profile
        } as Notification;
      })
    );

    return enrichedNotifications;
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