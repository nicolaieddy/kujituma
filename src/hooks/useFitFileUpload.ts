import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface FitUploadResult {
  fileName: string;
  success: boolean;
  summary?: any;
  error?: string;
}

export function useFitFileUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["synced-activities"] });
    queryClient.invalidateQueries({ queryKey: ["training-plan"] });
    queryClient.invalidateQueries({ queryKey: ["training-matched-activities"] });
    queryClient.invalidateQueries({ queryKey: ["activity-laps"] });
  };

  const uploadSingleFile = async (file: File, workoutId?: string): Promise<FitUploadResult> => {
    if (!user) return { fileName: file.name, success: false, error: "Not logged in" };

    if (!file.name.toLowerCase().endsWith(".fit")) {
      return { fileName: file.name, success: false, error: "Not a .fit file" };
    }
    if (file.size > 20 * 1024 * 1024) {
      return { fileName: file.name, success: false, error: "File too large (max 20MB)" };
    }

    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("fit-files")
      .upload(filePath, file);

    if (uploadError) {
      return { fileName: file.name, success: false, error: uploadError.message };
    }

    const { data, error } = await supabase.functions.invoke("parse-fit-file", {
      body: { file_path: filePath, workout_id: workoutId },
    });

    if (error) {
      return { fileName: file.name, success: false, error: error.message };
    }
    if (data?.error) {
      return { fileName: file.name, success: false, error: data.error };
    }

    return { fileName: file.name, success: true, summary: data.summary };
  };

  /** Upload a single .fit file (legacy API) */
  const uploadFitFile = async (file: File, workoutId?: string) => {
    if (!user) {
      toast.error("You must be logged in to upload files");
      return null;
    }

    setIsUploading(true);
    setProgress("Uploading file...");

    try {
      const result = await uploadSingleFile(file, workoutId);

      if (!result.success) {
        throw new Error(result.error);
      }

      invalidateQueries();

      toast.success("Activity imported successfully", {
        description: `${result.summary.activity_type} — ${result.summary.laps_count} laps recorded`,
      });

      return result.summary;
    } catch (err: any) {
      console.error("FIT upload error:", err);
      toast.error("Failed to import .fit file", { description: err.message });
      return null;
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  /** Upload multiple .fit files, auto-matching each to workouts by date */
  const uploadMultipleFitFiles = async (files: File[]): Promise<FitUploadResult[]> => {
    if (!user) {
      toast.error("You must be logged in to upload files");
      return [];
    }

    const fitFiles = files.filter(f => f.name.toLowerCase().endsWith(".fit"));
    if (fitFiles.length === 0) {
      toast.error("No .fit files selected");
      return [];
    }

    setIsUploading(true);
    const results: FitUploadResult[] = [];

    for (let i = 0; i < fitFiles.length; i++) {
      const file = fitFiles[i];
      setProgress(`Processing ${i + 1} of ${fitFiles.length}: ${file.name}`);

      const result = await uploadSingleFile(file);
      results.push(result);
    }

    invalidateQueries();

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (succeeded > 0 && failed === 0) {
      toast.success(`${succeeded} file${succeeded > 1 ? "s" : ""} imported`, {
        description: `All activities auto-matched to workouts by date`,
      });
    } else if (succeeded > 0 && failed > 0) {
      toast.warning(`${succeeded} imported, ${failed} failed`, {
        description: results.filter(r => !r.success).map(r => `${r.fileName}: ${r.error}`).join("; "),
      });
    } else {
      toast.error(`All ${failed} files failed to import`);
    }

    setIsUploading(false);
    setProgress(null);

    return results;
  };

  return { uploadFitFile, uploadMultipleFitFiles, isUploading, progress };
}
