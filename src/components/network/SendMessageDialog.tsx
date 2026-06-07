import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { useCreateInteraction } from "@/hooks/useData";
import { DEFAULT_TEMPLATES, fillTemplate, buildWhatsAppUrl } from "@/lib/messageTemplates";
import { format } from "date-fns";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  whatsappNumber: string | null;
  eventType: "birthday" | "follow_up" | "custom_event";
}

const SendMessageDialog = ({ open, onOpenChange, contactId, contactName, whatsappNumber, eventType }: SendMessageDialogProps) => {
  const { data: templates = [] } = useMessageTemplates();
  const createInteraction = useCreateInteraction();
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  const userTemplate = templates.find((t) => t.event_type === eventType);
  const templateText = userTemplate?.template || DEFAULT_TEMPLATES[eventType] || DEFAULT_TEMPLATES.custom_event;
  const message = fillTemplate(templateText, contactName);

  const [editedMessage, setEditedMessage] = useState("");

  // Reset state when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setEditedMessage(message);
      setCopied(false);
      setLogged(false);
    }
    onOpenChange(o);
  };

  const currentMessage = open ? editedMessage || message : message;

  const logInteraction = async () => {
    try {
      await createInteraction.mutateAsync({
        contact_id: contactId,
        date: format(new Date(), "yyyy-MM-dd"),
        type: "Message",
        summary: currentMessage,
        follow_up_date: null,
        direction: null,
      });
      setLogged(true);
      toast.success("Interaction logged!");
    } catch {
      toast.error("Failed to log interaction");
    }
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappNumber) return;
    window.open(buildWhatsAppUrl(whatsappNumber, currentMessage), "_blank");
    await logInteraction();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    toast.success("Message copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Message to {contactName.split(" ")[0]}
          </DialogTitle>
          <DialogDescription>
            {whatsappNumber
              ? "Edit the message below, then send via WhatsApp."
              : "This contact doesn't have a WhatsApp number. Copy the message and send it manually."}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={open ? editedMessage || message : ""}
          onChange={(e) => setEditedMessage(e.target.value)}
          rows={4}
          className="resize-none"
        />

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            {whatsappNumber && (
              <Button onClick={handleSendWhatsApp} className="flex-1 gap-2" disabled={logged}>
                <ExternalLink className="h-4 w-4" />
                Send via WhatsApp
              </Button>
            )}
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {!logged && (
            <Button variant="secondary" onClick={logInteraction} className="w-full gap-2" disabled={createInteraction.isPending}>
              <Check className="h-4 w-4" />
              Mark as Sent
            </Button>
          )}
          {logged && (
            <p className="text-xs text-center text-[hsl(var(--success))] font-medium">✓ Marked as sent &amp; logged to interactions</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageDialog;
