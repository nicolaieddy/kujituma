import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WeeklyData {
  objectives: { text: string; is_completed: boolean }[];
  lastWeekReflection?: string;
  lastWeekIntention?: string;
  progressNotes?: string;
}

interface SuggestionsData {
  incompleteObjectives: { text: string; weekStart: string }[];
  completedObjectives: { text: string }[];
  goals: { title: string; description?: string }[];
}

interface ObjectiveSuggestion {
  text: string;
  reason: string;
  priority: "high" | "medium" | "low";
  source: "carryover" | "goal-aligned" | "new";
}

export const useWeeklyInsights = () => {
  const [insight, setInsight] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ObjectiveSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async (weeklyData: WeeklyData) => {
    // Don't generate if no meaningful data
    if (weeklyData.objectives.length === 0 && !weeklyData.lastWeekReflection && !weeklyData.lastWeekIntention) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('weekly-insights', {
        body: { type: 'insights', weeklyData }
      });

      if (funcError) {
        const msg = `[weekly-insights] ${funcError.message}`;
        console.error(msg, funcError);
        if (msg.includes('402') || msg.toLowerCase().includes('payment') || msg.toLowerCase().includes('credit')) {
          handleAIError('AI credits exhausted');
          setError('AI credits exhausted. Please add credits to continue.');
          return null;
        }
        if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
          handleAIError('Rate limit');
          setError('Rate limit exceeded. Please try again later.');
          return null;
        }
        setError('Failed to generate insights');
        return null;
      }

      if (data?.error) {
        handleAIError(data.error);
        setError(data.error);
        return null;
      }

      setInsight(data.insight);
      return data.insight;
    } catch (err) {
      console.error("Failed to generate insights:", err);
      setError("Failed to generate insights");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestions = async (suggestionsData: SuggestionsData) => {
    // Need at least some data to generate suggestions
    if (suggestionsData.incompleteObjectives.length === 0 && 
        suggestionsData.completedObjectives.length === 0 && 
        suggestionsData.goals.length === 0) {
      return [];
    }

    setIsSuggestionsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('weekly-insights', {
        body: { type: 'suggestions', suggestionsData }
      });

      if (funcError) {
        const msg = `[weekly-insights] ${funcError.message}`;
        console.error(msg, funcError);
        if (msg.includes('402') || msg.toLowerCase().includes('payment') || msg.toLowerCase().includes('credit')) {
          handleAIError('AI credits exhausted');
          setError('AI credits exhausted. Please add credits to continue.');
          setSuggestions([]);
          return [];
        }
        if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
          handleAIError('Rate limit');
          setError('Rate limit exceeded. Please try again later.');
          setSuggestions([]);
          return [];
        }
        setError('Failed to generate suggestions');
        setSuggestions([]);
        return [];
      }

      if (data?.error) {
        handleAIError(data.error);
        setError(data.error);
        return [];
      }

      const parsedSuggestions = data.suggestions || [];
      setSuggestions(parsedSuggestions);
      return parsedSuggestions;
    } catch (err) {
      console.error("Failed to generate suggestions:", err);
      setError("Failed to generate suggestions");
      setSuggestions([]);
      return [];
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  const handleAIError = (errorMessage: string) => {
    if (errorMessage.includes("Rate limit")) {
      toast({
        title: "Please wait",
        description: "AI is busy. Try again in a moment.",
        variant: "default",
      });
    } else if (errorMessage.includes("credits")) {
      toast({
        title: "AI Credits",
        description: "AI credits exhausted. Contact workspace admin.",
        variant: "destructive",
      });
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    insight,
    suggestions,
    isLoading,
    isSuggestionsLoading,
    error,
    generateInsights,
    generateSuggestions,
    clearSuggestions,
  };
};
