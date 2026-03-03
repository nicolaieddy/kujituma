import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Copy,
  Plus,
  Trash2,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";

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

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        kujituma: {
          url: mcpBaseUrl,
          headers: {
            Authorization: "Bearer YOUR_API_TOKEN",
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">MCP Server</h2>
      </div>

      <p className="text-muted-foreground text-sm">
        Connect Claude Desktop (or any MCP client) to manage your goals, objectives, habits, and
        check-ins via natural language.
      </p>

      {/* Step-by-step setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to Connect</CardTitle>
          <CardDescription>
            Follow these steps to connect your MCP client (Claude Desktop, ChatGPT, Cursor, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">1</Badge>
              <p className="text-sm font-medium">Generate an API token below</p>
            </div>
            <p className="text-xs text-muted-foreground ml-8">
              Scroll down to the <strong>API Tokens</strong> section and click <strong>Generate</strong>. Copy the token immediately — it's only shown once.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">2</Badge>
              <p className="text-sm font-medium">Add the server to your MCP client</p>
            </div>

            <div className="ml-8 space-y-4">
              {/* Claude.ai (Web) */}
              <div className="space-y-1.5 border rounded-lg p-3">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  🌐 Claude.ai (Web)
                  <Badge variant="outline" className="text-[10px]">Easiest</Badge>
                </p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li><strong>Generate an API token below</strong> (scroll to API Tokens section)</li>
                  <li>Copy the <strong>Claude.ai connector URL</strong> that appears (it includes your token)</li>
                  <li>
                    Go to{" "}
                    <a href="https://claude.ai/settings/connectors" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      claude.ai/settings/connectors
                    </a>
                  </li>
                  <li>Click <strong>"Add custom connector"</strong> and paste the URL you copied</li>
                  <li>Click <strong>"Add"</strong> — no OAuth needed</li>
                  <li>In a new chat, click <strong>"+"</strong> → <strong>Connectors</strong> → enable <strong>Kujituma</strong></li>
                </ol>
                <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Don't paste the plain Server URL — it won't work without your token. Use the full URL shown after generating a token.
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Available on Free (1 connector), Pro, Max, Team, and Enterprise plans.{" "}
                  <a href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Learn more →
                  </a>
                </p>
              </div>

              {/* Claude Desktop */}
              <div className="space-y-1.5 border rounded-lg p-3">
                <p className="text-xs font-medium">🖥️ Claude Desktop</p>
                <p className="text-xs text-muted-foreground">
                  Open <strong>Settings → Developer → Edit Config</strong>, then paste into{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">claude_desktop_config.json</code>.
                  Replace <code className="bg-muted px-1 py-0.5 rounded text-xs">YOUR_API_TOKEN</code> with your token:
                </p>
                <div className="relative">
                  <pre className="bg-muted/50 border rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                    {claudeConfig}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(claudeConfig, "Config copied")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Other clients */}
              <div className="space-y-1.5 border rounded-lg p-3">
                <p className="text-xs font-medium">⚡ ChatGPT / Cursor / Other MCP clients</p>
                <p className="text-xs text-muted-foreground">
                  Use the <strong>Server URL</strong> above and set an <strong>Authorization</strong> header:{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">Bearer YOUR_API_TOKEN</code>
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">3</Badge>
              <p className="text-sm font-medium">Start using it</p>
            </div>
            <p className="text-xs text-muted-foreground ml-8">
              Restart your MCP client. You can then ask things like <em>"What are my active goals?"</em>,{" "}
              <em>"Add an objective for this week"</em>, or <em>"Log my daily check-in"</em>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Tools</CardTitle>
          <CardDescription>
            Your MCP server exposes these tools to Claude
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { name: "get_active_goals", desc: "Fetch active goals" },
              { name: "get_weekly_objectives", desc: "View weekly objectives" },
              { name: "get_streaks", desc: "Check streaks" },
              { name: "get_habit_completions", desc: "View habit completions" },
              { name: "get_analytics_summary", desc: "Productivity analytics" },
              { name: "get_partnerships", desc: "List accountability partners" },
              { name: "create_objective", desc: "Add weekly objective" },
              { name: "update_objective", desc: "Update/complete objective" },
              { name: "log_habit_completion", desc: "Toggle habit completion" },
              { name: "send_check_in", desc: "Send partner check-in" },
              { name: "log_daily_check_in", desc: "Log daily check-in" },
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
        </CardContent>
      </Card>

      {/* Token management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Tokens
          </CardTitle>
          <CardDescription>
            Generate long-lived tokens so you don't need to copy session tokens manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create token form */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="token-name" className="sr-only">
                Token name
              </Label>
              <Input
                id="token-name"
                placeholder="Token name (e.g. Claude Desktop)"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
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

          {/* Newly created token (show once) */}
          {newToken && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">
                  Save this now — you won't see it again
                </span>
              </div>

              {/* Ready-to-paste URL for Claude.ai */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Claude.ai connector URL (paste this):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background border rounded px-3 py-2 text-xs font-mono break-all">
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

              {/* Raw token for Claude Desktop / other clients */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Raw API token (for Claude Desktop / other clients):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background border rounded px-3 py-2 text-xs font-mono break-all">
                    {showToken ? newToken : "•".repeat(40)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(newToken, "Token copied")}
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
          {tokens.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Tokens</p>
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{token.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {token.token_prefix}…
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {formatTimeAgo(new Date(token.created_at).getTime())}
                      {token.last_used_at && <> · Last used {formatTimeAgo(new Date(token.last_used_at).getTime())}</>}
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
            </div>
          )}

          {!isLoading && tokens.length === 0 && !newToken && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active tokens. Generate one above to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* External links */}
      <div className="flex items-center gap-4 text-sm">
        <a
          href="https://modelcontextprotocol.io/quickstart/user"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          MCP Docs <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href="https://claude.ai/download"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          Claude Desktop <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
