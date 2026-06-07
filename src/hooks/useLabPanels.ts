import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LabMarkerValue {
  id: string;
  lab_result_id: string;
  marker_key: string;
  marker_label: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  flag: string | null;
}

export interface LabPanel {
  id: string;
  user_id: string;
  taken_on: string;
  panel_name: string;
  lab_provider: string | null;
  notes: string | null;
  values: LabMarkerValue[];
}

export interface NewLabPanelInput {
  taken_on: string;
  panel_name: string;
  lab_provider?: string | null;
  notes?: string | null;
  values: Omit<LabMarkerValue, "id" | "lab_result_id" | "flag">[];
}

function computeFlag(v: Pick<LabMarkerValue, "value_numeric" | "reference_low" | "reference_high">): string | null {
  if (v.value_numeric == null) return null;
  if (v.reference_low != null && v.value_numeric < v.reference_low) return "low";
  if (v.reference_high != null && v.value_numeric > v.reference_high) return "high";
  if (v.reference_low != null || v.reference_high != null) return "normal";
  return null;
}

export function useLabPanels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lab-panels", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LabPanel[]> => {
      const { data, error } = await supabase
        .from("lab_results")
        .select("*, values:lab_result_values(*)")
        .eq("user_id", user!.id)
        .order("taken_on", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((row) => ({
        ...row,
        values: (row.values ?? []).sort((a: LabMarkerValue, b: LabMarkerValue) =>
          a.marker_label.localeCompare(b.marker_label),
        ),
      }));
    },
  });
}

export function useAddLabPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewLabPanelInput) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: panel, error } = await supabase
        .from("lab_results")
        .insert({
          user_id: user.id,
          taken_on: input.taken_on,
          panel_name: input.panel_name,
          lab_provider: input.lab_provider ?? null,
          notes: input.notes ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (input.values.length > 0) {
        const rows = input.values.map((v) => ({
          lab_result_id: panel.id,
          marker_key: v.marker_key,
          marker_label: v.marker_label,
          value_numeric: v.value_numeric,
          value_text: v.value_text,
          unit: v.unit,
          reference_low: v.reference_low,
          reference_high: v.reference_high,
          flag: computeFlag(v),
        }));
        const { error: insErr } = await supabase.from("lab_result_values").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-panels"] }),
  });
}

export function useDeleteLabPanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-panels"] }),
  });
}
