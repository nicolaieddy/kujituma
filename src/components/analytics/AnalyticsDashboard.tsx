import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, LineChart, Line, PieChart, Pie } from 'recharts';
import { Target, TrendingUp, TrendingDown, Flame, CheckCircle2, Calendar, Award, Zap, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Grid3X3 } from 'lucide-react';
import { useAnalytics, HeatmapWeek } from '@/hooks/useAnalytics';
import { format, parseISO } from 'date-fns';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
            <CardTitle className="text-sm font-medium">Weekly Streak</CardTitle>
            <Flame className={`h-4 w-4 ${getStreakColor(analytics.currentStreak)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStreakColor(analytics.currentStreak)}`}>
              {analytics.currentStreak} {analytics.currentStreak === 1 ? 'week' : 'weeks'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Consecutive weeks with 80%+ completion
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={analytics.currentStreak > 0 ? "default" : "secondary"} className="text-xs">
                {analytics.currentStreak > 0 ? 'Active' : 'Build your streak!'}
              </Badge>
              {analytics.longestStreak > 0 && (
                <span className="text-xs text-muted-foreground">Best: {analytics.longestStreak}</span>
              )}
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

      {/* Weekly Activity Chart - Stacked bars showing completed vs incomplete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Objectives
          </CardTitle>
          <CardDescription>
            Completed vs incomplete objectives over the last 12 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={analytics.recentActivity.map(w => ({
                  ...w,
                  incomplete: w.total - w.completed
                }))}
              >
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium mb-2">{format(parseISO(data.date), 'MMM d, yyyy')}</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(142 76% 36%)' }}></div>
                              <span>Completed: {data.completed}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
                              <span>Incomplete: {data.incomplete}</span>
                            </div>
                            <p className="text-muted-foreground pt-1 border-t mt-1">
                              {data.completionRate.toFixed(0)}% completion rate
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="completed" 
                  stackId="a" 
                  fill="hsl(142 76% 36%)" 
                  radius={[0, 0, 0, 0]}
                  name="Completed"
                />
                <Bar 
                  dataKey="incomplete" 
                  stackId="a" 
                  fill="hsl(var(--muted))" 
                  radius={[4, 4, 0, 0]}
                  name="Incomplete"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142 76% 36%)' }}></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted"></div>
              <span>Incomplete</span>
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

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Year in Review
          </CardTitle>
          <CardDescription>
            Weekly activity over the past year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap data={analytics.heatmapData} />
        </CardContent>
      </Card>
    </div>
  );
};

// Activity Heatmap Component
const ActivityHeatmap = ({ data }: { data: HeatmapWeek[] }) => {
  const getHeatmapColor = (rate: number, hasActivity: boolean) => {
    if (!hasActivity) return 'bg-muted/50';
    if (rate >= 80) return 'bg-green-600';
    if (rate >= 60) return 'bg-green-500';
    if (rate >= 40) return 'bg-green-400';
    if (rate >= 20) return 'bg-green-300';
    if (rate > 0) return 'bg-green-200';
    return 'bg-muted/50';
  };

  // Group by month for labels
  const months: { label: string; startIndex: number }[] = [];
  let currentMonth = -1;
  
  data.forEach((week, index) => {
    if (week.month !== currentMonth) {
      currentMonth = week.month;
      months.push({
        label: format(parseISO(week.date), 'MMM'),
        startIndex: index
      });
    }
  });

  return (
    <div className="space-y-3">
      {/* Month labels */}
      <div className="flex text-xs text-muted-foreground pl-1">
        {months.map((month, i) => (
          <div 
            key={i} 
            className="flex-shrink-0"
            style={{ 
              marginLeft: i === 0 ? 0 : `${(month.startIndex - (months[i-1]?.startIndex || 0) - 1) * 12}px`,
              minWidth: '30px'
            }}
          >
            {month.label}
          </div>
        ))}
      </div>
      
      {/* Heatmap grid */}
      <div className="flex gap-0.5 flex-wrap">
        <TooltipProvider delayDuration={100}>
          {data.map((week, index) => (
            <UITooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={`w-2.5 h-2.5 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${getHeatmapColor(week.completionRate, week.total > 0)}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{format(parseISO(week.date), 'MMM d, yyyy')}</p>
                {week.total > 0 ? (
                  <p className="text-muted-foreground">
                    {week.completed}/{week.total} completed ({week.completionRate.toFixed(0)}%)
                  </p>
                ) : (
                  <p className="text-muted-foreground">No activity</p>
                )}
              </TooltipContent>
            </UITooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs pt-2">
        <span className="text-muted-foreground">Less</span>
        <div className="flex gap-0.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-muted/50"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-green-200"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-green-300"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-green-400"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-green-600"></div>
        </div>
        <span className="text-muted-foreground">More</span>
      </div>
    </div>
  );
};
