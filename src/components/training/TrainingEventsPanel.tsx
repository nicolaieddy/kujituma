import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Activity, Trophy, Flag, AlertTriangle, Calendar as CalendarIcon, List, GitBranch, Upload, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useDeleteTrainingEvent,
  useTrainingEvents,
  useUpsertTrainingEvent,
  type TrainingEvent,
  type TrainingEventType,
} from "@/hooks/useTrainingEvents";
import { parseLocalDate, getLocalDateString } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import { TrainingEventsTimeline } from "./TrainingEventsTimeline";
import { EventAttachmentsSection } from "./EventAttachmentsSection";
import { EventUploadDialog } from "./EventUploadDialog";
import { BodyPartsPicker } from "./BodyPartsPicker";
import { Separator } from "@/components/ui/separator";
import {
  STANDARD_DISTANCES,
  RACE_DISTANCE_LABELS,
  isStandardRaceKey,
  parseTimeToSeconds,
  formatSecondsToTime,
  computeMedals,
  MEDAL_META,
} from "@/lib/racing";
import {
  SEVERITY_LABELS,
  ISSUE_CATEGORY_META,
  formatBodyParts,
  type BodyPartEntry,
  type IssueCategory,
} from "@/lib/bodyParts";

const TYPE_META: Record<TrainingEventType, { label: string; icon: typeof Activity; color: string }> = {
  injury_illness: { label: "Injury / Illness", icon: AlertTriangle, color: "text-destructive" },
  race: { label: "Race", icon: Trophy, color: "text-amber-500" },
  other: { label: "Other", icon: Flag, color: "text-primary" },
};

interface FormState {
  id?: string;
  event_type: TrainingEventType;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  severity: string;
  body_part: string;
  body_parts: BodyPartEntry[];
  issue_category: IssueCategory | "";
  race_distance: string;
  race_distance_custom: string;
  race_result: string;
  race_priority: "" | "A" | "B" | "C";
  official_time_input: string;
  strava_url: string;
  location: string;
}

function emptyForm(type: TrainingEventType = "injury_illness"): FormState {
  return {
    event_type: type,
    title: "",
    description: "",
    start_date: getLocalDateString(),
    end_date: "",
    severity: "",
    body_part: "",
    body_parts: [],
    issue_category: type === "injury_illness" ? "niggle" : "",
    race_distance: "",
    race_distance_custom: "",
    race_result: "",
    race_priority: "",
    official_time_input: "",
    strava_url: "",
    location: "",
  };
}

function eventToForm(e: TrainingEvent): FormState {
  const isStd = isStandardRaceKey(e.race_distance ?? "");
  return {
    id: e.id,
    event_type: e.event_type,
    title: e.title,
    description: e.description ?? "",
    start_date: e.start_date,
    end_date: e.end_date ?? "",
    severity: e.severity ? String(e.severity) : "",
    body_part: e.body_part ?? "",
    body_parts: Array.isArray(e.body_parts) ? e.body_parts : [],
    issue_category: (e.issue_category as IssueCategory) ?? (e.event_type === "injury_illness" ? "niggle" : ""),
    race_distance: isStd ? (e.race_distance as string) : (e.race_distance ? "__custom__" : ""),
    race_distance_custom: isStd ? "" : (e.race_distance ?? ""),
    race_result: e.race_result ?? "",
    race_priority: (e.race_priority as any) ?? "",
    official_time_input: formatSecondsToTime(e.official_time_seconds),
    strava_url: typeof (e.metadata as any)?.strava_url === "string" ? (e.metadata as any).strava_url : "",
    location: e.location ?? "",
  };
}

export function TrainingEventsPanel() {
  const { data: events = [], isLoading } = useTrainingEvents();
  const upsert = useUpsertTrainingEvent();
  const del = useDeleteTrainingEvent();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [pickingType, setPickingType] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<TrainingEventType | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.event_type === filter)),
    [events, filter],
  );

  const medals = useMemo(() => computeMedals(events), [events]);

  // Scroll to (and briefly highlight) a specific event when arriving via #event-<id>
  const scrolledRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#event-")) return;
    const id = hash.slice("#event-".length);
    if (!id || scrolledRef.current === id) return;
    const match = events.find((e) => e.id === id);
    if (!match) return;
    if (filter !== "all" && filter !== match.event_type) setFilter("all");
    requestAnimationFrame(() => {
      const el = document.getElementById(`event-${id}`);
      if (!el) return;
      scrolledRef.current = id;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-md");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-md");
      }, 2400);
    });
  }, [isLoading, events, filter]);


  const openNew = () => {
    setForm(emptyForm("injury_illness"));
    setPickingType(true);
    setDialogOpen(true);
  };
  const chooseType = (type: TrainingEventType) => {
    setForm(emptyForm(type));
    setPickingType(false);
  };
  const openEdit = (e: TrainingEvent) => {
    setForm(eventToForm(e));
    setPickingType(false);
    setDialogOpen(true);
  };

  const buildPayload = (state: FormState) => {
    const resolvedDistance =
      state.event_type === "race"
        ? state.race_distance === "__custom__"
          ? state.race_distance_custom.trim() || null
          : state.race_distance || null
        : null;
    const officialSec =
      state.event_type === "race" ? parseTimeToSeconds(state.official_time_input) : null;
    return {
      id: state.id,
      event_type: state.event_type,
      title: state.title.trim(),
      description: state.description.trim() || null,
      start_date: state.start_date,
      end_date: state.end_date || null,
      severity: state.severity ? Number(state.severity) : null,
      body_part: state.body_part.trim() || null,
      body_parts: state.event_type === "injury_illness" ? state.body_parts : [],
      issue_category: state.event_type === "injury_illness" ? (state.issue_category || null) : null,
      race_distance: resolvedDistance,
      race_result: state.race_result.trim() || null,
      race_priority: state.race_priority || null,
      official_time_seconds: officialSec,
      location: state.location.trim() || null,
      metadata: state.event_type === "race" && state.strava_url.trim()
        ? { strava_url: state.strava_url.trim() }
        : {},
    };
  };

  const submit = async () => {
    if (!form.title.trim() || !form.start_date) return;
    await upsert.mutateAsync(buildPayload(form));
    setDialogOpen(false);
  };

  // Used by the attachments section so the user can upload before manually saving.
  const ensureEventId = async (): Promise<string | null> => {
    if (form.id) return form.id;
    if (!form.start_date) return null;
    const titleToUse = form.title.trim() || defaultTitleForType(form.event_type);
    const saved = await upsert.mutateAsync(buildPayload({ ...form, title: titleToUse }));
    const newId = (saved as any)?.data?.id ?? null;
    if (newId) setForm((prev) => ({ ...prev, id: newId, title: titleToUse }));
    return newId;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Key Events</h2>
          <p className="text-sm text-muted-foreground">
            Log injuries, races, and milestones to enrich future training analysis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button onClick={() => openNew()} className="gap-2">
            <Plus className="h-4 w-4" /> Add event
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "injury_illness", "race", "other"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                filter === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All" : TYPE_META[t].label}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="List view"
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "timeline"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Timeline view"
          >
            <GitBranch className="h-3.5 w-3.5" /> Timeline
          </button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="text-sm text-muted-foreground">No events yet.</div>
          <Button variant="outline" onClick={() => openNew()} className="gap-2">
            <Plus className="h-4 w-4" /> Add your first event
          </Button>
        </Card>
      ) : (
        viewMode === "timeline" ? (
          <TrainingEventsTimeline
            events={filtered}
            onEdit={openEdit}
            onDelete={(id) => setConfirmDelete(id)}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => {
              const meta = TYPE_META[e.event_type];
              const Icon = meta.icon;
              const start = parseLocalDate(e.start_date);
              const end = e.end_date ? parseLocalDate(e.end_date) : null;
              const dateLabel = end
                ? `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`
                : format(start, "d MMM yyyy");
              return (
                <Card id={`event-${e.id}`} key={e.id} className="p-4 border-l-4 scroll-mt-24" style={{ borderLeftColor: "hsl(var(--primary))" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", meta.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold truncate">{e.title}</h3>
                          <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                          {isStandardRaceKey(e.race_distance) && (
                            <Badge variant="outline" className="text-[10px]">
                              {RACE_DISTANCE_LABELS[e.race_distance]}
                            </Badge>
                          )}
                          {medals[e.id] && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] border", MEDAL_META[medals[e.id]].className)}
                              title={`${MEDAL_META[medals[e.id]].label} for ${
                                isStandardRaceKey(e.race_distance) ? RACE_DISTANCE_LABELS[e.race_distance] : ""
                              }`}
                            >
                              {MEDAL_META[medals[e.id]].emoji} {MEDAL_META[medals[e.id]].label}
                            </Badge>
                          )}
                          {e.race_priority && (
                            <Badge variant="outline" className="text-[10px]">Priority {e.race_priority}</Badge>
                          )}
                          {e.issue_category && (
                            <Badge variant="outline" className="text-[10px]">
                              {ISSUE_CATEGORY_META[e.issue_category].label}
                            </Badge>
                          )}
                          {e.severity && (
                            <Badge variant="outline" className="text-[10px]">
                              Sev {e.severity}/5 · {SEVERITY_LABELS[e.severity].short}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 tabular-nums">{dateLabel}</div>
                        {e.description && (
                          <p className="text-sm mt-2 whitespace-pre-wrap">{e.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          {e.body_parts && e.body_parts.length > 0 ? (
                            <span>Body parts: {formatBodyParts(e.body_parts)}</span>
                          ) : e.body_part ? (
                            <span>Body part: {e.body_part}</span>
                          ) : null}
                          {e.race_distance && !isStandardRaceKey(e.race_distance) && (
                            <span>Distance: {e.race_distance}</span>
                          )}
                          {e.official_time_seconds != null && (
                            <span className="font-medium text-foreground">
                              Official time: {formatSecondsToTime(e.official_time_seconds)}
                            </span>
                          )}
                          {e.race_result && <span>Result: {e.race_result}</span>}
                          {e.location && <span>Location: {e.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmDelete(e.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit event" : "Add event"}</DialogTitle>
            <DialogDescription>Track key moments that affect your training.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.event_type}
                  onValueChange={(v) => {
                    const next = v as TrainingEventType;
                    setForm({
                      ...form,
                      event_type: next,
                      issue_category: next === "injury_illness" ? (form.issue_category || "niggle") : "",
                    });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injury_illness">Injury / Illness</SelectItem>
                    <SelectItem value="race">Race</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Left calf strain"
                  maxLength={200}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End date (optional)</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            {form.event_type === "injury_illness" && (
              <div className="space-y-4 rounded-md border bg-muted/20 p-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(ISSUE_CATEGORY_META) as IssueCategory[]).map((c) => {
                      const meta = ISSUE_CATEGORY_META[c];
                      const active = form.issue_category === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm({ ...form, issue_category: c })}
                          className={cn(
                            "rounded-md border p-2 text-left transition-colors",
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50",
                          )}
                        >
                          <div className="text-sm font-medium">{meta.label}</div>
                          <div className="text-[11px] text-muted-foreground leading-tight">
                            {meta.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Body parts</Label>
                  <BodyPartsPicker
                    value={form.body_parts}
                    onChange={(next) => setForm({ ...form, body_parts: next })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Add one or more. Try searching "leg", "back", "achilles"…
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Severity</Label>
                  <Select
                    value={form.severity}
                    onValueChange={(v) => setForm({ ...form, severity: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="How much is it affecting training?" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          <span className="font-medium">{n}.</span> {SEVERITY_LABELS[n].short}
                          <span className="text-muted-foreground"> — {SEVERITY_LABELS[n].help}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.event_type === "race" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Distance</Label>
                    <Select
                      value={form.race_distance || undefined}
                      onValueChange={(v) => setForm({ ...form, race_distance: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select distance" /></SelectTrigger>
                      <SelectContent>
                        {STANDARD_DISTANCES.map((s) => (
                          <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                        ))}
                        <SelectItem value="__custom__">Other (custom)</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.race_distance === "__custom__" && (
                      <Input
                        className="mt-2"
                        value={form.race_distance_custom}
                        onChange={(e) => setForm({ ...form, race_distance_custom: e.target.value })}
                        placeholder="e.g. 15K, Ultra 50K"
                        maxLength={100}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={form.race_priority}
                      onValueChange={(v) => setForm({ ...form, race_priority: v as any })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A — Peak</SelectItem>
                        <SelectItem value="B">B — Important</SelectItem>
                        <SelectItem value="C">C — Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Official time</Label>
                    <Input
                      value={form.official_time_input}
                      onChange={(e) => setForm({ ...form, official_time_input: e.target.value })}
                      placeholder="hh:mm:ss or mm:ss"
                      inputMode="numeric"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Chip/gun time — used to rank PB, silver, bronze across same-distance races.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Result note (optional)</Label>
                    <Input
                      value={form.race_result}
                      onChange={(e) => setForm({ ...form, race_result: e.target.value })}
                      placeholder="e.g. 5th overall, AG winner"
                      maxLength={200}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Strava race URL (optional)</Label>
                  <Input
                    type="url"
                    value={form.strava_url}
                    onChange={(e) => setForm({ ...form, strava_url: e.target.value })}
                    placeholder="https://www.strava.com/activities/123456789"
                    maxLength={300}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Paste the Strava activity link for this race. After saving, you can also upload the .fit file below to parse splits, HR, pace and elevation.
                  </p>
                </div>
              </>
            )}

            {form.event_type !== "injury_illness" && (
              <div className="space-y-1.5">
                <Label>Location (optional)</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  maxLength={200}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Context, how it happened, recovery plan, race conditions…"
                maxLength={2000}
              />
            </div>

            {form.id && (
              <>
                <Separator />
                <EventAttachmentsSection eventId={form.id} />
              </>
            )}
            {!form.id && (
              <p className="text-xs text-muted-foreground italic">
                Save the event first, then attach .fit files, doctor's notes, or photos.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.title.trim() || upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) await del.mutateAsync(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
