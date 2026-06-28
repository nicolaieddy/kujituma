import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

const EVENT_TYPES = ["injury_illness", "race", "other"] as const;
const ISSUE_CATEGORIES = ["niggle", "injury", "illness"] as const;
const BODY_SIDES = ["left", "right", "both", "na"] as const;

const BODY_PART_SCHEMA = {
  type: "array",
  description:
    "Structured body parts affected (injury/illness only). Each entry: { part: canonical key like 'calf_shin' | 'knee' | 'hamstring' | 'quad' | 'groin' | 'hip_glute' | 'foot' | 'ankle' | 'lower_back' | 'upper_body' | 'head' | 'other', side: 'left' | 'right' | 'both' | 'na', specific?: free-text refinement }.",
  items: {
    type: "object",
    properties: {
      part: { type: "string" },
      side: { type: "string", description: "left | right | both | na" },
      specific: { type: "string" },
    },
    required: ["part", "side"],
  },
};

function sanitizeBodyParts(raw: unknown): Array<{ part: string; side: string; specific?: string }> | null {
  if (!Array.isArray(raw)) return null;
  const out: Array<{ part: string; side: string; specific?: string }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const part = (entry as any).part;
    const side = (entry as any).side;
    if (typeof part !== "string" || !part.trim()) continue;
    const normalizedSide = typeof side === "string" && (BODY_SIDES as readonly string[]).includes(side) ? side : "na";
    const item: { part: string; side: string; specific?: string } = { part: part.trim(), side: normalizedSide };
    const specific = (entry as any).specific;
    if (typeof specific === "string" && specific.trim()) item.specific = specific.trim();
    out.push(item);
  }
  return out;
}

export function registerTrainingEventTools(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.tool("list_training_events", {
    description:
      "List the user's key training events (injuries/illness, races, milestones). Returns full rows including `body_parts` (structured array) and `issue_category` ('niggle' | 'injury' | 'illness') for injury/illness events. Optional filters by type or date range.",
    inputSchema: {
      type: "object",
      properties: {
        event_type: { type: "string", description: "Filter: injury_illness | race | other" },
        from_date: { type: "string", description: "YYYY-MM-DD lower bound on start_date" },
        to_date: { type: "string", description: "YYYY-MM-DD upper bound on start_date" },
        limit: { type: "number", description: "Default 100" },
      },
    },
    handler: async ({ event_type, from_date, to_date, limit }: { event_type?: string; from_date?: string; to_date?: string; limit?: number }) => {
      let q = supabase
        .from("training_events")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false })
        .limit(limit ?? 100);
      if (event_type) q = q.eq("event_type", event_type);
      if (from_date) q = q.gte("start_date", from_date);
      if (to_date) q = q.lte("start_date", to_date);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("create_training_event", {
    description: "Log a new key training event (injury/illness, race, or other milestone).",
    inputSchema: {
      type: "object",
      properties: {
        event_type: { type: "string", description: "injury_illness | race | other" },
        title: { type: "string" },
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD, optional for ranges" },
        description: { type: "string" },
        severity: { type: "number", description: "1-5 (injury/illness)" },
        body_part: { type: "string", description: "Legacy free-text body part. Prefer `body_parts` for new entries." },
        body_parts: BODY_PART_SCHEMA,
        issue_category: {
          type: "string",
          description: "Injury/illness only: 'niggle' (minor — training through) | 'injury' (significant) | 'illness' (sick).",
        },
        race_distance: { type: "string" },
        race_result: { type: "string" },
        race_priority: { type: "string", description: "A | B | C" },
        location: { type: "string" },
      },
      required: ["event_type", "title", "start_date"],
    },
    handler: async (args: any) => {
      if (!EVENT_TYPES.includes(args.event_type)) {
        return { content: [{ type: "text" as const, text: `event_type must be one of: ${EVENT_TYPES.join(", ")}` }] };
      }
      const insert: Record<string, unknown> = {
        user_id: userId,
        event_type: args.event_type,
        title: args.title,
        start_date: args.start_date,
      };
      for (const k of ["end_date", "description", "body_part", "race_distance", "race_result", "race_priority", "location"]) {
        if (args[k] !== undefined && args[k] !== "") insert[k] = args[k];
      }
      if (args.severity !== undefined) insert.severity = args.severity;

      if (args.event_type === "injury_illness") {
        if (args.issue_category !== undefined && args.issue_category !== "") {
          if (!(ISSUE_CATEGORIES as readonly string[]).includes(args.issue_category)) {
            return { content: [{ type: "text" as const, text: `issue_category must be one of: ${ISSUE_CATEGORIES.join(", ")}` }] };
          }
          insert.issue_category = args.issue_category;
        }
        const parts = sanitizeBodyParts(args.body_parts);
        if (parts) insert.body_parts = parts;
      }

      const { data, error } = await supabase.from("training_events").insert(insert).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Created event "${data.title}" (${data.event_type}) ID: ${data.id}` }] };
    },
  });

  mcp.tool("update_training_event", {
    description: "Update an existing training event by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        event_type: { type: "string" },
        title: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string", description: "Pass empty string to clear" },
        description: { type: "string" },
        severity: { type: "number" },
        body_part: { type: "string", description: "Legacy free-text. Prefer `body_parts`." },
        body_parts: BODY_PART_SCHEMA,
        issue_category: {
          type: "string",
          description: "Injury/illness only: 'niggle' | 'injury' | 'illness'. Pass empty string to clear.",
        },
        race_distance: { type: "string" },
        race_result: { type: "string" },
        race_priority: { type: "string" },
        location: { type: "string" },
      },
      required: ["id"],
    },
    handler: async (args: any) => {
      const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of ["event_type", "title", "start_date", "description", "body_part", "race_distance", "race_result", "race_priority", "location"]) {
        if (args[k] !== undefined) upd[k] = args[k] === "" ? null : args[k];
      }
      if (args.end_date !== undefined) upd.end_date = args.end_date === "" ? null : args.end_date;
      if (args.severity !== undefined) upd.severity = args.severity;

      if (args.issue_category !== undefined) {
        if (args.issue_category === "" || args.issue_category === null) {
          upd.issue_category = null;
        } else if (!(ISSUE_CATEGORIES as readonly string[]).includes(args.issue_category)) {
          return { content: [{ type: "text" as const, text: `issue_category must be one of: ${ISSUE_CATEGORIES.join(", ")}` }] };
        } else {
          upd.issue_category = args.issue_category;
        }
      }
      if (args.body_parts !== undefined) {
        const parts = sanitizeBodyParts(args.body_parts);
        upd.body_parts = parts ?? [];
      }

      const { data, error } = await supabase
        .from("training_events")
        .update(upd)
        .eq("id", args.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Updated event "${data.title}"` }] };
    },
  });

  mcp.tool("delete_training_event", {
    description: "Delete a training event by ID.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    handler: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("training_events").delete().eq("id", id).eq("user_id", userId);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `🗑️ Event deleted` }] };
    },
  });

  mcp.tool("list_event_attachments", {
    description: "List files and notes attached to a training event (doctor's notes, .fit race files, photos, PDFs). Returns metadata only — file contents are not inlined.",
    inputSchema: {
      type: "object",
      properties: { event_id: { type: "string" } },
      required: ["event_id"],
    },
    handler: async ({ event_id }: { event_id: string }) => {
      const { data, error } = await supabase
        .from("training_event_attachments")
        .select("id,kind,file_name,mime_type,size_bytes,description,synced_activity_id,created_at")
        .eq("event_id", event_id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("create_event_note", {
    description: "Attach a text note to a training event (e.g. doctor's diagnosis transcribed, race recap, treatment plan). For binary files like .fit or PDFs the user uploads through the UI.",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "string" },
        title: { type: "string", description: "Short label, e.g. 'Physio notes 12 May'" },
        content: { type: "string", description: "Free-text note body" },
      },
      required: ["event_id", "title", "content"],
    },
    handler: async ({ event_id, title, content }: { event_id: string; title: string; content: string }) => {
      const { data, error } = await supabase
        .from("training_event_attachments")
        .insert({
          user_id: userId,
          event_id,
          kind: "note",
          file_name: title,
          description: content,
        })
        .select()
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `📝 Note attached (id: ${data.id})` }] };
    },
  });
}
