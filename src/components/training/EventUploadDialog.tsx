import { useMemo, useRef, useState } from "react";
import { Upload, Loader2, X, FileText, ImageIcon, Activity, Sparkles, Plus, Trash2, Check, CheckCircle2, AlertCircle, CircleDashed } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTrainingEvents, type TrainingEventType } from "@/hooks/useTrainingEvents";
import { parseLocalDate } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

const STORAGE_BUCKET = "fit-files";
const MAX_FILES = 10;
const MAX_PER_FILE = 25 * 1024 * 1024;

type Stage = "pick" | "analyzing" | "confirm" | "committing";

type FileStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "moving"
  | "parsing_fit"
  | "saving"
  | "done"
  | "failed";

interface FileProgress {
  status: FileStatus;
  message?: string;
}

interface PickedFile {
  id: string;
  file: File;
}

interface AnalyzedFile {
  client_id?: string;
  file_path: string;
  file_name: string;
  mime_type?: string;
  size_bytes?: number;
  kind: "fit" | "document" | "image" | "other" | "note";
  description_md: string;
  summary: string;
  error: string | null;
}

interface Candidate {
  event_id: string;
  title: string;
  start_date: string;
  event_type: TrainingEventType;
  score: number;
}

interface Proposal {
  id: string;
  decision: "new" | "attach";
  selected_event_id?: string;
  files: AnalyzedFile[];
  proposed_event: {
    event_type: TrainingEventType;
    title: string;
    start_date: string;
    end_date?: string | null;
    body_part?: string | null;
    severity?: number | null;
    race_distance?: string | null;
    race_result?: string | null;
    race_priority?: "A" | "B" | "C" | null;
    location?: string | null;
    summary?: string;
    description?: string;
  };
  match: {
    event_id: string;
    title: string;
    start_date: string;
    event_type: TrainingEventType;
    confidence: "high" | "medium" | "low";
  } | null;
  candidates: Candidate[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventUploadDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: allEvents = [] } = useTrainingEvents();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("pick");
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [progress, setProgress] = useState<Record<string, FileProgress>>({});

  const setFileProgress = (id: string, status: FileStatus, message?: string) =>
    setProgress((prev) => ({ ...prev, [id]: { status, message } }));

  const reset = () => {
    setStage("pick");
    setPicked([]);
    setProposals([]);
    setProgress({});
  };

  const handleClose = (next: boolean) => {
    if (!next && (stage === "analyzing" || stage === "committing")) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...picked];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_FILES) {
        toast.error(`Max ${MAX_FILES} files`);
        break;
      }
      if (f.size > MAX_PER_FILE) {
        toast.error(`${f.name} is too large (max 25MB)`);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file: f });
    }
    setPicked(next);
  };

  const removePicked = (id: string) => setPicked(picked.filter((p) => p.id !== id));

  const analyze = async () => {
    if (!user || picked.length === 0) return;
    setStage("analyzing");
    // Seed progress
    const initial: Record<string, FileProgress> = {};
    picked.forEach((p) => (initial[p.id] = { status: "queued" }));
    setProgress(initial);

    try {
      const batchId = crypto.randomUUID();
      const uploaded: {
        client_id: string;
        file_path: string;
        file_name: string;
        mime_type: string;
        size_bytes: number;
      }[] = [];

      await Promise.all(
        picked.map(async (pf) => {
          const { id, file } = pf;
          setFileProgress(id, "uploading");
          const safe = file.name.replace(/[^\w.\-]+/g, "_");
          const path = `${user.id}/event-uploads/${batchId}/${id}_${safe}`;
          const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { contentType: file.type || undefined, upsert: true });
          if (error) {
            setFileProgress(id, "failed", `Upload: ${error.message}`);
            return;
          }
          setFileProgress(id, "uploaded");
          uploaded.push({
            client_id: id,
            file_path: path,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
          });
        }),
      );

      if (uploaded.length === 0) {
        toast.error("No files could be uploaded");
        setStage("pick");
        return;
      }

      // Mark uploaded files as analyzing
      uploaded.forEach((u) => setFileProgress(u.client_id, "analyzing"));

      const { data, error } = await supabase.functions.invoke("analyze-event-uploads", {
        body: { files: uploaded.map(({ client_id, ...rest }) => rest) },
      });
      if (error) throw new Error(error.message);
      if (!data?.proposals) throw new Error("No proposals returned");

      // Match returned files back to client_ids by file_path (unique)
      const byPath = new Map(uploaded.map((u) => [u.file_path, u.client_id]));
      const ps: Proposal[] = data.proposals.map((p: any) => ({
        ...p,
        selected_event_id: p.match?.event_id,
        files: p.files.map((f: any) => ({ ...f, client_id: byPath.get(f.file_path) })),
      }));

      // Update per-file status from results
      for (const p of ps) {
        for (const f of p.files) {
          if (!f.client_id) continue;
          if (f.error) {
            setFileProgress(f.client_id, "failed", f.error);
          } else {
            setFileProgress(f.client_id, "done", f.summary || "Extracted");
          }
        }
      }

      setProposals(ps);
      setStage("confirm");
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't analyze files", { description: e.message });
      // Mark any still-analyzing as failed
      setProgress((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (next[k].status === "analyzing" || next[k].status === "uploaded") {
            next[k] = { status: "failed", message: e.message };
          }
        }
        return next;
      });
    }
  };

  const updateProposal = (id: string, patch: Partial<Proposal>) => {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };
  const updateProposedEvent = (id: string, patch: Partial<Proposal["proposed_event"]>) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, proposed_event: { ...p.proposed_event, ...patch } } : p)),
    );
  };

  const commit = async () => {
    if (!user) return;
    setStage("committing");

    // Seed progress for all files in proposals
    const initial: Record<string, FileProgress> = {};
    for (const p of proposals) {
      for (const f of p.files) {
        if (f.client_id) initial[f.client_id] = { status: "queued" };
      }
    }
    setProgress(initial);

    let created = 0;
    let attached = 0;
    let filesCommitted = 0;

    try {
      for (const p of proposals) {
        // 1. Resolve target event_id
        let eventId: string;
        if (p.decision === "attach" && p.selected_event_id) {
          eventId = p.selected_event_id;
          attached++;
        } else {
          const e = p.proposed_event;
          const insertPayload: any = {
            user_id: user.id,
            event_type: e.event_type,
            title: e.title.trim() || "Untitled event",
            description: (e.description || e.summary || "").slice(0, 4000) || null,
            start_date: e.start_date,
            end_date: e.end_date || null,
            body_part: e.body_part || null,
            severity: e.severity ?? null,
            race_distance: e.race_distance || null,
            race_result: e.race_result || null,
            race_priority: e.race_priority || null,
            location: e.location || null,
          };
          const { data: ev, error: evErr } = await supabase
            .from("training_events")
            .insert(insertPayload)
            .select()
            .single();
          if (evErr) throw evErr;
          eventId = ev.id;
          created++;
        }

        // 2. Move each file, parse if needed, insert row
        for (const f of p.files) {
          if (f.error) {
            if (f.client_id) setFileProgress(f.client_id, "failed", f.error);
            continue;
          }
          const cid = f.client_id;
          try {
            if (cid) setFileProgress(cid, "moving");
            const ts = Date.now();
            const safe = f.file_name.replace(/[^\w.\-]+/g, "_");
            const dest = `${user.id}/event-attachments/${eventId}/${ts}_${safe}`;
            const { error: mvErr } = await supabase.storage
              .from(STORAGE_BUCKET)
              .move(f.file_path, dest);
            if (mvErr) throw new Error(`Move: ${mvErr.message}`);

            let synced_activity_id: string | null = null;
            if (f.kind === "fit") {
              if (cid) setFileProgress(cid, "parsing_fit");
              const { data: fitData, error: fitErr } = await supabase.functions.invoke(
                "parse-fit-file",
                {
                  body: {
                    file_path: dest,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  },
                },
              );
              if (fitErr) throw new Error(`Parse .fit: ${fitErr.message}`);
              synced_activity_id =
                fitData?.summary?.activity_id ?? fitData?.existing_activity?.id ?? null;
            }

            if (cid) setFileProgress(cid, "saving");
            const { error: insErr } = await supabase.from("training_event_attachments").insert({
              user_id: user.id,
              event_id: eventId,
              kind: f.kind,
              file_path: dest,
              file_name: f.file_name,
              mime_type: f.mime_type ?? null,
              size_bytes: f.size_bytes ?? null,
              synced_activity_id,
              description: f.description_md || null,
              extraction_status: f.kind === "fit" ? "skipped" : f.description_md ? "done" : "pending",
              extracted_at: f.description_md ? new Date().toISOString() : null,
            });
            if (insErr) throw new Error(`Save: ${insErr.message}`);
            filesCommitted++;

            // Append AI summary to existing event description
            if (p.decision === "attach" && f.summary) {
              const { data: ev } = await supabase
                .from("training_events")
                .select("description")
                .eq("id", eventId)
                .single();
              const existing = (ev?.description ?? "").trim();
              const stamp = `[AI · ${f.file_name}] ${f.summary}`;
              if (!existing.includes(`[AI · ${f.file_name}]`)) {
                const next = existing ? `${existing}\n\n${stamp}` : stamp;
                await supabase
                  .from("training_events")
                  .update({ description: next.slice(0, 4000) })
                  .eq("id", eventId);
              }
            }

            if (cid) setFileProgress(cid, "done", "Saved");
          } catch (fileErr: any) {
            console.error("file commit failed", fileErr);
            if (cid) setFileProgress(cid, "failed", fileErr.message);
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["training-events"] });
      qc.invalidateQueries({ queryKey: ["training-event-attachments"] });
      qc.invalidateQueries({ queryKey: ["synced-activities"] });
      qc.invalidateQueries({ queryKey: ["training-plan"] });

      const failedCount = Object.values(progress).filter((p) => p.status === "failed").length;
      if (filesCommitted > 0) {
        toast.success(
          `Saved ${filesCommitted} file${filesCommitted === 1 ? "" : "s"}`,
          {
            description: `${created} new event${created === 1 ? "" : "s"}, ${attached} attached to existing${
              failedCount ? ` · ${failedCount} failed` : ""
            }`,
          },
        );
      }

      // Keep dialog open briefly if there were failures so user can see them
      const anyFailed = Object.values(progress).some((p) => p.status === "failed");
      if (!anyFailed && filesCommitted > 0) {
        reset();
        onOpenChange(false);
      } else {
        // Stay in committing stage showing the per-file results; user closes manually
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Save failed", { description: e.message });
      setStage("confirm");
    }
  };

  const sortedAllEvents = useMemo(
    () => [...allEvents].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [allEvents],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upload & create event
          </DialogTitle>
          <DialogDescription>
            Drop in race results, doctor's notes, photos, or .fit files. AI extracts the details and
            suggests whether to attach to an existing event or create a new one.
          </DialogDescription>
        </DialogHeader>

        {stage === "pick" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium">Click to choose files</div>
              <div className="text-xs text-muted-foreground mt-1">
                PDF, images, .fit — up to {MAX_FILES} files, 25MB each
              </div>
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,image/*,.fit,.zip"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            {picked.length > 0 && (
              <div className="space-y-2">
                {picked.map((pf) => (
                  <div key={pf.id} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30">
                    <FileIcon name={pf.file.name} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{pf.file.name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatSize(pf.file.size)}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removePicked(pf.id)} aria-label="Remove">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {stage === "analyzing" && (
          <ProgressList
            title="Reading your files…"
            subtitle="Uploading and extracting structured data with AI."
            items={picked.map((pf) => ({
              id: pf.id,
              name: pf.file.name,
              size: pf.file.size,
              progress: progress[pf.id],
            }))}
          />
        )}

        {stage === "confirm" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {proposals.length === 1
                ? "Review the proposal and save."
                : `${proposals.length} event groups detected. Review each and save.`}
            </div>
            {proposals.map((p, idx) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                index={idx}
                allEvents={sortedAllEvents}
                onUpdate={(patch) => updateProposal(p.id, patch)}
                onUpdateEvent={(patch) => updateProposedEvent(p.id, patch)}
                onRemoveFile={(filePath) =>
                  updateProposal(p.id, { files: p.files.filter((f) => f.file_path !== filePath) })
                }
                onRemoveGroup={() => setProposals((prev) => prev.filter((x) => x.id !== p.id))}
              />
            ))}
          </div>
        )}

        {stage === "committing" && (
          <ProgressList
            title="Saving events and files…"
            subtitle="Creating events, moving files, parsing .fit data."
            items={proposals.flatMap((p) =>
              p.files
                .filter((f) => f.client_id)
                .map((f) => ({
                  id: f.client_id!,
                  name: f.file_name,
                  size: f.size_bytes,
                  progress: progress[f.client_id!],
                })),
            )}
          />
        )}

        <DialogFooter>
          {stage === "pick" && (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={analyze} disabled={picked.length === 0}>
                Analyze {picked.length > 0 && `(${picked.length})`}
              </Button>
            </>
          )}
          {stage === "confirm" && (
            <>
              <Button variant="ghost" onClick={reset}>Start over</Button>
              <Button onClick={commit} disabled={proposals.length === 0}>
                <Check className="h-4 w-4 mr-1.5" /> Save all
              </Button>
            </>
          )}
          {stage === "committing" &&
            allCommitsSettled(progress, proposals) && (
              <Button onClick={() => { reset(); onOpenChange(false); }}>Close</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProposalCard({
  proposal,
  index,
  allEvents,
  onUpdate,
  onUpdateEvent,
  onRemoveFile,
  onRemoveGroup,
}: {
  proposal: Proposal;
  index: number;
  allEvents: { id: string; title: string; start_date: string; event_type: TrainingEventType }[];
  onUpdate: (patch: Partial<Proposal>) => void;
  onUpdateEvent: (patch: Partial<Proposal["proposed_event"]>) => void;
  onRemoveFile: (filePath: string) => void;
  onRemoveGroup: () => void;
}) {
  const e = proposal.proposed_event;
  return (
    <Card className="p-4 space-y-3 border-l-4 border-l-primary/60">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Group {index + 1}
          {proposal.match && proposal.decision === "attach" && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              AI match · {proposal.match.confidence}
            </Badge>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={onRemoveGroup} aria-label="Skip group">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-1.5">
        {proposal.files.map((f) => (
          <div key={f.file_path} className="flex items-start gap-2 p-2 rounded bg-muted/40">
            <FileIcon name={f.file_name} kind={f.kind} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{f.file_name}</div>
              {f.error ? (
                <div className="text-[11px] text-destructive">⚠ {f.error}</div>
              ) : f.summary ? (
                <div className="text-xs text-muted-foreground line-clamp-2">{f.summary}</div>
              ) : (
                <div className="text-[11px] text-muted-foreground italic">No summary</div>
              )}
            </div>
            {proposal.files.length > 1 && (
              <Button size="icon" variant="ghost" onClick={() => onRemoveFile(f.file_path)} aria-label="Remove file">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Decision toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onUpdate({ decision: "new" })}
          className={cn(
            "flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors",
            proposal.decision === "new"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <Plus className="h-4 w-4 inline mr-1" /> Create new event
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ decision: "attach" })}
          disabled={allEvents.length === 0}
          className={cn(
            "flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors",
            proposal.decision === "attach"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border text-muted-foreground hover:text-foreground",
            allEvents.length === 0 && "opacity-50 cursor-not-allowed",
          )}
        >
          Attach to existing
        </button>
      </div>

      {proposal.decision === "new" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={e.event_type}
                onValueChange={(v) => onUpdateEvent({ event_type: v as TrainingEventType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="injury_illness">Injury / Illness</SelectItem>
                  <SelectItem value="race">Race</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start date</Label>
              <Input
                type="date"
                value={e.start_date}
                onChange={(ev) => onUpdateEvent({ start_date: ev.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={e.title}
              onChange={(ev) => onUpdateEvent({ title: ev.target.value })}
              maxLength={200}
            />
          </div>
          {e.event_type === "injury_illness" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Body part</Label>
                <Input
                  value={e.body_part ?? ""}
                  onChange={(ev) => onUpdateEvent({ body_part: ev.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Severity (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={e.severity ?? ""}
                  onChange={(ev) =>
                    onUpdateEvent({ severity: ev.target.value ? Number(ev.target.value) : null })
                  }
                />
              </div>
            </div>
          )}
          {e.event_type === "race" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Distance</Label>
                <Input
                  value={e.race_distance ?? ""}
                  onChange={(ev) => onUpdateEvent({ race_distance: ev.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Result</Label>
                <Input
                  value={e.race_result ?? ""}
                  onChange={(ev) => onUpdateEvent({ race_result: ev.target.value })}
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Location</Label>
            <Input
              value={e.location ?? ""}
              onChange={(ev) => onUpdateEvent({ location: ev.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs">Attach to</Label>
          <Select
            value={proposal.selected_event_id ?? ""}
            onValueChange={(v) => onUpdate({ selected_event_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick an event…" />
            </SelectTrigger>
            <SelectContent>
              {proposal.candidates.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Suggested matches
                  </div>
                  {proposal.candidates.map((c) => (
                    <SelectItem key={c.event_id} value={c.event_id}>
                      {c.title} · {format(parseLocalDate(c.start_date), "d MMM yyyy")}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-t mt-1">
                    All events
                  </div>
                </>
              )}
              {allEvents
                .filter((ev) => !proposal.candidates.some((c) => c.event_id === ev.id))
                .map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.title} · {format(parseLocalDate(ev.start_date), "d MMM yyyy")}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </Card>
  );
}

function FileIcon({ name, kind }: { name: string; kind?: string }) {
  const lower = name.toLowerCase();
  const isImg = kind === "image" || /\.(png|jpe?g|webp|gif|heic)$/.test(lower);
  const isFit = kind === "fit" || lower.endsWith(".fit") || lower.endsWith(".zip");
  if (isImg) return <ImageIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />;
  if (isFit) return <Activity className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />;
  return <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
