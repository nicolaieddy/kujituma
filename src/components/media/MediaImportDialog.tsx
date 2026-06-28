import { useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useBulkInsertMentions, MEDIA_TYPES, MEDIA_URL_STATUSES, MEDIA_STATUSES, MEDIA_SENTIMENTS, type MediaMentionInsert } from "@/hooks/media/useMedia";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TYPE_SET = new Set<string>(MEDIA_TYPES);
const URL_STATUS_SET = new Set<string>(MEDIA_URL_STATUSES);
const STATUS_SET = new Set<string>(MEDIA_STATUSES);
const SENTIMENT_SET = new Set<string>(MEDIA_SENTIMENTS);

function parseDate(v: any): string | null {
  if (!v) return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseTags(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v).split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
}

function parseBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function normalize(row: any): Omit<MediaMentionInsert, "user_id"> | { error: string } {
  const date = parseDate(row.date);
  const title = String(row.title ?? "").trim();
  if (!date) return { error: "missing date" };
  if (!title) return { error: "missing title" };
  const url = (row.url ? String(row.url).trim() : "") || null;
  const rawUrlStatus = String(row.url_status ?? "").trim().toLowerCase();
  const url_status = URL_STATUS_SET.has(rawUrlStatus) ? rawUrlStatus : (url ? "verify" : "needs-url");
  const type = TYPE_SET.has(String(row.type)) ? String(row.type) : "Article";
  const status = STATUS_SET.has(String(row.status)) ? String(row.status) : "Published";
  const sentimentRaw = String(row.sentiment ?? "").trim().toLowerCase();
  const sentiment = SENTIMENT_SET.has(sentimentRaw) ? sentimentRaw : null;
  return {
    date,
    title,
    outlet: String(row.outlet ?? "").trim(),
    type: type as any,
    url,
    url_status: url_status as any,
    summary: row.summary ? String(row.summary) : null,
    tags: parseTags(row.tags),
    status: status as any,
    sentiment: sentiment as any,
    featured: parseBool(row.featured),
    source: "import",
    archived_url: row.archived_url ? String(row.archived_url) : null,
  };
}

export function MediaImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<{ ok: Omit<MediaMentionInsert, "user_id">[]; errors: number } | null>(null);
  const bulk = useBulkInsertMentions();

  const handleFile = async (f: File) => {
    setFile(f);
    setParsing(true);
    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
      const ok: Omit<MediaMentionInsert, "user_id">[] = [];
      let errors = 0;
      for (const r of rows) {
        const out = normalize(r);
        if ("error" in out) errors++;
        else ok.push(out);
      }
      setPreview({ ok, errors });
    } catch (e) {
      toast.error("Could not parse file. Use CSV or XLSX with the documented column order.");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!preview?.ok.length) return;
    try {
      const res = await bulk.mutateAsync(preview.ok);
      toast.success(`Imported ${res.inserted} mentions (${res.skipped} duplicates skipped)`);
      onOpenChange(false);
      setFile(null);
      setPreview(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Import media mentions</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            CSV or XLSX. Expected columns:{" "}
            <code className="text-xs">date, title, outlet, type, url, url_status, summary, tags, status, sentiment, featured, source, archived_url</code>
          </p>
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {parsing && <div className="text-xs text-muted-foreground">Parsing…</div>}
          {preview && (
            <div className="rounded-md border p-3 text-sm">
              <div><span className="font-medium">{preview.ok.length}</span> ready to import</div>
              {preview.errors > 0 && <div className="text-amber-600">{preview.errors} row(s) skipped (missing title or date)</div>}
              <div className="text-xs text-muted-foreground mt-1">Duplicates (same title + date + outlet) are skipped automatically.</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!preview?.ok.length || bulk.isPending}>
            {bulk.isPending ? "Importing…" : `Import ${preview?.ok.length ?? 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
