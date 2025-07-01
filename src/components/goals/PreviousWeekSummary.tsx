
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, Calendar } from "lucide-react";

interface PreviousWeekSummaryProps {
  currentWeekStart: string;
}

export const PreviousWeekSummary = ({ currentWeekStart }: PreviousWeekSummaryProps) => {
  // Calculate previous week start
  const previousWeekDate = new Date(currentWeekStart + 'T00:00:00.000Z');
  previousWeekDate.setUTCDate(previousWeekDate.getUTCDate() - 7);
  const previousWeekStart = WeeklyProgressService.getWeekStart(previousWeekDate);
  
  const { objectives: previousObjectives } = useWeeklyProgress(previousWeekStart);
  
  if (previousObjectives.length === 0) {
    return null;
  }

  const completedCount = previousObjectives.filter(obj => obj.is_completed).length;
  const totalCount = previousObjectives.length;
  const previousWeekRange = WeeklyProgressService.formatWeekRange(previousWeekStart);

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-white/80 text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Previous Week Summary ({previousWeekRange})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-white/10 backdrop-blur-lg rounded-full h-1.5 w-24">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%` }}
            />
          </div>
          <span className="text-white/60 text-xs">
            {completedCount}/{totalCount} completed
          </span>
        </div>
        
        <div className="space-y-1">
          {previousObjectives.slice(0, 3).map((objective) => (
            <div key={objective.id} className="flex items-center gap-2 text-xs">
              {objective.is_completed ? (
                <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
              ) : (
                <Circle className="h-3 w-3 text-white/40 flex-shrink-0" />
              )}
              <span className={`truncate ${objective.is_completed ? 'text-white/70' : 'text-white/50'}`}>
                {objective.text}
              </span>
            </div>
          ))}
          {previousObjectives.length > 3 && (
            <div className="text-white/40 text-xs ml-5">
              +{previousObjectives.length - 3} more objectives
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
