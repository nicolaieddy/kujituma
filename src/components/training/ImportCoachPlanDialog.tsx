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
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);

  const reset = () => { setText(""); setFile(null); };

  const handleClose = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const p = createImportProgress(mode === "text" ? "Parsing pasted plan…" : `Uploading ${file?.name ?? "file"}…`);
    try {
      let filePath: string | undefined;
      let mimeType: string | undefined;
      let fileName: string | undefined;

      if (mode !== "text") {
        if (!file) {
          p.error("Pick a file first");
          setBusy(false);
          return;
        }
        if (file.size > 20 * 1024 * 1024) {
          p.error("File too large", "Max 20 MB.");
          setBusy(false);
          return;
        }
        const ext = file.name.split(".").pop() || "bin";
        filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        fileName = file.name;
        mimeType = file.type;
        const { error: upErr } = await supabase.storage
          .from("coach-plans")
          .upload(filePath, file, { contentType: file.type });
        if (upErr) throw upErr;
        p.update("Parsing plan…");
      } else if (!text.trim()) {
        p.error("Paste the plan text first");
        setBusy(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("parse-coach-plan", {
        body: {
          week_start: weekStart,
          source_type: mode,
          text: mode === "text" ? text : undefined,
          file_path: filePath,
          file_name: fileName,
          mime_type: mimeType,
          replace,
        },
      });
      if (error) throw error;

      const replaced = data?.replaced ?? 0;
      const matched = data?.auto_matched ?? 0;
      const bits = [
        `${data?.created ?? 0} workouts added`,
        replaced > 0 ? `${replaced} replaced` : null,
        matched > 0 ? `${matched} matched to activities` : null,
      ].filter(Boolean);
      p.success("Plan imported", `${bits.join(" · ")} for ${weekStart}.`);
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
              selected={file}
              onClear={() => setFile(null)}
              onFiles={(fs) => setFile(fs[0])}
              busy={busy}
              label="Drop a screenshot or click to browse"
              hint="PNG, JPG, WEBP, or HEIC — max 20 MB"
            />
          </TabsContent>

          <TabsContent value="document" className="space-y-2">
            <ImportDropzone
              accept=".pdf,.doc,.docx,.txt,.md"
              selected={file}
              onClear={() => setFile(null)}
              onFiles={(fs) => setFile(fs[0])}
              busy={busy}
              label="Drop a document or click to browse"
              hint="PDF works best — max 20 MB"
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
