import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { useStreaks } from "@/hooks/useStreaks";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, parseISO, startOfWeek, eachDayOfInterval, eachWeekOfInterval, subWeeks } from "date-fns";
import { TrendingUp, Flame, Sun, CalendarDays, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChartDataPoint {
  date: string;
  label: string;
  daily: number;
  weekly: number;
  quarterly: number;
}

export const StreakHistoryChart = () => {
  const { user } = useAuth();
  const { 
    currentDailyStreak, 
    longestDailyStreak,
    currentWeeklyStreak,
    longestWeeklyStreak,
    currentQuarterlyStreak,
    longestQuarterlyStreak,
    isLoading: streaksLoading 
  } = useStreaks();

  const { data: dailyCheckIns, isLoading: checkInsLoading } = useQuery({
    queryKey: ['all-daily-check-ins-chart', user?.id],
    queryFn: () => HabitsService.getAllDailyCheckIns(90),
    enabled: !!user,
  });

  const { data: weeklySessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['all-weekly-sessions-chart', user?.id],
    queryFn: () => HabitsService.getAllWeeklyPlanningSessions(),
    enabled: !!user,
  });

  const { data: quarterlyReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['all-quarterly-reviews-chart', user?.id],
    queryFn: () => HabitsService.getAllQuarterlyReviews(),
    enabled: !!user,
  });

  const isLoading = streaksLoading || checkInsLoading || sessionsLoading || reviewsLoading;

  // Build chart data for the last 12 weeks
  const chartData = (() => {
    if (!dailyCheckIns && !weeklySessions) return [];

    const today = new Date();
    const weeks = eachWeekOfInterval({
      start: subWeeks(today, 11),
      end: today,
    }, { weekStartsOn: 1 }); // Monday start

    const checkInDates = new Set((dailyCheckIns || []).map(c => c.check_in_date));
    const sessionWeeks = new Set((weeklySessions || []).filter(s => s.is_completed).map(s => s.week_start));
    const completedQuarters = new Set((quarterlyReviews || []).filter(r => r.is_completed).map(r => `${r.year}-Q${r.quarter}`));

    return weeks.map((weekStart, index) => {
      // Count daily check-ins for this week
      const weekDays = eachDayOfInterval({
        start: weekStart,
        end: new Date(Math.min(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000, today.getTime()))
      });
      const dailyCount = weekDays.filter(day => 
        checkInDates.has(format(day, 'yyyy-MM-dd'))
      ).length;

      // Check if weekly planning was done this week
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weeklyDone = sessionWeeks.has(weekStartStr) ? 1 : 0;

      // Check quarterly (simplified - mark 1 if any review exists in that quarter period)
      const quarter = Math.floor(weekStart.getMonth() / 3) + 1;
      const year = weekStart.getFullYear();
      const quarterlyDone = completedQuarters.has(`${year}-Q${quarter}`) ? 1 : 0;

      return {
        date: weekStartStr,
        label: format(weekStart, 'MMM d'),
        daily: dailyCount,
        weekly: weeklyDone,
        quarterly: quarterlyDone,
      };
    });
  })();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">Week of {label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Daily check-ins:</span>
              <span className="font-medium">{payload[0]?.value || 0}/7</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Weekly planning:</span>
              <span className="font-medium">{payload[1]?.value ? '✓' : '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-muted-foreground">Quarterly review:</span>
              <span className="font-medium">{payload[2]?.value ? '✓' : '—'}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Consistency Over Time
          </CardTitle>
          <Badge variant="outline" className="text-xs">Last 12 weeks</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Streaks Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10">
            <Sun className="h-5 w-5 text-amber-500" />
            <div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-lg">{currentDailyStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Daily (best: {longestDailyStreak})</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            <div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-blue-500" />
                <span className="font-bold text-lg">{currentWeeklyStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Weekly (best: {longestWeeklyStreak})</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10">
            <ClipboardList className="h-5 w-5 text-purple-500" />
            <div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-purple-500" />
                <span className="font-bold text-lg">{currentQuarterlyStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Quarterly (best: {longestQuarterlyStreak})</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                domain={[0, 7]}
                ticks={[0, 2, 4, 6]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="daily"
                stroke="hsl(43, 96%, 56%)"
                strokeWidth={2}
                fill="url(#dailyGradient)"
                dot={{ fill: "hsl(43, 96%, 56%)", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Area
                type="stepAfter"
                dataKey="weekly"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fill="url(#weeklyGradient)"
                dot={{ fill: "hsl(217, 91%, 60%)", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Daily check-ins (per week)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Weekly planning completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
