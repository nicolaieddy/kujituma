import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw, TrendingUp } from "lucide-react";

export type NavGranularity = "week" | "month" | "year";

interface MiniPoint {
  /** sortable ISO key for the month (YYYY-MM) */
  key: string;
  km: number;
  /** start of the month */
  date: Date;
}

interface Props {
  granularity: NavGranularity;
  /** Window size in buckets (or 0 for "All"). YTD is handled upstream. */
  windowSize: number;
  /** Currently selected window-end anchor (null = latest). */
  anchorEnd: Date | null;
  /** Earliest data point we have, used to clamp panning. */
  minDate: Date | null;
  /** Latest data point we have (used as "latest"). */
  maxDate: Date | null;
  /** Months of data (all-time) for the scrubber strip. */
  miniSeries: MiniPoint[];
  /** Peak bucket label + date (for the "Peak" jump). */
  peakDate: Date | null;
  /** Current visible range as nice labels. */
  rangeLabel: string;
  /** Year chips to render. */
  years: number[];
  /** Currently focused year (or null if none cleanly matches). */
  focusedYear: number | null;
  onAnchorChange: (d: Date | null) => void;
}

/**
 * Compact time navigator: prev/next chevrons, range label, year pills,
 * jump-to-peak / jump-to-today, and a mini all-time scrubber strip.
 *
 * The scrubber is purely month-based for visual reference, regardless of the
 * chart's granularity, so users always see "where in their history" the
 * focused window sits.
 */
export function ChartTimeNavigator({
  granularity,
  windowSize,
  anchorEnd,
  minDate,
  maxDate,
  miniSeries,
  peakDate,
  rangeLabel,
  years,
  focusedYear,
  onAnchorChange,
}: Props) {
  const disabled = windowSize === 0 || !maxDate;
  const effectiveAnchor = anchorEnd ?? maxDate ?? new Date();

  const stepMs = useMemo(() => {
    if (windowSize <= 0) return 0;
    const dayMs = 86_400_000;
    if (granularity === "year") return windowSize * 365 * dayMs;
    if (granularity === "month") return windowSize * 30 * dayMs;
    return windowSize * 7 * dayMs;
  }, [granularity, windowSize]);

  const clamp = (d: Date): Date => {
    if (!maxDate) return d;
    let next = d.getTime();
    if (next > maxDate.getTime()) next = maxDate.getTime();
    if (minDate && next < minDate.getTime() + stepMs) {
      next = Math.min(maxDate.getTime(), minDate.getTime() + stepMs);
    }
    return new Date(next);
  };

  const shift = (dir: -1 | 1) => {
    if (disabled) return;
    const next = clamp(new Date(effectiveAnchor.getTime() + dir * stepMs));
    if (maxDate && next.getTime() >= maxDate.getTime() - 1) onAnchorChange(null);
    else onAnchorChange(next);
  };

  const atLatest = !anchorEnd || (maxDate && anchorEnd.getTime() >= maxDate.getTime() - 1);
  const atEarliest =
    !!minDate && effectiveAnchor.getTime() - stepMs <= minDate.getTime();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={disabled || atEarliest}
            onClick={() => shift(-1)}
            title="Previous period"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] px-2 text-center text-xs font-medium tabular-nums text-foreground">
            {rangeLabel}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={disabled || !!atLatest}
            onClick={() => shift(1)}
            title="Next period"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {years.length > 0 && (
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {years.map((y) => (
              <Button
                key={y}
                variant={focusedYear === y ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs tabular-nums"
                disabled={disabled}
                onClick={() => {
                  // Anchor at end of that year (or maxDate if it's the current one)
                  const end = new Date(y, 11, 31);
                  const target = maxDate && end > maxDate ? null : end;
                  onAnchorChange(target);
                }}
              >
                {y}
              </Button>
            ))}
          </div>
        )}

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {peakDate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              disabled={disabled}
              onClick={() => onAnchorChange(peakDate)}
              title="Center the window around your peak week"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Peak
            </Button>
          )}
          <Button
            variant={atLatest ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2.5 text-xs"
            disabled={disabled}
            onClick={() => onAnchorChange(null)}
            title="Jump back to the most recent data"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Today
          </Button>
        </div>
      </div>

      {/* Mini all-time scrubber */}
      {miniSeries.length > 1 && minDate && maxDate && windowSize > 0 && (
        <MiniScrubber
          miniSeries={miniSeries}
          minDate={minDate}
          maxDate={maxDate}
          windowEnd={effectiveAnchor}
          stepMs={stepMs}
          onPick={(d) => {
            const clamped = clamp(d);
            if (maxDate && clamped.getTime() >= maxDate.getTime() - 1) onAnchorChange(null);
            else onAnchorChange(clamped);
          }}
        />
      )}
    </div>
  );
}

interface ScrubberProps {
  miniSeries: MiniPoint[];
  minDate: Date;
  maxDate: Date;
  windowEnd: Date;
  stepMs: number;
  onPick: (d: Date) => void;
}

function MiniScrubber({ miniSeries, minDate, maxDate, windowEnd, stepMs, onPick }: ScrubberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const span = Math.max(1, maxDate.getTime() - minDate.getTime());
  const winStart = new Date(windowEnd.getTime() - stepMs);
  const leftPct = Math.max(0, Math.min(1, (winStart.getTime() - minDate.getTime()) / span)) * 100;
  const widthPct = Math.max(2, Math.min(100 - leftPct, (stepMs / span) * 100));

  const maxKm = useMemo(() => Math.max(1, ...miniSeries.map((p) => p.km)), [miniSeries]);

  const handleAt = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newEndMs = minDate.getTime() + rel * span + stepMs / 2;
    onPick(new Date(newEndMs));
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => handleAt(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <div
      ref={ref}
      className="relative h-9 cursor-pointer select-none overflow-hidden rounded-md border border-border bg-muted/30"
      onMouseDown={(e) => {
        setDragging(true);
        handleAt(e.clientX);
      }}
      onTouchStart={(e) => handleAt(e.touches[0].clientX)}
      onTouchMove={(e) => handleAt(e.touches[0].clientX)}
      title="Drag to scrub through your history"
      role="slider"
      aria-label="Scrub through history"
    >
      <div className="absolute inset-0 flex items-end gap-[1px] px-0.5">
        {miniSeries.map((p) => (
          <div
            key={p.key}
            className="flex-1 rounded-sm bg-primary/40"
            style={{ height: `${Math.max(4, (p.km / maxKm) * 100)}%` }}
          />
        ))}
      </div>
      <div
        className="absolute top-0 h-full rounded-sm border border-primary bg-primary/15 shadow-sm"
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      />
    </div>
  );
}
