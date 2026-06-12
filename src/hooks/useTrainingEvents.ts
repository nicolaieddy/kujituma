import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TrainingEventType = "injury_illness" | "race" | "other";

export interface TrainingEvent {
  id: string;
  user_id: string;
  event_type: TrainingEventType;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  severity: number | null;
  body_part: string | null;
  race_distance: string | null;
  race_result: string | null;
  race_priority: "A" | "B" | "C" | null;
  official_time_seconds: number | null;
  location: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type TrainingEventInput = Omit<
  TrainingEvent,
  "id" | "user_id" | "created_at" | "updated_at" | "metadata"
> & { id?: string; metadata?: Record<string, unknown> };

const KEY = ["training-events"] as const;

export function useTrainingEvents() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<TrainingEvent[]> => {
      const { data, error } = await supabase
        .from("training_events")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrainingEvent[];
    },
  });
}

export function useUpsertTrainingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TrainingEventInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const payload: any = {
        ...input,
        user_id: userData.user.id,
      };
      delete payload.id;

      if (input.id) {
        const { data, error } = await supabase
          .from("training_events")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("training_events")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: "Event saved" });
    },
    onError: (e: any) => toast({ title: "Could not save event", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTrainingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: "Event deleted" });
    },
  });
}
