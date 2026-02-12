import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ObjectiveComment {
  id: string;
  objective_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const useObjectiveComments = (objectiveId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['objective-comments', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return [];

      const { data, error } = await supabase
        .from('objective_comments')
        .select(`
          id,
          objective_id,
          user_id,
          message,
          created_at,
          user:profiles!objective_comments_user_id_fkey(full_name, avatar_url)
        `)
        .eq('objective_id', objectiveId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ObjectiveComment[];
    },
    enabled: !!user && !!objectiveId,
    staleTime: 15 * 1000,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      if (!objectiveId || !user) throw new Error('Missing data');

      const { data, error } = await supabase
        .from('objective_comments')
        .insert({
          objective_id: objectiveId,
          user_id: user.id,
          message,
        })
        .select(`
          id,
          objective_id,
          user_id,
          message,
          created_at,
          user:profiles!objective_comments_user_id_fkey(full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as ObjectiveComment;
    },
    onMutate: async ({ message }) => {
      await queryClient.cancelQueries({ queryKey: ['objective-comments', objectiveId] });
      const previous = queryClient.getQueryData(['objective-comments', objectiveId]);

      queryClient.setQueryData(['objective-comments', objectiveId], (old: ObjectiveComment[] = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          objective_id: objectiveId!,
          user_id: user!.id,
          message,
          created_at: new Date().toISOString(),
          user: {
            full_name: user!.user_metadata?.full_name || 'You',
            avatar_url: user!.user_metadata?.avatar_url || null,
          },
        },
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['objective-comments', objectiveId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['objective-comments', objectiveId] });
      // Also invalidate comment counts
      queryClient.invalidateQueries({ queryKey: ['objective-comment-counts'] });
    },
  });

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutate,
    isAdding: addCommentMutation.isPending,
  };
};

// Lightweight hook to fetch comment counts for multiple objectives
export const useObjectiveCommentCounts = (objectiveIds: string[]) => {
  const { user } = useAuth();

  const { data: counts = {} } = useQuery({
    queryKey: ['objective-comment-counts', objectiveIds],
    queryFn: async () => {
      if (!objectiveIds.length) return {};

      const { data, error } = await supabase
        .from('objective_comments')
        .select('objective_id')
        .in('objective_id', objectiveIds);

      if (error) throw error;

      const countMap: Record<string, number> = {};
      for (const row of data) {
        countMap[row.objective_id] = (countMap[row.objective_id] || 0) + 1;
      }
      return countMap;
    },
    enabled: !!user && objectiveIds.length > 0,
    staleTime: 30 * 1000,
  });

  return { counts };
};
