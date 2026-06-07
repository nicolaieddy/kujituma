import { supabase } from "@/integrations/supabase/client";
import { CustomGoalCategory, CreateCustomCategoryData, PREDEFINED_CATEGORIES } from "@/types/customCategories";
import { authStore } from "@/stores/authStore";

export class CustomCategoriesService {
  static async getCustomCategories(): Promise<CustomGoalCategory[]> {
    const user = authStore.getUser();
    if (!user) return [];
    
    const { data: categories, error } = await supabase
      .from('custom_goal_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) throw error;
    return (categories || []) as CustomGoalCategory[];
  }

  static async createCustomCategory(data: CreateCustomCategoryData): Promise<CustomGoalCategory> {
    const userId = authStore.requireUserId();

    const trimmed = data.name.trim();
    const isPredefined = PREDEFINED_CATEGORIES.some(
      (n) => n.toLowerCase() === trimmed.toLowerCase()
    );
    if (isPredefined) {
      throw new Error(`"${trimmed}" is already a built-in category. Pick it from the list instead.`);
    }

    const { data: category, error } = await supabase
      .from('custom_goal_categories')
      .insert({
        name: trimmed,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return category as CustomGoalCategory;
  }

  static async deleteCustomCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('custom_goal_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
