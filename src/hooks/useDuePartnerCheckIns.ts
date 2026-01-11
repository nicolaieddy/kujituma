import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { accountabilityService, CheckInCadence } from '@/services/accountabilityService';

export interface DueCheckIn {
  partner_id: string;
  partner_name: string;
  avatar_url: string | null;
  cadence: CheckInCadence;
  last_check_in_at: string | null;
  is_overdue: boolean;
  days_until_due: number;
}

export function useDuePartnerCheckIns() {
  const { user } = useAuth();

  const { data: dueCheckIns = [], isLoading, refetch } = useQuery({
    queryKey: ['due-partner-check-ins', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return accountabilityService.getDueCheckIns();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Get only overdue check-ins
  const overdueCheckIns = dueCheckIns.filter(c => c.is_overdue);
  
  // Get check-ins due today (not overdue)
  const dueTodayCheckIns = dueCheckIns.filter(c => !c.is_overdue && c.days_until_due <= 0);
  
  // Get check-ins due tomorrow
  const dueSoonCheckIns = dueCheckIns.filter(c => !c.is_overdue && c.days_until_due === 1);

  return {
    dueCheckIns,
    overdueCheckIns,
    dueTodayCheckIns,
    dueSoonCheckIns,
    hasOverdue: overdueCheckIns.length > 0,
    hasDueToday: dueTodayCheckIns.length > 0,
    isLoading,
    refetch,
  };
}
