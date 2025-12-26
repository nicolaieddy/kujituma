import { useQuery } from "@tanstack/react-query";
import { unifiedPostsService } from "@/services/unifiedPostsService";
import { useAuth } from "@/contexts/AuthContext";

export const useWeeklyFeedPost = (currentWeekStart: string) => {
  const { user } = useAuth();

  const { data: feedPost = null } = useQuery({
    queryKey: ['week-feed-post', user?.id, currentWeekStart],
    queryFn: () => user?.id ? unifiedPostsService.getPostByWeek(user.id, currentWeekStart) : null,
    enabled: !!user?.id && !!currentWeekStart,
  });

  return { feedPost };
};