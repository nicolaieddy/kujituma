import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Star, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["media_mentions"]["Row"];

export default function PublicPress() {
  const { userId } = useParams<{ userId: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("media_mentions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .eq("status", "Published")
        .order("date", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [userId]);

  const grouped = useMemo(() => {
    const map = new Map<number, Row[]>();
    for (const r of rows) {
      const y = r.year;
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(r);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([year, items]) => ({
      year,
      items: items.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.date > b.date ? -1 : 1;
      }),
    }));
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Newspaper className="h-4 w-4" />
            <span>Press</span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Selected media mentions</h1>
        </header>

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="text-muted-foreground text-sm">No public mentions yet.</div>
        ) : (
          <div className="space-y-12">
            {grouped.map(({ year, items }) => (
              <section key={year}>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{year}</h2>
                <ul className="space-y-5">
                  {items.map((m) => (
                    <li key={m.id} className="group">
                      <div className="flex items-start gap-3">
                        {m.featured && <Star className="h-4 w-4 fill-amber-400 text-amber-400 mt-1 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <a
                              href={m.url ?? m.archived_url ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-base hover:underline underline-offset-4 inline-flex items-center gap-1.5"
                            >
                              {m.title}
                              {(m.url || m.archived_url) && <ExternalLink className="h-3.5 w-3.5 opacity-50" />}
                            </a>
                            <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                          </div>
                          <div className="mt-0.5 text-sm text-muted-foreground">
                            {m.outlet}{m.outlet && " · "}{m.date}
                          </div>
                          {m.summary && <p className="mt-1.5 text-sm leading-relaxed">{m.summary}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
