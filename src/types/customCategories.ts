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
  'Language Learning',
  'Learning & Education',
  'Financial',
  'Relationships',
  'Personal Development',
  'Creative Projects',
  'Travel & Adventure'
] as const;

// Categories with special integrations
export const CATEGORY_INTEGRATIONS = {
  'Language Learning': 'duolingo',
  'Health & Fitness': 'strava',
} as const;

export type PredefinedCategory = typeof PREDEFINED_CATEGORIES[number];