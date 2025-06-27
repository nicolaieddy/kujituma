
import { Calendar } from "lucide-react";

interface WeeklyProgressHeaderProps {
  weekRange: string;
  completedCount: number;
  totalCount: number;
}

export const WeeklyProgressHeader = ({ 
  weekRange, 
  completedCount, 
  totalCount 
}: WeeklyProgressHeaderProps) => {
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
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
  );
};
