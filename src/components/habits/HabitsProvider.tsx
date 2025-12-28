import { useState, useEffect, ReactNode, lazy, Suspense, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { HabitsService } from "@/services/habitsService";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { DailyCheckInButton } from "./DailyCheckInButton";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";
import { QuarterlyReviewProvider } from "@/contexts/QuarterlyReviewContext";
import { RitualsProvider } from "@/contexts/RitualsContext";
import { useGoals } from "@/hooks/useGoals";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";

// Lazy load dialog components to reduce initial bundle
const DailyCheckInDialog = lazy(() => import("./DailyCheckInDialog").then(m => ({ default: m.DailyCheckInDialog })));
const WeeklyPlanningDialog = lazy(() => import("./WeeklyPlanningDialog").then(m => ({ default: m.WeeklyPlanningDialog })));
const WeeklyPlanningHistory = lazy(() => import("./WeeklyPlanningHistory").then(m => ({ default: m.WeeklyPlanningHistory })));
const DailyCheckInHistory = lazy(() => import("./DailyCheckInHistory").then(m => ({ default: m.DailyCheckInHistory })));
const QuarterlyReviewDialog = lazy(() => import("./QuarterlyReviewDialog").then(m => ({ default: m.QuarterlyReviewDialog })));
const QuarterlyReviewsHistory = lazy(() => import("./QuarterlyReviewsHistory").then(m => ({ default: m.QuarterlyReviewsHistory })));

interface HabitsProviderProps {
  children: ReactNode;
}

export const HabitsProvider = ({ children }: HabitsProviderProps) => {
  const { user } = useAuth();
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showQuarterlyDialog, setShowQuarterlyDialog] = useState(false);
  const [showDailyCheckInDialog, setShowDailyCheckInDialog] = useState(false);
  
  const weekStart = useMemo(() => WeeklyProgressService.getWeekStart(), []);
  const { hasCompletedPlanning } = useWeeklyPlanning(weekStart);
  const { hasCompletedReview, isEndOfQuarter, isLoading: isReviewLoading } = useQuarterlyReview();
  const { goals } = useGoals();
  const { objectives } = useAllWeeklyObjectives();
  
  // Check if user has any activity (goals or objectives)
  const hasUserActivity = useMemo(() => 
    (goals && goals.length > 0) || (objectives && objectives.length > 0),
    [goals, objectives]
  );
  
  useEffect(() => {
    if (!user) return;
    
    // Show Sunday planning prompt
    if (HabitsService.isSunday() && !hasCompletedPlanning) {
      const dismissed = sessionStorage.getItem(`planning-dismissed-${weekStart}`);
      if (!dismissed) {
        setTimeout(() => setShowPlanningDialog(true), 2000);
      }
    }
    
    // Show quarterly review prompt only if:
    // - Data has loaded (not still loading)
    // - User has activity
    // - It's end of quarter
    // - Review not completed
    if (!isReviewLoading && isEndOfQuarter && !hasCompletedReview && hasUserActivity) {
      const dismissed = sessionStorage.getItem(`quarterly-dismissed-${weekStart}`);
      if (!dismissed) {
        setTimeout(() => setShowQuarterlyDialog(true), 3000);
      }
    }
  }, [user, weekStart, hasCompletedPlanning, hasCompletedReview, isEndOfQuarter, hasUserActivity, isReviewLoading]);
  
  const handleClosePlanning = useCallback((open: boolean) => {
    if (!open) {
      sessionStorage.setItem(`planning-dismissed-${weekStart}`, 'true');
    }
    setShowPlanningDialog(open);
  }, [weekStart]);
  
  const handleCloseQuarterly = useCallback((open: boolean) => {
    if (!open) {
      sessionStorage.setItem(`quarterly-dismissed-${weekStart}`, 'true');
    }
    setShowQuarterlyDialog(open);
  }, [weekStart]);

  const handleOpenQuarterlyReview = useCallback(() => {
    setShowQuarterlyDialog(true);
  }, []);

  const handleOpenWeeklyPlanning = useCallback(() => {
    setShowPlanningDialog(true);
  }, []);

  const handleOpenDailyCheckIn = useCallback(() => {
    setShowDailyCheckInDialog(true);
  }, []);

  const handleCloseDailyCheckIn = useCallback((open: boolean) => {
    setShowDailyCheckInDialog(open);
  }, []);
  
  // Always render children, but only render habits UI when user is logged in
  return (
    <QuarterlyReviewProvider onOpenReview={handleOpenQuarterlyReview}>
      <RitualsProvider 
        onOpenWeeklyPlanning={handleOpenWeeklyPlanning}
        onOpenDailyCheckIn={handleOpenDailyCheckIn}
      >
        {children}
        {user && (
          <Suspense fallback={null}>
            <DailyCheckInButton />
            <DailyCheckInDialog
              open={showDailyCheckInDialog}
              onOpenChange={handleCloseDailyCheckIn}
            />
            <WeeklyPlanningDialog 
              open={showPlanningDialog} 
              onOpenChange={handleClosePlanning}
              weekStart={weekStart}
            />
            <WeeklyPlanningHistory />
            <DailyCheckInHistory />
            <QuarterlyReviewDialog 
              open={showQuarterlyDialog} 
              onOpenChange={handleCloseQuarterly}
            />
            <QuarterlyReviewsHistory />
          </Suspense>
        )}
      </RitualsProvider>
    </QuarterlyReviewProvider>
  );
};
