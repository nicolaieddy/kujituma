import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GoalFollowsService } from '@/services/goalFollowsService';
import { GoalFollow } from '@/types/goalUpdates';
import { toast } from 'sonner';

export const useGoalFollows = () => {
  const { user } = useAuth();
  const [followedGoals, setFollowedGoals] = useState<GoalFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());

  const fetchFollowedGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await GoalFollowsService.getFollowedGoals(user.id);
      setFollowedGoals(data);
      
      const map = new Map<string, boolean>();
      data.forEach(f => map.set(f.goal_id, true));
      setFollowingMap(map);
    } catch (error) {
      console.error('Error fetching followed goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFollowedGoals();
  }, [fetchFollowedGoals]);

  const isFollowing = useCallback((goalId: string): boolean => {
    return followingMap.get(goalId) || false;
  }, [followingMap]);

  const toggleFollow = useCallback(async (goalId: string, goalTitle?: string): Promise<boolean> => {
    if (!user) return false;

    const wasFollowing = followingMap.get(goalId) || false;
    
    // Optimistic update
    setFollowingMap(prev => {
      const next = new Map(prev);
      next.set(goalId, !wasFollowing);
      return next;
    });

    try {
      const isNowFollowing = await GoalFollowsService.toggleFollow(user.id, goalId);
      
      if (isNowFollowing) {
        toast.success(`Following "${goalTitle || 'goal'}"`);
      } else {
        toast.success(`Unfollowed "${goalTitle || 'goal'}"`);
      }

      // Refresh the list
      fetchFollowedGoals();
      return isNowFollowing;
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
      
      // Revert
      setFollowingMap(prev => {
        const next = new Map(prev);
        next.set(goalId, wasFollowing);
        return next;
      });
      return wasFollowing;
    }
  }, [user, followingMap, fetchFollowedGoals]);

  return {
    followedGoals,
    loading,
    isFollowing,
    toggleFollow,
    refresh: fetchFollowedGoals
  };
};
