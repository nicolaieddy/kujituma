import { useState, useMemo } from "react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

export const useWeekState = (weekStart?: string) => {
  // Single source of truth for current week - use provided weekStart or calculate it
  const effectiveWeekStart = weekStart || WeeklyProgressService.getWeekStart();

  // Memoize the derived values to prevent unnecessary recalculations
  const weekRange = useMemo(() => 
    WeeklyProgressService.formatWeekRange(effectiveWeekStart), 
    [effectiveWeekStart]
  );
  
  const weekNumber = useMemo(() => 
    WeeklyProgressService.getWeekNumber(effectiveWeekStart), 
    [effectiveWeekStart]
  );

  return {
    weekStart: effectiveWeekStart,
    weekRange,
    weekNumber,
  };
};