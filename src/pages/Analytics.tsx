import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnalyticsSkeleton } from "@/components/skeletons/PageSkeletons";

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
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 font-heading">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Track your progress, completion rates, and streaks to stay motivated.
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <AnalyticsSkeleton />
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
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold text-foreground mb-4 font-heading`}>
            Analytics Dashboard
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm px-2' : 'text-base sm:text-lg'} max-w-2xl mx-auto leading-relaxed`}>
            Track your progress, completion rates, and streaks to stay motivated.
          </p>
        </div>

        <div className={`${isMobile ? 'max-w-full' : 'max-w-6xl'} mx-auto`}>
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
};

export default Analytics;