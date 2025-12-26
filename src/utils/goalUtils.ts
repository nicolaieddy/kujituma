import { Goal, HabitItem } from "@/types/goals";
import { Json } from "@/integrations/supabase/types";

// Helper to parse habit_items from JSON to typed array
export const parseHabitItems = (json: Json | null | undefined): HabitItem[] => {
  if (!json || !Array.isArray(json)) return [];
  return json.map((item: any) => ({
    id: item.id || '',
    text: item.text || '',
    frequency: item.frequency || 'weekly',
  }));
};

// Helper to convert Goal from DB to typed Goal
export const parseGoal = (dbGoal: any): Goal => ({
  ...dbGoal,
  habit_items: parseHabitItems(dbGoal.habit_items),
});

// Helper to convert multiple goals
export const parseGoals = (dbGoals: any[]): Goal[] => {
  return (dbGoals || []).map(parseGoal);
};
