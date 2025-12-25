
export interface DailyCheckIn {
  id: string;
  user_id: string;
  check_in_date: string;
  mood_rating?: number;
  energy_level?: number;
  focus_today?: string;
  quick_win?: string;
  blocker?: string;
  created_at: string;
  updated_at: string;
}

export interface UserStreaks {
  id: string;
  user_id: string;
  current_daily_streak: number;
  longest_daily_streak: number;
  current_weekly_streak: number;
  longest_weekly_streak: number;
  last_check_in_date?: string;
  last_week_completed?: string;
  created_at: string;
  updated_at: string;
}

export interface QuarterlyReview {
  id: string;
  user_id: string;
  quarter_start: string;
  year: number;
  quarter: number;
  wins?: string;
  challenges?: string;
  lessons_learned?: string;
  next_quarter_focus?: string;
  goals_review?: Record<string, any>;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlanningSession {
  id: string;
  user_id: string;
  week_start: string;
  is_completed: boolean;
  completed_at?: string;
  last_week_reflection?: string;
  week_intention?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDailyCheckIn {
  mood_rating?: number;
  energy_level?: number;
  focus_today?: string;
  quick_win?: string;
  blocker?: string;
}

export interface CreateQuarterlyReview {
  year: number;
  quarter: number;
  wins?: string;
  challenges?: string;
  lessons_learned?: string;
  next_quarter_focus?: string;
  goals_review?: Record<string, any>;
}

export interface CreateWeeklyPlanningSession {
  week_start: string;
  last_week_reflection?: string;
  week_intention?: string;
}
