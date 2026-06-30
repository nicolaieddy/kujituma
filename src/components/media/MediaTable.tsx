import { useMemo, useState } from "react";
import { ExternalLink, Star, Trash2, Pencil, Globe, Lock, Loader2, X, Info, Check, ChevronDown, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchEmpty } from "@/components/illustrations";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { URL_STATUS_COLOR, MEDIA_TYPES, MEDIA_STATUSES, MEDIA_URL_STATUSES, useUpdateMention, type MediaMention } from "@/hooks/media/useMedia";
import { toast } from "sonner";

interface Props {
  mentions: MediaMention[];
  onEdit: (m: MediaMention) => void;
  onDelete: (m: MediaMention) => void;
  loading?: boolean;
}

export function MediaTable({ mentions, onEdit, onDelete, loading = false }: Props) {
  const [search, setSearch] = useState("");
  const updateMention = useUpdateMention();
  const [year, setYear] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [urlStatus, setUrlStatus] = useState<string>("all");
  const [needsUrlOnly, setNeedsUrlOnly] = useState(false);
  const [sort, setSort] = useState<string>("date-desc");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  const allTags = useMemo(() => {
    const set = new Set(mentions.flatMap((m) => m.tags ?? []));
    return [...set].sort((a, b) => a.localeCompare(b));
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
      if (selectedTags.length > 0 && !selectedTags.every((t) => m.tags?.includes(t))) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === "date-desc") sorted.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    else if (sort === "date-asc") sorted.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    else if (sort === "updated-desc") sorted.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    else if (sort === "relevance") sorted.sort((a, b) => relevanceScore(b) - relevanceScore(a));
    return sorted;
  }, [mentions, search, year, type, status, urlStatus, needsUrlOnly, selectedTags, sort]);

  const sortLabels: Record<string, string> = {
    "date-desc": "Newest first",
    "date-asc": "Oldest first",
    "updated-desc": "Recently updated",
    "relevance": "Relevance",
  };

  const activeFilters = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = [];
    if (search.trim()) {
      pills.push({ key: "search", label: `Search: ${search.trim()}`, onRemove: () => setSearch("") });
    }
    if (year !== "all") {
      pills.push({ key: "year", label: `Year: ${year}`, onRemove: () => setYear("all") });
    }
    if (type !== "all") {
      pills.push({ key: "type", label: `Type: ${type}`, onRemove: () => setType("all") });
    }
    if (status !== "all") {
      pills.push({ key: "status", label: `Status: ${status}`, onRemove: () => setStatus("all") });
    }
    if (urlStatus !== "all") {
      pills.push({ key: "urlStatus", label: `Link: ${urlStatus}`, onRemove: () => setUrlStatus("all") });
    }
    if (needsUrlOnly) {
      pills.push({ key: "needsUrl", label: "Needs URL", onRemove: () => setNeedsUrlOnly(false) });
    }
    selectedTags.forEach((tag) => {
      pills.push({ key: `tag-${tag}`, label: `Tag: ${tag}`, onRemove: () => setSelectedTags((prev) => prev.filter((t) => t !== tag)) });
    });
    if (sort !== "date-desc") {
      pills.push({ key: "sort", label: `Sort: ${sortLabels[sort]}`, onRemove: () => setSort("date-desc") });
    }
    return pills;
  }, [search, year, type, status, urlStatus, needsUrlOnly, selectedTags, sort]);

  const clearAll = () => {
    setSearch("");
    setYear("all");
    setType("all");
    setStatus("all");
    setUrlStatus("all");
    setNeedsUrlOnly(false);
    setSelectedTags([]);
    setSort("date-desc");
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search title, outlet, summary, tags…" value={search} onChange={(e) => setSearch(e.target.value)} disabled={loading} className="max-w-xs" />
        <FilterSelect value={year} onChange={setYear} options={[["all", "All years"], ...years.map((y) => [String(y), String(y)] as [string, string])]} disabled={loading} />
        <FilterSelect value={type} onChange={setType} options={[["all", "All types"], ...MEDIA_TYPES.map((t) => [t, t] as [string, string])]} disabled={loading} />
        <FilterSelect value={status} onChange={setStatus} options={[["all", "All statuses"], ...MEDIA_STATUSES.map((s) => [s, s] as [string, string])]} disabled={loading} />
        <FilterSelect value={urlStatus} onChange={setUrlStatus} options={[["all", "All link states"], ...MEDIA_URL_STATUSES.map((u) => [u, u] as [string, string])]} disabled={loading} />
        <Button variant={needsUrlOnly ? "default" : "outline"} size="sm" onClick={() => setNeedsUrlOnly((v) => !v)} disabled={loading}>
          Needs URL
        </Button>
        <TagFilter tags={allTags} selected={selectedTags} onChange={setSelectedTags} disabled={loading} />
        <FilterSelect value={sort} onChange={setSort} options={[["date-desc", "Newest first"], ["date-asc", "Oldest first"], ["updated-desc", "Recently updated"], ["relevance", "Relevance"]]} disabled={loading} />
        {sort === "relevance" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
                  disabled={loading}
                  aria-label="How relevance is calculated"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">Relevance scoring</p>
                <ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground">
                  <li>Featured mention: +100</li>
                  <li>Public mention: +25</li>
                  <li>Published status: +10</li>
                  <li>Verified URL: +15</li>
                  <li>Needs URL / dead URL: −10</li>
                  <li>Has summary: +5</li>
                  <li>Each tag: +2 (max 10)</li>
                  <li>Positive sentiment: +5</li>
                  <li>More recent: higher score</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{loading ? "Loading mentions…" : `${filtered.length} of ${mentions.length}`}</span>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Active:</span>
          {activeFilters.map((pill) => (
            <Badge key={pill.key} variant="secondary" className="gap-1 pr-1 pl-2.5 py-1 text-xs font-medium">
              {pill.label}
              <button
                type="button"
                onClick={pill.onRemove}
                disabled={loading}
                aria-label={`Remove ${pill.label}`}
                className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-secondary-foreground/10 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={clearAll} disabled={loading}>
            Clear all
          </Button>
        </div>
      )}

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
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24 mt-2" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>
                </TableRow>
              ))
            ) : (
              <>
                {filtered.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => onEdit(m)}>
                    <TableCell className="text-xs whitespace-nowrap">{m.date}</TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {m.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {m.is_public ? <Globe className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                        {m.url ? (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="line-clamp-1 hover:underline hover:text-primary"
                          >
                            {m.title}
                          </a>
                        ) : (
                          <span className="line-clamp-1">{m.title}</span>
                        )}
                      </div>
                      {m.tags?.length ? (
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                          {m.tags.slice(0, 4).map((t) => (
                            m.url ? (
                              <a
                                key={t}
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-normal text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                              >
                                #{t}
                              </a>
                            ) : (
                              <span key={t} className="text-[10px] font-normal text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-default">#{t}</span>
                            )
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{m.outlet}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.type}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.status}</Badge></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${URL_STATUS_COLOR[m.url_status]}`}
                              title="Change link state"
                            >
                              {m.url_status}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-44 p-1">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">Link state</div>
                            {MEDIA_URL_STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                disabled={updateMention.isPending}
                                onClick={() => {
                                  if (s === m.url_status) return;
                                  updateMention.mutate(
                                    { id: m.id, patch: { url_status: s } },
                                    {
                                      onSuccess: () => toast.success(`Marked as ${s}`),
                                      onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
                                    },
                                  );
                                  // close popover by blurring active element
                                  (document.activeElement as HTMLElement | null)?.blur?.();
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-muted transition-colors ${s === m.url_status ? "font-semibold" : ""}`}
                              >
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${URL_STATUS_COLOR[s]}`}>{s}</span>
                                {s === m.url_status && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
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
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        illustration={<SearchEmpty className="h-20 w-32" />}
                        title={mentions.length === 0 ? "No mentions yet" : "No mentions match these filters"}
                        description={
                          mentions.length === 0
                            ? "Add your first mention to start building your press portfolio."
                            : "Try adjusting your search, filters, or sort order to see more results."
                        }
                        size="md"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function FilterSelect({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function TagFilter({ tags, selected, onChange, disabled }: { tags: string[]; selected: string[]; onChange: (tags: string[]) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag];
    onChange(next);
  };
  const clear = () => onChange([]);
  const label = selected.length === 0 ? "All tags" : `${selected.length} tag${selected.length === 1 ? "" : "s"}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-9 gap-1.5 px-3">
          <Tag className="h-3.5 w-3.5" />
          <span>{label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <div className="p-3 border-b">
          <div className="text-sm font-medium">Filter by tags</div>
          <div className="text-xs text-muted-foreground">Select multiple tags to narrow results.</div>
        </div>
        {tags.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">No tags available.</div>
        ) : (
          <div className="max-h-60 overflow-y-auto p-2">
            {tags.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(tag)}
                  onCheckedChange={() => toggle(tag)}
                />
                <span className="text-sm">{tag}</span>
                {selected.includes(tag) && <Check className="h-3 w-3 ml-auto text-primary" />}
              </label>
            ))}
          </div>
        )}
        {selected.length > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={clear}>
              Clear tag filters
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
