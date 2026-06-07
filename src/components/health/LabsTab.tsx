import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Plus, Trash2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLabPanels, useDeleteLabPanel, type LabMarkerValue } from "@/hooks/useLabPanels";
import { AddLabPanelSheet } from "@/components/health/AddLabPanelSheet";
import { LabMarkerSparkline } from "@/components/health/LabMarkerSparkline";
import { parseLocalDate } from "@/utils/dateUtils";
import { toast } from "sonner";

function flagBadge(flag: string | null) {
  if (flag === "high") return <Badge variant="destructive" className="text-[10px]">High</Badge>;
  if (flag === "low") return <Badge variant="destructive" className="text-[10px]">Low</Badge>;
  if (flag === "normal") return <Badge variant="secondary" className="text-[10px]">Normal</Badge>;
  return null;
}

export function LabsTab() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [selectedMarker, setSelectedMarker] = useState<{ key: string; label: string } | null>(null);

  const { data: panels = [], isLoading } = useLabPanels();
  const del = useDeleteLabPanel();

  const allMarkers = useMemo(() => {
    const map = new Map<string, { key: string; label: string; values: { date: string; value: number; unit: string | null }[] }>();
    panels.forEach((p) => {
      p.values.forEach((v: LabMarkerValue) => {
        if (v.value_numeric == null) return;
        const existing = map.get(v.marker_key) ?? {
          key: v.marker_key,
          label: v.marker_label,
          values: [],
        };
        existing.values.push({ date: p.taken_on, value: v.value_numeric, unit: v.unit });
        map.set(v.marker_key, existing);
      });
    });
    return map;
  }, [panels]);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lab panel?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Panel deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {panels.length} panel{panels.length === 1 ? "" : "s"} on file
        </p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" /> Add panel
        </Button>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted/40" />
      ) : panels.length === 0 ? (
        <Card className="p-8 text-center">
          <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-medium">No lab panels yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first blood-panel result to start tracking markers over time.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {panels.map((p) => {
            const isOpen = openIds.has(p.id);
            const abnormal = p.values.filter((v) => v.flag === "high" || v.flag === "low").length;
            return (
              <li key={p.id}>
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleOpen(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{p.panel_name}</span>
                        {p.lab_provider && (
                          <span className="text-xs text-muted-foreground">· {p.lab_provider}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseLocalDate(p.taken_on), "d MMM yyyy")} ·{" "}
                        {p.values.length} marker{p.values.length === 1 ? "" : "s"}
                        {abnormal > 0 && (
                          <span className="text-destructive"> · {abnormal} out of range</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border">
                      {p.values.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          No markers recorded for this panel.
                        </div>
                      ) : (
                        <ul className="divide-y divide-border text-sm">
                          {p.values.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center gap-3 px-4 py-2"
                            >
                              <button
                                type="button"
                                className="text-left flex-1 hover:text-primary transition-colors"
                                onClick={() =>
                                  setSelectedMarker({ key: v.marker_key, label: v.marker_label })
                                }
                              >
                                {v.marker_label}
                              </button>
                              <span className="tabular-nums">
                                {v.value_numeric != null
                                  ? v.value_numeric
                                  : v.value_text ?? "—"}
                                {v.unit && (
                                  <span className="text-muted-foreground"> {v.unit}</span>
                                )}
                              </span>
                              {(v.reference_low != null || v.reference_high != null) && (
                                <span className="text-xs text-muted-foreground w-20 text-right">
                                  {v.reference_low ?? "–"}/{v.reference_high ?? "–"}
                                </span>
                              )}
                              {flagBadge(v.flag)}
                            </li>
                          ))}
                        </ul>
                      )}
                      {p.notes && (
                        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {p.notes}
                        </div>
                      )}
                      <div className="border-t border-border px-2 py-1.5 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete panel
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {selectedMarker && allMarkers.has(selectedMarker.key) && (
        <LabMarkerSparkline
          marker={allMarkers.get(selectedMarker.key)!}
          onClose={() => setSelectedMarker(null)}
        />
      )}

      <AddLabPanelSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
