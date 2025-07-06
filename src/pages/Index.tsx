
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ThisWeekView } from "@/components/thisweek/ThisWeekView";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const isMobile = useIsMobile();
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigateToWeek = (direction: 'previous' | 'next') => {
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    const newDate = new Date(currentDate);
    
    if (direction === 'previous') {
      newDate.setUTCDate(currentDate.getUTCDate() - 7);
    } else {
      newDate.setUTCDate(currentDate.getUTCDate() + 7);
    }
    
    const newWeekStart = WeeklyProgressService.getWeekStart(newDate);
    setCurrentWeekStart(newWeekStart);
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
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold text-white mb-4`}>This Week</h1>
          <p className={`text-white/80 ${isMobile ? 'text-sm px-2' : 'text-base sm:text-lg'} max-w-2xl mx-auto`}>
            Set your focus, track progress, and share your journey with the community.
          </p>
        </div>

        <div className={`${isMobile ? 'max-w-full' : 'max-w-4xl'} mx-auto`}>
          <ThisWeekView 
            weekStart={currentWeekStart}
            onNavigateWeek={navigateToWeek}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
