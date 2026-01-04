import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GoalUpdatesService } from '@/services/goalUpdatesService';
import { GoalUpdate, CheerType, GoalUpdateComment } from '@/types/goalUpdates';
import { toast } from 'sonner';

interface UseGoalUpdatesOptions {
  feedType?: 'all' | 'following';
  goalId?: string;
}

export const useGoalUpdates = (options: UseGoalUpdatesOptions = {}) => {
  const { feedType = 'all', goalId } = options;
  const { user } = useAuth();
  const [updates, setUpdates] = useState<GoalUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const fetchUpdates = useCallback(async (reset = false) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;

      let data: GoalUpdate[];
      if (goalId) {
        data = await GoalUpdatesService.getGoalUpdates(goalId);
        setHasMore(false);
      } else {
        data = await GoalUpdatesService.getFeedUpdates({
          feedType,
          userId: user.id,
          limit: LIMIT,
          offset: currentOffset
        });
        setHasMore(data.length === LIMIT);
      }

      if (reset) {
        setUpdates(data);
        setOffset(LIMIT);
      } else {
        setUpdates(prev => [...prev, ...data]);
        setOffset(prev => prev + LIMIT);
      }
    } catch (error) {
      console.error('Error fetching goal updates:', error);
      toast.error('Failed to load updates');
    } finally {
      setLoading(false);
    }
  }, [user, feedType, goalId, offset]);

  // Refetch when dependencies change - use a stable key for the effect
  useEffect(() => {
    setOffset(0);
    fetchUpdates(true);
  }, [user?.id, feedType, goalId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchUpdates(false);
    }
  }, [loading, hasMore, fetchUpdates]);

  const refresh = useCallback(() => {
    fetchUpdates(true);
  }, [fetchUpdates]);

  const toggleCheer = useCallback(async (updateId: string, cheerType: CheerType, message?: string) => {
    if (!user) return;

    // Optimistic update
    setUpdates(prev => prev.map(update => {
      if (update.id !== updateId) return update;

      const wasMyCheer = update.user_has_cheered && update.user_cheer_type === cheerType;
      return {
        ...update,
        user_has_cheered: !wasMyCheer,
        user_cheer_type: wasMyCheer ? null : cheerType,
        cheers_count: wasMyCheer 
          ? Math.max(0, (update.cheers_count || 0) - 1)
          : (update.cheers_count || 0) + (update.user_has_cheered ? 0 : 1)
      };
    }));

    try {
      await GoalUpdatesService.toggleCheer(updateId, user.id, cheerType, message);
    } catch (error) {
      console.error('Error toggling cheer:', error);
      // Revert on error
      fetchUpdates(true);
    }
  }, [user, fetchUpdates]);

  const addComment = useCallback(async (updateId: string, message: string): Promise<GoalUpdateComment | null> => {
    if (!user) return null;

    try {
      const comment = await GoalUpdatesService.addComment(updateId, user.id, message);
      
      // Update comment count
      setUpdates(prev => prev.map(update => 
        update.id === updateId 
          ? { ...update, comments_count: (update.comments_count || 0) + 1 }
          : update
      ));

      return comment;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      return null;
    }
  }, [user]);

  return {
    updates,
    loading,
    hasMore,
    loadMore,
    refresh,
    toggleCheer,
    addComment
  };
};
