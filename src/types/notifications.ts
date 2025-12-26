export interface Notification {
  id: string;
  user_id: string;
  type: 'post_like' | 'comment_added' | 'comment_like' | 'mention' | 'friend_request' | 'friend_request_accepted';
  message: string;
  related_post_id?: string | null;
  related_comment_id?: string | null;
  related_request_id?: string | null; // For friend requests
  triggered_by_user_id: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  triggered_by?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}