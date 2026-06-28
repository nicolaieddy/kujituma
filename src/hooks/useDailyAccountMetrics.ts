import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/social";

export interface DailyAccountMetricRow {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  date: string;
  impressions: number | null;
  engagements: number | null;
  members_reached: number | null;
  new_followers: number | null;
  source: string | null;
  created_at: string;
}

export interface DailyAccountMetricInput {
  platform: SocialPlatform;
  date: string;
  impressions?: number | null;
  engagements?: number | null;
  members_reached?: number | null;
  new_followers?: number | null;
  source?: string | null;
}

const KEY = ["social-daily-account-metrics"] as const;

export function useDailyAccountMetrics(platform?: SocialPlatform) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id, platform ?? "all"],
    queryFn: async (): Promise<DailyAccountMetricRow[]> => {
      if (!user) return [];
      let q = (supabase as any)
        .from("social_daily_account_metrics")
        .select("*")
        .order("date", { ascending: true });
      if (platform) q = q.eq("platform", platform);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DailyAccountMetricRow[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useBulkUpsertDailyMetrics() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rows: DailyAccountMetricInput[]) => {
      if (!user) throw new Error("Not authenticated");
      if (rows.length === 0) return [];
      const payload = rows.map((r) => ({ ...r, user_id: user.id }));
      // chunk to avoid payload limits
      const chunks: typeof payload[] = [];
      for (let i = 0; i < payload.length; i += 500) chunks.push(payload.slice(i, i + 500));
      for (const c of chunks) {
        const { error } = await (supabase as any)
          .from("social_daily_account_metrics")
          .upsert(c, { onConflict: "user_id,platform,date" });
        if (error) throw error;
      }
      return payload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: any) => toast.error("Couldn't save metrics", { description: e.message }),
  });
}
