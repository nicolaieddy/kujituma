import { useState, useEffect } from "react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

export const useWeekState = (weekStart?: string) => {
  // Single source of truth for current week
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    weekStart || WeeklyProgressService.getWeekStart()
  );

  // Update current week when prop changes
  useEffect(() => {
    if (weekStart && weekStart !== currentWeekStart) {
      console.log('useWeekState: prop changed, updating week from', currentWeekStart, 'to', weekStart);
      setCurrentWeekStart(weekStart);
    }
  }, [weekStart, currentWeekStart]);

  return {
    weekStart: currentWeekStart,
    weekRange: WeeklyProgressService.formatWeekRange(currentWeekStart),
    weekNumber: WeeklyProgressService.getWeekNumber(currentWeekStart),
  };
};