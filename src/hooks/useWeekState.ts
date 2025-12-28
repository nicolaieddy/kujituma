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
      setCurrentWeekStart(weekStart);
    }
  }, [weekStart, currentWeekStart]);

  return {
    weekStart: currentWeekStart,
    weekRange: WeeklyProgressService.formatWeekRange(currentWeekStart),
    weekNumber: WeeklyProgressService.getWeekNumber(currentWeekStart),
  };
};