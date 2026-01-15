import { ReactNode, useEffect, useState } from 'react';
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

  // Check if there's a pending ToS acceptance from signup flow
  useEffect(() => {
    const tosVersion = sessionStorage.getItem('tos_accepted_during_signup');
    if (tosVersion) {
      setPendingSignupTos(true);
      // Wait a moment for Auth.tsx to record the acceptance, then refetch
      const timeout = setTimeout(() => {
        refetch();
        setPendingSignupTos(false);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [user, refetch]);

  // Don't gate if not authenticated
  if (!user) {
    return <>{children}</>;
  }

  // If there's a pending ToS acceptance from signup, skip the modal
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

  // Show ToS modal if user hasn't accepted current version
  if (hasAcceptedCurrentTos === false) {
    // Determine if this is a new user (never accepted any ToS) or returning user (accepted old version)
    const isNewUser = !latestAcceptance;
    
    return (
      <>
        {children}
        <TosAcceptanceModal 
          open={true} 
          onAccept={acceptTos}
          isNewUser={isNewUser}
        />
      </>
    );
  }

  return <>{children}</>;
};
