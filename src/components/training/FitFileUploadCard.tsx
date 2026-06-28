import { useState } from "react";
import { FileUp, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFitFileUpload, type FitUploadResult } from "@/hooks/useFitFileUpload";
import { cn } from "@/lib/utils";
import { SyncRunLogPanel } from "@/components/sync/SyncRunLogPanel";
import { ImportDropzone } from "@/components/shared/ImportDropzone";
import { createImportProgress, describeError } from "@/lib/importProgress";

export function FitFileUploadCard() {
  const { uploadMultipleFitFiles, isUploading, progress } = useFitFileUpload();
  const [results, setResults] = useState<FitUploadResult[]>([]);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setResults([]);
    const p = createImportProgress(`Uploading ${files.length} .fit file${files.length === 1 ? "" : "s"}…`);
    try {
      const res = await uploadMultipleFitFiles(files);
      setResults(res);
      const ok = res.filter((r) => r.success).length;
      const failed = res.length - ok;
      if (failed === 0) {
        p.success("Upload complete", `${ok} file${ok === 1 ? "" : "s"} imported`);
      } else if (ok === 0) {
        p.error("All uploads failed", `${failed} file${failed === 1 ? "" : "s"} couldn't be processed`);
      } else {
        p.warning("Upload finished with errors", `${ok} succeeded · ${failed} failed`);
      }
    } catch (e) {
      console.error("[fit-upload]", e);
      p.error("Upload failed", describeError(e));
    }
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
              Drop multiple .fit files — each is auto-matched to the correct workout by date
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ImportDropzone
          accept=".fit"
          multiple
          busy={isUploading}
          onFiles={handleFiles}
          label={isUploading ? (progress || "Processing…") : "Drop .fit files or click to browse"}
          hint="Garmin, Wahoo, Coros, Polar — auto-matched by activity date"
        />

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

        <SyncRunLogPanel provider="fit_upload" title=".FIT upload history" />
        <SyncRunLogPanel provider="sleep_csv" title="Sleep CSV import history" />
      </CardContent>
    </Card>
  );
}
