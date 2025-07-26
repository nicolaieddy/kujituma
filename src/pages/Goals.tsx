
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import { useGoalObjectives } from "@/hooks/useGoalObjectives";
import { Goal } from "@/types/goals";
import { GoalForm } from "@/components/goals/GoalForm";
import { GoalsKanban } from "@/components/goals/GoalsKanban";
import { GoalDetailModal } from "@/components/goals/GoalDetailModal";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { ThisWeekView } from "@/components/thisweek/ThisWeekView";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useIsMobile } from "@/hooks/use-mobile";

const Goals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const isMobile = useIsMobile();
  const { goalsByStatus, isLoading, createGoal, updateGoal, deleteGoal } = useGoals();
  const { objectives, createObjective, updateObjective, deleteObjective } = useGoalObjectives();
  
  // Debug logging for objectives data
  console.log('=== Goals.tsx Debug START ===');
  console.log('Total Objectives from useGoalObjectives:', objectives);
  console.log('Objectives count:', objectives?.length || 0);
  console.log('Sample objectives with goal_id:', objectives?.filter(obj => obj.goal_id).slice(0, 3));
  console.log('=== Goals.tsx Debug END ===');
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  const handleCreateGoal = (data: any) => {
    createGoal(data);
    setShowForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 transition-colors duration-300">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-6'}`}>
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold text-white mb-4`}>Goals & Progress</h1>
          <p className={`text-white/80 ${isMobile ? 'text-sm px-2' : 'text-base sm:text-lg'} max-w-2xl mx-auto`}>
            Manage your long-term goals and track your weekly progress.
          </p>
        </div>

        <div className={`${isMobile ? 'max-w-full' : 'max-w-6xl'} mx-auto`}>
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className={`grid w-full grid-cols-2 bg-white/10 backdrop-blur-lg border-white/20 ${isMobile ? 'h-11' : 'h-12'}`}>
              <TabsTrigger 
                value="weekly" 
                data-tour="weekly-tab"
                className={`text-white data-[state=active]:bg-white/20 data-[state=active]:text-white ${isMobile ? 'text-sm' : 'text-base'}`}
              >
                Weekly Plan
              </TabsTrigger>
              <TabsTrigger 
                value="longterm" 
                data-tour="goals-tab"
                className={`text-white data-[state=active]:bg-white/20 data-[state=active]:text-white ${isMobile ? 'text-sm' : 'text-base'}`}
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
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-base px-6 py-3"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add New Goal
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="text-center text-white">Loading goals...</div>
                  ) : (
                    <GoalsKanban
                      goalsByStatus={goalsByStatus}
                      onEdit={handleEditGoal}
                      onDelete={deleteGoal}
                      onStatusChange={handleStatusChange}
                      onGoalClick={handleGoalClick}
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
