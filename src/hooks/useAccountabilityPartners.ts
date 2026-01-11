import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  accountabilityService, 
  AccountabilityPartner, 
  AccountabilityPartnerRequest 
} from '@/services/accountabilityService';

export const useAccountabilityPartners = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partners, setPartners] = useState<AccountabilityPartner[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<{
    sent: AccountabilityPartnerRequest[];
    received: AccountabilityPartnerRequest[];
  }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch partners first, then pass IDs to filter requests
      const partnersData = await accountabilityService.getPartners();
      const partnerIds = new Set(partnersData.map(p => p.partner_id));
      const requestsData = await accountabilityService.getPartnerRequests(partnerIds);
      
      setPartners(partnersData);
      setPartnerRequests(requestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partners data');
      console.error('Error fetching partners data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Store fetchData in a ref to avoid re-subscribing on every render
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for accountability partner requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('partner-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_partner_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Refetch when we receive a new request or status changes
          fetchDataRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_partner_requests',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          // Refetch when our sent requests change
          fetchDataRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_partnerships',
        },
        () => {
          // Refetch when partnerships change
          fetchDataRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Removed fetchData from deps - using ref instead

  const sendPartnerRequest = useCallback(async (
    userId: string, 
    message: string = '',
    visibilitySettings?: { senderCanViewReceiverGoals: boolean; receiverCanViewSenderGoals: boolean }
  ) => {
    const result = await accountabilityService.sendPartnerRequest(userId, message, visibilitySettings);
    
    if (result.success) {
      toast({
        title: "Partner request sent",
        description: "Your accountability partner request has been sent.",
      });
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to send partner request.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  const respondToPartnerRequest = useCallback(async (
    requestId: string, 
    response: 'accepted' | 'rejected',
    visibilityOverrides?: { senderCanViewReceiverGoals: boolean; receiverCanViewSenderGoals: boolean }
  ) => {
    const result = await accountabilityService.respondToPartnerRequest(requestId, response, visibilityOverrides);
    
    if (result.success) {
      toast({
        title: response === 'accepted' ? "Partner request accepted" : "Partner request declined",
        description: response === 'accepted' 
          ? "You now have a new accountability partner!" 
          : "Partner request has been declined.",
      });
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to respond to partner request.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  const removePartner = useCallback(async (partnerId: string) => {
    const result = await accountabilityService.removePartner(partnerId);
    
    if (result.success) {
      toast({
        title: "Partner removed",
        description: "Accountability partner has been removed.",
      });
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to remove partner.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  const cancelPartnerRequest = useCallback(async (requestId: string) => {
    const result = await accountabilityService.cancelPartnerRequest(requestId);
    
    if (result.success) {
      toast({
        title: "Request cancelled",
        description: "Your partner request has been cancelled.",
      });
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to cancel request.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  const recordCheckIn = useCallback(async (partnershipId: string, message?: string) => {
    const result = await accountabilityService.recordCheckIn(partnershipId, message);
    
    if (result.success) {
      toast({
        title: "Check-in recorded",
        description: "Your accountability check-in has been logged.",
      });
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to record check-in.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  return {
    partners,
    partnerRequests,
    loading,
    error,
    sendPartnerRequest,
    respondToPartnerRequest,
    removePartner,
    cancelPartnerRequest,
    recordCheckIn,
    refetch: fetchData
  };
};
