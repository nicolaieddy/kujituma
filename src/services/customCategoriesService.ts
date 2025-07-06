import { supabase } from "@/integrations/supabase/client";
import { CustomGoalCategory, CreateCustomCategoryData } from "@/types/customCategories";

export class CustomCategoriesService {
  static async getCustomCategories(): Promise<CustomGoalCategory[]> {
    const { data: categories, error } = await supabase
      .from('custom_goal_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (categories || []) as CustomGoalCategory[];
  }

  static async createCustomCategory(data: CreateCustomCategoryData): Promise<CustomGoalCategory> {
    const { data: category, error } = await supabase
      .from('custom_goal_categories')
      .insert({
        name: data.name,
        user_id: (await supabase.auth.getUser()).data.user?.id
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