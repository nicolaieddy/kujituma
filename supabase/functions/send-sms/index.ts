import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMS_ELIGIBLE_TYPES = [
  "friend_request",
  "accountability_partner_request",
  "accountability_partner_accepted",
  "accountability_check_in",
] as const;

type SmsEligibleType = (typeof SMS_ELIGIBLE_TYPES)[number];

function isSmsEligible(type: string): type is SmsEligibleType {
  return (SMS_ELIGIBLE_TYPES as readonly string[]).includes(type);
}

function buildMessage(type: SmsEligibleType, senderName: string): string {
  switch (type) {
    case "friend_request":
      return `👋 ${senderName} sent you a friend request on Kujituma. Open the app to respond.`;
    case "accountability_partner_request":
      return `🤝 ${senderName} wants to be your accountability partner on Kujituma.`;
    case "accountability_partner_accepted":
      return `✅ ${senderName} accepted your accountability partner request on Kujituma!`;
    case "accountability_check_in":
      return `💬 ${senderName} sent you a check-in on Kujituma. Open the app to reply.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { notification_id, user_id, type, triggered_by_user_id, message: rawMessage } = body;

    // Validate required fields
    if (!user_id || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quick bail if not SMS-eligible
    if (!isSmsEligible(type)) {
      return new Response(JSON.stringify({ skipped: true, reason: "type_not_eligible" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read sensitive profile data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch recipient profile (phone number + verification status)
    const { data: recipientProfile, error: profileError } = await supabase
      .from("profiles")
      .select("phone_number, phone_verified, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !recipientProfile) {
      console.error("Failed to fetch recipient profile:", profileError);
      return new Response(JSON.stringify({ skipped: true, reason: "profile_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipientProfile.phone_number || !recipientProfile.phone_verified) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_verified_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check SMS preference for this notification type
    const prefColumn = `sms_${type}` as const;
    const { data: prefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select(prefColumn)
      .eq("user_id", user_id)
      .maybeSingle();

    if (prefsError) {
      console.error("Failed to fetch notification preferences:", prefsError);
      return new Response(JSON.stringify({ skipped: true, reason: "prefs_error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default to false if no preferences row (user hasn't opted in)
    const smsEnabled = prefs ? (prefs as Record<string, boolean>)[prefColumn] ?? false : false;
    if (!smsEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "sms_disabled_by_user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sender name for the message
    let senderName = "Someone";
    if (triggered_by_user_id) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", triggered_by_user_id)
        .single();
      if (senderProfile?.full_name) {
        senderName = senderProfile.full_name;
      }
    }

    // Build the SMS message
    const smsBody = buildMessage(type, senderName);

    // Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      console.error("Missing Twilio credentials");
      return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send SMS via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams({
      From: fromNumber,
      To: recipientProfile.phone_number,
      Body: smsBody,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      return new Response(
        JSON.stringify({ error: "Twilio API error", details: twilioResult }),
        {
          status: 200, // Don't propagate Twilio errors to the trigger
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`SMS sent successfully to ${user_id}, SID: ${twilioResult.sid}`);
    return new Response(
      JSON.stringify({ success: true, sid: twilioResult.sid }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error in send-sms:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 200, // Don't propagate errors to the Postgres trigger
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
