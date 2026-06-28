import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/social";

export interface FollowerGrowthRow {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  date: string;
  total_followers: number;
  net_new: number | null;
  note: string | null;
  created_at: string;
}

const KEY = ["social-follower-growth"] as const;

export function useFollowerGrowth(platform?: SocialPlatform) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id, platform ?? "all"],
    queryFn: async (): Promise<FollowerGrowthRow[]> => {
      if (!user) return [];
      let q = supabase
        .from("social_follower_growth")
        .select("*")
        .order("date", { ascending: true });
      if (platform) q = q.eq("platform", platform);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FollowerGrowthRow[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useLogFollowerCount() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { platform: SocialPlatform; date: string; total_followers: number; note?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const payload = { ...input, user_id: user.id };
      const { data, error } = await supabase
        .from("social_follower_growth")
        .upsert(payload, { onConflict: "user_id,platform,date" })
        .select()
        .single();
      if (error) throw error;
      // Also cache on platform settings for fast UI reads.
      await supabase
        .from("social_platform_settings")
        .upsert(
          { user_id: user.id, platform: input.platform, current_followers_cached: input.total_followers },
          { onConflict: "user_id,platform" },
        );
      return data as FollowerGrowthRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["social-platform-settings"] });
      toast.success("Follower count logged");
    },
    onError: (e: any) => toast.error("Couldn't log count", { description: e.message }),
  });
}
