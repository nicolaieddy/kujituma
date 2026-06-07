import { supabase } from "@/integrations/supabase/client";

/**
 * Geocode a location string and optionally update the contact record.
 * Fire-and-forget: call without awaiting in save flows.
 */
export async function geocodeAndUpdate(contactId: string, location: string) {
  try {
    const { data, error } = await supabase.functions.invoke("geocode-contact", {
      body: { location },
    });
    if (error || !data?.latitude || !data?.longitude) return;

    await supabase
      .from("network_contacts")
      .update({ latitude: data.latitude, longitude: data.longitude } as any)
      .eq("id", contactId);
  } catch {
    // silently fail — geocoding is best-effort
  }
}
