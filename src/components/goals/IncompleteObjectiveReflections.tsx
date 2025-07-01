import { WeeklyObjective, WeeklyProgressPost } from "@/types/weeklyProgress";
import { AlertTriangle } from "lucide-react";

interface IncompleteObjectiveReflectionsProps {
  objectives: WeeklyObjective[];
  progressPost: WeeklyProgressPost | null;
}

export const IncompleteObjectiveReflections = ({
  objectives,
  progressPost,
}: IncompleteObjectiveReflectionsProps) => {
  const incompleteReflections = progressPost?.incomplete_reflections || {};
  const incompleteObjectives = objectives.filter(obj => !obj.is_completed);
  
  // Only show if there are saved reflections
  const hasReflections = Object.keys(incompleteReflections).some(
    key => incompleteReflections[key]?.trim()
  );

  if (!hasReflections || incompleteObjectives.length === 0) {
    return null;
  }

  return (
    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-orange-400" />
        <h3 className="text-white font-medium">Reflections on Missed Objectives</h3>
      </div>
      
      <div className="space-y-3">
        {incompleteObjectives.map((objective) => {
          const reflection = incompleteReflections[objective.id];
          if (!reflection?.trim()) return null;
          
          return (
            <div key={objective.id} className="bg-white/5 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-orange-400/60 bg-transparent mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-2">{objective.text}</h4>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-orange-200 text-sm italic">"{reflection}"</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};