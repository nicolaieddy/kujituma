import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";

interface Props {
  marker: { key: string; label: string; values: { date: string; value: number; unit: string | null }[] };
  onClose: () => void;
}

export function LabMarkerSparkline({ marker, onClose }: Props) {
  const data = [...marker.values]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((v) => ({ ...v, label: format(parseLocalDate(v.date), "d MMM yy") }));

  const unit = marker.values.find((v) => v.unit)?.unit ?? "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {marker.label}
            {unit && <span className="text-muted-foreground font-normal text-sm ml-2">{unit}</span>}
          </DialogTitle>
        </DialogHeader>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No numeric values recorded yet.</p>
        ) : data.length === 1 ? (
          <div className="text-center py-8">
            <div className="text-3xl font-semibold tabular-nums">{data[0].value}</div>
            <div className="text-xs text-muted-foreground mt-1">{data[0].label}</div>
            <p className="text-xs text-muted-foreground mt-3">
              Record this marker in another panel to see a trend.
            </p>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
