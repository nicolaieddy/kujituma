import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { Target, Flame, CheckCircle2, TrendingUp, Calendar, Trophy, ArrowRight } from 'lucide-react';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { AnalyticsEmpty } from '@/components/illustrations/AnalyticsEmpty';

export const AnalyticsDashboard = () => {
  const { data: rawData, isLoading } = useAnalyticsSummary();
  const data = rawData ?? {
    completionRate: 0,
    completedObjectives: 0,
    totalObjectives: 0,
    currentStreak: 0,
    longestStreak: 0,
    goalsCompleted: 0,
    goalsInProgress: 0,
    activeWeeks: 0,
    avgObjectivesPerWeek: 0,
    weeklyProgress: [],
    categoryBreakdown: [],
    recentWeeks: [],
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'text-orange-500';
    if (streak >= 5) return 'text-amber-500';
    if (streak >= 1) return 'text-green-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completionRate.toFixed(0)}%</div>
            <Progress value={data.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.completedObjectives} of {data.totalObjectives} objectives done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Streak</CardTitle>
            <Flame className={`h-4 w-4 ${getStreakColor(data.currentStreak)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStreakColor(data.currentStreak)}`}>
              {data.currentStreak} {data.currentStreak === 1 ? 'week' : 'weeks'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.currentStreak > 0 ? 'Keep it going!' : 'Complete 80%+ to build streak'}
            </p>
            {data.longestStreak > data.currentStreak && (
              <p className="text-xs text-muted-foreground mt-1">
                Best: {data.longestStreak} weeks
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.goalsCompleted}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.goalsInProgress} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Weeks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeWeeks}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Avg {data.avgObjectivesPerWeek.toFixed(1)} objectives/week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.weeklyProgress}>
                  <defs>
                    <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="weekLabel" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-md">
                            <p className="text-sm font-medium">{data.weekLabel}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.completed}/{data.total} completed ({data.rate.toFixed(0)}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#completionGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data yet. Start adding objectives!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              Goals by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.categoryBreakdown} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    tick={{ fontSize: 11 }} 
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-md">
                            <p className="text-sm font-medium">{data.category}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.completed}/{data.total} objectives ({data.rate.toFixed(0)}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {data.categoryBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.rate >= 80 ? 'hsl(142 76% 36%)' : entry.rate >= 50 ? 'hsl(45 93% 47%)' : 'hsl(var(--muted-foreground))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No categorized goals yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Weeks Summary */}
      {data.recentWeeks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.recentWeeks.map((week) => (
                <div 
                  key={week.weekStart} 
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{week.label}</span>
                    <span className={`text-sm font-bold ${
                      week.rate >= 80 ? 'text-green-600' : 
                      week.rate >= 50 ? 'text-amber-500' : 
                      'text-muted-foreground'
                    }`}>
                      {week.rate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={week.rate} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {week.completed}/{week.total} completed
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
