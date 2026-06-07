import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyMoodPoint {
  check_in_date: string;
  mood_rating: number | null;
  energy_level: number | null;
}

export function useMoodByDay(startDate: string, endDate: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mood-by-day", user?.id, startDate, endDate],
    enabled: !!user && !!startDate && !!endDate,
    queryFn: async (): Promise<DailyMoodPoint[]> => {
      const { data, error } = await supabase
        .from("daily_check_ins")
        .select("check_in_date, mood_rating, energy_level")
        .eq("user_id", user!.id)
        .gte("check_in_date", startDate)
        .lte("check_in_date", endDate)
        .order("check_in_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyMoodPoint[];
    },
  });
}
