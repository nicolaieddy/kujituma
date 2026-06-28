import { useMemo, useState } from "react";
import { Newspaper, Plus, Upload, Inbox, LayoutDashboard, Share2, Copy, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MediaDashboard } from "@/components/media/MediaDashboard";
import { MediaTable } from "@/components/media/MediaTable";
import { MediaEditorDrawer } from "@/components/media/MediaEditorDrawer";
import { MediaImportDialog } from "@/components/media/MediaImportDialog";
import { MediaCandidatesInbox } from "@/components/media/MediaCandidatesInbox";
import { MediaTimeline } from "@/components/media/MediaTimeline";
import {
  useMediaMentions, useMediaCandidates, useCreateMention, useUpdateMention, useDeleteMention,
  type MediaMention, type MediaMentionInsert,
} from "@/hooks/media/useMedia";
import { useAuth } from "@/contexts/AuthContext";
import { BetaBadge } from "@/components/shared/BetaBadge";

export default function MediaPage() {
  const { user } = useAuth();
  const { data: mentions = [], isLoading: mentionsLoading } = useMediaMentions();
  const { data: candidates = [] } = useMediaCandidates();
  const create = useCreateMention();
  const update = useUpdateMention();
  const del = useDeleteMention();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MediaMention | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const pendingCount = candidates.length;
  const pressUrl = useMemo(() => user?.id ? `${window.location.origin}/press/${user.id}` : "", [user?.id]);

  const handleSave = async (patch: Omit<MediaMentionInsert, "user_id">, id?: string) => {
    try {
      if (id) await update.mutateAsync({ id, patch });
      else await create.mutateAsync(patch);
      toast.success(id ? "Updated" : "Added");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  const handleEditCandidate = (candidateId: string) => {
    const c = candidates.find((x) => x.id === candidateId);
    if (!c) return;
    setEditing({
      id: "",
      user_id: user?.id ?? "",
      date: c.date ?? new Date().toISOString().slice(0, 10),
      year: c.date ? new Date(c.date).getFullYear() : new Date().getFullYear(),
      title: c.title,
      outlet: c.outlet ?? "",
      type: c.type ?? "Article",
      url: c.url,
      url_status: c.url_status ?? "verify",
      summary: c.summary,
      tags: c.tags ?? [],
      status: c.status ?? "Published",
      sentiment: c.sentiment,
      featured: c.featured,
      source: c.source,
      archived_url: c.archived_url,
      is_public: false,
      story_id: null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    } as MediaMention);
    setEditorOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Newspaper className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">Media</h1>
          <BetaBadge size="md" />
          <Badge variant="secondary" className="ml-1">{mentions.length} mentions</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" /> Import
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add mention
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="inbox">
            <Inbox className="h-3.5 w-3.5 mr-1.5" /> Inbox
            {pendingCount > 0 && <Badge variant="default" className="ml-2 h-5 px-1.5">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="timeline"><GitBranch className="h-3.5 w-3.5 mr-1.5" /> Timeline</TabsTrigger>
          <TabsTrigger value="share"><Share2 className="h-3.5 w-3.5 mr-1.5" /> Public page</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <MediaDashboard mentions={mentions} pendingCount={pendingCount} />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">All mentions</h2>
            <MediaTable
              mentions={mentions}
              onEdit={(m) => { setEditing(m); setEditorOpen(true); }}
              onDelete={async (m) => {
                if (!confirm(`Delete "${m.title}"?`)) return;
                try { await del.mutateAsync(m.id); toast.success("Deleted"); }
                catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
              }}
            />
          </div>
        </TabsContent>


        <TabsContent value="inbox" className="mt-4">
          <MediaCandidatesInbox onEditApprove={handleEditCandidate} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <MediaTimeline onEditMention={(m) => { setEditing(m); setEditorOpen(true); }} />
        </TabsContent>


        <TabsContent value="share" className="mt-4 space-y-3">
          <div className="rounded-md border p-4 space-y-3">
            <div>
              <div className="text-sm font-medium">Public press page</div>
              <p className="text-xs text-muted-foreground mt-1">
                Anyone with this link sees mentions you've marked <strong>Public</strong> with status <strong>Published</strong>. Toggle visibility per item from the editor.
              </p>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-xs overflow-x-auto">{pressUrl}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(pressUrl); toast.success("Link copied"); }}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
              <Button size="sm" asChild><a href={pressUrl} target="_blank" rel="noreferrer">Open</a></Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {mentions.filter((m) => m.is_public && m.status === "Published").length} mentions currently public.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <MediaEditorDrawer
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mention={editing}
        onSave={handleSave}
      />
      <MediaImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
