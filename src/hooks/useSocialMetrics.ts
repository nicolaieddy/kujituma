import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/social";

export interface SocialPostMetric {
  id: string;
  user_id: string;
  post_id: string;
  platform: SocialPlatform;
  metrics_as_of: string;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  reach: number | null;
  profile_views: number | null;
  followers_gained: number | null;
  saves: number | null;
  sends: number | null;
  link_clicks: number | null;
  engagement_rate: number | null;
  created_at: string;
}

const KEY = ["social-post-metrics"] as const;

export function useSocialPostMetrics(postId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, postId],
    queryFn: async (): Promise<SocialPostMetric[]> => {
      if (!user || !postId) return [];
      const { data, error } = await supabase
        .from("social_post_metrics")
        .select("*")
        .eq("post_id", postId)
        .order("metrics_as_of", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SocialPostMetric[];
    },
    enabled: !!user && !!postId,
  });
}

export function useLatestMetricsByPost() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["social-post-latest-metrics", user?.id],
    queryFn: async (): Promise<Record<string, SocialPostMetric>> => {
      if (!user) return {};
      const { data, error } = await supabase
        .from("social_post_latest_metrics")
        .select("*");
      if (error) throw error;
      const map: Record<string, SocialPostMetric> = {};
      for (const row of (data ?? []) as SocialPostMetric[]) {
        const existing = map[row.post_id];
        if (!existing || (row.engagement_rate ?? 0) > (existing.engagement_rate ?? 0)) {
          map[row.post_id] = row;
        }
      }
      return map;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useUpsertMetricSnapshot() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<SocialPostMetric, "id" | "user_id" | "created_at" | "engagement_rate">) => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = { ...input, user_id: user.id };
      const { data, error } = await supabase
        .from("social_post_metrics")
        .upsert(payload, { onConflict: "post_id,metrics_as_of,platform" })
        .select()
        .single();
      if (error) throw error;
      return data as SocialPostMetric;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["social-post-latest-metrics"] });
      qc.invalidateQueries({ queryKey: ["social-posts"] });
    },
    onError: (e: any) => toast.error("Couldn't save snapshot", { description: e.message }),
  });
}

export function useDeleteMetricSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_post_metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["social-post-latest-metrics"] });
    },
  });
}
