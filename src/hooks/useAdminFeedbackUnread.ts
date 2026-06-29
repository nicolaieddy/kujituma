import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminFeedbackUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-feedback-unread-count"],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("feedback_submissions")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .eq("is_resolved", false);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}
