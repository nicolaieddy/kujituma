import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { CalEvent, EVENT_STYLES } from "./types";
import {
  Cake,
  CalendarCheck,
  Star,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const ICON_MAP = { Cake, CalendarCheck, Star } as const;

interface CalendarGridProps {
  currentDate: Date;
  selectedDay: Date | null;
  events: CalEvent[];
  view: "month" | "week" | "day";
  onSelectDay: (day: Date) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EventChip = ({ event }: { event: CalEvent }) => {
  const style = EVENT_STYLES[event.type];
  const Icon = ICON_MAP[style.icon];

  return (
    <Link
      to={`/network/contacts/${event.contactId}`}
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all hover:shadow-sm truncate ${
        event.messageSent
          ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
          : style.badge
      } ${event.isOverdue ? "ring-1 ring-destructive/40" : ""}`}
    >
      {event.messageSent ? (
        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
      ) : event.isOverdue ? (
        <AlertTriangle className="h-3 w-3 flex-shrink-0 text-destructive" />
      ) : (
        <Icon className={`h-3 w-3 flex-shrink-0 ${style.sidebarIcon}`} />
      )}
      <span className="truncate">
        {event.type === "custom_event" ? event.detail : event.contactName}
      </span>
    </Link>
  );
};

const CalendarGrid = ({
  currentDate,
  selectedDay,
  events,
  view,
  onSelectDay,
}: CalendarGridProps) => {
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    events.forEach((e) => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  // Generate days based on view
  const days = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      const result: Date[] = [];
      let d = gridStart;
      while (d <= gridEnd) {
        result.push(d);
        d = addDays(d, 1);
      }
      return result;
    } else if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else {
      return [startOfDay(currentDate)];
    }
  }, [currentDate, view]);

  const weeks = useMemo(() => {
    if (view !== "month") return [days];
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days, view]);

  const isWeekOrDay = view === "week" || view === "day";
  const maxEvents = isWeekOrDay ? 10 : 3;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Weekday header */}
      <div
        className={`grid border-b border-border bg-muted/20 ${
          view === "day" ? "grid-cols-1" : "grid-cols-7"
        }`}
      >
        {(view === "day" ? [WEEKDAYS[days[0]?.getDay() === 0 ? 6 : days[0]?.getDay() - 1]] : WEEKDAYS).map(
          (day) => (
            <div
              key={day}
              className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          )
        )}
      </div>

      {/* Grid */}
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className={`grid border-b border-border last:border-b-0 ${
            view === "day" ? "grid-cols-1" : "grid-cols-7"
          }`}
        >
          {week.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate.get(dateStr) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isTodayDate = isToday(day);
            const remaining = dayEvents.length - maxEvents;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDay(day)}
                className={`group relative cursor-pointer border-r border-border last:border-r-0 transition-colors ${
                  isWeekOrDay ? "min-h-[320px]" : "min-h-[140px]"
                } ${
                  isSelected
                    ? "bg-accent/50"
                    : isTodayDate
                    ? "bg-primary/[0.04]"
                    : isCurrentMonth
                    ? "bg-card hover:bg-accent/20"
                    : "bg-muted/10 hover:bg-muted/20"
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isTodayDate
                        ? "bg-primary text-primary-foreground font-bold"
                        : isSelected
                        ? "bg-foreground/10 font-semibold text-foreground"
                        : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Events */}
                <div className="space-y-0.5 px-1.5 pb-2">
                  {dayEvents.slice(0, maxEvents).map((event, ei) => (
                    <EventChip key={ei} event={event} />
                  ))}
                  {remaining > 0 && (
                    <div className="px-2 text-[10px] font-medium text-muted-foreground">
                      +{remaining} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CalendarGrid;
