import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Pause, ShieldAlert } from "lucide-react";
import { PLATFORM_META, formatEngagementRate, type SocialPlatform } from "@/lib/social";
import type { SocialPost } from "@/hooks/useSocialPosts";
import type { SocialPostMetric } from "@/hooks/useSocialMetrics";
import { cn } from "@/lib/utils";

interface Props {
  post: SocialPost;
  latestMetric?: SocialPostMetric;
  onClick: () => void;
}

export function PostCard({ post, latestMetric, onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      className="p-3 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4"
      style={{ borderLeftColor: post.platforms[0] ? PLATFORM_META[post.platforms[0] as SocialPlatform].hex : "hsl(var(--muted))" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium line-clamp-2">{post.title || "Untitled"}</div>
          {post.body && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.body}</p>
          )}
        </div>
        {post.live_url && (
          <a
            href={post.live_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Open live post"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {post.platforms.map((pf) => {
          const Icon = PLATFORM_META[pf].icon;
          return (
            <span
              key={pf}
              className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/60", PLATFORM_META[pf].color)}
            >
              <Icon className="h-3 w-3" /> {PLATFORM_META[pf].label}
            </span>
          );
        })}
        {post.pillars.slice(0, 2).map((p) => (
          <Badge key={p} variant="outline" className="text-[10px] font-normal">
            {p}
          </Badge>
        ))}
        {post.hold && (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <Pause className="h-3 w-3" /> Hold
          </Badge>
        )}
        {post.trust_check === "needs_work" && (
          <Badge variant="outline" className="text-[10px] gap-1 border-amber-400 text-amber-700">
            <ShieldAlert className="h-3 w-3" /> Trust
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground tabular-nums">
        <span>{post.publish_date ? format(new Date(post.publish_date), "d MMM yyyy") : "—"}</span>
        {latestMetric && (
          <span className="font-medium text-foreground">
            ER {formatEngagementRate(latestMetric.engagement_rate)}
          </span>
        )}
      </div>
    </Card>
  );
}
