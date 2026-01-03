import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTosAcceptance } from '@/hooks/useTosAcceptance';
import { TosAcceptanceModal } from './TosAcceptanceModal';
import { Skeleton } from '@/components/ui/skeleton';

interface TosGateProps {
  children: ReactNode;
}

export const TosGate = ({ children }: TosGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAcceptedCurrentTos, loading: tosLoading, acceptTos, latestAcceptance } = useTosAcceptance();

  // Don't gate if not authenticated
  if (!user) {
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

  // Show ToS acceptance modal if user hasn't accepted current version
  if (hasAcceptedCurrentTos === false) {
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
