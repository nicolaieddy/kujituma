import { useState, useMemo } from "react";
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
import { ChevronLeft, ChevronRight, Check, CalendarCheck } from "lucide-react";
import { HabitCompletionsService } from "@/services/habitCompletionsService";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface MonthlyHabitCalendarProps {
  habitId: string;
  goalId: string;
  frequency: string;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const MonthlyHabitCalendar = ({ habitId, goalId, frequency }: MonthlyHabitCalendarProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Memoize month boundaries
  const { monthStart, monthEnd, monthKey } = useMemo(() => ({
    monthStart: startOfMonth(currentMonth),
    monthEnd: endOfMonth(currentMonth),
    monthKey: format(currentMonth, 'yyyy-MM')
  }), [currentMonth]);

  // Fetch completions for the current month with stale time
  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['habit-monthly-completions', habitId, monthKey],
    queryFn: async () => {
      const allCompletions = await HabitCompletionsService.getHabitItemCompletions(habitId);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      return allCompletions.filter(c => c.completion_date >= monthStartStr && c.completion_date <= monthEndStr);
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
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

  const daysInMonth = useMemo(() => 
    eachDayOfInterval({ start: monthStart, end: monthEnd }), 
    [monthStart, monthEnd]
  );

  // Calculate padding for the first week (Monday = 0, Sunday = 6)
  const paddingDays = useMemo(() => {
    const firstDayOfWeek = getDay(monthStart);
    return firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  }, [monthStart]);

  const completionSet = useMemo(() => 
    new Set(completions.map(c => c.completion_date)), 
    [completions]
  );

  const isCompleted = (date: Date) => completionSet.has(format(date, 'yyyy-MM-dd'));

  const handleDayClick = (date: Date) => {
    if (isFuture(date) && !isToday(date)) return;
    toggleMutation.mutate(date);
  };

  const completedCount = completions.length;
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <div className="space-y-2 p-2 bg-muted/30 rounded-lg">
      {/* Header with explanation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>Tap days to log completions</span>
      </div>

      {/* Month navigation - compact */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-6 w-6 p-0"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">
            {format(currentMonth, 'MMM yyyy')}
          </span>
          {completedCount > 0 && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              {completedCount}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={isCurrentMonth}
          className="h-6 w-6 p-0"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Weekday headers - super compact */}
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((day, i) => (
          <div key={i} className="text-center text-[9px] text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - compact */}
      <div className="grid grid-cols-7 gap-0.5">
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
                "aspect-square rounded text-[10px] font-medium transition-all relative",
                "flex items-center justify-center",
                "hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/50",
                today && "ring-1 ring-emerald-400/50",
                completed && "bg-emerald-500 text-white hover:bg-emerald-600",
                !completed && !future && "bg-background text-foreground",
                future && "opacity-30 cursor-not-allowed bg-transparent text-muted-foreground",
                isLogging && "opacity-50"
              )}
            >
              {completed ? (
                <Check className="h-2.5 w-2.5" />
              ) : (
                format(date, 'd')
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
