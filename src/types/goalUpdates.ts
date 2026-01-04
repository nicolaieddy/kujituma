export type UpdateType = 'weekly_progress' | 'milestone' | 'reflection' | 'ask_for_help' | 'started' | 'completed';
export type MilestoneType = 'started' | '25_percent' | '50_percent' | '75_percent' | 'completed';
export type CheerType = 'celebrate' | 'encourage' | 'offer_help';

export interface ObjectiveSnapshot {
  id: string;
  text: string;
  is_completed: boolean;
}

export interface GoalUpdate {
  id: string;
  goal_id: string;
  user_id: string;
  update_type: UpdateType;
  content: string | null;
  objectives_snapshot: ObjectiveSnapshot[];
  milestone_type: MilestoneType | null;
  week_start: string | null;
  created_at: string;
  // Joined data
  goal?: {
    id: string;
    title: string;
    description: string;
    status: string;
    category: string;
    target_date: string | null;
  };
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  cheers_count?: number;
  comments_count?: number;
  user_has_cheered?: boolean;
  user_cheer_type?: CheerType | null;
}

export interface GoalFollow {
  id: string;
  follower_user_id: string;
  goal_id: string;
  created_at: string;
  // Joined data
  goal?: {
    id: string;
    title: string;
    user_id: string;
    status: string;
  };
}

export interface GoalUpdateCheer {
  id: string;
  update_id: string;
  user_id: string;
  cheer_type: CheerType;
  message: string | null;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface GoalUpdateComment {
  id: string;
  update_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}
