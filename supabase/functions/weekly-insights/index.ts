import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface SuggestionsData {
  incompleteObjectives: { text: string; weekStart: string }[];
  completedObjectives: { text: string }[];
  goals: { title: string; description?: string }[];
  recentPatterns?: string;
}

// Log AI usage to the database
async function logAIUsage(userId: string, requestType: string) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables for logging");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from("ai_usage_logs")
      .insert({ user_id: userId, request_type: requestType });
    
    if (error) {
      console.error("Failed to log AI usage:", error);
    }
  } catch (err) {
    console.error("Error logging AI usage:", err);
  }
}

// Extract user ID from JWT token
function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  try {
    const token = authHeader.split(" ")[1];
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Extract user ID from authorization header
    const authHeader = req.headers.get("authorization");
    const userId = getUserIdFromToken(authHeader);

    let prompt = "";
    let systemPrompt = "";

    if (type === "insights") {
      // Weekly insights logic
      const { weeklyData } = body as { type: string; weeklyData: WeeklyData };
      
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

      systemPrompt = "You are a supportive productivity coach helping someone reflect on their week and plan ahead. Be concise, warm, and actionable.";
      
      prompt = `Based on this weekly planning data, provide a brief, personalized insight and recommendation for planning the upcoming week. Be encouraging but also practical.

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

    } else if (type === "suggestions") {
      // Objective suggestions logic
      const { suggestionsData } = body as { type: string; suggestionsData: SuggestionsData };
      
      const incompleteList = suggestionsData.incompleteObjectives
        .map(o => `- "${o.text}" (from week of ${o.weekStart})`)
        .join("\n");
      
      const completedList = suggestionsData.completedObjectives
        .slice(0, 10)
        .map(o => `- ${o.text}`)
        .join("\n");
      
      const goalsList = suggestionsData.goals
        .map(g => `- ${g.title}${g.description ? `: ${g.description}` : ''}`)
        .join("\n");

      systemPrompt = "You are a productivity coach that helps people set meaningful weekly objectives. Be specific, actionable, and realistic.";
      
      prompt = `Based on the user's data, suggest 3-5 specific objectives for this week. Prioritize:
1. Important incomplete objectives that should be carried forward
2. New objectives aligned with their goals
3. Quick wins to build momentum

User's Goals:
${goalsList || "No goals set yet"}

Incomplete Objectives from Previous Weeks:
${incompleteList || "None"}

Recently Completed (for context):
${completedList || "None"}

Return ONLY a JSON array of suggestions, each with:
- "text": the objective text (specific, actionable, starts with a verb)
- "reason": brief explanation why this is suggested (1 sentence)
- "priority": "high", "medium", or "low"
- "source": "carryover" if from incomplete, "goal-aligned" if based on goals, or "new" if a fresh suggestion

Example format:
[
  {"text": "Complete the quarterly report draft", "reason": "Carried forward from last week - important deadline", "priority": "high", "source": "carryover"},
  {"text": "Schedule 30-min exercise sessions Mon/Wed/Fri", "reason": "Aligned with your health goal", "priority": "medium", "source": "goal-aligned"}
]

Return ONLY valid JSON, no other text.`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid request type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${type} request for user ${userId || 'unknown'}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
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
      return new Response(JSON.stringify({ error: "Failed to generate response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful AI usage
    if (userId) {
      await logAIUsage(userId, type);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (type === "insights") {
      return new Response(JSON.stringify({ insight: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (type === "suggestions") {
      // Parse JSON from the response
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        cleanContent = cleanContent.trim();
        
        const suggestions = JSON.parse(cleanContent);
        console.log("Generated suggestions:", suggestions);
        return new Response(JSON.stringify({ suggestions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("Failed to parse suggestions JSON:", parseError, "Content:", content);
        return new Response(JSON.stringify({ error: "Failed to parse AI response", suggestions: [] }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400,
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
