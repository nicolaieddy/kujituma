export interface CustomGoalCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomCategoryData {
  name: string;
}

export const PREDEFINED_CATEGORIES = [
  'Health & Fitness',
  'Career & Business',
  'Learning & Education',
  'Financial',
  'Relationships',
  'Personal Development',
  'Creative Projects',
  'Travel & Adventure'
] as const;

export type PredefinedCategory = typeof PREDEFINED_CATEGORIES[number];