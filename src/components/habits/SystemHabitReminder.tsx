import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, CheckCircle2, X } from "lucide-react";
import { useSystemHabitStreaks } from "@/hooks/useSystemHabitStreaks";
import { useAuth } from "@/contexts/AuthContext";

interface SystemHabitReminderProps {
  onOpenDailyCheckIn?: () => void;
  onOpenWeeklyPlanning?: () => void;
}

export const SystemHabitReminder = ({ 
  onOpenDailyCheckIn, 
  onOpenWeeklyPlanning 
}: SystemHabitReminderProps) => {
  const { user } = useAuth();
  const streaks = useSystemHabitStreaks();
  const [dismissedDaily, setDismissedDaily] = useState(false);
  const [dismissedWeekly, setDismissedWeekly] = useState(false);

  // Reset dismissed state when the component mounts or user changes
  useEffect(() => {
    setDismissedDaily(false);
    setDismissedWeekly(false);
  }, [user?.id]);

  // Return null early if loading or no user or no streaks data
  if (streaks.isLoading || !user || !streaks.dailyCheckIn || !streaks.weeklyPlanning) {
    return null;
  }

  const { dailyCheckIn, weeklyPlanning } = streaks;

  const showDailyReminder = dailyCheckIn?.isDueToday && !dismissedDaily;
  const showWeeklyReminder = weeklyPlanning?.isDueToday && !dismissedWeekly;

  if (!showDailyReminder && !showWeeklyReminder) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showDailyReminder && (
        <Alert className="border-orange-500/30 bg-orange-500/5">
          <Bell className="h-4 w-4 text-orange-500" />
          <AlertTitle className="flex items-center justify-between">
            <span className="text-orange-600 dark:text-orange-400">Daily Check-in Due</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 -mr-2"
              onClick={() => setDismissedDaily(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-2">
            <span className="text-muted-foreground">
              {(dailyCheckIn?.currentStreak || 0) > 0 
                ? `Keep your ${dailyCheckIn?.currentStreak}-day streak going!`
                : "Start building your daily check-in habit today!"
              }
            </span>
            {onOpenDailyCheckIn && (
              <Button 
                size="sm" 
                variant="outline"
                className="ml-4 shrink-0 border-orange-500/30 hover:bg-orange-500/10"
                onClick={onOpenDailyCheckIn}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Check In
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showWeeklyReminder && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Calendar className="h-4 w-4 text-blue-500" />
          <AlertTitle className="flex items-center justify-between">
            <span className="text-blue-600 dark:text-blue-400">Weekly Planning Due</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 -mr-2"
              onClick={() => setDismissedWeekly(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-2">
            <span className="text-muted-foreground">
              {(weeklyPlanning?.currentStreak || 0) > 0 
                ? `Maintain your ${weeklyPlanning?.currentStreak}-week streak!`
                : "Plan your week for better focus and productivity!"
              }
            </span>
            {onOpenWeeklyPlanning && (
              <Button 
                size="sm" 
                variant="outline"
                className="ml-4 shrink-0 border-blue-500/30 hover:bg-blue-500/10"
                onClick={onOpenWeeklyPlanning}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Plan Week
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
