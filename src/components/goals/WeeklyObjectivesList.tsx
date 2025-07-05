
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Target, Edit2, Check, RotateCcw, Trash2, Pencil } from "lucide-react";
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
  isDeletingAll = false,
}: WeeklyObjectivesListProps) => {
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Auto-save hook for new objectives
  const autoSave = useObjectiveAutoSave({
    onSave: onAddObjective,
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

  const handleSaveEdit = (objectiveId: string) => {
    if (editingText.trim()) {
      onUpdateObjectiveText(objectiveId, editingText.trim());
    }
    setEditingObjectiveId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingObjectiveId(null);
    setEditingText("");
  };

  const handleGoalChange = (objectiveId: string, goalId: string) => {
    const goalIdToSave = goalId === "none" ? null : goalId;
    onUpdateObjectiveGoal(objectiveId, goalIdToSave);
    setEditingGoalId(null); // Close goal editor after change
  };

  const handleEditGoal = (objectiveId: string, currentGoalId: string | null) => {
    setEditingGoalId(objectiveId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label className="text-white font-medium text-lg">
          🎯 This Week's Objectives
        </Label>
        {objectives.length > 0 && !isWeekCompleted && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="glass-outline"
                size="sm"
                disabled={isDeletingAll}
                className="text-red-300 hover:text-red-200 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-800 border-white/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Clear All Objectives</AlertDialogTitle>
                <AlertDialogDescription className="text-white/80">
                  Are you sure you want to delete all {objectives.length} objective{objectives.length !== 1 ? 's' : ''}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAllObjectives}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
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
                             open={true}
                             onOpenChange={(open) => !open && setEditingGoalId(null)}
                           >
                             <SelectContent className="bg-slate-800 border-white/20">
                               <SelectItem value="none">No goal</SelectItem>
                               {goals.map((goal) => (
                                 <SelectItem key={goal.id} value={goal.id} className="text-white">
                                   {goal.title}
                                 </SelectItem>
                               ))}
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
            
            {/* Goal selector for new objective */}
            <div className="ml-8 flex items-center gap-3">
              <Target className="h-4 w-4 text-white/60" />
              <Select value={autoSave.goalId} onValueChange={autoSave.setGoalId}>
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Link to a goal (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  <SelectItem value="none">No goal (standalone objective)</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id} className="text-white">
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
