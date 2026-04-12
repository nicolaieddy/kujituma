import { Hono } from "npm:hono@4";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { getUser, corsHeaders } from "./helpers.ts";
import { registerReadTools } from "./read-tools.ts";
import { registerWriteTools } from "./write-tools.ts";
import { registerResources, registerPrompts } from "./resources-prompts.ts";
import { registerTrainingReadTools, registerTrainingWriteTools } from "./training-tools.ts";

// ── MCP SERVER FACTORY ─────────────────────────────────────

function createConfiguredServer(supabase: any, userId: string) {
  const mcp = new McpServer({
    name: "kujituma-mcp",
    version: "1.0.0",
  });

  registerReadTools(mcp, supabase, userId);
  registerWriteTools(mcp, supabase, userId);
  registerTrainingReadTools(mcp, supabase, userId);
  registerTrainingWriteTools(mcp, supabase, userId);
  registerResources(mcp, supabase, userId);
  registerPrompts(mcp);

  return mcp;
}

// ── HONO APP ───────────────────────────────────────────────

const app = new Hono();

app.all("/*", async (c) => {
  console.log(`[MCP] ${c.req.method} ${c.req.url}`);

  if (c.req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { supabase, user } = await getUser(c.req.raw);
  if (!user) {
    console.log("[MCP] Auth failed — no valid user");
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Unauthorized — provide a valid API token or JWT" },
        id: null,
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[MCP] Authenticated user: ${user.id}`);

  const mcp = createConfiguredServer(supabase, user.id);
  const transport = new StreamableHttpTransport();
  const httpHandler = transport.bind(mcp);

  try {
    const response = await httpHandler(c.req.raw);
    console.log(`[MCP] Response status: ${response.status}`);
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    console.error("[MCP] Handler error:", err);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

Deno.serve(app.fetch);
