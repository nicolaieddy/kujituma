import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, format, subWeeks, addWeeks } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";
import { mergeActivitiesIntoSessions } from "@/components/thisweek/trainingPlanUtils";

export interface WeeklyRunningBucket {
  week_start: string; // YYYY-MM-DD (Monday)
  total_km: number;
  run_count: number;
  total_duration_min: number;
}

/**
 * Sum km/week of running activities (Run, TrailRun, VirtualRun, treadmill) over the
 * trailing `weeks` weeks. Set `weeks` to a large number (or omit) for "all time".
 */
export function useWeeklyRunningKm(weeks?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weekly-running-km", user?.id, weeks ?? "all"],
    enabled: !!user,
    queryFn: async (): Promise<WeeklyRunningBucket[]> => {
      let query = supabase
        .from("synced_activities")
        .select("id, source, activity_type, sport_type, activity_date, start_date, distance_meters, duration_seconds")
        .eq("user_id", user!.id);

      if (weeks && weeks > 0) {
        const since = format(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weeks - 1), "yyyy-MM-dd");
        query = query.gte("start_date", `${since}T00:00:00Z`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const isRun = (t?: string | null) => {
        const s = (t || "").toLowerCase();
        return /run|trail|treadmill/.test(s);
      };

      const runRows = (data ?? []).filter(
        (row: any) => isRun(row.activity_type) || isRun(row.sport_type),
      );

      // Dedupe: Strava + .FIT for the same physical session are stored as separate rows.
      // Merge them and count each session once (prefer Strava distance/duration when present).
      const sessions = mergeActivitiesIntoSessions(runRows);

      const buckets = new Map<string, WeeklyRunningBucket>();

      sessions.forEach((session) => {
        const stravaRow = session.activities.find((a: any) => a.source !== "fit_upload");
        const primary = stravaRow || session.displayActivity;
        const localDate = primary.activity_date
          ? parseLocalDate(primary.activity_date)
          : new Date(primary.start_date);
        const wk = format(startOfWeek(localDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const km = Number(primary.distance_meters || 0) / 1000;
        const min = Number(primary.duration_seconds || 0) / 60;
        const existing = buckets.get(wk) ?? { week_start: wk, total_km: 0, run_count: 0, total_duration_min: 0 };
        existing.total_km += km;
        existing.run_count += 1;
        existing.total_duration_min += min;
        buckets.set(wk, existing);
      });

      // Fill missing weeks with zeros when a window is specified so the chart shows gaps clearly.
      if (weeks && weeks > 0) {
        const start = startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 1 });
        for (let i = 0; i < weeks; i++) {
          const wk = format(addWeeks(start, i), "yyyy-MM-dd");
          if (!buckets.has(wk)) {
            buckets.set(wk, { week_start: wk, total_km: 0, run_count: 0, total_duration_min: 0 });
          }
        }
      }

      return Array.from(buckets.values())
        .map((b) => ({
          ...b,
          total_km: Math.round(b.total_km * 10) / 10,
          total_duration_min: Math.round(b.total_duration_min),
        }))
        .sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
    },
    staleTime: 5 * 60 * 1000,
  });
}
