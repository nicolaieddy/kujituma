import { useMemo, useState } from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { Dumbbell, ChevronLeft, ChevronRight, Settings, Flag, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingPlanCard } from "@/components/thisweek/TrainingPlanCard";
import { TrainingSetupPanel } from "@/components/training/TrainingSetupPanel";
import { TrainingEventsPanel } from "@/components/training/TrainingEventsPanel";
import { WeeklyRunningChart } from "@/components/training/WeeklyRunningChart";

function toWeekKey(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

type TrainingView = "plan" | "events" | "trends" | "setup";

export default function Training() {
  const todayWeek = useMemo(() => toWeekKey(new Date()), []);
  const [weekStart, setWeekStart] = useState<string>(todayWeek);
  const [view, setView] = useState<TrainingView>(() => {
    if (typeof window === "undefined") return "plan";
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "setup") return "setup";
    if (v === "events") return "events";
    if (v === "trends") return "trends";
    return "plan";
  });

  const shiftWeek = (delta: number) => {
    const [y, m, d] = weekStart.split("-").map(Number);
    setWeekStart(toWeekKey(addWeeks(new Date(y, m - 1, d), delta)));
  };

  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = addWeeks(start, 1);
  end.setDate(end.getDate() - 1);
  const label = `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;

  const isCurrent = weekStart === todayWeek;
  const isFuture = weekStart > todayWeek;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Training</h1>
        </div>

        {view === "plan" ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shiftWeek(-1)} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isCurrent ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setWeekStart(todayWeek)}
              className="min-w-[180px] tabular-nums"
            >
              {label}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => shiftWeek(1)} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : <div />}
      </header>

      {/* View switcher */}
      <div className="flex gap-2 bg-muted rounded-lg p-1 w-fit">
        {([
          { id: "plan", label: "Plan", icon: Dumbbell },
          { id: "events", label: "Events", icon: Flag },
          { id: "setup", label: "Setup", icon: Settings },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {view === "plan" && <TrainingPlanCard weekStart={weekStart} isReadOnly={!isCurrent && !isFuture} />}
      {view === "events" && <TrainingEventsPanel />}
      {view === "setup" && <TrainingSetupPanel />}
    </div>
  );
}
