import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileSpreadsheet, Trash2 } from "lucide-react";
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

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseGarminCsv(text);
      const runRows = parsed.filter((r) => /run/i.test(r.sport));
      if (runRows.length === 0) {
        toast.error("No running rows found in the CSV.");
        return;
      }
      const payload = runRows.map((r) => ({
        user_id: user.id,
        month: r.month,
        sport: "Running",
        distance_km: r.distance_km,
        source: "garmin_csv",
      }));
      const { error } = await supabase
        .from("monthly_distance_aggregates")
        .upsert(payload, { onConflict: "user_id,month,sport,source" });
      if (error) throw error;
      toast.success(`Imported ${runRows.length} months of Garmin running totals`);
      qc.invalidateQueries({ queryKey: ["monthly-distance-aggregates"] });
      qc.invalidateQueries({ queryKey: ["monthly-distance-aggregates-all"] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function clearAll() {
    if (!user) return;
    if (!confirm("Remove all imported Garmin monthly totals?")) return;
    const { error } = await supabase
      .from("monthly_distance_aggregates")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "garmin_csv");
    if (error) return toast.error(error.message);
    toast.success("Cleared imported aggregates");
    qc.invalidateQueries({ queryKey: ["monthly-distance-aggregates"] });
    qc.invalidateQueries({ queryKey: ["monthly-distance-aggregates-all"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Import Garmin monthly totals
        </CardTitle>
        <CardDescription>
          Upload the <code className="text-xs">Total Distance.csv</code> export from Garmin Connect to backfill months
          before you started syncing activities. The Trends chart will use whichever number is higher (sessions or
          Garmin total) for each month so nothing is double-counted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Importing…" : "Upload CSV"}
          </Button>
          {existing.length > 0 && (
            <Button onClick={clearAll} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" /> Clear imported
            </Button>
          )}
        </div>

        {existing.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {existing.length} month{existing.length === 1 ? "" : "s"} imported · latest{" "}
            <span className="tabular-nums">
              {format(new Date(existing[0].month), "MMM yyyy")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
