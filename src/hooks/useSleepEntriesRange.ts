import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, differenceInDays } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";
import type { SleepEntry } from "@/hooks/useWeekSleepEntries";

export interface SleepRangeStats {
  rows: SleepEntry[];
  byDate: Record<string, SleepEntry>;
  avgScore: number | null;
  avgDurationSeconds: number | null;
  avgBedtimeMinutes: number | null; // minutes from midnight (can be negative if pre-midnight, normalized below)
  avgWakeMinutes: number | null;
  inBandCount: number;
  totalNights: number;
  currentStreak: number;
  bestStreak: number;
  /** Target bedtime window in minutes from midnight (v1 hardcoded). */
  targetCenterMin: number;
  targetToleranceMin: number;
}

const TARGET_CENTER_MIN = 22 * 60 + 30; // 22:30
const TARGET_TOLERANCE_MIN = 30;

/** Convert "HH:MM:SS" → minutes from midnight, treating early-morning (<6h) as next-day. */
export function bedtimeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  let total = h * 60 + min;
  // If bedtime is past midnight (e.g. 01:15), shift forward so it sorts after 23:00.
  if (total < 6 * 60) total += 24 * 60;
  return total;
}

export function isInBand(bedtimeMin: number | null): boolean {
  if (bedtimeMin == null) return false;
  return Math.abs(bedtimeMin - TARGET_CENTER_MIN) <= TARGET_TOLERANCE_MIN;
}

export function formatMinutes(min: number | null): string | null {
  if (min == null) return null;
  let m = Math.round(min) % (24 * 60);
  if (m < 0) m += 24 * 60;
  let hour = Math.floor(m / 60);
  const minute = String(m % 60).padStart(2, "0");
  const meridian = hour >= 12 && hour < 24 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${meridian}`;
}

/**
 * Fetch sleep entries between [startDate, endDate] inclusive (yyyy-MM-dd) and
 * compute aggregate stats + bedtime consistency streaks. Computed entirely
 * client-side from a single query — no extra DB work.
 */
export function useSleepEntriesRange(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useOfflineQuery<SleepRangeStats>({
    queryKey: ["sleep-entries", "range", startDate, endDate, user?.id],
    enabled: !!user && !!startDate && !!endDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_entries")
        .select(
          "id, sleep_date, score, quality, duration_seconds, sleep_need_seconds, bedtime, wake_time, resting_heart_rate, body_battery, pulse_ox, respiration, skin_temp_change, hrv_status, sleep_alignment",
        )
        .eq("user_id", user!.id)
        .gte("sleep_date", startDate)
        .lte("sleep_date", endDate)
        .order("sleep_date", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as SleepEntry[];
      const byDate: Record<string, SleepEntry> = {};
      rows.forEach((r) => {
        byDate[r.sleep_date] = r;
      });

      // Aggregates
      const scores = rows.map((r) => r.score).filter((s): s is number => s != null);
      const durations = rows.map((r) => r.duration_seconds).filter((s): s is number => s != null);
      const bedtimes = rows.map((r) => bedtimeToMinutes(r.bedtime)).filter((m): m is number => m != null);
      const wakes = rows.map((r) => bedtimeToMinutes(r.wake_time)).filter((m): m is number => m != null);

      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

      // Bedtime consistency: iterate every date in the range; missing or out-of-band → reset.
      const totalDays = differenceInDays(parseLocalDate(endDate), parseLocalDate(startDate)) + 1;
      let current = 0;
      let best = 0;
      let inBandCount = 0;

      for (let i = 0; i < totalDays; i++) {
        const d = format(addDays(parseLocalDate(startDate), i), "yyyy-MM-dd");
        const entry = byDate[d];
        const inBand = entry ? isInBand(bedtimeToMinutes(entry.bedtime)) : false;
        if (inBand) {
          current += 1;
          inBandCount += 1;
          if (current > best) best = current;
        } else {
          current = 0;
        }
      }

      // "Current streak" should mean trailing streak ending on the most recent
      // day in the range. The loop above already ends on endDate.
      const currentStreak = current;

      return {
        rows,
        byDate,
        avgScore: avg(scores),
        avgDurationSeconds: avg(durations),
        avgBedtimeMinutes: avg(bedtimes),
        avgWakeMinutes: avg(wakes),
        inBandCount,
        totalNights: rows.length,
        currentStreak,
        bestStreak: best,
        targetCenterMin: TARGET_CENTER_MIN,
        targetToleranceMin: TARGET_TOLERANCE_MIN,
      };
    },
  });
}
