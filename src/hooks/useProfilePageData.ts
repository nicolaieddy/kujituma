import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  id: string;
  full_name: string;
  avatar_url?: string;
  cover_photo_url?: string;
  cover_photo_position?: number;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  social_links_order?: string[];
  created_at: string;
  last_active_at?: string;
  // Owner-only fields
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  country?: string;
  city?: string;
  ai_features_enabled?: boolean;
  is_profile_complete?: boolean;
  // Additional social links for owner
  github_url?: string;
  youtube_url?: string;
  medium_url?: string;
  substack_url?: string;
  website_url?: string;
  whatsapp_url?: string;
  telegram_url?: string;
  signal_url?: string;
  snapchat_url?: string;
  email_contact?: string;
}

export interface ProfileStats {
  goals_completed: number;
  current_streak: number;
  longest_streak: number;
  weeks_shared: number;
}

export interface FriendshipStatus {
  is_owner?: boolean;
  is_friend?: boolean;
  friend_request_status?: 'sent' | 'received';
  request_id?: string;
}

export interface PartnershipStatus {
  is_owner?: boolean;
  is_partner?: boolean;
  partnership_id?: string;
  can_view_partner_goals?: boolean;
  request_status?: 'sent' | 'received';
  request_id?: string;
}

export interface ProfileGoal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  timeframe: string;
  category: string | null;
  target_date: string | null;
  created_at: string;
  completed_at: string | null;
  is_recurring: boolean;
}

export interface ViewerContext {
  is_owner: boolean;
  is_friend: boolean;
  is_partner: boolean;
  can_view_partner_goals: boolean;
}

export interface ProfilePageData {
  profile: ProfileData | null;
  stats: ProfileStats;
  friendship: FriendshipStatus;
  partnership: PartnershipStatus;
  goals: ProfileGoal[];
  viewer_context: ViewerContext;
}

export const useProfilePageData = (profileUserId: string | undefined) => {
  return useQuery({
    queryKey: ['profile-page-data', profileUserId],
    queryFn: async (): Promise<ProfilePageData | null> => {
      if (!profileUserId) return null;

      const { data, error } = await supabase.rpc('get_profile_page_data', {
        p_profile_user_id: profileUserId
      });

      if (error) {
        console.error('Error fetching profile page data:', error);
        throw error;
      }

      if (!data) return null;

      // Cast to our expected shape - the RPC returns JSONB
      const result = data as unknown as {
        profile: ProfileData | null;
        stats: ProfileStats;
        friendship: FriendshipStatus;
        partnership: PartnershipStatus;
        goals: ProfileGoal[];
        viewer_context: ViewerContext;
      };

      return {
        profile: result.profile,
        stats: result.stats,
        friendship: result.friendship,
        partnership: result.partnership,
        goals: result.goals || [],
        viewer_context: result.viewer_context
      };
    },
    enabled: !!profileUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
