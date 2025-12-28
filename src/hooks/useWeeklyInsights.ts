import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WeeklyData {
  objectives: { text: string; is_completed: boolean }[];
  lastWeekReflection?: string;
  lastWeekIntention?: string;
  progressNotes?: string;
}

export const useWeeklyInsights = () => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
        body: { weeklyData }
      });

      if (funcError) {
        throw funcError;
      }

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({
            title: "Please wait",
            description: "AI is busy. Try again in a moment.",
            variant: "default",
          });
        } else if (data.error.includes("credits")) {
          toast({
            title: "AI Credits",
            description: "AI credits exhausted. Contact workspace admin.",
            variant: "destructive",
          });
        }
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

  return {
    insight,
    isLoading,
    error,
    generateInsights,
  };
};
