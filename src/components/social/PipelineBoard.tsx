import { useMemo, useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Rows3, Rows2, Check, X, CalendarClock } from "lucide-react";
import { useSocialPosts, useUpsertSocialPost, type SocialPost } from "@/hooks/useSocialPosts";
import { useLatestMetricsByPost } from "@/hooks/useSocialMetrics";
import { PostCard } from "./PostCard";
import { BOARD_ORDER, STATUS_META, toBoardStatus, type BoardStatus } from "@/lib/social";
import {
  KanbanBoard,
  type KanbanColumnDef,
  type RenderColumnBodyArgs,
} from "@/components/kanban/KanbanBoard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onOpenPost: (id: string) => void;
  onCreate: () => void;
}

const DENSITY_KEY = "social.pipeline.density";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleValue(post: SocialPost): string {
  if (post.publish_at) {
    const d = new Date(post.publish_at);
    if (!isNaN(d.getTime())) return toLocalInputValue(d);
  }
  if (post.publish_date) {
    return `${post.publish_date}T09:00`;
  }
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  return toLocalInputValue(t);
}

export function PipelineBoard({ onOpenPost, onCreate }: Props) {
  const { data: posts = [], isLoading } = useSocialPosts();
  const { data: latest = {} } = useLatestMetricsByPost();
  const upsert = useUpsertSocialPost();

  const [density, setDensity] = useState<"compact" | "comfortable">(() => {
    if (typeof window === "undefined") return "comfortable";
    return (localStorage.getItem(DENSITY_KEY) as any) ?? "comfortable";
  });
  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  // Pending schedule prompt — the moved post stays in the Scheduled column
  // optimistically (KanbanBoard handles that) while we ask for date+time.
  const [pendingSchedule, setPendingSchedule] = useState<{
    postId: string;
    originalStatus: BoardStatus;
    value: string;
  } | null>(null);

  // While a schedule prompt is open, freeze the source so the optimistic
  // placement isn't clobbered by a refetch.
  const frozenPostsRef = useRef<SocialPost[] | null>(null);
  if (pendingSchedule && !frozenPostsRef.current) {
    frozenPostsRef.current = posts.map((p) =>
      p.id === pendingSchedule.postId ? { ...p, status: "scheduled" } : p,
    );
  }
  if (!pendingSchedule && frozenPostsRef.current) {
    frozenPostsRef.current = null;
  }
  const sourcePosts = frozenPostsRef.current ?? posts;

  const columns: KanbanColumnDef<BoardStatus>[] = useMemo(
    () =>
      BOARD_ORDER.map((status) => ({
        id: status,
        title: STATUS_META[status].label,
        accentDot: "bg-foreground/40",
        emptyMessage: "Drop here",
      })),
    [],
  );

  const cancelPending = () => {
    setPendingSchedule(null);
  };

  const confirmPending = () => {
    if (!pendingSchedule) return;
    const { postId, value } = pendingSchedule;
    const moved = sourcePosts.find((p) => p.id === postId);
    if (!moved) {
      setPendingSchedule(null);
      return;
    }
    const dt = new Date(value);
    if (!value || isNaN(dt.getTime())) {
      toast.error("Pick a valid date and time");
      return;
    }
    const isoDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
      dt.getDate(),
    ).padStart(2, "0")}`;
    upsert.mutate({
      id: moved.id,
      title: moved.title,
      status: "scheduled",
      publish_at: dt.toISOString(),
      publish_date: isoDate,
    });
    setPendingSchedule(null);
  };

  const renderColumnBody = ({
    column,
    items,
    renderCard,
  }: RenderColumnBodyArgs<SocialPost, BoardStatus>) => (
    <div className="space-y-2">
      {items.map((p) =>
        pendingSchedule && pendingSchedule.postId === p.id && column.id === "scheduled" ? (
          <PendingScheduleCard
            key={p.id}
            post={p}
            value={pendingSchedule.value}
            onChange={(v) => setPendingSchedule((s) => (s ? { ...s, value: v } : s))}
            onConfirm={confirmPending}
            onCancel={cancelPending}
          />
        ) : (
          <div key={p.id}>{renderCard(p)}</div>
        ),
      )}
    </div>
  );

  if (isLoading) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>;
  }

  if (posts.length === 0) {
    return (
      <Card className="p-10 text-center space-y-3">
        <div className="text-sm text-muted-foreground">No posts yet.</div>
        <Button variant="outline" onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Create your first post
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5">
          <button
            type="button"
            onClick={() => setDensity("compact")}
            className={cn(
              "h-7 px-2 rounded text-xs inline-flex items-center gap-1.5 transition-colors",
              density === "compact"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={density === "compact"}
          >
            <Rows3 className="h-3.5 w-3.5" /> Compact
          </button>
          <button
            type="button"
            onClick={() => setDensity("comfortable")}
            className={cn(
              "h-7 px-2 rounded text-xs inline-flex items-center gap-1.5 transition-colors",
              density === "comfortable"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={density === "comfortable"}
          >
            <Rows2 className="h-3.5 w-3.5" /> Comfortable
          </button>
        </div>
      </div>

      <KanbanBoard<SocialPost, BoardStatus>
        columns={columns}
        items={sourcePosts}
        getId={(p) => p.id}
        getStatus={(p) => toBoardStatus(p.status)}
        gridClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        renderCard={(post, { dragging }) => (
          <PostCard
            post={post}
            latestMetric={latest[post.id]}
            onClick={() => onOpenPost(post.id)}
            compact={density === "compact"}
            dragging={dragging}
          />
        )}
        renderColumnBody={renderColumnBody}
        renderDragOverlay={(post) => (
          <div className="rotate-1 opacity-95">
            <PostCard
              post={post}
              latestMetric={latest[post.id]}
              onClick={() => {}}
              compact={density === "compact"}
              dragging
            />
          </div>
        )}
        onMove={(_id, from, to, item) => {
          // Intercept moves into Scheduled when no publish_at — prompt inline.
          if (to === "scheduled" && !item.publish_at) {
            setPendingSchedule({
              postId: item.id,
              originalStatus: from,
              value: defaultScheduleValue(item),
            });
            return false;
          }
          upsert.mutate({
            id: item.id,
            title: item.title,
            status: to,
          });
        }}
      />
    </div>
  );
}

function validateScheduleValue(value: string): { valid: boolean; error: string | null } {
  if (!value) return { valid: false, error: "Pick a date and time" };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { valid: false, error: "Invalid date or time" };
  if (d.getTime() < Date.now() - 60_000) return { valid: false, error: "Must be in the future" };
  return { valid: true, error: null };
}

function PendingScheduleCard({
  post,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  post: SocialPost;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const { valid, error } = validateScheduleValue(value);
  const showError = !valid && touched;

  return (
    <Card
      className={cn(
        "p-2.5 border-l-2 bg-card ring-2 animate-in fade-in-50 zoom-in-95",
        showError ? "border-l-destructive ring-destructive/30" : "border-l-violet-500 ring-violet-500/30",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
        <CalendarClock className="h-3 w-3" />
        <span>When should this go out?</span>
      </div>
      <div className="text-xs font-medium text-foreground line-clamp-1 mb-2">
        {post.title || "Untitled"}
      </div>
      <Input
        ref={inputRef}
        type="datetime-local"
        value={value}
        onChange={(e) => {
          setTouched(true);
          onChange(e.target.value);
        }}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={showError ? `sched-err-${post.id}` : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setTouched(true);
            if (valid) onConfirm();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className={cn(
          "h-8 text-xs",
          showError && "border-destructive focus-visible:ring-destructive",
        )}
      />
      {showError && (
        <p id={`sched-err-${post.id}`} className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-1.5 mt-2">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={onCancel}>
          <X className="h-3 w-3" /> Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => {
            setTouched(true);
            if (valid) onConfirm();
          }}
          disabled={!valid}
        >
          <Check className="h-3 w-3" /> Schedule
        </Button>
      </div>
    </Card>
  );
}
