
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

const Goals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { goalsByStatus, isLoading, createGoal, updateGoal, deleteGoal } = useGoals();
  const { objectives, createObjective, updateObjective, deleteObjective } = useGoalObjectives();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Long-term Goals</h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            Plan and track your bigger goals and aspirations.
          </p>
        </div>

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
      </div>
    </div>
  );
};

export default Goals;
