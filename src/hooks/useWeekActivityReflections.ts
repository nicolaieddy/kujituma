import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format } from "date-fns";

export interface WeekReflection {
  id: string;
  activity_name: string;
  start_date: string;
  reflection: string;
}

/**
 * Fetches all activity reflections for the week (Mon–Sun) starting at weekStart (YYYY-MM-DD).
 * Read-only roll-up used by the weekly planning ritual.
 */
export function useWeekActivityReflections(weekStart: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-reflections-week", user?.id, weekStart],
    queryFn: async (): Promise<WeekReflection[]> => {
      if (!user) return [];
      const start = `${weekStart}T00:00:00`;
      const endDate = addDays(new Date(`${weekStart}T00:00:00`), 7);
      const end = `${format(endDate, "yyyy-MM-dd")}T00:00:00`;

      const { data, error } = await supabase
        .from("synced_activities")
        .select("id, activity_name, start_date, reflection")
        .eq("user_id", user.id)
        .not("reflection", "is", null)
        .gte("start_date", start)
        .lt("start_date", end)
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Failed to fetch week reflections:", error);
        return [];
      }
      return (data || []).filter((r: any) => r.reflection?.trim()) as WeekReflection[];
    },
    enabled: !!user && !!weekStart,
    staleTime: 1000 * 60,
  });
}
