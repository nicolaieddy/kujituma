import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Comma-separated extensions, e.g. ".xlsx,.csv,.fit". */
  accept: string;
  /** Called with the dropped file(s). */
  onFiles: (files: File[]) => void;
  /** Allow multiple files. */
  multiple?: boolean;
  /** Headline shown when dragging over the page. */
  label?: string;
  /** Helper line under the headline. */
  hint?: string;
  /** Disable globally (e.g. while another modal is busy). */
  disabled?: boolean;
}

/**
 * Page-level drag overlay used on Social, Training, Values etc.
 * Filters dropped files by `accept` and forwards matching ones to `onFiles`.
 */
export function PageDropOverlay({ accept, onFiles, multiple = false, label, hint, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const exts = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const matches = (f: File) => {
    if (!exts.length) return true;
    const name = f.name.toLowerCase();
    return exts.some((ext) => ext.startsWith(".") ? name.endsWith(ext) : ext.endsWith("/*") ? f.type.startsWith(ext.slice(0, -1)) : f.type === ext);
  };

  useEffect(() => {
    if (disabled) return;
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      depth++;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      const fs = Array.from(e.dataTransfer?.files ?? []).filter(matches);
      if (!fs.length) return;
      e.preventDefault();
      onFiles(multiple ? fs : [fs[0]]);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [accept, disabled, multiple, onFiles]);

  const onPick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => {
      const fs = Array.from(input.files ?? []).filter(matches);
      if (fs.length) onFiles(multiple ? fs : [fs[0]]);
    };
    input.click();
  };

  if (!dragging) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
      <div className="rounded-2xl border-2 border-dashed border-primary bg-background/95 px-10 py-8 text-center shadow-lg max-w-md">
        <Upload className="h-10 w-10 mx-auto mb-3 text-primary" />
        <div className="text-lg font-semibold">{label ?? "Drop file to import"}</div>
        <div className="text-sm text-muted-foreground mt-1">{hint ?? `Accepts ${exts.join(", ")}`}</div>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="h-px w-8 bg-border" /> or <span className="h-px w-8 bg-border" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 gap-2"
          onClick={(e) => { e.stopPropagation(); setDragging(false); onPick(); }}
        >
          <Upload className="h-3.5 w-3.5" /> Choose a file instead
        </Button>
      </div>
    </div>
  );
}
