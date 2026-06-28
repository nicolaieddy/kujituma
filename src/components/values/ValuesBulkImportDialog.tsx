import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImportDropzone } from "@/components/shared/ImportDropzone";
import { createImportProgress, describeError } from "@/lib/importProgress";
import type { CreateValueInput } from "@/types/values";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (values: CreateValueInput[]) => void;
}

const FEELING_WORDS = [
  "At ease", "Engaged", "Deeply purposeful", "Shameful", "Numb",
  "Proud", "Seen", "Motivated", "At peace", "Inspired", "Energized",
  "Calm", "Focused", "Free", "Connected", "Curious", "Grateful",
];

function parseLine(raw: string): CreateValueInput | null {
  let line = raw.trim();
  if (!line) return null;
  // Strip leading bullets / dashes / numbering
  line = line.replace(/^[-–•*\d.)\s]+/, "").trim();
  if (!line) return null;

  // Try to detect "<Feeling> when <rest>"
  const m = line.match(/^([A-Za-z][A-Za-z\s]+?)\s+when\b/i);
  let feeling: string | null = null;
  let label = "";
  if (m) {
    feeling = m[1].trim();
    // capitalize first word
    label = feeling
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(" ");
  } else {
    // Fallback: first 2-3 words as label
    label = line.split(/\s+/).slice(0, 3).join(" ");
  }
  // Match against known list for nicer labels
  const matched = FEELING_WORDS.find((f) => line.toLowerCase().startsWith(f.toLowerCase()));
  if (matched) {
    feeling = matched;
    label = matched;
  }
  return {
    label,
    statement: line,
    feeling,
    visibility: "private",
  };
}

export const ValuesBulkImportDialog = ({ open, onOpenChange, onImport }: Props) => {
  const [text, setText] = useState("");
  const parsed = useMemo(() => text.split("\n").map(parseLine).filter(Boolean) as CreateValueInput[], [text]);

  const handleImport = () => {
    if (parsed.length === 0) return;
    const p = createImportProgress(`Importing ${parsed.length} value${parsed.length === 1 ? "" : "s"}…`);
    try {
      onImport(parsed);
      p.success("Values imported", `${parsed.length} added`);
      setText("");
      onOpenChange(false);
    } catch (e) {
      p.error("Import failed", describeError(e));
    }
  };

  const handleFiles = async (files: File[]) => {
    const p = createImportProgress(
      files.length === 1 ? `Reading ${files[0].name}…` : `Reading ${files.length} files…`,
    );
    try {
      let totalLines = 0;
      const parts: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        p.update(`Reading ${f.name} (${i + 1}/${files.length})…`);
        const content = await f.text();
        parts.push(content);
        totalLines += content.split("\n").filter(Boolean).length;
      }
      const joined = parts.join("\n");
      setText((cur) => (cur ? cur + "\n" + joined : joined));
      p.success(
        files.length === 1 ? "File loaded" : `${files.length} files loaded`,
        `${totalLines} line(s) added`,
      );
    } catch (e) {
      p.error("Couldn't read file", describeError(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import values from text</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste your "I feel…" list — one value per line. Bullets and dashes are stripped automatically.
          </p>
          <ImportDropzone
            accept=".txt,.csv,.md"
            multiple
            onFiles={handleFiles}
            label="Drop .txt / .csv files or click to browse"
            hint="Multiple files supported — content is merged. Or paste directly below."
            className="p-4"
          />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"- At ease when my actions reflect my words.\n- Engaged when I'm working on challenging problems.\n…"}
            className="font-mono text-sm"
          />
          {parsed.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold mb-2">Preview ({parsed.length})</p>
              <ul className="space-y-1">
                {parsed.map((v, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-semibold">{v.label}</span>
                    <span className="text-muted-foreground"> — {v.statement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={parsed.length === 0}>
              Import {parsed.length || ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
