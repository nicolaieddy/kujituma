import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useWeeklyObjectives = (currentWeekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: objectives = [], isLoading: objectivesLoading, error: objectivesError } = useQuery({
    queryKey: ['weekly-objectives', user?.id, currentWeekStart],
    queryFn: async () => {
      console.log('Fetching objectives for user:', user?.id, 'week:', currentWeekStart);
      return WeeklyProgressService.getWeeklyObjectives(currentWeekStart);
    },
    enabled: !!user && !!currentWeekStart,
    retry: (failureCount, error) => {
      console.error('Objectives query failed:', error);
      return failureCount < 2;
    }
  });

  const createObjectiveMutation = useMutation({
    mutationFn: WeeklyProgressService.createWeeklyObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      toast({
        title: "Success",
        description: "Objective created successfully!",
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
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
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
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      toast({
        title: "Success",
        description: "Objective deleted successfully!",
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

  const deleteAllObjectivesMutation = useMutation({
    mutationFn: WeeklyProgressService.deleteAllWeeklyObjectives,
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      toast({
        title: "Success",
        description: `${deletedCount} objective${deletedCount !== 1 ? 's' : ''} cleared successfully!`,
      });
    },
    onError: (error) => {
      console.error('Error deleting all objectives:', error);
      toast({
        title: "Error",
        description: "Failed to clear objectives. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createObjective = (data: CreateWeeklyObjectiveData) => {
    createObjectiveMutation.mutate({ ...data, week_start: currentWeekStart });
  };

  const updateObjective = (id: string, data: UpdateWeeklyObjectiveData) => {
    updateObjectiveMutation.mutate({ id, data });
  };

  const deleteObjective = (id: string) => {
    deleteObjectiveMutation.mutate(id);
  };

  const deleteAllObjectives = () => {
    deleteAllObjectivesMutation.mutate(currentWeekStart);
  };

  return {
    objectives,
    isLoading: objectivesLoading,
    error: objectivesError,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
    isDeletingAll: deleteAllObjectivesMutation.isPending,
  };
};