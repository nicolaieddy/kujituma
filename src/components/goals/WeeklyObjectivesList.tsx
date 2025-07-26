
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Plus, X, Target, Edit2, Check, RotateCcw, Trash2, Pencil, ArrowRight } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { useObjectiveAutoSave } from "@/hooks/useObjectiveAutoSave";
import { AutoSaveIndicator } from "@/components/thisweek/AutoSaveIndicator";

interface WeeklyObjectivesListProps {
  objectives: WeeklyObjective[];
  goals: Goal[];
  isWeekCompleted: boolean;
  isCreating: boolean;
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onUpdateObjectiveText: (id: string, text: string) => void;
  onUpdateObjectiveGoal: (id: string, goalId: string | null) => void;
  onDeleteObjective: (id: string) => void;
  onDeleteAllObjectives: () => void;
  onAddObjective: (text: string, goalId?: string) => Promise<void>;
  onOpenCarryOver?: () => void;
  hasIncompleteObjectives?: boolean;
  isDeletingAll?: boolean;
}

export const WeeklyObjectivesList = ({
  objectives,
  goals,
  isWeekCompleted,
  isCreating,
  onToggleObjective,
  onUpdateObjectiveText,
  onUpdateObjectiveGoal,
  onDeleteObjective,
  onDeleteAllObjectives,
  onAddObjective,
  onOpenCarryOver,
  hasIncompleteObjectives = false,
  isDeletingAll = false,
}: WeeklyObjectivesListProps) => {
  const navigate = useNavigate();
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [savingObjectiveIds, setSavingObjectiveIds] = useState<Set<string>>(new Set());

  const handleCreateNewGoal = () => {
    navigate('/goals');
  };

  // Group goals by status
  const groupedGoals = {
    in_progress: goals.filter(goal => goal.status === 'in_progress'),
    not_started: goals.filter(goal => goal.status === 'not_started'),
    completed: goals.filter(goal => goal.status === 'completed'),
  };

  // Auto-save hook for new objectives
  const autoSave = useObjectiveAutoSave({
    onSave: (text: string) => onAddObjective(text),
    delay: 2000,
  });

  // Helper function to get goal name by ID
  const getGoalName = (goalId: string | null) => {
    if (!goalId || !goals) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  };

  // Don't render if goals are not loaded yet
  if (!goals) {
    return <div className="text-white">Loading objectives...</div>;
  }

  const handleEditObjective = (objective: WeeklyObjective) => {
    setEditingObjectiveId(objective.id);
    setEditingText(objective.text);
  };

  const handleSaveEdit = async (objectiveId: string) => {
    if (editingText.trim()) {
      setSavingObjectiveIds(prev => new Set(prev).add(objectiveId));
      try {
        await onUpdateObjectiveText(objectiveId, editingText.trim());
      } finally {
        setSavingObjectiveIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(objectiveId);
          return newSet;
        });
      }
    }
    setEditingObjectiveId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingObjectiveId(null);
    setEditingText("");
  };

  const handleGoalChange = async (objectiveId: string, goalId: string) => {
    const goalIdToSave = goalId === "none" ? null : goalId;
    setSavingObjectiveIds(prev => new Set(prev).add(objectiveId));
    try {
      await onUpdateObjectiveGoal(objectiveId, goalIdToSave);
    } finally {
      setSavingObjectiveIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(objectiveId);
        return newSet;
      });
    }
    setEditingGoalId(null); // Close goal editor after change
  };

  const handleEditGoal = (objectiveId: string, currentGoalId: string | null) => {
    setEditingGoalId(objectiveId);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Label className="text-white font-medium text-lg">
          🎯 This Week's Objectives
        </Label>
        {!isWeekCompleted && hasIncompleteObjectives && onOpenCarryOver && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCarryOver}
            className="border-white/20 text-white hover:bg-white/10 text-xs"
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            Carry Over From Previous Weeks
          </Button>
        )}
      </div>
      
      {/* Empty state with helpful description */}
      {objectives.length === 0 && (
        <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-purple-500/20 rounded-full p-3">
                <Target className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-lg">
                Plan Your Week for Success
              </h3>
              <p className="text-white/70 text-sm max-w-md mx-auto">
                Use your weekly plan to list your top priorities for the week. Focus on what matters most and make meaningful progress.
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 space-y-3 text-left max-w-lg mx-auto">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 rounded-full p-1 mt-0.5">
                  <Target className="h-3 w-3 text-blue-400" />
                </div>
                <div className="text-sm">
                  <div className="text-white font-medium">Link to Long-term Goals</div>
                  <div className="text-white/60">
                    Connect weekly objectives to your bigger goals for better accountability and visibility into your progress.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-green-500/20 rounded-full p-1 mt-0.5">
                  <Check className="h-3 w-3 text-green-400" />
                </div>
                <div className="text-sm">
                  <div className="text-white font-medium">Not Everything Needs a Goal</div>
                  <div className="text-white/60">
                    Some weekly priorities might be standalone tasks - that's perfectly fine! The goal linking is optional.
                  </div>
                </div>
              </div>
            </div>
            <p className="text-white/50 text-xs">
              Start by adding your first objective below ⬇️
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-3 space-y-3">
        {objectives.map((objective) => {
          const goalName = getGoalName(objective.goal_id);
          const isEditing = editingObjectiveId === objective.id;
          
          return (
            <div key={objective.id} className="space-y-2">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <Checkbox
                    checked={objective.is_completed}
                    onCheckedChange={() => onToggleObjective(objective.id, objective.is_completed)}
                    disabled={isWeekCompleted}
                    className={`border-white/40 transition-all duration-300 ${
                      objective.is_completed 
                        ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-400 shadow-lg shadow-green-500/30' 
                        : 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
                    }`}
                  />
                  {objective.is_completed && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-bounce opacity-75"></div>
                  )}
                </div>
                
                 {isEditing ? (
                   <Input
                     value={editingText}
                     onChange={(e) => setEditingText(e.target.value)}
                     onKeyPress={(e) => {
                       if (e.key === 'Enter') {
                         handleSaveEdit(objective.id);
                       } else if (e.key === 'Escape') {
                         handleCancelEdit();
                       }
                     }}
                     className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                     placeholder="Enter an objective..."
                     autoFocus
                   />
                 ) : (
                   <div className={`flex-1 px-2 py-1 transition-all duration-300 ${
                     objective.is_completed 
                       ? 'text-green-100' 
                       : 'text-white'
                   }`}>
                     <div className="flex items-center gap-2">
                       <span className={`${
                         objective.is_completed 
                           ? 'line-through decoration-2 decoration-green-400' 
                           : ''
                       } transition-all duration-300`}>
                         {objective.text}
                       </span>
                       {objective.is_completed && (
                         <span className="text-green-400 font-medium animate-pulse">
                           ✨ Complete!
                         </span>
                       )}
                       {/* Show goal inline with pencil edit */}
                       {goalName && (
                         <div className="flex items-center gap-1 ml-2">
                           <Target className="h-3 w-3 text-white/60" />
                           <span className="text-xs text-white/60">→ {goalName}</span>
                           {!isWeekCompleted && (
                             <Button
                               type="button"
                               variant="ghost"
                               size="sm"
                               onClick={() => handleEditGoal(objective.id, objective.goal_id)}
                               className="h-4 w-4 p-0 text-white/40 hover:text-white hover:bg-white/10 ml-1"
                             >
                               <Pencil className="h-3 w-3" />
                             </Button>
                           )}
                         </div>
                       )}
                        {/* Show goal selector inline when editing */}
                        {editingGoalId === objective.id && !isWeekCompleted && (
                          <div className="ml-2">
                            <Select 
                              value={objective.goal_id || "none"} 
                              onValueChange={(value) => handleGoalChange(objective.id, value)}
                              onOpenChange={(open) => !open && setEditingGoalId(null)}
                            >
                              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="Select a goal" />
                              </SelectTrigger>
                               <SelectContent className="bg-slate-800 border-white/20 z-50">
                                 <SelectItem value="none">
                                   <div className="flex items-center gap-2">
                                     <Target className="h-4 w-4" />
                                     <span>No goal</span>
                                   </div>
                                 </SelectItem>
                                 
                                 {goals.length === 0 ? (
                                   <SelectItem value="create-new" onSelect={handleCreateNewGoal}>
                                     <div className="flex items-center gap-2 text-blue-400">
                                       <Plus className="h-4 w-4" />
                                       <span>Create your first goal</span>
                                     </div>
                                   </SelectItem>
                                 ) : (
                                   <>
                                     {groupedGoals.in_progress.length > 0 && (
                                       <SelectGroup>
                                         <SelectLabel className="text-green-400 font-medium">In Progress</SelectLabel>
                                         {groupedGoals.in_progress.map((goal) => (
                                           <SelectItem key={goal.id} value={goal.id} className="text-white pl-6">
                                             {goal.title}
                                           </SelectItem>
                                         ))}
                                       </SelectGroup>
                                     )}
                                     
                                     {groupedGoals.not_started.length > 0 && (
                                       <SelectGroup>
                                         <SelectLabel className="text-blue-400 font-medium">Not Started</SelectLabel>
                                         {groupedGoals.not_started.map((goal) => (
                                           <SelectItem key={goal.id} value={goal.id} className="text-white pl-6">
                                             {goal.title}
                                           </SelectItem>
                                         ))}
                                       </SelectGroup>
                                     )}
                                     
                                     {groupedGoals.completed.length > 0 && (
                                       <SelectGroup>
                                         <SelectLabel className="text-gray-400 font-medium">Completed</SelectLabel>
                                         {groupedGoals.completed.map((goal) => (
                                           <SelectItem key={goal.id} value={goal.id} className="text-white pl-6">
                                             {goal.title}
                                           </SelectItem>
                                         ))}
                                       </SelectGroup>
                                     )}
                                   </>
                                 )}
                               </SelectContent>
                            </Select>
                          </div>
                        )}
                       {/* Add goal button when no goal is linked */}
                       {!goalName && !isWeekCompleted && editingGoalId !== objective.id && (
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           onClick={() => handleEditGoal(objective.id, objective.goal_id)}
                           className="h-6 px-2 text-xs text-white/40 hover:text-white hover:bg-white/10 ml-2"
                         >
                           <Target className="h-3 w-3 mr-1" />
                           Link goal
                         </Button>
                        )}
                        {/* Show saving indicator */}
                        {savingObjectiveIds.has(objective.id) && (
                          <div className="flex items-center gap-1 ml-2">
                            <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin"></div>
                            <span className="text-xs text-white/60">Saving...</span>
                          </div>
                        )}
                     </div>
                   </div>
                 )}
                
                {!isWeekCompleted && (
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEdit(objective.id)}
                          className="text-green-400 hover:text-green-300 hover:bg-white/20"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="text-white/60 hover:text-white hover:bg-white/20"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditObjective(objective)}
                          className="text-white/60 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteObjective(objective.id)}
                          className="text-white/60 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                   </div>
                 )}
               </div>
            </div>
          );
        })}
        
        {/* Add new objective with auto-save - only show if week is not completed */}
        {!isWeekCompleted && (
          <div className="space-y-3 border-t border-white/10 pt-3">
            <div className="flex items-center gap-3">
              <Checkbox 
                disabled 
                className="border-white/40 opacity-50"
              />
               <Input
                 value={autoSave.value}
                 onChange={(e) => autoSave.setValue(e.target.value)}
                 className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                 placeholder="Add a new objective..."
               />
               {/* Show auto-save indicator only when actively saving or recently saved */}
               {(autoSave.isSaving || autoSave.lastSaved) && (
                 <AutoSaveIndicator
                   isSaving={autoSave.isSaving}
                   lastSaved={autoSave.lastSaved}
                   hasUnsavedChanges={autoSave.hasUnsavedChanges}
                 />
               )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};
