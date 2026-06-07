import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useMessageTemplates, useUpsertMessageTemplate } from "@/hooks/network/useMessageTemplates";
import { DEFAULT_TEMPLATES, EVENT_TYPE_LABELS } from "@/lib/messageTemplates";

const MessageTemplateSettings = () => {
  const { data: templates = [] } = useMessageTemplates();
  const upsert = useUpsertMessageTemplate();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const d: Record<string, string> = {};
    Object.keys(DEFAULT_TEMPLATES).forEach((type) => {
      const saved = templates.find((t) => t.event_type === type);
      d[type] = saved?.template || DEFAULT_TEMPLATES[type];
    });
    setDrafts(d);
  }, [templates]);

  const handleSave = async (eventType: string) => {
    try {
      await upsert.mutateAsync({ event_type: eventType, template: drafts[eventType] });
      toast.success(`${EVENT_TYPE_LABELS[eventType]} template saved!`);
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleReset = (eventType: string) => {
    setDrafts((prev) => ({ ...prev, [eventType]: DEFAULT_TEMPLATES[eventType] }));
  };

  return (
    <div className="space-y-4">
      {Object.entries(DEFAULT_TEMPLATES).map(([eventType, defaultVal]) => {
        const current = drafts[eventType] ?? defaultVal;
        const saved = templates.find((t) => t.event_type === eventType);
        const isDirty = current !== (saved?.template || defaultVal);

        return (
          <div key={eventType} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{EVENT_TYPE_LABELS[eventType]}</label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleReset(eventType)} title="Reset to default">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" onClick={() => handleSave(eventType)} disabled={!isDirty || upsert.isPending}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save
                </Button>
              </div>
            </div>
            <Textarea
              value={current}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [eventType]: e.target.value }))}
              rows={2}
              className="resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{name}"}</code> for the contact's first name</p>
          </div>
        );
      })}
    </div>
  );
};

export default MessageTemplateSettings;
