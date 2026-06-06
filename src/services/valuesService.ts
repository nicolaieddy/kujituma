import { supabase } from "@/integrations/supabase/client";
import { authStore } from "@/stores/authStore";
import type {
  UserValue,
  GoalValueLink,
  GoalValuesAlignment,
  CreateValueInput,
  ValueVisibility,
  GoalValueLinkSource,
} from "@/types/values";

const VALUES_TABLE = "user_values" as any;
const LINKS_TABLE = "goal_value_links" as any;
const ALIGN_VIEW = "goal_values_alignment" as any;

export const ValuesService = {
  async listMyValues(): Promise<UserValue[]> {
    const user = authStore.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from(VALUES_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as UserValue[];
  },

  async listPublicValues(userId: string): Promise<UserValue[]> {
    const { data, error } = await supabase
      .from(VALUES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("visibility", "public")
      .eq("is_archived", false)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as UserValue[];
  },

  async createValue(input: CreateValueInput): Promise<UserValue> {
    const userId = authStore.requireUserId();
    const { data, error } = await supabase
      .from(VALUES_TABLE)
      .insert({
        user_id: userId,
        label: input.label,
        statement: input.statement ?? "",
        feeling: input.feeling ?? null,
        visibility: input.visibility ?? "private",
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as UserValue;
  },

  async bulkCreate(values: CreateValueInput[]): Promise<UserValue[]> {
    const userId = authStore.requireUserId();
    if (values.length === 0) return [];
    const rows = values.map((v, i) => ({
      user_id: userId,
      label: v.label,
      statement: v.statement ?? "",
      feeling: v.feeling ?? null,
      visibility: v.visibility ?? "private",
      order_index: i,
    }));
    const { data, error } = await supabase.from(VALUES_TABLE).insert(rows as any).select();
    if (error) throw error;
    return (data || []) as unknown as UserValue[];
  },

  async updateValue(id: string, patch: Partial<Pick<UserValue, "label" | "statement" | "feeling" | "visibility" | "order_index" | "is_archived">>): Promise<UserValue> {
    const { data, error } = await supabase
      .from(VALUES_TABLE)
      .update(patch as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as UserValue;
  },

  async deleteValue(id: string): Promise<void> {
    const { error } = await supabase.from(VALUES_TABLE).delete().eq("id", id);
    if (error) throw error;
  },

  // ----- Goal links -----
  async getLinksForGoal(goalId: string): Promise<GoalValueLink[]> {
    const { data, error } = await supabase
      .from(LINKS_TABLE)
      .select("*")
      .eq("goal_id", goalId);
    if (error) throw error;
    return (data || []) as unknown as GoalValueLink[];
  },

  async listMyLinks(): Promise<GoalValueLink[]> {
    const user = authStore.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from(LINKS_TABLE)
      .select("*")
      .eq("user_id", user.id);
    if (error) throw error;
    return (data || []) as unknown as GoalValueLink[];
  },

  async upsertLink(goalId: string, valueId: string, weight: number, source: GoalValueLinkSource = "user"): Promise<GoalValueLink> {
    const userId = authStore.requireUserId();
    const { data, error } = await supabase
      .from(LINKS_TABLE)
      .upsert(
        {
          user_id: userId,
          goal_id: goalId,
          value_id: valueId,
          weight,
          source,
        } as any,
        { onConflict: "goal_id,value_id" }
      )
      .select()
      .single();
    if (error) throw error;
    return data as unknown as GoalValueLink;
  },

  async deleteLink(goalId: string, valueId: string): Promise<void> {
    const { error } = await supabase
      .from(LINKS_TABLE)
      .delete()
      .eq("goal_id", goalId)
      .eq("value_id", valueId);
    if (error) throw error;
  },

  // ----- Alignment scores (view) -----
  async listMyAlignments(): Promise<GoalValuesAlignment[]> {
    const user = authStore.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from(ALIGN_VIEW)
      .select("*")
      .eq("user_id", user.id);
    if (error) throw error;
    return (data || []) as unknown as GoalValuesAlignment[];
  },

  async getGoalAlignment(goalId: string): Promise<GoalValuesAlignment | null> {
    const { data, error } = await supabase
      .from(ALIGN_VIEW)
      .select("*")
      .eq("goal_id", goalId)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as GoalValuesAlignment) ?? null;
  },

  // ----- AI suggestion -----
  async suggestForGoal(goalId: string): Promise<void> {
    const { error } = await supabase.functions.invoke("suggest-goal-values", {
      body: { goal_id: goalId },
    });
    if (error) throw error;
  },
};
