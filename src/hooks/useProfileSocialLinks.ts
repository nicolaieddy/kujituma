import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/social";

/**
 * Unified link between the Profile module's social URLs and the Social Analytics module.
 * Both surfaces read/write the same `profiles.<platform>_url` field so there is a single
 * source of truth for "where is my account".
 */
export const PLATFORM_TO_PROFILE_FIELD: Record<SocialPlatform, "linkedin_url" | "twitter_url" | "instagram_url" | "tiktok_url"> = {
  linkedin: "linkedin_url",
  x: "twitter_url",
  instagram: "instagram_url",
  tiktok: "tiktok_url",
};

export type ProfileSocialLinks = Partial<Record<
  "linkedin_url" | "twitter_url" | "instagram_url" | "tiktok_url" | "youtube_url",
  string | null
>>;

const KEY = ["profile-social-links"] as const;

export function useProfileSocialLinks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    queryFn: async (): Promise<ProfileSocialLinks> => {
      if (!user) return {};
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("linkedin_url, twitter_url, instagram_url, tiktok_url, youtube_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {}) as ProfileSocialLinks;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useUpdateProfileSocialLink() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { platform: SocialPlatform; url: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const field = PLATFORM_TO_PROFILE_FIELD[input.platform];
      const value = input.url?.trim() ? input.url.trim() : null;
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ [field]: value })
        .eq("id", user.id);
      if (error) throw error;
      return { field, value };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error("Couldn't update profile link", { description: e.message }),
  });
}
