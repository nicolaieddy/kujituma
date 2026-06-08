import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Image as ImageIcon, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
    try {
      let filePath: string | undefined;
      let mimeType: string | undefined;
      let fileName: string | undefined;

      if (mode !== "text") {
        if (!file) {
          toast({ title: "Pick a file first", variant: "destructive" });
          setBusy(false);
          return;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: "File too large", description: "Max 20 MB.", variant: "destructive" });
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
      } else if (!text.trim()) {
        toast({ title: "Paste the plan text first", variant: "destructive" });
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
        },
      });
      if (error) throw error;

      toast({
        title: "Plan imported",
        description: `${data?.created ?? 0} workouts added for the week of ${weekStart}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["training-plan", user.id, weekStart] });
      queryClient.invalidateQueries({ queryKey: ["training-plan-imports", user.id] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Import failed",
        description: e?.message || "Could not parse the plan.",
        variant: "destructive",
      });
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
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP. Max 20 MB.</p>
            {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          </TabsContent>

          <TabsContent value="document" className="space-y-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">PDF works best. Max 20 MB.</p>
            {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {busy ? "Parsing…" : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
