import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Supplement {
  id: string;
  user_id: string;
  name: string;
  dose: number | null;
  dose_unit: string | null;
  schedule: string;
  schedule_config: Record<string, unknown>;
  started_on: string | null;
  archived_at: string | null;
  notes: string | null;
}

export interface SupplementLog {
  id: string;
  supplement_id: string;
  taken_on: string;
  taken: boolean;
  notes: string | null;
}

export interface NewSupplementInput {
  name: string;
  dose?: number | null;
  dose_unit?: string | null;
  schedule?: string;
  started_on?: string | null;
  notes?: string | null;
}

export function useSupplements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["supplements", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Supplement[]> => {
      const { data, error } = await supabase
        .from("supplements")
        .select("*")
        .eq("user_id", user!.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Supplement[];
    },
  });
}

export function useSupplementLogs(startDate: string, endDate: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["supplement-logs", user?.id, startDate, endDate],
    enabled: !!user && !!startDate && !!endDate,
    queryFn: async (): Promise<SupplementLog[]> => {
      const { data, error } = await supabase
        .from("supplement_logs")
        .select("*")
        .eq("user_id", user!.id)
        .gte("taken_on", startDate)
        .lte("taken_on", endDate);
      if (error) throw error;
      return (data ?? []) as SupplementLog[];
    },
  });
}

export function useAddSupplement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSupplementInput) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("supplements").insert({
        user_id: user.id,
        name: input.name,
        dose: input.dose ?? null,
        dose_unit: input.dose_unit ?? null,
        schedule: input.schedule ?? "daily",
        started_on: input.started_on ?? null,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements"] }),
  });
}

export function useArchiveSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplements")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements"] }),
  });
}

export function useToggleSupplementLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplement_id,
      taken_on,
      taken,
    }: {
      supplement_id: string;
      taken_on: string;
      taken: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!taken) {
        const { error } = await supabase
          .from("supplement_logs")
          .delete()
          .eq("supplement_id", supplement_id)
          .eq("taken_on", taken_on);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("supplement_logs")
        .upsert(
          { user_id: user.id, supplement_id, taken_on, taken: true },
          { onConflict: "supplement_id,taken_on" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplement-logs"] }),
  });
}
