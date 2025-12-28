import { useMemo } from "react";
import { DailyCheckIn } from "@/types/habits";
import { format, eachDayOfInterval, subDays, parseISO, startOfWeek, getDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CheckInHeatmapProps {
  checkIns: DailyCheckIn[];
  weeks?: number;
}

const moodColors: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-green-400",
  5: "bg-emerald-500",
};

export const CheckInHeatmap = ({ checkIns, weeks = 12 }: CheckInHeatmapProps) => {
  const today = new Date();
  const startDate = subDays(today, weeks * 7);

  // Create a map of check-ins by date
  const checkInMap = useMemo(() => {
    const map: Record<string, DailyCheckIn> = {};
    checkIns.forEach((c) => {
      map[c.check_in_date] = c;
    });
    return map;
  }, [checkIns]);

  // Generate all days in the interval
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: today });
  }, [startDate, today]);

  // Group days by week (columns)
  const weeksData = useMemo(() => {
    const grouped: Date[][] = [];
    let currentWeek: Date[] = [];
    
    days.forEach((day, index) => {
      const dayOfWeek = getDay(day);
      
      // Start a new week on Sunday (0)
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        grouped.push(currentWeek);
        currentWeek = [];
      }
      
      currentWeek.push(day);
      
      // Push the last week
      if (index === days.length - 1) {
        grouped.push(currentWeek);
      }
    });
    
    return grouped;
  }, [days]);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {/* Day labels column */}
        <div className="flex flex-col gap-1 pr-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-3 w-3 text-[10px] text-muted-foreground flex items-center justify-center">
              {i % 2 === 1 ? label : ''}
            </div>
          ))}
        </div>
        
        {/* Weeks */}
        <div className="flex gap-1 overflow-x-auto">
          {weeksData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {/* Fill empty days at start of first week */}
              {weekIndex === 0 && Array.from({ length: getDay(week[0]) }).map((_, i) => (
                <div key={`empty-${i}`} className="h-3 w-3" />
              ))}
              
              {week.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const checkIn = checkInMap[dateStr];
                const hasCheckIn = !!checkIn;
                const mood = checkIn?.mood_rating;
                
                return (
                  <TooltipProvider key={dateStr}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "h-3 w-3 rounded-sm transition-colors cursor-pointer",
                            hasCheckIn && mood
                              ? moodColors[mood]
                              : hasCheckIn
                              ? "bg-primary/60"
                              : "bg-muted/40"
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{format(day, 'MMM d, yyyy')}</p>
                        {hasCheckIn ? (
                          <div className="text-muted-foreground">
                            {mood && <span>Mood: {['😔', '😕', '😐', '🙂', '😊'][mood - 1]}</span>}
                            {checkIn.energy_level && <span> Energy: {checkIn.energy_level}/5</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No check-in</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-muted/40" />
          {[1, 2, 3, 4, 5].map((level) => (
            <div key={level} className={cn("h-3 w-3 rounded-sm", moodColors[level])} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
};
