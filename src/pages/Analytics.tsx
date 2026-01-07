import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

const Analytics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { isOffline } = useOfflineStatus();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Redirect to auth if not logged in (avoid navigate during render)
  useEffect(() => {
    console.log('[Analytics] Auth check - loading:', authLoading, 'user:', user?.email);
    if (!authLoading && !user) {
      console.log('[Analytics] No user, redirecting to /auth');
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={false} onSignOut={() => {}} />
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isOffline) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
        <OfflineFallback 
          title="Analytics unavailable offline"
          description="Analytics data requires an internet connection to load. Please reconnect to view your stats."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-6'}`}>
        <div className="mb-6">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground font-heading`}>
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your progress and streaks
          </p>
        </div>

        <div className="max-w-5xl">
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
};

export default Analytics;