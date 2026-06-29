import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Mail, MailOpen, ExternalLink, Loader2 } from "lucide-react";
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
}

export default function FeedbackInbox() {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery<FeedbackRow[]>({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_submissions")
        .select("id,user_id,user_email,message,page_url,created_at,is_read,read_at")
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

  const unreadCount = items.filter((i) => !i.is_read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading feedback...
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Feedback Inbox</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} total · {unreadCount} unread
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
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No feedback yet.
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 transition-colors ${
              item.is_read
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
                  {!item.is_read && (
                    <Badge variant="default" className="text-[10px] h-5">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
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
