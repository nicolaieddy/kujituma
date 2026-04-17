import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";

export interface SleepEntry {
  id: string;
  sleep_date: string;
  score: number | null;
  quality: string | null;
  duration_seconds: number | null;
  sleep_need_seconds: number | null;
  bedtime: string | null;
  wake_time: string | null;
  resting_heart_rate: number | null;
  body_battery: number | null;
  pulse_ox: number | null;
  respiration: number | null;
  skin_temp_change: number | null;
  hrv_status: string | null;
  sleep_alignment: string | null;
}

/**
 * Fetch sleep entries for a given week (Monday weekStart, 7 days inclusive)
 * keyed by date string for fast lookup.
 */
export function useWeekSleepEntries(weekStart: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sleep-entries", "week", weekStart, user?.id],
    queryFn: async (): Promise<Record<string, SleepEntry>> => {
      if (!user || !weekStart) return {};
      const start = weekStart;
      const end = format(addDays(parseLocalDate(weekStart), 6), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("sleep_entries")
        .select("id, sleep_date, score, quality, duration_seconds, sleep_need_seconds, bedtime, wake_time, resting_heart_rate, body_battery, pulse_ox, respiration, skin_temp_change, hrv_status, sleep_alignment")
        .eq("user_id", user.id)
        .gte("sleep_date", start)
        .lte("sleep_date", end);

      if (error) throw error;

      const map: Record<string, SleepEntry> = {};
      (data || []).forEach((entry: any) => {
        map[entry.sleep_date] = entry;
      });
      return map;
    },
    enabled: !!user && !!weekStart,
  });
}
