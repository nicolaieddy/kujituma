import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PREDEFINED_CATEGORIES } from '@/types/customCategories';

export interface CategoryFocusData {
  category: string;
  shortName: string;
  activeGoals: number;
  completedObjectives: number;
  totalObjectives: number;
  completionRate: number;
  focusScore: number; // 0-100 score based on activity
}

export const useCategoryFocus = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['category-focus', user?.id],
    queryFn: async (): Promise<CategoryFocusData[]> => {
      if (!user) return [];

      // Fetch all non-deleted goals with their categories
      const { data: goals } = await supabase
        .from('goals')
        .select('id, category, status')
        .eq('user_id', user.id)
        .neq('status', 'deleted');

      // Fetch objectives with their goals
      const { data: objectives } = await supabase
        .from('weekly_objectives')
        .select('id, is_completed, goal_id, goals(category)')
        .eq('user_id', user.id);

      if (!goals || !objectives) return [];

      // Build category stats map
      const categoryStats = new Map<string, {
        activeGoals: number;
        completedObjectives: number;
        totalObjectives: number;
      }>();

      // Initialize with predefined categories
      PREDEFINED_CATEGORIES.forEach(cat => {
        categoryStats.set(cat, {
          activeGoals: 0,
          completedObjectives: 0,
          totalObjectives: 0,
        });
      });

      // Count active goals per category
      goals.forEach(goal => {
        const category = goal.category || 'Personal Development';
        if (!categoryStats.has(category)) {
          categoryStats.set(category, {
            activeGoals: 0,
            completedObjectives: 0,
            totalObjectives: 0,
          });
        }
        const stats = categoryStats.get(category)!;
        if (goal.status === 'in_progress' || goal.status === 'not_started') {
          stats.activeGoals++;
        }
      });

      // Count objectives per category
      objectives.forEach(obj => {
        const category = (obj.goals as any)?.category || 'Personal Development';
        if (!categoryStats.has(category)) {
          categoryStats.set(category, {
            activeGoals: 0,
            completedObjectives: 0,
            totalObjectives: 0,
          });
        }
        const stats = categoryStats.get(category)!;
        stats.totalObjectives++;
        if (obj.is_completed) {
          stats.completedObjectives++;
        }
      });

      // Calculate focus scores and format data
      const maxObjectives = Math.max(
        ...Array.from(categoryStats.values()).map(s => s.totalObjectives),
        1
      );
      const maxGoals = Math.max(
        ...Array.from(categoryStats.values()).map(s => s.activeGoals),
        1
      );

      // Map to short display names
      const shortNames: Record<string, string> = {
        'Health & Fitness': 'Health',
        'Career & Business': 'Career',
        'Language Learning': 'Language',
        'Learning & Education': 'Education',
        'Financial': 'Finance',
        'Relationships': 'Relationships',
        'Personal Development': 'Growth',
        'Creative Projects': 'Creative',
        'Travel & Adventure': 'Travel',
      };

      const result: CategoryFocusData[] = Array.from(categoryStats.entries())
        .filter(([cat]) => PREDEFINED_CATEGORIES.includes(cat))
        .map(([category, stats]) => {
          const completionRate = stats.totalObjectives > 0 
            ? (stats.completedObjectives / stats.totalObjectives) * 100 
            : 0;
          
          // Focus score: combination of activity (objectives) and goals
          // Weight: 60% objectives activity, 40% active goals
          const objectiveScore = (stats.totalObjectives / maxObjectives) * 60;
          const goalScore = (stats.activeGoals / maxGoals) * 40;
          const focusScore = Math.min(100, objectiveScore + goalScore);

          return {
            category,
            shortName: shortNames[category] || category.split(' ')[0],
            activeGoals: stats.activeGoals,
            completedObjectives: stats.completedObjectives,
            totalObjectives: stats.totalObjectives,
            completionRate,
            focusScore: Math.round(focusScore),
          };
        })
        .sort((a, b) => b.focusScore - a.focusScore);

      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};
