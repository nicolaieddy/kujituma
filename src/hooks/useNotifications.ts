import { useState, useEffect, useCallback } from 'react';
import { notificationsService } from '@/services/notificationsService';
import { Notification } from '@/types/notifications';
import { useAuth } from '@/contexts/AuthContext';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const [notificationsData, count] = await Promise.all([
        notificationsService.getNotifications(),
        notificationsService.getUnreadCount()
      ]);
      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();
      // Refresh notifications from server to get updated state
      await fetchNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
      console.error('Error marking all as read:', err);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    let channel: any;
    
    const setupChannel = async () => {
      channel = await notificationsService.subscribeToNotifications(
        // Handle new notifications
        (newNotification) => {
          setNotifications(prev => {
            // Avoid duplicates
            if (prev.some(n => n.id === newNotification.id)) {
              return prev;
            }
            return [newNotification, ...prev];
          });
          setUnreadCount(prev => prev + 1);
        },
        // Handle updates (e.g., marked as read on another device)
        (updatedNotification) => {
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id 
              ? { ...n, is_read: updatedNotification.is_read } 
              : n
            )
          );
          // Recalculate unread count on update
          setNotifications(prev => {
            const newUnreadCount = prev.filter(n => !n.is_read).length;
            setUnreadCount(newUnreadCount);
            return prev;
          });
        }
      );
    };
    
    setupChannel();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
};