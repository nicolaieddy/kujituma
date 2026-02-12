import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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

  // Realtime subscription for this objective's comments
  useEffect(() => {
    if (!objectiveId || !user) return;

    const channel = supabase
      .channel(`objective-comments-${objectiveId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'objective_comments',
          filter: `objective_id=eq.${objectiveId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['objective-comments', objectiveId] });
          queryClient.invalidateQueries({ queryKey: ['objective-comment-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [objectiveId, user, queryClient]);

  // Mark as read when viewing comments
  const markAsRead = async () => {
    if (!objectiveId || !user) return;

    const { error } = await supabase
      .from('objective_comment_reads')
      .upsert(
        { user_id: user.id, objective_id: objectiveId, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id,objective_id' }
      );

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['objective-unread-counts'] });
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ['objective-comment-counts'] });
      // Also mark as read since we just posted
      markAsRead();
    },
  });

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutate,
    isAdding: addCommentMutation.isPending,
    markAsRead,
  };
};

// Lightweight hook to fetch comment counts + unread counts for multiple objectives
export const useObjectiveCommentCounts = (objectiveIds: string[]) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data = { counts: {}, unreadCounts: {} } } = useQuery({
    queryKey: ['objective-comment-counts', objectiveIds],
    queryFn: async () => {
      if (!objectiveIds.length) return { counts: {}, unreadCounts: {} };

      // Fetch all comments
      const { data: comments, error } = await supabase
        .from('objective_comments')
        .select('objective_id, created_at, user_id')
        .in('objective_id', objectiveIds);

      if (error) throw error;

      // Fetch read timestamps
      const { data: reads, error: readsError } = await supabase
        .from('objective_comment_reads')
        .select('objective_id, last_read_at')
        .eq('user_id', user!.id)
        .in('objective_id', objectiveIds);

      if (readsError) throw readsError;

      const readMap: Record<string, string> = {};
      for (const r of reads || []) {
        readMap[r.objective_id] = r.last_read_at;
      }

      const countMap: Record<string, number> = {};
      const unreadMap: Record<string, number> = {};
      for (const c of comments || []) {
        countMap[c.objective_id] = (countMap[c.objective_id] || 0) + 1;
        // Unread = comments from OTHER users after last_read_at
        if (c.user_id !== user!.id) {
          const lastRead = readMap[c.objective_id];
          if (!lastRead || new Date(c.created_at) > new Date(lastRead)) {
            unreadMap[c.objective_id] = (unreadMap[c.objective_id] || 0) + 1;
          }
        }
      }
      return { counts: countMap, unreadCounts: unreadMap };
    },
    enabled: !!user && objectiveIds.length > 0,
    staleTime: 30 * 1000,
  });

  // Realtime: listen for new comments on any of these objectives
  const stableKey = objectiveIds.sort().join(',');
  useEffect(() => {
    if (!user || !objectiveIds.length) return;

    const channel = supabase
      .channel(`objective-comments-counts-${stableKey.slice(0, 50)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'objective_comments',
        },
        (payload) => {
          const newObjId = (payload.new as any)?.objective_id;
          if (newObjId && objectiveIds.includes(newObjId)) {
            queryClient.invalidateQueries({ queryKey: ['objective-comment-counts'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stableKey, user, queryClient]);

  return { counts: data.counts, unreadCounts: data.unreadCounts };
};
