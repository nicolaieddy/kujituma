import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, FileArchive, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFitFileUpload, type FileUploadStatus } from "@/hooks/useFitFileUpload";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/components/thisweek/trainingPlanUtils";

interface BulkFitUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusIcon({ status }: { status: FileUploadStatus["status"] }) {
  switch (status) {
    case "queued":
      return <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />;
    case "uploading":
    case "parsing":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    case "duplicate":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  }
}

function statusLabel(s: FileUploadStatus["status"]): string {
  switch (s) {
    case "queued": return "Queued";
    case "uploading": return "Uploading...";
    case "parsing": return "Parsing...";
    case "duplicate": return "Duplicate found";
    case "done": return "Done";
    case "error": return "Failed";
  }
}

export function BulkFitUploadDialog({ open, onOpenChange }: BulkFitUploadDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const {
    uploadMultipleFitFiles,
    overwriteDuplicate,
    skipDuplicate,
    clearStatuses,
    isUploading,
    progress,
    fileStatuses,
  } = useFitFileUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    await uploadMultipleFitFiles(selectedFiles);
  };

  const handleClose = (newOpen: boolean) => {
    if (!isUploading) {
      if (!newOpen) {
        setSelectedFiles([]);
        clearStatuses();
      }
      onOpenChange(newOpen);
    }
  };

  const handleOverwrite = async (index: number) => {
    const file = selectedFiles[index];
    const dup = fileStatuses[index]?.duplicate;
    if (file && dup) {
      await overwriteDuplicate(index, file, dup.existing_activity.id);
    }
  };

  const hasResults = fileStatuses.length > 0;
  const hasDuplicates = fileStatuses.some(s => s.status === "duplicate");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            Bulk Upload Activities & Sleep
          </DialogTitle>
          <DialogDescription>
            Select .fit / .zip activity files or .csv sleep exports — each is auto-routed by file type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".fit,.zip,.csv"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />

          {!hasResults && (
            <>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                  : "Select .fit / .zip / .csv files"}
              </Button>

              {selectedFiles.length > 0 && (
                <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 max-h-40 overflow-y-auto">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <FileArchive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <Button className="w-full" onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {progress}
                    </>
                  ) : (
                    `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}`
                  )}
                </Button>
              )}
            </>
          )}

          {hasResults && (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {fileStatuses.map((fs, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3 space-y-2",
                    fs.status === "duplicate" && "border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/20",
                    fs.status === "error" && "border-destructive/30 bg-destructive/5",
                    fs.status === "done" && "border-border bg-card",
                    (fs.status === "queued" || fs.status === "uploading" || fs.status === "parsing") && "border-border bg-card",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon status={fs.status} />
                    <span className="text-sm font-medium truncate flex-1">{fs.fileName}</span>
                    <span className={cn(
                      "text-xs font-medium shrink-0",
                      fs.status === "done" && "text-emerald-600 dark:text-emerald-400",
                      fs.status === "error" && "text-destructive",
                      fs.status === "duplicate" && "text-amber-600 dark:text-amber-400",
                    )}>
                      {statusLabel(fs.status)}
                    </span>
                  </div>

                  {fs.status === "done" && fs.summary && (
                    <p className="text-xs text-muted-foreground pl-5">
                      {fs.summary.activity_type} · {fs.summary.laps_count} laps
                      {fs.summary.duration_seconds ? ` · ${formatDuration(fs.summary.duration_seconds)}` : ""}
                    </p>
                  )}

                  {fs.status === "error" && fs.error && (
                    <p className="text-xs text-destructive/80 pl-5">{fs.error}</p>
                  )}

                  {fs.status === "duplicate" && fs.duplicate && (
                    <div className="pl-5 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        An existing <strong>{fs.duplicate.existing_activity.activity_type}</strong> activity
                        ({fs.duplicate.existing_activity.source === "fit_upload" ? ".FIT" : "Strava"})
                        was found on this date with similar duration.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleOverwrite(i)}
                        >
                          Overwrite
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => skipDuplicate(i)}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasResults && !isUploading && !hasDuplicates && (
            <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
