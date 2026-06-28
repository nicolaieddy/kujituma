import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SocialGoal, GoalMetric } from "@/lib/socialGoals";
import type { SocialPlatform } from "@/lib/social";

const KEY = ["social-goals"] as const;

export function useSocialGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    queryFn: async (): Promise<SocialGoal[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("social_goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SocialGoal[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export interface UpsertSocialGoalInput {
  id?: string;
  platform: SocialPlatform;
  metric: GoalMetric;
  start_date: string;
  start_value: number;
  target_value: number;
  target_date: string;
  notes?: string | null;
  mirrorToGoals?: boolean;
}

export function useUpsertSocialGoal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertSocialGoalInput) => {
      if (!user) throw new Error("Not authenticated");

      // Editing an existing goal — straight update, no archive flow.
      if (input.id) {
        const { data, error } = await (supabase as any)
          .from("social_goals")
          .update({
            start_date: input.start_date,
            start_value: input.start_value,
            target_value: input.target_value,
            target_date: input.target_date,
            notes: input.notes ?? null,
          })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data as SocialGoal;
      }

      // New goal: archive any existing active goal for (platform, metric) first.
      const { error: archiveError } = await (supabase as any)
        .from("social_goals")
        .update({ status: "archived" })
        .eq("user_id", user.id)
        .eq("platform", input.platform)
        .eq("metric", input.metric)
        .eq("status", "active");
      if (archiveError) throw archiveError;

      // Optionally mirror into main goals module.
      let linkedGoalId: string | null = null;
      if (input.mirrorToGoals) {
        const { data: goalRow, error: goalErr } = await (supabase as any)
          .from("goals")
          .insert({
            user_id: user.id,
            title: `${capitalize(input.platform)} — reach ${input.target_value.toLocaleString()} ${input.metric === "followers" ? "followers" : "posts"}`,
            category: "Social",
            timeframe: "yearly",
            target_date: input.target_date,
            status: "in_progress",
          })
          .select("id")
          .single();
        if (!goalErr && goalRow) linkedGoalId = (goalRow as any).id;
      }

      const { data, error } = await (supabase as any)
        .from("social_goals")
        .insert({
          user_id: user.id,
          platform: input.platform,
          metric: input.metric,
          start_date: input.start_date,
          start_value: input.start_value,
          target_value: input.target_value,
          target_date: input.target_date,
          notes: input.notes ?? null,
          linked_goal_id: linkedGoalId,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data as SocialGoal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal saved");
    },
    onError: (e: any) => toast.error("Couldn't save goal", { description: e.message }),
  });
}

export function useArchiveSocialGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("social_goals")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Goal archived");
    },
    onError: (e: any) => toast.error("Couldn't archive goal", { description: e.message }),
  });
}

export function useDeleteSocialGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("social_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Goal deleted");
    },
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
