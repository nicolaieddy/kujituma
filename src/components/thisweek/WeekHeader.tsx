import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, ClipboardList, Sun, CalendarDays, CheckCircle } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useQuarterlyReviewTrigger } from "@/contexts/QuarterlyReviewContext";
import { useRitualsTrigger } from "@/contexts/RitualsContext";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CachedDataIndicator } from "@/components/pwa/CachedDataIndicator";
import { StaleDataIndicator } from "@/components/pwa/StaleDataIndicator";

interface WeekHeaderProps {
  weekNumber: number;
  weekRange: string;
  currentWeekStart: string;
  completedCount: number;
  totalCount: number;
  movedCount?: number;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
  isCached?: boolean;
  lastSync?: Date | null;
  isRefetching?: boolean;
  onRefresh?: () => void;
}

export const WeekHeader = ({
  weekNumber,
  weekRange,
  currentWeekStart,
  completedCount,
  totalCount,
  movedCount = 0,
  onNavigateWeek,
  isCached,
  lastSync,
  isRefetching,
  onRefresh
}: WeekHeaderProps) => {
  const isCurrentWeek = WeeklyProgressService.isCurrentWeek(currentWeekStart);
  
  const { openQuarterlyHistory } = useQuarterlyReviewTrigger();
  const { 
    openWeeklyPlanning, 
    openWeeklyPlanningHistory,
    openDailyCheckIn,
    openDailyCheckInHistory 
  } = useRitualsTrigger();
  
  const { hasCompletedPlanning } = useWeeklyPlanning(currentWeekStart);
  const { hasCheckedInToday } = useDailyCheckIn();
  
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
              <div className="flex items-center gap-2">
                <CardTitle className="text-foreground text-2xl">
                  Week {weekNumber}
                </CardTitle>
                <StaleDataIndicator 
                  isCached={!!isCached} 
                  isRefetching={isRefetching}
                  lastSyncTime={lastSync}
                  onRefresh={onRefresh}
                  compact
                />
              </div>
              <p className="text-muted-foreground mt-1">{weekRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Daily Check-in Button - Removed nested TooltipProvider */}
            {isCurrentWeek && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={hasCheckedInToday ? openDailyCheckInHistory : openDailyCheckIn}
                    className={`text-muted-foreground hover:text-foreground relative overflow-visible ${
                      !hasCheckedInToday ? 'animate-pulse' : ''
                    }`}
                  >
                    <Sun className="h-5 w-5" />
                    {hasCheckedInToday && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 absolute -top-1.5 -right-1.5 fill-background" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hasCheckedInToday ? 'View Check-in History' : 'Daily Check-in'}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Weekly Planning Button - Removed nested TooltipProvider */}
            {isCurrentWeek && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-muted-foreground hover:text-foreground relative overflow-visible ${
                          !hasCompletedPlanning ? 'animate-pulse' : ''
                        }`}
                      >
                        <CalendarDays className="h-5 w-5" />
                        {hasCompletedPlanning && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 absolute -top-1.5 -right-1.5 fill-background" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Weekly Planning</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openWeeklyPlanning}>
                    {hasCompletedPlanning ? 'View This Week\'s Plan' : 'Start Planning'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openWeeklyPlanningHistory}>
                    Planning History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Quarterly Review Button - Removed nested TooltipProvider */}
            {isCurrentWeek && (
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
            )}
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {totalCount > 0 && (
                <div className="text-foreground text-sm">
                  {completedCount}/{totalCount} completed
                  {movedCount > 0 && (
                    <span className="text-muted-foreground text-xs ml-1">
                      ({movedCount} rescheduled)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
