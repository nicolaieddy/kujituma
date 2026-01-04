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
      type: notification.type as Notification['type'],
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

  async subscribeToNotifications(
    onInsert: (notification: Notification) => void,
    onUpdate?: (notification: Notification) => void
  ) {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const channel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          const newNotification = payload.new as Notification & { user_id: string };
          // Client-side filter to only handle notifications for this user
          if (newNotification.user_id !== user.id) return;
          
          // Fetch the triggered_by profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newNotification.triggered_by_user_id)
            .single();
          
          onInsert({
            ...newNotification,
            type: newNotification.type as Notification['type'],
            triggered_by: profile || null
          } as Notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const updated = payload.new as Notification & { user_id: string };
          if (updated.user_id !== user.id) return;
          
          if (onUpdate) {
            onUpdate(updated as Notification);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Notifications subscription active');
        }
      });

    return channel;
  }
}

export const notificationsService = new NotificationsService();