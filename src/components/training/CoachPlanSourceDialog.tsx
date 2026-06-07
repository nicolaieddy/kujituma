import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CoachPlanSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
}

interface ImportRow {
  source_type: "text" | "image" | "document";
  source_text: string | null;
  source_file_path: string | null;
  source_file_name: string | null;
  source_mime: string | null;
  created_at: string;
  workout_count: number;
}

export function CoachPlanSourceDialog({ open, onOpenChange, importId }: CoachPlanSourceDialogProps) {
  const [row, setRow] = useState<ImportRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !importId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_plan_imports")
        .select("source_type, source_text, source_file_path, source_file_name, source_mime, created_at, workout_count")
        .eq("id", importId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setRow(null); setLoading(false); return; }
      setRow(data as ImportRow);
      if (data.source_file_path) {
        const { data: signed } = await supabase.storage
          .from("coach-plans")
          .createSignedUrl(data.source_file_path, 60 * 60);
        if (!cancelled) setSignedUrl(signed?.signedUrl ?? null);
      } else {
        setSignedUrl(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, importId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Original coach plan</DialogTitle>
          <DialogDescription>
            {row ? `Imported ${new Date(row.created_at).toLocaleString()} · ${row.workout_count} workouts` : "Source of this workout."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        )}

        {!loading && row && row.source_type === "text" && (
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
            {row.source_text}
          </pre>
        )}

        {!loading && row && row.source_type === "image" && signedUrl && (
          <img src={signedUrl} alt="Coach plan screenshot" className="max-h-[60vh] w-full rounded-md object-contain" />
        )}

        {!loading && row && row.source_type === "document" && signedUrl && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{row.source_file_name || "Document"}</p>
            <Button asChild>
              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Open document
              </a>
            </Button>
          </div>
        )}

        {!loading && !row && (
          <p className="text-sm text-muted-foreground">Source not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
