import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, format, parseISO, subWeeks } from 'date-fns';

interface WeeklyProgress {
  weekStart: string;
  weekLabel: string;
  completed: number;
  total: number;
  rate: number;
}

interface CategoryBreakdown {
  category: string;
  completed: number;
  total: number;
  rate: number;
}

interface RecentWeek {
  weekStart: string;
  label: string;
  completed: number;
  total: number;
  rate: number;
}

interface AnalyticsSummary {
  completionRate: number;
  completedObjectives: number;
  totalObjectives: number;
  currentStreak: number;
  longestStreak: number;
  goalsCompleted: number;
  goalsInProgress: number;
  activeWeeks: number;
  avgObjectivesPerWeek: number;
  weeklyProgress: WeeklyProgress[];
  categoryBreakdown: CategoryBreakdown[];
  recentWeeks: RecentWeek[];
}

const defaultData: AnalyticsSummary = {
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

export const useAnalyticsSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['analytics-summary', user?.id],
    queryFn: async (): Promise<AnalyticsSummary> => {
      if (!user) return defaultData;

      // Fetch objectives with goal info
      const { data: objectives } = await supabase
        .from('weekly_objectives')
        .select('id, is_completed, week_start, goal_id, goals(id, title, category)')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false });

      // Fetch goals
      const { data: goals } = await supabase
        .from('goals')
        .select('id, status')
        .eq('user_id', user.id)
        .neq('status', 'deleted');

      // Fetch streaks
      const { data: streaks } = await supabase
        .from('user_streaks')
        .select('current_weekly_streak, longest_weekly_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!objectives || !goals) return defaultData;

      // Basic stats
      const totalObjectives = objectives.length;
      const completedObjectives = objectives.filter(o => o.is_completed).length;
      const completionRate = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

      // Goals stats
      const goalsCompleted = goals.filter(g => g.status === 'completed').length;
      const goalsInProgress = goals.filter(g => g.status === 'in_progress').length;

      // Group by week
      const weekMap = new Map<string, { completed: number; total: number }>();
      objectives.forEach(obj => {
        const week = obj.week_start;
        if (!weekMap.has(week)) {
          weekMap.set(week, { completed: 0, total: 0 });
        }
        const data = weekMap.get(week)!;
        data.total++;
        if (obj.is_completed) data.completed++;
      });

      const activeWeeks = weekMap.size;
      const avgObjectivesPerWeek = activeWeeks > 0 ? totalObjectives / activeWeeks : 0;

      // Weekly progress (last 12 weeks)
      const sortedWeeks = Array.from(weekMap.entries())
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-12);

      const weeklyProgress: WeeklyProgress[] = sortedWeeks.map(([weekStart, data]) => ({
        weekStart,
        weekLabel: format(parseISO(weekStart), 'MMM d'),
        completed: data.completed,
        total: data.total,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      }));

      // Recent weeks (last 4)
      const recentWeeks: RecentWeek[] = sortedWeeks.slice(-4).reverse().map(([weekStart, data]) => ({
        weekStart,
        label: format(parseISO(weekStart), 'MMM d'),
        completed: data.completed,
        total: data.total,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      }));

      // Category breakdown
      const categoryMap = new Map<string, { completed: number; total: number }>();
      objectives.forEach(obj => {
        const category = (obj.goals as any)?.category || 'Uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { completed: 0, total: 0 });
        }
        const data = categoryMap.get(category)!;
        data.total++;
        if (obj.is_completed) data.completed++;
      });

      const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .filter(([_, data]) => data.total >= 3)
        .map(([category, data]) => ({
          category: category.length > 12 ? category.slice(0, 12) + '...' : category,
          completed: data.completed,
          total: data.total,
          rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return {
        completionRate,
        completedObjectives,
        totalObjectives,
        currentStreak: streaks?.current_weekly_streak || 0,
        longestStreak: streaks?.longest_weekly_streak || 0,
        goalsCompleted,
        goalsInProgress,
        activeWeeks,
        avgObjectivesPerWeek,
        weeklyProgress,
        categoryBreakdown,
        recentWeeks,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};
