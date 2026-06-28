import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PLATFORM_META, formatCompact, formatEngagementRate, type SocialPlatform } from "@/lib/social";
import { CompactNumber } from "./CompactNumber";
import { getLocalDateString } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import {
  useDeleteMetricSnapshot,
  useSocialPostMetrics,
  useUpsertMetricSnapshot,
} from "@/hooks/useSocialMetrics";
import { LinkedInImportDialog } from "./LinkedInImportDialog";
import type { SocialPost } from "@/hooks/useSocialPosts";

const NUMERIC_FIELDS: Array<{ key: keyof MetricForm; label: string }> = [
  { key: "impressions", label: "Impressions" },
  { key: "reach", label: "Reach" },
  { key: "reactions", label: "Reactions" },
  { key: "comments", label: "Comments" },
  { key: "reposts", label: "Reposts" },
  { key: "saves", label: "Saves" },
  { key: "sends", label: "Sends" },
  { key: "link_clicks", label: "Link clicks" },
  { key: "profile_views", label: "Profile views" },
  { key: "followers_gained", label: "Followers gained" },
];

interface MetricForm {
  platform: SocialPlatform;
  metrics_as_of: string;
  impressions: string;
  reactions: string;
  comments: string;
  reposts: string;
  reach: string;
  profile_views: string;
  followers_gained: string;
  saves: string;
  sends: string;
  link_clicks: string;
}

function emptyForm(platform: SocialPlatform): MetricForm {
  return {
    platform,
    metrics_as_of: getLocalDateString(),
    impressions: "",
    reactions: "",
    comments: "",
    reposts: "",
    reach: "",
    profile_views: "",
    followers_gained: "",
    saves: "",
    sends: "",
    link_clicks: "",
  };
}

export function MetricsTab({ post }: { post: SocialPost }) {
  const { data: snapshots = [], isLoading } = useSocialPostMetrics(post.id);
  const upsert = useUpsertMetricSnapshot();
  const del = useDeleteMetricSnapshot();
  const [adding, setAdding] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<MetricForm>(() => emptyForm(post.platforms[0] ?? "linkedin"));

  const save = async () => {
    const numeric = (v: string) => (v === "" ? null : Number(v));
    await upsert.mutateAsync({
      post_id: post.id,
      platform: form.platform,
      metrics_as_of: form.metrics_as_of,
      impressions: numeric(form.impressions),
      reactions: numeric(form.reactions),
      comments: numeric(form.comments),
      reposts: numeric(form.reposts),
      reach: numeric(form.reach),
      profile_views: numeric(form.profile_views),
      followers_gained: numeric(form.followers_gained),
      saves: numeric(form.saves),
      sends: numeric(form.sends),
      link_clicks: numeric(form.link_clicks),
    });
    toast.success("Snapshot saved");
    setAdding(false);
    setForm(emptyForm(post.platforms[0] ?? "linkedin"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
        </div>
        <div className="flex gap-2">
          {post.platforms.includes("linkedin") && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import LinkedIn .xlsx
            </Button>
          )}
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add snapshot
          </Button>
        </div>
      </div>

      {adding && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm({ ...form, platform: v as SocialPlatform })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(post.platforms.length > 0 ? post.platforms : (["linkedin"] as SocialPlatform[])).map((p) => (
                    <SelectItem key={p} value={p}>{PLATFORM_META[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>As of date</Label>
              <Input
                type="date"
                value={form.metrics_as_of}
                onChange={(e) => setForm({ ...form, metrics_as_of: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NUMERIC_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  value={form[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder="—"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save snapshot
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">Loading…</Card>
      ) : snapshots.length === 0 && !adding ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No snapshots yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {snapshots.map((s) => {
            const Icon = PLATFORM_META[s.platform].icon;
            return (
              <Card key={s.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", PLATFORM_META[s.platform].color)} />
                    <span className="text-sm font-medium">{format(new Date(s.metrics_as_of), "d MMM yyyy")}</span>
                    <span className="text-xs text-muted-foreground">· ER {formatEngagementRate(s.engagement_rate)}</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)} aria-label="Delete snapshot">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {NUMERIC_FIELDS.map(({ key, label }) => {
                    const v = s[key as keyof typeof s] as number | null;
                    if (v == null) return null;
                    return (
                      <div key={key} className="flex justify-between border-b border-dashed border-border/50 pb-0.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="tabular-nums font-medium">{formatCompact(v)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <LinkedInImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultPostId={post.id}
        defaultUrl={post.live_url ?? ""}
      />
    </div>
  );
}
