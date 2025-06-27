
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  timeframe: GoalTimeframe;
  target_date: string | null;
  status: GoalStatus;
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  order_index: number;
}

export type GoalTimeframe = '1 Month' | '3 Months' | 'Quarter' | '6 Months' | 'End of Year' | 'Custom Date';

export type GoalStatus = 'coming_up' | 'in_progress' | 'completed' | 'deleted';

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
  target_date?: string;
  category?: string;
  notes?: string;
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  timeframe?: GoalTimeframe;
  target_date?: string;
  status?: GoalStatus;
  category?: string;
  notes?: string;
  order_index?: number;
}
