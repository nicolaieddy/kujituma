
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Plus, Target } from "lucide-react";
import { Goal } from "@/types/goals";

interface AddObjectiveFormProps {
  goals: Goal[];
  onCreateObjective: (text: string, goalId?: string) => void;
  isCreating: boolean;
}

export const AddObjectiveForm = ({ 
  goals, 
  onCreateObjective, 
  isCreating 
}: AddObjectiveFormProps) => {
  const navigate = useNavigate();
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");

  const handleCreateObjective = () => {
    if (!newObjectiveText.trim()) return;

    onCreateObjective(newObjectiveText, selectedGoalId || undefined);
    setNewObjectiveText("");
    setSelectedGoalId("");
  };

  const handleCreateNewGoal = () => {
    navigate('/goals');
  };

  // Group goals by status
  const groupedGoals = {
    in_progress: goals.filter(goal => goal.status === 'in_progress'),
    not_started: goals.filter(goal => goal.status === 'not_started'),
    completed: goals.filter(goal => goal.status === 'completed'),
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-lg">Add Weekly Objective</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newObjectiveText}
            onChange={(e) => setNewObjectiveText(e.target.value)}
            placeholder="Enter your objective for this week..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateObjective()}
          />
          <Button
            onClick={handleCreateObjective}
            disabled={!newObjectiveText.trim() || isCreating}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div>
          <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
            <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Link to a goal (optional)" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/20 z-50">
              <SelectItem value="">
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
      </CardContent>
    </Card>
  );
};
