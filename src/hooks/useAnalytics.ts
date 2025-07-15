import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AnalyticsData {
  weeklyCompletionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalObjectives: number;
  completedObjectives: number;
  goalsCompletionRate: number;
  recentActivity: Array<{
    date: string;
    completed: number;
    total: number;
  }>;
}

export const useAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    weeklyCompletionRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalObjectives: 0,
    completedObjectives: 0,
    goalsCompletionRate: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);

        // Fetch weekly objectives
        const { data: objectives } = await supabase
          .from('weekly_objectives')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false });

        // Fetch goals
        const { data: goals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id);

        if (objectives && goals) {
          const analyticsData = calculateAnalytics(objectives, goals);
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  return { analytics, isLoading };
};

const calculateAnalytics = (objectives: any[], goals: any[]): AnalyticsData => {
  // Calculate total and completed objectives
  const totalObjectives = objectives.length;
  const completedObjectives = objectives.filter(obj => obj.is_completed).length;
  const weeklyCompletionRate = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

  // Calculate goals completion rate
  const completedGoals = goals.filter(goal => goal.status === 'completed').length;
  const goalsCompletionRate = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;

  // Group objectives by week for streak calculation
  const weeklyData = new Map<string, { completed: number; total: number }>();
  
  objectives.forEach(obj => {
    const week = obj.week_start;
    if (!weeklyData.has(week)) {
      weeklyData.set(week, { completed: 0, total: 0 });
    }
    weeklyData.get(week)!.total += 1;
    if (obj.is_completed) {
      weeklyData.get(week)!.completed += 1;
    }
  });

  // Calculate streaks (weeks with >80% completion rate)
  const sortedWeeks = Array.from(weeklyData.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  sortedWeeks.forEach(([week, data], index) => {
    const completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
    
    if (completionRate >= 80) {
      tempStreak += 1;
      if (index === 0) currentStreak = tempStreak;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (index === 0) currentStreak = 0;
      tempStreak = 0;
    }
  });

  // Recent activity (last 8 weeks)
  const recentActivity = sortedWeeks.slice(0, 8).map(([week, data]) => ({
    date: week,
    completed: data.completed,
    total: data.total
  })).reverse();

  return {
    weeklyCompletionRate,
    currentStreak,
    longestStreak,
    totalObjectives,
    completedObjectives,
    goalsCompletionRate,
    recentActivity
  };
};