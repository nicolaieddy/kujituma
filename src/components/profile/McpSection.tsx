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

  const mcpUrl = `https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/mcp-server`;

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
          url: mcpUrl,
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

      {/* Connection instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Setup</CardTitle>
          <CardDescription>
            Add this to your Claude Desktop config (
            <code className="text-xs bg-muted px-1 py-0.5 rounded">claude_desktop_config.json</code>
            )
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <span>
              Replace <code className="bg-muted px-1 py-0.5 rounded text-xs">YOUR_API_TOKEN</code>{" "}
              with a token generated below.
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Server URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted/50 border rounded-lg px-3 py-2 text-xs font-mono break-all">
                {mcpUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(mcpUrl, "URL copied")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
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
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">
                  Copy this token now — you won't see it again
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background border rounded px-3 py-2 text-xs font-mono break-all">
                  {showToken ? newToken : "•".repeat(40)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(newToken, "Token copied")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setNewToken(null)}
              >
                Dismiss
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
