import { CalEvent } from "./types";
import { Cake, CalendarCheck, Star } from "lucide-react";

interface CalendarStatsBarProps {
  events: CalEvent[];
  periodLabel: string;
}

const CalendarStatsBar = ({ events, periodLabel }: CalendarStatsBarProps) => {
  const birthdays = events.filter((e) => e.type === "birthday").length;
  const followUps = events.filter((e) => e.type === "follow_up").length;
  const customEvents = events.filter((e) => e.type === "custom_event").length;
  const stats = [
    { label: "Total", value: events.length, icon: null, color: "text-foreground" },
    { label: "Birthdays", value: birthdays, icon: Cake, color: "text-[hsl(15,85%,60%)]" },
    { label: "Follow-ups", value: followUps, icon: CalendarCheck, color: "text-[hsl(210,70%,55%)]" },
    { label: "Events", value: customEvents, icon: Star, color: "text-[hsl(152,55%,48%)]" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground mr-3">{periodLabel}</span>
      <div className="flex items-center gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            {s.icon && <s.icon className={`h-3.5 w-3.5 ${s.color}`} />}
            <span className="text-sm font-bold">{s.value}</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarStatsBar;
