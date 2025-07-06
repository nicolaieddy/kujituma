import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Goal } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { formatRelativeTime } from "@/utils/dateUtils";
import { Plus, CheckCircle2, Clock, Trash2, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GoalObjectivesListProps {
  goal: Goal;
  objectives: WeeklyObjective[];
  onCreateObjective: (goalId: string, text: string) => void;
  onUpdateObjective: (id: string, updates: any) => void;
  onDeleteObjective: (id: string) => void;
}

export const GoalObjectivesList = ({
  goal,
  objectives,
  onCreateObjective,
  onUpdateObjective,
  onDeleteObjective,
}: GoalObjectivesListProps) => {
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Group objectives by week
  const objectivesByWeek = objectives.reduce((acc, obj) => {
    const weekKey = obj.week_start;
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(obj);
    return acc;
  }, {} as Record<string, WeeklyObjective[]>);

  const sortedWeeks = Object.keys(objectivesByWeek).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const handleCreateObjective = async () => {
    if (!newObjectiveText.trim()) return;

    setIsCreating(true);
    try {
      const currentWeekStart = WeeklyProgressService.getWeekStart();
      onCreateObjective(goal.id, newObjectiveText.trim());
      setNewObjectiveText("");
      toast({
        title: "Success",
        description: "Weekly objective created successfully!",
      });
    } catch (error) {
      console.error('Error creating objective:', error);
      toast({
        title: "Error",
        description: "Failed to create objective. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = (objective: WeeklyObjective) => {
    onUpdateObjective(objective.id, {
      is_completed: !objective.is_completed
    });
  };

  const formatWeekRange = (weekStart: string) => {
    return WeeklyProgressService.formatWeekRange(weekStart);
  };

  return (
    <div className="space-y-6">
      {/* Create new objective for current week */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Add Weekly Objective</CardTitle>
          <p className="text-white/60 text-sm">
            Create a new objective for this goal for the current week
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newObjectiveText}
              onChange={(e) => setNewObjectiveText(e.target.value)}
              placeholder="What do you want to achieve this week towards this goal?"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateObjective();
                }
              }}
            />
            <Button
              onClick={handleCreateObjective}
              disabled={!newObjectiveText.trim() || isCreating}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Objectives by week */}
      {sortedWeeks.length === 0 ? (
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <Clock className="h-8 w-8 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">
              No weekly objectives created for this goal yet.
            </p>
            <p className="text-white/40 text-sm mt-2">
              Create your first objective above to start working towards this goal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedWeeks.map((weekStart) => {
            const weekObjectives = objectivesByWeek[weekStart];
            const completedCount = weekObjectives.filter(obj => obj.is_completed).length;
            
            return (
              <Card key={weekStart} className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-white" />
                      <CardTitle className="text-white text-lg">
                        {formatWeekRange(weekStart)}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {completedCount}/{weekObjectives.length} completed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weekObjectives.map((objective) => (
                      <div
                        key={objective.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Checkbox
                          checked={objective.is_completed}
                          onCheckedChange={() => handleToggleComplete(objective)}
                          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <div className="flex-1">
                          <p className={`text-white ${objective.is_completed ? 'line-through opacity-70' : ''}`}>
                            {objective.text}
                          </p>
                          <p className="text-xs text-white/60 mt-1">
                            {objective.is_completed ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </span>
                            ) : (
                              `Created ${formatRelativeTime(new Date(objective.created_at).getTime())}`
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteObjective(objective.id)}
                          className="text-red-400 hover:bg-red-500/20 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};