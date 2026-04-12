import { useRef } from "react";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFitFileUpload } from "@/hooks/useFitFileUpload";

export function FitFileUploadCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFitFile, isUploading, progress } = useFitFileUpload();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadFitFile(file);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">.FIT File Upload</CardTitle>
            <CardDescription>
              Import workout data from Garmin, Wahoo, or other devices
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <input
          ref={fileRef}
          type="file"
          accept=".fit"
          multiple
          className="hidden"
          onChange={handleFiles}
          disabled={isUploading}
        />
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress || "Processing..."}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Select .fit files to upload
            </>
          )}
        </Button>
        <p className="mt-2 text-[12px] text-muted-foreground/60">
          Supports .fit files from Garmin, Wahoo, Coros, Polar, and other ANT+/BLE devices. Max 20MB per file.
        </p>
      </CardContent>
    </Card>
  );
}
