import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useFitFileUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const uploadFitFile = async (file: File, workoutId?: string) => {
    if (!user) {
      toast.error("You must be logged in to upload files");
      return null;
    }

    if (!file.name.toLowerCase().endsWith(".fit")) {
      toast.error("Please select a .fit file");
      return null;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return null;
    }

    setIsUploading(true);
    setProgress("Uploading file...");

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("fit-files")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress("Parsing .fit file...");

      const { data, error } = await supabase.functions.invoke("parse-fit-file", {
        body: { file_path: filePath, workout_id: workoutId },
      });

      if (error) {
        throw new Error(`Parse failed: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["synced-activities"] });
      queryClient.invalidateQueries({ queryKey: ["training-plan"] });

      toast.success("Activity imported successfully", {
        description: `${data.summary.activity_type} — ${data.summary.laps_count} laps recorded`,
      });

      return data.summary;
    } catch (err: any) {
      console.error("FIT upload error:", err);
      toast.error("Failed to import .fit file", { description: err.message });
      return null;
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  return { uploadFitFile, isUploading, progress };
}
