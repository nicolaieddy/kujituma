import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { useLatestMetricsByPost } from "@/hooks/useSocialMetrics";
import { PostCard } from "./PostCard";
import { STATUS_ORDER, STATUS_META } from "@/lib/social";

interface Props {
  onOpenPost: (id: string) => void;
  onCreate: () => void;
}

export function PipelineBoard({ onOpenPost, onCreate }: Props) {
  const { data: posts = [], isLoading } = useSocialPosts();
  const { data: latest = {} } = useLatestMetricsByPost();

  const grouped = useMemo(() => {
    const map: Record<string, typeof posts> = {};
    for (const s of STATUS_ORDER) map[s] = [];
    for (const p of posts) (map[p.status] ??= []).push(p);
    return map;
  }, [posts]);

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {STATUS_ORDER.map((status) => {
        const items = grouped[status];
        const meta = STATUS_META[status];
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {meta.label}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="border border-dashed border-border rounded-md p-4 text-center text-xs text-muted-foreground">
                  Empty
                </div>
              ) : (
                items.map((p) => (
                  <PostCard key={p.id} post={p} latestMetric={latest[p.id]} onClick={() => onOpenPost(p.id)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
