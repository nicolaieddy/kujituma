import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfQuarter, endOfQuarter, subQuarters, format, startOfWeek, parseISO, subWeeks, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export type DateRangeFilter = 'this_week' | 'this_month' | 'this_quarter' | 'all_time' | 'custom';

export interface CustomDateRange {
  from: Date;
  to?: Date;
}

interface WeeklyActivity {
  date: string;
  completed: number;
  total: number;
  completionRate: number;
}

interface GoalBreakdown {
  goalId: string | null;
  goalTitle: string;
  total: number;
  completed: number;
  completionRate: number;
}

interface QuarterComparison {
  currentQuarter: {
    total: number;
    completed: number;
    completionRate: number;
    label: string;
  };
  previousQuarter: {
    total: number;
    completed: number;
    completionRate: number;
    label: string;
  };
  change: number;
  volumeChange: number;
}

interface TrendData {
  trend: 'improving' | 'declining' | 'stable';
  recentAvg: number;
  previousAvg: number;
  changePercent: number;
}

interface BestWorstWeek {
  best: WeeklyActivity | null;
  worst: WeeklyActivity | null;
}

export interface HeatmapWeek {
  date: string;
  completionRate: number;
  completed: number;
  total: number;
  weekNumber: number;
  month: number;
  year: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  completed: number;
  completionRate: number;
  goalCount: number;
}

export interface HabitAnalytics {
  totalHabits: number;
  totalCompletions: number;
  dailyCompletionRate: number;
  weeklyData: {
    date: string;
    completed: number;
    possible: number;
    rate: number;
  }[];
  topHabits: {
    goalTitle: string;
    habitText: string;
    frequency: string;
    completions: number;
    possible: number;
    rate: number;
  }[];
  streaks: {
    current: number;
    longest: number;
  };
}

export interface AnalyticsData {
  weeklyCompletionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalObjectives: number;
  completedObjectives: number;
  goalsCompletionRate: number;
  recentActivity: WeeklyActivity[];
  goalBreakdown: GoalBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  quarterComparison: QuarterComparison;
  trend: TrendData;
  bestWorstWeeks: BestWorstWeek;
  averageObjectivesPerWeek: number;
  totalActiveWeeks: number;
  consistencyScore: number;
  goalsStats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  heatmapData: HeatmapWeek[];
  habitAnalytics: HabitAnalytics;
}

const defaultHabitAnalytics: HabitAnalytics = {
  totalHabits: 0,
  totalCompletions: 0,
  dailyCompletionRate: 0,
  weeklyData: [],
  topHabits: [],
  streaks: { current: 0, longest: 0 }
};

const defaultAnalytics: AnalyticsData = {
  weeklyCompletionRate: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalObjectives: 0,
  completedObjectives: 0,
  goalsCompletionRate: 0,
  recentActivity: [],
  goalBreakdown: [],
  categoryBreakdown: [],
  quarterComparison: {
    currentQuarter: { total: 0, completed: 0, completionRate: 0, label: '' },
    previousQuarter: { total: 0, completed: 0, completionRate: 0, label: '' },
    change: 0,
    volumeChange: 0
  },
  trend: { trend: 'stable', recentAvg: 0, previousAvg: 0, changePercent: 0 },
  bestWorstWeeks: { best: null, worst: null },
  averageObjectivesPerWeek: 0,
  totalActiveWeeks: 0,
  consistencyScore: 0,
  goalsStats: { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
  heatmapData: [],
  habitAnalytics: defaultHabitAnalytics
};

const getDateRangeFilter = (range: DateRangeFilter, customRange?: CustomDateRange): { start: Date; end: Date } | null => {
  const now = new Date();
  
  switch (range) {
    case 'this_week': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return { start, end: now };
    }
    case 'this_month': {
      const start = startOfMonth(now);
      return { start, end: now };
    }
    case 'this_quarter': {
      const start = startOfQuarter(now);
      return { start, end: now };
    }
    case 'custom': {
      if (customRange?.from) {
        return { 
          start: customRange.from, 
          end: customRange.to || customRange.from 
        };
      }
      return null;
    }
    case 'all_time':
    default:
      return null;
  }
};

export const useAnalytics = (dateRange: DateRangeFilter = 'all_time', customRange?: CustomDateRange) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>(defaultAnalytics);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);

        // Fetch weekly objectives with goal info
        const { data: objectives } = await supabase
          .from('weekly_objectives')
          .select('*, goals(id, title, status, category, habit_items)')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false });

        // Fetch goals
        const { data: goals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'deleted');

        // Fetch habit completions
        const { data: habitCompletions } = await supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', user.id)
          .order('completion_date', { ascending: false });

        if (objectives && goals) {
          // Filter objectives by date range
          const dateFilter = getDateRangeFilter(dateRange, customRange);
          const filteredObjectives = dateFilter 
            ? objectives.filter(obj => {
                const weekDate = parseISO(obj.week_start);
                return weekDate >= dateFilter.start && weekDate <= dateFilter.end;
              })
            : objectives;

          // Filter habit completions by date range
          const filteredCompletions = dateFilter && habitCompletions
            ? habitCompletions.filter(hc => {
                const date = parseISO(hc.completion_date);
                return date >= dateFilter.start && date <= dateFilter.end;
              })
            : habitCompletions || [];
          
          const analyticsData = calculateAnalytics(filteredObjectives, goals, objectives, filteredCompletions);
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, dateRange, customRange?.from?.getTime(), customRange?.to?.getTime()]);

  const refetchAnalytics = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { data: objectives } = await supabase
        .from('weekly_objectives')
        .select('*, goals(id, title, status, category, habit_items)')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false });

      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted');

      const { data: habitCompletions } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', user.id)
        .order('completion_date', { ascending: false });

      if (objectives && goals) {
        const dateFilter = getDateRangeFilter(dateRange);
        const filteredObjectives = dateFilter 
          ? objectives.filter(obj => {
              const weekDate = parseISO(obj.week_start);
              return weekDate >= dateFilter.start && weekDate <= dateFilter.end;
            })
          : objectives;

        const filteredCompletions = dateFilter && habitCompletions
          ? habitCompletions.filter(hc => {
              const date = parseISO(hc.completion_date);
              return date >= dateFilter.start && date <= dateFilter.end;
            })
          : habitCompletions || [];
        
        const analyticsData = calculateAnalytics(filteredObjectives, goals, objectives, filteredCompletions);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { analytics, isLoading, refetchAnalytics };
};

const calculateAnalytics = (objectives: any[], goals: any[], allObjectives?: any[], habitCompletions?: any[]): AnalyticsData => {
  // Use allObjectives for heatmap if provided (to always show full year)
  const heatmapObjectives = allObjectives || objectives;
  const now = new Date();
  
  // Basic stats
  const totalObjectives = objectives.length;
  const completedObjectives = objectives.filter(obj => obj.is_completed).length;
  const weeklyCompletionRate = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

  // Goals stats
  const goalsStats = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'completed').length,
    inProgress: goals.filter(g => g.status === 'in_progress').length,
    notStarted: goals.filter(g => g.status === 'not_started').length
  };
  const goalsCompletionRate = goalsStats.total > 0 ? (goalsStats.completed / goalsStats.total) * 100 : 0;

  // Group objectives by week
  const weeklyData = new Map<string, WeeklyActivity>();
  
  objectives.forEach(obj => {
    const week = obj.week_start;
    if (!weeklyData.has(week)) {
      weeklyData.set(week, { date: week, completed: 0, total: 0, completionRate: 0 });
    }
    const data = weeklyData.get(week)!;
    data.total += 1;
    if (obj.is_completed) {
      data.completed += 1;
    }
  });

  // Calculate completion rates for each week
  weeklyData.forEach(data => {
    data.completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
  });

  const sortedWeeks = Array.from(weeklyData.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());

  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  sortedWeeks.forEach(([week, data], index) => {
    if (data.completionRate >= 80) {
      tempStreak += 1;
      if (index === 0) currentStreak = tempStreak;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (index === 0) currentStreak = 0;
      tempStreak = 0;
    }
  });

  // Recent activity (last 12 weeks for better visualization)
  const recentActivity = sortedWeeks.slice(0, 12).map(([, data]) => data).reverse();

  // Goal breakdown - objectives by goal
  const goalMap = new Map<string | null, GoalBreakdown>();
  
  objectives.forEach(obj => {
    const goalId = obj.goal_id;
    const goalTitle = obj.goals?.title || 'Unassigned';
    
    if (!goalMap.has(goalId)) {
      goalMap.set(goalId, { goalId, goalTitle, total: 0, completed: 0, completionRate: 0 });
    }
    const data = goalMap.get(goalId)!;
    data.total += 1;
    if (obj.is_completed) {
      data.completed += 1;
    }
  });

  goalMap.forEach(data => {
    data.completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
  });

  const goalBreakdown = Array.from(goalMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Category breakdown - objectives by goal category
  const categoryMap = new Map<string, CategoryBreakdown>();
  
  objectives.forEach(obj => {
    const category = obj.goals?.category || 'Uncategorized';
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { 
        category, 
        total: 0, 
        completed: 0, 
        completionRate: 0,
        goalCount: 0
      });
    }
    const data = categoryMap.get(category)!;
    data.total += 1;
    if (obj.is_completed) {
      data.completed += 1;
    }
  });

  // Count unique goals per category
  const goalsByCategory = new Map<string, Set<string>>();
  objectives.forEach(obj => {
    if (obj.goal_id) {
      const category = obj.goals?.category || 'Uncategorized';
      if (!goalsByCategory.has(category)) {
        goalsByCategory.set(category, new Set());
      }
      goalsByCategory.get(category)!.add(obj.goal_id);
    }
  });

  categoryMap.forEach((data, category) => {
    data.completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
    data.goalCount = goalsByCategory.get(category)?.size || 0;
  });

  const categoryBreakdown = Array.from(categoryMap.values())
    .filter(c => c.total >= 3) // Only show categories with meaningful data
    .sort((a, b) => b.completionRate - a.completionRate);

  // Quarter comparison
  const currentQuarterStart = startOfQuarter(now);
  const currentQuarterEnd = endOfQuarter(now);
  const previousQuarterStart = startOfQuarter(subQuarters(now, 1));
  const previousQuarterEnd = endOfQuarter(subQuarters(now, 1));

  const currentQuarterObjectives = objectives.filter(obj => {
    const date = parseISO(obj.week_start);
    return date >= currentQuarterStart && date <= currentQuarterEnd;
  });

  const previousQuarterObjectives = objectives.filter(obj => {
    const date = parseISO(obj.week_start);
    return date >= previousQuarterStart && date <= previousQuarterEnd;
  });

  const currentQCompleted = currentQuarterObjectives.filter(o => o.is_completed).length;
  const previousQCompleted = previousQuarterObjectives.filter(o => o.is_completed).length;

  const currentQRate = currentQuarterObjectives.length > 0 
    ? (currentQCompleted / currentQuarterObjectives.length) * 100 : 0;
  const previousQRate = previousQuarterObjectives.length > 0 
    ? (previousQCompleted / previousQuarterObjectives.length) * 100 : 0;

  const quarterComparison: QuarterComparison = {
    currentQuarter: {
      total: currentQuarterObjectives.length,
      completed: currentQCompleted,
      completionRate: currentQRate,
      label: `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`
    },
    previousQuarter: {
      total: previousQuarterObjectives.length,
      completed: previousQCompleted,
      completionRate: previousQRate,
      label: `Q${Math.ceil((subQuarters(now, 1).getMonth() + 1) / 3)} ${subQuarters(now, 1).getFullYear()}`
    },
    change: currentQRate - previousQRate,
    volumeChange: currentQuarterObjectives.length - previousQuarterObjectives.length
  };

  // Trend analysis (last 4 weeks vs previous 4 weeks)
  const last4Weeks = sortedWeeks.slice(0, 4);
  const previous4Weeks = sortedWeeks.slice(4, 8);

  const recentAvg = last4Weeks.length > 0
    ? last4Weeks.reduce((sum, [, data]) => sum + data.completionRate, 0) / last4Weeks.length
    : 0;
  const previousAvg = previous4Weeks.length > 0
    ? previous4Weeks.reduce((sum, [, data]) => sum + data.completionRate, 0) / previous4Weeks.length
    : 0;

  const changePercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (changePercent > 10) trendDirection = 'improving';
  else if (changePercent < -10) trendDirection = 'declining';

  const trend: TrendData = {
    trend: trendDirection,
    recentAvg,
    previousAvg,
    changePercent
  };

  // Best and worst weeks (from recent activity with at least 1 objective)
  const weeksWithActivity = recentActivity.filter(w => w.total > 0);
  const sortedByRate = [...weeksWithActivity].sort((a, b) => b.completionRate - a.completionRate);
  
  const bestWorstWeeks: BestWorstWeek = {
    best: sortedByRate[0] || null,
    worst: sortedByRate.length > 1 ? sortedByRate[sortedByRate.length - 1] : null
  };

  // Additional stats
  const totalActiveWeeks = weeklyData.size;
  const averageObjectivesPerWeek = totalActiveWeeks > 0 ? totalObjectives / totalActiveWeeks : 0;
  
  // Consistency score (% of weeks with >50% completion)
  const consistentWeeks = Array.from(weeklyData.values()).filter(w => w.completionRate >= 50).length;
  const consistencyScore = totalActiveWeeks > 0 ? (consistentWeeks / totalActiveWeeks) * 100 : 0;

  // Heatmap data - last 52 weeks (1 year) - use all objectives for full year view
  const heatmapWeeklyData = new Map<string, WeeklyActivity>();
  
  heatmapObjectives.forEach(obj => {
    const week = obj.week_start;
    if (!heatmapWeeklyData.has(week)) {
      heatmapWeeklyData.set(week, { date: week, completed: 0, total: 0, completionRate: 0 });
    }
    const data = heatmapWeeklyData.get(week)!;
    data.total += 1;
    if (obj.is_completed) {
      data.completed += 1;
    }
  });

  heatmapWeeklyData.forEach(data => {
    data.completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
  });

  const heatmapData: HeatmapWeek[] = [];
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  
  // Generate last 52 weeks including current week
  for (let i = 51; i >= 0; i--) {
    // Start from 51 weeks ago and go up to current week (i=0)
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    const weekActivity = heatmapWeeklyData.get(weekKey);
    
    heatmapData.push({
      date: weekKey,
      completionRate: weekActivity?.completionRate || 0,
      completed: weekActivity?.completed || 0,
      total: weekActivity?.total || 0,
      weekNumber: Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
      month: weekStart.getMonth(),
      year: weekStart.getFullYear()
    });
  }

  // Calculate habit analytics from habit_completions
  const habitAnalytics = calculateHabitAnalytics(habitCompletions || [], goals);

  return {
    weeklyCompletionRate,
    currentStreak,
    longestStreak,
    totalObjectives,
    completedObjectives,
    goalsCompletionRate,
    recentActivity,
    goalBreakdown,
    categoryBreakdown,
    quarterComparison,
    trend,
    bestWorstWeeks,
    averageObjectivesPerWeek,
    totalActiveWeeks,
    consistencyScore,
    goalsStats,
    heatmapData,
    habitAnalytics
  };
};

const calculateHabitAnalytics = (completions: any[], goals: any[]): HabitAnalytics => {
  // Get all goals with habit_items
  const goalsWithHabits = goals.filter(g => {
    const habitItems = g.habit_items;
    return habitItems && Array.isArray(habitItems) && habitItems.length > 0;
  });

  if (goalsWithHabits.length === 0) {
    return {
      totalHabits: 0,
      totalCompletions: 0,
      dailyCompletionRate: 0,
      weeklyData: [],
      topHabits: [],
      streaks: { current: 0, longest: 0 }
    };
  }

  // Count total habits across all goals
  let totalHabits = 0;
  const habitItemsMap = new Map<string, { goalTitle: string; habitText: string; frequency: string; goalId: string }>();

  goalsWithHabits.forEach(goal => {
    const habitItems = goal.habit_items as any[];
    habitItems.forEach((item: any) => {
      totalHabits++;
      habitItemsMap.set(item.id, {
        goalTitle: goal.title,
        habitText: item.text,
        frequency: item.frequency,
        goalId: goal.id
      });
    });
  });

  const totalCompletions = completions.length;

  // Group completions by week
  const weeklyCompletions = new Map<string, { completed: number; possible: number }>();
  
  completions.forEach(c => {
    const weekStart = format(startOfWeek(parseISO(c.completion_date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!weeklyCompletions.has(weekStart)) {
      weeklyCompletions.set(weekStart, { completed: 0, possible: 0 });
    }
    weeklyCompletions.get(weekStart)!.completed++;
  });

  // Calculate possible completions per week (simplified: daily habits = 7/week, weekdays = 5/week)
  const now = new Date();
  const last12Weeks: { date: string; completed: number; possible: number; rate: number }[] = [];
  
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    let possibleForWeek = 0;
    habitItemsMap.forEach((item) => {
      if (item.frequency === 'daily') possibleForWeek += 7;
      else if (item.frequency === 'weekdays') possibleForWeek += 5;
      else possibleForWeek += 1; // weekly, biweekly, etc.
    });

    const weekData = weeklyCompletions.get(weekKey) || { completed: 0, possible: 0 };
    last12Weeks.push({
      date: weekKey,
      completed: weekData.completed,
      possible: possibleForWeek,
      rate: possibleForWeek > 0 ? (weekData.completed / possibleForWeek) * 100 : 0
    });
  }

  // Calculate overall daily completion rate
  const totalPossible = last12Weeks.reduce((sum, w) => sum + w.possible, 0);
  const totalActual = last12Weeks.reduce((sum, w) => sum + w.completed, 0);
  const dailyCompletionRate = totalPossible > 0 ? (totalActual / totalPossible) * 100 : 0;

  // Top habits by completion count
  const habitCompletionCounts = new Map<string, number>();
  completions.forEach(c => {
    const count = habitCompletionCounts.get(c.habit_item_id) || 0;
    habitCompletionCounts.set(c.habit_item_id, count + 1);
  });

  const topHabits = Array.from(habitItemsMap.entries())
    .map(([habitId, info]) => {
      const completionCount = habitCompletionCounts.get(habitId) || 0;
      // Calculate possible based on frequency over 12 weeks
      let possibleCount = 0;
      if (info.frequency === 'daily') possibleCount = 12 * 7;
      else if (info.frequency === 'weekdays') possibleCount = 12 * 5;
      else possibleCount = 12;

      return {
        goalTitle: info.goalTitle,
        habitText: info.habitText,
        frequency: info.frequency,
        completions: completionCount,
        possible: possibleCount,
        rate: possibleCount > 0 ? (completionCount / possibleCount) * 100 : 0
      };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  // Calculate streaks (consecutive days with at least one completion)
  const completionDates = [...new Set(completions.map(c => c.completion_date))].sort().reverse();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subWeeks(new Date(), 0), 'yyyy-MM-dd');
  
  for (let i = 0; i < completionDates.length; i++) {
    const date = completionDates[i];
    const prevDate = i > 0 ? completionDates[i - 1] : null;
    
    if (i === 0) {
      // Check if streak is current (today or yesterday)
      if (date === today || date === yesterday) {
        tempStreak = 1;
        currentStreak = 1;
      } else {
        tempStreak = 1;
      }
    } else if (prevDate) {
      const dayDiff = Math.abs(
        (parseISO(prevDate).getTime() - parseISO(date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayDiff === 1) {
        tempStreak++;
        if (i < 2) currentStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return {
    totalHabits,
    totalCompletions,
    dailyCompletionRate,
    weeklyData: last12Weeks,
    topHabits,
    streaks: { current: currentStreak, longest: longestStreak }
  };
};
