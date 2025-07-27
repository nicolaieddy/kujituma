import { useState, useEffect, useCallback } from 'react';
import { friendsService } from '@/services/friendsService';
import { useAuth } from '@/contexts/AuthContext';

export const useFriendshipStatus = (userId: string) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    is_friend: boolean;
    friend_request_status?: 'sent' | 'received';
    request_id?: string;
  }>({ is_friend: false });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user || !userId || user.id === userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const friendshipStatus = await friendsService.getFriendshipStatus(userId);
      setStatus(friendshipStatus);
    } catch (error) {
      console.error('Error fetching friendship status:', error);
      setStatus({ is_friend: false });
    } finally {
      setLoading(false);
    }
  }, [user, userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...status,
    loading,
    refetch: fetchStatus
  };
};