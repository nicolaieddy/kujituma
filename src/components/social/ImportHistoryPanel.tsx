import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ExternalLink, FileSpreadsheet, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSocialImportHistory } from "@/hooks/useSocialImportHistory";
import { PLATFORM_META, type SocialPlatform } from "@/lib/social";

export function ImportHistoryPanel({ limit = 20 }: { limit?: number }) {
  const { data: rows = [], isLoading } = useSocialImportHistory(limit);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">Import history</h3>
        <span className="text-xs text-muted-foreground">Last {limit}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4">
          No imports yet. Drop a LinkedIn .xlsx export to get started.
        </p>
      ) : (
        <ul className="divide-y divide-border -mx-2">
          {rows.map((r) => {
            const meta = PLATFORM_META[r.platform as SocialPlatform];
            const Icon = meta?.icon ?? FileSpreadsheet;
            return (
              <li key={r.id} className="px-2 py-2.5 flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${meta?.color ?? "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={r.action === "created" ? "default" : "secondary"}
                      className="text-[10px] uppercase tracking-wide"
                    >
                      {r.action}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {r.kind === "linkedin_aggregate" ? "Aggregate" : "Single post"}
                    </span>
                    {r.file_name && (
                      <span className="text-[11px] text-muted-foreground truncate">· {r.file_name}</span>
                    )}
                  </div>
                  {r.post_url && (
                    <a
                      href={r.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-full"
                    >
                      <span className="truncate">{r.post_url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
