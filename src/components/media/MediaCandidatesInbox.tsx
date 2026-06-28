import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check, X } from "lucide-react";
import { useApproveCandidate, useRejectCandidate, useMediaCandidates } from "@/hooks/media/useMedia";
import { toast } from "sonner";

export function MediaCandidatesInbox({ onEditApprove }: { onEditApprove: (candidateId: string) => void }) {
  const { data: candidates = [], isLoading } = useMediaCandidates();
  const approve = useApproveCandidate();
  const reject = useRejectCandidate();

  if (isLoading) return <Card className="p-6 text-sm text-muted-foreground">Loading inbox…</Card>;
  if (!candidates.length) return <Card className="p-6 text-sm text-muted-foreground">No pending candidates. Agent-discovered mentions will land here for review.</Card>;

  return (
    <div className="space-y-3">
      {candidates.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{c.date ?? "no date"}</span>
                <span>·</span>
                <Badge variant="outline" className="text-[10px]">{c.type ?? "Article"}</Badge>
                <Badge variant="secondary" className="text-[10px]">{c.source}</Badge>
                {c.confidence != null && <span>confidence {Number(c.confidence).toFixed(2)}</span>}
              </div>
              <div className="mt-1 font-medium">{c.title}</div>
              {c.outlet ? <div className="text-sm text-muted-foreground">{c.outlet}</div> : null}
              {c.summary ? <p className="mt-2 text-sm">{c.summary}</p> : null}
              {c.raw_snippet ? <p className="mt-2 text-xs text-muted-foreground italic line-clamp-3">“{c.raw_snippet}”</p> : null}
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Open source
                </a>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button size="sm" onClick={async () => {
                try {
                  await approve.mutateAsync({ candidate: c });
                  toast.success("Approved");
                } catch (e: any) { toast.error(e?.message ?? "Failed"); }
              }}>
                <Check className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onEditApprove(c.id)}>Edit…</Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                await reject.mutateAsync(c.id);
                toast.success("Rejected");
              }}>
                <X className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
