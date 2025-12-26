import { useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { HabitsService } from "@/services/habitsService";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { DailyCheckInButton } from "./DailyCheckInButton";
import { WeeklyPlanningDialog } from "./WeeklyPlanningDialog";
import { QuarterlyReviewDialog } from "./QuarterlyReviewDialog";
import { QuarterlyReviewsHistory } from "./QuarterlyReviewsHistory";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";
import { QuarterlyReviewProvider } from "@/contexts/QuarterlyReviewContext";
import { useGoals } from "@/hooks/useGoals";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";

interface HabitsProviderProps {
  children: ReactNode;
}

export const HabitsProvider = ({ children }: HabitsProviderProps) => {
  const { user } = useAuth();
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showQuarterlyDialog, setShowQuarterlyDialog] = useState(false);
  
  const weekStart = WeeklyProgressService.getWeekStart();
  const { hasCompletedPlanning } = useWeeklyPlanning(weekStart);
  const { hasCompletedReview, isEndOfQuarter } = useQuarterlyReview();
  const { goals } = useGoals();
  const { objectives } = useAllWeeklyObjectives();
  
  // Check if user has any activity (goals or objectives)
  const hasUserActivity = (goals && goals.length > 0) || (objectives && objectives.length > 0);
  
  useEffect(() => {
    if (!user) return;
    
    // Show Sunday planning prompt
    if (HabitsService.isSunday() && !hasCompletedPlanning) {
      const dismissed = sessionStorage.getItem(`planning-dismissed-${weekStart}`);
      if (!dismissed) {
        setTimeout(() => setShowPlanningDialog(true), 2000);
      }
    }
    
    // Show quarterly review prompt only if user has activity
    if (isEndOfQuarter && !hasCompletedReview && hasUserActivity) {
      const dismissed = sessionStorage.getItem(`quarterly-dismissed-${weekStart}`);
      if (!dismissed) {
        setTimeout(() => setShowQuarterlyDialog(true), 3000);
      }
    }
  }, [user, weekStart, hasCompletedPlanning, hasCompletedReview, isEndOfQuarter, hasUserActivity]);
  
  const handleClosePlanning = (open: boolean) => {
    if (!open) {
      sessionStorage.setItem(`planning-dismissed-${weekStart}`, 'true');
    }
    setShowPlanningDialog(open);
  };
  
  const handleCloseQuarterly = (open: boolean) => {
    if (!open) {
      sessionStorage.setItem(`quarterly-dismissed-${weekStart}`, 'true');
    }
    setShowQuarterlyDialog(open);
  };

  const handleOpenQuarterlyReview = () => {
    setShowQuarterlyDialog(true);
  };
  
  // Always render children, but only render habits UI when user is logged in
  return (
    <QuarterlyReviewProvider onOpenReview={handleOpenQuarterlyReview}>
      {children}
      {user && (
        <>
          <DailyCheckInButton />
          <WeeklyPlanningDialog 
            open={showPlanningDialog} 
            onOpenChange={handleClosePlanning}
            weekStart={weekStart}
          />
          <QuarterlyReviewDialog 
            open={showQuarterlyDialog} 
            onOpenChange={handleCloseQuarterly}
          />
          <QuarterlyReviewsHistory />
        </>
      )}
    </QuarterlyReviewProvider>
  );
};
