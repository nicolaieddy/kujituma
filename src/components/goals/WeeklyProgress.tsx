
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Calendar } from "lucide-react";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";

interface WeeklyProgressProps {
  selectedWeek?: string;
}

export const WeeklyProgress = ({ selectedWeek }: WeeklyProgressProps) => {
  const { goals } = useGoals();
  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    weekRange,
    isCreating,
    isUpdating,
    isSavingNotes,
  } = useWeeklyProgress(selectedWeek);

  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [progressNotes, setProgressNotes] = useState(progressPost?.notes || "");

  const handleCreateObjective = () => {
    if (!newObjectiveText.trim()) return;

    createObjective({
      text: newObjectiveText,
      goal_id: selectedGoalId || undefined,
    });

    setNewObjectiveText("");
    setSelectedGoalId("");
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    updateObjective(id, { text });
  };

  const handleSaveNotes = () => {
    updateProgressNotes(progressNotes);
  };

  const completedCount = objectives.filter(obj => obj.is_completed).length;
  const totalCount = objectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-white" />
          <h2 className="text-2xl font-bold text-white">Weekly Progress</h2>
        </div>
        <p className="text-white/80">{weekRange}</p>
        {totalCount > 0 && (
          <div className="mt-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-full h-2 w-full max-w-xs mx-auto">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-white/60 text-sm mt-1">
              {completedCount} of {totalCount} objectives completed ({completionPercentage}%)
            </p>
          </div>
        )}
      </div>

      {/* Add New Objective */}
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

      {/* Objectives List */}
      {objectives.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">This Week's Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {objectives.map((objective) => {
                const linkedGoal = objective.goal_id ? goals.find(g => g.id === objective.goal_id) : null;
                
                return (
                  <div key={objective.id} className="flex items-center gap-3 group">
                    <Checkbox
                      checked={objective.is_completed}
                      onCheckedChange={() => handleToggleObjective(objective.id, objective.is_completed)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <Input
                        value={objective.text}
                        onChange={(e) => handleUpdateObjectiveText(objective.id, e.target.value)}
                        className={`bg-transparent border-none text-white p-0 h-auto ${
                          objective.is_completed ? 'line-through text-white/60' : ''
                        }`}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      {linkedGoal && (
                        <p className="text-xs text-white/60 mt-1">
                          Linked to: {linkedGoal.title}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteObjective(objective.id)}
                      className="text-white/60 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Notes */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Progress Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            placeholder="Reflect on your week... What went well? What challenges did you face? What did you learn?"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[120px]"
          />
          <Button
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            {isSavingNotes ? "Saving..." : "Save Notes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
