import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Activity,
  File as FileIcon,
  ExternalLink,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  useEventAttachments,
  useUploadEventAttachment,
  useDeleteEventAttachment,
  useReExtractAttachment,
  getAttachmentSignedUrl,
  type TrainingEventAttachment,
} from "@/hooks/useTrainingEventAttachments";

const KIND_META: Record<TrainingEventAttachment["kind"], { label: string; icon: typeof FileIcon }> = {
  fit: { label: ".FIT", icon: Activity },
  document: { label: "Doc", icon: FileText },
  image: { label: "Image", icon: ImageIcon },
  other: { label: "File", icon: FileIcon },
  note: { label: "Note", icon: FileText },
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  eventId: string | null;
  ensureEventId?: () => Promise<string | null>;
}

export function EventAttachmentsSection({ eventId, ensureEventId }: Props) {
  const upload = useUploadEventAttachment();
  const del = useDeleteEventAttachment();
  const reExtract = useReExtractAttachment();

  const { data: attachments = [], isLoading } = useEventAttachments(eventId ?? undefined);
  const anyProcessing = attachments.some((a) => a.extraction_status === "processing" || a.extraction_status === "pending");
  usePollWhile(anyProcessing, eventId ?? "");

  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<TrainingEventAttachment | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [resolving, setResolving] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let id = eventId;
    if (!id && ensureEventId) {
      setResolving(true);
      try {
        id = await ensureEventId();
      } finally {
        setResolving(false);
      }
    }
    if (!id) return;
    for (let i = 0; i < files.length; i++) {
      await upload.mutateAsync({ eventId: id, file: files[i] }).catch(() => {});
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const openAttachment = async (att: TrainingEventAttachment) => {
    if (!att.file_path) return;
    setOpeningId(att.id);
    const url = await getAttachmentSignedUrl(att.file_path);
    setOpeningId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{attachments.length}</Badge>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending || resolving}
          className="gap-2"
        >
          {upload.isPending || resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {resolving ? "Preparing…" : upload.isPending ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          accept=".fit,.zip,.pdf,.png,.jpg,.jpeg,.gif,.webp,.heic,.doc,.docx,.txt,.md,.rtf"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
        <span>
          .FIT race files are parsed into your activity history. PDFs and images (doctor's notes, scans) are
          automatically read by AI and summarized into this event.
        </span>
      </p>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-2">Loading…</div>
      ) : attachments.length === 0 ? (
        <Card className="p-3 text-center text-xs text-muted-foreground border-dashed">
          No attachments yet.
        </Card>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const Icon = KIND_META[att.kind].icon;
            const isOpen = !!expanded[att.id];
            const hasExtraction = att.kind !== "fit" && (att.extraction_status === "done" || att.extraction_status === "processing" || att.extraction_status === "failed");
            return (
              <div
                key={att.id}
                className="rounded-md border bg-surface-1 overflow-hidden"
              >
                <div className="flex items-center gap-2 p-2 hover:bg-surface-2 transition-colors">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate" title={att.file_name}>{att.file_name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{KIND_META[att.kind].label}</Badge>
                      {att.size_bytes && <span>{formatSize(att.size_bytes)}</span>}
                      <span>{format(new Date(att.created_at), "d MMM")}</span>
                      {att.synced_activity_id && <span className="text-primary">• linked to activity</span>}
                      <ExtractionBadge att={att} />
                    </div>
                  </div>
                  {hasExtraction && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setExpanded((p) => ({ ...p, [att.id]: !p[att.id] }))}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  )}
                  {att.file_path && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => openAttachment(att)}
                      disabled={openingId === att.id}
                      aria-label="Open"
                    >
                      {openingId === att.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmDelete(att)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {isOpen && hasExtraction && (
                  <div className="border-t bg-surface-2/50 p-3 space-y-2">
                    {att.extraction_status === "processing" && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI is reading this file…
                      </div>
                    )}
                    {att.extraction_status === "failed" && (
                      <div className="text-xs text-destructive flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                        <span>{att.extraction_error || "Extraction failed"}</span>
                      </div>
                    )}
                    {att.description && (
                      <div className="text-xs whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {att.description}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => reExtract.mutate(att)}
                        disabled={reExtract.isPending || att.extraction_status === "processing"}
                        className="gap-1.5 h-7 text-xs"
                      >
                        <RefreshCw className="h-3 w-3" /> Re-extract
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              The file will be deleted. If it's a .FIT linked to an activity, the activity itself stays in your history.
            </AlertDialogDescription>
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

function ExtractionBadge({ att }: { att: TrainingEventAttachment }) {
  if (att.kind === "fit" || att.kind === "note") return null;
  switch (att.extraction_status) {
    case "processing":
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 text-primary">
          <Loader2 className="h-3 w-3 animate-spin" /> reading…
        </span>
      );
    case "done":
      return (
        <span className="inline-flex items-center gap-1 text-primary">
          <Sparkles className="h-3 w-3" /> AI summary
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-destructive">
          <AlertCircle className="h-3 w-3" /> extraction failed
        </span>
      );
    default:
      return null;
  }
}

// Tiny inline polling hook to avoid an extra file
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
function usePollWhile(active: boolean, eventId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["training-event-attachments", eventId] });
    }, 3000);
    return () => clearInterval(i);
  }, [active, eventId, qc]);
}
