
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

interface WeeklyProgressHeaderProps {
  weekRange: string;
  weekNumber: number;
  isWeekCompleted: boolean;
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export const WeeklyProgressHeader = ({
  weekRange,
  weekNumber,
  isWeekCompleted,
  completedCount,
  totalCount,
  completionPercentage,
  onPreviousWeek,
  onNextWeek,
}: WeeklyProgressHeaderProps) => {
  
  const handlePreviousClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Previous button clicked in header');
    onPreviousWeek();
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Next button clicked in header');
    onNextWeek();
  };

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePreviousClick}
        className="text-white/60 hover:text-white hover:bg-white/20"
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
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

      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextClick}
        className="text-white/60 hover:text-white hover:bg-white/20"
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
