import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { Loader2, FileText, Image as ImageIcon, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { ImportDropzone } from "@/components/shared/ImportDropzone";
import { createImportProgress, describeError } from "@/lib/importProgress";

interface ImportCoachPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: string;
}

type Mode = "text" | "image" | "document";

export function ImportCoachPlanDialog({ open, onOpenChange, weekStart }: ImportCoachPlanDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);

  const reset = () => { setText(""); setFiles([]); };

  const handleClose = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const fileCount = files.length;
    const initial =
      mode === "text"
        ? "Parsing pasted plan…"
        : fileCount > 1
          ? `Importing ${fileCount} files…`
          : `Uploading ${files[0]?.name ?? "file"}…`;
    const p = createImportProgress(initial);
    try {
      if (mode === "text") {
        if (!text.trim()) {
          p.error("Paste the plan text first");
          setBusy(false);
          return;
        }
        await invokeParse({ text, replaceFlag: replace });
        p.success("Plan imported", `For ${weekStart}.`);
      } else {
        if (fileCount === 0) {
          p.error("Pick a file first");
          setBusy(false);
          return;
        }
        // Validate sizes first
        for (const f of files) {
          if (f.size > 20 * 1024 * 1024) {
            p.error("File too large", `${f.name} exceeds 20 MB.`);
            setBusy(false);
            return;
          }
        }

        let totalCreated = 0, totalReplaced = 0, totalMatched = 0, okFiles = 0, failedFiles = 0;
        for (let i = 0; i < fileCount; i++) {
          const f = files[i];
          p.update(
            fileCount > 1
              ? `Uploading ${f.name} (${i + 1}/${fileCount})…`
              : `Uploading ${f.name}…`,
          );
          try {
            const ext = f.name.split(".").pop() || "bin";
            const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("coach-plans")
              .upload(filePath, f, { contentType: f.type });
            if (upErr) throw upErr;
            p.update(fileCount > 1 ? `Parsing ${f.name} (${i + 1}/${fileCount})…` : "Parsing plan…");
            // Only the first file should "replace" — subsequent files append
            const result = await invokeParse({
              filePath,
              fileName: f.name,
              mimeType: f.type,
              replaceFlag: i === 0 ? replace : false,
            });
            totalCreated += result?.created ?? 0;
            totalReplaced += result?.replaced ?? 0;
            totalMatched += result?.auto_matched ?? 0;
            okFiles++;
          } catch (err) {
            console.error("[coach-plan] file failed", f.name, err);
            failedFiles++;
          }
        }

        const bits = [
          `${totalCreated} workouts added`,
          totalReplaced > 0 ? `${totalReplaced} replaced` : null,
          totalMatched > 0 ? `${totalMatched} matched to activities` : null,
          failedFiles > 0 ? `${failedFiles} files failed` : null,
        ].filter(Boolean);

        if (okFiles > 0) {
          p.success(
            fileCount > 1 ? `${okFiles} of ${fileCount} files imported` : "Plan imported",
            `${bits.join(" · ")} for ${weekStart}.`,
          );
        } else {
          p.error("No files imported", bits.join(" · ") || "All files failed.");
          setBusy(false);
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["training-plan", user.id, weekStart] });
      queryClient.invalidateQueries({ queryKey: ["training-workout-goals"] });
      queryClient.invalidateQueries({ queryKey: ["training-workout-activities"] });
      queryClient.invalidateQueries({ queryKey: ["training-matched-activities"] });
      queryClient.invalidateQueries({ queryKey: ["training-plan-imports", user.id] });
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      p.error("Import failed", describeError(e) || "Could not parse the plan.");
    } finally {
      setBusy(false);
    }
  };

  const invokeParse = async (args: {
    text?: string;
    filePath?: string;
    fileName?: string;
    mimeType?: string;
    replaceFlag: boolean;
  }) => {
    const { data, error } = await supabase.functions.invoke("parse-coach-plan", {
      body: {
        week_start: weekStart,
        source_type: mode,
        text: args.text,
        file_path: args.filePath,
        file_name: args.fileName,
        mime_type: args.mimeType,
        replace: args.replaceFlag,
      },
    });
    if (error) throw error;
    return data as { created?: number; replaced?: number; auto_matched?: number } | null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import workouts from your coach</DialogTitle>
          <DialogDescription>
            Paste plan text, upload a screenshot, or upload a document. We'll parse it into the week of {weekStart}. The original is saved so you can refer back to it.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text"><FileText className="h-4 w-4 mr-1.5" />Paste text</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="h-4 w-4 mr-1.5" />Screenshot</TabsTrigger>
            <TabsTrigger value="document"><FileUp className="h-4 w-4 mr-1.5" />Document</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-2">
            <Textarea
              placeholder={`e.g.\nMon: Recovery jog 30 min\nTue: 14.4 km @ 5:00/km\nWed: Hills 8x400m...`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="resize-y"
            />
          </TabsContent>

          <TabsContent value="image" className="space-y-2">
            <ImportDropzone
              accept="image/png,image/jpeg,image/webp,image/heic"
              multiple
              selected={files}
              onClear={() => setFiles([])}
              onFiles={(fs) => setFiles(fs)}
              busy={busy}
              label="Drop screenshots or click to browse"
              hint="PNG, JPG, WEBP, or HEIC — max 20 MB each. Multiple files supported."
            />
          </TabsContent>

          <TabsContent value="document" className="space-y-2">
            <ImportDropzone
              accept=".pdf,.doc,.docx,.txt,.md"
              multiple
              selected={files}
              onClear={() => setFiles([])}
              onFiles={(fs) => setFiles(fs)}
              busy={busy}
              label="Drop documents or click to browse"
              hint="PDF works best — max 20 MB each. Multiple files supported."
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-start justify-between gap-3 pt-2 flex-wrap">
          <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={replace}
              onCheckedChange={(v) => setReplace(v === true)}
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-foreground">Replace existing workouts for this week</span>
              <span className="block text-xs">Removes Strava auto-created and prior imports so the coach plan is the source of truth, then re-links any matching Strava activities.</span>
            </span>
          </label>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => handleClose(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {busy ? "Parsing…" : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
