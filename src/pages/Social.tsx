import { useState } from "react";
import { Megaphone, LayoutGrid, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon, Plus, TrendingUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/social/PipelineBoard";
import { PlatformSettingsPanel } from "@/components/social/PlatformSettingsPanel";
import { SocialAnalytics } from "@/components/social/SocialAnalytics";
import { SocialCalendar } from "@/components/social/SocialCalendar";
import { PostEditorDrawer } from "@/components/social/PostEditorDrawer";
import { CumulativeGrowthChart } from "@/components/social/CumulativeGrowthChart";
import { LinkedInImportDialog } from "@/components/social/LinkedInImportDialog";
import { AggregateImportDialog } from "@/components/social/AggregateImportDialog";
import { ImportSummaryDialog, type ImportRow } from "@/components/social/ImportSummaryDialog";
import { PageDropOverlay } from "@/components/shared/PageDropOverlay";
import { groupFilesByKind } from "@/lib/social/analyticsSniffer";
import { cn } from "@/lib/utils";

type View = "pipeline" | "calendar" | "analytics" | "growth" | "setup";

const ACCEPTED = ".xlsx,.xls,.csv";

export default function Social() {
  const [view, setView] = useState<View>("pipeline");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Two routed dialogs — only one ever opens at a time per drop, but mixed batches
  // queue: aggregate runs first, then single-post when its dialog closes.
  const [singlePostOpen, setSinglePostOpen] = useState(false);
  const [singlePostFiles, setSinglePostFiles] = useState<File[]>([]);
  const [aggregateOpen, setAggregateOpen] = useState(false);
  const [aggregateFiles, setAggregateFiles] = useState<File[]>([]);
  const [queuedSinglePost, setQueuedSinglePost] = useState<File[] | null>(null);

  // Summary collected across the routed dialogs (+ any unsupported files from sniffer).
  const [summaryRows, setSummaryRows] = useState<ImportRow[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // When a mixed batch is queued we wait until both dialogs finish before showing summary.
  const [pendingDialogs, setPendingDialogs] = useState(0);

  const openEditor = (id: string) => setEditingId(id);
  const openCreate = () => setCreating(true);
  const closeEditor = () => {
    setEditingId(null);
    setCreating(false);
  };

  /** Sniff dropped/picked files and route each group to the matching dialog. */
  const routeImport = async (files: File[]) => {
    if (!files.length) return;
    const tid = toast.loading(`Detecting ${files.length} file${files.length === 1 ? "" : "s"}…`);
    const groups = await groupFilesByKind(files);

    // Reset summary state for this batch and seed unsupported rows immediately.
    const unsupportedRows: ImportRow[] = groups.unknown.map((f) => ({
      file: f.name,
      kind: "unsupported",
      status: "unsupported",
      detail: "Not a recognised LinkedIn analytics export — see supported formats below.",
    }));
    setSummaryRows(unsupportedRows);

    // No parseable files at all → open summary directly (acts as the unsupported-format dialog).
    if (groups.singlePost.length === 0 && groups.aggregate.length === 0) {
      toast.dismiss(tid);
      setPendingDialogs(0);
      setSummaryOpen(true);
      return;
    }

    const parts: string[] = [];
    if (groups.singlePost.length) parts.push(`${groups.singlePost.length} post analytics`);
    if (groups.aggregate.length) parts.push(`${groups.aggregate.length} aggregate`);
    if (groups.unknown.length) parts.push(`${groups.unknown.length} unsupported`);
    toast.success(`Detected ${parts.join(" · ")}`, { id: tid, duration: 2500 });

    // Count how many child dialogs will report back so we know when to show summary.
    const dialogCount = (groups.aggregate.length > 0 ? 1 : 0) + (groups.singlePost.length > 0 ? 1 : 0);
    setPendingDialogs(dialogCount);

    // Aggregate runs first (no per-file UI needed); single-post may need a preview
    // when it's a single new post, so we queue it for after the aggregate closes.
    if (groups.aggregate.length > 0 && groups.singlePost.length > 0) {
      setQueuedSinglePost(groups.singlePost);
      setAggregateFiles(groups.aggregate);
      setAggregateOpen(true);
      return;
    }
    if (groups.aggregate.length > 0) {
      setAggregateFiles(groups.aggregate);
      setAggregateOpen(true);
      return;
    }
    if (groups.singlePost.length > 0) {
      setSinglePostFiles(groups.singlePost);
      setSinglePostOpen(true);
    }
  };

  const handleDialogComplete = (rows: ImportRow[]) => {
    setSummaryRows((prev) => [...prev, ...rows]);
    setPendingDialogs((n) => {
      const next = Math.max(0, n - 1);
      // If no queued dialogs remain, surface the summary on the next tick.
      if (next === 0 && !queuedSinglePost) {
        setTimeout(() => setSummaryOpen(true), 50);
      }
      return next;
    });
  };

  const closeAggregate = () => {
    setAggregateOpen(false);
    setAggregateFiles([]);
    // If we have queued single-post files from a mixed drop, open them now.
    if (queuedSinglePost && queuedSinglePost.length > 0) {
      const next = queuedSinglePost;
      setQueuedSinglePost(null);
      setSinglePostFiles(next);
      setSinglePostOpen(true);
    }
  };

  const closeSinglePost = () => {
    setSinglePostOpen(false);
    setSinglePostFiles([]);
  };

  const onPick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED;
    input.multiple = true;
    input.onchange = () => {
      const fs = Array.from(input.files ?? []);
      if (fs.length) routeImport(fs);
    };
    input.click();
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6 relative">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Social</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onPick} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" /> Import post analytics
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New post
          </Button>
        </div>
      </header>

      <div className="flex gap-2 bg-muted rounded-lg p-1 w-fit flex-wrap">
        {([
          { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
          { id: "calendar", label: "Calendar", icon: CalendarIcon },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
          { id: "growth", label: "Growth", icon: TrendingUp },
          { id: "setup", label: "Setup", icon: SettingsIcon },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              view === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {view === "pipeline" && <PipelineBoard onOpenPost={openEditor} onCreate={openCreate} />}
      {view === "calendar" && <SocialCalendar onOpenPost={openEditor} />}
      {view === "analytics" && <SocialAnalytics />}
      {view === "growth" && <CumulativeGrowthChart />}
      {view === "setup" && <PlatformSettingsPanel />}

      <PostEditorDrawer
        open={!!editingId || creating}
        postId={editingId}
        onClose={closeEditor}
      />

      <LinkedInImportDialog
        open={singlePostOpen}
        onClose={closeSinglePost}
        initialFiles={singlePostFiles}
        onComplete={handleDialogComplete}
      />

      <AggregateImportDialog
        open={aggregateOpen}
        onClose={closeAggregate}
        initialFiles={aggregateFiles}
        onComplete={handleDialogComplete}
      />

      <ImportSummaryDialog
        open={summaryOpen}
        rows={summaryRows}
        onClose={() => { setSummaryOpen(false); setSummaryRows([]); }}
      />

      <PageDropOverlay
        accept={ACCEPTED}
        multiple
        onFiles={(fs) => routeImport(fs)}
        label="Drop your post analytics exports"
        hint=".xlsx, .xls or .csv — we detect the type and route to the right importer"
      />
    </div>
  );
}
