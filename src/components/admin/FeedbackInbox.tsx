import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Mail, MailOpen, ExternalLink, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface FeedbackRow {
  id: string;
  user_id: string;
  user_email: string | null;
  message: string;
  page_url: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
}

type FilterMode = "open" | "resolved" | "all";

const FILTERS: { value: FilterMode; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

export default function FeedbackInbox() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterMode>("open");

  const { data: items = [], isLoading } = useQuery<FeedbackRow[]>({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_submissions")
        .select("id,user_id,user_email,message,page_url,created_at,is_read,read_at,is_resolved,resolved_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });

  const toggleRead = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const { error } = await supabase
        .from("feedback_submissions")
        .update({
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-unread-count"] });
    },
    onError: (e) =>
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }),
  });

  const toggleResolved = useMutation({
    mutationFn: async ({ id, isResolved }: { id: string; isResolved: boolean }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("feedback_submissions")
        .update({
          is_resolved: isResolved,
          resolved_at: isResolved ? now : null,
          // resolving also marks read
          ...(isResolved ? { is_read: true, read_at: now } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-unread-count"] });
      toast({
        title: vars.isResolved ? "Marked resolved" : "Reopened",
      });
    },
    onError: (e) =>
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("feedback_submissions")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
      qc.invalidateQueries({ queryKey: ["admin-feedback-unread-count"] });
      toast({ title: "All feedback marked as read" });
    },
  });

  const counts = useMemo(() => {
    const open = items.filter((i) => !i.is_resolved).length;
    const resolved = items.filter((i) => i.is_resolved).length;
    return { open, resolved, all: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "open") return items.filter((i) => !i.is_resolved);
    if (filter === "resolved") return items.filter((i) => i.is_resolved);
    return items;
  }, [items, filter]);

  const unreadCount = items.filter((i) => !i.is_read && !i.is_resolved).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading feedback...
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Feedback Inbox</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {counts.open} open · {counts.resolved} resolved · {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-70">
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {filter === "resolved"
              ? "No resolved feedback yet."
              : filter === "open"
              ? "Inbox zero. Nothing open."
              : "No feedback yet."}
          </div>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 transition-colors ${
              item.is_resolved
                ? "bg-background border-border opacity-70"
                : item.is_read
                ? "bg-background border-border"
                : "bg-accent/40 border-l-2 border-l-primary"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">
                    {item.user_email ?? "Anonymous"}
                  </span>
                  {!item.is_read && !item.is_resolved && (
                    <Badge variant="default" className="text-[10px] h-5">
                      NEW
                    </Badge>
                  )}
                  {item.is_resolved && (
                    <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Resolved
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!item.is_resolved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      toggleRead.mutate({ id: item.id, isRead: !item.is_read })
                    }
                    disabled={toggleRead.isPending}
                    title={item.is_read ? "Mark unread" : "Mark read"}
                  >
                    {item.is_read ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <MailOpen className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={item.is_resolved ? "ghost" : "outline"}
                  onClick={() =>
                    toggleResolved.mutate({
                      id: item.id,
                      isResolved: !item.is_resolved,
                    })
                  }
                  disabled={toggleResolved.isPending}
                  title={item.is_resolved ? "Reopen" : "Mark resolved"}
                  className="gap-1"
                >
                  {item.is_resolved ? (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      <span className="text-xs">Reopen</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Resolve</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="whitespace-pre-wrap text-sm text-foreground bg-muted/40 rounded-md p-3 border border-border">
              {item.message}
            </div>

            {item.page_url && (
              <a
                href={item.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="truncate max-w-[400px]">{item.page_url}</span>
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
