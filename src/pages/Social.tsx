import { useState } from "react";
import { Megaphone, LayoutGrid, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon, Plus, TrendingUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/social/PipelineBoard";
import { PlatformSettingsPanel } from "@/components/social/PlatformSettingsPanel";
import { SocialAnalytics } from "@/components/social/SocialAnalytics";
import { SocialCalendar } from "@/components/social/SocialCalendar";
import { PostEditorDrawer } from "@/components/social/PostEditorDrawer";
import { CumulativeGrowthChart } from "@/components/social/CumulativeGrowthChart";
import { LinkedInImportDialog } from "@/components/social/LinkedInImportDialog";
import { PageDropOverlay } from "@/components/shared/PageDropOverlay";
import { cn } from "@/lib/utils";

type View = "pipeline" | "calendar" | "analytics" | "growth" | "setup";

const ACCEPTED = ".xlsx,.xls,.csv";

export default function Social() {
  const [view, setView] = useState<View>("pipeline");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const openEditor = (id: string) => setEditingId(id);
  const openCreate = () => setCreating(true);
  const closeEditor = () => {
    setEditingId(null);
    setCreating(false);
  };

  const openImport = (file: File | null = null) => {
    setImportFile(file);
    setImportOpen(true);
  };
  const closeImport = () => {
    setImportOpen(false);
    setImportFile(null);
  };

  // Page-level drag & drop
  useEffect(() => {
    let depth = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      depth++;
      setDragging(true);
    };
    const onDragLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      e.preventDefault();
      if (!isSpreadsheet(f)) return;
      openImport(f);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const onPick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED.join(",");
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) openImport(f);
    };
    input.click();
  }, []);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6 relative">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Social</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onPick} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" /> Import LinkedIn export
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
        open={importOpen}
        onClose={closeImport}
        initialFile={importFile}
      />

      {dragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-primary bg-background/95 px-10 py-8 text-center shadow-lg max-w-md">
            <Upload className="h-10 w-10 mx-auto mb-3 text-primary" />
            <div className="text-lg font-semibold">Drop your LinkedIn export</div>
            <div className="text-sm text-muted-foreground mt-1">
              .xlsx, .xls or .csv — we'll auto-create the post
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="h-px w-8 bg-border" /> or <span className="h-px w-8 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                setDragging(false);
                onPick();
              }}
            >
              <Upload className="h-3.5 w-3.5" /> Choose a file instead
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
