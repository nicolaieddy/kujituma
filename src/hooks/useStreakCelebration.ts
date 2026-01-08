import { useEffect, useRef, useCallback } from "react";
import { useStreaks } from "@/hooks/useStreaks";
import { celebrateStreakMilestone, isStreakMilestone, getStreakMilestoneMessage } from "@/utils/confetti";
import { toast } from "@/hooks/use-toast";

interface StreakSnapshot {
  daily: number;
  weekly: number;
  quarterly: number;
}

export const useStreakCelebration = () => {
  const { 
    currentDailyStreak, 
    currentWeeklyStreak, 
    currentQuarterlyStreak,
    isLoading 
  } = useStreaks();
  
  const previousStreaks = useRef<StreakSnapshot | null>(null);
  const hasInitialized = useRef(false);

  // Check for streak milestones when streaks change
  useEffect(() => {
    if (isLoading) return;

    const currentSnapshot: StreakSnapshot = {
      daily: currentDailyStreak,
      weekly: currentWeeklyStreak,
      quarterly: currentQuarterlyStreak,
    };

    // Initialize on first load (don't celebrate existing streaks)
    if (!hasInitialized.current) {
      previousStreaks.current = currentSnapshot;
      hasInitialized.current = true;
      return;
    }

    const prev = previousStreaks.current;
    if (!prev) return;

    // Check each streak type for milestone achievements
    if (currentSnapshot.daily > prev.daily && isStreakMilestone(currentSnapshot.daily)) {
      celebrateStreakMilestone(currentSnapshot.daily);
      const message = getStreakMilestoneMessage(currentSnapshot.daily, 'daily');
      if (message) {
        toast({ title: "Streak Milestone!", description: message });
      }
    }

    if (currentSnapshot.weekly > prev.weekly && isStreakMilestone(currentSnapshot.weekly)) {
      celebrateStreakMilestone(currentSnapshot.weekly);
      const message = getStreakMilestoneMessage(currentSnapshot.weekly, 'weekly');
      if (message) {
        toast({ title: "Streak Milestone!", description: message });
      }
    }

    if (currentSnapshot.quarterly > prev.quarterly && isStreakMilestone(currentSnapshot.quarterly)) {
      celebrateStreakMilestone(currentSnapshot.quarterly);
      const message = getStreakMilestoneMessage(currentSnapshot.quarterly, 'quarterly');
      if (message) {
        toast({ title: "Streak Milestone!", description: message });
      }
    }

    // Update previous snapshot
    previousStreaks.current = currentSnapshot;
  }, [currentDailyStreak, currentWeeklyStreak, currentQuarterlyStreak, isLoading]);

  // Manual trigger for celebrating a specific streak
  const celebrateIfMilestone = useCallback((streak: number, type: 'daily' | 'weekly' | 'quarterly') => {
    if (isStreakMilestone(streak)) {
      celebrateStreakMilestone(streak);
      const message = getStreakMilestoneMessage(streak, type);
      if (message) {
        toast({ title: "Streak Milestone!", description: message });
      }
      return true;
    }
    return false;
  }, []);

  return {
    celebrateIfMilestone,
  };
};
