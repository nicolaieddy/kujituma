import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, PieChart, Pie } from 'recharts';
import { Target, TrendingUp, TrendingDown, Flame, CheckCircle2, Calendar as CalendarIcon, Award, Zap, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Grid3X3, Circle, CheckCircle, ExternalLink, Trophy, CalendarRange, RefreshCw, Activity } from 'lucide-react';
import { useAnalytics, HeatmapWeek, CategoryBreakdown, DateRangeFilter, CustomDateRange, HabitAnalytics } from '@/hooks/useAnalytics';
import { format, parseISO } from 'date-fns';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all_time');
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();
  const { analytics, isLoading } = useAnalytics(dateRange, customRange);

  const dateRangeLabels: Record<DateRangeFilter, string> = {
    this_week: 'This Week',
    this_month: 'This Month',
    this_quarter: 'This Quarter',
    all_time: 'All Time',
    custom: customRange?.from 
      ? customRange.to && customRange.from.getTime() !== customRange.to.getTime()
        ? `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d, yyyy')}`
        : format(customRange.from, 'MMM d, yyyy')
      : 'Custom Range'
  };

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      // Keep the Select in sync and open the calendar modal
      setDateRange('custom');
      setCalendarOpen(true);
      setTempDateRange(
        customRange?.from
          ? { from: customRange.from, to: customRange.to }
          : undefined
      );
      return;
    }

    // Switching away from custom: always close the calendar and clear custom state
    setCalendarOpen(false);
    setTempDateRange(undefined);
    setCustomRange(undefined);
    setDateRange(value as DateRangeFilter);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setTempDateRange(range);
  };

  const handleApplyCustomRange = () => {
    if (tempDateRange?.from) {
      setCustomRange({
        from: tempDateRange.from,
        to: tempDateRange.to
      });
      setDateRange('custom');
      setCalendarOpen(false);
    }
  };

  // Safety: never allow the calendar popover to remain open outside of custom mode
  useEffect(() => {
    if (dateRange !== 'custom' && calendarOpen) {
      setCalendarOpen(false);
    }
  }, [dateRange, calendarOpen]);

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
      {/* Date Range Filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarRange className="h-4 w-4" />
          <span>Showing data for: <span className="font-medium text-foreground">{dateRangeLabels[dateRange]}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Range...</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover open={calendarOpen && dateRange === 'custom'} onOpenChange={setCalendarOpen} modal={true}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10",
                  dateRange === 'custom' && "border-primary"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999]" align="end" sideOffset={4}>
              <div className="p-3 border-b">
                <p className="text-sm font-medium">Select date range</p>
                <p className="text-xs text-muted-foreground">Choose a single date or a range</p>
              </div>
              <Calendar
                mode="range"
                selected={tempDateRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
                disabled={(date) => date > new Date()}
              />
              <div className="p-3 border-t flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCalendarOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleApplyCustomRange} disabled={!tempDateRange?.from}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

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

      {/* Category Performance Breakdown */}
      {analytics.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Category Performance
            </CardTitle>
            <CardDescription>
              Completion rates by goal category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categoryBreakdown.map((category, index) => {
                const isTop = index === 0 && analytics.categoryBreakdown.length > 1;
                const isBottom = index === analytics.categoryBreakdown.length - 1 && analytics.categoryBreakdown.length > 1;
                
                return (
                  <div 
                    key={category.category} 
                    className={`p-3 rounded-lg border ${
                      isTop 
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' 
                        : isBottom 
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                          : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isTop && <Trophy className="h-4 w-4 text-green-600" />}
                        {isBottom && <TrendingDown className="h-4 w-4 text-amber-600" />}
                        <span className={`font-medium ${
                          isTop ? 'text-green-700 dark:text-green-400' : 
                          isBottom ? 'text-amber-700 dark:text-amber-400' : ''
                        }`}>
                          {category.category}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {category.goalCount} {category.goalCount === 1 ? 'goal' : 'goals'}
                        </Badge>
                      </div>
                      <span className={`font-bold ${
                        isTop ? 'text-green-600' : 
                        isBottom ? 'text-amber-600' : ''
                      }`}>
                        {category.completionRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${category.completionRate}%`,
                            backgroundColor: isTop 
                              ? 'hsl(142 76% 36%)' 
                              : isBottom 
                                ? 'hsl(45 93% 47%)'
                                : getCompletionColor(category.completionRate)
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {category.completed}/{category.total} objectives
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {analytics.categoryBreakdown.length > 1 && (
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <span>Best performing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                    <span>Needs attention</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Habits Analytics */}
      {analytics.habitAnalytics.totalHabits > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Habit Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Daily Habits Overview
              </CardTitle>
              <CardDescription>
                Tracking {analytics.habitAnalytics.totalHabits} daily habits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">Daily Completion</p>
                  <p className="text-2xl font-bold">{analytics.habitAnalytics.dailyCompletionRate.toFixed(0)}%</p>
                  <Progress value={analytics.habitAnalytics.dailyCompletionRate} className="mt-2 h-1.5" />
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">Total Check-ins</p>
                  <p className="text-2xl font-bold">{analytics.habitAnalytics.totalCompletions}</p>
                  <p className="text-xs text-muted-foreground mt-1">in selected period</p>
                </div>
              </div>

              {/* Streak info */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900">
                <Flame className="h-8 w-8 text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Habit Streak</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div>
                      <span className="text-lg font-bold text-orange-600">{analytics.habitAnalytics.streaks.current}</span>
                      <span className="text-xs text-muted-foreground ml-1">current</span>
                    </div>
                    <div className="text-muted-foreground">|</div>
                    <div>
                      <span className="text-lg font-bold">{analytics.habitAnalytics.streaks.longest}</span>
                      <span className="text-xs text-muted-foreground ml-1">best</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly trend chart */}
              {analytics.habitAnalytics.weeklyData.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Weekly Trend</p>
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.habitAnalytics.weeklyData}>
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(parseISO(value), 'M/d')}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                                  <p className="font-medium">{format(parseISO(data.date), 'MMM d, yyyy')}</p>
                                  <p>{data.completed}/{data.possible} ({data.rate.toFixed(0)}%)</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="rate" 
                          radius={[4, 4, 0, 0]}
                        >
                          {analytics.habitAnalytics.weeklyData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.rate >= 80 ? 'hsl(142 76% 36%)' : entry.rate >= 50 ? 'hsl(45 93% 47%)' : 'hsl(var(--muted))'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performing Habits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Top Performing Habits
              </CardTitle>
              <CardDescription>
                Your most consistent daily habits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.habitAnalytics.topHabits.length > 0 ? (
                <div className="space-y-3">
                  {analytics.habitAnalytics.topHabits.map((habit, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {index === 0 && <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                          <span className="text-sm font-medium truncate">{habit.habitText}</span>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                          {habit.frequency}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{habit.goalTitle}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${habit.rate}%`,
                              backgroundColor: habit.rate >= 80 ? 'hsl(142 76% 36%)' : habit.rate >= 50 ? 'hsl(45 93% 47%)' : 'hsl(var(--muted-foreground))'
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {habit.completions}/{habit.possible} ({habit.rate.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No habit completions yet</p>
                  <p className="text-xs mt-1">Start checking off your daily habits!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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

// Week Drill-Down Dialog
interface WeekObjective {
  id: string;
  text: string;
  is_completed: boolean;
  goal_title?: string;
}

const WeekDrillDownDialog = ({ 
  week, 
  open, 
  onOpenChange 
}: { 
  week: HeatmapWeek | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [objectives, setObjectives] = useState<WeekObjective[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!week || !user || !open) return;

    const fetchObjectives = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('weekly_objectives')
          .select('id, text, is_completed, goals(title)')
          .eq('user_id', user.id)
          .eq('week_start', week.date)
          .order('is_completed', { ascending: false })
          .order('created_at', { ascending: true });

        if (data) {
          setObjectives(data.map(obj => ({
            id: obj.id,
            text: obj.text,
            is_completed: obj.is_completed,
            goal_title: (obj.goals as any)?.title
          })));
        }
      } catch (error) {
        console.error('Error fetching objectives:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchObjectives();
  }, [week, user, open]);

  if (!week) return null;

  const completedCount = objectives.filter(o => o.is_completed).length;
  const incompleteCount = objectives.filter(o => !o.is_completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week of {format(parseISO(week.date), 'MMM d, yyyy')}
          </DialogTitle>
          <DialogDescription>
            {week.total > 0 ? (
              <span className="flex items-center gap-2">
                <span className="font-medium text-foreground">{week.completed}/{week.total}</span> objectives completed
                <Badge variant={week.completionRate >= 80 ? "default" : week.completionRate >= 50 ? "secondary" : "outline"}>
                  {week.completionRate.toFixed(0)}%
                </Badge>
              </span>
            ) : (
              'No objectives this week'
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : objectives.length > 0 ? (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {/* Completed objectives */}
              {completedCount > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Completed ({completedCount})
                  </p>
                  {objectives.filter(o => o.is_completed).map(obj => (
                    <div 
                      key={obj.id} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-through text-muted-foreground">{obj.text}</p>
                        {obj.goal_title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Goal: {obj.goal_title}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Incomplete objectives */}
              {incompleteCount > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Not Completed ({incompleteCount})
                  </p>
                  {objectives.filter(o => !o.is_completed).map(obj => (
                    <div 
                      key={obj.id} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{obj.text}</p>
                        {obj.goal_title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Goal: {obj.goal_title}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No objectives were set this week</p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate('/goals');
            }}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Go to Goals
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Activity Heatmap Component
const ActivityHeatmap = ({ data }: { data: HeatmapWeek[] }) => {
  const [displayMode, setDisplayMode] = useState<'rate' | 'count'>('rate');
  const [selectedWeek, setSelectedWeek] = useState<HeatmapWeek | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Find max count for scaling
  const maxCount = Math.max(...data.map(w => w.total), 1);

  const getHeatmapColor = (week: HeatmapWeek) => {
    if (week.total === 0) return 'bg-muted/50';
    
    if (displayMode === 'rate') {
      const rate = week.completionRate;
      if (rate >= 80) return 'bg-green-600';
      if (rate >= 60) return 'bg-green-500';
      if (rate >= 40) return 'bg-green-400';
      if (rate >= 20) return 'bg-green-300';
      if (rate > 0) return 'bg-green-200';
      return 'bg-muted/50';
    } else {
      // Count mode - scale by total objectives
      const intensity = week.total / maxCount;
      if (intensity >= 0.8) return 'bg-blue-600';
      if (intensity >= 0.6) return 'bg-blue-500';
      if (intensity >= 0.4) return 'bg-blue-400';
      if (intensity >= 0.2) return 'bg-blue-300';
      if (intensity > 0) return 'bg-blue-200';
      return 'bg-muted/50';
    }
  };

  const handleWeekClick = (week: HeatmapWeek) => {
    setSelectedWeek(week);
    setDialogOpen(true);
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
    <>
      <div className="space-y-3">
        {/* Toggle between modes */}
        <div className="flex items-center justify-between">
          <ToggleGroup 
            type="single" 
            value={displayMode} 
            onValueChange={(value) => value && setDisplayMode(value as 'rate' | 'count')}
            className="bg-muted/50 p-0.5 rounded-lg"
          >
            <ToggleGroupItem 
              value="rate" 
              size="sm" 
              className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              Completion Rate
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="count" 
              size="sm" 
              className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              Objective Count
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="text-xs text-muted-foreground">
            Click a week to see details
          </span>
        </div>

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
                    onClick={() => handleWeekClick(week)}
                    className={`w-2.5 h-2.5 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:scale-125 ${getHeatmapColor(week)}`}
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
                  <p className="text-primary mt-1">Click to view details</p>
                </TooltipContent>
              </UITooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs pt-3 mt-2 border-t border-border">
          <span className="text-muted-foreground font-medium">Legend:</span>
          <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full border border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-muted/50 border border-border/50"></div>
              <span className="text-muted-foreground">No activity</span>
            </div>
            <div className="w-px h-3 bg-border"></div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Less</span>
              {displayMode === 'rate' ? (
                <>
                  <div className="w-3 h-3 rounded-sm bg-green-200"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-300"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-400"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                  <div className="w-3 h-3 rounded-sm bg-green-600"></div>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-sm bg-blue-200"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-300"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-400"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                  <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                </>
              )}
              <span className="text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </div>

      <WeekDrillDownDialog 
        week={selectedWeek} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </>
  );
};
