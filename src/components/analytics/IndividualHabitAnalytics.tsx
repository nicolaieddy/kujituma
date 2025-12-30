import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, 
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { 
  Flame, TrendingUp, TrendingDown, Minus, Calendar, 
  ChevronLeft, ChevronRight, Check, Target, Activity,
  Trophy, Medal, Award
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isFuture, startOfWeek, subWeeks, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HabitItem {
  id: string;
  text: string;
  frequency: string;
  goalId: string;
  goalTitle: string;
}

interface HabitCompletion {
  completion_date: string;
  habit_item_id: string;
  goal_id: string;
}

interface IndividualHabitAnalyticsProps {
  habits: HabitItem[];
  completions: HabitCompletion[];
}

// Calculate streak for a specific habit
const calculateHabitStreak = (habitId: string, completions: HabitCompletion[], frequency: string) => {
  const habitCompletions = completions
    .filter(c => c.habit_item_id === habitId)
    .map(c => c.completion_date)
    .sort()
    .reverse();

  if (habitCompletions.length === 0) {
    return { current: 0, longest: 0, history: [] };
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const streakHistory: { date: string; streak: number }[] = [];

  // Calculate daily streak for daily/weekday habits
  if (frequency === 'daily' || frequency === 'weekdays') {
    for (let i = 0; i < habitCompletions.length; i++) {
      const date = habitCompletions[i];
      const prevDate = i > 0 ? habitCompletions[i - 1] : null;
      
      if (i === 0) {
        if (date === today || date === yesterday) {
          tempStreak = 1;
          currentStreak = 1;
        } else {
          tempStreak = 1;
        }
      } else if (prevDate) {
        const dayDiff = differenceInDays(parseISO(prevDate), parseISO(date));
        if (dayDiff === 1 || (frequency === 'weekdays' && dayDiff <= 3)) {
          tempStreak++;
          if (i < 2) currentStreak = tempStreak;
        } else {
          tempStreak = 1;
        }
      }
      
      streakHistory.push({ date, streak: tempStreak });
      longestStreak = Math.max(longestStreak, tempStreak);
    }
  } else {
    // Weekly habits - count consecutive weeks
    const weeklyCompletions = new Set<string>();
    habitCompletions.forEach(date => {
      const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      weeklyCompletions.add(weekStart);
    });
    
    const sortedWeeks = Array.from(weeklyCompletions).sort().reverse();
    const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lastWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    for (let i = 0; i < sortedWeeks.length; i++) {
      const week = sortedWeeks[i];
      const prevWeek = i > 0 ? sortedWeeks[i - 1] : null;
      
      if (i === 0) {
        if (week === currentWeekStart || week === lastWeekStart) {
          tempStreak = 1;
          currentStreak = 1;
        } else {
          tempStreak = 1;
        }
      } else if (prevWeek) {
        const weekDiff = differenceInDays(parseISO(prevWeek), parseISO(week)) / 7;
        if (weekDiff === 1) {
          tempStreak++;
          if (i < 2) currentStreak = tempStreak;
        } else {
          tempStreak = 1;
        }
      }
      
      streakHistory.push({ date: week, streak: tempStreak });
      longestStreak = Math.max(longestStreak, tempStreak);
    }
  }

  return { current: currentStreak, longest: longestStreak, history: streakHistory.slice(0, 12).reverse() };
};

// Calculate completion rate for a habit
const calculateCompletionRate = (habitId: string, completions: HabitCompletion[], frequency: string, days: number = 28) => {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  const habitCompletions = completions.filter(c => 
    c.habit_item_id === habitId && 
    parseISO(c.completion_date) >= startDate
  );

  let expectedCompletions = days;
  if (frequency === 'weekly') expectedCompletions = Math.floor(days / 7);
  else if (frequency === 'weekdays') expectedCompletions = Math.floor(days * 5 / 7);
  else if (frequency === 'biweekly') expectedCompletions = Math.floor(days / 14);
  
  return expectedCompletions > 0 ? Math.min((habitCompletions.length / expectedCompletions) * 100, 100) : 0;
};

// Individual Habit Card with Calendar
const HabitDetailCard = ({ 
  habit, 
  completions,
  onViewDetails
}: { 
  habit: HabitItem; 
  completions: HabitCompletion[];
  onViewDetails: () => void;
}) => {
  const streak = calculateHabitStreak(habit.id, completions, habit.frequency);
  const rate7 = calculateCompletionRate(habit.id, completions, habit.frequency, 7);
  const rate28 = calculateCompletionRate(habit.id, completions, habit.frequency, 28);
  
  const trend = rate7 >= rate28 + 5 ? 'up' : rate7 <= rate28 - 5 ? 'down' : 'stable';

  const getStreakBadge = () => {
    if (streak.current >= 7) return { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (streak.current >= 3) return { icon: Medal, color: 'text-orange-500', bg: 'bg-orange-500/10' };
    if (streak.current >= 1) return { icon: Award, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    return null;
  };

  const streakBadge = getStreakBadge();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onViewDetails}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{habit.text}</h4>
            <p className="text-xs text-muted-foreground truncate">{habit.goalTitle}</p>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {habit.frequency}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Current Streak */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              <Flame className={cn("h-4 w-4", streak.current > 0 ? "text-orange-500" : "text-muted-foreground")} />
              <span className="text-lg font-bold">{streak.current}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Streak</p>
          </div>
          
          {/* Completion Rate */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold">{rate28.toFixed(0)}%</span>
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              {trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
            </div>
            <p className="text-[10px] text-muted-foreground">28-day rate</p>
          </div>

          {/* Best Streak */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            {streakBadge ? (
              <>
                <div className="flex items-center justify-center">
                  <streakBadge.icon className={cn("h-5 w-5", streakBadge.color)} />
                </div>
                <p className="text-[10px] text-muted-foreground">Best: {streak.longest}</p>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-muted-foreground">{streak.longest}</span>
                <p className="text-[10px] text-muted-foreground">Best</p>
              </>
            )}
          </div>
        </div>

        {/* Mini progress bar */}
        <Progress value={rate28} className="h-1.5" />
      </CardContent>
    </Card>
  );
};

// Habit Streak Chart Component
const HabitStreakChart = ({ habit, completions }: { habit: HabitItem; completions: HabitCompletion[] }) => {
  const last12Weeks = useMemo(() => {
    const now = new Date();
    const weeks: { week: string; completions: number; expected: number; rate: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      const weekCompletions = completions.filter(c => {
        const date = parseISO(c.completion_date);
        return c.habit_item_id === habit.id && date >= weekStart && date <= weekEnd;
      }).length;
      
      let expected = 7;
      if (habit.frequency === 'weekly') expected = 1;
      else if (habit.frequency === 'weekdays') expected = 5;
      else if (habit.frequency === 'biweekly') expected = 0.5;
      
      weeks.push({
        week: format(weekStart, 'MMM d'),
        completions: weekCompletions,
        expected,
        rate: expected > 0 ? Math.min((weekCompletions / expected) * 100, 100) : 0
      });
    }
    
    return weeks;
  }, [habit, completions]);

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={last12Weeks}>
          <defs>
            <linearGradient id="habitRateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                    <p className="font-medium">{data.week}</p>
                    <p>{data.completions}/{data.expected} completions</p>
                    <p className="font-medium">{data.rate.toFixed(0)}% rate</p>
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
            fill="url(#habitRateGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Habit Monthly Calendar Component
const HabitMonthlyCalendar = ({ habit, completions }: { habit: HabitItem; completions: HabitCompletion[] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const habitCompletions = completions
    .filter(c => c.habit_item_id === habit.id)
    .map(c => c.completion_date);
  
  const completedDates = new Set(habitCompletions);
  
  const firstDayOfWeek = monthStart.getDay();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate month stats
  const completionsThisMonth = days.filter(day => completedDates.has(format(day, 'yyyy-MM-dd'))).length;
  const totalDays = days.filter(day => !isFuture(day)).length;
  let expectedDays = totalDays;
  if (habit.frequency === 'weekly') expectedDays = Math.ceil(totalDays / 7);
  else if (habit.frequency === 'weekdays') expectedDays = Math.floor(totalDays * 5 / 7);
  
  const monthRate = expectedDays > 0 ? (completionsThisMonth / expectedDays) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={isFuture(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month stats */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Check className="h-4 w-4 text-green-500" />
          <span>{completionsThisMonth} completed</span>
        </div>
        <div className="text-muted-foreground">|</div>
        <div className="flex items-center gap-1">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span>{monthRate.toFixed(0)}% rate</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
            {day.charAt(0)}
          </div>
        ))}
        
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCompleted = completedDates.has(dateStr);
          const isToday = isSameDay(day, new Date());
          const future = isFuture(day);
          
          return (
            <TooltipProvider key={dateStr} delayDuration={100}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "aspect-square rounded-md flex items-center justify-center text-xs transition-colors",
                      future && "opacity-30",
                      isToday && "ring-2 ring-primary ring-offset-1",
                      isCompleted 
                        ? "bg-green-500 text-white" 
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      day.getDate()
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{format(day, 'EEEE, MMM d')}</p>
                  <p className="text-muted-foreground">
                    {isCompleted ? 'Completed' : future ? 'Future' : 'Not completed'}
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted/50 border" />
          <span>Not completed</span>
        </div>
      </div>
    </div>
  );
};

// Habit Detail Modal
const HabitDetailModal = ({ 
  habit, 
  completions, 
  open, 
  onOpenChange 
}: { 
  habit: HabitItem | null;
  completions: HabitCompletion[];
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  if (!habit) return null;
  
  const streak = calculateHabitStreak(habit.id, completions, habit.frequency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {habit.text}
          </DialogTitle>
          <DialogDescription>
            {habit.goalTitle} · {habit.frequency}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Streak Chart</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="space-y-4 mt-4">
            {/* Streak summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900">
                <div className="flex items-center gap-2">
                  <Flame className="h-6 w-6 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{streak.current}</p>
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{streak.longest}</p>
                    <p className="text-xs text-muted-foreground">Longest Streak</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly completion chart */}
            <div>
              <p className="text-sm font-medium mb-2">12-Week Completion Rate</p>
              <HabitStreakChart habit={habit} completions={completions} />
            </div>
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-4">
            <HabitMonthlyCalendar habit={habit} completions={completions} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export const IndividualHabitAnalytics = () => {
  const { user } = useAuth();
  const [selectedHabit, setSelectedHabit] = useState<HabitItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch habits and completions
  const { data: goalsWithHabits = [] } = useQuery({
    queryKey: ['goals-with-habits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('id, title, habit_items')
        .eq('user_id', user!.id)
        .neq('status', 'deleted')
        .not('habit_items', 'is', null);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['habit-completions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('completion_date, habit_item_id, goal_id')
        .eq('user_id', user!.id)
        .order('completion_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Extract all habits from goals
  const habits: HabitItem[] = useMemo(() => {
    const result: HabitItem[] = [];
    goalsWithHabits.forEach(goal => {
      const items = goal.habit_items as any[];
      if (items && Array.isArray(items)) {
        items.forEach((item: any) => {
          result.push({
            id: item.id,
            text: item.text,
            frequency: item.frequency || 'daily',
            goalId: goal.id,
            goalTitle: goal.title
          });
        });
      }
    });
    return result;
  }, [goalsWithHabits]);

  const handleViewDetails = (habit: HabitItem) => {
    setSelectedHabit(habit);
    setModalOpen(true);
  };

  if (habits.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Individual Habit Analytics
          </CardTitle>
          <CardDescription>
            Track streaks and completion rates for each habit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {habits.map(habit => (
                <HabitDetailCard 
                  key={habit.id}
                  habit={habit}
                  completions={completions}
                  onViewDetails={() => handleViewDetails(habit)}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <HabitDetailModal 
        habit={selectedHabit}
        completions={completions}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
};
