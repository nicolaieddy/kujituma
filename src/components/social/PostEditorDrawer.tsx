import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  PLATFORM_META,
  STATUS_META,
  BOARD_ORDER,
  TRUST_CHECK_META,
  type SocialPlatform,
  type SocialStatus,
  type SocialTrustCheck,
} from "@/lib/social";
import {
  useDeleteSocialPost,
  useSocialPost,
  useUpsertSocialPost,
} from "@/hooks/useSocialPosts";
import { useSocialPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { MetricsTab } from "./MetricsTab";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  postId: string | null;
  onClose: () => void;
}

interface FormState {
  title: string;
  body: string;
  status: SocialStatus;
  platforms: SocialPlatform[];
  pillars: string[];
  publish_date: string;
  live_url: string;
  trust_check: SocialTrustCheck;
  hold: boolean;
  review_notes: string;
  retro: string;
  goal_id: string | null;
}

const emptyForm: FormState = {
  title: "",
  body: "",
  status: "idea",
  platforms: [],
  pillars: [],
  publish_date: "",
  live_url: "",
  trust_check: "not_checked",
  hold: false,
  review_notes: "",
  retro: "",
  goal_id: null,
};

export function PostEditorDrawer({ open, postId, onClose }: Props) {
  const { data: post } = useSocialPost(postId);
  const { data: settings = [] } = useSocialPlatformSettings();
  const upsert = useUpsertSocialPost();
  const del = useDeleteSocialPost();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [tab, setTab] = useState<"draft" | "metrics">("draft");

  useEffect(() => {
    if (!open) return;
    if (post) {
      setForm({
        title: post.title ?? "",
        body: post.body ?? "",
        status: post.status,
        platforms: post.platforms ?? [],
        pillars: post.pillars ?? [],
        publish_date: post.publish_date ?? "",
        live_url: post.live_url ?? "",
        trust_check: post.trust_check,
        hold: post.hold,
        review_notes: post.review_notes ?? "",
        retro: post.retro ?? "",
        goal_id: post.goal_id,
      });
    } else {
      setForm(emptyForm);
    }
    setTab("draft");
  }, [post, open, postId]);

  const enabledPlatforms = useMemo(
    () => settings.filter((s) => s.enabled).map((s) => s.platform),
    [settings],
  );

  const availablePillars = useMemo(() => {
    const set = new Set<string>();
    for (const s of settings) {
      if (form.platforms.length === 0 || form.platforms.includes(s.platform)) {
        s.pillars.forEach((p) => set.add(p));
      }
    }
    return Array.from(set).sort();
  }, [settings, form.platforms]);

  const togglePlatform = (p: SocialPlatform) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));

  const togglePillar = (p: string) =>
    setForm((f) => {
      if (f.pillars.includes(p)) return { ...f, pillars: f.pillars.filter((x) => x !== p) };
      if (f.pillars.length >= 2) {
        toast("Max 2 pillars per post");
        return f;
      }
      return { ...f, pillars: [...f.pillars, p] };
    });

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Add a title");
      return;
    }
    if (form.platforms.length === 0) {
      toast.error("Pick at least one platform");
      return;
    }
    const payload = {
      ...(post?.id ? { id: post.id } : {}),
      title: form.title.trim(),
      body: form.body || null,
      status: form.status,
      platforms: form.platforms,
      pillars: form.pillars,
      publish_date: form.publish_date || null,
      live_url: form.live_url.trim() || null,
      trust_check: form.trust_check,
      hold: form.hold,
      review_notes: form.review_notes || null,
      retro: form.retro || null,
      goal_id: form.goal_id,
    };
    const saved = await upsert.mutateAsync(payload as any);
    toast.success(post ? "Saved" : "Post created");
    // Keep drawer open after first save so user can add metrics
    if (!post && saved?.id) {
      // we created, switch to it via closing/reopening is awkward; just close.
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm("Delete this post and all its metrics?")) return;
    await del.mutateAsync(post.id);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <SheetTitle>{post ? "Edit post" : "New post"}</SheetTitle>
          <SheetDescription className="sr-only">Post draft and metrics</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-3 w-fit">
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="metrics" disabled={!post}>
              Metrics{post ? "" : " (save first)"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draft" className="flex-1 px-6 py-4 space-y-4 mt-0">
            <div className="space-y-1.5">
              <Label>Title / hook</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Working title or opening line"
                maxLength={200}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={8}
                placeholder="The post copy. Markdown is fine."
                maxLength={20000}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SocialStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BOARD_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Publish date</Label>
                <Input
                  type="date"
                  value={form.publish_date}
                  onChange={(e) => setForm({ ...form, publish_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Platforms</Label>
              {enabledPlatforms.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Enable a platform in Setup first.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {enabledPlatforms.map((p) => {
                    const Icon = PLATFORM_META[p].icon;
                    const active = form.platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" /> {PLATFORM_META[p].label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Pillars <span className="text-muted-foreground font-normal">(1, max 2)</span></Label>
              {availablePillars.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Add pillars in Setup for the selected platforms.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availablePillars.map((p) => {
                    const active = form.pillars.includes(p);
                    return (
                      <Badge
                        key={p}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => togglePillar(p)}
                      >
                        {p}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Live URL <span className="text-muted-foreground font-normal">(after publishing)</span></Label>
              <Input
                type="url"
                value={form.live_url}
                onChange={(e) => setForm({ ...form, live_url: e.target.value })}
                placeholder="https://…"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Trust check</Label>
                <Select value={form.trust_check} onValueChange={(v) => setForm({ ...form, trust_check: v as SocialTrustCheck })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TRUST_CHECK_META) as SocialTrustCheck[]).map((t) => (
                      <SelectItem key={t} value={t}>{TRUST_CHECK_META[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hold</Label>
                <div className="h-9 flex items-center gap-2">
                  <Switch checked={form.hold} onCheckedChange={(v) => setForm({ ...form, hold: v })} />
                  <span className="text-xs text-muted-foreground">Don't publish yet</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Review notes</Label>
              <Textarea
                value={form.review_notes}
                onChange={(e) => setForm({ ...form, review_notes: e.target.value })}
                rows={2}
                placeholder="Reviewer feedback, change requests"
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Retro <span className="text-muted-foreground font-normal">(after publishing)</span></Label>
              <Textarea
                value={form.retro}
                onChange={(e) => setForm({ ...form, retro: e.target.value })}
                rows={2}
                placeholder="What worked, what didn't — grounded in the numbers"
                maxLength={2000}
              />
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="flex-1 px-6 py-4 mt-0">
            {post && <MetricsTab post={post} />}
          </TabsContent>
        </Tabs>

        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between gap-2">
          <div>
            {post && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive gap-1">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {post ? "Save changes" : "Save post"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
