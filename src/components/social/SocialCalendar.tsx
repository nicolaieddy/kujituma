import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
  parseISO,
} from "date-fns";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { PLATFORM_META } from "@/lib/social";
import { cn } from "@/lib/utils";

interface Props {
  onOpenPost: (id: string) => void;
}

export function SocialCalendar({ onOpenPost }: Props) {
  const { data: posts = [] } = useSocialPosts();
  const [cursor, setCursor] = useState<Date>(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map: Record<string, typeof posts> = {};
    for (const p of posts) {
      if (!p.publish_date) continue;
      (map[p.publish_date] ??= []).push(p);
    }
    return map;
  }, [posts]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{format(cursor, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const items = byDay[key] ?? [];
          const inMonth = isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={cn(
                "min-h-[88px] border border-border rounded-md p-1.5 space-y-1 text-xs",
                !inMonth && "bg-muted/30 text-muted-foreground",
                today && "ring-1 ring-primary",
              )}
            >
              <div className="text-[10px] tabular-nums">{format(day, "d")}</div>
              {items.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOpenPost(p.id)}
                  className="w-full text-left truncate px-1 py-0.5 rounded hover:bg-muted text-[10px]"
                  style={{
                    borderLeft: `3px solid ${p.platforms[0] ? PLATFORM_META[p.platforms[0]].hex : "hsl(var(--muted))"}`,
                  }}
                >
                  {p.title || "Untitled"}
                </button>
              ))}
              {items.length > 3 && (
                <div className="text-[10px] text-muted-foreground">+{items.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
