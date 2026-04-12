import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Copy,
  Plus,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Terminal,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ApiToken {
  id: string;
  token_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_revoked: boolean;
}

export function McpSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState("Claude Desktop");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);

  const mcpBaseUrl = `https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/mcp-server`;

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["mcp-api-tokens", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcp_api_tokens" as any)
        .select("id, token_prefix, name, created_at, last_used_at, is_revoked")
        .eq("user_id", user!.id)
        .eq("is_revoked", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ApiToken[];
    },
    enabled: !!user,
  });

  const createToken = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc("create_mcp_api_token" as any, {
        p_name: name,
      });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: (token) => {
      setNewToken(token);
      setShowToken(true);
      queryClient.invalidateQueries({ queryKey: ["mcp-api-tokens"] });
      toast.success("API token created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("mcp_api_tokens" as any)
        .update({ is_revoked: true } as any)
        .eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-api-tokens"] });
      toast.success("Token revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyToClipboard = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} to clipboard`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Terminal className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Claude Integration</h2>
          <p className="text-sm text-muted-foreground">Connect your data to Claude via MCP</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Use Claude to check your goals, log habits, review weekly progress, and get suggestions — all through natural conversation.
        Works with <strong>claude.ai</strong>, <strong>Claude Desktop</strong>, and <strong>Claude Mobile</strong>.
      </p>

      {/* Step 1: Generate an API token */}
      <div className="bg-muted/50 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            1
          </div>
          <div>
            <p className="text-sm font-semibold">Generate an API token</p>
            <p className="text-xs text-muted-foreground">
              This token lets Claude access your data securely. You can revoke it anytime.
            </p>
          </div>
        </div>

        {/* Create token form */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="token-name" className="sr-only">Token name</Label>
            <Input
              id="token-name"
              placeholder="Token name (e.g. Claude Desktop)"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="bg-background"
            />
          </div>
          <Button
            onClick={() => createToken.mutate(tokenName)}
            disabled={createToken.isPending || !tokenName.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate
          </Button>
        </div>

        {/* Newly created token */}
        {newToken && (
          <div className="bg-background border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Save this now — you won't see it again</span>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium">Claude.ai connector URL (paste this):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted border rounded px-3 py-2 text-xs font-mono break-all">
                  {showToken ? `${mcpBaseUrl}?token=${newToken}` : "•".repeat(60)}
                </code>
                <Button variant="ghost" size="sm" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${mcpBaseUrl}?token=${newToken}`, "URL copied")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setNewToken(null)}
            >
              Done — I've saved it
            </Button>
          </div>
        )}

        {/* Existing tokens */}
        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background border"
          >
            <div className="flex items-center gap-3">
              <Key className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground">
                  {token.token_prefix}… · Created {formatTimeAgo(new Date(token.created_at).getTime())}
                  {token.last_used_at && <> · Last used {formatTimeAgo(new Date(token.last_used_at).getTime())}</>}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => revokeToken.mutate(token.id)}
              disabled={revokeToken.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {!isLoading && tokens.length === 0 && !newToken && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No active tokens. Generate one above to get started.
          </p>
        )}
      </div>

      {/* Step 2: Add to Claude */}
      <div className="bg-muted/50 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            2
          </div>
          <p className="text-sm font-semibold">Add to Claude</p>
        </div>

        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside ml-1">
          <li>
            Open{" "}
            <a
              href="https://claude.ai/settings/connectors"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              claude.ai/settings/connectors
            </a>{" "}
            and click <strong>"Add custom MCP server"</strong>.
          </li>
          <li>
            Paste the <strong>URL</strong> you copied above.
          </li>
          <li>
            Click <strong>"Add"</strong>, then enable the connector in any chat via the{" "}
            <strong>+</strong> button → <strong>Connectors</strong>.
          </li>
        </ol>

        <p className="text-xs text-muted-foreground italic">
          Available on Claude Pro, Max, Team, and Enterprise plans. Free plans support 1 custom connector.
        </p>
      </div>

      {/* Collapsible: What can you ask Claude? */}
      <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors w-full">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${toolsOpen ? "rotate-0" : "-rotate-90"}`}
          />
          What can you ask Claude?
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { name: "get_active_goals", desc: "Fetch active goals" },
              { name: "get_weekly_objectives", desc: "View weekly objectives" },
              { name: "get_week_summary", desc: "Full week snapshot" },
              { name: "get_goal_details", desc: "Goal with objectives & habits" },
              { name: "search_goals", desc: "Search goal titles" },
              { name: "get_daily_check_ins", desc: "Check-in history" },
              { name: "get_weekly_planning", desc: "Planning sessions" },
              { name: "get_streaks", desc: "Check streaks" },
              { name: "get_habit_completions", desc: "View habit completions" },
              { name: "get_analytics_summary", desc: "Productivity analytics" },
              { name: "get_partnerships", desc: "List accountability partners" },
              { name: "get_friends", desc: "List friends" },
              { name: "get_training_plan", desc: "View planned vs actual workouts" },
              { name: "get_training_history", desc: "Analyze training trends" },
              { name: "get_strava_activity_details", desc: "See full Strava workout data" },
              { name: "create_goal", desc: "Create a new goal" },
              { name: "update_goal", desc: "Update goal status/details" },
              { name: "create_objective", desc: "Add weekly objective" },
              { name: "update_objective", desc: "Update/complete objective" },
              { name: "delete_objective", desc: "Remove an objective" },
              { name: "create_weekly_planning", desc: "Start planning session" },
              { name: "log_habit_completion", desc: "Toggle habit completion" },
              { name: "send_check_in", desc: "Send partner check-in" },
              { name: "log_daily_check_in", desc: "Log daily check-in" },
              { name: "set_training_plan", desc: "Create or update weekly workouts" },
              { name: "match_workout", desc: "Manually link plan to Strava workout" },
            ].map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/50"
              >
                <code className="text-xs font-mono text-primary">{tool.name}</code>
                <span className="text-xs text-muted-foreground ml-auto">{tool.desc}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
