import { useState, useEffect, useRef, useCallback } from "react";
import { useWeeklyInsights } from "@/hooks/useWeeklyInsights";
import { useAIFeatures } from "@/hooks/useAIFeatures";
import { Goal } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";

interface UseAISuggestionsProps {
  isCurrentWeek: boolean;
  isWeekCompleted: boolean;
  weeklyDataLoading: boolean;
  goals: Goal[] | undefined;
  objectives: WeeklyObjective[] | undefined;
  allObjectives: WeeklyObjective[] | undefined;
  currentWeekStart: string;
}

export const useAISuggestions = ({
  isCurrentWeek,
  isWeekCompleted,
  weeklyDataLoading,
  goals,
  objectives,
  allObjectives,
  currentWeekStart,
}: UseAISuggestionsProps) => {
  const { aiEnabled } = useAIFeatures();
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  const mountedRef = useRef(true);
  
  const { 
    suggestions, 
    isSuggestionsLoading, 
    generateSuggestions, 
    clearSuggestions, 
    cleanup: cleanupInsights 
  } = useWeeklyInsights();

  // Reset mounted ref on mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cleanup insights on unmount
  useEffect(() => {
    return () => {
      cleanupInsights();
    };
  }, [cleanupInsights]);

  // Generate suggestions when on current week with few objectives
  useEffect(() => {
    if (hasFetchedSuggestions || !mountedRef.current) return;
    
    if (
      !aiEnabled ||
      !isCurrentWeek || 
      isWeekCompleted || 
      weeklyDataLoading ||
      !goals || 
      goals.length === 0 ||
      (objectives?.length || 0) >= 3
    ) {
      return;
    }

    setHasFetchedSuggestions(true);
    
    const incompleteFromPast = (allObjectives || [])
      .filter(o => !o.is_completed && o.week_start !== currentWeekStart)
      .map(o => ({ text: o.text, weekStart: o.week_start }));
    
    const completedRecently = (allObjectives || [])
      .filter(o => o.is_completed)
      .slice(0, 10)
      .map(o => ({ text: o.text }));
    
    generateSuggestions({
      incompleteObjectives: incompleteFromPast,
      completedObjectives: completedRecently,
      goals: (goals || []).filter(g => g.status === 'in_progress' || g.status === 'not_started')
        .map(g => ({ title: g.title, description: g.description || undefined })),
    }).catch(err => {
      if (mountedRef.current) {
        console.error('[useAISuggestions] Failed to generate suggestions:', err);
      }
    });
  }, [aiEnabled, isCurrentWeek, isWeekCompleted, hasFetchedSuggestions, weeklyDataLoading, goals, objectives, allObjectives, currentWeekStart, generateSuggestions]);

  // Reset when week changes
  useEffect(() => {
    if (mountedRef.current) {
      setHasFetchedSuggestions(false);
    }
    clearSuggestions();
  }, [currentWeekStart, clearSuggestions]);

  const handleRefreshSuggestions = useCallback(() => {
    try {
      const incompleteFromPast = (allObjectives || [])
        .filter(o => !o.is_completed && o.week_start !== currentWeekStart)
        .map(o => ({ text: o.text, weekStart: o.week_start }));
      
      const completedRecently = (allObjectives || [])
        .filter(o => o.is_completed)
        .slice(0, 10)
        .map(o => ({ text: o.text }));
      
      generateSuggestions({
        incompleteObjectives: incompleteFromPast,
        completedObjectives: completedRecently,
        goals: (goals || []).filter(g => g.status === 'in_progress' || g.status === 'not_started')
          .map(g => ({ title: g.title, description: g.description || undefined })),
      }).catch(err => console.error('[useAISuggestions] Failed to refresh suggestions:', err));
    } catch (err) {
      console.error('[useAISuggestions] Error refreshing suggestions:', err);
    }
  }, [allObjectives, currentWeekStart, goals, generateSuggestions]);

  return {
    aiEnabled,
    suggestions,
    isSuggestionsLoading,
    handleRefreshSuggestions,
  };
};
