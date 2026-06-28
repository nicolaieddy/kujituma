import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquareWarning, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const HIDDEN_PATH_PREFIXES = ["/auth", "/onboarding"];

export function ReportFeedbackButton() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading || !user) return null;
  if (HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: "Please write a message", variant: "destructive" });
      return;
    }
    if (trimmed.length > 5000) {
      toast({ title: "Message is too long (max 5000 chars)", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-feedback", {
        body: {
          message: trimmed,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        },
      });
      if (error) throw error;

      const emailed = (data as { emailed?: boolean } | null)?.emailed;
      toast({
        title: "Feedback sent",
        description: emailed
          ? "Thanks — Nicolai has been notified."
          : "Saved. Email delivery is still warming up; it will reach the admin shortly.",
      });
      setMessage("");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not send feedback",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-50 h-10 rounded-full shadow-lg px-4 gap-2 bg-primary text-primary-foreground hover:opacity-90"
        aria-label="Report feedback"
      >
        <MessageSquareWarning className="h-4 w-4" />
        <span className="hidden sm:inline text-sm font-medium">Feedback</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Report feedback</DialogTitle>
              <DialogDescription>
                Found a bug, have a request, or want to share an idea? It goes straight to Nicolai.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="feedback-message">Your message</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={6}
                maxLength={5000}
                disabled={submitting}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/5000
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !message.trim()}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send feedback
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
