import { useState } from "react";
import { Megaphone, LayoutGrid, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/social/PipelineBoard";
import { PlatformSettingsPanel } from "@/components/social/PlatformSettingsPanel";
import { SocialAnalytics } from "@/components/social/SocialAnalytics";
import { SocialCalendar } from "@/components/social/SocialCalendar";
import { PostEditorDrawer } from "@/components/social/PostEditorDrawer";
import { CumulativeGrowthChart } from "@/components/social/CumulativeGrowthChart";
import { cn } from "@/lib/utils";

type View = "pipeline" | "calendar" | "analytics" | "growth" | "setup";

export default function Social() {
  const [view, setView] = useState<View>("pipeline");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const openEditor = (id: string) => setEditingId(id);
  const openCreate = () => setCreating(true);
  const closeEditor = () => {
    setEditingId(null);
    setCreating(false);
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Social</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New post
        </Button>
      </header>

      <div className="flex gap-2 bg-muted rounded-lg p-1 w-fit flex-wrap">
        {([
          { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
          { id: "calendar", label: "Calendar", icon: CalendarIcon },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
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
      {view === "setup" && <PlatformSettingsPanel />}

      <PostEditorDrawer
        open={!!editingId || creating}
        postId={editingId}
        onClose={closeEditor}
      />
    </div>
  );
}
