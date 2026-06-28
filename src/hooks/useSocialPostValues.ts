import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SocialPostValueLink {
  id: string;
  post_id: string;
  value_id: string;
  weight: number;
}

const KEY = ["social-post-values"] as const;

export function useSocialPostValues(postId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, postId],
    queryFn: async (): Promise<SocialPostValueLink[]> => {
      if (!user || !postId) return [];
      const { data, error } = await supabase
        .from("social_post_values")
        .select("id, post_id, value_id, weight")
        .eq("post_id", postId);
      if (error) throw error;
      return (data ?? []) as SocialPostValueLink[];
    },
    enabled: !!user && !!postId,
  });
}

export function useSetSocialPostValue() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { post_id: string; value_id: string; weight: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("social_post_values")
        .upsert(
          { user_id: user.id, post_id: input.post_id, value_id: input.value_id, weight: input.weight },
          { onConflict: "post_id,value_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: [...KEY, vars.post_id] }),
    onError: (e: any) => toast.error("Couldn't link value", { description: e.message }),
  });
}

export function useRemoveSocialPostValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { post_id: string; value_id: string }) => {
      const { error } = await supabase
        .from("social_post_values")
        .delete()
        .eq("post_id", input.post_id)
        .eq("value_id", input.value_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: [...KEY, vars.post_id] }),
  });
}
