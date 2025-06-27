
import { CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle } from "lucide-react";

interface WeeklyProgressHeaderProps {
  weekRange: string;
  weekNumber: number;
  isWeekCompleted: boolean;
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
}

export const WeeklyProgressHeader = ({
  weekRange,
  weekNumber,
  isWeekCompleted,
  completedCount,
  totalCount,
  completionPercentage,
}: WeeklyProgressHeaderProps) => {
  return (
    <div className="text-center">
      <CardTitle className="text-white text-2xl">Weekly Progress</CardTitle>
      <div className="flex items-center justify-center gap-2 text-white/80 mt-2">
        <Calendar className="h-4 w-4" />
        <span>{weekRange}</span>
      </div>
      {isWeekCompleted && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-green-400 text-sm font-medium">Week {weekNumber} Completed</span>
        </div>
      )}
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
  );
};
