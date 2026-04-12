import { useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFitFileUpload } from "@/hooks/useFitFileUpload";

interface FitUploadButtonProps {
  workoutId?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon" | "default";
  label?: string;
}

export function FitUploadButton({ workoutId, variant = "outline", size = "sm", label }: FitUploadButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFitFile, isUploading, progress } = useFitFileUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFitFile(file, workoutId);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".fit,.zip"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <Button
        variant={variant}
        size={size}
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
        className="gap-1.5"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progress || "Uploading..."}
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" />
            {label || "Upload .fit"}
          </>
        )}
      </Button>
    </>
  );
}
