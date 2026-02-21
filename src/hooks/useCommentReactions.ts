import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
}

export const EMOJI_OPTIONS = ["👍", "❤️", "😂", "🙌", "🤔", "🔥"];

export const useCommentReactions = (commentIds: string[]) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery({
    queryKey: ["comment-reactions", commentIds.sort().join(",")],
    queryFn: async () => {
      if (!commentIds.length) return [];
      const { data, error } = await supabase
        .from("objective_comment_reactions")
        .select("*")
        .in("comment_id", commentIds);
      if (error) throw error;
      return data as CommentReaction[];
    },
    enabled: !!user && commentIds.length > 0,
    staleTime: 15 * 1000,
  });

  // Group reactions by comment_id → emoji → users
  const reactionsByComment = reactions.reduce<
    Record<string, Record<string, { count: number; isMine: boolean }>>
  >((acc, r) => {
    if (!acc[r.comment_id]) acc[r.comment_id] = {};
    if (!acc[r.comment_id][r.emoji]) acc[r.comment_id][r.emoji] = { count: 0, isMine: false };
    acc[r.comment_id][r.emoji].count++;
    if (r.user_id === user?.id) acc[r.comment_id][r.emoji].isMine = true;
    return acc;
  }, {});

  const toggleReaction = useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Always query the DB for the existing reaction to avoid stale closure issues
      const { data: existing, error: fetchError } = await supabase
        .from("objective_comment_reactions")
        .select("id")
        .eq("comment_id", commentId)
        .eq("emoji", emoji)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      if (existing) {
        const { error } = await supabase
          .from("objective_comment_reactions")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("objective_comment_reactions")
          .insert({ comment_id: commentId, user_id: user.id, emoji });
        if (error) throw error;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-reactions"] });
    },
  });

  return { reactionsByComment, toggleReaction: toggleReaction.mutate };
};
