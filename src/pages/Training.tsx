import { useMemo, useState } from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { Dumbbell, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingPlanCard } from "@/components/thisweek/TrainingPlanCard";

function toWeekKey(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function Training() {
  const todayWeek = useMemo(() => toWeekKey(new Date()), []);
  const [weekStart, setWeekStart] = useState<string>(todayWeek);

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Training Plan</h1>
        </div>
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
      </header>

      <TrainingPlanCard weekStart={weekStart} isReadOnly={!isCurrent && !isFuture} />
    </div>
  );
}
