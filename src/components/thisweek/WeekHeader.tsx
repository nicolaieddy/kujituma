import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { StreakCounter } from "@/components/habits/StreakCounter";
import { useQuarterlyReviewTrigger } from "@/contexts/QuarterlyReviewContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WeekHeaderProps {
  weekNumber: number;
  weekRange: string;
  currentWeekStart: string;
  completedCount: number;
  totalCount: number;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
}

export const WeekHeader = ({
  weekNumber,
  weekRange,
  currentWeekStart,
  completedCount,
  totalCount,
  onNavigateWeek
}: WeekHeaderProps) => {
  const isCurrentWeek = WeeklyProgressService.isCurrentWeek(currentWeekStart);
  
  // Safe access to quarterly review context
  let openQuarterlyHistory: (() => void) | undefined;
  try {
    const quarterlyContext = useQuarterlyReviewTrigger();
    openQuarterlyHistory = quarterlyContext.openQuarterlyHistory;
  } catch {
    // Context not available
  }
  
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onNavigateWeek && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateWeek('previous')}
                  className="px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateWeek('next')}
                  className="px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div>
              <CardTitle className="text-foreground text-2xl">
                Week {weekNumber}
              </CardTitle>
              <p className="text-muted-foreground mt-1">{weekRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Quarterly Review Button */}
            {isCurrentWeek && openQuarterlyHistory && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openQuarterlyHistory}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ClipboardList className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quarterly Reviews</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Streak Counter - only show on current week */}
            {isCurrentWeek && <StreakCounter variant="compact" />}
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {totalCount > 0 && (
                <div className="text-foreground text-sm">
                  {completedCount}/{totalCount} completed
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};