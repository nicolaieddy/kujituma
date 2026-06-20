import { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { AlertTriangle, Trophy, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { type TrainingEvent, type TrainingEventType } from "@/hooks/useTrainingEvents";
import { parseLocalDate } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import { ISSUE_CATEGORY_META, SEVERITY_LABELS, formatBodyParts } from "@/lib/bodyParts";

const TYPE_META: Record<TrainingEventType, { label: string; icon: typeof AlertTriangle; color: string; dotColor: string }> = {
  injury_illness: {
    label: "Injury / Illness",
    icon: AlertTriangle,
    color: "text-destructive",
    dotColor: "bg-destructive",
  },
  race: {
    label: "Race",
    icon: Trophy,
    color: "text-amber-500",
    dotColor: "bg-amber-500",
  },
  other: {
    label: "Other",
    icon: Flag,
    color: "text-primary",
    dotColor: "bg-primary",
  },
};

function YearHeader({ year }: { year: number }) {
  return (
    <div className="relative flex items-center gap-4 py-4">
      <div className="w-20 text-right">
        <span className="text-lg font-bold text-foreground">{year}</span>
      </div>
      <div className="relative flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-muted-foreground ring-4 ring-background" />
      </div>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

function TimelineEventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: TrainingEvent;
  onEdit: (e: TrainingEvent) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[event.event_type];
  const Icon = meta.icon;
  const start = parseLocalDate(event.start_date);
  const end = event.end_date ? parseLocalDate(event.end_date) : null;
  const hasRange = end && differenceInDays(end, start) > 0;

  const dateLabel = end
    ? `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`
    : format(start, "d MMM yyyy");

  const durationDays = end ? differenceInDays(end, start) + 1 : null;

  return (
    <div id={`event-${event.id}`} className="relative flex items-start gap-4 group scroll-mt-24">
      {/* Date column */}
      <div className="w-20 shrink-0 text-right pt-1">
        <div className="text-xs font-medium text-foreground">{format(start, "d MMM")}</div>
        {hasRange && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {durationDays} days
          </div>
        )}
      </div>

      {/* Timeline spine + dot */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className={cn("w-3 h-3 rounded-full ring-4 ring-background z-10", meta.dotColor)} />
        {/* Vertical line continues below */}
        <div className="w-px flex-1 bg-border min-h-[16px]" />
      </div>

      {/* Event card */}
      <Card className="flex-1 p-4 mb-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
              <h3 className="font-semibold text-sm">{event.title}</h3>
              <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
              {event.race_priority && (
                <Badge variant="outline" className="text-[10px]">Priority {event.race_priority}</Badge>
              )}
              {event.issue_category && (
                <Badge variant="outline" className="text-[10px]">
                  {ISSUE_CATEGORY_META[event.issue_category].label}
                </Badge>
              )}
              {event.severity && (
                <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
                  Sev {event.severity}/5 · {SEVERITY_LABELS[event.severity].short}
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground tabular-nums mb-2">{dateLabel}</div>

            {event.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
              {event.body_parts && event.body_parts.length > 0 ? (
                <span>Body parts: {formatBodyParts(event.body_parts)}</span>
              ) : event.body_part ? (
                <span>Body part: {event.body_part}</span>
              ) : null}
              {event.race_distance && <span>Distance: {event.race_distance}</span>}
              {event.race_result && <span className="font-medium text-foreground">Result: {event.race_result}</span>}
              {event.location && <span>Location: {event.location}</span>}
            </div>
          </div>

          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(event)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(event.id)} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface TrainingEventsTimelineProps {
  events: TrainingEvent[];
  onEdit: (e: TrainingEvent) => void;
  onDelete: (id: string) => void;
}

export function TrainingEventsTimeline({ events, onEdit, onDelete }: TrainingEventsTimelineProps) {
  const grouped = useMemo(() => {
    const sorted = [...events].sort((a, b) => b.start_date.localeCompare(a.start_date));
    const byYear: Record<number, TrainingEvent[]> = {};
    for (const e of sorted) {
      const year = parseLocalDate(e.start_date).getFullYear();
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(e);
    }
    return byYear;
  }, [events]);

  const years = useMemo(() => Object.keys(grouped).map(Number).sort((a, b) => b - a), [grouped]);

  return (
    <div className="space-y-2">
      {years.map((year) => (
        <div key={year}>
          <YearHeader year={year} />
          <div className="space-y-0">
            {grouped[year].map((event) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
