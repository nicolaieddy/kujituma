import { useRef, useState } from "react";
import { format } from "date-fns";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, Activity, File as FileIcon, ExternalLink, Loader2 } from "lucide-react";
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
  eventId: string;
}

export function EventAttachmentsSection({ eventId }: Props) {
  const { data: attachments = [], isLoading } = useEventAttachments(eventId);
  const upload = useUploadEventAttachment();
  const del = useDeleteEventAttachment();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<TrainingEventAttachment | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      await upload.mutateAsync({ eventId, file: files[i] }).catch(() => {});
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
          disabled={upload.isPending}
          className="gap-2"
        >
          {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {upload.isPending ? "Uploading…" : "Upload"}
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

      <p className="text-xs text-muted-foreground">
        .FIT files of races are parsed into your activity history. PDFs, doctor's notes, and images are stored privately for reference.
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
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-surface-1 hover:bg-surface-2 transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate" title={att.file_name}>{att.file_name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{KIND_META[att.kind].label}</Badge>
                    {att.size_bytes && <span>{formatSize(att.size_bytes)}</span>}
                    <span>{format(new Date(att.created_at), "d MMM")}</span>
                    {att.synced_activity_id && <span className="text-primary">• linked to activity</span>}
                  </div>
                </div>
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
