import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/social";

export interface PlatformSettings {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  enabled: boolean;
  follower_target: number | null;
  target_deadline: string | null;
  current_followers_cached: number | null;
  pillars: string[];
  notes: string | null;
}

const KEY = ["social-platform-settings"] as const;

export function useSocialPlatformSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    queryFn: async (): Promise<PlatformSettings[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("social_platform_settings")
        .select("*")
        .order("platform");
      if (error) throw error;
      return (data ?? []) as PlatformSettings[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useUpsertPlatformSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<PlatformSettings> & { platform: SocialPlatform }) => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = { user_id: user.id, ...input };
      const { data, error } = await supabase
        .from("social_platform_settings")
        .upsert(payload, { onConflict: "user_id,platform" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast.error("Couldn't save settings", { description: e.message }),
  });
}
