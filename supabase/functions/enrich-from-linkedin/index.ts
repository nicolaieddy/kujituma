import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
};

const INFLUENCE_TYPES = [
  "Regulator", "Lawyer", "Politician", "Founder", "Investor",
  "Operator", "Media", "Banker", "Other",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { linkedin_url, instagram_url, twitter_url } = await req.json();
    if (!linkedin_url && !instagram_url && !twitter_url) {
      return new Response(JSON.stringify({ error: "At least one social URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allMarkdown: string[] = [];
    for (const url of [linkedin_url, instagram_url, twitter_url].filter(Boolean) as string[]) {
      let scraped = false;
      if (FIRECRAWL_API_KEY) {
        try {
          const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, formats: ["markdown"], waitFor: 3000 }),
          });
          const scrapeData = await scrapeResponse.json();
          if (scrapeResponse.ok && scrapeData.success) {
            const md = `Source: ${url}\n${scrapeData.data?.markdown || ""}`;
            if (md.length > 30) { allMarkdown.push(md); scraped = true; }
          }
        } catch (e) { console.log(`Firecrawl error for ${url}:`, e); }
      }
      if (!scraped) {
        try {
          const r = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
          const d = (await r.json())?.data;
          if (d) {
            const md = [
              `Source: ${url}`,
              d.title && `Name/Title: ${d.title}`,
              d.description && `Description: ${d.description}`,
              d.author && `Author: ${d.author}`,
              d.publisher && `Publisher: ${d.publisher}`,
            ].filter(Boolean).join("\n");
            if (md.length > 30) allMarkdown.push(md);
          }
        } catch (e) { console.log("Microlink fallback error:", e); }
      }
    }

    if (!allMarkdown.length) {
      return new Response(JSON.stringify({ error: "Could not find public profile data. Try a different URL or fill in details manually." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markdown = allMarkdown.join("\n\n---\n\n");
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
              },
              required: ["full_name"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_contact" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "AI could not extract contact information" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const extracted = JSON.parse(args);
    delete extracted.photo_url;
    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("enrich-from-linkedin error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
