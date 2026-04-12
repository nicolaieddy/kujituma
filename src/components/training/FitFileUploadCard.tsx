import { useRef, useState } from "react";
import { Upload, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFitFileUpload, type FitUploadResult } from "@/hooks/useFitFileUpload";
import { cn } from "@/lib/utils";

export function FitFileUploadCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadMultipleFitFiles, isUploading, progress } = useFitFileUpload();
  const [results, setResults] = useState<FitUploadResult[]>([]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setResults([]);
    const res = await uploadMultipleFitFiles(files);
    setResults(res);
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
            <CardTitle className="text-base">Bulk .FIT Upload</CardTitle>
            <CardDescription>
              Select multiple .fit files — each will be auto-matched to the correct workout by date
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {results.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
              Upload Results
            </p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {r.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                )}
                <span className={cn("truncate", !r.success && "text-destructive")}>
                  {r.fileName}
                </span>
                {r.success && r.summary && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {r.summary.activity_type} · {r.summary.laps_count} laps
                  </span>
                )}
                {!r.success && (
                  <span className="ml-auto shrink-0 text-xs text-destructive/80 truncate max-w-[200px]">
                    {r.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[12px] text-muted-foreground/60">
          Each file's date is read from the activity data and automatically matched to the corresponding training plan workout. Supports Garmin, Wahoo, Coros, Polar, and other ANT+/BLE devices. Max 20MB per file.
        </p>
      </CardContent>
    </Card>
  );
}
