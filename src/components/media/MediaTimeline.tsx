import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Newspaper, ExternalLink, Sparkles, Plus, Pencil, Link2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/utils/dateUtils";
import { MediaStoryDialog } from "./MediaStoryDialog";
import {
  useMediaMentions, useMediaStories, useUpdateMention,
  type MediaMention, type MediaStory,
} from "@/hooks/media/useMedia";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  onEditMention: (m: MediaMention) => void;
}

type TimelineNode =
  | { kind: "story"; key: string; date: Date; story: MediaStory; mentions: MediaMention[] }
  | { kind: "mention"; key: string; date: Date; mention: MediaMention };

export function MediaTimeline({ onEditMention }: Props) {
  const { data: mentions = [] } = useMediaMentions();
  const { data: stories = [] } = useMediaStories();
  const updateMention = useUpdateMention();

  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<MediaStory | null>(null);

  const nodesByYear = useMemo(() => {
    const grouped = new Map(stories.map((s) => [s.id, [] as MediaMention[]]));
    const loose: MediaMention[] = [];
    for (const m of mentions) {
      if (m.story_id && grouped.has(m.story_id)) grouped.get(m.story_id)!.push(m);
      else loose.push(m);
    }

    const nodes: TimelineNode[] = [
      ...stories.map<TimelineNode>((s) => ({
        kind: "story",
        key: `s-${s.id}`,
        date: parseLocalDate(s.announcement_date),
        story: s,
        mentions: (grouped.get(s.id) ?? []).sort((a, b) => b.date.localeCompare(a.date)),
      })),
      ...loose.map<TimelineNode>((m) => ({
        kind: "mention",
        key: `m-${m.id}`,
        date: parseLocalDate(m.date),
        mention: m,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const byYear = new Map<number, TimelineNode[]>();
    for (const n of nodes) {
      const y = n.date.getFullYear();
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(n);
    }
    return byYear;
  }, [mentions, stories]);

  const years = Array.from(nodesByYear.keys()).sort((a, b) => b - a);

  const setStory = async (mentionId: string, storyId: string | null) => {
    try {
      await updateMention.mutateAsync({ id: mentionId, patch: { story_id: storyId } });
      toast.success(storyId ? "Linked to story" : "Removed from story");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  if (!mentions.length && !stories.length) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <Sparkles className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No press yet. Add mentions or group related coverage into a story.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Press timeline</h2>
          <p className="text-xs text-muted-foreground">Stories group related coverage. Drag mentions into a story from the link menu.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setEditingStory(null); setStoryDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> New story
        </Button>
      </div>

      <div className="space-y-6">
        {years.map((year) => (
          <section key={year}>
            <YearHeader year={year} count={nodesByYear.get(year)!.length} />
            <div className="space-y-3">
              {nodesByYear.get(year)!.map((node) =>
                node.kind === "story" ? (
                  <StoryRow
                    key={node.key}
                    node={node}
                    stories={stories}
                    onEditStory={(s) => { setEditingStory(s); setStoryDialogOpen(true); }}
                    onEditMention={onEditMention}
                    onUnlink={(mId) => setStory(mId, null)}
                  />
                ) : (
                  <MentionRow
                    key={node.key}
                    mention={node.mention}
                    stories={stories}
                    onEdit={onEditMention}
                    onLink={(sId) => setStory(node.mention.id, sId)}
                  />
                )
              )}
            </div>
          </section>
        ))}
      </div>

      <MediaStoryDialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen} story={editingStory} />
    </div>
  );
}

function YearHeader({ year, count }: { year: number; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-base font-semibold">{year}</span>
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-muted-foreground">{count} {count === 1 ? "item" : "items"}</span>
    </div>
  );
}

function StoryRow({
  node, stories, onEditStory, onEditMention, onUnlink,
}: {
  node: Extract<TimelineNode, { kind: "story" }>;
  stories: MediaStory[];
  onEditStory: (s: MediaStory) => void;
  onEditMention: (m: MediaMention) => void;
  onUnlink: (mentionId: string) => void;
}) {
  const { story, mentions, date } = node;
  return (
    <div className="relative flex gap-4">
      <TimelineSpine accent="primary" />
      <Card className="flex-1 overflow-hidden border-l-4 border-l-primary">
        <div className="flex items-start gap-4 p-4">
          {story.cover_url ? (
            <img src={story.cover_url} alt="" className="h-16 w-16 rounded-md object-cover shrink-0" />
          ) : (
            <div className="h-16 w-16 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default" className="text-[10px] uppercase tracking-wide">Story</Badge>
              {story.featured && <Badge variant="outline" className="text-[10px] gap-1"><Star className="h-3 w-3" />Featured</Badge>}
              {story.is_public && <Badge variant="secondary" className="text-[10px]">Public</Badge>}
              <span className="text-xs text-muted-foreground tabular-nums">{format(date, "d MMM yyyy")}</span>
            </div>
            <h3 className="font-semibold text-base mt-1.5">{story.title}</h3>
            {story.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{story.summary}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{mentions.length} {mentions.length === 1 ? "mention" : "mentions"}</span>
              <button onClick={() => onEditStory(story)} className="inline-flex items-center gap-1 hover:text-foreground">
                <Pencil className="h-3 w-3" /> Edit story
              </button>
            </div>
          </div>
        </div>
        {mentions.length > 0 && (
          <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
            {mentions.map((m) => (
              <MentionInline key={m.id} mention={m} onEdit={onEditMention} onUnlink={() => onUnlink(m.id)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MentionRow({
  mention, stories, onEdit, onLink,
}: {
  mention: MediaMention;
  stories: MediaStory[];
  onEdit: (m: MediaMention) => void;
  onLink: (storyId: string) => void;
}) {
  const date = parseLocalDate(mention.date);
  return (
    <div className="relative flex gap-4">
      <TimelineSpine accent="muted" />
      <Card className="flex-1 p-3 group hover:shadow-sm transition-shadow">
        <div className="flex items-start gap-3">
          <Newspaper className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{mention.type}</Badge>
              <span className="text-xs text-muted-foreground tabular-nums">{format(date, "d MMM yyyy")}</span>
              {mention.outlet && <span className="text-xs text-muted-foreground">· {mention.outlet}</span>}
              {mention.featured && <Star className="h-3 w-3 text-amber-500" />}
            </div>
            <button onClick={() => onEdit(mention)} className="text-sm font-medium mt-0.5 text-left hover:underline">
              {mention.title}
            </button>
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {mention.url && (
              <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                <a href={mention.url} target="_blank" rel="noreferrer" aria-label="Open">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <LinkStoryMenu stories={stories} currentId={mention.story_id} onLink={onLink} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function MentionInline({
  mention, onEdit, onUnlink,
}: { mention: MediaMention; onEdit: (m: MediaMention) => void; onUnlink: () => void }) {
  return (
    <div className="flex items-center gap-2 group/inline">
      <span className="text-xs text-muted-foreground tabular-nums w-16 shrink-0">{format(parseLocalDate(mention.date), "d MMM")}</span>
      <Badge variant="outline" className="text-[10px] shrink-0">{mention.type}</Badge>
      <button onClick={() => onEdit(mention)} className="text-sm text-left truncate flex-1 hover:underline">
        {mention.title} {mention.outlet && <span className="text-muted-foreground">· {mention.outlet}</span>}
      </button>
      {mention.url && (
        <a href={mention.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        onClick={onUnlink}
        className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover/inline:opacity-100 transition-opacity"
      >
        Unlink
      </button>
    </div>
  );
}

function LinkStoryMenu({
  stories, currentId, onLink,
}: { stories: MediaStory[]; currentId: string | null; onLink: (storyId: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Link to story">
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Add to story</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stories.length === 0 ? (
          <DropdownMenuItem disabled>No stories yet</DropdownMenuItem>
        ) : (
          stories.map((s) => (
            <DropdownMenuItem
              key={s.id}
              onClick={() => onLink(s.id)}
              className={cn(s.id === currentId && "bg-accent")}
            >
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              <span className="truncate">{s.title}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TimelineSpine({ accent }: { accent: "primary" | "muted" }) {
  return (
    <div className="relative flex flex-col items-center shrink-0 w-3">
      <div className={cn(
        "w-3 h-3 rounded-full ring-4 ring-background mt-3 z-10",
        accent === "primary" ? "bg-primary" : "bg-muted-foreground/40"
      )} />
      <div className="w-px flex-1 bg-border" />
    </div>
  );
}
