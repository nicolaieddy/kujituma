import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, parseISO } from "date-fns";

export interface DailyCheckInSummary {
  date: string;
  mood_rating: number | null;
  energy_level: number | null;
  quick_win: string | null;
  blocker: string | null;
  focus_today: string | null;
}

export interface DayHabitData {
  date: string;
  count: number;
}

export interface HistoricalWeekData {
  // Daily check-ins
  checkIns: DailyCheckInSummary[];
  checkInCount: number;
  avgMood: number | null;
  avgEnergy: number | null;

  // Habit completions
  habitCompletions: number;
  habitCompletionsByDay: DayHabitData[];
  totalHabitSlots: number; // total possible completions (habits * days active)

  // Loading
  isLoading: boolean;
}

export const useHistoricalWeekData = (weekStart: string) => {
  const { user } = useAuth();
  const weekEnd = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["historical-week-data", user?.id, weekStart],
    queryFn: async () => {
      // Fetch check-ins and habit completions in parallel
      const [checkInsResult, habitCompletionsResult, goalsResult] = await Promise.all([
        supabase
          .from("daily_check_ins")
          .select("check_in_date, mood_rating, energy_level, quick_win, blocker, focus_today")
          .gte("check_in_date", weekStart)
          .lte("check_in_date", weekEnd)
          .order("check_in_date", { ascending: true }),
        supabase
          .from("habit_completions")
          .select("completion_date, habit_item_id")
          .gte("completion_date", weekStart)
          .lte("completion_date", weekEnd),
        supabase
          .from("goals")
          .select("id, habit_items, is_recurring, status, recurrence_frequency")
          .eq("is_recurring", true)
          .in("status", ["in_progress", "not_started"]),
      ]);

      const checkIns: DailyCheckInSummary[] = (checkInsResult.data || []).map((c) => ({
        date: c.check_in_date,
        mood_rating: c.mood_rating,
        energy_level: c.energy_level,
        quick_win: c.quick_win,
        blocker: c.blocker,
        focus_today: c.focus_today,
      }));

      // Mood/energy averages
      const moodValues = checkIns.filter((c) => c.mood_rating != null).map((c) => c.mood_rating!);
      const energyValues = checkIns.filter((c) => c.energy_level != null).map((c) => c.energy_level!);
      const avgMood = moodValues.length > 0 ? Math.round((moodValues.reduce((a, b) => a + b, 0) / moodValues.length) * 10) / 10 : null;
      const avgEnergy = energyValues.length > 0 ? Math.round((energyValues.reduce((a, b) => a + b, 0) / energyValues.length) * 10) / 10 : null;

      // Habit completions by day
      const completionsByDay = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const day = format(addDays(parseISO(weekStart), i), "yyyy-MM-dd");
        completionsByDay.set(day, 0);
      }
      (habitCompletionsResult.data || []).forEach((hc) => {
        const current = completionsByDay.get(hc.completion_date) || 0;
        completionsByDay.set(hc.completion_date, current + 1);
      });

      const habitCompletionsByDay: DayHabitData[] = Array.from(completionsByDay.entries()).map(
        ([date, count]) => ({ date, count })
      );

      // Count total habit items across all recurring goals for total possible slots
      let totalHabitItems = 0;
      (goalsResult.data || []).forEach((goal) => {
        const items = Array.isArray(goal.habit_items) ? goal.habit_items : [];
        totalHabitItems += items.length;
      });
      // Rough estimate: each daily habit = 7 slots, weekly = 1 slot
      const totalHabitSlots = Math.max(totalHabitItems * 7, 1);

      return {
        checkIns,
        checkInCount: checkIns.length,
        avgMood,
        avgEnergy,
        habitCompletions: habitCompletionsResult.data?.length || 0,
        habitCompletionsByDay,
        totalHabitSlots,
      };
    },
    enabled: !!user && !!weekStart,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    checkIns: data?.checkIns || [],
    checkInCount: data?.checkInCount || 0,
    avgMood: data?.avgMood ?? null,
    avgEnergy: data?.avgEnergy ?? null,
    habitCompletions: data?.habitCompletions || 0,
    habitCompletionsByDay: data?.habitCompletionsByDay || [],
    totalHabitSlots: data?.totalHabitSlots || 1,
    isLoading,
  } as HistoricalWeekData;
};
