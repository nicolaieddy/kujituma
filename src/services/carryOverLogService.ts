import { supabase } from "@/integrations/supabase/client";
import { authStore } from "@/stores/authStore";

export interface CarryOverLog {
  id: string;
  user_id: string;
  objective_id: string;
  objective_text: string;
  source_week_start: string;
  target_week_start: string;
  goal_id: string | null;
  goal_title: string | null;
  created_at: string;
}

export interface CarryOverLogInput {
  objective_id: string;
  objective_text: string;
  source_week_start: string;
  target_week_start: string;
  goal_id?: string | null;
  goal_title?: string | null;
}

export const CarryOverLogService = {
  async logCarryOver(logs: CarryOverLogInput[]): Promise<void> {
    const userId = authStore.requireUserId();

    const logsWithUser = logs.map(log => ({
      ...log,
      user_id: userId,
    }));

    const { error } = await supabase
      .from("carry_over_logs")
      .insert(logsWithUser);

    if (error) {
      console.error("[CarryOverLogService] Error logging carry-over:", error);
      throw error;
    }
  },

  async getRecentLogs(limit = 50): Promise<CarryOverLog[]> {
    const user = authStore.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("carry_over_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[CarryOverLogService] Error fetching logs:", error);
      throw error;
    }

    return data || [];
  },
};
