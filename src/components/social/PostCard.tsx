import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Pause, ShieldAlert, GripVertical } from "lucide-react";
import { PLATFORM_META, formatEngagementRate, type SocialPlatform } from "@/lib/social";
import type { SocialPost } from "@/hooks/useSocialPosts";
import type { SocialPostMetric } from "@/hooks/useSocialMetrics";
import { cn } from "@/lib/utils";

interface Props {
  post: SocialPost;
  latestMetric?: SocialPostMetric;
  onClick: () => void;
  compact?: boolean;
  dragging?: boolean;
}

export function PostCard({ post, latestMetric, onClick, compact = false, dragging = false }: Props) {
  const accent = post.platforms[0] ? PLATFORM_META[post.platforms[0] as SocialPlatform].hex : "hsl(var(--muted))";

  return (
    <Card
      onClick={(e) => {
        // Don't fire when starting a drag — pointer sensor only triggers click if no drag.
        if (dragging) return;
        onClick();
      }}
      className={cn(
        "group p-2.5 cursor-grab active:cursor-grabbing transition-shadow border-l-2 bg-card",
        !dragging && "hover:shadow-sm",
        dragging && "shadow-lg",
      )}
      style={{ borderLeftColor: accent }}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="min-w-0 flex-1">
          <div className={cn("font-medium text-foreground", compact ? "text-xs line-clamp-1" : "text-sm line-clamp-2")}>
            {post.title || "Untitled"}
          </div>

          {!compact && post.body && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{post.body}</p>
          )}

          {/* Meta row */}
          <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "mt-1" : "mt-1.5")}>
            {post.platforms.slice(0, compact ? 2 : 3).map((pf) => {
              const Icon = PLATFORM_META[pf].icon;
              return (
                <span key={pf} className={cn("inline-flex items-center gap-1 text-[10px]", PLATFORM_META[pf].color)}>
                  <Icon className="h-3 w-3" />
                  {!compact && <span>{PLATFORM_META[pf].label}</span>}
                </span>
              );
            })}
            {!compact && post.pillars.slice(0, 2).map((p) => (
              <Badge key={p} variant="outline" className="text-[10px] font-normal h-4 px-1.5">
                {p}
              </Badge>
            ))}
            {post.hold && (
              <Badge variant="destructive" className="text-[10px] gap-1 h-4 px-1.5">
                <Pause className="h-2.5 w-2.5" /> Hold
              </Badge>
            )}
            {!compact && post.trust_check === "needs_work" && (
              <Badge variant="outline" className="text-[10px] gap-1 h-4 px-1.5 border-amber-400 text-amber-700">
                <ShieldAlert className="h-2.5 w-2.5" /> Trust
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className={cn("flex items-center justify-between text-[10px] text-muted-foreground tabular-nums", compact ? "mt-1" : "mt-1.5")}>
            <span>{post.publish_date ? format(new Date(post.publish_date), "d MMM") : "—"}</span>
            {latestMetric && (
              <span className="font-medium text-foreground/80">
                ER {formatEngagementRate(latestMetric.engagement_rate)}
              </span>
            )}
          </div>
        </div>

        {post.live_url && !compact && (
          <a
            href={post.live_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-muted-foreground/60 hover:text-foreground shrink-0"
            aria-label="Open live post"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </Card>
  );
}
