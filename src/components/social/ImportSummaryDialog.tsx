import { CheckCircle2, AlertCircle, FileSpreadsheet, Plus, Link2, BarChart3, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type ImportRowStatus =
  | "matched"
  | "created"
  | "imported"
  | "failed"
  | "unsupported";

export interface ImportRow {
  file: string;
  kind: "single_post" | "aggregate" | "unsupported";
  status: ImportRowStatus;
  detail?: string;
}

interface Props {
  open: boolean;
  rows: ImportRow[];
  onClose: () => void;
}

const STATUS_META: Record<ImportRowStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  matched: { label: "Matched", tone: "text-sky-700 dark:text-sky-300 border-sky-300/60 bg-sky-50 dark:bg-sky-950/40", icon: Link2 },
  created: { label: "Auto-created", tone: "text-emerald-700 dark:text-emerald-300 border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/40", icon: Plus },
  imported: { label: "Imported", tone: "text-emerald-700 dark:text-emerald-300 border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/40", icon: BarChart3 },
  failed: { label: "Failed", tone: "text-red-700 dark:text-red-300 border-red-300/60 bg-red-50 dark:bg-red-950/40", icon: AlertCircle },
  unsupported: { label: "Unsupported", tone: "text-amber-700 dark:text-amber-300 border-amber-300/60 bg-amber-50 dark:bg-amber-950/40", icon: HelpCircle },
};

export function ImportSummaryDialog({ open, rows, onClose }: Props) {
  const matched = rows.filter((r) => r.status === "matched").length;
  const created = rows.filter((r) => r.status === "created").length;
  const imported = rows.filter((r) => r.status === "imported").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const unsupported = rows.filter((r) => r.status === "unsupported").length;

  const hasUnsupported = unsupported > 0;
  const allUnsupported = rows.length > 0 && rows.every((r) => r.status === "unsupported");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {allUnsupported ? "Unsupported analytics format" : "Import summary"}
          </DialogTitle>
          <DialogDescription>
            {allUnsupported
              ? "We couldn't recognise the file(s) you uploaded. Here's what we currently support."
              : "Here's what happened with each file you imported."}
          </DialogDescription>
        </DialogHeader>

        {!allUnsupported && (
          <div className="flex flex-wrap gap-1.5">
            {matched > 0 && <Badge variant="outline" className={STATUS_META.matched.tone}>{matched} matched</Badge>}
            {created > 0 && <Badge variant="outline" className={STATUS_META.created.tone}>{created} auto-created</Badge>}
            {imported > 0 && <Badge variant="outline" className={STATUS_META.imported.tone}>{imported} aggregate imported</Badge>}
            {failed > 0 && <Badge variant="outline" className={STATUS_META.failed.tone}>{failed} failed</Badge>}
            {unsupported > 0 && <Badge variant="outline" className={STATUS_META.unsupported.tone}>{unsupported} unsupported</Badge>}
          </div>
        )}

        {rows.length > 0 && (
          <ScrollArea className="max-h-[40vh] pr-2">
            <ul className="space-y-1.5">
              {rows.map((r, idx) => {
                const meta = STATUS_META[r.status];
                const Icon = meta.icon;
                return (
                  <li
                    key={`${r.file}-${idx}`}
                    className="flex items-start gap-2.5 rounded-md border border-border p-2.5 text-sm min-w-0"
                  >
                    <FileSpreadsheet className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.file}</div>
                      {r.detail && (
                        <div className="text-[11px] text-muted-foreground break-words">{r.detail}</div>
                      )}
                    </div>
                    <Badge variant="outline" className={`shrink-0 gap-1 ${meta.tone}`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        {hasUnsupported && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/30 p-3 text-xs space-y-2">
            <div className="font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" /> Supported analytics formats
            </div>
            <ul className="space-y-1.5 text-amber-900/90 dark:text-amber-100/90">
              <li>
                <span className="font-medium">LinkedIn — Single Post Analytics</span> (<code>.xlsx</code>)
                <div className="text-[11px] text-amber-800/80 dark:text-amber-200/80">
                  From any post → "View analytics" → "Export". Column A lists labels like
                  <em> Post URL, Impressions, Reactions, Comments</em>.
                </div>
              </li>
              <li>
                <span className="font-medium">LinkedIn — Aggregate Analytics</span> (<code>.xlsx</code>)
                <div className="text-[11px] text-amber-800/80 dark:text-amber-200/80">
                  From your Page/profile Analytics → "Export". Contains <em>DISCOVERY</em>,
                  <em> ENGAGEMENT</em>, and <em>FOLLOWERS</em> sheets.
                </div>
              </li>
            </ul>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-200/80">
              Other platforms (X, Instagram, TikTok, YouTube) aren't auto-detected yet — let us know which
              export you'd like supported next.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
