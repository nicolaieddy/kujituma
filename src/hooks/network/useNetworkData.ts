import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export interface Contact {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  whatsapp_number: string | null;
  email: string | null;
  influence_type: string;
  country: string | null;
  region: string | null;
  sector: string | null;
  influence_score: number;
  relationship_strength: string;
  strategic_importance: number;
  last_interaction_date: string | null;
  birthday: string | null;
  notes: string | null;
  living_location: string | null;
  labels: string[];
  first_met_year: number | null;
  first_met_month: number | null;
  is_inner_circle: boolean;
  muted_from_brief: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  user_id: string;
  contact_id: string;
  date: string;
  type: string;
  summary: string | null;
  follow_up_date: string | null;
  direction: string | null;
  created_at: string;
}

export type ContactInsert = Omit<Contact, "id" | "created_at" | "updated_at">;
export type InteractionInsert = Omit<Interaction, "id" | "created_at">;

export const useContacts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!user,
  });
};

export const useContact = (id: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!user && !!id,
  });
};

export const useInteractions = (contactId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["interactions", contactId],
    queryFn: async () => {
      let query = supabase.from("interactions").select("*").order("date", { ascending: false });
      if (contactId) query = query.eq("contact_id", contactId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Interaction[];
    },
    enabled: !!user,
  });
};

export const useCreateContact = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, "user_id">) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...contact, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
};

export const useUpdateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", data.id] });
    },
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
};

export const useCreateInteraction = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (interaction: Omit<InteractionInsert, "user_id">) => {
      const { data, error } = await supabase
        .from("interactions")
        .insert({ ...interaction, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      // Update last_interaction_date on the contact
      await supabase
        .from("contacts")
        .update({ last_interaction_date: interaction.date })
        .eq("id", interaction.contact_id);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["interactions"] });
      qc.invalidateQueries({ queryKey: ["contacts", data.contact_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useUpdateInteraction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId, ...updates }: { id: string; contactId: string; date?: string; type?: string; summary?: string | null; direction?: string | null; follow_up_date?: string | null }) => {
      const { data, error } = await supabase
        .from("interactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, contactId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["interactions"] });
      qc.invalidateQueries({ queryKey: ["contacts", data.contactId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useDeleteInteraction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from("interactions").delete().eq("id", id);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      qc.invalidateQueries({ queryKey: ["interactions"] });
      qc.invalidateQueries({ queryKey: ["contacts", contactId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

// === Contact Events ===

export interface ContactEvent {
  id: string;
  user_id: string;
  contact_id: string;
  title: string;
  event_date: string;
  is_recurring: boolean;
  created_at: string;
}

export const useContactEvents = (contactId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contact_events", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_events")
        .select("*")
        .eq("contact_id", contactId)
        .order("event_date");
      if (error) throw error;
      return data as ContactEvent[];
    },
    enabled: !!user && !!contactId,
  });
};

export const useAllContactEvents = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contact_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_events")
        .select("*")
        .order("event_date");
      if (error) throw error;
      return data as ContactEvent[];
    },
    enabled: !!user,
  });
};

export const useCreateContactEvent = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (event: Omit<ContactEvent, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("contact_events")
        .insert({ ...event, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contact_events", data.contact_id] });
      qc.invalidateQueries({ queryKey: ["contact_events"] });
    },
  });
};

export const useDeleteContactEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from("contact_events").delete().eq("id", id);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      qc.invalidateQueries({ queryKey: ["contact_events", contactId] });
      qc.invalidateQueries({ queryKey: ["contact_events"] });
    },
  });
};

// === Contact Key Facts ===

export interface ContactKeyFact {
  id: string;
  user_id: string;
  contact_id: string;
  fact: string;
  created_at: string;
}

export const useContactKeyFacts = (contactId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contact_key_facts", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_key_facts")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at");
      if (error) throw error;
      return data as ContactKeyFact[];
    },
    enabled: !!user && !!contactId,
  });
};

export const useCreateContactKeyFact = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (fact: Omit<ContactKeyFact, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("contact_key_facts")
        .insert({ ...fact, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contact_key_facts", data.contact_id] });
    },
  });
};

export const useDeleteContactKeyFact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from("contact_key_facts").delete().eq("id", id);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      qc.invalidateQueries({ queryKey: ["contact_key_facts", contactId] });
    },
  });
};

// === Contact Resources ===

export interface ContactResource {
  id: string;
  user_id: string;
  contact_id: string;
  type: string;
  label: string;
  url: string;
  created_at: string;
}

export const useContactResources = (contactId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contact_resources", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_resources")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at");
      if (error) throw error;
      return data as ContactResource[];
    },
    enabled: !!user && !!contactId,
  });
};

export const useCreateContactResource = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (resource: Omit<ContactResource, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("contact_resources")
        .insert({ ...resource, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contact_resources", data.contact_id] });
    },
  });
};

export const useDeleteContactResource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from("contact_resources").delete().eq("id", id);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      qc.invalidateQueries({ queryKey: ["contact_resources", contactId] });
    },
  });
};
