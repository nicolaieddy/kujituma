import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { useSocialPosts, type SocialPost } from "@/hooks/useSocialPosts";
import { toBoardStatus } from "@/lib/social";
import { PLATFORM_META, type SocialPlatform } from "@/lib/social";

interface Props {
  onOpenPost: (id: string) => void;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDayHeader(d: Date) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = startOfDay(d);
  const isToday = day.getTime() === today.getTime();
  const isTomorrow = day.getTime() === tomorrow.getTime();
  const label = d.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "short" });
  if (isToday) return `Today · ${label}`;
  if (isTomorrow) return `Tomorrow · ${label}`;
  return label;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function ThisWeekQueue({ onOpenPost }: Props) {
  const { data: posts = [], isLoading } = useSocialPosts();

  const { groups, total } = useMemo(() => {
    const now = new Date();
    const start = startOfDay(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const scheduled = posts.filter((p) => {
      if (toBoardStatus(p.status) !== "scheduled") return false;
      const iso = p.publish_at ?? (p.publish_date ? `${p.publish_date}T09:00` : null);
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t < end.getTime();
    });

    const byDay = new Map<string, { date: Date; items: Array<{ post: SocialPost; when: Date }> }>();
    for (const p of scheduled) {
      const iso = p.publish_at ?? `${p.publish_date}T09:00`;
      const when = new Date(iso);
      const key = startOfDay(when).toISOString();
      if (!byDay.has(key)) byDay.set(key, { date: startOfDay(when), items: [] });
      byDay.get(key)!.items.push({ post: p, when });
    }

    const groups = Array.from(byDay.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((g) => ({ ...g, items: g.items.sort((a, b) => a.when.getTime() - b.when.getTime()) }));

    return { groups, total: scheduled.length };
  }, [posts]);

  if (isLoading) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">This week's queue</h3>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {total} scheduled · next 7 days
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="text-xs text-muted-foreground py-3 text-center">
          Nothing scheduled for the next 7 days.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.date.toISOString()} className="space-y-1.5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {fmtDayHeader(g.date)}
              </div>
              <ul className="divide-y divide-border/60 rounded-md border border-border/60 overflow-hidden">
                {g.items.map(({ post, when }) => (
                  <li key={post.id}>
                    <button
                      type="button"
                      onClick={() => onOpenPost(post.id)}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 text-left transition-colors"
                    >
                      <span className="text-xs tabular-nums text-muted-foreground w-12 shrink-0">
                        {fmtTime(when)}
                      </span>
                      <span className="flex-1 text-sm text-foreground line-clamp-1">
                        {post.title || "Untitled"}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {(post.platforms ?? []).map((pl) => {
                          const meta = PLATFORM_META[pl as SocialPlatform];
                          if (!meta) return null;
                          const Icon = meta.icon;
                          return <Icon key={pl} className={`h-3.5 w-3.5 ${meta.color}`} />;
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
