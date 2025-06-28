
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Link } from "lucide-react";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";

interface WeeklyObjectivesListProps {
  objectives: WeeklyObjective[];
  goals: Goal[];
  isWeekCompleted: boolean;
  isCreating: boolean;
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onUpdateObjectiveText: (id: string, text: string) => void;
  onUpdateObjectiveGoal: (id: string, goalId: string | null) => void;
  onDeleteObjective: (id: string) => void;
  onAddObjective: (text: string) => void;
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
  onAddObjective,
}: WeeklyObjectivesListProps) => {
  const [newObjective, setNewObjective] = useState("");

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      onAddObjective(newObjective.trim());
      setNewObjective("");
    }
  };

  const getGoalById = (goalId: string | null) => {
    if (!goalId) return null;
    return goals.find(goal => goal.id === goalId) || null;
  };

  return (
    <div>
      <Label className="text-white font-medium text-lg">
        🎯 This Week's Objectives
      </Label>
      <div className="mt-3 space-y-3">
        {objectives.map((objective) => {
          const linkedGoal = getGoalById(objective.goal_id);
          
          return (
            <div key={objective.id} className="space-y-2">
              <div className="flex items-center gap-3 group">
                <Checkbox
                  checked={objective.is_completed}
                  onCheckedChange={() => onToggleObjective(objective.id, objective.is_completed)}
                  disabled={isWeekCompleted}
                  className="border-white/40 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <Input
                  value={objective.text}
                  onChange={(e) => onUpdateObjectiveText(objective.id, e.target.value)}
                  disabled={isWeekCompleted}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 disabled:opacity-50"
                  placeholder="Enter an objective..."
                />
                {!isWeekCompleted && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteObjective(objective.id)}
                    className="text-white/60 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Goal association */}
              {!isWeekCompleted && goals.length > 0 && (
                <div className="ml-7 flex items-center gap-2">
                  <Link className="h-3 w-3 text-white/60" />
                  <Select
                    value={objective.goal_id || ""}
                    onValueChange={(value) => onUpdateObjectiveGoal(objective.id, value || null)}
                  >
                    <SelectTrigger className="w-full bg-white/10 border-white/20 text-white text-sm h-8">
                      <SelectValue placeholder="Link to a goal (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-white/20">
                      <SelectItem value="" className="text-white hover:bg-white/10">
                        No goal linked
                      </SelectItem>
                      {goals.map((goal) => (
                        <SelectItem 
                          key={goal.id} 
                          value={goal.id}
                          className="text-white hover:bg-white/10"
                        >
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Show linked goal when week is completed or when goal is linked */}
              {linkedGoal && (
                <div className="ml-7 flex items-center gap-2 text-xs text-white/60">
                  <Link className="h-3 w-3" />
                  <span>Linked to: {linkedGoal.title}</span>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add new objective - only show if week is not completed */}
        {!isWeekCompleted && (
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
        )}
      </div>
    </div>
  );
};
