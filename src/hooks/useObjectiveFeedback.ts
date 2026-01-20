import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeedbackType = 'agree' | 'question';

export interface ObjectiveFeedback {
  id: string;
  objective_id: string;
  partner_id: string;
  feedback_type: FeedbackType;
  comment?: string | null;
  created_at: string;
  partner?: {
    full_name: string;
    avatar_url: string | null;
  };
}

// Hook for partners to manage their feedback on objectives
export const usePartnerObjectiveFeedback = (objectiveIds: string[]) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['objective-partner-feedback', user?.id, objectiveIds],
    queryFn: async () => {
      if (!objectiveIds.length) return [];
      
      const { data, error } = await supabase
        .from('objective_partner_feedback')
        .select('*')
        .eq('partner_id', user!.id)
        .in('objective_id', objectiveIds);
      
      if (error) throw error;
      return data as ObjectiveFeedback[];
    },
    enabled: !!user && objectiveIds.length > 0,
    staleTime: 30 * 1000,
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ 
      objectiveId, 
      feedbackType, 
      comment 
    }: { 
      objectiveId: string; 
      feedbackType: FeedbackType; 
      comment?: string;
    }) => {
      const existing = feedback.find(f => f.objective_id === objectiveId);
      
      if (existing) {
        // Update existing feedback
        const { data, error } = await supabase
          .from('objective_partner_feedback')
          .update({ 
            feedback_type: feedbackType, 
            comment: comment || null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Create new feedback
        const { data, error } = await supabase
          .from('objective_partner_feedback')
          .insert({
            objective_id: objectiveId,
            partner_id: user!.id,
            feedback_type: feedbackType,
            comment: comment || null,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onMutate: async ({ objectiveId, feedbackType, comment }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['objective-partner-feedback', user?.id, objectiveIds] });
      
      // Snapshot previous value
      const previousFeedback = queryClient.getQueryData(['objective-partner-feedback', user?.id, objectiveIds]);
      
      // Optimistically update
      queryClient.setQueryData(['objective-partner-feedback', user?.id, objectiveIds], (old: ObjectiveFeedback[] = []) => {
        const existing = old.find(f => f.objective_id === objectiveId);
        if (existing) {
          return old.map(f => 
            f.objective_id === objectiveId 
              ? { ...f, feedback_type: feedbackType, comment: comment || null }
              : f
          );
        }
        return [...old, {
          id: `temp-${objectiveId}`,
          objective_id: objectiveId,
          partner_id: user!.id,
          feedback_type: feedbackType,
          comment: comment || null,
          created_at: new Date().toISOString(),
        }];
      });
      
      return { previousFeedback };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousFeedback) {
        queryClient.setQueryData(['objective-partner-feedback', user?.id, objectiveIds], context.previousFeedback);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['objective-partner-feedback'] });
    },
  });

  const removeFeedbackMutation = useMutation({
    mutationFn: async (objectiveId: string) => {
      const existing = feedback.find(f => f.objective_id === objectiveId);
      if (!existing) return;
      
      const { error } = await supabase
        .from('objective_partner_feedback')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
    },
    onMutate: async (objectiveId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['objective-partner-feedback', user?.id, objectiveIds] });
      
      // Snapshot previous value
      const previousFeedback = queryClient.getQueryData(['objective-partner-feedback', user?.id, objectiveIds]);
      
      // Optimistically remove
      queryClient.setQueryData(['objective-partner-feedback', user?.id, objectiveIds], (old: ObjectiveFeedback[] = []) => {
        return old.filter(f => f.objective_id !== objectiveId);
      });
      
      return { previousFeedback };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousFeedback) {
        queryClient.setQueryData(['objective-partner-feedback', user?.id, objectiveIds], context.previousFeedback);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['objective-partner-feedback'] });
    },
  });

  const getFeedbackForObjective = (objectiveId: string) => {
    return feedback.find(f => f.objective_id === objectiveId);
  };

  return {
    feedback,
    isLoading,
    submitFeedback: submitFeedbackMutation.mutate,
    removeFeedback: removeFeedbackMutation.mutate,
    isSubmitting: submitFeedbackMutation.isPending || removeFeedbackMutation.isPending,
    getFeedbackForObjective,
  };
};

// Hook for users to see feedback on their own objectives
export const useMyObjectivesFeedback = (objectiveIds: string[]) => {
  const { user } = useAuth();

  const { data: feedback = [], isLoading, refetch } = useQuery({
    queryKey: ['my-objectives-feedback', user?.id, objectiveIds],
    queryFn: async () => {
      if (!objectiveIds.length) return [];
      
      const { data, error } = await supabase
        .from('objective_partner_feedback')
        .select(`
          id,
          objective_id,
          partner_id,
          feedback_type,
          comment,
          created_at,
          partner:profiles!objective_partner_feedback_partner_id_fkey(full_name, avatar_url)
        `)
        .in('objective_id', objectiveIds);
      
      if (error) throw error;
      return data as ObjectiveFeedback[];
    },
    enabled: !!user && objectiveIds.length > 0,
    staleTime: 30 * 1000,
  });

  const getFeedbackForObjective = (objectiveId: string) => {
    return feedback.filter(f => f.objective_id === objectiveId);
  };

  const getAgreeFeedback = (objectiveId: string) => {
    return feedback.filter(f => f.objective_id === objectiveId && f.feedback_type === 'agree');
  };

  const getQuestionFeedback = (objectiveId: string) => {
    return feedback.filter(f => f.objective_id === objectiveId && f.feedback_type === 'question');
  };

  return {
    feedback,
    isLoading,
    refetch,
    getFeedbackForObjective,
    getAgreeFeedback,
    getQuestionFeedback,
  };
};
