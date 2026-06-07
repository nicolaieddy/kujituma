import { useState } from "react";
import { Bookmark, GripHorizontal, Copy, Check, MessageSquare, Bot, ChevronDown } from "lucide-react";
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

      {/* MCP Server for Claude */}
      <ToolSection
        icon={<Bot className="h-4 w-4 text-primary" />}
        title="Claude Integration"
        description="Connect your network to Claude via MCP"
        defaultOpen
      >
        <p className="text-sm text-muted-foreground">
          Use Claude to search contacts, log interactions, check upcoming events, and get follow-up suggestions — all through natural conversation. Works with <strong className="text-foreground">claude.ai</strong>, <strong className="text-foreground">Claude Desktop</strong>, and <strong className="text-foreground">Claude Mobile</strong>.
        </p>

        {/* Step 1: Generate Token */}
        <div className="rounded-md border border-border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            <p className="text-sm font-semibold">Generate an API token</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Network data is exposed through Kujituma's shared MCP server. Generate or copy your
            token from <a href="/profile" className="text-primary underline underline-offset-2 hover:text-primary/80">Profile → MCP</a>.
          </p>
        </div>

        {/* Step 2: Connect to Claude */}
        <div className="rounded-md border border-border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            <p className="text-sm font-semibold">Add to Claude</p>
          </div>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
            <li>
              Open{" "}
              <a href="https://claude.ai/settings/connectors" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                claude.ai/settings/connectors
              </a>{" "}
              and click <strong className="text-foreground">"Add custom MCP server"</strong>.
            </li>
            <li>
              Paste the <strong className="text-foreground">URL</strong> you copied above.
            </li>
            <li>Click <strong className="text-foreground">"Add"</strong>, then enable the connector in any chat via the <strong className="text-foreground">+</strong> button → <strong className="text-foreground">Connectors</strong>.</li>
          </ol>
          <p className="text-xs text-muted-foreground italic">
            Available on Claude Pro, Max, Team, and Enterprise plans. Free plans support 1 custom connector.
          </p>
        </div>

        {/* What you can do */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium hover:text-foreground transition-colors">What can you ask Claude?</summary>
          <div className="mt-2 ml-1 space-y-1.5">
            <p className="text-xs">Once connected, try prompts like:</p>
            <ul className="list-disc list-inside space-y-0.5 italic">
              <li>"Who should I follow up with this week?"</li>
              <li>"Find all my contacts in Berlin"</li>
              <li>"Log a call with Sarah — we discussed the Q3 launch"</li>
              <li>"What birthdays are coming up?"</li>
            </ul>
            <p className="text-xs font-medium mt-2 not-italic">Available tools:</p>
            <ul className="list-disc list-inside space-y-0.5 not-italic">
              <li><strong>search_contacts</strong> — Find contacts by name, country, sector, etc.</li>
              <li><strong>get_contact</strong> — Full details with interactions & key facts</li>
              <li><strong>log_interaction</strong> — Log meetings, calls, messages</li>
              <li><strong>list_upcoming_events</strong> — Birthdays, follow-ups, custom events</li>
              <li><strong>suggest_followups</strong> — AI-prioritized follow-up suggestions</li>
            </ul>
          </div>
        </details>
      </ToolSection>

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
