import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, format } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";

export interface WeeklyTrainingLoad {
  week_start: string; // yyyy-MM-dd (Monday)
  total_km: number;
}

/**
 * Bucket synced_activities by ISO week (Monday start), summing distance in km.
 */
export function useTrainingLoadByWeek(startDate: string, endDate: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["training-load-weekly", user?.id, startDate, endDate],
    enabled: !!user && !!startDate && !!endDate,
    queryFn: async (): Promise<WeeklyTrainingLoad[]> => {
      const { data, error } = await supabase
        .from("synced_activities")
        .select("activity_date, distance_meters")
        .eq("user_id", user!.id)
        .gte("activity_date", startDate)
        .lte("activity_date", endDate);
      if (error) throw error;

      const buckets = new Map<string, number>();
      (data ?? []).forEach((row: any) => {
        if (!row.activity_date || row.distance_meters == null) return;
        const weekStart = format(
          startOfWeek(parseLocalDate(row.activity_date), { weekStartsOn: 1 }),
          "yyyy-MM-dd",
        );
        const km = Number(row.distance_meters) / 1000;
        buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + km);
      });

      return Array.from(buckets.entries())
        .map(([week_start, total_km]) => ({ week_start, total_km: Math.round(total_km * 10) / 10 }))
        .sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
    },
  });
}
