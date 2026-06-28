import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MediaMention } from "@/hooks/media/useMedia";

interface Props {
  mentions: MediaMention[];
  pendingCount: number;
}

export function MediaDashboard({ mentions, pendingCount }: Props) {
  const stats = useMemo(() => {
    const byYear = new Map<number, number>();
    const byType = new Map<string, number>();
    const byOutlet = new Map<string, number>();
    let featured = 0;
    let needsUrl = 0;
    for (const m of mentions) {
      byYear.set(m.year, (byYear.get(m.year) ?? 0) + 1);
      byType.set(m.type, (byType.get(m.type) ?? 0) + 1);
      const outlet = (m.outlet || "—").trim();
      byOutlet.set(outlet, (byOutlet.get(outlet) ?? 0) + 1);
      if (m.featured) featured++;
      if (m.url_status === "needs-url") needsUrl++;
    }
    const yearData = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year: String(year), count }));
    const typeData = [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }));
    const outletData = [...byOutlet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([outlet, count]) => ({ outlet, count }));
    return { yearData, typeData, outletData, featured, needsUrl, total: mentions.length };
  }, [mentions]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total mentions" value={stats.total} />
        <StatCard label="Featured" value={stats.featured} />
        <StatCard label="Pending review" value={pendingCount} accent={pendingCount > 0} />
        <StatCard label="Needs URL" value={stats.needsUrl} accent={stats.needsUrl > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="By year">
          <BarChart data={stats.yearData}>
            <XAxis dataKey="year" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="By type">
          <BarChart data={stats.typeData} layout="vertical">
            <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis dataKey="type" type="category" fontSize={11} tickLine={false} axisLine={false} width={120} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Top outlets">
          <BarChart data={stats.outletData} layout="vertical">
            <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis dataKey="outlet" type="category" fontSize={11} tickLine={false} axisLine={false} width={120} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </Card>
  );
}
