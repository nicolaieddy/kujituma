import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContacts } from "./useNetworkData";

export interface KujitumaMatch {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  matchedOn: ("email" | "linkedin" | "phone")[];
  isPartner: boolean;
  partnershipId?: string;
}

const normalizeEmail = (e: string | null | undefined) =>
  e ? e.trim().toLowerCase() : "";

const normalizeLinkedin = (url: string | null | undefined) => {
  if (!url) return "";
  // strip protocol/www/trailing slash/query
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .split("?")[0];
};

const normalizePhone = (p: string | null | undefined) => {
  if (!p) return "";
  const digits = p.replace(/\D/g, "");
  // last 9 digits = robust to country code differences
  return digits.length >= 9 ? digits.slice(-9) : digits;
};

export const useKujitumaMatches = () => {
  const { user } = useAuth();
  const { data: contacts = [] } = useContacts();

  return useQuery({
    queryKey: ["network", "kujituma-matches", user?.id, contacts.length],
    enabled: !!user && contacts.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, KujitumaMatch>> => {
      // Build lookup sets from contacts
      const emails = new Set<string>();
      const linkedins = new Set<string>();
      const phones = new Set<string>();
      for (const c of contacts) {
        const e = normalizeEmail(c.email);
        if (e) emails.add(e);
        const l = normalizeLinkedin(c.linkedin_url);
        if (l) linkedins.add(l);
        const p = normalizePhone(c.whatsapp_number);
        if (p) phones.add(p);
      }

      const queries: Promise<any>[] = [];
      if (emails.size > 0) {
        queries.push(
          Promise.resolve(
            supabase
              .from("profiles")
              .select("id, full_name, avatar_url, email, linkedin_url, phone_number")
              .in("email", Array.from(emails))
          )
        );
      }
      if (linkedins.size > 0) {
        queries.push(
          Promise.resolve(
            supabase
              .from("profiles")
              .select("id, full_name, avatar_url, email, linkedin_url, phone_number")
              .not("linkedin_url", "is", null)
          )
        );
      }
      if (phones.size > 0) {
        queries.push(
          Promise.resolve(
            supabase
              .from("profiles")
              .select("id, full_name, avatar_url, email, linkedin_url, phone_number")
              .not("phone_number", "is", null)
          )
        );
      }

      const results = await Promise.all(queries);
      const profileMap = new Map<string, any>();
      for (const r of results) {
        if (r.error) continue;
        for (const p of r.data || []) {
          if (p.id === user!.id) continue; // skip self
          profileMap.set(p.id, p);
        }
      }

      // Fetch partnerships
      const { data: partnerships } = await supabase
        .from("accountability_partnerships")
        .select("id, user1_id, user2_id, status")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .eq("status", "active");
      const partnerByUser = new Map<string, string>();
      for (const p of partnerships || []) {
        const other = p.user1_id === user!.id ? p.user2_id : p.user1_id;
        partnerByUser.set(other, p.id);
      }

      // Build contact -> match map
      const out: Record<string, KujitumaMatch> = {};
      for (const c of contacts) {
        const cEmail = normalizeEmail(c.email);
        const cLinkedin = normalizeLinkedin(c.linkedin_url);
        const cPhone = normalizePhone(c.whatsapp_number);
        for (const p of profileMap.values()) {
          const matchedOn: KujitumaMatch["matchedOn"] = [];
          if (cEmail && normalizeEmail(p.email) === cEmail) matchedOn.push("email");
          if (cLinkedin && normalizeLinkedin(p.linkedin_url) === cLinkedin) matchedOn.push("linkedin");
          if (cPhone && normalizePhone(p.phone_number) === cPhone) matchedOn.push("phone");
          if (matchedOn.length > 0) {
            out[c.id] = {
              userId: p.id,
              fullName: p.full_name,
              avatarUrl: p.avatar_url,
              matchedOn,
              isPartner: partnerByUser.has(p.id),
              partnershipId: partnerByUser.get(p.id),
            };
            break;
          }
        }
      }
      return out;
    },
  });
};
