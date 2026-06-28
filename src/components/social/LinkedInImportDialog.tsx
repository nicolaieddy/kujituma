import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getLocalDateString } from "@/utils/dateUtils";
import { useUpsertMetricSnapshot } from "@/hooks/useSocialMetrics";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPostId?: string | null;
  defaultUrl?: string;
}

interface Parsed {
  postUrl: string | null;
  postDate: string | null;
  impressions: number | null;
  reach: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  saves: number | null;
  sends: number | null;
  link_clicks: number | null;
  profile_views: number | null;
  followers_gained: number | null;
}

const FIELD_MAP: Record<string, keyof Parsed> = {
  "post url": "postUrl",
  "post date": "postDate",
  "impressions": "impressions",
  "members reached": "reach",
  "profile viewers from this post": "profile_views",
  "followers gained from this post": "followers_gained",
  "reactions": "reactions",
  "comments": "comments",
  "reposts": "reposts",
  "saves": "saves",
  "sends on linkedin": "sends",
  "link engagements": "link_clicks",
};

function parseWorkbook(buffer: ArrayBuffer): Parsed {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  const out: Parsed = {
    postUrl: null, postDate: null, impressions: null, reach: null,
    reactions: null, comments: null, reposts: null, saves: null,
    sends: null, link_clicks: null, profile_views: null, followers_gained: null,
  };
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const key = String(row[0] ?? "").toLowerCase().trim();
    const val = row[1];
    const field = FIELD_MAP[key];
    if (!field) continue;
    if (field === "postUrl") {
      out.postUrl = String(val ?? "").trim() || null;
    } else if (field === "postDate") {
      if (val instanceof Date) out.postDate = val.toISOString().slice(0, 10);
      else if (typeof val === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(val);
        if (d) out.postDate = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else if (typeof val === "string") {
        const d = new Date(val);
        if (!isNaN(d.getTime())) out.postDate = d.toISOString().slice(0, 10);
      }
    } else {
      const n = typeof val === "number" ? val : Number(String(val ?? "").replace(/,/g, ""));
      (out as any)[field] = Number.isFinite(n) ? n : null;
    }
  }
  return out;
}

export function LinkedInImportDialog({ open, onClose, defaultPostId = null, defaultUrl = "" }: Props) {
  const { data: posts = [] } = useSocialPosts();
  const upsert = useUpsertMetricSnapshot();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [parsing, setParsing] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(defaultPostId);
  const [asOf, setAsOf] = useState<string>(getLocalDateString());

  const reset = () => {
    setFile(null);
    setParsed(null);
    setSelectedPostId(defaultPostId);
    setAsOf(getLocalDateString());
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setParsing(true);
    try {
      const buffer = await f.arrayBuffer();
      const data = parseWorkbook(buffer);
      setParsed(data);

      // Auto-match by URL
      if (data.postUrl && !defaultPostId) {
        const match = posts.find((p) => p.live_url && p.live_url.trim() === data.postUrl!.trim());
        if (match) setSelectedPostId(match.id);
      }
    } catch (e: any) {
      toast.error("Couldn't parse file", { description: e.message });
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!parsed || !selectedPostId) {
      toast.error("Pick a post to attach this snapshot to");
      return;
    }
    await upsert.mutateAsync({
      post_id: selectedPostId,
      platform: "linkedin",
      metrics_as_of: asOf,
      impressions: parsed.impressions,
      reactions: parsed.reactions,
      comments: parsed.comments,
      reposts: parsed.reposts,
      reach: parsed.reach,
      profile_views: parsed.profile_views,
      followers_gained: parsed.followers_gained,
      saves: parsed.saves,
      sends: parsed.sends,
      link_clicks: parsed.link_clicks,
    });
    toast.success("LinkedIn snapshot imported");
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import LinkedIn .xlsx</DialogTitle>
          <DialogDescription>
            Download "Single Post Analytics" from LinkedIn and drop the .xlsx here.
          </DialogDescription>
        </DialogHeader>

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
            <div className="text-sm font-medium">
              {file ? file.name : "Click to choose .xlsx"}
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
          <div className="space-y-3">
            <Card className="p-3 bg-muted/30 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet className="h-4 w-4" /> {file?.name}
              </div>
              {parsed.postUrl && (
                <div className="text-[11px] text-muted-foreground truncate">URL: {parsed.postUrl}</div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                {(["impressions", "reach", "reactions", "comments", "reposts", "saves", "sends", "link_clicks", "profile_views", "followers_gained"] as const).map((k) => (
                  parsed[k] != null && (
                    <div key={k} className="flex justify-between border-b border-dashed border-border/50">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="tabular-nums">{parsed[k]}</span>
                    </div>
                  )
                ))}
              </div>
            </Card>

            <div className="space-y-1.5">
              <Label>Attach to post</Label>
              <Select value={selectedPostId ?? ""} onValueChange={(v) => setSelectedPostId(v || null)}>
                <SelectTrigger><SelectValue placeholder="Pick a post" /></SelectTrigger>
                <SelectContent>
                  {posts.filter((p) => p.platforms.includes("linkedin")).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title || "Untitled"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parsed.postUrl && !selectedPostId && (
                <p className="text-[11px] text-amber-700">
                  No post matched URL — pick one above, or close and add a Live URL to the post first.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>As-of date</Label>
              <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={commit} disabled={!parsed || !selectedPostId || upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
