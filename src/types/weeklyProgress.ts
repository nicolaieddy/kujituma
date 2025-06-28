
export interface WeeklyObjective {
  id: string;
  user_id: string;
  goal_id: string | null;
  text: string;
  is_completed: boolean;
  week_start: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyProgressPost {
  id: string;
  user_id: string;
  week_start: string;
  notes: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWeeklyObjectiveData {
  goal_id?: string;
  text: string;
  week_start: string;
}

export interface UpdateWeeklyObjectiveData {
  text?: string;
  is_completed?: boolean;
  goal_id?: string | null;
}

export interface WeeklyProgressData {
  objectives: WeeklyObjective[];
  progressPost: WeeklyProgressPost | null;
}
