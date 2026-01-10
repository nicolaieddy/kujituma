import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { CustomSchedule } from "@/types/goals";

// Re-export the type for backward compatibility
export type { CustomSchedule };

interface CustomRecurrencePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: CustomSchedule) => void;
  initialSchedule?: CustomSchedule;
}

const DAYS = [
  { label: 'S', fullLabel: 'Sunday', value: 0 },
  { label: 'M', fullLabel: 'Monday', value: 1 },
  { label: 'T', fullLabel: 'Tuesday', value: 2 },
  { label: 'W', fullLabel: 'Wednesday', value: 3 },
  { label: 'T', fullLabel: 'Thursday', value: 4 },
  { label: 'F', fullLabel: 'Friday', value: 5 },
  { label: 'S', fullLabel: 'Saturday', value: 6 },
];

const MONTH_WEEK_OPTIONS = [
  { value: 'first', label: 'First week' },
  { value: 'second', label: 'Second week' },
  { value: 'third', label: 'Third week' },
  { value: 'fourth', label: 'Fourth week' },
  { value: 'last', label: 'Last week' },
];

const TIMES_PER_WEEK_OPTIONS = [
  { value: 1, label: '1 time per week' },
  { value: 2, label: '2 times per week' },
  { value: 3, label: '3 times per week' },
  { value: 4, label: '4 times per week' },
  { value: 5, label: '5 times per week' },
  { value: 6, label: '6 times per week' },
];

type WeeklyMode = 'specific-days' | 'times-per-week';

export const CustomRecurrencePicker = ({
  isOpen,
  onClose,
  onSave,
  initialSchedule,
}: CustomRecurrencePickerProps) => {
  const [interval, setInterval] = useState(initialSchedule?.interval || 1);
  const [unit, setUnit] = useState<'day' | 'week' | 'month' | 'year'>(initialSchedule?.unit || 'week');
  const [selectedDays, setSelectedDays] = useState<number[]>(initialSchedule?.daysOfWeek || [1]); // Default Monday
  const [monthWeek, setMonthWeek] = useState<'first' | 'second' | 'third' | 'fourth' | 'last'>(
    initialSchedule?.monthWeek || 'last'
  );
  const [useMonthWeek, setUseMonthWeek] = useState(!!initialSchedule?.monthWeek);
  
  // New state for "times per week" mode
  const [weeklyMode, setWeeklyMode] = useState<WeeklyMode>(
    initialSchedule?.timesPerWeek ? 'times-per-week' : 'specific-days'
  );
  const [timesPerWeek, setTimesPerWeek] = useState(initialSchedule?.timesPerWeek || 2);

  useEffect(() => {
    if (initialSchedule) {
      setInterval(initialSchedule.interval);
      setUnit(initialSchedule.unit);
      setSelectedDays(initialSchedule.daysOfWeek || [1]);
      setMonthWeek(initialSchedule.monthWeek || 'last');
      setUseMonthWeek(!!initialSchedule.monthWeek);
      setWeeklyMode(initialSchedule.timesPerWeek ? 'times-per-week' : 'specific-days');
      setTimesPerWeek(initialSchedule.timesPerWeek || 2);
    } else {
      setInterval(1);
      setUnit('week');
      setSelectedDays([1]);
      setMonthWeek('last');
      setUseMonthWeek(false);
      setWeeklyMode('specific-days');
      setTimesPerWeek(2);
    }
  }, [initialSchedule, isOpen]);

  const toggleDay = (dayValue: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayValue)) {
        // Don't allow deselecting if it's the last selected day
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== dayValue);
      }
      return [...prev, dayValue].sort((a, b) => a - b);
    });
  };

  const handleSave = () => {
    const schedule: CustomSchedule = {
      interval,
      unit,
    };

    if (unit === 'week') {
      if (weeklyMode === 'times-per-week') {
        schedule.timesPerWeek = timesPerWeek;
      } else {
        schedule.daysOfWeek = selectedDays;
      }
    }

    if (unit === 'month' && useMonthWeek) {
      schedule.monthWeek = monthWeek;
    }

    onSave(schedule);
    onClose();
  };

  const getUnitLabel = (u: string, count: number) => {
    const labels = {
      day: count === 1 ? 'day' : 'days',
      week: count === 1 ? 'week' : 'weeks',
      month: count === 1 ? 'month' : 'months',
      year: count === 1 ? 'year' : 'years',
    };
    return labels[u as keyof typeof labels] || u;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-background border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Custom recurrence</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Repeat every */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground min-w-[85px]">Repeat every</span>
            <Input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center"
            />
            <Select value={unit} onValueChange={(v: 'day' | 'week' | 'month' | 'year') => setUnit(v)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="day">{getUnitLabel('day', interval)}</SelectItem>
                <SelectItem value="week">{getUnitLabel('week', interval)}</SelectItem>
                <SelectItem value="month">{getUnitLabel('month', interval)}</SelectItem>
                <SelectItem value="year">{getUnitLabel('year', interval)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weekly options - mode selection */}
          {unit === 'week' && (
            <div className="space-y-4">
              <RadioGroup
                value={weeklyMode}
                onValueChange={(v) => setWeeklyMode(v as WeeklyMode)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific-days" id="specific-days" />
                  <Label htmlFor="specific-days" className="text-sm font-normal cursor-pointer">
                    On specific days
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="times-per-week" id="times-per-week" />
                  <Label htmlFor="times-per-week" className="text-sm font-normal cursor-pointer">
                    A number of times per week (flexible days)
                  </Label>
                </div>
              </RadioGroup>

              {/* Specific days picker */}
              {weeklyMode === 'specific-days' && (
                <div className="space-y-3 pl-6">
                  <span className="text-sm text-muted-foreground">Repeat on</span>
                  <div className="flex gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        title={day.fullLabel}
                        className={cn(
                          "w-9 h-9 rounded-full text-sm font-medium transition-all",
                          selectedDays.includes(day.value)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Times per week picker */}
              {weeklyMode === 'times-per-week' && (
                <div className="space-y-3 pl-6">
                  <span className="text-sm text-muted-foreground">How many times?</span>
                  <Select 
                    value={timesPerWeek.toString()} 
                    onValueChange={(v) => setTimesPerWeek(parseInt(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border">
                      {TIMES_PER_WEEK_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Complete this habit {timesPerWeek} {timesPerWeek === 1 ? 'time' : 'times'} each week, on any days you choose.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Monthly on specific week - only show for monthly */}
          {unit === 'month' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useMonthWeek"
                  checked={useMonthWeek}
                  onChange={(e) => setUseMonthWeek(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="useMonthWeek" className="text-sm text-foreground">
                  On specific week of month
                </label>
              </div>
              {useMonthWeek && (
                <Select value={monthWeek} onValueChange={(v: 'first' | 'second' | 'third' | 'fourth' | 'last') => setMonthWeek(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border">
                    {MONTH_WEEK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gradient-primary">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to format custom schedule for display
export const formatCustomSchedule = (schedule: CustomSchedule): string => {
  const { interval, unit, daysOfWeek, monthWeek, timesPerWeek } = schedule;
  
  if (unit === 'day') {
    return interval === 1 ? 'Daily' : `Every ${interval} days`;
  }
  
  if (unit === 'year') {
    return interval === 1 ? 'Annually' : `Every ${interval} years`;
  }
  
  if (unit === 'month') {
    const weekLabel = monthWeek ? {
      first: 'first week',
      second: 'second week', 
      third: 'third week',
      fourth: 'fourth week',
      last: 'last week'
    }[monthWeek] : '';
    
    if (interval === 1) {
      return weekLabel ? `Monthly (${weekLabel})` : 'Monthly';
    }
    return weekLabel ? `Every ${interval} months (${weekLabel})` : `Every ${interval} months`;
  }
  
  // Weekly
  if (unit === 'week') {
    // Handle "times per week" mode
    if (timesPerWeek) {
      if (interval === 1) {
        return `${timesPerWeek}x per week`;
      }
      return `${timesPerWeek}x every ${interval} weeks`;
    }

    // Handle specific days mode
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = daysOfWeek?.map(d => dayNames[d]).join(', ') || '';
    
    if (interval === 1) {
      if (daysOfWeek?.length === 7) return 'Daily';
      if (daysOfWeek?.length === 5 && 
          daysOfWeek.every(d => d >= 1 && d <= 5)) return 'Weekdays';
      return days ? `Weekly on ${days}` : 'Weekly';
    }
    return days ? `Every ${interval} weeks on ${days}` : `Every ${interval} weeks`;
  }
  
  return 'Custom';
};
