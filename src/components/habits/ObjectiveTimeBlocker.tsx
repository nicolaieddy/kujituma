import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Clock, CalendarIcon, AlertTriangle } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday, isTomorrow, isSameWeek, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { DayContentProps } from "react-day-picker";
import { WeeklyObjective } from "@/types/weeklyProgress";

interface ObjectiveTimeBlockerProps {
  scheduledDay?: string | null;
  scheduledTime?: string | null;
  onUpdate: (day: string | null, time: string | null) => void;
  disabled?: boolean;
  currentWeekStart: string;
  onMoveToWeek?: (newWeekStart: string, scheduledDay: string) => void;
  allObjectives?: WeeklyObjective[];
}

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const DAY_MAP: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 0,
};

const REVERSE_DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export const ObjectiveTimeBlocker = ({
  scheduledDay,
  scheduledTime,
  onUpdate,
  disabled = false,
  currentWeekStart,
  onMoveToWeek,
  allObjectives = [],
}: ObjectiveTimeBlockerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localTime, setLocalTime] = useState(scheduledTime || '');
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [pendingMoveDate, setPendingMoveDate] = useState<Date | null>(null);
  
  // Build a map of dates to objective counts for the current week
  const objectiveCountsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    
    if (!currentWeekStart) return counts;
    
    const weekStart = parseISO(currentWeekStart);
    
    allObjectives.forEach(obj => {
      if (obj.scheduled_day) {
        const dayIndex = DAY_MAP[obj.scheduled_day.toLowerCase()];
        if (dayIndex !== undefined) {
          const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
          const date = addDays(weekStart, adjustedIndex);
          const dateKey = format(date, 'yyyy-MM-dd');
          counts[dateKey] = (counts[dateKey] || 0) + 1;
        }
      }
    });
    
    return counts;
  }, [allObjectives, currentWeekStart]);
  
  // Convert scheduledDay to actual date based on currentWeekStart
  const getDateFromDay = (day: string | null | undefined): Date | undefined => {
    if (!day || !currentWeekStart) return undefined;
    const weekStart = parseISO(currentWeekStart);
    const dayIndex = DAY_MAP[day.toLowerCase()];
    if (dayIndex === undefined) return undefined;
    
    // Adjust for week starting on Monday
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return addDays(weekStart, adjustedIndex);
  };
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(getDateFromDay(scheduledDay));
  
  // Custom day content to show objective counts
  const CustomDayContent = ({ date, displayMonth }: DayContentProps) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const count = objectiveCountsByDate[dateKey] || 0;
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        {count > 0 && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
            {count <= 3 ? (
              // Show dots for 1-3 objectives
              Array.from({ length: count }).map((_, i) => (
                <span 
                  key={i} 
                  className="w-1 h-1 rounded-full bg-primary/70"
                />
              ))
            ) : (
              // Show number for 4+ objectives
              <span className="text-[8px] font-medium text-primary leading-none">
                {count}
              </span>
            )}
          </span>
        )}
      </div>
    );
  };
  
  // Format the display label intelligently
  const formatDateLabel = (date: Date | undefined): string | null => {
    if (!date) return null;
    
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    
    // If it's within the current week, just show the day name
    const weekStart = parseISO(currentWeekStart);
    if (isSameWeek(date, weekStart, { weekStartsOn: 1 })) {
      return format(date, 'EEEE');
    }
    
    // Otherwise show the date
    return format(date, 'MMM d');
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onUpdate(null, localTime || null);
      return;
    }
    
    const weekStart = parseISO(currentWeekStart);
    
    // Check if selected date is in the current week
    if (isSameWeek(date, weekStart, { weekStartsOn: 1 })) {
      // Same week - just update the day
      setSelectedDate(date);
      const dayOfWeek = date.getDay();
      const dayName = REVERSE_DAY_MAP[dayOfWeek];
      onUpdate(dayName, localTime || null);
    } else {
      // Different week - show confirmation dialog
      setPendingMoveDate(date);
      setShowMoveConfirmation(true);
    }
  };
  
  const handleConfirmMove = () => {
    if (!pendingMoveDate || !onMoveToWeek) return;
    
    const newWeekStart = startOfWeek(pendingMoveDate, { weekStartsOn: 1 });
    const dayOfWeek = pendingMoveDate.getDay();
    const dayName = REVERSE_DAY_MAP[dayOfWeek];
    
    // Move to the new week with the scheduled day
    onMoveToWeek(format(newWeekStart, 'yyyy-MM-dd'), dayName);
    
    setSelectedDate(pendingMoveDate);
    setShowMoveConfirmation(false);
    setPendingMoveDate(null);
    setIsOpen(false);
  };
  
  const handleCancelMove = () => {
    setShowMoveConfirmation(false);
    setPendingMoveDate(null);
  };
  
  const handleSave = () => {
    if (selectedDate) {
      const dayOfWeek = selectedDate.getDay();
      const dayName = REVERSE_DAY_MAP[dayOfWeek];
      onUpdate(dayName, localTime || null);
    } else {
      onUpdate(null, localTime || null);
    }
    setIsOpen(false);
  };
  
  const handleClear = () => {
    setSelectedDate(undefined);
    setLocalTime('');
    onUpdate(null, null);
    setIsOpen(false);
  };
  
  const formatDisplay = () => {
    const dateLabel = formatDateLabel(selectedDate);
    const timeLabel = scheduledTime?.slice(0, 5);
    
    if (dateLabel && timeLabel) return `${dateLabel} @ ${timeLabel}`;
    if (dateLabel) return dateLabel;
    if (timeLabel) return timeLabel;
    return null;
  };
  
  const display = formatDisplay();
  
  // Calculate the week range for the pending move
  const getPendingWeekRange = () => {
    if (!pendingMoveDate) return '';
    const weekStart = startOfWeek(pendingMoveDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  };
  
  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className={`h-6 px-2 text-xs ${
              display 
                ? 'text-primary hover:text-primary bg-primary/10 hover:bg-primary/20' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3 w-3 mr-1" />
            {display || 'Schedule'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                Date (optional)
              </Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className={cn("rounded-md border pointer-events-auto")}
                components={{
                  DayContent: CustomDayContent,
                }}
                initialFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time (optional)
              </Label>
              <Select value={localTime} onValueChange={setLocalTime}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select time..." />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(time => (
                    <SelectItem key={time} value={time} className="text-xs">
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button 
                size="sm" 
                className="flex-1 text-xs"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <AlertDialog open={showMoveConfirmation} onOpenChange={setShowMoveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Move to Different Week?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You're about to reschedule this objective to <strong>{pendingMoveDate && format(pendingMoveDate, 'EEEE, MMM d')}</strong> (Week of {getPendingWeekRange()}).
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                This objective will be marked as <strong>"Incomplete - Moved"</strong> in the current week, 
                indicating it was rescheduled rather than completed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelMove}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>
              Move to Next Week
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
