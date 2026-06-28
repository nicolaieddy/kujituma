import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Loader2, FileSpreadsheet, CheckCircle2, Link2 } from "lucide-react";
import { ImportDropzone } from "@/components/shared/ImportDropzone";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getLocalDateString } from "@/utils/dateUtils";
import { useUpsertMetricSnapshot } from "@/hooks/useSocialMetrics";
import { useSocialPosts, useUpsertSocialPost } from "@/hooks/useSocialPosts";
import { useLogSocialImport } from "@/hooks/useSocialImportHistory";
import { useSocialPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { useValues } from "@/hooks/useValues";
import { useSetSocialPostValue } from "@/hooks/useSocialPostValues";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ImportRow } from "./ImportSummaryDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPostId?: string | null;
  defaultUrl?: string;
  initialFile?: File | null;
  initialFiles?: File[] | null;
  onComplete?: (rows: ImportRow[]) => void;
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
        const d = XLSX.SSF.parse_date_code(val);
        if (d) out.postDate = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else if (typeof val === "string") {
        const s = val.trim();
        const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (mdy) {
          const yy = mdy[3].length === 2 ? 2000 + Number(mdy[3]) : Number(mdy[3]);
          out.postDate = `${yy}-${String(Number(mdy[1])).padStart(2, "0")}-${String(Number(mdy[2])).padStart(2, "0")}`;
        } else {
          const d = new Date(s);
          if (!isNaN(d.getTime())) out.postDate = d.toISOString().slice(0, 10);
        }
      }
    } else {
      const n = typeof val === "number" ? val : Number(String(val ?? "").replace(/,/g, ""));
      (out as any)[field] = Number.isFinite(n) ? n : null;
    }
  }
  return out;
}

function titleFromSlug(url: string): string {
  try {
    const u = new URL(url);
    const slugSeg = u.pathname.split("/").filter(Boolean).pop() ?? "";
    // strip trailing id/hash
    const slug = slugSeg.replace(/-(activity|ugcPost)?-?\d{6,}.*$/i, "").replace(/-[A-Za-z0-9_-]{4,8}$/i, "");
    const words = slug.split("-").filter(Boolean);
    if (!words.length) return "LinkedIn post";
    const sentence = words.join(" ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  } catch {
    return "LinkedIn post";
  }
}

/** Normalize a LinkedIn URL for idempotent matching: lowercase host, drop query/hash, trim trailing slash. */
function normalizeLiUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${host}${path}`;
  } catch {
    return s.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
  }
}

export function LinkedInImportDialog({ open, onClose, defaultPostId = null, defaultUrl = "", initialFile = null, initialFiles = null }: Props) {
  const { data: posts = [] } = useSocialPosts();
  const { data: settings = [] } = useSocialPlatformSettings();
  const { values = [] } = useValues();
  const upsertMetric = useUpsertMetricSnapshot();
  const upsertPost = useUpsertSocialPost();
  const setPostValue = useSetSocialPostValue();
  const logImport = useLogSocialImport();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [parsing, setParsing] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(defaultPostId);
  const [asOf, setAsOf] = useState<string>(getLocalDateString());

  const [scraping, setScraping] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pillars, setPillars] = useState<string[]>([]);
  const [valueIds, setValueIds] = useState<string[]>([]);

  const NEW_POST = "__new__";

  const liPillars = settings.find((s) => s.platform === "linkedin")?.pillars ?? [];

  const reset = () => {
    setFile(null); setParsed(null);
    setSelectedPostId(defaultPostId); setAsOf(getLocalDateString());
    setTitle(""); setBody(""); setPillars([]); setValueIds([]);
  };

  const scrapeViaFirecrawl = async (url: string) => {
    setScraping(true);
    const tid = toast.loading("Fetching post from LinkedIn…");
    try {
      const { data, error } = await supabase.functions.invoke("scrape-linkedin-post", { body: { url } });
      if (error) throw error;
      const t = (data?.title as string) || "";
      const b = (data?.body as string) || "";
      setTitle(t || titleFromSlug(url));
      setBody(b);
      if (!t && !b) {
        toast.warning("Couldn't read post body — used URL slug as title", { id: tid });
      } else {
        toast.success("Fetched post content", { id: tid });
      }
    } catch (e: any) {
      console.error("[scrape-linkedin-post]", e);
      setTitle(titleFromSlug(url));
      toast.warning("Couldn't reach Firecrawl — using URL slug as title", { id: tid, description: e?.message ?? String(e) });
    } finally {
      setScraping(false);
    }
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setParsing(true);
    const tid = toast.loading(`Parsing ${f.name}…`);
    try {
      const buffer = await f.arrayBuffer();
      const data = parseWorkbook(buffer);
      setParsed(data);

      if (!data.postUrl && data.impressions == null && data.reactions == null) {
        toast.error("Couldn't find any LinkedIn metrics in this file", {
          id: tid,
          description: "Make sure you're uploading the 'Single Post Analytics' .xlsx export.",
        });
        return;
      }

      if (data.postUrl && !defaultPostId) {
        const target = normalizeLiUrl(data.postUrl);
        const match = posts.find((p) => normalizeLiUrl(p.live_url) === target);
        if (match) {
          setSelectedPostId(match.id);
          toast.success("Matched an existing post — re-importing will update it", { id: tid });
        } else {
          setSelectedPostId(NEW_POST);
          toast.success("Parsed export — fetching post details…", { id: tid });
          scrapeViaFirecrawl(data.postUrl);
        }
      } else {
        toast.success("Parsed export", { id: tid });
      }
    } catch (e: any) {
      console.error("[linkedin-import] parse", e);
      toast.error("Couldn't parse file", { id: tid, description: e?.message ?? String(e) });
    } finally {
      setParsing(false);
    }
  };

  /** Auto-process many files: parse, match-or-create, attach metrics. No prompts. */
  const handleMultiFiles = async (files: File[]) => {
    const tid = toast.loading(`Importing ${files.length} LinkedIn exports…`);
    let created = 0, updated = 0, failed = 0;
    const today = getLocalDateString();
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        toast.loading(`Processing ${f.name} (${i + 1}/${files.length})…`, { id: tid });
        try {
          const buffer = await f.arrayBuffer();
          const data = parseWorkbook(buffer);
          if (!data.postUrl && data.impressions == null && data.reactions == null) {
            failed++;
            continue;
          }

          // Resolve target post: existing match by URL, or create new
          let postId: string | null = null;
          let action: "created" | "updated" = "updated";
          const target = normalizeLiUrl(data.postUrl);

          if (target) {
            const localMatch = posts.find((p) => normalizeLiUrl(p.live_url) === target);
            if (localMatch) {
              postId = localMatch.id;
            } else {
              const { data: existing } = await supabase
                .from("social_posts")
                .select("id, live_url")
                .eq("platforms", "{linkedin}" as any)
                .limit(500);
              postId = (existing ?? []).find((r: any) => normalizeLiUrl(r.live_url) === target)?.id ?? null;
            }
          }

          if (!postId) {
            // Auto-create — scrape title/body
            action = "created";
            let scrapedTitle = "";
            let scrapedBody = "";
            try {
              if (data.postUrl) {
                const { data: scraped } = await supabase.functions.invoke("scrape-linkedin-post", {
                  body: { url: data.postUrl },
                });
                scrapedTitle = (scraped?.title as string) || "";
                scrapedBody = (scraped?.body as string) || "";
              }
            } catch (err) {
              console.warn("[linkedin-multi] scrape failed", err);
            }
            const finalTitle = scrapedTitle || (data.postUrl ? titleFromSlug(data.postUrl) : "LinkedIn post");
            const saved = await upsertPost.mutateAsync({
              title: finalTitle,
              body: scrapedBody || null,
              status: "published",
              platforms: ["linkedin"],
              pillars: [],
              publish_date: data.postDate ?? today,
              live_url: data.postUrl,
              trust_check: "not_checked",
              hold: false,
            } as any);
            postId = saved.id;
            created++;
          } else {
            updated++;
          }

          await upsertMetric.mutateAsync({
            post_id: postId!,
            platform: "linkedin",
            metrics_as_of: today,
            impressions: data.impressions,
            reactions: data.reactions,
            comments: data.comments,
            reposts: data.reposts,
            reach: data.reach,
            profile_views: data.profile_views,
            followers_gained: data.followers_gained,
            saves: data.saves,
            sends: data.sends,
            link_clicks: data.link_clicks,
          });

          try {
            await logImport.mutateAsync({
              platform: "linkedin",
              kind: "linkedin_single_post",
              action,
              post_id: postId,
              post_url: data.postUrl,
              file_name: f.name,
              summary: {
                impressions: data.impressions,
                reactions: data.reactions,
                comments: data.comments,
                reposts: data.reposts,
                reach: data.reach,
                metrics_as_of: today,
              },
            });
          } catch (logErr) {
            console.warn("[linkedin-multi] log failed", logErr);
          }
        } catch (err) {
          console.error("[linkedin-multi] file failed", f.name, err);
          failed++;
        }
      }

      const ok = created + updated;
      const desc = `${created} created · ${updated} updated${failed ? ` · ${failed} failed` : ""}`;
      if (ok > 0) {
        toast.success(`Imported ${ok} of ${files.length} LinkedIn exports`, {
          id: tid,
          description: desc,
          duration: 4000,
        });
      } else {
        toast.error("No files imported", { id: tid, description: desc });
      }
      reset();
      onClose();
    } catch (e: any) {
      toast.error("Multi-import failed", { id: tid, description: e?.message ?? String(e) });
    }
  };

  const togglePillar = (p: string) =>
    setPillars((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  const toggleValue = (id: string) =>
    setValueIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  useEffect(() => { if (!open) reset(); /* eslint-disable-next-line */ }, [open]);
  useEffect(() => {
    if (!open) return;
    if (initialFiles && initialFiles.length > 1) {
      handleMultiFiles(initialFiles);
    } else if (initialFiles && initialFiles.length === 1) {
      handleFile(initialFiles[0]);
    } else if (initialFile) {
      handleFile(initialFile);
    }
    /* eslint-disable-next-line */
  }, [open, initialFile, initialFiles]);

  const commit = async () => {
    if (!parsed) return;
    let postId = selectedPostId === NEW_POST ? null : selectedPostId;
    let action: "created" | "updated" = "updated";
    const tid = toast.loading(postId ? "Saving metrics snapshot…" : "Creating post & saving metrics…");

    try {
      if (!postId) {
        if (!title.trim()) { toast.error("Add a title before importing", { id: tid }); return; }

        // Final idempotency guard: re-query by normalized live_url in case the
        // local posts cache was stale or the URL differs only by query/slash.
        const target = normalizeLiUrl(parsed.postUrl);
        let existingId: string | null = null;
        if (target) {
          const { data: existing, error: lookupErr } = await supabase
            .from("social_posts")
            .select("id, live_url")
            .eq("platforms", "{linkedin}" as any)
            .limit(500);
          if (lookupErr) throw new Error(`Couldn't check for duplicates: ${lookupErr.message}`);
          existingId = (existing ?? []).find((r: any) => normalizeLiUrl(r.live_url) === target)?.id ?? null;
        }
        action = existingId ? "updated" : "created";

        toast.loading(existingId ? "Updating existing post…" : "Creating post…", { id: tid });
        const saved = await upsertPost.mutateAsync({
          ...(existingId ? { id: existingId } : {}),
          title: title.trim(),
          body: body || null,
          status: "published",
          platforms: ["linkedin"],
          pillars,
          publish_date: parsed.postDate ?? getLocalDateString(),
          live_url: parsed.postUrl,
          trust_check: "not_checked",
          hold: false,
        } as any);
        postId = saved.id;

        for (const vid of valueIds) {
          await setPostValue.mutateAsync({ post_id: saved.id, value_id: vid, weight: 1 });
        }
      }

      if (!postId) { toast.error("Pick a post to attach this snapshot to", { id: tid }); return; }

      toast.loading("Saving metrics snapshot…", { id: tid });
      await upsertMetric.mutateAsync({
        post_id: postId,
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

      // Log to import history
      try {
        await logImport.mutateAsync({
          platform: "linkedin",
          kind: "linkedin_single_post",
          action,
          post_id: postId,
          post_url: parsed.postUrl,
          file_name: file?.name ?? null,
          summary: {
            impressions: parsed.impressions,
            reactions: parsed.reactions,
            comments: parsed.comments,
            reposts: parsed.reposts,
            reach: parsed.reach,
            metrics_as_of: asOf,
          },
        });
      } catch (logErr) {
        console.warn("[social-import-history] log failed", logErr);
      }

      const created = action === "created" ? 1 : 0;
      const updated = action === "updated" ? 1 : 0;
      toast.success("LinkedIn import complete", {
        id: tid,
        description: `${created} created · ${updated} updated · 1 metrics snapshot saved`,
      });
      reset();
      onClose();
    } catch (e: any) {
      console.error("[linkedin-import] commit", e);
      toast.error("Import failed", { id: tid, description: e?.message ?? String(e) });
    }
  };

  const busy = upsertMetric.isPending || upsertPost.isPending;
  const isCreating = selectedPostId === NEW_POST;
  const canCommit = !!parsed && (isCreating ? !!title.trim() : !!selectedPostId) && !busy;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="min-w-0">
          <DialogTitle>Import LinkedIn .xlsx</DialogTitle>
          <DialogDescription className="break-words">
            Drop a "Single Post Analytics" export. We'll match it to an existing post or create a new one,
            then attach the metrics and add it to the calendar.
          </DialogDescription>
        </DialogHeader>

        {!parsed && (
          <ImportDropzone
            accept=".xlsx"
            multiple
            busy={parsing}
            selected={file}
            onFiles={(fs) => fs.length === 1 ? handleFile(fs[0]) : handleMultiFiles(fs)}
            label="Drop your .xlsx exports or click to browse"
            hint="LinkedIn 'Single Post Analytics' exports — drop multiple to auto-import each"
          />
        )}

        {parsed && (
          <div className="space-y-3 min-w-0">
            <Card className="p-3 bg-muted/30 space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span className="truncate">{file?.name}</span>
              </div>
              {parsed.postUrl && (
                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 min-w-0">
                  <Link2 className="h-3 w-3 shrink-0" /> <span className="truncate">{parsed.postUrl}</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs mt-2">
                {(["impressions","reach","reactions","comments","reposts","saves","sends","link_clicks","profile_views","followers_gained"] as const).map((k) => (
                  parsed[k] != null && (
                    <div key={k} className="flex justify-between gap-2 border-b border-dashed border-border/50 min-w-0">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span className="tabular-nums shrink-0">{parsed[k]}</span>
                    </div>
                  )
                ))}
              </div>
            </Card>

            <div className="space-y-1.5">
              <Label>Post target</Label>
              <Select
                value={selectedPostId ?? NEW_POST}
                onValueChange={(v) => setSelectedPostId(v === NEW_POST ? NEW_POST : v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a post" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_POST}>Create new post</SelectItem>
                  {posts.filter((p) => p.platforms.includes("linkedin")).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title || "Untitled"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {isCreating
                  ? "No existing post matched — a new LinkedIn post record will be created."
                  : selectedPostId
                    ? `Metrics will be attached to the existing post selected above.`
                    : "Select an existing post or choose 'Create new post'."}
              </p>
            </div>

            {isCreating && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={scraping ? "Fetching from LinkedIn…" : "Post title"}
                    disabled={scraping}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Body</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={scraping ? "Fetching…" : "Post body (optional)"}
                    rows={4}
                    disabled={scraping}
                  />
                </div>

                {liPillars.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Pillars</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {liPillars.map((p) => {
                        const on = pillars.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePillar(p)}
                            className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                              on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {values.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Values</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((v) => {
                        const on = valueIds.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleValue(v.id)}
                            className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                              on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                            }`}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {parsed.postDate && (
                  <Badge variant="outline" className="text-[11px]">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                    Publish date: {parsed.postDate}
                  </Badge>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>As-of date</Label>
              <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={commit} disabled={!canCommit}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create & import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
