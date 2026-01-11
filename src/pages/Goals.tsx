import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { getLocalDateString } from "@/utils/dateUtils";

import { Goal } from "@/types/goals";
import { GoalForm } from "@/components/goals/GoalForm";
import { OrganizedGoalsView } from "@/components/goals/OrganizedGoalsView";
import { GoalDetailModal } from "@/components/goals/GoalDetailModal";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { ThisWeekView } from "@/components/thisweek/ThisWeekView";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useIsMobile } from "@/hooks/use-mobile";
import { CachedDataIndicator } from "@/components/pwa/CachedDataIndicator";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { GoalsSkeleton, GoalCardSkeleton } from "@/components/skeletons/PageSkeletons";

const Goals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const isMobile = useIsMobile();
  const { lastSync, isOffline } = useOfflineStatus();
  const { connection: duolingoConnection } = useDuolingoConnection();
  const {
    activeGoals,
    deprioritizedGoals,
    completedGoalsByYear,
    previousYearUnfinishedGoals,
    isLoading: goalsLoading,
    isCached: goalsCached,
    createGoal,
    updateGoal,
    deleteGoal,
    deprioritizeGoal,
    reprioritizeGoal,
    togglePauseGoal,
    reorderGoals,
  } = useGoals();

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  const [activeTab, setActiveTab] = useState("weekly");



  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateGoal = (data: any) => {
    createGoal(data);
    setShowForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
    // Switch to Goals tab to show the form
    if (activeTab !== "longterm") {
      setActiveTab("longterm");
    }
  };

  const handleUpdateGoal = (data: any) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, data);
      setEditingGoal(null);
      setShowForm(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleStatusChange = (id: string, status: any) => {
    updateGoal(id, { status });
  };

  const handleVisibilityChange = (id: string, visibility: any) => {
    updateGoal(id, { visibility });
    const visibilityLabels: Record<string, string> = {
      public: 'public (visible to everyone)',
      friends: 'friends only',
      private: 'private (only you)'
    };
    toast({
      title: "Visibility updated",
      description: `Goal is now ${visibilityLabels[visibility]}.`,
    });
  };

  const handleGoalReorder = (reorderedGoals: { id: string; order_index: number }[]) => {
    reorderGoals(reorderedGoals);
  };

  const handleCarryOverAll = () => {
    // Mark previous-year goals as "resolved" for the current year so we don't prompt again
    const currentYear = new Date().getFullYear();
    const today = getLocalDateString();
    const count = previousYearUnfinishedGoals.length;

    previousYearUnfinishedGoals.forEach(goal => {
      updateGoal(goal.id, {
        carry_over_resolved_year: currentYear,
        // Only set start_date if it was never set (avoid rewriting historical dates)
        ...(goal.start_date ? {} : { start_date: today }),
      });
    });

    toast({
      title: "Goals Carried Over",
      description: `${count} goal${count !== 1 ? 's' : ''} carried over to ${currentYear}.`,
    });
  };

  const handleDeprioritizeAll = () => {
    // Deprioritize all previous year goals
    previousYearUnfinishedGoals.forEach(goal => {
      deprioritizeGoal(goal.id);
    });
  };

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedGoal(null);
  };


  const handleModalEditGoal = (updatedGoal: Goal) => {
    // Update the selectedGoal state immediately so the modal shows the updated data
    setSelectedGoal(updatedGoal);
    updateGoal(updatedGoal.id, updatedGoal);
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

  // Redirect to auth if not logged in
  useEffect(() => {
    console.log('[Goals] Auth check - loading:', authLoading, 'user:', user?.email);
    if (!authLoading && !user) {
      console.log('[Goals] No user, redirecting to /auth');
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    console.log('[Goals] Auth still loading, showing skeleton');
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={false} onSignOut={() => {}} />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 font-heading">Goals & Progress</h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Manage your long-term goals and track your weekly progress.
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <GoalsSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[Goals] No user after auth loaded, returning null');
    return null;
  }
  
  console.log('[Goals] Rendering for user:', user.email);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-6'}`}>
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold text-foreground font-heading`}>Goals & Progress</h1>
            <CachedDataIndicator isCached={goalsCached || isOffline} lastSync={lastSync} />
          </div>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm px-2' : 'text-base sm:text-lg'} max-w-2xl mx-auto leading-relaxed`}>
            Manage your long-term goals and track your weekly progress.
          </p>
        </div>

        <div className={`${isMobile ? 'max-w-full' : 'max-w-6xl'} mx-auto`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-2 bg-muted ${isMobile ? 'h-11' : 'h-12'}`}>
              <TabsTrigger 
                value="weekly" 
                data-tour="weekly-tab"
                className={isMobile ? 'text-sm' : 'text-base'}
              >
                Weekly Plan
              </TabsTrigger>
              <TabsTrigger 
                value="longterm" 
                data-tour="goals-tab"
                className={isMobile ? 'text-sm' : 'text-base'}
              >
                Goals
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="weekly" className="mt-6">
              <ThisWeekView 
                weekStart={currentWeekStart}
                onNavigateWeek={navigateToWeek}
              />
            </TabsContent>
            
            <TabsContent value="longterm" className="mt-6">
              {showForm ? (
                <div className="mb-8">
                  <GoalForm
                    key={editingGoal ? editingGoal.id : 'new'}
                    onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
                    onCancel={handleCancelForm}
                    initialData={editingGoal}
                  />
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                  <Button
                    onClick={() => setShowForm(true)}
                    size="lg"
                    className="gradient-primary shadow-elegant hover:shadow-lift transition-all duration-300"
                  >
                      <Plus className="h-5 w-5 mr-2" />
                      Add New Goal
                    </Button>
                  </div>

                  {goalsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <GoalCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : (
                    <OrganizedGoalsView
                      activeGoals={activeGoals}
                      deprioritizedGoals={deprioritizedGoals}
                      completedGoalsByYear={completedGoalsByYear}
                      previousYearUnfinishedGoals={previousYearUnfinishedGoals}
                      onEdit={handleEditGoal}
                      onDelete={deleteGoal}
                      onStatusChange={handleStatusChange}
                      onGoalClick={handleGoalClick}
                      onDeprioritize={deprioritizeGoal}
                      onReprioritize={reprioritizeGoal}
                      onPauseToggle={togglePauseGoal}
                      onVisibilityChange={handleVisibilityChange}
                      onCarryOverAll={handleCarryOverAll}
                      onDeprioritizeAll={handleDeprioritizeAll}
                      onReorder={handleGoalReorder}
                      isLoading={goalsLoading}
                      duolingoStreak={duolingoConnection?.current_streak}
                    />
                  )}
                </>
              )}

              {/* Goal Detail Modal */}
              <GoalDetailModal
                goal={selectedGoal}
                isOpen={showDetailModal}
                onClose={handleCloseDetailModal}
                onEdit={handleModalEditGoal}
                onDelete={deleteGoal}
                onStatusChange={handleStatusChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Goals;
