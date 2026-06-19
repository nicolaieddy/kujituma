import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseLocalDate } from "@/utils/dateUtils";
import { mergeActivitiesIntoSessions } from "@/components/thisweek/trainingPlanUtils";

export interface RunningSession {
  /** Local calendar date the run happened on (YYYY-MM-DD) */
  date: string;
  /** JS Date at noon local on that date (safe for bucketing). */
  localDate: Date;
  distance_km: number;
  duration_min: number;
}

/**
 * Returns every running session for the user, deduplicated across
 * Strava + .FIT uploads. Use this as the canonical source for any
 * weekly/monthly/yearly aggregation of running volume.
 */
export function useRunningSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["running-sessions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RunningSession[]> => {
      const isRun = (t?: string | null) => /run|trail|treadmill/i.test(t || "");

      // Paginate to bypass PostgREST default 1000 row cap.
      const pageSize = 1000;
      let from = 0;
      let all: any[] = [];
      // Up to 20k activities (more than enough).
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase
          .from("synced_activities")
          .select("id, source, activity_type, sport_type, activity_date, start_date, distance_meters, duration_seconds")
          .eq("user_id", user!.id)
          .order("start_date", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        all = all.concat(data ?? []);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      const runRows = all.filter(
        (row: any) => isRun(row.activity_type) || isRun(row.sport_type),
      );

      const sessions = mergeActivitiesIntoSessions(runRows);

      return sessions.map((s) => {
        const stravaRow = s.activities.find((a: any) => a.source !== "fit_upload");
        const primary = stravaRow || s.displayActivity;
        const dateStr: string = primary.activity_date
          ? primary.activity_date
          : (primary.start_date as string).slice(0, 10);
        return {
          date: dateStr,
          localDate: parseLocalDate(dateStr),
          distance_km: Number(primary.distance_meters || 0) / 1000,
          duration_min: Number(primary.duration_seconds || 0) / 60,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}
