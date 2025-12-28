
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";
import { useHabitStats } from "@/hooks/useHabitStats";
import { Goal } from "@/types/goals";
import { GoalForm } from "@/components/goals/GoalForm";
import { OrganizedGoalsView } from "@/components/goals/OrganizedGoalsView";
import { GoalDetailModal } from "@/components/goals/GoalDetailModal";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { ThisWeekView } from "@/components/thisweek/ThisWeekView";
import { HabitsView } from "@/components/habits/HabitsView";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useIsMobile } from "@/hooks/use-mobile";
import { KilimanjaroLoader } from "@/components/ui/kilimanjaro-loader";
import { CachedDataIndicator } from "@/components/pwa/CachedDataIndicator";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

const Goals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const isMobile = useIsMobile();
  const { lastSync, isOffline } = useOfflineStatus();
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
    reorderGoals
  } = useGoals();
  const { objectives, createObjective, updateObjective, deleteObjective, isLoading: objectivesLoading } = useAllWeeklyObjectives();
  const { habitStats } = useHabitStats();
  
  // Create a map of goal IDs to current streaks for quick lookup
  const habitStreaks = useMemo(() => {
    const streakMap: Record<string, number> = {};
    habitStats.forEach(stat => {
      streakMap[stat.goal.id] = stat.currentStreak;
    });
    return streakMap;
  }, [habitStats]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  const [activeTab, setActiveTab] = useState("weekly");
  const [createWithRecurring, setCreateWithRecurring] = useState(false);

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
    setCreateWithRecurring(false);
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
    setCreateWithRecurring(false);
  };

  const handleCreateHabit = () => {
    setCreateWithRecurring(true);
    setActiveTab("longterm");
    setShowForm(true);
  };

  const handleStatusChange = (id: string, status: any) => {
    updateGoal(id, { status });
  };

  const handleGoalReorder = (reorderedGoals: { id: string; order_index: number }[]) => {
    reorderGoals(reorderedGoals);
  };

  const handleCarryOverAll = () => {
    // Update all previous year goals to current year context (re-confirms as active)
    previousYearUnfinishedGoals.forEach(goal => {
      updateGoal(goal.id, { status: 'not_started' });
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

  const handleCreateObjective = (goalId: string, text: string) => {
    createObjective(goalId, text);
  };

  const handleUpdateObjective = (id: string, updates: any) => {
    updateObjective(id, updates);
  };

  const handleDeleteObjective = (id: string) => {
    deleteObjective(id);
  };

  const handleModalEditGoal = (updatedGoal: Goal) => {
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <KilimanjaroLoader />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-6'}`}>
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold text-foreground font-serif`}>Goals & Progress</h1>
            <CachedDataIndicator isCached={goalsCached || isOffline} lastSync={lastSync} />
          </div>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm px-2' : 'text-base sm:text-lg'} max-w-2xl mx-auto leading-relaxed`}>
            Manage your long-term goals and track your weekly progress.
          </p>
        </div>

        <div className={`${isMobile ? 'max-w-full' : 'max-w-6xl'} mx-auto`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-3 bg-muted ${isMobile ? 'h-11' : 'h-12'}`}>
              <TabsTrigger 
                value="weekly" 
                data-tour="weekly-tab"
                className={isMobile ? 'text-sm' : 'text-base'}
              >
                Weekly Plan
              </TabsTrigger>
              <TabsTrigger 
                value="habits" 
                className={isMobile ? 'text-sm' : 'text-base'}
              >
                Habits
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

            <TabsContent value="habits" className="mt-6">
              <HabitsView 
                onCreateGoal={handleCreateHabit} 
                onEditGoal={handleEditGoal}
              />
            </TabsContent>
            
            <TabsContent value="longterm" className="mt-6">
              {showForm ? (
                <div className="mb-8">
                  <GoalForm
                    key={editingGoal ? editingGoal.id : (createWithRecurring ? 'new-recurring' : 'new')}
                    onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
                    onCancel={handleCancelForm}
                    initialData={editingGoal || (createWithRecurring ? { 
                      is_recurring: true, 
                      recurrence_frequency: 'weekly' 
                    } as any : null)}
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
                    <div className="text-center text-muted-foreground">Loading goals...</div>
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
                      onCarryOverAll={handleCarryOverAll}
                      onDeprioritizeAll={handleDeprioritizeAll}
                      onReorder={handleGoalReorder}
                      isLoading={goalsLoading}
                      habitStreaks={habitStreaks}
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
                weeklyObjectives={objectives}
                onCreateObjective={handleCreateObjective}
                onUpdateObjective={handleUpdateObjective}
                onDeleteObjective={handleDeleteObjective}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Goals;
