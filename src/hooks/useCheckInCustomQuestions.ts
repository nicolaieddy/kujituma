import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CustomQuestion {
  id: string;
  user_id: string;
  prompt: string;
  is_enabled: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'check-in-custom-questions';

export const useCheckInCustomQuestions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async (): Promise<CustomQuestion[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('check_in_custom_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []) as CustomQuestion[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const addQuestion = useMutation({
    mutationFn: async (prompt: string) => {
      if (!user) throw new Error('Not authenticated');
      const maxOrder = questions.reduce((m, q) => Math.max(m, q.order_index), -1);
      const { error } = await supabase.from('check_in_custom_questions').insert({
        user_id: user.id,
        prompt,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] }),
    onError: () => toast.error('Failed to add question'),
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, prompt, is_enabled }: { id: string; prompt?: string; is_enabled?: boolean }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (prompt !== undefined) updates.prompt = prompt;
      if (is_enabled !== undefined) updates.is_enabled = is_enabled;
      const { error } = await supabase
        .from('check_in_custom_questions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] }),
    onError: () => toast.error('Failed to update question'),
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('check_in_custom_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] }),
    onError: () => toast.error('Failed to delete question'),
  });

  const enabledQuestions = questions.filter((q) => q.is_enabled);

  return {
    questions,
    enabledQuestions,
    isLoading,
    addQuestion: (prompt: string) => addQuestion.mutate(prompt),
    updateQuestion: (args: { id: string; prompt?: string; is_enabled?: boolean }) =>
      updateQuestion.mutate(args),
    deleteQuestion: (id: string) => deleteQuestion.mutate(id),
    isAdding: addQuestion.isPending,
  };
};
