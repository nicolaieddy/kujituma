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
  const [importFiles, setImportFiles] = useState<File[]>([]);

  const openEditor = (id: string) => setEditingId(id);
  const openCreate = () => setCreating(true);
  const closeEditor = () => {
    setEditingId(null);
    setCreating(false);
  };

  const openImport = (files: File[] = []) => {
    setImportFiles(files);
    setImportOpen(true);
  };
  const closeImport = () => {
    setImportOpen(false);
    setImportFiles([]);
  };

  const onPick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED;
    input.multiple = true;
    input.onchange = () => {
      const fs = Array.from(input.files ?? []);
      if (fs.length) openImport(fs);
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
        open={importOpen}
        onClose={closeImport}
        initialFile={importFile}
      />

      <PageDropOverlay
        accept={ACCEPTED}
        onFiles={(fs) => openImport(fs[0])}
        label="Drop your LinkedIn export"
        hint=".xlsx, .xls or .csv — we'll auto-create the post"
      />
    </div>
  );
}
