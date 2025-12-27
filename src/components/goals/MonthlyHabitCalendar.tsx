import { useState } from "react";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isToday, 
  isFuture,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
  isSameDay
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { HabitCompletionsService } from "@/services/habitCompletionsService";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface MonthlyHabitCalendarProps {
  habitId: string;
  goalId: string;
  frequency: string;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthlyHabitCalendar = ({ habitId, goalId, frequency }: MonthlyHabitCalendarProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch completions for the current month
  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['habit-monthly-completions', habitId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const allCompletions = await HabitCompletionsService.getHabitItemCompletions(habitId);
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      return allCompletions.filter(c => c.completion_date >= monthStart && c.completion_date <= monthEnd);
    },
    enabled: !!user,
  });

  // Toggle completion mutation
  const toggleMutation = useMutation({
    mutationFn: async (date: Date) => {
      if (!user) throw new Error('Not authenticated');
      return await HabitCompletionsService.toggleCompletion(goalId, habitId, date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-monthly-completions', habitId] });
      queryClient.invalidateQueries({ queryKey: ['habit-stats-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['habit-completions'] });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate padding for the first week (Monday = 0, Sunday = 6)
  const firstDayOfWeek = getDay(monthStart);
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const isCompleted = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return completions.some(c => c.completion_date === dateStr);
  };

  const handleDayClick = (date: Date) => {
    if (isFuture(date) && !isToday(date)) return;
    toggleMutation.mutate(date);
  };

  const completedCount = completions.length;
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          {completedCount > 0 && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {completedCount} {completedCount === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={isCurrentMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map(day => (
          <div key={day} className="text-center text-[10px] text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for days before month start */}
        {Array.from({ length: paddingDays }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}

        {/* Days of month */}
        {daysInMonth.map((date) => {
          const completed = isCompleted(date);
          const today = isToday(date);
          const future = isFuture(date) && !today;
          const isLogging = toggleMutation.isPending && 
            toggleMutation.variables && 
            isSameDay(toggleMutation.variables, date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDayClick(date)}
              disabled={future || isLogging}
              className={cn(
                "aspect-square rounded-md text-xs font-medium transition-all relative",
                "flex items-center justify-center",
                "hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50",
                today && "ring-2 ring-emerald-400/50",
                completed && "bg-emerald-500 text-white hover:bg-emerald-600",
                !completed && !future && "bg-muted/30 text-foreground",
                future && "opacity-30 cursor-not-allowed bg-transparent text-muted-foreground",
                isLogging && "opacity-50"
              )}
            >
              {completed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                format(date, 'd')
              )}
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-muted-foreground text-center">
        {frequency === 'quarterly' 
          ? "Click any day to mark completion for this quarter"
          : "Click any day to mark completion for this month"}
      </p>
    </div>
  );
};
