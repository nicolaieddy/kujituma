import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type MediaMention = Database["public"]["Tables"]["media_mentions"]["Row"];
export type MediaCandidate = Database["public"]["Tables"]["media_candidates"]["Row"];
export type MediaMentionInsert = Database["public"]["Tables"]["media_mentions"]["Insert"];
export type MediaMentionUpdate = Database["public"]["Tables"]["media_mentions"]["Update"];

export const MEDIA_TYPES = [
  "Article", "Video", "Article + Video", "Podcast", "Panel / Speaking",
  "Press Conference", "Interview", "Quote", "Social",
] as const;
export const MEDIA_URL_STATUSES = ["verified", "verify", "needs-url", "no-url", "dead"] as const;
export const MEDIA_STATUSES = ["Published", "Upcoming", "Draft"] as const;
export const MEDIA_SENTIMENTS = ["positive", "neutral", "negative"] as const;

export const URL_STATUS_COLOR: Record<string, string> = {
  verified: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  verify: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "needs-url": "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  "no-url": "bg-muted text-muted-foreground border-border",
  dead: "bg-destructive/15 text-destructive border-destructive/30",
};

const mentionsKey = (userId?: string) => ["media_mentions", userId] as const;
const candidatesKey = (userId?: string) => ["media_candidates", userId] as const;

export function useMediaMentions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: mentionsKey(user?.id),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_mentions")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as MediaMention[];
    },
  });
}

export function useMediaCandidates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: candidatesKey(user?.id),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_candidates")
        .select("*")
        .eq("user_id", user!.id)
        .eq("review_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MediaCandidate[];
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, userId?: string) {
  qc.invalidateQueries({ queryKey: mentionsKey(userId) });
  qc.invalidateQueries({ queryKey: candidatesKey(userId) });
}

async function tryArchive(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const { data } = await supabase.functions.invoke("media-archive", { body: { url } });
    return (data as any)?.archived_url ?? null;
  } catch {
    return null;
  }
}

export function useCreateMention() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<MediaMentionInsert, "user_id">) => {
      if (!user?.id) throw new Error("Not authenticated");
      const archived_url = input.archived_url ?? (await tryArchive(input.url));
      const { data, error } = await supabase
        .from("media_mentions")
        .insert({ ...input, archived_url, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateAll(qc, user?.id),
  });
}

export function useUpdateMention() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MediaMentionUpdate }) => {
      const { data, error } = await supabase
        .from("media_mentions")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateAll(qc, user?.id),
  });
}

export function useDeleteMention() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_mentions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc, user?.id),
  });
}

export function useApproveCandidate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidate, overrides }: { candidate: MediaCandidate; overrides?: Partial<MediaMentionInsert> }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const base: MediaMentionInsert = {
        user_id: user.id,
        date: (overrides?.date ?? candidate.date ?? new Date().toISOString().slice(0, 10)) as string,
        title: overrides?.title ?? candidate.title,
        outlet: overrides?.outlet ?? candidate.outlet ?? "",
        type: overrides?.type ?? candidate.type ?? "Article",
        url: overrides?.url ?? candidate.url,
        url_status: overrides?.url_status ?? candidate.url_status ?? "verify",
        summary: overrides?.summary ?? candidate.summary,
        tags: overrides?.tags ?? candidate.tags ?? [],
        status: overrides?.status ?? candidate.status ?? "Published",
        sentiment: overrides?.sentiment ?? candidate.sentiment,
        featured: overrides?.featured ?? candidate.featured ?? false,
        source: candidate.source ?? "mcp-agent",
        archived_url: candidate.archived_url ?? (await tryArchive(overrides?.url ?? candidate.url)),
      };
      const { data: mention, error } = await supabase
        .from("media_mentions")
        .insert(base)
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("media_candidates")
        .update({ review_status: "approved", approved_mention_id: mention.id })
        .eq("id", candidate.id);
      return mention;
    },
    onSuccess: () => invalidateAll(qc, user?.id),
  });
}

export function useRejectCandidate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("media_candidates")
        .update({ review_status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc, user?.id),
  });
}

export function useBulkInsertMentions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Omit<MediaMentionInsert, "user_id">[]) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!rows.length) return { inserted: 0, skipped: 0 };
      const payload = rows.map((r) => ({ ...r, user_id: user.id }));
      // upsert ignoring duplicates via the unique index
      const { data, error } = await supabase
        .from("media_mentions")
        .upsert(payload as any, { onConflict: "user_id,title,date,outlet", ignoreDuplicates: true })
        .select();
      if (error) throw error;
      return { inserted: data?.length ?? 0, skipped: rows.length - (data?.length ?? 0) };
    },
    onSuccess: () => invalidateAll(qc, user?.id),
  });
}
