import { useQuery } from "@tanstack/react-query";
import { unifiedPostsService } from "@/services/unifiedPostsService";
import { useAuth } from "@/contexts/AuthContext";

export const useWeeklyFeedPost = (currentWeekStart: string) => {
  const { user } = useAuth();

  // Fetch feed post for this week to check if it's been posted
  const { data: feedPost = null } = useQuery({
    queryKey: ['week-feed-post', user?.id, currentWeekStart],
    queryFn: async () => {
      if (!user?.id) return null;
      console.log('Fetching feed post for user:', user.id, 'week:', currentWeekStart);
      return unifiedPostsService.getPostByWeek(user.id, currentWeekStart);
    },
    enabled: !!user?.id && !!currentWeekStart,
  });

  return {
    feedPost,
  };
};