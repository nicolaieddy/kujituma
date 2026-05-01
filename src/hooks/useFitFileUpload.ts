import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type UploadKind = "activity" | "sleep";

export interface FitUploadResult {
  fileName: string;
  success: boolean;
  kind: UploadKind;
  summary?: any;
  error?: string;
  /** Set when the server detects a duplicate — client must confirm overwrite (activity uploads only) */
  duplicate?: {
    existing_activity: any;
    new_activity: any;
  };
}

export type FileUploadStatus = {
  fileName: string;
  kind: UploadKind;
  status: "queued" | "uploading" | "parsing" | "duplicate" | "done" | "error";
  error?: string;
  summary?: any;
  duplicate?: FitUploadResult["duplicate"];
};

function detectKind(fileName: string): UploadKind | null {
  const n = fileName.toLowerCase();
  if (n.endsWith(".fit") || n.endsWith(".zip")) return "activity";
  if (n.endsWith(".csv")) return "sleep";
  return null;
}

export function useFitFileUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);

  const invalidateQueries = useCallback(async (kinds: Set<UploadKind>) => {
    const tasks: Promise<unknown>[] = [];
    if (kinds.has("activity")) {
      tasks.push(queryClient.invalidateQueries({ queryKey: ["synced-activities"], refetchType: "active" }));
      tasks.push(queryClient.invalidateQueries({ queryKey: ["training-plan"], refetchType: "active" }));
      tasks.push(queryClient.invalidateQueries({ queryKey: ["training-matched-activities"], refetchType: "active" }));
      tasks.push(queryClient.invalidateQueries({ queryKey: ["training-workout-activities"], refetchType: "active" }));
      tasks.push(queryClient.invalidateQueries({ queryKey: ["activity-laps"], refetchType: "active" }));
    }
    if (kinds.has("sleep")) {
      tasks.push(queryClient.invalidateQueries({ queryKey: ["sleep-entries"], refetchType: "active" }));
    }
    await Promise.all(tasks);
  }, [queryClient]);

  const updateFileStatus = (index: number, update: Partial<FileUploadStatus>) => {
    setFileStatuses(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  };

  const uploadAndParse = async (
    file: File,
    workoutId?: string,
    overwriteActivityId?: string
  ): Promise<FitUploadResult> => {
    const kind = detectKind(file.name);
    if (!user) return { fileName: file.name, success: false, kind: kind ?? "activity", error: "Not logged in" };

    if (!kind) {
      return { fileName: file.name, success: false, kind: "activity", error: "Must be a .fit, .zip, or .csv file" };
    }
    if (file.size > 20 * 1024 * 1024) {
      return { fileName: file.name, success: false, kind, error: "File too large (max 20MB)" };
    }

    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("fit-files")
      .upload(filePath, file);

    if (uploadError) {
      return { fileName: file.name, success: false, kind, error: uploadError.message };
    }

    const body: Record<string, any> = {
      file_path: filePath,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (kind === "activity") {
      if (workoutId) body.workout_id = workoutId;
      if (overwriteActivityId) body.overwrite_activity_id = overwriteActivityId;

      const { data, error } = await supabase.functions.invoke("parse-fit-file", { body });

      if (error) return { fileName: file.name, success: false, kind, error: error.message };
      if (data?.error) return { fileName: file.name, success: false, kind, error: data.error };
      if (data?.duplicate) {
        return {
          fileName: file.name,
          success: false,
          kind,
          duplicate: {
            existing_activity: data.existing_activity,
            new_activity: data.new_activity,
          },
        };
      }
      return { fileName: file.name, success: true, kind, summary: data.summary };
    }

    // Sleep CSV branch
    const { data, error } = await supabase.functions.invoke("parse-sleep-csv", { body });
    if (error) {
      // FunctionsHttpError exposes the response on error.context — read the JSON body for real error
      let serverMsg = error.message;
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          const j = await ctx.json();
          if (j?.error) serverMsg = j.error;
        }
      } catch { /* ignore */ }
      return { fileName: file.name, success: false, kind, error: serverMsg };
    }
    if (data?.error) return { fileName: file.name, success: false, kind, error: data.error };
    return { fileName: file.name, success: true, kind, summary: data.summary };
  };

  /** Upload a single .fit/.zip file (legacy API for per-workout upload) */
  const uploadFitFile = async (file: File, workoutId?: string) => {
    if (!user) {
      toast.error("You must be logged in to upload files");
      return null;
    }

    setIsUploading(true);
    setProgress("Uploading file...");

    try {
      setProgress("Parsing activity...");
      const result = await uploadAndParse(file, workoutId);

      if (result.duplicate) {
        setProgress("Overwriting existing...");
        const overwriteResult = await uploadAndParse(
          file,
          workoutId,
          result.duplicate.existing_activity.id
        );
        if (!overwriteResult.success) throw new Error(overwriteResult.error);
        await invalidateQueries(new Set([overwriteResult.kind]));
        toast.success("Activity replaced successfully", {
          description: `${overwriteResult.summary.activity_type} — ${overwriteResult.summary.laps_count} laps`,
        });
        return overwriteResult.summary;
      }

      if (!result.success) throw new Error(result.error);

      await invalidateQueries(new Set([result.kind]));
      toast.success("Activity imported successfully", {
        description: `${result.summary.activity_type} — ${result.summary.laps_count} laps recorded`,
      });
      return result.summary;
    } catch (err: any) {
      console.error("FIT upload error:", err);
      toast.error("Failed to import file", { description: err.message });
      return null;
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  /** Upload multiple files (.fit/.zip activities and/or .csv sleep) with per-file status tracking */
  const uploadMultipleFitFiles = async (files: File[]): Promise<FitUploadResult[]> => {
    if (!user) {
      toast.error("You must be logged in to upload files");
      return [];
    }

    const validFiles = files.filter(f => detectKind(f.name) !== null);
    if (validFiles.length === 0) {
      toast.error("No .fit, .zip, or .csv files selected");
      return [];
    }

    setIsUploading(true);

    const initialStatuses: FileUploadStatus[] = validFiles.map(f => ({
      fileName: f.name,
      kind: detectKind(f.name)!,
      status: "queued",
    }));
    setFileStatuses(initialStatuses);

    const results: FitUploadResult[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setProgress(`Processing ${i + 1} of ${validFiles.length}`);
      updateFileStatus(i, { status: "uploading" });

      const result = await uploadAndParse(file);

      if (result.duplicate) {
        updateFileStatus(i, { status: "duplicate", duplicate: result.duplicate });
        results.push(result);
      } else if (result.success) {
        updateFileStatus(i, { status: "done", summary: result.summary });
        results.push(result);
      } else {
        updateFileStatus(i, { status: "error", error: result.error });
        results.push(result);
      }
    }

    const kinds = new Set<UploadKind>(results.filter(r => r.success).map(r => r.kind));
    await invalidateQueries(kinds);

    const succeeded = results.filter(r => r.success).length;
    const dupes = results.filter(r => r.duplicate).length;
    const failed = results.filter(r => !r.success && !r.duplicate).length;

    if (succeeded > 0 && failed === 0 && dupes === 0) {
      toast.success(`${succeeded} file${succeeded > 1 ? "s" : ""} imported`);
    } else if (dupes > 0) {
      toast.info(`${succeeded} imported, ${dupes} duplicate${dupes > 1 ? "s" : ""} found — confirm below`);
    }

    setIsUploading(false);
    setProgress(null);

    return results;
  };

  /** Overwrite a specific duplicate — called after user confirms */
  const overwriteDuplicate = async (
    fileIndex: number,
    file: File,
    existingActivityId: string
  ) => {
    updateFileStatus(fileIndex, { status: "uploading" });

    const result = await uploadAndParse(file, undefined, existingActivityId);

    if (result.success) {
      updateFileStatus(fileIndex, { status: "done", summary: result.summary, duplicate: undefined });
      await invalidateQueries(new Set([result.kind]));
    } else {
      updateFileStatus(fileIndex, { status: "error", error: result.error, duplicate: undefined });
    }

    return result;
  };

  /** Mark a duplicate as skipped */
  const skipDuplicate = (fileIndex: number) => {
    updateFileStatus(fileIndex, { status: "done", duplicate: undefined });
  };

  const clearStatuses = () => setFileStatuses([]);

  return {
    uploadFitFile,
    uploadMultipleFitFiles,
    overwriteDuplicate,
    skipDuplicate,
    clearStatuses,
    isUploading,
    progress,
    fileStatuses,
  };
}
