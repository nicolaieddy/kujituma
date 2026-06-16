import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { isNetworkError, queueOfflineMutation } from "@/utils/offlineUtils";
import { toast } from "@/hooks/use-toast";

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_on: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  waist_cm: number | null;
  resting_hr: number | null;
  source: string;
  notes: string | null;
}

export interface NewBodyMeasurement {
  measured_on: string;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  lean_mass_kg?: number | null;
  waist_cm?: number | null;
  resting_hr?: number | null;
  notes?: string | null;
}

export function useBodyMeasurements(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useOfflineQuery<BodyMeasurement[]>({
    queryKey: ["body-measurements", user?.id, startDate ?? "all", endDate ?? "all"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", user!.id)
        .order("measured_on", { ascending: true });
      if (startDate) q = q.gte("measured_on", startDate);
      if (endDate) q = q.lte("measured_on", endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BodyMeasurement[];
    },
  });
}

export function useAddBodyMeasurement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBodyMeasurement) => {
      if (!user?.id) throw new Error("Not authenticated");
      const payload = { user_id: user.id, source: "manual" as const, ...input };
      try {
        const { error } = await supabase.from("body_measurements").insert(payload);
        if (error) throw error;
        return { wasOffline: false };
      } catch (err) {
        if (isNetworkError(err)) {
          await queueOfflineMutation("create", "body_measurements", {
            id: crypto.randomUUID(),
            ...payload,
          });
          return { wasOffline: true };
        }
        throw err;
      }
    },
    onSuccess: ({ wasOffline }) => {
      qc.invalidateQueries({ queryKey: ["body-measurements"] });
      if (wasOffline) {
        toast({ title: "Saved offline", description: "Will sync when you're back online." });
      }
    },
  });
}

export function useDeleteBodyMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("body_measurements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-measurements"] }),
  });
}
