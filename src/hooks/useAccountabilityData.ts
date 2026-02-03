import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  AccountabilityPartner, 
  AccountabilityPartnerRequest,
  CheckInCadence 
} from '@/services/accountabilityService';

export interface AccountabilityData {
  partners: AccountabilityPartner[];
  sent_requests: AccountabilityPartnerRequest[];
  received_requests: AccountabilityPartnerRequest[];
}

interface RawPartner {
  partner_id: string;
  full_name: string;
  avatar_url: string | null;
  partnership_id: string;
  status: string;
  last_check_in_at: string | null;
  can_view_partner_goals: boolean;
  partner_can_view_my_goals: boolean;
  my_check_in_cadence: string;
  partnership_created_at: string | null;
  my_last_check_in_at: string | null;
}

interface RawRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  sender_can_view_receiver_goals: boolean;
  receiver_can_view_sender_goals: boolean;
  sender_profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  receiver_profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

export function useAccountabilityData() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['accountability-data', user?.id],
    queryFn: async (): Promise<AccountabilityData> => {
      const { data: result, error: rpcError } = await supabase.rpc('get_accountability_data');

      if (rpcError) {
        console.error('Error fetching accountability data:', rpcError);
        throw rpcError;
      }

      // Cast result to expected type
      const typedResult = result as unknown as {
        partners: RawPartner[];
        sent_requests: RawRequest[];
        received_requests: RawRequest[];
      } | null;

      // Transform partners to match expected interface
      const partners: AccountabilityPartner[] = (typedResult?.partners ?? []).map((p: RawPartner) => ({
        partner_id: p.partner_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        partnership_id: p.partnership_id,
        status: p.status,
        last_check_in_at: p.last_check_in_at,
        can_view_partner_goals: p.can_view_partner_goals,
        partner_can_view_my_goals: p.partner_can_view_my_goals,
        my_check_in_cadence: (p.my_check_in_cadence || 'weekly') as CheckInCadence,
        partnership_created_at: p.partnership_created_at,
        my_last_check_in_at: p.my_last_check_in_at,
      }));

      return {
        partners,
        sent_requests: typedResult?.sent_requests ?? [],
        received_requests: typedResult?.received_requests ?? [],
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    partners: data?.partners ?? [],
    sentRequests: data?.sent_requests ?? [],
    receivedRequests: data?.received_requests ?? [],
    isLoading,
    error,
    refetch,
  };
}

// Hook specifically for due check-ins (derives from accountability data)
export function useDueCheckIns() {
  const { partners, isLoading, refetch } = useAccountabilityData();

  const dueCheckIns = partners.map(partner => {
    const cadence = partner.my_check_in_cadence || 'weekly';
    
    // Use my_last_check_in_at (user's own check-in), or fall back to partnership creation date
    const referenceDate = partner.my_last_check_in_at 
      ? new Date(partner.my_last_check_in_at)
      : partner.partnership_created_at 
        ? new Date(partner.partnership_created_at)
        : null;
    
    // Calculate days between check-ins based on cadence
    const cadenceDays: Record<CheckInCadence, number> = {
      'none': Infinity,
      'daily': 1,
      'twice_weekly': 3.5,
      'weekly': 7,
      'biweekly': 14,
    };
    
    const expectedDays = cadenceDays[cadence];
    const now = new Date();
    
    // If no reference date, treat as just starting (not overdue)
    const daysSinceReference = referenceDate 
      ? Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const daysUntilDue = expectedDays - daysSinceReference;
    const isOverdue = daysUntilDue < 0;
    
    return {
      partner_id: partner.partner_id,
      partner_name: partner.full_name,
      avatar_url: partner.avatar_url,
      cadence,
      last_check_in_at: partner.my_last_check_in_at,
      is_overdue: isOverdue,
      days_until_due: Math.ceil(daysUntilDue),
    };
  }).filter(p => p.cadence !== 'none' && p.days_until_due <= 1);

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
