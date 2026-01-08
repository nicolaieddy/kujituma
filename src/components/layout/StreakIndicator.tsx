import { Flame } from "lucide-react";
import { useStreaks } from "@/hooks/useStreaks";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const StreakIndicator = () => {
  const { currentDailyStreak, currentWeeklyStreak, isLoading } = useStreaks();

  if (isLoading) return null;

  const hasStreaks = currentDailyStreak > 0 || currentWeeklyStreak > 0;
  if (!hasStreaks) return null;

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
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          {currentDailyStreak > 0 && <p>🔥 {currentDailyStreak} day streak</p>}
          {currentWeeklyStreak > 0 && <p>🌟 {currentWeeklyStreak} week streak</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
