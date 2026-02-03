import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek } from 'date-fns';
import { CheckInCadence, PartnerGoal, PartnerWeeklyObjective } from '@/services/accountabilityService';

// Match the PartnerHabitStats interface expected by PartnerHabitsCard
export interface PartnerHabitStats {
  goal: {
    id: string;
    title: string;
    habit_items: any[];
  };
  currentStreak: number;
  completionRate: number;
  totalWeeks: number;
  completedWeeks: number;
  weeklyHistory: { weekStart: string; isCompleted: boolean }[];
}

export interface PartnerDashboardData {
  can_view_partner_goals: boolean;
  partner_can_view_my_goals: boolean;
  my_check_in_cadence: CheckInCadence;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    about_me: string | null;
  } | null;
  partnership: {
    id: string;
    user1_id: string;
    user2_id: string;
    last_check_in_at: string | null;
    created_at: string;
  } | null;
  goals: PartnerGoal[];
  objectives: PartnerWeeklyObjective[];
  habit_stats: PartnerHabitStats[];
  error?: string;
}

export function usePartnerDashboardData(partnerId: string | undefined, weekStart: Date) {
  const { user } = useAuth();
  
  const weekStartString = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-dashboard-data', partnerId, weekStartString],
    queryFn: async (): Promise<PartnerDashboardData> => {
      if (!partnerId) {
        throw new Error('Partner ID required');
      }

      const { data: result, error: rpcError } = await supabase.rpc('get_partner_dashboard_data', {
        p_partner_id: partnerId,
        p_week_start: weekStartString,
      });

      if (rpcError) {
        console.error('Error fetching partner dashboard data:', rpcError);
        throw rpcError;
      }

      // Cast result to expected type
      const typedResult = result as unknown as PartnerDashboardData | { error: string } | null;

      // Handle RPC-level errors
      if (typedResult && 'error' in typedResult && typedResult.error) {
        throw new Error(typedResult.error);
      }

      const data = typedResult as PartnerDashboardData | null;

      return {
        can_view_partner_goals: data?.can_view_partner_goals ?? false,
        partner_can_view_my_goals: data?.partner_can_view_my_goals ?? false,
        my_check_in_cadence: data?.my_check_in_cadence ?? 'weekly',
        profile: data?.profile ?? null,
        partnership: data?.partnership ?? null,
        goals: data?.goals ?? [],
        objectives: data?.objectives ?? [],
        habit_stats: data?.habit_stats ?? [],
      };
    },
    enabled: !!user && !!partnerId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
