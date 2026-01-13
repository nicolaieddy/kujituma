import { useMemo } from "react";
import { DailyCheckIn } from "@/types/habits";
import { format, eachDayOfInterval, subDays, getDay, isSameDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

interface CheckInHeatmapProps {
  checkIns?: DailyCheckIn[];
  weeks?: number;
  showCard?: boolean;
}

const HeatmapGrid = ({ checkIns, weeks = 52 }: { checkIns: DailyCheckIn[]; weeks: number }) => {
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

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeksData.forEach((week, weekIndex) => {
      const month = week[0].getMonth();
      if (month !== lastMonth) {
        labels.push({ label: format(week[0], 'MMM'), weekIndex });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeksData]);

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex ml-8 text-xs text-muted-foreground">
        {monthLabels.map(({ label, weekIndex }, i) => {
          const prevIndex = i > 0 ? monthLabels[i - 1].weekIndex : 0;
          const offset = i === 0 ? weekIndex * 16 : (weekIndex - prevIndex) * 16;
          return (
            <div key={i} style={{ marginLeft: i === 0 ? offset : offset - 16 }}>
              {label}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {/* Day labels column */}
        <div className="flex flex-col gap-1 pr-1 flex-shrink-0">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-3 w-6 text-[10px] text-muted-foreground flex items-center justify-end pr-1">
              {label}
            </div>
          ))}
        </div>
        
        {/* Weeks */}
        <div className="flex gap-1">
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
                const isToday = isSameDay(day, today);
                
                return (
                  <Tooltip key={dateStr}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-3 w-3 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-primary/50",
                          hasCheckIn
                            ? "bg-primary"
                            : "bg-muted/40",
                          isToday && "ring-2 ring-primary"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{format(day, 'EEEE, MMM d, yyyy')}</p>
                      {hasCheckIn ? (
                        <span className="text-primary">✓ Checked in</span>
                      ) : (
                        <span className="text-muted-foreground">No check-in</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend - simplified to binary */}
      <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-muted/40" />
          <span>No check-in</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span>Checked in</span>
        </div>
      </div>
    </div>
  );
};

export const CheckInHeatmap = ({ checkIns: propCheckIns, weeks = 52, showCard = true }: CheckInHeatmapProps) => {
  const { user } = useAuth();

  // Fetch check-ins if not provided via props
  const { data: fetchedCheckIns, isLoading } = useQuery({
    queryKey: ['daily-check-ins-heatmap', user?.id, weeks],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user!.id)
        .gte('check_in_date', format(subDays(new Date(), weeks * 7), 'yyyy-MM-dd'))
        .order('check_in_date', { ascending: false });
      
      if (error) throw error;
      return data as DailyCheckIn[];
    },
    enabled: !!user && !propCheckIns,
  });

  const checkIns = propCheckIns || fetchedCheckIns || [];
  const totalCheckIns = checkIns.length;

  if (isLoading && !propCheckIns) {
    if (!showCard) {
      return <Skeleton className="h-32 w-full" />;
    }
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!showCard) {
    return <HeatmapGrid checkIns={checkIns} weeks={weeks} />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Daily Check-in Activity
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{totalCheckIns} check-ins this year</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <HeatmapGrid checkIns={checkIns} weeks={weeks} />
      </CardContent>
    </Card>
  );
};
