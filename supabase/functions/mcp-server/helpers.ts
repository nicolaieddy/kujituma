import { createClient } from "npm:@supabase/supabase-js@2";

// ── AUTH HELPERS ────────────────────────────────────────────

export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export function createAuthClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

export async function getUser(request: Request) {
  let token = "";

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader) {
    token = authHeader.replace(/^Bearer\s+/i, "").trim();
  }

  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get("token") || "";
  }

  if (!token) return { supabase: createServiceClient(), user: null };

  if (token.startsWith("kuj_")) {
    const svc = createServiceClient();
    const { data: userId, error } = await svc.rpc("validate_mcp_api_token", {
      p_token: token,
    });
    if (error || !userId) return { supabase: svc, user: null };
    return { supabase: svc, user: { id: userId as string } };
  }

  const bearer = `Bearer ${token}`;
  const supabase = createAuthClient(bearer);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

// ── DATE HELPERS ───────────────────────────────────────────

export function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return toDateStr(d);
}

export function getWeekEnd(monday: string): string {
  const d = new Date(monday + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return toDateStr(d);
}

export function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
