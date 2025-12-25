import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Clock, Calendar } from "lucide-react";

interface ObjectiveTimeBlockerProps {
  scheduledDay?: string | null;
  scheduledTime?: string | null;
  onUpdate: (day: string | null, time: string | null) => void;
  disabled?: boolean;
}

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export const ObjectiveTimeBlocker = ({
  scheduledDay,
  scheduledTime,
  onUpdate,
  disabled = false,
}: ObjectiveTimeBlockerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localDay, setLocalDay] = useState(scheduledDay || '');
  const [localTime, setLocalTime] = useState(scheduledTime || '');
  
  const handleSave = () => {
    onUpdate(
      localDay || null,
      localTime || null
    );
    setIsOpen(false);
  };
  
  const handleClear = () => {
    setLocalDay('');
    setLocalTime('');
    onUpdate(null, null);
    setIsOpen(false);
  };
  
  const formatDisplay = () => {
    if (!scheduledDay && !scheduledTime) return null;
    
    const dayLabel = DAYS.find(d => d.value === scheduledDay)?.label;
    const timeLabel = scheduledTime?.slice(0, 5);
    
    if (dayLabel && timeLabel) return `${dayLabel} @ ${timeLabel}`;
    if (dayLabel) return dayLabel;
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
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Day (optional)
            </Label>
            <Select value={localDay} onValueChange={setLocalDay}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select day..." />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map(day => (
                  <SelectItem key={day.value} value={day.value} className="text-xs">
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
