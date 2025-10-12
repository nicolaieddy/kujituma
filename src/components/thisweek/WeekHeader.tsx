import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

interface WeekHeaderProps {
  weekNumber: number;
  weekRange: string;
  currentWeekStart: string;
  completedCount: number;
  totalCount: number;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
}

export const WeekHeader = ({
  weekNumber,
  weekRange,
  currentWeekStart,
  completedCount,
  totalCount,
  onNavigateWeek
}: WeekHeaderProps) => {
  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onNavigateWeek && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateWeek('previous')}
                  className="px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateWeek('next')}
                  className="px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div>
              <CardTitle className="text-white text-2xl">
                Week {weekNumber}
              </CardTitle>
              <p className="text-white/60 mt-1">{weekRange}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-white/60" />
            {totalCount > 0 && (
              <div className="text-white/80 text-sm">
                {completedCount}/{totalCount} completed
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};