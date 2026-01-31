import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTosAcceptance } from '@/hooks/useTosAcceptance';
import { TosAcceptanceModal } from './TosAcceptanceModal';
import { Skeleton } from '@/components/ui/skeleton';

interface TosGateProps {
  children: ReactNode;
}

export const TosGate = ({ children }: TosGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAcceptedCurrentTos, loading: tosLoading, acceptTos, latestAcceptance, refetch } = useTosAcceptance();
  const [pendingSignupTos, setPendingSignupTos] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);

  // Check for signup flags on mount and when user changes
  useEffect(() => {
    const tosVersion = sessionStorage.getItem('tos_accepted_during_signup');
    const newSignupFlag = sessionStorage.getItem('is_new_signup');
    
    if (tosVersion || newSignupFlag) {
      setPendingSignupTos(true);
      setIsNewSignup(!!newSignupFlag);
      
      // Wait for Auth.tsx to record the ToS acceptance, then refetch and clear flags
      const timeout = setTimeout(() => {
        refetch();
        setPendingSignupTos(false);
        // Clear the signup flag after processing
        sessionStorage.removeItem('is_new_signup');
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [user, refetch]);

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

  // If there's a pending ToS acceptance from signup, skip the modal
  // The ToS was already accepted during the signup flow
  if (pendingSignupTos) {
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

  // Show ToS modal only if user hasn't accepted current version
  // This handles: (1) returning users who need to accept updated ToS
  //               (2) edge case where sign-in user somehow has no ToS record
  if (hasAcceptedCurrentTos === false) {
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
