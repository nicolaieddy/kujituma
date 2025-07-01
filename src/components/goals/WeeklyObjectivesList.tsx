
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
import { WeeklyObjective } from "@/types/weeklyProgress";

interface WeeklyObjectivesListProps {
  objectives: WeeklyObjective[];
  isWeekCompleted: boolean;
  isCreating: boolean;
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onUpdateObjectiveText: (id: string, text: string) => void;
  onDeleteObjective: (id: string) => void;
  onAddObjective: (text: string) => void;
}

export const WeeklyObjectivesList = ({
  objectives,
  isWeekCompleted,
  isCreating,
  onToggleObjective,
  onUpdateObjectiveText,
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

  return (
    <div>
      <Label className="text-white font-medium text-lg">
        🎯 This Week's Objectives
      </Label>
      <div className="mt-3 space-y-3">
        {objectives.map((objective) => (
          <div key={objective.id} className="flex items-center gap-3 group">
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
        ))}
        
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
