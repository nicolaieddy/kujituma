import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfQuarter, endOfQuarter, subQuarters, format, startOfWeek, parseISO } from 'date-fns';

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

export interface AnalyticsData {
  weeklyCompletionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalObjectives: number;
  completedObjectives: number;
  goalsCompletionRate: number;
  recentActivity: WeeklyActivity[];
  goalBreakdown: GoalBreakdown[];
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
}

const defaultAnalytics: AnalyticsData = {
  weeklyCompletionRate: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalObjectives: 0,
  completedObjectives: 0,
  goalsCompletionRate: 0,
  recentActivity: [],
  goalBreakdown: [],
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
  goalsStats: { total: 0, completed: 0, inProgress: 0, notStarted: 0 }
};

export const useAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>(defaultAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!user || dataLoaded) return;

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);

        // Fetch weekly objectives with goal info
        const { data: objectives } = await supabase
          .from('weekly_objectives')
          .select('*, goals(id, title, status, category)')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false });

        // Fetch goals
        const { data: goals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'deleted');

        if (objectives && goals) {
          const analyticsData = calculateAnalytics(objectives, goals);
          setAnalytics(analyticsData);
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const refetchAnalytics = async () => {
    if (!user) return;
    
    setDataLoaded(false);
    setIsLoading(true);
    
    try {
      const { data: objectives } = await supabase
        .from('weekly_objectives')
        .select('*, goals(id, title, status, category)')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false });

      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted');

      if (objectives && goals) {
        const analyticsData = calculateAnalytics(objectives, goals);
        setAnalytics(analyticsData);
        setDataLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { analytics, isLoading, refetchAnalytics };
};

const calculateAnalytics = (objectives: any[], goals: any[]): AnalyticsData => {
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

  return {
    weeklyCompletionRate,
    currentStreak,
    longestStreak,
    totalObjectives,
    completedObjectives,
    goalsCompletionRate,
    recentActivity,
    goalBreakdown,
    quarterComparison,
    trend,
    bestWorstWeeks,
    averageObjectivesPerWeek,
    totalActiveWeeks,
    consistencyScore,
    goalsStats
  };
};
