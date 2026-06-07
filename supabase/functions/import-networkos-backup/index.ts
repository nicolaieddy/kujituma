// One-off NetworkOS -> Kujituma importer. Delete after use.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_USER_ID = "0c11761b-92fb-473b-81a7-f17c53d68320"; // jimboberyl@gmail.com

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const tables = body?.tables;
    if (!tables) throw new Error("missing tables");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const remap = <T extends Record<string, any>>(rows: T[]) =>
      rows.map((r) => ({ ...r, user_id: TARGET_USER_ID }));

    const results: Record<string, { inserted: number; error?: string }> = {};

    const doInsert = async (table: string, rows: any[]) => {
      if (!rows?.length) { results[table] = { inserted: 0 }; return; }
      const { error, count } = await admin
        .from(table)
        .upsert(remap(rows), { onConflict: "id", ignoreDuplicates: true, count: "exact" });
      results[table] = { inserted: count ?? rows.length, error: error?.message };
    };

    await doInsert("network_contacts", tables.contacts);
    await doInsert("network_interactions", tables.interactions);
    await doInsert("network_contact_events", tables.contact_events);
    await doInsert("network_contact_key_facts", tables.contact_key_facts);
    await doInsert("network_contact_resources", tables.contact_resources);
    await doInsert("network_message_templates", tables.message_templates);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
