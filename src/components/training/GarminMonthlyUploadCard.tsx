import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, FileSpreadsheet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface ParsedRow { month: string; sport: string; distance_km: number }

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

function parseMonthLabel(label: string): string | null {
  // Accepts "Jul 2025", "July 2025", "2025-07", "2025-07-01"
  const m1 = label.trim().match(/^([A-Za-z]+)[\s-]+(\d{4})$/);
  if (m1) {
    const mi = MONTHS[m1[1].slice(0, 3).toLowerCase()];
    if (mi !== undefined) {
      const mm = String(mi + 1).padStart(2, "0");
      return `${m1[2]}-${mm}-01`;
    }
  }
  const m2 = label.trim().match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (m2) return `${m2[1]}-${String(+m2[2]).padStart(2, "0")}-01`;
  return null;
}

function parseGarminCsv(text: string): ParsedRow[] {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    // Skip the header rows ("Total Distance", ",Activity Type,Value")
    if (/^total distance$/i.test(line)) continue;
    if (/activity\s*type/i.test(line)) continue;
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length < 3) continue;
    const month = parseMonthLabel(cells[0]);
    const sport = cells[1];
    const value = Number(cells[2]);
    if (!month || !sport || !isFinite(value)) continue;
    rows.push({ month, sport, distance_km: value });
  }
  return rows;
}

export function GarminMonthlyUploadCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: existing = [] } = useQuery({
    queryKey: ["monthly-distance-aggregates-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_distance_aggregates")
        .select("month, sport, distance_km, source")
        .eq("user_id", user!.id)
        .order("month", { ascending: false });
      return data ?? [];
    },
  });

  async function handleFiles(files: File[]) {
    if (!user || files.length === 0) return;
    setUploading(true);
    try {
      const allRows: ParsedRow[] = [];
      let failedFiles = 0;
      for (const file of files) {
        try {
          const text = await file.text();
          const parsed = parseGarminCsv(text);
          allRows.push(...parsed.filter((r) => /run/i.test(r.sport)));
        } catch {
          failedFiles++;
        }
      }
      if (allRows.length === 0) {
        toast.error("No running rows found across the selected files.");
        return;
      }
      // Dedupe by month — keep the largest value if multiple files cover the same month
      const byMonth = new Map<string, number>();
      for (const r of allRows) {
        const prev = byMonth.get(r.month) ?? 0;
        if (r.distance_km > prev) byMonth.set(r.month, r.distance_km);
      }
      const payload = Array.from(byMonth.entries()).map(([month, distance_km]) => ({
        user_id: user.id,
        month,
        sport: "Running",
        distance_km,
        source: "garmin_csv",
      }));
      const { error } = await supabase
        .from("monthly_distance_aggregates")
        .upsert(payload, { onConflict: "user_id,month,sport,source" });
      if (error) throw error;
      toast.success(
        `Imported ${payload.length} months from ${files.length} file${files.length === 1 ? "" : "s"}` +
          (failedFiles ? ` · ${failedFiles} failed` : ""),
      );
      qc.invalidateQueries({ queryKey: ["monthly-distance-aggregates"] });
      qc.invalidateQueries({ queryKey: ["monthly-distance-aggregates-all"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const latest = existing[0]?.month;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length) handleFiles(fs);
        }}
      />
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2 text-xs"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              )}
              {uploading ? "Importing…" : "Import Garmin CSV"}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            Upload the <code>Total Distance.csv</code> export from Garmin Connect to backfill months before
            Strava/.FIT syncing. Trends uses whichever monthly total is higher.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {existing.length > 0 && (
        <span className="tabular-nums">
          {existing.length} mo imported · latest {format(new Date(latest!), "MMM yyyy")}
        </span>
      )}
    </div>
  );
}

