import { useState, useEffect, ReactNode, lazy, Suspense, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { HabitsService } from "@/services/habitsService";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { DailyCheckInButton } from "./DailyCheckInButton";
import { DailyCheckInDialog } from "./DailyCheckInDialog";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";
import { QuarterlyReviewProvider } from "@/contexts/QuarterlyReviewContext";
import { RitualsProvider } from "@/contexts/RitualsContext";
import { useGoals } from "@/hooks/useGoals";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";
import { subDays } from "date-fns";
import { useNavigate } from "react-router-dom";

// Lazy load dialog components to reduce initial bundle
const WeeklyPlanningDialog = lazy(() => import("./WeeklyPlanningDialog").then(m => ({ default: m.WeeklyPlanningDialog })));
const CloseLastWeekPrompt = lazy(() => import("./CloseLastWeekPrompt").then(m => ({ default: m.CloseLastWeekPrompt })));
const WeeklyPlanningHistory = lazy(() => import("./WeeklyPlanningHistory").then(m => ({ default: m.WeeklyPlanningHistory })));
const DailyCheckInHistory = lazy(() => import("./DailyCheckInHistory").then(m => ({ default: m.DailyCheckInHistory })));
const QuarterlyReviewDialog = lazy(() => import("./QuarterlyReviewDialog").then(m => ({ default: m.QuarterlyReviewDialog })));
const QuarterlyReviewsHistory = lazy(() => import("./QuarterlyReviewsHistory").then(m => ({ default: m.QuarterlyReviewsHistory })));

interface HabitsProviderProps {
  children: ReactNode;
}

export const HabitsProvider = ({ children }: HabitsProviderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showCloseLastWeekPrompt, setShowCloseLastWeekPrompt] = useState(false);
  const [showQuarterlyDialog, setShowQuarterlyDialog] = useState(false);
  const [showDailyCheckInDialog, setShowDailyCheckInDialog] = useState(false);
  
  const weekStart = useMemo(() => WeeklyProgressService.getWeekStart(), []);
  const lastWeekStartDate = useMemo(() => subDays(new Date(weekStart + 'T00:00:00'), 7), [weekStart]);
  const lastWeekStart = useMemo(() => WeeklyProgressService.getWeekStart(lastWeekStartDate), [lastWeekStartDate]);
  
  const { hasCompletedPlanning } = useWeeklyPlanning(weekStart);
  const { progressPost: lastWeekProgress, feedPost: lastWeekFeedPost } = useWeeklyProgress(lastWeekStart);
  const { hasCompletedReview, isEndOfQuarter, isLoading: isReviewLoading } = useQuarterlyReview();
  const { goals } = useGoals();
  const { objectives } = useAllWeeklyObjectives();
  
  // Check if last week is closed and shared
  const isLastWeekClosed = lastWeekProgress?.is_completed || false;
  
  // Check if user has any activity (goals or objectives)
  const hasUserActivity = useMemo(() => 
    (goals && goals.length > 0) || (objectives && objectives.length > 0),
    [goals, objectives]
  );
  
  // Use refs for values that shouldn't trigger effect re-runs
  const hasUserActivityRef = useRef(hasUserActivity);
  const isLastWeekClosedRef = useRef(isLastWeekClosed);
  hasUserActivityRef.current = hasUserActivity;
  isLastWeekClosedRef.current = isLastWeekClosed;
  
  useEffect(() => {
    if (!user) return;
    
    // Show Sunday planning prompt
    if (HabitsService.isSunday() && !hasCompletedPlanning) {
      const dismissed = sessionStorage.getItem(`planning-dismissed-${weekStart}`);
      if (!dismissed) {
        // Check if last week needs to be closed first (use ref to avoid re-running effect)
        if (!isLastWeekClosedRef.current && hasUserActivityRef.current) {
          setTimeout(() => setShowCloseLastWeekPrompt(true), 2000);
        } else {
          setTimeout(() => setShowPlanningDialog(true), 2000);
        }
      }
    }
    
    // Show quarterly review prompt only if:
    // - Data has loaded (not still loading)
    // - User has activity
    // - It's end of quarter
    // - Review not completed
    if (!isReviewLoading && isEndOfQuarter && !hasCompletedReview && hasUserActivityRef.current) {
      const dismissed = sessionStorage.getItem(`quarterly-dismissed-${weekStart}`);
      if (!dismissed) {
        setTimeout(() => setShowQuarterlyDialog(true), 3000);
      }
    }
  }, [user, weekStart, hasCompletedPlanning, hasCompletedReview, isEndOfQuarter, isReviewLoading]);
  
  const handleClosePlanning = useCallback((open: boolean) => {
    if (!open) {
      sessionStorage.setItem(`planning-dismissed-${weekStart}`, 'true');
    }
    setShowPlanningDialog(open);
  }, [weekStart]);

  const handleCloseLastWeekPrompt = useCallback((open: boolean) => {
    if (!open) {
      sessionStorage.setItem(`planning-dismissed-${weekStart}`, 'true');
    }
    setShowCloseLastWeekPrompt(open);
  }, [weekStart]);

  const handleProceedToPlanning = useCallback(() => {
    setShowCloseLastWeekPrompt(false);
    setShowPlanningDialog(true);
  }, []);

  const handleOpenLastWeekProgress = useCallback(() => {
    setShowCloseLastWeekPrompt(false);
    // Navigate to ThisWeek view with last week's date
    navigate(`/?week=${lastWeekStart}`);
  }, [navigate, lastWeekStart]);
  
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
    // Check if last week needs to be closed first
    if (!isLastWeekClosed && hasUserActivity) {
      setShowCloseLastWeekPrompt(true);
    } else {
      setShowPlanningDialog(true);
    }
  }, [isLastWeekClosed, hasUserActivity]);

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
            <CloseLastWeekPrompt
              open={showCloseLastWeekPrompt}
              onOpenChange={handleCloseLastWeekPrompt}
              onProceedToPlanning={handleProceedToPlanning}
              onOpenLastWeekProgress={handleOpenLastWeekProgress}
              lastWeekStart={lastWeekStart}
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
