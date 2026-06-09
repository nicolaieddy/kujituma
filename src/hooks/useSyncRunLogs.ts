import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SyncProvider = "garmin" | "strava" | "fit_upload" | "sleep_csv";

export interface SyncItem {
  kind: string;
  ref?: string | null;
  ok: boolean;
  status?: string;
  message?: string | null;
  summary?: Record<string, unknown> | null;
}

export interface SyncRunLog {
  id: string;
  provider: SyncProvider;
  trigger: string;
  status: "success" | "partial" | "failed" | "rate_limited" | "running";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  counters: Record<string, number>;
  items: SyncItem[];
  error: string | null;
}

export function useSyncRunLogs(provider: SyncProvider, limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sync-run-logs", provider, user?.id, limit],
    queryFn: async (): Promise<SyncRunLog[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("sync_run_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("[useSyncRunLogs]", error);
        return [];
      }
      return (data ?? []) as SyncRunLog[];
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}
