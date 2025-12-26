import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, LineChart, Line, PieChart, Pie } from 'recharts';
import { Target, TrendingUp, TrendingDown, Flame, CheckCircle2, Calendar, Award, Zap, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { format, parseISO } from 'date-fns';

export const AnalyticsDashboard = () => {
  const { analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'text-orange-500';
    if (streak >= 5) return 'text-yellow-500';
    if (streak >= 1) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (analytics.trend.trend === 'improving') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (analytics.trend.trend === 'declining') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (analytics.trend.trend === 'improving') return 'text-green-600';
    if (analytics.trend.trend === 'declining') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'hsl(142 76% 36%)'; // green
    if (rate >= 50) return 'hsl(45 93% 47%)'; // yellow
    if (rate > 0) return 'hsl(0 84% 60%)'; // red
    return 'hsl(var(--muted))';
  };

  // Prepare pie chart data for goals
  const goalsPieData = [
    { name: 'Completed', value: analytics.goalsStats.completed, fill: 'hsl(142 76% 36%)' },
    { name: 'In Progress', value: analytics.goalsStats.inProgress, fill: 'hsl(217 91% 60%)' },
    { name: 'Not Started', value: analytics.goalsStats.notStarted, fill: 'hsl(var(--muted))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
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
              <span className="text-xs text-muted-foreground">/ Best: {analytics.longestStreak}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            {getTrendIcon()}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getTrendColor()}`}>
              {analytics.trend.trend === 'improving' ? 'Improving' : analytics.trend.trend === 'declining' ? 'Declining' : 'Stable'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.trend.changePercent > 0 ? '+' : ''}{analytics.trend.changePercent.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.consistencyScore.toFixed(0)}%</div>
            <Progress value={analytics.consistencyScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Weeks with 50%+ completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quarter Comparison and Goals Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quarter Comparison
            </CardTitle>
            <CardDescription>
              {analytics.quarterComparison.currentQuarter.label} vs {analytics.quarterComparison.previousQuarter.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Quarter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{analytics.quarterComparison.currentQuarter.label}</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.quarterComparison.currentQuarter.completed}/{analytics.quarterComparison.currentQuarter.total} objectives
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={analytics.quarterComparison.currentQuarter.completionRate} 
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {analytics.quarterComparison.currentQuarter.completionRate.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Previous Quarter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{analytics.quarterComparison.previousQuarter.label}</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.quarterComparison.previousQuarter.completed}/{analytics.quarterComparison.previousQuarter.total} objectives
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={analytics.quarterComparison.previousQuarter.completionRate} 
                  className="flex-1 [&>div]:bg-muted-foreground"
                />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {analytics.quarterComparison.previousQuarter.completionRate.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Comparison Summary */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completion change</span>
                <span className={analytics.quarterComparison.change >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {analytics.quarterComparison.change >= 0 ? '+' : ''}{analytics.quarterComparison.change.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Volume change</span>
                <span className={analytics.quarterComparison.volumeChange >= 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground font-medium'}>
                  {analytics.quarterComparison.volumeChange >= 0 ? '+' : ''}{analytics.quarterComparison.volumeChange} objectives
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Goals Overview
            </CardTitle>
            <CardDescription>
              Long-term goal completion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {goalsPieData.length > 0 ? (
                <div className="h-[120px] w-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={goalsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {goalsPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[120px] w-[120px] flex items-center justify-center text-muted-foreground text-sm">
                  No goals
                </div>
              )}
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-sm">Completed</span>
                  </div>
                  <span className="font-medium">{analytics.goalsStats.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm">In Progress</span>
                  </div>
                  <span className="font-medium">{analytics.goalsStats.inProgress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted"></div>
                    <span className="text-sm">Not Started</span>
                  </div>
                  <span className="font-medium">{analytics.goalsStats.notStarted}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span>Goal completion rate</span>
                <span className="font-medium text-green-600">{analytics.goalsCompletionRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
          <CardDescription>
            Completion rates over the last 12 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.recentActivity}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  className="text-xs" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium">{format(parseISO(data.date), 'MMM d, yyyy')}</p>
                          <p className="text-muted-foreground">
                            {data.completed}/{data.total} completed ({data.completionRate.toFixed(0)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {analytics.recentActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCompletionColor(entry.completionRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142 76% 36%)' }}></div>
              <span>80%+ completion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(45 93% 47%)' }}></div>
              <span>50-79%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0 84% 60%)' }}></div>
              <span>1-49%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted"></div>
              <span>No activity</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best/Worst Weeks and Goals Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Best & Worst Weeks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Performance Highlights
            </CardTitle>
            <CardDescription>
              Your best and areas for improvement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.bestWorstWeeks.best && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Best Week</span>
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">
                  {format(parseISO(analytics.bestWorstWeeks.best.date), 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {analytics.bestWorstWeeks.best.completed}/{analytics.bestWorstWeeks.best.total} objectives ({analytics.bestWorstWeeks.best.completionRate.toFixed(0)}%)
                </p>
              </div>
            )}
            
            {analytics.bestWorstWeeks.worst && analytics.bestWorstWeeks.worst !== analytics.bestWorstWeeks.best && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Needs Improvement</span>
                </div>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {format(parseISO(analytics.bestWorstWeeks.worst.date), 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  {analytics.bestWorstWeeks.worst.completed}/{analytics.bestWorstWeeks.worst.total} objectives ({analytics.bestWorstWeeks.worst.completionRate.toFixed(0)}%)
                </p>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Avg. objectives/week</span>
                <span className="font-medium">{analytics.averageObjectivesPerWeek.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total active weeks</span>
                <span className="font-medium">{analytics.totalActiveWeeks}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Most Active Goals
            </CardTitle>
            <CardDescription>
              Goals with the most weekly objectives
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.goalBreakdown.length > 0 ? (
              <div className="space-y-3">
                {analytics.goalBreakdown.slice(0, 5).map((goal, index) => (
                  <div key={goal.goalId || index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">{goal.goalTitle}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {goal.completed}/{goal.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${goal.completionRate}%`,
                            backgroundColor: getCompletionColor(goal.completionRate)
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {goal.completionRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No objectives linked to goals yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
