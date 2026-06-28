import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SocialPlatform } from "@/lib/social";

export type ImportAction = "created" | "updated" | "noop";
export type ImportKind = "linkedin_single_post" | "linkedin_aggregate";

export interface SocialImportHistory {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  kind: ImportKind;
  action: ImportAction;
  post_id: string | null;
  post_url: string | null;
  file_name: string | null;
  summary: Record<string, unknown> | null;
  created_at: string;
}

const KEY = ["social-import-history"] as const;

export function useSocialImportHistory(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id, limit],
    queryFn: async (): Promise<SocialImportHistory[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("social_import_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as SocialImportHistory[];
    },
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useLogSocialImport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Omit<SocialImportHistory, "id" | "user_id" | "created_at">,
    ) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("social_import_history")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as SocialImportHistory;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
