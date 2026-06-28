import { useMemo, useState } from "react";
import { ExternalLink, Star, Trash2, Pencil, Globe, Lock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchEmpty } from "@/components/illustrations";
import { URL_STATUS_COLOR, MEDIA_TYPES, MEDIA_STATUSES, MEDIA_URL_STATUSES, type MediaMention } from "@/hooks/media/useMedia";

interface Props {
  mentions: MediaMention[];
  onEdit: (m: MediaMention) => void;
  onDelete: (m: MediaMention) => void;
  loading?: boolean;
}

export function MediaTable({ mentions, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [urlStatus, setUrlStatus] = useState<string>("all");
  const [needsUrlOnly, setNeedsUrlOnly] = useState(false);
  const [sort, setSort] = useState<string>("date-desc");

  const relevanceScore = (m: MediaMention): number => {
    let s = 0;
    if (m.featured) s += 100;
    if (m.is_public) s += 25;
    if (m.status === "Published") s += 10;
    if (m.url_status === "verified") s += 15;
    else if (m.url_status === "needs-url" || m.url_status === "dead") s -= 10;
    if (m.summary) s += 5;
    s += Math.min((m.tags?.length ?? 0) * 2, 10);
    if (m.sentiment === "positive") s += 5;
    const days = (Date.now() - new Date(m.date).getTime()) / 86400000;
    s += Math.max(0, 30 - days / 30);
    return s;
  };

  const years = useMemo(() => {
    const set = new Set(mentions.map((m) => m.year));
    return [...set].sort((a, b) => b - a);
  }, [mentions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = mentions.filter((m) => {
      if (q && !(m.title.toLowerCase().includes(q) || (m.outlet ?? "").toLowerCase().includes(q) || (m.summary ?? "").toLowerCase().includes(q) || m.tags?.some((t) => t.toLowerCase().includes(q)))) return false;
      if (year !== "all" && String(m.year) !== year) return false;
      if (type !== "all" && m.type !== type) return false;
      if (status !== "all" && m.status !== status) return false;
      if (needsUrlOnly && m.url_status !== "needs-url") return false;
      if (urlStatus !== "all" && m.url_status !== urlStatus) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === "date-desc") sorted.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    else if (sort === "date-asc") sorted.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    else if (sort === "updated-desc") sorted.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    else if (sort === "relevance") sorted.sort((a, b) => relevanceScore(b) - relevanceScore(a));
    return sorted;
  }, [mentions, search, year, type, status, urlStatus, needsUrlOnly, sort]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search title, outlet, summary, tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <FilterSelect value={year} onChange={setYear} options={[["all", "All years"], ...years.map((y) => [String(y), String(y)] as [string, string])]} />
        <FilterSelect value={type} onChange={setType} options={[["all", "All types"], ...MEDIA_TYPES.map((t) => [t, t] as [string, string])]} />
        <FilterSelect value={status} onChange={setStatus} options={[["all", "All statuses"], ...MEDIA_STATUSES.map((s) => [s, s] as [string, string])]} />
        <FilterSelect value={urlStatus} onChange={setUrlStatus} options={[["all", "All link states"], ...MEDIA_URL_STATUSES.map((u) => [u, u] as [string, string])]} />
        <Button variant={needsUrlOnly ? "default" : "outline"} size="sm" onClick={() => setNeedsUrlOnly((v) => !v)}>
          Needs URL
        </Button>
        <FilterSelect value={sort} onChange={setSort} options={[["date-desc", "Newest first"], ["date-asc", "Oldest first"], ["updated-desc", "Recently updated"], ["relevance", "Relevance"]]} />
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} of {mentions.length}</div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Outlet</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => onEdit(m)}>
                <TableCell className="text-xs whitespace-nowrap">{m.date}</TableCell>
                <TableCell>
                  <div className="font-medium flex items-center gap-2">
                    {m.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    {m.is_public ? <Globe className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                    <span className="line-clamp-1">{m.title}</span>
                  </div>
                  {m.tags?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.tags.slice(0, 4).map((t) => <Badge key={t} variant="secondary" className="text-[10px] py-0">{t}</Badge>)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">{m.outlet}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{m.type}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{m.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${URL_STATUS_COLOR[m.url_status]}`}>{m.url_status}</span>
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No mentions match these filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
