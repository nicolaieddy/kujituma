import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
      
      const [partnersData, requestsData] = await Promise.all([
        accountabilityService.getPartners(),
        accountabilityService.getPartnerRequests()
      ]);
      
      setPartners(partnersData);
      setPartnerRequests(requestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partners data');
      console.error('Error fetching partners data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendPartnerRequest = useCallback(async (userId: string, message: string = '') => {
    const result = await accountabilityService.sendPartnerRequest(userId, message);
    
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
    response: 'accepted' | 'rejected'
  ) => {
    const result = await accountabilityService.respondToPartnerRequest(requestId, response);
    
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
    recordCheckIn,
    refetch: fetchData
  };
};
