import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Target, TrendingUp, Flame, CheckCircle2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

export const AnalyticsDashboard = () => {
  const { analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'text-orange-500';
    if (streak >= 5) return 'text-yellow-500';
    if (streak >= 1) return 'text-green-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.weeklyCompletionRate.toFixed(1)}%</div>
            <Progress value={analytics.weeklyCompletionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.completedObjectives} of {analytics.totalObjectives} objectives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className={`h-4 w-4 ${getStreakColor(analytics.currentStreak)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStreakColor(analytics.currentStreak)}`}>
              {analytics.currentStreak}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={analytics.currentStreak > 0 ? "default" : "secondary"} className="text-xs">
                {analytics.currentStreak > 0 ? 'Active' : 'Inactive'}
              </Badge>
              {analytics.currentStreak > 0 && (
                <span className="text-xs text-muted-foreground">weeks strong</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.longestStreak}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Personal best record
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.goalsCompletionRate.toFixed(1)}%</div>
            <Progress value={analytics.goalsCompletionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Long-term goal completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Weekly completion rates over the last 8 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.recentActivity}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Bar dataKey="total" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]}>
                  {analytics.recentActivity.map((entry, index) => {
                    const completionRate = entry.total > 0 ? (entry.completed / entry.total) * 100 : 0;
                    let color = 'hsl(var(--muted))';
                    if (completionRate >= 80) color = 'hsl(142 76% 36%)'; // green
                    else if (completionRate >= 50) color = 'hsl(45 93% 47%)'; // yellow
                    else if (completionRate > 0) color = 'hsl(0 84% 60%)'; // red
                    
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-600"></div>
              <span>80%+ completion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span>50-79% completion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>1-49% completion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-400"></div>
              <span>No activity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};