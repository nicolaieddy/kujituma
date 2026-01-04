export type NotificationType = 
  | 'post_like' 
  | 'comment_added' 
  | 'comment_like' 
  | 'mention' 
  | 'friend_request' 
  | 'friend_request_accepted'
  | 'accountability_partner_request'
  | 'accountability_partner_accepted'
  | 'accountability_check_in'
  | 'goal_update_cheer'
  | 'goal_milestone'
  | 'goal_help_request'
  | 'goal_update_comment';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  related_post_id?: string | null;
  related_comment_id?: string | null;
  related_request_id?: string | null;
  related_goal_update_id?: string | null;
  triggered_by_user_id: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  triggered_by?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}