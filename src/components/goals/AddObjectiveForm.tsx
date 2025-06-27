
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
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
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");

  const handleCreateObjective = () => {
    if (!newObjectiveText.trim()) return;

    onCreateObjective(newObjectiveText, selectedGoalId || undefined);
    setNewObjectiveText("");
    setSelectedGoalId("");
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
        
        {goals.length > 0 && (
          <div>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
            >
              <option value="">Link to a goal (optional)</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id} className="bg-gray-800">
                  {goal.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
