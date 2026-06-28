import { useMemo, useState, useEffect, useRef } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Rows3, Rows2, Check, X, CalendarClock } from "lucide-react";
import { useSocialPosts, useUpsertSocialPost, type SocialPost } from "@/hooks/useSocialPosts";
import { useLatestMetricsByPost } from "@/hooks/useSocialMetrics";
import { PostCard } from "./PostCard";
import { BOARD_ORDER, STATUS_META, toBoardStatus, type BoardStatus } from "@/lib/social";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onOpenPost: (id: string) => void;
  onCreate: () => void;
}

const DENSITY_KEY = "social.pipeline.density";

/** Build a `datetime-local`-friendly string for a given Date in local time. */
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
    // Combine existing date with a sensible default time (9:00 local).
    return `${post.publish_date}T09:00`;
  }
  // Default: tomorrow 09:00 local.
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
  useEffect(() => { localStorage.setItem(DENSITY_KEY, density); }, [density]);

  const [activeId, setActiveId] = useState<string | null>(null);
  // Local optimistic view so cards snap immediately on drop.
  const [localPosts, setLocalPosts] = useState<SocialPost[]>(posts);
  // Track the post id awaiting a publish_at before committing the move to Scheduled.
  // `originalStatus` is held so Cancel can revert in-place.
  const [pendingSchedule, setPendingSchedule] = useState<{
    postId: string;
    originalStatus: BoardStatus;
    value: string;
  } | null>(null);

  useEffect(() => {
    // Only sync from server when no pending edit is in flight (avoid clobbering UX).
    if (!pendingSchedule) setLocalPosts(posts);
  }, [posts, pendingSchedule]);

  const grouped = useMemo(() => {
    const map: Record<BoardStatus, SocialPost[]> = { idea: [], drafting: [], scheduled: [], published: [] };
    for (const p of localPosts) map[toBoardStatus(p.status)].push(p);
    return map;
  }, [localPosts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = (id: string): BoardStatus | null => {
    if ((BOARD_ORDER as string[]).includes(id)) return id as BoardStatus;
    const post = localPosts.find((p) => p.id === id);
    return post ? toBoardStatus(post.status) : null;
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to) return;

    const moved = localPosts.find((p) => p.id === activeId);
    if (!moved) return;

    if (from === to) {
      // reorder within column (display-only; ordering not persisted yet)
      const ids = grouped[from].map((p) => p.id);
      const oldIdx = ids.indexOf(activeId);
      const newIdx = ids.indexOf(overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reorderedIds = arrayMove(ids, oldIdx, newIdx);
      const reordered = reorderedIds.map((id) => grouped[from].find((p) => p.id === id)!);
      const others = localPosts.filter((p) => toBoardStatus(p.status) !== from);
      setLocalPosts([...others, ...reordered]);
      return;
    }

    // Cross-column move into Scheduled. If we don't yet have a publish_at,
    // park the card in Scheduled in a "pending" state and ask for date+time
    // inline before persisting. If we already have one, just move.
    if (to === "scheduled" && !moved.publish_at) {
      setLocalPosts((prev) => prev.map((p) => (p.id === activeId ? { ...p, status: "scheduled" } : p)));
      setPendingSchedule({
        postId: activeId,
        originalStatus: from,
        value: defaultScheduleValue(moved),
      });
      return;
    }

    // Default cross-column move — optimistic + persist.
    const newStatus: BoardStatus = to;
    setLocalPosts((prev) => prev.map((p) => (p.id === activeId ? { ...p, status: newStatus } : p)));
    upsert.mutate({
      id: moved.id,
      title: moved.title,
      status: newStatus,
    });
  };

  const cancelPending = () => {
    if (!pendingSchedule) return;
    const { postId, originalStatus } = pendingSchedule;
    setLocalPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: originalStatus } : p)));
    setPendingSchedule(null);
  };

  const confirmPending = async () => {
    if (!pendingSchedule) return;
    const { postId, value } = pendingSchedule;
    const moved = localPosts.find((p) => p.id === postId);
    if (!moved) {
      setPendingSchedule(null);
      return;
    }
    const dt = new Date(value);
    if (!value || isNaN(dt.getTime())) {
      toast.error("Pick a valid date and time");
      return;
    }
    const isoDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: "scheduled", publish_at: dt.toISOString(), publish_date: isoDate } : p)),
    );
    setPendingSchedule(null);
    upsert.mutate({
      id: moved.id,
      title: moved.title,
      status: "scheduled",
      publish_at: dt.toISOString(),
      publish_date: isoDate,
    });
  };

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

  const activePost = activeId ? localPosts.find((p) => p.id === activeId) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5">
          <button
            type="button"
            onClick={() => setDensity("compact")}
            className={cn(
              "h-7 px-2 rounded text-xs inline-flex items-center gap-1.5 transition-colors",
              density === "compact" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
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
              density === "comfortable" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={density === "comfortable"}
          >
            <Rows2 className="h-3.5 w-3.5" /> Comfortable
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BOARD_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              posts={grouped[status]}
              latest={latest}
              density={density}
              onOpenPost={onOpenPost}
              pendingSchedule={pendingSchedule}
              onPendingChange={(v) => setPendingSchedule((s) => (s ? { ...s, value: v } : s))}
              onConfirmPending={confirmPending}
              onCancelPending={cancelPending}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activePost ? (
            <div className="rotate-1 opacity-95">
              <PostCard
                post={activePost}
                latestMetric={latest[activePost.id]}
                onClick={() => {}}
                compact={density === "compact"}
                dragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  status, posts, latest, density, onOpenPost,
  pendingSchedule, onPendingChange, onConfirmPending, onCancelPending,
}: {
  status: BoardStatus;
  posts: SocialPost[];
  latest: Record<string, any>;
  density: "compact" | "comfortable";
  onOpenPost: (id: string) => void;
  pendingSchedule: { postId: string; originalStatus: BoardStatus; value: string } | null;
  onPendingChange: (v: string) => void;
  onConfirmPending: () => void;
  onCancelPending: () => void;
}) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col rounded-lg bg-muted/30 border border-border/60 min-h-[200px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            {meta.label}
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">{posts.length}</span>
      </div>

      <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 p-2 space-y-2 transition-colors rounded-b-lg",
            isOver && "bg-primary/5",
          )}
        >
          {posts.length === 0 ? (
            <div className="h-full min-h-[120px] flex items-center justify-center text-[11px] text-muted-foreground/70">
              Drop here
            </div>
          ) : (
            posts.map((p) =>
              pendingSchedule && pendingSchedule.postId === p.id && status === "scheduled" ? (
                <PendingScheduleCard
                  key={p.id}
                  post={p}
                  value={pendingSchedule.value}
                  onChange={onPendingChange}
                  onConfirm={onConfirmPending}
                  onCancel={onCancelPending}
                />
              ) : (
                <SortableCard
                  key={p.id}
                  post={p}
                  latestMetric={latest[p.id]}
                  density={density}
                  onOpenPost={onOpenPost}
                />
              ),
            )
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  post, latestMetric, density, onOpenPost,
}: {
  post: SocialPost;
  latestMetric: any;
  density: "compact" | "comfortable";
  onOpenPost: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // hide original; overlay shows during drag
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PostCard
        post={post}
        latestMetric={latestMetric}
        onClick={() => onOpenPost(post.id)}
        compact={density === "compact"}
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
  post, value, onChange, onConfirm, onCancel,
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
        onChange={(e) => { setTouched(true); onChange(e.target.value); }}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={showError ? `sched-err-${post.id}` : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setTouched(true);
            if (valid) onConfirm();
          }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
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
          onClick={() => { setTouched(true); if (valid) onConfirm(); }}
          disabled={!valid}
        >
          <Check className="h-3 w-3" /> Schedule
        </Button>
      </div>
    </Card>
  );
}
