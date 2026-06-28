import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PLATFORM_META, SOCIAL_PLATFORMS, type SocialPlatform, formatCompact } from "@/lib/social";
import { useBulkUpsertDailyMetrics } from "@/hooks/useDailyAccountMetrics";
import { useUpsertPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { useLogSocialImport } from "@/hooks/useSocialImportHistory";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPlatform?: SocialPlatform;
}

interface ParsedAggregate {
  platform: SocialPlatform;
  rangeLabel: string | null;
  totalImpressions: number | null;
  totalReach: number | null;
  currentFollowers: number | null;
  followersAsOf: string | null;
  daily: Array<{ date: string; impressions?: number; engagements?: number; new_followers?: number }>;
  followerTotals: Array<{ date: string; total_followers: number; new_followers: number }>;
}

function parseDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // m/d/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${yy}-${String(Number(m[1])).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseWorkbook(buffer: ArrayBuffer, platform: SocialPlatform): ParsedAggregate {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheets: Record<string, any[][]> = {};
  for (const name of wb.SheetNames) {
    sheets[name.toUpperCase().trim()] = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], {
      header: 1,
      raw: true,
    });
  }

  const out: ParsedAggregate = {
    platform,
    rangeLabel: null,
    totalImpressions: null,
    totalReach: null,
    currentFollowers: null,
    followersAsOf: null,
    daily: [],
    followerTotals: [],
  };

  // DISCOVERY
  const disc = sheets["DISCOVERY"];
  if (disc) {
    for (const row of disc) {
      if (!Array.isArray(row)) continue;
      const label = String(row[0] ?? "").toLowerCase().trim();
      const val = row[1];
      if (label === "overall performance") out.rangeLabel = String(val ?? "");
      else if (label === "impressions") out.totalImpressions = toNum(val);
      else if (label === "members reached") out.totalReach = toNum(val);
    }
  }

  // ENGAGEMENT: Date, Impressions, Engagements
  const eng = sheets["ENGAGEMENT"];
  const dailyMap = new Map<string, { impressions?: number; engagements?: number; new_followers?: number }>();
  if (eng) {
    let started = false;
    for (const row of eng) {
      if (!Array.isArray(row) || row.length === 0) continue;
      const first = String(row[0] ?? "").trim();
      if (!started) {
        if (first.toLowerCase() === "date") started = true;
        continue;
      }
      const date = parseDate(row[0]);
      if (!date) continue;
      const impressions = toNum(row[1]) ?? undefined;
      const engagements = toNum(row[2]) ?? undefined;
      dailyMap.set(date, { ...(dailyMap.get(date) ?? {}), impressions, engagements });
    }
  }

  // FOLLOWERS: "Total followers on M/D/YYYY" then daily "New followers"
  const fol = sheets["FOLLOWERS"];
  const newFollowers: Array<{ date: string; new_followers: number }> = [];
  if (fol) {
    let started = false;
    for (const row of fol) {
      if (!Array.isArray(row) || row.length === 0) continue;
      const first = String(row[0] ?? "").trim();
      if (!started) {
        const m = first.match(/total followers on\s+(.+)/i);
        if (m) {
          out.followersAsOf = parseDate(m[1]);
          out.currentFollowers = toNum(row[1]);
        }
        if (first.toLowerCase() === "date") started = true;
        continue;
      }
      const date = parseDate(row[0]);
      const n = toNum(row[1]);
      if (date && n != null) {
        newFollowers.push({ date, new_followers: n });
        dailyMap.set(date, { ...(dailyMap.get(date) ?? {}), new_followers: n });
      }
    }
  }

  // Compute follower totals walking forward from baseline
  if (out.currentFollowers != null && newFollowers.length > 0) {
    const sorted = [...newFollowers].sort((a, b) => a.date.localeCompare(b.date));
    const sumAll = sorted.reduce((s, r) => s + r.new_followers, 0);
    // baseline = followers right before earliest entry
    let running = out.currentFollowers - sumAll;
    for (const r of sorted) {
      running += r.new_followers;
      out.followerTotals.push({
        date: r.date,
        total_followers: running,
        new_followers: r.new_followers,
      });
    }
  }

  out.daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return out;
}

export function AggregateImportDialog({ open, onClose, defaultPlatform = "linkedin" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const upsertDaily = useBulkUpsertDailyMetrics();
  const upsertSettings = useUpsertPlatformSettings();
  const logImport = useLogSocialImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState<SocialPlatform>(defaultPlatform);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedAggregate | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setPlatform(defaultPlatform);
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setParsing(true);
    try {
      const buffer = await f.arrayBuffer();
      const data = parseWorkbook(buffer, platform);
      setParsed(data);
    } catch (e: any) {
      toast.error("Couldn't parse file", { description: e.message });
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!parsed || !user) return;
    setImporting(true);
    try {
      // 1) Daily account metrics
      const dailyRows = parsed.daily.map((d) => ({
        platform: parsed.platform,
        date: d.date,
        impressions: d.impressions ?? null,
        engagements: d.engagements ?? null,
        new_followers: d.new_followers ?? null,
        source: "linkedin_aggregate_xlsx",
      }));
      if (dailyRows.length > 0) await upsertDaily.mutateAsync(dailyRows);

      // 2) Follower totals — reconstructed series
      if (parsed.followerTotals.length > 0) {
        const chunks: any[][] = [];
        const payload = parsed.followerTotals.map((r) => ({
          user_id: user.id,
          platform: parsed.platform,
          date: r.date,
          total_followers: r.total_followers,
          note: "Imported from LinkedIn aggregate export",
        }));
        for (let i = 0; i < payload.length; i += 500) chunks.push(payload.slice(i, i + 500));
        for (const c of chunks) {
          const { error } = await supabase
            .from("social_follower_growth")
            .upsert(c, { onConflict: "user_id,platform,date" });
          if (error) throw error;
        }
      }

      // 3) Anchor latest follower count on settings
      if (parsed.currentFollowers != null) {
        await upsertSettings.mutateAsync({
          platform: parsed.platform,
          current_followers_cached: parsed.currentFollowers,
        });
        if (parsed.followersAsOf) {
          await supabase
            .from("social_follower_growth")
            .upsert(
              {
                user_id: user.id,
                platform: parsed.platform,
                date: parsed.followersAsOf,
                total_followers: parsed.currentFollowers,
                note: "Anchor: 'Total followers on' value from aggregate export",
              },
              { onConflict: "user_id,platform,date" },
            );
        }
      }

      qc.invalidateQueries({ queryKey: ["social-follower-growth"] });
      qc.invalidateQueries({ queryKey: ["social-platform-settings"] });
      qc.invalidateQueries({ queryKey: ["social-daily-account-metrics"] });

      // Log to import history (best-effort)
      try {
        await logImport.mutateAsync({
          platform: parsed.platform,
          kind: "linkedin_aggregate",
          action: "updated",
          post_id: null,
          post_url: null,
          file_name: file?.name ?? null,
          summary: {
            daily_rows: parsed.daily.length,
            follower_entries: parsed.followerTotals.length,
            current_followers: parsed.currentFollowers,
            range: parsed.rangeLabel,
          },
        });
      } catch (logErr) {
        console.warn("[social-import-history] log failed", logErr);
      }

      toast.success("Aggregate analytics imported", {
        description: `${parsed.daily.length} daily rows · ${parsed.followerTotals.length} follower entries`,
      });
      reset();
      onClose();
    } catch (e: any) {
      toast.error("Import failed", { description: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import aggregate analytics</DialogTitle>
          <DialogDescription>
            Drop a LinkedIn <code>AggregateAnalytics_…xlsx</code> export. We'll set your current
            follower count and back-fill daily impressions, engagements, and follower growth.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs">Platform</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as SocialPlatform)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{PLATFORM_META[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!parsed && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors"
          >
            {parsing ? (
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            )}
            <div className="text-sm font-medium">{file ? file.name : "Click to choose .xlsx"}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Supports LinkedIn aggregate exports (DISCOVERY, ENGAGEMENT, FOLLOWERS sheets).
            </div>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />

        {parsed && (
          <Card className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet className="h-4 w-4" /> {file?.name}
            </div>
            {parsed.rangeLabel && (
              <div className="text-[11px] text-muted-foreground">Range: {parsed.rangeLabel}</div>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Followers" value={formatCompact(parsed.currentFollowers)} sub={parsed.followersAsOf ?? undefined} />
              <Stat label="Impressions" value={formatCompact(parsed.totalImpressions)} />
              <Stat label="Reach" value={formatCompact(parsed.totalReach)} />
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {parsed.daily.length} daily rows · {parsed.followerTotals.length} reconstructed follower totals
            </div>
          </Card>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={commit} disabled={!parsed || importing}>
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
