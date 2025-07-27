import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { useIsMobile } from "@/hooks/use-mobile";

const Analytics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-6'}`}>
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold text-white mb-4`}>
            Analytics Dashboard
          </h1>
          <p className={`text-white/80 ${isMobile ? 'text-sm px-2' : 'text-base sm:text-lg'} max-w-2xl mx-auto`}>
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