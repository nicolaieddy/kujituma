import { useState } from "react";
import { Bookmark, GripHorizontal, Copy, Check, MessageSquare, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MessageTemplateSettings from "@/components/network/MessageTemplateSettings";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

const bookmarkletCode = `javascript:void(window.open('${APP_URL}/network/quick-add?url='+encodeURIComponent(location.href),'NetworkOS'))`;

interface ToolSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const ToolSection = ({ icon, title, description, defaultOpen = false, children }: ToolSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                {icon}
              </div>
              <div>
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border mt-0 pt-4">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const Tools = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    toast.success("Bookmarklet code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in space-y-3">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Tools</h1>
        <p className="text-sm text-muted-foreground">Utilities to speed up your workflow</p>
      </div>

      {/* Claude / MCP — managed centrally in Profile */}
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Network data is exposed through Kujituma's shared MCP server (tools prefixed{" "}
        <code className="text-foreground">network_*</code>). Manage your API token in{" "}
        <Link to="/profile" className="text-primary underline underline-offset-2 hover:text-primary/80">
          Profile → Claude Integration
        </Link>
        .
      </div>

      {/* Quick Add Bookmarklet */}
      <ToolSection
        icon={<Bookmark className="h-4 w-4 text-primary" />}
        title="Quick Add Bookmarklet"
        description="One-click contact creation from any social profile"
      >
        <p className="text-sm">
          Drag the button below to your browser's bookmarks bar. When you're on a LinkedIn, Instagram, or X profile, click it to instantly open the Add Contact form pre-filled with the URL.
        </p>

        <div className="flex items-center gap-3">
          <a
            href={bookmarkletCode}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 cursor-grab active:cursor-grabbing"
            title="Drag this to your bookmarks bar"
          >
            <GripHorizontal className="h-4 w-4" />
            + Add to Network OS
          </a>
          <span className="text-xs text-muted-foreground">← Drag to bookmarks bar</span>
        </div>

        <div className="rounded-md bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Can't drag? Copy and create a bookmark manually:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs bg-background rounded px-2 py-1 border border-border">
              {bookmarkletCode}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">How it works:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Visit a LinkedIn, Instagram, or X profile</li>
            <li>Click the bookmarklet in your bookmarks bar</li>
            <li>Network OS opens with the URL pre-filled</li>
            <li>Hit "Auto-fill" to enrich, then save</li>
          </ol>
        </div>
      </ToolSection>

      {/* Message Templates */}
      <ToolSection
        icon={<MessageSquare className="h-4 w-4 text-primary" />}
        title="Message Templates"
        description="Customize quick-send messages for calendar events"
      >
        <MessageTemplateSettings />
      </ToolSection>
    </div>
  );
};

export default Tools;
