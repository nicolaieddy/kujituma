import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SocialPlatform, SocialStatus, SocialTrustCheck, SocialMediaType, SocialMediaFocus } from "@/lib/social";

export interface SocialPost {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  status: SocialStatus;
  platforms: SocialPlatform[];
  pillars: string[];
  publish_date: string | null;
  publish_at: string | null;
  live_url: string | null;
  media: string[];
  media_type: SocialMediaType | null;
  media_focus: SocialMediaFocus | null;
  trust_check: SocialTrustCheck;
  hold: boolean;
  reviewer_id: string | null;
  review_notes: string | null;
  retro: string | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SocialPostInput = Partial<Omit<SocialPost, "id" | "user_id" | "created_at" | "updated_at">> & {
  id?: string;
  title: string;
};

const KEY = ["social-posts"] as const;

export function useSocialPosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    queryFn: async (): Promise<SocialPost[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SocialPost[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useSocialPost(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, "one", id],
    queryFn: async (): Promise<SocialPost | null> => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as SocialPost | null) ?? null;
    },
    enabled: !!user && !!id,
  });
}

export function useUpsertSocialPost() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: SocialPostInput) => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = { ...input, user_id: user.id };
      delete payload.id;
      if (input.id) {
        const { data, error } = await supabase
          .from("social_posts")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data as SocialPost;
      }
      const { data, error } = await supabase
        .from("social_posts")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SocialPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: any) => toast.error("Couldn't save post", { description: e.message }),
  });
}

export function useDeleteSocialPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Post deleted");
    },
  });
}
