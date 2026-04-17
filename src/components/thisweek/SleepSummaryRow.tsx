import { Moon } from "lucide-react";
import type { SleepEntry } from "@/hooks/useWeekSleepEntries";
import { cn } from "@/lib/utils";

interface SleepSummaryRowProps {
  entry: SleepEntry;
  className?: string;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatTime(t: string | null): string | null {
  if (!t) return null;
  // Postgres time comes back as "HH:MM:SS"
  const m = t.match(/^(\d{2}):(\d{2})/);
  if (!m) return t;
  let hour = parseInt(m[1], 10);
  const minute = m[2];
  const meridian = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${meridian}`;
}

export function SleepSummaryRow({ entry, className }: SleepSummaryRowProps) {
  const duration = formatDuration(entry.duration_seconds);
  const bed = formatTime(entry.bedtime);
  const wake = formatTime(entry.wake_time);

  const parts: string[] = [];
  if (duration) parts.push(duration);
  if (entry.score != null) {
    parts.push(`Score ${entry.score}${entry.quality ? ` (${entry.quality})` : ""}`);
  } else if (entry.quality) {
    parts.push(entry.quality);
  }
  if (entry.resting_heart_rate != null) parts.push(`RHR ${entry.resting_heart_rate}`);
  if (entry.body_battery != null) parts.push(`Body Battery ${entry.body_battery}`);
  if (bed && wake) parts.push(`${bed} → ${wake}`);

  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Moon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/70" />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/40">•</span>}
            <span>{p}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
