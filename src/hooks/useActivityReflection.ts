import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SetReflectionArgs {
  activityId: string;
  reflection: string;
}

export function useActivityReflection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ activityId, reflection }: SetReflectionArgs) => {
      const trimmed = reflection.trim();
      const { data, error } = await supabase
        .from("synced_activities")
        .update({ reflection: trimmed.length > 0 ? trimmed : null })
        .eq("id", activityId)
        .select("id, reflection, reflection_updated_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synced-activities"] });
      queryClient.invalidateQueries({ queryKey: ["training-plan"] });
      queryClient.invalidateQueries({ queryKey: ["training-matched-activities"] });
      queryClient.invalidateQueries({ queryKey: ["training-workout-activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-reflections-week"] });
      toast.success("Reflection saved");
    },
    onError: (err: any) => {
      toast.error(`Failed to save: ${err?.message || "Unknown error"}`);
    },
  });

  return {
    saveReflection: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
