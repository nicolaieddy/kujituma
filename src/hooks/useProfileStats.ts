import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfileStats {
  goalsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  weeksShared: number;
}

export const useProfileStats = (userId: string) => {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async (): Promise<ProfileStats> => {
      const [goalsResult, streaksResult, postsResult] = await Promise.all([
        // Count completed goals
        supabase
          .from('goals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed'),
        
        // Get user streaks
        supabase
          .from('user_streaks')
          .select('current_weekly_streak, longest_weekly_streak')
          .eq('user_id', userId)
          .maybeSingle(),
        
        // Count shared posts (weeks shared)
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('hidden', false)
      ]);

      return {
        goalsCompleted: goalsResult.count || 0,
        currentStreak: streaksResult.data?.current_weekly_streak || 0,
        longestStreak: streaksResult.data?.longest_weekly_streak || 0,
        weeksShared: postsResult.count || 0
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
