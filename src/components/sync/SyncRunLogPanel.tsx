import { useState } from "react";
import { useSyncRunLogs, type SyncProvider, type SyncRunLog, type SyncItem } from "@/hooks/useSyncRunLogs";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock3,
  History,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface SyncRunLogPanelProps {
  provider: SyncProvider;
  title?: string;
  limit?: number;
  /** Start expanded (defaults to false) */
  defaultOpen?: boolean;
}

function statusColor(status: SyncRunLog["status"]) {
  switch (status) {
    case "success":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "partial":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "rate_limited":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "failed":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "running":
      return "bg-primary/15 text-primary border-primary/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function StatusIcon({ status }: { status: SyncRunLog["status"] }) {
  if (status === "success") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "partial") return <AlertTriangle className="h-3.5 w-3.5" />;
  if (status === "rate_limited") return <Clock3 className="h-3.5 w-3.5" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  return <Info className="h-3.5 w-3.5" />;
}

function ItemRow({ item }: { item: SyncItem }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded border px-2 py-1.5 text-xs",
        item.ok
          ? "border-border bg-muted/30"
          : "border-destructive/30 bg-destructive/5",
      )}
    >
      {item.ok ? (
        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-foreground">{item.kind}</span>
          {item.status && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.status}
            </span>
          )}
          {item.ref && (
            <span className="text-muted-foreground/80 truncate">· {item.ref}</span>
          )}
        </div>
        {item.message && (
          <p
            className={cn(
              "mt-0.5 break-words",
              item.ok ? "text-muted-foreground" : "text-destructive/90",
            )}
          >
            {item.message}
          </p>
        )}
        {item.summary && Object.keys(item.summary).length > 0 && (
          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {Object.entries(item.summary)
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .slice(0, 10)
              .map(([k, v]) => (
                <div key={k} className="truncate">
                  <span className="text-muted-foreground/70">{k}:</span>{" "}
                  <span className="text-foreground/80">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RunCard({ run }: { run: SyncRunLog }) {
  const [open, setOpen] = useState(false);
  const counters = run.counters || {};
  const counterEntries = Object.entries(counters).filter(([, v]) => v > 0);
  const items = run.items || [];
  const failedItems = items.filter(i => !i.ok);
  const okItems = items.filter(i => i.ok);
  const summary =
    counterEntries.length > 0
      ? counterEntries.map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(" · ")
      : run.status === "failed"
        ? "No items processed"
        : "Nothing new";

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-2 p-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 mt-1 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 mt-1 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("gap-1 text-[10px] py-0 px-1.5 h-5 capitalize", statusColor(run.status))}
            >
              <StatusIcon status={run.status} />
              {run.status.replace("_", " ")}
            </Badge>
            <span className="text-[11px] text-muted-foreground capitalize">{run.trigger}</span>
            <span className="text-[11px] text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-foreground/90 truncate">{summary}</p>
          {run.error && (
            <p className="text-[11px] text-destructive/90 break-words">{run.error}</p>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-2.5 space-y-2 bg-muted/20">
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div>
              <span className="text-muted-foreground/70">Started:</span>{" "}
              <span className="text-foreground/80">
                {new Date(run.started_at).toLocaleString()}
              </span>
            </div>
            {run.duration_ms != null && (
              <div>
                <span className="text-muted-foreground/70">Duration:</span>{" "}
                <span className="text-foreground/80">
                  {(run.duration_ms / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </div>

          {failedItems.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive/80">
                Failures ({failedItems.length})
              </p>
              <div className="space-y-1">
                {failedItems.map((it, i) => (
                  <ItemRow key={`f-${i}`} item={it} />
                ))}
              </div>
            </div>
          )}

          {okItems.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors list-none flex items-center gap-1">
                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                Successes ({okItems.length})
              </summary>
              <div className="mt-1 space-y-1">
                {okItems.slice(0, 50).map((it, i) => (
                  <ItemRow key={`s-${i}`} item={it} />
                ))}
                {okItems.length > 50 && (
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    +{okItems.length - 50} more
                  </p>
                )}
              </div>
            </details>
          )}

          {items.length === 0 && !run.error && (
            <p className="text-[11px] text-muted-foreground italic">
              No per-item details recorded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SyncRunLogPanel({
  provider,
  title = "Sync history",
  limit = 10,
  defaultOpen = false,
}: SyncRunLogPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { data: runs = [], isLoading } = useSyncRunLogs(provider, limit);

  const latest = runs[0];

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(o => !o)}
        className="w-full justify-start gap-2 px-2.5 py-2 h-auto font-normal hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{title}</span>
        {latest && (
          <Badge
            variant="outline"
            className={cn("ml-auto gap-1 text-[10px] py-0 px-1.5 h-5 capitalize", statusColor(latest.status))}
          >
            <StatusIcon status={latest.status} />
            {latest.status.replace("_", " ")}
          </Badge>
        )}
        {!latest && !isLoading && (
          <span className="ml-auto text-[10px] text-muted-foreground/70">No runs yet</span>
        )}
      </Button>

      {open && (
        <div className="p-2 pt-0 space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1 py-3 text-center">
              No sync runs recorded in the last 30 days.
            </p>
          ) : (
            runs.map(run => <RunCard key={run.id} run={run} />)
          )}
        </div>
      )}
    </div>
  );
}
