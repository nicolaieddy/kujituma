export interface UserTour {
  id: string;
  user_id: string;
  tour_type: string;
  is_completed: boolean;
  current_step: number;
  dismissed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  showSkip?: boolean;
  actionText?: string;
}

export interface TourConfig {
  id: string;
  name: string;
  steps: TourStep[];
}