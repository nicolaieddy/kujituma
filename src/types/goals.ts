
export type GoalVisibility = 'public' | 'friends' | 'private';

export interface HabitItem {
  id: string;
  text: string;
  frequency: RecurrenceFrequency;
  creates_objective?: boolean; // If true, auto-creates weekly objectives
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  timeframe: GoalTimeframe;
  start_date: string | null;
  target_date: string | null;
  status: GoalStatus;
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deprioritized_at: string | null;
  order_index: number;
  visibility: GoalVisibility;
  is_recurring: boolean;
  recurrence_frequency: RecurrenceFrequency | null;
  recurring_objective_text: string | null;
  is_paused: boolean;
  paused_at: string | null;
  habit_items: HabitItem[];
}

export type GoalTimeframe = '1 Month' | '3 Months' | 'Quarter' | '6 Months' | 'End of Year' | 'Custom Date';

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'deprioritized' | 'deleted';

export type RecurrenceFrequency = 
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'monthly_last_week'
  | 'quarterly'
  | 'weekdays';

export interface GoalStatusHistory {
  id: string;
  goal_id: string;
  old_status: GoalStatus | null;
  new_status: GoalStatus;
  changed_at: string;
  user_id: string;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  timeframe: GoalTimeframe;
  start_date?: string;
  target_date?: string;
  category?: string;
  visibility?: GoalVisibility;
  is_recurring?: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  recurring_objective_text?: string;
  habit_items?: HabitItem[];
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  timeframe?: GoalTimeframe;
  start_date?: string;
  target_date?: string;
  status?: GoalStatus;
  category?: string;
  notes?: string;
  order_index?: number;
  visibility?: GoalVisibility;
  is_recurring?: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  recurring_objective_text?: string;
  is_paused?: boolean;
  paused_at?: string | null;
  habit_items?: HabitItem[];
}

export interface HabitCompletion {
  id: string;
  user_id: string;
  goal_id: string;
  habit_item_id: string;
  completion_date: string;
  created_at: string;
}
