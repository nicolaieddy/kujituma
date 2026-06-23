import { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTosAcceptance } from '@/hooks/useTosAcceptance';
import { TosAcceptanceModal } from './TosAcceptanceModal';
import { Skeleton } from '@/components/ui/skeleton';

interface TosGateProps {
  children: ReactNode;
}

export const TosGate = ({ children }: TosGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: tosLoading, acceptTos, latestAcceptance, refetch } = useTosAcceptance();
  const [isProcessingSignup, setIsProcessingSignup] = useState(false);
  const hasCheckedSignupFlag = useRef(false);

  // Check for signup flags on mount - this runs once
  useEffect(() => {
    if (hasCheckedSignupFlag.current) return;
    
    const newSignupFlag = sessionStorage.getItem('is_new_signup');
    const tosAcceptedFlag = sessionStorage.getItem('tos_accepted_during_signup');
    
    // If this is a new signup, the user already accepted ToS during auth
    // We need to wait for the ToS record to be created in the database
    if (newSignupFlag || tosAcceptedFlag) {
      hasCheckedSignupFlag.current = true;
      setIsProcessingSignup(true);
      
      // Give Auth.tsx time to record the ToS acceptance, then refetch
      const checkInterval = setInterval(async () => {
        await refetch();
        
        // Check if ToS has been recorded now
        const stillHasFlag = sessionStorage.getItem('is_new_signup');
        if (!stillHasFlag) {
          // Flag was cleared by Auth.tsx or onboarding, stop checking
          clearInterval(checkInterval);
          setIsProcessingSignup(false);
        }
      }, 500);
      
      // Failsafe: stop after 10 seconds regardless
      const failsafe = setTimeout(() => {
        clearInterval(checkInterval);
        setIsProcessingSignup(false);
        sessionStorage.removeItem('is_new_signup');
        sessionStorage.removeItem('tos_accepted_during_signup');
      }, 10000);
      
      return () => {
        clearInterval(checkInterval);
        clearTimeout(failsafe);
      };
    }
  }, [refetch]);

  // Wrapper for acceptTos that clears any lingering flags
  const handleAcceptTos = useCallback(async () => {
    const result = await acceptTos();
    if (result) {
      sessionStorage.removeItem('is_new_signup');
      sessionStorage.removeItem('tos_accepted_during_signup');
    }
    return result;
  }, [acceptTos]);

  // Don't gate if not authenticated
  if (!user) {
    return <>{children}</>;
  }

  // Don't gate on the legal pages themselves — users must be able to read
  // the Terms of Service and Privacy Policy before accepting them.
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  if (pathname === '/terms' || pathname === '/privacy') {
    return <>{children}</>;
  }

  // If we're processing a new signup, skip the modal entirely
  // The ToS was already accepted during the signup flow
  if (isProcessingSignup) {
    return <>{children}</>;
  }

  // Show loading while checking
  if (authLoading || tosLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Only show modal when we have a confirmed server response that acceptance is needed.
  // status === 'unknown' (network/offline failure) → do NOT gate.
  if (status === 'needs_acceptance') {
    // Double-check: if signup flag still exists, don't show modal
    const stillProcessingSignup = sessionStorage.getItem('is_new_signup');
    if (stillProcessingSignup) {
      return <>{children}</>;
    }
    
    // Determine context: no acceptance = edge case, has old acceptance = ToS updated
    const needsToSUpdate = !!latestAcceptance;
    
    return (
      <>
        {children}
        <TosAcceptanceModal 
          open={true} 
          onAccept={handleAcceptTos}
          isNewUser={!needsToSUpdate}
        />
      </>
    );
  }

  return <>{children}</>;
};
