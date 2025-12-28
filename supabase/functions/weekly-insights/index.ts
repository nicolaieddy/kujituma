import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyData {
  objectives: { text: string; is_completed: boolean }[];
  lastWeekReflection?: string;
  lastWeekIntention?: string;
  progressNotes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weeklyData } = await req.json() as { weeklyData: WeeklyData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const completedCount = weeklyData.objectives.filter(o => o.is_completed).length;
    const totalCount = weeklyData.objectives.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const completedObjectives = weeklyData.objectives
      .filter(o => o.is_completed)
      .map(o => `- ${o.text}`)
      .join("\n");
    
    const incompleteObjectives = weeklyData.objectives
      .filter(o => !o.is_completed)
      .map(o => `- ${o.text}`)
      .join("\n");

    const prompt = `Based on this weekly planning data, provide a brief, personalized insight and recommendation for planning the upcoming week. Be encouraging but also practical.

Last Week's Data:
- Completion rate: ${completionRate}% (${completedCount}/${totalCount} objectives)
${completedObjectives ? `\nCompleted objectives:\n${completedObjectives}` : ''}
${incompleteObjectives ? `\nIncomplete objectives:\n${incompleteObjectives}` : ''}
${weeklyData.lastWeekReflection ? `\nUser's reflection: "${weeklyData.lastWeekReflection}"` : ''}
${weeklyData.lastWeekIntention ? `\nUser's intention was: "${weeklyData.lastWeekIntention}"` : ''}
${weeklyData.progressNotes ? `\nProgress notes: "${weeklyData.progressNotes}"` : ''}

Provide:
1. A 1-2 sentence observation about their progress
2. One specific, actionable recommendation for this week
3. An encouraging closing thought

Keep the total response under 100 words and use a warm, supportive tone.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a supportive productivity coach helping someone reflect on their week and plan ahead. Be concise, warm, and actionable." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to generate insights" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || "Unable to generate insights at this time.";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("weekly-insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
