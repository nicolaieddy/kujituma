import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { HabitsService } from "@/services/habitsService";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { DailyCheckInButton } from "./DailyCheckInButton";
import { WeeklyPlanningDialog } from "./WeeklyPlanningDialog";
import { QuarterlyReviewDialog } from "./QuarterlyReviewDialog";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";

export const HabitsProvider = () => {
  const { user } = useAuth();
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showQuarterlyDialog, setShowQuarterlyDialog] = useState(false);
  
  const weekStart = WeeklyProgressService.getWeekStart();
  const { hasCompletedPlanning } = useWeeklyPlanning(weekStart);
  const { hasCompletedReview, isEndOfQuarter } = useQuarterlyReview();
  
  useEffect(() => {
    if (!user) return;
    
    // Show Sunday planning prompt
    if (HabitsService.isSunday() && !hasCompletedPlanning) {
      const dismissed = sessionStorage.getItem(`planning-dismissed-${weekStart}`);
      if (!dismissed) {
        setTimeout(() => setShowPlanningDialog(true), 2000);
      }
    }
    
    // Show quarterly review prompt
    if (isEndOfQuarter && !hasCompletedReview) {
      const dismissed = sessionStorage.getItem(`quarterly-dismissed-${weekStart}`);
      if (!dismissed) {
        setTimeout(() => setShowQuarterlyDialog(true), 3000);
      }
    }
  }, [user, weekStart, hasCompletedPlanning, hasCompletedReview, isEndOfQuarter]);
  
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
  
  if (!user) return null;
  
  return (
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
    </>
  );
};
