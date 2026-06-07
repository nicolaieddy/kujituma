import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Pill, Plus, Archive, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useSupplements,
  useSupplementLogs,
  useToggleSupplementLog,
  useArchiveSupplement,
} from "@/hooks/useSupplements";
import { AddSupplementSheet } from "@/components/health/AddSupplementSheet";
import { parseLocalDate } from "@/utils/dateUtils";
import { toast } from "sonner";

const ADHERENCE_DAYS = 14;

export function SupplementsTab() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(parseLocalDate(today), ADHERENCE_DAYS - 1), "yyyy-MM-dd");

  const { data: supplements = [], isLoading } = useSupplements();
  const { data: logs = [] } = useSupplementLogs(startDate, today);
  const toggle = useToggleSupplementLog();
  const archive = useArchiveSupplement();

  // logs keyed by supplement_id then taken_on
  const logIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    logs.forEach((l) => {
      if (!l.taken) return;
      const set = map.get(l.supplement_id) ?? new Set();
      set.add(l.taken_on);
      map.set(l.supplement_id, set);
    });
    return map;
  }, [logs]);

  const dateRange = useMemo(() => {
    const arr: string[] = [];
    for (let i = ADHERENCE_DAYS - 1; i >= 0; i--) {
      arr.push(format(subDays(parseLocalDate(today), i), "yyyy-MM-dd"));
    }
    return arr;
  }, [today]);

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive "${name}"? You can re-add it anytime.`)) return;
    try {
      await archive.mutateAsync(id);
      toast.success("Archived");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to archive");
    }
  };

  const handleToggleToday = async (id: string, currentlyTaken: boolean) => {
    try {
      await toggle.mutateAsync({ supplement_id: id, taken_on: today, taken: !currentlyTaken });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {supplements.length} active supplement{supplements.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" /> Add supplement
        </Button>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted/40" />
      ) : supplements.length === 0 ? (
        <Card className="p-8 text-center">
          <Pill className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-medium">No supplements yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add what you're taking to start tracking adherence.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {supplements.map((s) => {
            const taken = logIndex.get(s.id) ?? new Set();
            const takenToday = taken.has(today);
            const last14Taken = dateRange.filter((d) => taken.has(d)).length;
            return (
              <li key={s.id}>
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={takenToday}
                      onCheckedChange={() => handleToggleToday(s.id, takenToday)}
                      className="h-5 w-5"
                      aria-label={`Mark ${s.name} as taken today`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        {s.dose != null && (
                          <span className="text-xs text-muted-foreground">
                            {s.dose}
                            {s.dose_unit ? ` ${s.dose_unit}` : ""}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">· {s.schedule}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {last14Taken}/{ADHERENCE_DAYS} of last {ADHERENCE_DAYS} days
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(s.id, s.name)}
                      aria-label="Archive supplement"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
                    {dateRange.map((d) => {
                      const wasTaken = taken.has(d);
                      const isToday = d === today;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggle.mutate({ supplement_id: s.id, taken_on: d, taken: !wasTaken })}
                          aria-label={`${format(parseLocalDate(d), "EEE d MMM")}: ${wasTaken ? "taken" : "missed"}`}
                          className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-[10px] transition-colors ${
                            wasTaken
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          } ${isToday ? "ring-2 ring-primary/40 ring-offset-1 ring-offset-background" : ""}`}
                        >
                          {wasTaken ? <Check className="h-3.5 w-3.5" /> : format(parseLocalDate(d), "d")}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AddSupplementSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
