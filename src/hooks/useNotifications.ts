import { useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notificationsService';
import { Notification } from '@/types/notifications';
import { useAuth } from '@/contexts/AuthContext';

const NOTIFICATIONS_LIMIT = 20;

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: () => notificationsService.getNotifications(NOTIFICATIONS_LIMIT, 0),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    enabled: !!user,
    queryFn: () => notificationsService.getUnreadCount(),
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['notifications', user?.id] }),
        queryClient.cancelQueries({ queryKey: ['notifications-unread-count', user?.id] }),
      ]);

      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      const previousUnread = queryClient.getQueryData<number>(['notifications-unread-count', user?.id]);

      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(['notifications', user?.id], (prev) =>
          (prev || []).map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );

        const wasUnread = previousNotifications.find((n) => n.id === notificationId)?.is_read === false;
        if (wasUnread && typeof previousUnread === 'number') {
          queryClient.setQueryData<number>(
            ['notifications-unread-count', user?.id],
            Math.max(0, previousUnread - 1)
          );
        }
      }

      return { previousNotifications, previousUnread };
    },
    onError: (_err, _notificationId, ctx) => {
      if (ctx?.previousNotifications) {
        queryClient.setQueryData(['notifications', user?.id], ctx.previousNotifications);
      }
      if (typeof ctx?.previousUnread === 'number') {
        queryClient.setQueryData(['notifications-unread-count', user?.id], ctx.previousUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['notifications', user?.id] }),
        queryClient.cancelQueries({ queryKey: ['notifications-unread-count', user?.id] }),
      ]);

      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      const previousUnread = queryClient.getQueryData<number>(['notifications-unread-count', user?.id]);

      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(['notifications', user?.id], (prev) =>
          (prev || []).map((n) => ({ ...n, is_read: true }))
        );
      }
      queryClient.setQueryData<number>(['notifications-unread-count', user?.id], 0);

      return { previousNotifications, previousUnread };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousNotifications) {
        queryClient.setQueryData(['notifications', user?.id], ctx.previousNotifications);
      }
      if (typeof ctx?.previousUnread === 'number') {
        queryClient.setQueryData(['notifications-unread-count', user?.id], ctx.previousUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
  });

  const markAsRead = useCallback(async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const refetch = useCallback(async () => {
    await Promise.all([notificationsQuery.refetch(), unreadCountQuery.refetch()]);
  }, [notificationsQuery, unreadCountQuery]);

  // Single realtime subscription (only when this hook is mounted)
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let channel: any;

    const start = async () => {
      channel = await notificationsService.subscribeToNotifications(
        (newNotification) => {
          if (!isMounted) return;

          queryClient.setQueryData<Notification[]>(['notifications', user.id], (prev) => {
            const existing = prev || [];
            if (existing.some((n) => n.id === newNotification.id)) return existing;
            return [newNotification, ...existing].slice(0, NOTIFICATIONS_LIMIT);
          });

          if (newNotification.is_read === false) {
            queryClient.setQueryData<number>(['notifications-unread-count', user.id], (prev) => (prev || 0) + 1);
          }
        },
        (updatedNotification) => {
          if (!isMounted) return;

          queryClient.setQueryData<Notification[]>(['notifications', user.id], (prev) => {
            const existing = prev || [];
            return existing.map((n) => {
              if (n.id !== updatedNotification.id) return n;
              // preserve triggered_by which isn't present in realtime UPDATE payload
              return {
                ...n,
                ...updatedNotification,
                triggered_by: n.triggered_by,
                type: (updatedNotification.type as Notification['type']) ?? n.type,
              } as Notification;
            });
          });

          // Keep unread count consistent by refetching the count (cheap) rather than trying to diff locally.
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
        }
      );
    };

    start();

    return () => {
      isMounted = false;
      if (channel) channel.unsubscribe();
    };
  }, [user, queryClient]);

  return {
    notifications: notificationsQuery.data || [],
    unreadCount: unreadCountQuery.data || 0,
    loading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    error: (notificationsQuery.error as Error | null)?.message || (unreadCountQuery.error as Error | null)?.message || null,
    markAsRead,
    markAllAsRead,
    refetch,
  };
};
