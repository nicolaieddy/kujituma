import { useState, useCallback, useEffect } from "react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { WeeklyProgressPost } from "@/types/weeklyProgress";

export const useIncompleteReflections = (
  progressPost: WeeklyProgressPost | null | undefined,
  currentWeekStart: string
) => {
  const safeIncompleteReflections = (): Record<string, string> => {
    try {
      const raw = progressPost?.incomplete_reflections;
      if (!raw) return {};
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        return raw as Record<string, string>;
      }
      return {};
    } catch {
      return {};
    }
  };
  
  const [incompleteReflections, setIncompleteReflections] = useState<Record<string, string>>(
    safeIncompleteReflections
  );

  // Sync state when progressPost changes
  useEffect(() => {
    setIncompleteReflections(safeIncompleteReflections());
  }, [progressPost?.incomplete_reflections]);

  const handleUpdateIncompleteReflection = useCallback((objectiveId: string, reflection: string) => {
    setIncompleteReflections(prev => {
      const updated = { ...prev, [objectiveId]: reflection };
      
      // Auto-save the reflections
      WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
        currentWeekStart,
        progressPost?.notes || '',
        updated
      ).catch(err => console.error('[useIncompleteReflections] Failed to save reflections:', err));
      
      return updated;
    });
  }, [currentWeekStart, progressPost?.notes]);

  return {
    incompleteReflections,
    handleUpdateIncompleteReflection,
  };
};
