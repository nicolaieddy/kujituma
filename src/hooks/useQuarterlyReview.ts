import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { CreateQuarterlyReview } from "@/types/habits";
import { toast } from "@/hooks/use-toast";

export const useQuarterlyReview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { year, quarter, quarterStart } = HabitsService.getCurrentQuarter();

  const { data: currentReview, isLoading } = useQuery({
    queryKey: ['quarterly-review', user?.id, year, quarter],
    queryFn: () => HabitsService.getQuarterlyReview(year, quarter),
    enabled: !!user,
  });

  const { data: allReviews } = useQuery({
    queryKey: ['all-quarterly-reviews', user?.id],
    queryFn: () => HabitsService.getAllQuarterlyReviews(),
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: (data: CreateQuarterlyReview) => 
      HabitsService.createOrUpdateQuarterlyReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarterly-review'] });
      queryClient.invalidateQueries({ queryKey: ['all-quarterly-reviews'] });
    },
    onError: (error) => {
      console.error('Quarterly review save error:', error);
      toast({
        title: "Error",
        description: "Failed to save quarterly review",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => HabitsService.completeQuarterlyReview(year, quarter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarterly-review'] });
      queryClient.invalidateQueries({ queryKey: ['all-quarterly-reviews'] });
      toast({
        title: "Quarterly review complete! 🎉",
        description: "Great job reflecting on your progress!",
      });
    },
    onError: (error) => {
      console.error('Quarterly review complete error:', error);
    },
  });

  return {
    currentReview,
    allReviews,
    isLoading,
    year,
    quarter,
    quarterStart,
    hasCompletedReview: currentReview?.is_completed || false,
    isEndOfQuarter: HabitsService.isEndOfQuarter(),
    saveReview: saveMutation.mutateAsync,
    completeReview: completeMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
};
