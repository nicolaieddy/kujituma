import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface MessageTemplate {
  id: string;
  user_id: string;
  event_type: string;
  template: string;
  created_at: string;
  updated_at: string;
}

export const useMessageTemplates = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["message_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates" as any)
        .select("*")
        .order("event_type");
      if (error) throw error;
      return data as unknown as MessageTemplate[];
    },
    enabled: !!user,
  });
};

export const useUpsertMessageTemplate = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ event_type, template }: { event_type: string; template: string }) => {
      const { data, error } = await supabase
        .from("message_templates" as any)
        .upsert(
          { user_id: user!.id, event_type, template } as any,
          { onConflict: "user_id,event_type" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["message_templates"] }),
  });
};
