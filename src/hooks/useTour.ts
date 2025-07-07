import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TourService } from '@/services/tourService';
import { UserTour } from '@/types/tour';
import { useAuth } from '@/contexts/AuthContext';

export const useTour = (tourType: string = 'onboarding') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showTour, setShowTour] = useState(false);

  const { data: tour, isLoading } = useQuery({
    queryKey: ['user-tour', user?.id, tourType],
    queryFn: () => TourService.getUserTour(tourType),
    enabled: !!user,
  });

  const createTourMutation = useMutation({
    mutationFn: () => TourService.createUserTour(tourType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tour', user?.id, tourType] });
    }
  });

  const updateTourMutation = useMutation({
    mutationFn: ({ step, completed }: { step: number; completed?: boolean }) =>
      TourService.updateTourProgress(tourType, step, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tour', user?.id, tourType] });
    }
  });

  const dismissTourMutation = useMutation({
    mutationFn: () => TourService.dismissTour(tourType),
    onSuccess: () => {
      setShowTour(false);
      queryClient.invalidateQueries({ queryKey: ['user-tour', user?.id, tourType] });
    }
  });

  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user) return;

      try {
        const shouldShow = await TourService.shouldShowTour();
        if (shouldShow && !tour) {
          // Create tour record for new user
          await createTourMutation.mutateAsync();
        }
        setShowTour(shouldShow);
      } catch (error) {
        console.error('Error checking tour status:', error);
      }
    };

    checkTourStatus();
  }, [user, tour]);

  const startTour = () => {
    setShowTour(true);
  };

  const nextStep = () => {
    if (!tour) return;
    const nextStepNumber = tour.current_step + 1;
    updateTourMutation.mutate({ step: nextStepNumber });
  };

  const completeTour = () => {
    if (!tour) return;
    updateTourMutation.mutate({ step: tour.current_step, completed: true });
    setShowTour(false);
  };

  const dismissTour = () => {
    dismissTourMutation.mutate();
  };

  return {
    tour,
    showTour,
    isLoading,
    startTour,
    nextStep,
    completeTour,
    dismissTour,
    isUpdating: updateTourMutation.isPending,
  };
};