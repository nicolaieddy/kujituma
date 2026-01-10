import { Flame, Star } from "lucide-react";
import { useStreaks } from "@/hooks/useStreaks";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const StreakIndicator = () => {
  const { currentDailyStreak, currentWeeklyStreak, currentQuarterlyStreak, longestDailyStreak, longestWeeklyStreak, longestQuarterlyStreak, isLoading } = useStreaks();

  if (isLoading) return null;

  const hasStreaks = currentDailyStreak > 0 || currentWeeklyStreak > 0 || currentQuarterlyStreak > 0;
  if (!hasStreaks) return null;

  // Removed nested TooltipProvider - using App-level provider to prevent stack overflow on iOS Safari
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-accent/50 cursor-default">
          {currentDailyStreak > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-foreground">{currentDailyStreak}</span>
            </div>
          )}
          {currentWeeklyStreak > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{currentWeeklyStreak}</span>
            </div>
          )}
          {currentQuarterlyStreak > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium text-foreground">{currentQuarterlyStreak}</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm space-y-1">
          {currentDailyStreak > 0 && (
            <p>🔥 {currentDailyStreak} day streak <span className="text-muted-foreground">(best: {longestDailyStreak})</span></p>
          )}
          {currentWeeklyStreak > 0 && (
            <p>🌟 {currentWeeklyStreak} week streak <span className="text-muted-foreground">(best: {longestWeeklyStreak})</span></p>
          )}
          {currentQuarterlyStreak > 0 && (
            <p>⭐ {currentQuarterlyStreak} quarter streak <span className="text-muted-foreground">(best: {longestQuarterlyStreak})</span></p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
