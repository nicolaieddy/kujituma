import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData, WeeklyObjective } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useAllWeeklyObjectives = (options: { enabled?: boolean } = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = (options.enabled ?? true) && !!user;

  const { data: objectives = [], isLoading, error } = useQuery({
    queryKey: ['all-weekly-objectives', user?.id],
    queryFn: async () => {
      // Only get current week and previous 3 weeks for faster initial load
      const weeks: string[] = [];
      const currentDate = new Date();

      for (let i = 0; i < 4; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i * 7);
        weeks.push(WeeklyProgressService.getWeekStart(date));
      }

      // Single query for all weeks (much faster than one request per week)
      return await WeeklyProgressService.getWeeklyObjectivesForWeeks(weeks);
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (gcTime replaces cacheTime in v5)
    retry: (failureCount, error) => {
      console.error('All objectives query failed:', error);
      return failureCount < 2;
    }
  });


  const createObjectiveMutation = useMutation({
    mutationFn: (data: CreateWeeklyObjectiveData) =>
      WeeklyProgressService.createWeeklyObjective(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-weekly-objectives'] });
      toast({
        title: "Success",
        description: "Weekly objective created successfully!",
      });
    },
    onError: (error) => {
      console.error('Error creating objective:', error);
      toast({
        title: "Error",
        description: "Failed to create objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateObjectiveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWeeklyObjectiveData }) =>
      WeeklyProgressService.updateWeeklyObjective(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-weekly-objectives'] });
      toast({
        title: "Success",
        description: "Weekly objective updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating objective:', error);
      toast({
        title: "Error",
        description: "Failed to update objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteObjectiveMutation = useMutation({
    mutationFn: WeeklyProgressService.deleteWeeklyObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-weekly-objectives'] });
      toast({
        title: "Success",
        description: "Weekly objective deleted successfully!",
      });
    },
    onError: (error) => {
      console.error('Error deleting objective:', error);
      toast({
        title: "Error",
        description: "Failed to delete objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createObjective = (goalId: string, text: string, weekStart?: string) => {
    const targetWeekStart = weekStart || WeeklyProgressService.getWeekStart();
    createObjectiveMutation.mutate({
      goal_id: goalId,
      text,
      week_start: targetWeekStart,
    });
  };

  const updateObjective = (id: string, data: UpdateWeeklyObjectiveData) => {
    updateObjectiveMutation.mutate({ id, data });
  };

  const deleteObjective = (id: string) => {
    deleteObjectiveMutation.mutate(id);
  };

  return {
    objectives,
    isLoading,
    error,
    createObjective,
    updateObjective,
    deleteObjective,
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
  };
};