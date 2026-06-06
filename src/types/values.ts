export type ValueVisibility = "private" | "public";
export type GoalValueLinkSource = "ai" | "user";

export interface UserValue {
  id: string;
  user_id: string;
  label: string;
  statement: string;
  feeling: string | null;
  visibility: ValueVisibility;
  order_index: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalValueLink {
  id: string;
  user_id: string;
  goal_id: string;
  value_id: string;
  weight: number; // 1-5
  source: GoalValueLinkSource;
  ai_confidence: number | null;
  ai_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalValuesAlignment {
  goal_id: string;
  user_id: string;
  weight_sum: number;
  linked_count: number;
  total_values: number;
  score: number; // 0-100
}

export interface CreateValueInput {
  label: string;
  statement?: string;
  feeling?: string | null;
  visibility?: ValueVisibility;
}
