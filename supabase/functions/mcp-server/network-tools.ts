// Network module MCP tools — ported from NetworkOS.
// Tool names use `network_` / `contact_` prefixes registered in the module surfaces.
// Tables: network_contacts, network_interactions, network_contact_events,
// network_contact_key_facts, network_contact_resources, network_message_templates.

import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INFLUENCE_TYPES = [
  "Regulator", "Lawyer", "Politician", "Founder", "Investor",
  "Operator", "Media", "Banker", "Other",
];
const ENRICHABLE_FIELDS = [
  "full_name", "influence_type", "living_location", "country", "region",
  "sector", "notes", "instagram_url", "twitter_url", "linkedin_url",
  "email", "whatsapp_number",
];

const txt = (text: string) =>
  ({ content: [{ type: "text" as const, text }] });

async function findContact(
  supabase: Supabase,
  userId: string,
  nameOrId: string,
) {
  const isUuid = UUID_RE.test(nameOrId);
  let q = supabase
    .from("network_contacts")
    .select("*")
    .eq("user_id", userId);
  q = isUuid ? q.eq("id", nameOrId) : q.ilike("full_name", `%${nameOrId}%`);
  const { data } = await q.limit(1).maybeSingle();
  return data;
}

// ── ENRICHMENT HELPERS ────────────────────────────────────────

async function scrapeProfiles(urls: string[]): Promise<string[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const allMarkdown: string[] = [];
  for (const url of urls) {
    let scraped = false;
    if (FIRECRAWL_API_KEY) {
      try {
        const isLinkedIn = url.includes("linkedin.com");
        if (!isLinkedIn) {
          const usernameMatch = url.match(
            /(?:instagram\.com|x\.com|twitter\.com)\/([^\/\?]+)/,
          );
          const username = usernameMatch ? usernameMatch[1].replace(/-/g, " ") : url;
          const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `${username} profile site:${new URL(url).hostname}`,
              limit: 3,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });
          const searchData = await searchResponse.json();
          if (searchResponse.ok && searchData.success) {
            const results = searchData.data || [];
            const md = results
              .map((r: any) => `Source: ${url}\n${r.title || ""}\n${r.description || ""}\n${r.markdown || ""}`)
              .join("\n\n");
            if (md.length > 30) {
              allMarkdown.push(md);
              scraped = true;
              continue;
            }
          }
        }
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], waitFor: 3000 }),
        });
        const scrapeData = await scrapeResponse.json();
        if (scrapeResponse.ok && scrapeData.success) {
          const md = `Source: ${url}\n${scrapeData.data?.markdown || ""}`;
          if (md.length > 30) {
            allMarkdown.push(md);
            scraped = true;
          }
        }
      } catch (e) {
        console.log(`Firecrawl error for ${url}:`, e);
      }
    }
    if (!scraped) {
      try {
        const microlinkResponse = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const microlinkData = await microlinkResponse.json();
        if (microlinkData.status === "success" && microlinkData.data) {
          const d = microlinkData.data;
          const md = [
            `Source: ${url}`,
            d.title ? `Name/Title: ${d.title}` : "",
            d.description ? `Description: ${d.description}` : "",
            d.author ? `Author: ${d.author}` : "",
            d.publisher ? `Publisher/Company: ${d.publisher}` : "",
          ].filter(Boolean).join("\n");
          if (md.length > 30) allMarkdown.push(md);
        }
      } catch (e) {
        console.log("Microlink fallback error:", e);
      }
    }
  }
  return allMarkdown;
}

async function extractWithAI(markdown: string): Promise<Record<string, any>> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("AI gateway not configured.");
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a data extraction assistant. Extract structured contact information from social media profile content. Be precise and concise." },
        { role: "user", content: `Extract contact information from these social media profiles:\n\n${markdown.slice(0, 8000)}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_contact",
          description: "Extract structured contact fields from social media profiles.",
          parameters: {
            type: "object",
            properties: {
              full_name: { type: "string" },
              influence_type: { type: "string", enum: INFLUENCE_TYPES },
              living_location: { type: "string" },
              country: { type: "string" },
              region: { type: "string" },
              sector: { type: "string" },
              notes: { type: "string" },
              instagram_url: { type: "string" },
              twitter_url: { type: "string" },
              linkedin_url: { type: "string" },
            },
            required: ["full_name"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_contact" } },
    }),
  });
  if (!aiResponse.ok) throw new Error(`AI gateway error ${aiResponse.status}`);
  const aiData = await aiResponse.json();
  const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI could not extract contact info.");
  return JSON.parse(args);
}

// ── TOOL REGISTRATION ─────────────────────────────────────────

export function registerNetworkTools(
  mcp: McpServer,
  supabase: Supabase,
  userId: string,
) {
  // ── READ / CORE ─────────────────────────────────────────────

  mcp.tool("network_search_contacts", {
    description: "Search network contacts by name, country, sector, influence type, label, or email.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["query"],
    },
    handler: async ({ query, limit }: any) => {
      const q = String(query).toLowerCase();
      const lim = Number(limit) || 20;
      const cols = "id, full_name, email, country, sector, influence_type, labels, relationship_strength, is_inner_circle, whatsapp_number, linkedin_url, last_interaction_date";
      const [{ data: textResults }, { data: labelResults }] = await Promise.all([
        supabase.from("network_contacts").select(cols).eq("user_id", userId)
          .or(`full_name.ilike.%${q}%,country.ilike.%${q}%,sector.ilike.%${q}%,influence_type.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(lim),
        supabase.from("network_contacts").select(cols).eq("user_id", userId)
          .contains("labels", [q]).limit(lim),
      ]);
      const seen = new Set<string>();
      const data: any[] = [];
      for (const row of [...(textResults || []), ...(labelResults || [])]) {
        if (!seen.has(row.id)) { seen.add(row.id); data.push(row); }
      }
      if (!data.length) return txt(`No contacts found matching "${query}"`);
      const formatted = data.slice(0, lim).map((c: any) =>
        `• ${c.full_name} — ${c.influence_type}, ${c.country || "No country"}, ${c.sector || "No sector"}, Strength: ${c.relationship_strength || "Unknown"}${c.is_inner_circle ? " ⭐ Inner Circle" : ""}, Labels: ${(c.labels || []).join(", ") || "—"}, Last contact: ${c.last_interaction_date || "Never"}`
      ).join("\n");
      return txt(`Found ${data.length} contact(s):\n\n${formatted}`);
    },
  });

  mcp.tool("network_get_contact", {
    description: "Get full details for a specific network contact by name or ID, including recent interactions, key facts, and events.",
    inputSchema: {
      type: "object",
      properties: { name_or_id: { type: "string", description: "Contact full name or UUID" } },
      required: ["name_or_id"],
    },
    handler: async ({ name_or_id }: any) => {
      const contact = await findContact(supabase, userId, name_or_id);
      if (!contact) return txt(`Contact "${name_or_id}" not found.`);
      const [interactionsRes, factsRes, eventsRes] = await Promise.all([
        supabase.from("network_interactions").select("*").eq("contact_id", contact.id).eq("user_id", userId).order("date", { ascending: false }).limit(10),
        supabase.from("network_contact_key_facts").select("*").eq("contact_id", contact.id).eq("user_id", userId),
        supabase.from("network_contact_events").select("*").eq("contact_id", contact.id).eq("user_id", userId),
      ]);
      const lines = [
        `# ${contact.full_name}`,
        `**Type:** ${contact.influence_type} | **Sector:** ${contact.sector || "—"} | **Country:** ${contact.country || "—"}`,
        `**Relationship:** ${contact.relationship_strength || "—"} | **Inner Circle:** ${contact.is_inner_circle ? "Yes" : "No"}`,
        `**Email:** ${contact.email || "—"} | **WhatsApp:** ${contact.whatsapp_number || "—"}`,
        `**LinkedIn:** ${contact.linkedin_url || "—"}`,
        `**Instagram:** ${contact.instagram_url || "—"} | **X/Twitter:** ${contact.twitter_url || "—"}`,
        `**Location:** ${contact.living_location || "—"}, ${contact.region || "—"}`,
        `**Birthday:** ${contact.birthday || "—"}`,
        `**Labels:** ${(contact.labels || []).join(", ") || "—"}`,
        `**Last Interaction:** ${contact.last_interaction_date || "Never"}`,
        contact.notes ? `\n**Notes:** ${contact.notes}` : "",
      ];
      if (factsRes.data?.length) {
        lines.push(`\n## Key Facts`);
        factsRes.data.forEach((f: any) => lines.push(`• ${f.fact}`));
      }
      if (eventsRes.data?.length) {
        lines.push(`\n## Important Dates`);
        eventsRes.data.forEach((e: any) =>
          lines.push(`• ${e.event_date} — ${e.title}${e.is_recurring ? " (recurring)" : ""}`),
        );
      }
      if (interactionsRes.data?.length) {
        lines.push(`\n## Recent Interactions (last 10)`);
        interactionsRes.data.forEach((i: any) => {
          lines.push(`• ${i.date} | ${i.type}${i.direction ? ` (${i.direction})` : ""}: ${i.summary || "No summary"}${i.follow_up_date ? ` → Follow-up: ${i.follow_up_date}` : ""}`);
        });
      }
      return txt(lines.join("\n"));
    },
  });

  mcp.tool("network_log_interaction", {
    description: "Log a new interaction with a network contact.",
    inputSchema: {
      type: "object",
      properties: {
        contact_name: { type: "string", description: "Name or UUID of the contact" },
        type: { type: "string", description: "Type: meeting, call, message, email, social, other" },
        summary: { type: "string", description: "Brief summary" },
        direction: { type: "string", description: "inbound, outbound, or mutual" },
        follow_up_date: { type: "string", description: "Follow-up date (YYYY-MM-DD)" },
        date: { type: "string", description: "Date (YYYY-MM-DD), defaults to today" },
      },
      required: ["contact_name", "type", "summary"],
    },
    handler: async ({ contact_name, type, summary, direction, follow_up_date, date }: any) => {
      const contact = await findContact(supabase, userId, contact_name);
      if (!contact) return txt(`Contact "${contact_name}" not found.`);
      const interactionDate = date || new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("network_interactions").insert({
        contact_id: contact.id, user_id: userId, type, summary,
        direction: direction || null, follow_up_date: follow_up_date || null,
        date: interactionDate,
      });
      if (error) return txt(`Error: ${error.message}`);
      await supabase.from("network_contacts").update({ last_interaction_date: interactionDate }).eq("id", contact.id);
      return txt(`✅ Logged ${type} with ${contact.full_name} on ${interactionDate}.${follow_up_date ? ` Follow-up set for ${follow_up_date}.` : ""}`);
    },
  });

  mcp.tool("network_list_upcoming_events", {
    description: "List upcoming birthdays, follow-ups, and custom events across the network.",
    inputSchema: {
      type: "object",
      properties: { days: { type: "number", description: "Days to look ahead (default 14)" } },
    },
    handler: async ({ days }: any) => {
      const daysAhead = Number(days) || 14;
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + daysAhead);
      const todayStr = today.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];
      const [contactsRes, interactionsRes, eventsRes] = await Promise.all([
        supabase.from("network_contacts").select("id, full_name, birthday, whatsapp_number").eq("user_id", userId),
        supabase.from("network_interactions").select("contact_id, follow_up_date, type, summary").eq("user_id", userId).gte("follow_up_date", todayStr).lte("follow_up_date", endStr),
        supabase.from("network_contact_events").select("contact_id, event_date, title, is_recurring").eq("user_id", userId).gte("event_date", todayStr).lte("event_date", endStr),
      ]);
      const contactMap = new Map((contactsRes.data || []).map((c: any) => [c.id, c]));
      const lines: string[] = [];
      const birthdays = (contactsRes.data || []).filter((c: any) => {
        if (!c.birthday) return false;
        const bday = new Date(c.birthday);
        const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        return thisYearBday >= today && thisYearBday <= endDate;
      });
      if (birthdays.length) {
        lines.push("## 🎂 Birthdays");
        birthdays.forEach((c: any) => lines.push(`• ${c.birthday.slice(5)} — ${c.full_name}`));
      }
      if (interactionsRes.data?.length) {
        lines.push("\n## 📋 Follow-ups");
        interactionsRes.data.forEach((i: any) => {
          const name = (contactMap.get(i.contact_id) as any)?.full_name || "Unknown";
          lines.push(`• ${i.follow_up_date} — ${name}: ${i.summary || i.type}`);
        });
      }
      if (eventsRes.data?.length) {
        lines.push("\n## ⭐ Events");
        eventsRes.data.forEach((e: any) => {
          const name = (contactMap.get(e.contact_id) as any)?.full_name || "Unknown";
          lines.push(`• ${e.event_date} — ${name}: ${e.title}`);
        });
      }
      if (!lines.length) return txt(`No upcoming events in the next ${daysAhead} days.`);
      return txt(`Upcoming events (next ${daysAhead} days):\n\n${lines.join("\n")}`);
    },
  });

  mcp.tool("network_suggest_followups", {
    description: "Suggest network contacts to follow up with based on recency and relationship strength.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Number of suggestions (default 10)" } },
    },
    handler: async ({ limit }: any) => {
      const lim = Number(limit) || 10;
      const { data: contacts } = await supabase.from("network_contacts")
        .select("id, full_name, relationship_strength, is_inner_circle, last_interaction_date, first_met_year, first_met_month, created_at, influence_type, country, sector, muted_from_brief")
        .eq("user_id", userId).eq("muted_from_brief", false);
      if (!contacts?.length) return txt("No contacts to suggest.");
      const today = new Date();
      const getRecencyDate = (c: any): Date | null => {
        if (c.last_interaction_date) return new Date(c.last_interaction_date);
        if (c.first_met_year) return new Date(c.first_met_year, (c.first_met_month ?? 1) - 1, 1);
        if (c.created_at) return new Date(c.created_at);
        return null;
      };
      const scored = contacts.map((c: any) => {
        const recencyDate = getRecencyDate(c);
        const daysSince = recencyDate ? Math.floor((today.getTime() - recencyDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        let score = Math.min(daysSince, 180);
        if (c.is_inner_circle) score += 30;
        if (c.relationship_strength === "Strong") score += 20;
        else if (c.relationship_strength === "Warm") score += 10;
        return { ...c, daysSince, score };
      });
      scored.sort((a: any, b: any) => b.score - a.score);
      const lines = scored.slice(0, lim).map((c: any, i: number) =>
        `${i + 1}. **${c.full_name}** — ${c.influence_type}, ${c.country || "—"} | Last: ${c.daysSince === 999 ? "Never" : `${c.daysSince}d ago`} | ${c.relationship_strength || "—"}${c.is_inner_circle ? " ⭐" : ""}`
      );
      return txt(`## Suggested Follow-ups\n\n${lines.join("\n")}`);
    },
  });

  mcp.tool("network_daily_brief", {
    description: "Comprehensive daily network briefing: overdue follow-ups, upcoming events/birthdays, inner-circle health, and recent activity.",
    inputSchema: {
      type: "object",
      properties: { days_ahead: { type: "number", description: "Days to look ahead for events (default 7)" } },
    },
    handler: async ({ days_ahead }: any) => {
      const daysAhead = Number(days_ahead) || 7;
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + daysAhead);
      const endStr = endDate.toISOString().split("T")[0];
      const [contactsRes, overdueRes, upcomingFollowupsRes, eventsRes, recentInteractionsRes] = await Promise.all([
        supabase.from("network_contacts").select("id, full_name, birthday, is_inner_circle, relationship_strength, last_interaction_date, first_met_year, first_met_month, created_at, influence_type, country").eq("user_id", userId).eq("muted_from_brief", false),
        supabase.from("network_interactions").select("contact_id, follow_up_date, type, summary").eq("user_id", userId).lt("follow_up_date", todayStr).order("follow_up_date", { ascending: true }),
        supabase.from("network_interactions").select("contact_id, follow_up_date, type, summary").eq("user_id", userId).gte("follow_up_date", todayStr).lte("follow_up_date", endStr).order("follow_up_date", { ascending: true }),
        supabase.from("network_contact_events").select("contact_id, event_date, title, is_recurring").eq("user_id", userId).gte("event_date", todayStr).lte("event_date", endStr).order("event_date", { ascending: true }),
        supabase.from("network_interactions").select("contact_id, date, type, summary").eq("user_id", userId).gte("date", new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]).order("date", { ascending: false }).limit(10),
      ]);
      const contacts = contactsRes.data || [];
      const contactMap = new Map(contacts.map((c: any) => [c.id, c]));
      const getName = (id: string) => (contactMap.get(id) as any)?.full_name || "Unknown";
      const getRecencyDays = (c: any): number | null => {
        const d = c.last_interaction_date ? new Date(c.last_interaction_date)
          : c.first_met_year ? new Date(c.first_met_year, (c.first_met_month ?? 1) - 1, 1)
          : c.created_at ? new Date(c.created_at) : null;
        return d ? Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) : null;
      };
      const sections: string[] = [`# 📋 Network Brief — ${todayStr}\n`];
      const overdue = overdueRes.data || [];
      if (overdue.length) {
        sections.push(`## 🚨 Overdue Follow-ups (${overdue.length})`);
        overdue.forEach((i: any) => sections.push(`• **${i.follow_up_date}** — ${getName(i.contact_id)}: ${i.summary || i.type}`));
      }
      const birthdays = contacts.filter((c: any) => {
        if (!c.birthday) return false;
        const bday = new Date(c.birthday);
        const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        return thisYear >= today && thisYear <= endDate;
      });
      if (birthdays.length) {
        sections.push(`\n## 🎂 Upcoming Birthdays`);
        birthdays.forEach((c: any) => {
          const bday = new Date(c.birthday);
          const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
          const daysUntil = Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          sections.push(`• ${c.full_name} — ${c.birthday.slice(5)} (${daysUntil === 0 ? "TODAY! 🎉" : `in ${daysUntil}d`})`);
        });
      }
      const upcoming = upcomingFollowupsRes.data || [];
      if (upcoming.length) {
        sections.push(`\n## 📋 Upcoming Follow-ups`);
        upcoming.forEach((i: any) => sections.push(`• ${i.follow_up_date} — ${getName(i.contact_id)}: ${i.summary || i.type}`));
      }
      const events = eventsRes.data || [];
      if (events.length) {
        sections.push(`\n## ⭐ Upcoming Events`);
        events.forEach((e: any) => sections.push(`• ${e.event_date} — ${getName(e.contact_id)}: ${e.title}`));
      }
      const innerCircle = contacts.filter((c: any) => c.is_inner_circle);
      if (innerCircle.length) {
        const neglected = innerCircle.filter((c: any) => {
          const d = getRecencyDays(c);
          return d === null || d > 14;
        });
        sections.push(`\n## ⭐ Inner Circle (${innerCircle.length} members)`);
        if (neglected.length) {
          sections.push(`⚠️ ${neglected.length} need attention:`);
          neglected.forEach((c: any) => {
            const d = getRecencyDays(c);
            sections.push(`• ${c.full_name} — ${d !== null ? `${d}d ago` : "No date info"}`);
          });
        } else {
          sections.push("✅ All inner circle contacts reached within 14 days.");
        }
      }
      const recent = recentInteractionsRes.data || [];
      if (recent.length) {
        sections.push(`\n## 📝 Recent Activity (last 3 days)`);
        recent.forEach((i: any) => sections.push(`• ${i.date} | ${getName(i.contact_id)}: ${i.type} — ${i.summary || "No summary"}`));
      }
      const neverContacted = contacts.filter((c: any) => !c.last_interaction_date && !c.first_met_year).length;
      sections.push(`\n---\n📊 **Network:** ${contacts.length} contacts | ${innerCircle.length} inner circle | ${neverContacted} never contacted | ${overdue.length} overdue`);
      return txt(sections.join("\n"));
    },
  });

  // ── WRITE / MANAGE ──────────────────────────────────────────

  mcp.tool("network_create_contact", {
    description: "Create a new network contact.",
    inputSchema: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Full name (required)" },
        influence_type: { type: "string" },
        country: { type: "string" },
        sector: { type: "string" },
        email: { type: "string" },
        whatsapp_number: { type: "string" },
        linkedin_url: { type: "string" },
        instagram_url: { type: "string" },
        twitter_url: { type: "string" },
        living_location: { type: "string" },
        region: { type: "string" },
        birthday: { type: "string", description: "YYYY-MM-DD" },
        relationship_strength: { type: "string", description: "Cold, Warm, Strong, or Trusted" },
        is_inner_circle: { type: "boolean" },
        labels: { type: "string", description: "Comma-separated labels" },
        notes: { type: "string" },
      },
      required: ["full_name"],
    },
    handler: async (params: any) => {
      const { full_name, labels, ...rest } = params;
      if (!full_name) return txt("Error: full_name is required.");
      const record: any = { full_name, user_id: userId, ...rest };
      if (labels) record.labels = String(labels).split(",").map((l) => l.trim()).filter(Boolean);
      const { data, error } = await supabase.from("network_contacts").insert(record).select("id, full_name").single();
      if (error) return txt(`Error: ${error.message}`);
      return txt(`✅ Created contact **${data.full_name}** (ID: ${data.id})`);
    },
  });

  mcp.tool("network_update_contact", {
    description: "Update fields on an existing network contact.",
    inputSchema: {
      type: "object",
      properties: {
        name_or_id: { type: "string" },
        full_name: { type: "string" },
        influence_type: { type: "string" },
        country: { type: "string" },
        sector: { type: "string" },
        email: { type: "string" },
        whatsapp_number: { type: "string" },
        linkedin_url: { type: "string" },
        instagram_url: { type: "string" },
        twitter_url: { type: "string" },
        living_location: { type: "string" },
        region: { type: "string" },
        birthday: { type: "string" },
        relationship_strength: { type: "string" },
        is_inner_circle: { type: "boolean" },
        labels: { type: "string", description: "Comma-separated (replaces existing)" },
        notes: { type: "string" },
        muted_from_brief: { type: "boolean" },
      },
      required: ["name_or_id"],
    },
    handler: async (params: any) => {
      const { name_or_id, labels, ...fields } = params;
      const contact = await findContact(supabase, userId, name_or_id);
      if (!contact) return txt(`Contact "${name_or_id}" not found.`);
      const updates: any = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) updates[k] = v;
      if (labels !== undefined) {
        updates.labels = String(labels).split(",").map((l) => l.trim()).filter(Boolean);
      }
      const { error } = await supabase.from("network_contacts").update(updates).eq("id", contact.id);
      if (error) return txt(`Error: ${error.message}`);
      return txt(`✅ Updated **${contact.full_name}**.`);
    },
  });

  mcp.tool("network_manage_key_facts", {
    description: "Add, remove, or list key facts for a network contact.",
    inputSchema: {
      type: "object",
      properties: {
        contact_name: { type: "string" },
        action: { type: "string", description: "add, remove, or list" },
        fact: { type: "string" },
      },
      required: ["contact_name", "action"],
    },
    handler: async ({ contact_name, action, fact }: any) => {
      const contact = await findContact(supabase, userId, contact_name);
      if (!contact) return txt(`Contact "${contact_name}" not found.`);
      const act = String(action || "list").toLowerCase();
      if (act === "add") {
        if (!fact) return txt("Error: fact is required for 'add'.");
        const { error } = await supabase.from("network_contact_key_facts").insert({ contact_id: contact.id, user_id: userId, fact });
        if (error) return txt(`Error: ${error.message}`);
        return txt(`✅ Added key fact for **${contact.full_name}**: "${fact}"`);
      }
      if (act === "remove") {
        if (!fact) return txt("Error: fact is required for 'remove'.");
        const { data: existing } = await supabase.from("network_contact_key_facts").select("id")
          .eq("contact_id", contact.id).eq("user_id", userId).ilike("fact", `%${fact}%`).limit(1).maybeSingle();
        if (!existing) return txt(`No matching fact found for "${fact}".`);
        await supabase.from("network_contact_key_facts").delete().eq("id", existing.id);
        return txt(`✅ Removed key fact from **${contact.full_name}**.`);
      }
      const { data: facts } = await supabase.from("network_contact_key_facts").select("fact, created_at")
        .eq("contact_id", contact.id).eq("user_id", userId).order("created_at", { ascending: false });
      if (!facts?.length) return txt(`No key facts for **${contact.full_name}**.`);
      return txt(`## Key Facts for ${contact.full_name}\n\n${facts.map((f: any) => `• ${f.fact}`).join("\n")}`);
    },
  });

  mcp.tool("network_manage_events", {
    description: "Add, remove, or list custom events / important dates for a network contact.",
    inputSchema: {
      type: "object",
      properties: {
        contact_name: { type: "string" },
        action: { type: "string", description: "add, remove, or list" },
        title: { type: "string" },
        event_date: { type: "string", description: "YYYY-MM-DD" },
        is_recurring: { type: "boolean" },
      },
      required: ["contact_name", "action"],
    },
    handler: async ({ contact_name, action, title, event_date, is_recurring }: any) => {
      const contact = await findContact(supabase, userId, contact_name);
      if (!contact) return txt(`Contact "${contact_name}" not found.`);
      const act = String(action || "list").toLowerCase();
      if (act === "add") {
        if (!title || !event_date) return txt("Error: title and event_date required for 'add'.");
        const { error } = await supabase.from("network_contact_events").insert({
          contact_id: contact.id, user_id: userId, title, event_date,
          is_recurring: is_recurring || false,
        });
        if (error) return txt(`Error: ${error.message}`);
        return txt(`✅ Added event for **${contact.full_name}**: "${title}" on ${event_date}${is_recurring ? " (recurring)" : ""}`);
      }
      if (act === "remove") {
        if (!title) return txt("Error: title required for 'remove'.");
        const { data: existing } = await supabase.from("network_contact_events").select("id")
          .eq("contact_id", contact.id).eq("user_id", userId).ilike("title", `%${title}%`).limit(1).maybeSingle();
        if (!existing) return txt(`No matching event found for "${title}".`);
        await supabase.from("network_contact_events").delete().eq("id", existing.id);
        return txt(`✅ Removed event "${title}" from **${contact.full_name}**.`);
      }
      const { data: events } = await supabase.from("network_contact_events").select("title, event_date, is_recurring")
        .eq("contact_id", contact.id).eq("user_id", userId).order("event_date", { ascending: true });
      if (!events?.length) return txt(`No events for **${contact.full_name}**.`);
      return txt(`## Events for ${contact.full_name}\n\n${events.map((e: any) => `• ${e.event_date} — ${e.title}${e.is_recurring ? " (recurring)" : ""}`).join("\n")}`);
    },
  });

  mcp.tool("network_manage_resources", {
    description: "Add, remove, or list resources/links for a network contact (podcast, website, portfolio, blog, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        contact_name: { type: "string" },
        action: { type: "string", description: "add, remove, or list" },
        type: { type: "string" },
        label: { type: "string" },
        url: { type: "string" },
      },
      required: ["contact_name", "action"],
    },
    handler: async ({ contact_name, action, type, label, url }: any) => {
      const contact = await findContact(supabase, userId, contact_name);
      if (!contact) return txt(`Contact "${contact_name}" not found.`);
      const act = String(action || "list").toLowerCase();
      if (act === "add") {
        if (!label || !url) return txt("Error: label and url required for 'add'.");
        const { error } = await supabase.from("network_contact_resources").insert({
          contact_id: contact.id, user_id: userId, type: type || "Other", label, url,
        });
        if (error) return txt(`Error: ${error.message}`);
        return txt(`✅ Added resource for **${contact.full_name}**: [${label}](${url}) (${type || "Other"})`);
      }
      if (act === "remove") {
        if (!label) return txt("Error: label required for 'remove'.");
        const { data: existing } = await supabase.from("network_contact_resources").select("id")
          .eq("contact_id", contact.id).eq("user_id", userId).ilike("label", `%${label}%`).limit(1).maybeSingle();
        if (!existing) return txt(`No matching resource found for "${label}".`);
        await supabase.from("network_contact_resources").delete().eq("id", existing.id);
        return txt(`✅ Removed resource "${label}" from **${contact.full_name}**.`);
      }
      const { data: resources } = await supabase.from("network_contact_resources").select("type, label, url")
        .eq("contact_id", contact.id).eq("user_id", userId).order("created_at", { ascending: true });
      if (!resources?.length) return txt(`No resources for **${contact.full_name}**.`);
      return txt(`## Resources for ${contact.full_name}\n\n${resources.map((r: any) => `• [${r.label}](${r.url}) — ${r.type}`).join("\n")}`);
    },
  });

  mcp.tool("network_bulk_update_labels", {
    description: "Add or remove labels on multiple network contacts at once.",
    inputSchema: {
      type: "object",
      properties: {
        contact_names: { type: "string", description: "Comma-separated names or UUIDs" },
        add_labels: { type: "string", description: "Comma-separated labels to add" },
        remove_labels: { type: "string", description: "Comma-separated labels to remove" },
      },
      required: ["contact_names"],
    },
    handler: async ({ contact_names, add_labels, remove_labels }: any) => {
      if (!add_labels && !remove_labels) return txt("Error: provide add_labels or remove_labels.");
      const names = String(contact_names).split(",").map((n) => n.trim()).filter(Boolean);
      const toAdd = add_labels ? String(add_labels).split(",").map((l) => l.trim()).filter(Boolean) : [];
      const toRemove = remove_labels ? String(remove_labels).split(",").map((l) => l.trim().toLowerCase()).filter(Boolean) : [];
      const results: string[] = [];
      for (const name of names) {
        const contact = await findContact(supabase, userId, name);
        if (!contact) { results.push(`❌ "${name}" — not found`); continue; }
        let labels: string[] = contact.labels || [];
        if (toRemove.length) labels = labels.filter((l: string) => !toRemove.includes(l.toLowerCase()));
        if (toAdd.length) {
          const existing = new Set(labels.map((l: string) => l.toLowerCase()));
          for (const l of toAdd) if (!existing.has(l.toLowerCase())) labels.push(l);
        }
        const { error } = await supabase.from("network_contacts").update({ labels }).eq("id", contact.id);
        results.push(error ? `❌ ${contact.full_name} — ${error.message}` : `✅ ${contact.full_name} — labels: ${labels.join(", ") || "(none)"}`);
      }
      return txt(`## Bulk Label Update\n\n${results.join("\n")}`);
    },
  });

  mcp.tool("network_bulk_log_interactions", {
    description: "Log the same interaction for multiple network contacts at once (e.g. after a group meeting).",
    inputSchema: {
      type: "object",
      properties: {
        contact_names: { type: "string", description: "Comma-separated contact names" },
        type: { type: "string" },
        summary: { type: "string" },
        direction: { type: "string" },
        follow_up_date: { type: "string" },
        date: { type: "string" },
      },
      required: ["contact_names", "type"],
    },
    handler: async ({ contact_names, type, summary, direction, follow_up_date, date }: any) => {
      const names = String(contact_names).split(",").map((n) => n.trim()).filter(Boolean);
      const interactionDate = date || new Date().toISOString().split("T")[0];
      const results: string[] = [];
      for (const name of names) {
        const contact = await findContact(supabase, userId, name);
        if (!contact) { results.push(`❌ "${name}" — not found`); continue; }
        const { error } = await supabase.from("network_interactions").insert({
          contact_id: contact.id, user_id: userId, type,
          summary: summary || null, direction: direction || null,
          follow_up_date: follow_up_date || null, date: interactionDate,
        });
        if (error) { results.push(`❌ ${contact.full_name} — ${error.message}`); continue; }
        await supabase.from("network_contacts").update({ last_interaction_date: interactionDate }).eq("id", contact.id);
        results.push(`✅ ${contact.full_name}`);
      }
      return txt(`## Bulk Interaction Log (${type} on ${interactionDate})\n\n${results.join("\n")}`);
    },
  });

  // ── ENRICHMENT ──────────────────────────────────────────────

  mcp.tool("network_enrich_contact", {
    description: "Research a network contact online using their social profiles and return PROPOSED changes vs current data. Call BEFORE network_apply_enrichment so the user can confirm.",
    inputSchema: {
      type: "object",
      properties: {
        contact_name: { type: "string" },
        linkedin_url: { type: "string" },
        instagram_url: { type: "string" },
        twitter_url: { type: "string" },
      },
      required: ["contact_name"],
    },
    handler: async ({ contact_name, linkedin_url, instagram_url, twitter_url }: any) => {
      const contact = await findContact(supabase, userId, contact_name);
      if (!contact) return txt(`Contact "${contact_name}" not found.`);
      const urls = [
        linkedin_url || contact.linkedin_url,
        instagram_url || contact.instagram_url,
        twitter_url || contact.twitter_url,
      ].filter(Boolean) as string[];
      if (!urls.length) return txt(`No social URLs available for ${contact.full_name}.`);
      const markdownParts = await scrapeProfiles(urls);
      if (!markdownParts.length) return txt(`Could not retrieve profile data from the URLs.`);
      const extracted = await extractWithAI(markdownParts.join("\n\n---\n\n"));
      const changes: string[] = [];
      const noChanges: string[] = [];
      for (const field of ENRICHABLE_FIELDS) {
        const newVal = extracted[field];
        const currentVal = (contact as any)[field];
        if (!newVal) continue;
        if (!currentVal || currentVal === "" || currentVal === "Other" || currentVal === "Cold") {
          changes.push(`• **${field}**: _(empty)_ → \`${newVal}\` ✅ New`);
        } else if (String(currentVal).toLowerCase() !== String(newVal).toLowerCase()) {
          changes.push(`• **${field}**: \`${currentVal}\` → \`${newVal}\` ⚠️ Overwrite`);
        } else {
          noChanges.push(`• **${field}**: \`${currentVal}\` (unchanged)`);
        }
      }
      if (!changes.length) {
        return txt(`✅ No new info for **${contact.full_name}** — profile up to date.\n\n${noChanges.join("\n")}`);
      }
      const lines = [
        `## Enrichment Results for ${contact.full_name}`,
        `**Contact ID:** \`${contact.id}\``,
        `\n### Proposed Changes`, ...changes,
      ];
      if (noChanges.length) {
        lines.push(`\n### Already Up-to-Date`, ...noChanges);
      }
      lines.push(
        `\n---`,
        `To apply, call **network_apply_enrichment** with the contact ID and the fields you want to update.`,
      );
      return txt(lines.join("\n"));
    },
  });

  mcp.tool("network_apply_enrichment", {
    description: "Apply confirmed enrichment changes to a network contact. Call ONLY after showing the user proposed changes from network_enrich_contact.",
    inputSchema: {
      type: "object",
      properties: {
        contact_id: { type: "string" },
        fields: { type: "string", description: 'JSON object of field names and values' },
      },
      required: ["contact_id", "fields"],
    },
    handler: async ({ contact_id, fields }: any) => {
      const { data: contact } = await supabase.from("network_contacts").select("id, full_name")
        .eq("id", contact_id).eq("user_id", userId).maybeSingle();
      if (!contact) return txt(`Contact not found or access denied.`);
      let updates: Record<string, any>;
      try { updates = typeof fields === "string" ? JSON.parse(fields) : fields; }
      catch { return txt(`Invalid fields JSON.`); }
      const safeUpdates: Record<string, any> = {};
      const rejected: string[] = [];
      for (const [key, value] of Object.entries(updates)) {
        if (ENRICHABLE_FIELDS.includes(key)) safeUpdates[key] = value;
        else rejected.push(key);
      }
      if (!Object.keys(safeUpdates).length) {
        return txt(`No valid fields. Allowed: ${ENRICHABLE_FIELDS.join(", ")}`);
      }
      const { error } = await supabase.from("network_contacts").update(safeUpdates).eq("id", contact_id).eq("user_id", userId);
      if (error) return txt(`Error: ${error.message}`);
      const lines = Object.entries(safeUpdates).map(([k, v]) => `• **${k}** → \`${v}\``);
      let text = `✅ Updated **${contact.full_name}** with ${lines.length} field(s):\n\n${lines.join("\n")}`;
      if (rejected.length) text += `\n\n⚠️ Skipped disallowed fields: ${rejected.join(", ")}`;
      return txt(text);
    },
  });
}
