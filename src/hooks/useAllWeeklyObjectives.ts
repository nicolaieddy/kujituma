import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData, WeeklyObjective } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useAllWeeklyObjectives = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: objectives = [], isLoading, error } = useQuery({
    queryKey: ['all-weekly-objectives', user?.id],
    queryFn: async () => {
      console.log('=== useAllWeeklyObjectives: Fetching objectives ===');
      
      // Get current week and previous 12 weeks
      const weeks = [];
      const currentDate = new Date();
      
      for (let i = 0; i < 13; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - (i * 7));
        weeks.push(WeeklyProgressService.getWeekStart(date));
      }

      console.log('Fetching objectives for weeks:', weeks);

      const allWeekObjectives = await Promise.all(
        weeks.map(async (week) => {
          try {
            const weekObjectives = await WeeklyProgressService.getWeeklyObjectives(week);
            console.log(`Week ${week} objectives:`, weekObjectives);
            return weekObjectives;
          } catch (error) {
            console.error(`Error fetching objectives for week ${week}:`, error);
            return [];
          }
        })
      );

      const flatObjectives = allWeekObjectives.flat();
      console.log('Total objectives fetched:', flatObjectives.length);
      console.log('Objectives with goal_id:', flatObjectives.filter(obj => obj.goal_id));
      
      return flatObjectives;
    },
    enabled: !!user,
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