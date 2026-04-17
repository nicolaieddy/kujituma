import { useState, useEffect } from "react";
import { Pencil, Copy, Check, X, MessageSquareText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActivityReflection } from "@/hooks/useActivityReflection";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActivityReflectionProps {
  activityId: string;
  reflection?: string | null;
  /** Compact inline preview style for collapsed cards */
  variant?: "full" | "preview";
  /** When true, hide the editor entirely (preview only) */
  readOnly?: boolean;
}

const PLACEHOLDER = `Capture three things in prose:
• Plan vs actual — "prescribed easy, ran at threshold HR"
• Pattern callout — "gray zone drift", "positive split", "foot held up"
• Structural implication — "Saturday long run at risk"`;

export function ActivityReflection({
  activityId,
  reflection,
  variant = "full",
  readOnly = false,
}: ActivityReflectionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reflection || "");
  const { saveReflection, isSaving } = useActivityReflection();

  useEffect(() => {
    setDraft(reflection || "");
  }, [reflection]);

  const handleSave = () => {
    saveReflection(
      { activityId, reflection: draft },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleCancel = () => {
    setDraft(reflection || "");
    setEditing(false);
  };

  const handleCopy = async () => {
    if (!reflection) return;
    try {
      await navigator.clipboard.writeText(reflection);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  // Preview variant — single line italic, no editor
  if (variant === "preview") {
    if (!reflection) return null;
    return (
      <p className="truncate text-[11px] italic text-muted-foreground/80">
        <MessageSquareText className="inline h-3 w-3 mr-1 -mt-0.5 text-muted-foreground/50" />
        {reflection}
      </p>
    );
  }

  // Full variant
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          Reflection
        </p>
        {!editing && reflection && !readOnly && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
              title="Edit reflection"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PLACEHOLDER}
            className="min-h-[120px] text-xs resize-y"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      ) : reflection ? (
        <p
          className={cn(
            "rounded-lg bg-muted/15 px-3 py-2 text-xs leading-relaxed text-foreground/90 italic whitespace-pre-wrap",
            "select-text cursor-text"
          )}
        >
          {reflection}
        </p>
      ) : !readOnly ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 -ml-2"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
          Add reflection
        </Button>
      ) : null}
    </div>
  );
}
