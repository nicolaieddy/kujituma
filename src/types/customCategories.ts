import { 
  Dumbbell, 
  Briefcase, 
  Globe, 
  GraduationCap, 
  DollarSign, 
  Heart, 
  Sparkles, 
  Palette, 
  Plane,
  Tag,
  LucideIcon
} from 'lucide-react';

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

export interface CategoryConfig {
  name: string;
  icon: LucideIcon;
  integration?: 'duolingo' | 'strava';
  integrationEmoji?: string;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  { name: 'Health & Fitness', icon: Dumbbell, integration: 'strava', integrationEmoji: '🏃' },
  { name: 'Career & Business', icon: Briefcase },
  { name: 'Language Learning', icon: Globe, integration: 'duolingo', integrationEmoji: '🦉' },
  { name: 'Learning & Education', icon: GraduationCap },
  { name: 'Financial', icon: DollarSign },
  { name: 'Relationships', icon: Heart },
  { name: 'Personal Development', icon: Sparkles },
  { name: 'Creative Projects', icon: Palette },
  { name: 'Travel & Adventure', icon: Plane },
];

export const PREDEFINED_CATEGORIES = CATEGORY_CONFIGS.map(c => c.name) as readonly string[];

// Categories with special integrations
export const CATEGORY_INTEGRATIONS = {
  'Language Learning': 'duolingo',
  'Health & Fitness': 'strava',
} as const;

export type PredefinedCategory = typeof PREDEFINED_CATEGORIES[number];

// Helper to get category config by name
export const getCategoryConfig = (categoryName: string): CategoryConfig | undefined => {
  return CATEGORY_CONFIGS.find(c => c.name === categoryName);
};

// Default icon for custom categories
export const CustomCategoryIcon = Tag;