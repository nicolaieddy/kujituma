import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TrainingEventAttachment {
  id: string;
  event_id: string;
  user_id: string;
  kind: "fit" | "document" | "image" | "other" | "note";
  file_path: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  synced_activity_id: string | null;
  description: string | null;
  extraction_status: "pending" | "processing" | "done" | "failed" | "skipped";
  extracted_at: string | null;
  extraction_error: string | null;
  created_at: string;
}

const STORAGE_BUCKET = "fit-files";

function detectKind(fileName: string, mime?: string): TrainingEventAttachment["kind"] {
  const n = fileName.toLowerCase();
  if (n.endsWith(".fit") || n.endsWith(".zip")) return "fit";
  if (mime?.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/.test(n)) return "image";
  if (/\.(pdf|docx?|txt|md|rtf|odt)$/.test(n)) return "document";
  return "other";
}

export function useEventAttachments(eventId: string | undefined) {
  return useQuery({
    queryKey: ["training-event-attachments", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_event_attachments")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TrainingEventAttachment[];
    },
  });
}

export function useUploadEventAttachment() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, file }: { eventId: string; file: File }) => {
      if (!user) throw new Error("Not logged in");
      if (file.size > 25 * 1024 * 1024) throw new Error("File too large (max 25MB)");

      const kind = detectKind(file.name, file.type);
      const ts = Date.now();
      const filePath = `${user.id}/event-attachments/${eventId}/${ts}_${file.name}`;

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;

      let synced_activity_id: string | null = null;

      if (kind === "fit") {
        // Parse the .fit/.zip so metrics land in synced_activities too
        const { data, error } = await supabase.functions.invoke("parse-fit-file", {
          body: {
            file_path: filePath,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        if (error) throw new Error(error.message);
        if (data?.duplicate) {
          // Overwrite the existing activity automatically; user attaching to a race generally means same race
          const overwrite = await supabase.functions.invoke("parse-fit-file", {
            body: {
              file_path: filePath,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              overwrite_activity_id: data.existing_activity?.id,
            },
          });
          if (overwrite.error) throw new Error(overwrite.error.message);
          synced_activity_id = overwrite.data?.summary?.activity_id ?? data.existing_activity?.id ?? null;
        } else if (data?.error) {
          throw new Error(data.error);
        } else {
          synced_activity_id = data?.summary?.activity_id ?? null;
        }
      }

      const { data: row, error: insErr } = await supabase
        .from("training_event_attachments")
        .insert({
          user_id: user.id,
          event_id: eventId,
          kind,
          file_path: filePath,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          synced_activity_id,
          extraction_status: kind === "fit" ? "skipped" : "pending",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // Kick off AI extraction in the background for documents/images
      if (kind !== "fit") {
        supabase.functions
          .invoke("extract-event-attachment", { body: { attachment_id: row.id } })
          .then(() => {
            qc.invalidateQueries({ queryKey: ["training-event-attachments", eventId] });
            qc.invalidateQueries({ queryKey: ["training-events"] });
          })
          .catch((e) => console.error("extract-event-attachment failed", e));
      }

      return row as TrainingEventAttachment;
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["training-event-attachments", vars.eventId] });
      qc.invalidateQueries({ queryKey: ["synced-activities"] });
      qc.invalidateQueries({ queryKey: ["training-plan"] });
      toast.success("Attachment uploaded");
    },
    onError: (err: any) => {
      toast.error("Upload failed", { description: err.message });
    },
  });
}

export function useReExtractAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (att: TrainingEventAttachment) => {
      const { data, error } = await supabase.functions.invoke("extract-event-attachment", {
        body: { attachment_id: att.id },
      });
      if (error) throw new Error(error.message);
      return { att, data };
    },
    onSuccess: ({ att }) => {
      qc.invalidateQueries({ queryKey: ["training-event-attachments", att.event_id] });
      qc.invalidateQueries({ queryKey: ["training-events"] });
      toast.success("Extracted");
    },
    onError: (err: any) => toast.error("Extraction failed", { description: err.message }),
  });
}

export function useDeleteEventAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (att: TrainingEventAttachment) => {
      if (att.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([att.file_path]);
      }
      const { error } = await supabase
        .from("training_event_attachments")
        .delete()
        .eq("id", att.id);
      if (error) throw error;
      return att;
    },
    onSuccess: (att) => {
      qc.invalidateQueries({ queryKey: ["training-event-attachments", att.event_id] });
      toast.success("Attachment removed");
    },
    onError: (err: any) => toast.error("Delete failed", { description: err.message }),
  });
}

export async function getAttachmentSignedUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
