
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { GoalForm } from "@/components/goals/GoalForm";
import { GoalsKanban } from "@/components/goals/GoalsKanban";
import { Goal, CreateGoalData } from "@/types/goals";

const Goals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { goalsByStatus, isLoading, createGoal, updateGoal, deleteGoal, isCreating } = useGoals();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const handleCreateGoal = (data: CreateGoalData) => {
    createGoal(data);
    setShowForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    // TODO: Implement edit functionality
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      deleteGoal(id);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateGoal(id, { status: status as any });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const totalGoals = Object.values(goalsByStatus).reduce((sum, goals) => sum + goals.length, 0);
  const completedGoals = goalsByStatus.completed.length;
  const inProgressGoals = goalsByStatus.in_progress.length;

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
        {showForm ? (
          <div className="mb-8">
            <GoalForm
              onSubmit={handleCreateGoal}
              onCancel={() => setShowForm(false)}
              isLoading={isCreating}
            />
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Personal Goals
              </h1>
              <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto mb-6">
                Track your progress with a clear overview of your goals from start to finish.
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-white">
                    <Target className="h-5 w-5" />
                    <span className="text-2xl font-bold">{totalGoals}</span>
                  </div>
                  <p className="text-white/70 text-sm">Total Goals</p>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-white">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-2xl font-bold">{inProgressGoals}</span>
                  </div>
                  <p className="text-white/70 text-sm">In Progress</p>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-white">
                    <Target className="h-5 w-5" />
                    <span className="text-2xl font-bold">{completedGoals}</span>
                  </div>
                  <p className="text-white/70 text-sm">Completed</p>
                </div>
              </div>
            </div>

            {/* Add Goal Button */}
            <div className="text-center mb-8">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-base px-6 py-3"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Goal
              </Button>
            </div>

            {/* Goals Kanban Board */}
            {isLoading ? (
              <div className="text-center text-white">Loading goals...</div>
            ) : (
              <GoalsKanban
                goalsByStatus={goalsByStatus}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
                onStatusChange={handleStatusChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Goals;
