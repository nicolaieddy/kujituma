import { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Clock, CalendarIcon } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday, isTomorrow, isSameWeek, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ObjectiveTimeBlockerProps {
  scheduledDay?: string | null;
  scheduledTime?: string | null;
  onUpdate: (day: string | null, time: string | null) => void;
  disabled?: boolean;
  currentWeekStart: string;
  onMoveToWeek?: (newWeekStart: string) => void;
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
}: ObjectiveTimeBlockerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localTime, setLocalTime] = useState(scheduledTime || '');
  
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
    setSelectedDate(date);
    
    if (!date) {
      onUpdate(null, localTime || null);
      return;
    }
    
    const weekStart = parseISO(currentWeekStart);
    
    // Check if selected date is in the current week
    if (isSameWeek(date, weekStart, { weekStartsOn: 1 })) {
      // Same week - just update the day
      const dayOfWeek = date.getDay();
      const dayName = REVERSE_DAY_MAP[dayOfWeek];
      onUpdate(dayName, localTime || null);
    } else {
      // Different week - need to move the objective
      const newWeekStart = startOfWeek(date, { weekStartsOn: 1 });
      const dayOfWeek = date.getDay();
      const dayName = REVERSE_DAY_MAP[dayOfWeek];
      
      if (onMoveToWeek) {
        onMoveToWeek(format(newWeekStart, 'yyyy-MM-dd'));
        onUpdate(dayName, localTime || null);
      } else {
        // Fallback: just update the day (won't move to different week)
        onUpdate(dayName, localTime || null);
      }
    }
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
  
  return (
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
              initialFocus
            />
            {selectedDate && !isSameWeek(selectedDate, parseISO(currentWeekStart), { weekStartsOn: 1 }) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                This will move the objective to a different week
              </p>
            )}
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
  );
};
