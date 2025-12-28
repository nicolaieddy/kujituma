import { useMemo } from "react";
import { WeeklyPlanningSession } from "@/types/habits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { format, parseISO, getISOWeek } from "date-fns";
import { TrendingUp, CheckCircle, Clock } from "lucide-react";

interface PlanningTrendsChartProps {
  sessions: WeeklyPlanningSession[];
}

export const PlanningTrendsChart = ({ sessions }: PlanningTrendsChartProps) => {
  const chartData = useMemo(() => {
    return sessions
      .slice(0, 12)
      .reverse()
      .map((session) => ({
        week: `W${getISOWeek(parseISO(session.week_start))}`,
        weekStart: session.week_start,
        completed: session.is_completed ? 1 : 0,
        reflectionLength: session.last_week_reflection?.length || 0,
        intentionLength: session.week_intention?.length || 0,
        totalWords: (
          (session.last_week_reflection?.split(/\s+/).length || 0) +
          (session.week_intention?.split(/\s+/).length || 0)
        ),
      }));
  }, [sessions]);

  const stats = useMemo(() => {
    const completed = sessions.filter(s => s.is_completed).length;
    const total = sessions.length;
    const avgWords = sessions.length > 0 
      ? Math.round(
          sessions.reduce((sum, s) => 
            sum + (s.last_week_reflection?.split(/\s+/).length || 0) + 
            (s.week_intention?.split(/\s+/).length || 0), 0
          ) / sessions.length
        )
      : 0;
    
    return { completed, total, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0, avgWords };
  }, [sessions]);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.completed}/{stats.total} sessions</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Avg. Words</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgWords}</p>
            <p className="text-xs text-muted-foreground">per session</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Total Sessions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground">recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Over Time Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Planning Engagement Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="planningGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Words', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg text-sm">
                          <p className="font-medium">{data.week}</p>
                          <p className="text-muted-foreground">Total words: {data.totalWords}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalWords"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#planningGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly Completion Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg text-sm">
                          <p className="font-medium">{data.week}</p>
                          <p className="text-muted-foreground">
                            {data.completed ? 'Completed ✓' : 'Not completed'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.completed ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
