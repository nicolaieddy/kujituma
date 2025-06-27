
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";

interface ObjectivesListProps {
  objectives: WeeklyObjective[];
  goals: Goal[];
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onUpdateObjectiveText: (id: string, text: string) => void;
  onDeleteObjective: (id: string) => void;
}

export const ObjectivesList = ({
  objectives,
  goals,
  onToggleObjective,
  onUpdateObjectiveText,
  onDeleteObjective
}: ObjectivesListProps) => {
  if (objectives.length === 0) {
    return null;
  }

  return (
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
                  onCheckedChange={() => onToggleObjective(objective.id, objective.is_completed)}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1">
                  <Input
                    value={objective.text}
                    onChange={(e) => onUpdateObjectiveText(objective.id, e.target.value)}
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
                  onClick={() => onDeleteObjective(objective.id)}
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
  );
};
