
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import { Goal } from "@/types/goals";
import { GoalForm } from "@/components/goals/GoalForm";
import { GoalsKanban } from "@/components/goals/GoalsKanban";
import { WeeklyProgress } from "@/components/goals/WeeklyProgress";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Goals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { goalsByStatus, isLoading, createGoal, updateGoal, deleteGoal } = useGoals();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

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

      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Goals & Progress</h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            Track your goals and manage your weekly progress in one place.
          </p>
        </div>

        <Tabs defaultValue="goals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="goals" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <Calendar className="h-4 w-4" />
              Weekly Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="mt-6">
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
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-6">
            <WeeklyProgress />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Goals;
