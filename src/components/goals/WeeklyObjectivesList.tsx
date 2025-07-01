
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Target, Edit2, Check, RotateCcw } from "lucide-react";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";

interface WeeklyObjectivesListProps {
  objectives: WeeklyObjective[];
  goals: Goal[];
  isWeekCompleted: boolean;
  isCreating: boolean;
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onUpdateObjectiveText: (id: string, text: string) => void;
  onDeleteObjective: (id: string) => void;
  onAddObjective: (text: string, goalId?: string) => void;
}

export const WeeklyObjectivesList = ({
  objectives,
  goals,
  isWeekCompleted,
  isCreating,
  onToggleObjective,
  onUpdateObjectiveText,
  onDeleteObjective,
  onAddObjective,
}: WeeklyObjectivesListProps) => {
  const [newObjective, setNewObjective] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("none");
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      const goalId = selectedGoalId === "none" ? undefined : selectedGoalId;
      onAddObjective(newObjective.trim(), goalId);
      setNewObjective("");
      setSelectedGoalId("none");
    }
  };

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

  return (
    <div>
      <Label className="text-white font-medium text-lg">
        🎯 This Week's Objectives
      </Label>
      <div className="mt-3 space-y-3">
        {objectives.map((objective) => {
          const goalName = getGoalName(objective.goal_id);
          const isEditing = editingObjectiveId === objective.id;
          
          return (
            <div key={objective.id} className="space-y-2">
              <div className="flex items-center gap-3 group">
                <Checkbox
                  checked={objective.is_completed}
                  onCheckedChange={() => onToggleObjective(objective.id, objective.is_completed)}
                  disabled={isWeekCompleted}
                  className="border-white/40 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                
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
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white">
                    {objective.text}
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
              {goalName && (
                <div className="ml-8 flex items-center gap-2 text-xs text-white/60">
                  <Target className="h-3 w-3" />
                  <span>Linked to goal: {goalName}</span>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add new objective - only show if week is not completed */}
        {!isWeekCompleted && (
          <div className="space-y-3 border-t border-white/10 pt-3">
            <div className="flex items-center gap-3">
              <Checkbox 
                disabled 
                className="border-white/40 opacity-50"
              />
              <Input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="Add a new objective..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddObjective}
                disabled={!newObjective.trim() || isCreating}
                className="text-white/60 hover:text-white hover:bg-white/20"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Goal selector */}
            <div className="ml-8 flex items-center gap-3">
              <Target className="h-4 w-4 text-white/60" />
              <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
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
