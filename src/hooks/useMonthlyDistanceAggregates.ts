import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyAggregate {
  month: string;          // YYYY-MM-01
  sport: string;
  distance_km: number;
  source: string;
}

/** Imported monthly distance totals (e.g. Garmin Connect CSV) for the current user. */
export function useMonthlyDistanceAggregates(sport: string = "Running") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["monthly-distance-aggregates", user?.id, sport],
    enabled: !!user,
    queryFn: async (): Promise<MonthlyAggregate[]> => {
      const { data, error } = await supabase
        .from("monthly_distance_aggregates")
        .select("month, sport, distance_km, source")
        .eq("user_id", user!.id)
        .eq("sport", sport)
        .order("month", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        month: r.month,
        sport: r.sport,
        distance_km: Number(r.distance_km || 0),
        source: r.source,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
