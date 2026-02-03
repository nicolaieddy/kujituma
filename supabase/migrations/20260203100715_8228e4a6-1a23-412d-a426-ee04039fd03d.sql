-- Consolidated RPC for profile page data
-- Returns all profile data in a single call instead of 9-12 separate queries

CREATE OR REPLACE FUNCTION get_profile_page_data(p_profile_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
  v_is_owner BOOLEAN;
  v_is_friend BOOLEAN;
  v_is_partner BOOLEAN;
  v_partner_can_view_goals BOOLEAN := false;
  v_partnership_id UUID;
  v_friendship_status JSONB;
  v_partnership_status JSONB;
  v_profile_data JSONB;
  v_visible_goals JSONB;
  v_stats JSONB;
BEGIN
  v_is_owner := (v_user_id = p_profile_user_id);
  
  -- Check friendship status
  IF v_user_id IS NOT NULL AND NOT v_is_owner THEN
    SELECT EXISTS(
      SELECT 1 FROM friends 
      WHERE user1_id = LEAST(v_user_id, p_profile_user_id)
        AND user2_id = GREATEST(v_user_id, p_profile_user_id)
    ) INTO v_is_friend;
  ELSE
    v_is_friend := false;
  END IF;
  
  -- Check partnership status
  IF v_user_id IS NOT NULL AND NOT v_is_owner THEN
    SELECT 
      id,
      CASE 
        WHEN user1_id = v_user_id THEN user1_can_view_user2_goals
        ELSE user2_can_view_user1_goals
      END
    INTO v_partnership_id, v_partner_can_view_goals
    FROM accountability_partnerships
    WHERE status = 'active'
      AND ((user1_id = v_user_id AND user2_id = p_profile_user_id)
           OR (user1_id = p_profile_user_id AND user2_id = v_user_id));
    
    v_is_partner := v_partnership_id IS NOT NULL;
  ELSE
    v_is_partner := false;
  END IF;
  
  -- Build friendship status
  IF v_is_owner THEN
    v_friendship_status := jsonb_build_object('is_owner', true);
  ELSIF v_is_friend THEN
    v_friendship_status := jsonb_build_object('is_friend', true);
  ELSIF v_user_id IS NOT NULL THEN
    -- Check for pending friend requests
    SELECT jsonb_build_object(
      'is_friend', false,
      'friend_request_status', CASE 
        WHEN sender_id = v_user_id THEN 'sent'
        ELSE 'received'
      END,
      'request_id', id
    )
    INTO v_friendship_status
    FROM friend_requests
    WHERE status = 'pending'
      AND ((sender_id = v_user_id AND receiver_id = p_profile_user_id)
           OR (sender_id = p_profile_user_id AND receiver_id = v_user_id))
    LIMIT 1;
    
    IF v_friendship_status IS NULL THEN
      v_friendship_status := jsonb_build_object('is_friend', false);
    END IF;
  ELSE
    v_friendship_status := jsonb_build_object('is_friend', false);
  END IF;
  
  -- Build partnership status
  IF v_is_owner THEN
    v_partnership_status := jsonb_build_object('is_owner', true);
  ELSIF v_is_partner THEN
    v_partnership_status := jsonb_build_object(
      'is_partner', true,
      'partnership_id', v_partnership_id,
      'can_view_partner_goals', v_partner_can_view_goals
    );
  ELSIF v_user_id IS NOT NULL THEN
    -- Check for pending partner requests
    SELECT jsonb_build_object(
      'is_partner', false,
      'request_status', CASE 
        WHEN sender_id = v_user_id THEN 'sent'
        ELSE 'received'
      END,
      'request_id', id
    )
    INTO v_partnership_status
    FROM accountability_partner_requests
    WHERE status = 'pending'
      AND ((sender_id = v_user_id AND receiver_id = p_profile_user_id)
           OR (sender_id = p_profile_user_id AND receiver_id = v_user_id))
    LIMIT 1;
    
    IF v_partnership_status IS NULL THEN
      v_partnership_status := jsonb_build_object('is_partner', false);
    END IF;
  ELSE
    v_partnership_status := jsonb_build_object('is_partner', false);
  END IF;
  
  -- Fetch profile data with appropriate columns based on viewer
  IF v_is_owner THEN
    SELECT to_jsonb(p) INTO v_profile_data
    FROM profiles p WHERE p.id = p_profile_user_id;
  ELSIF v_user_id IS NOT NULL THEN
    -- Authenticated user viewing someone else's profile
    SELECT jsonb_build_object(
      'id', id,
      'full_name', full_name,
      'avatar_url', avatar_url,
      'cover_photo_url', cover_photo_url,
      'cover_photo_position', cover_photo_position,
      'about_me', about_me,
      'linkedin_url', linkedin_url,
      'instagram_url', instagram_url,
      'tiktok_url', tiktok_url,
      'twitter_url', twitter_url,
      'social_links_order', social_links_order,
      'created_at', created_at,
      'last_active_at', last_active_at
    ) INTO v_profile_data
    FROM profiles WHERE id = p_profile_user_id;
  ELSE
    -- Unauthenticated viewer
    SELECT jsonb_build_object(
      'id', id,
      'full_name', full_name,
      'avatar_url', avatar_url,
      'cover_photo_url', cover_photo_url,
      'cover_photo_position', cover_photo_position,
      'about_me', about_me,
      'created_at', created_at
    ) INTO v_profile_data
    FROM profiles WHERE id = p_profile_user_id;
  END IF;
  
  -- Fetch stats
  SELECT jsonb_build_object(
    'goals_completed', (SELECT COUNT(*) FROM goals WHERE user_id = p_profile_user_id AND status = 'completed'),
    'current_streak', COALESCE((SELECT current_weekly_streak FROM user_streaks WHERE user_id = p_profile_user_id), 0),
    'longest_streak', COALESCE((SELECT longest_weekly_streak FROM user_streaks WHERE user_id = p_profile_user_id), 0),
    'weeks_shared', (SELECT COUNT(*) FROM posts WHERE user_id = p_profile_user_id AND hidden = false)
  ) INTO v_stats;
  
  -- Fetch visible goals based on viewer permissions
  IF v_is_owner THEN
    -- Owner sees all goals
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'description', description,
        'status', status,
        'visibility', visibility,
        'timeframe', timeframe,
        'category', category,
        'target_date', target_date,
        'created_at', created_at,
        'completed_at', completed_at,
        'is_recurring', is_recurring
      ) ORDER BY created_at DESC
    ), '[]'::jsonb)
    INTO v_visible_goals
    FROM goals 
    WHERE user_id = p_profile_user_id
      AND status != 'deprioritized';
  ELSIF v_is_friend OR v_partner_can_view_goals THEN
    -- Friends and partners with permission see public + friends goals
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'description', description,
        'status', status,
        'visibility', visibility,
        'timeframe', timeframe,
        'category', category,
        'target_date', target_date,
        'created_at', created_at,
        'completed_at', completed_at,
        'is_recurring', is_recurring
      ) ORDER BY created_at DESC
    ), '[]'::jsonb)
    INTO v_visible_goals
    FROM goals 
    WHERE user_id = p_profile_user_id
      AND status != 'deprioritized'
      AND visibility IN ('public', 'friends');
  ELSE
    -- Public viewers see only public goals
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'description', description,
        'status', status,
        'visibility', visibility,
        'timeframe', timeframe,
        'category', category,
        'target_date', target_date,
        'created_at', created_at,
        'completed_at', completed_at,
        'is_recurring', is_recurring
      ) ORDER BY created_at DESC
    ), '[]'::jsonb)
    INTO v_visible_goals
    FROM goals 
    WHERE user_id = p_profile_user_id
      AND status != 'deprioritized'
      AND visibility = 'public';
  END IF;
  
  -- Build final result
  result := jsonb_build_object(
    'profile', v_profile_data,
    'stats', v_stats,
    'friendship', v_friendship_status,
    'partnership', v_partnership_status,
    'goals', v_visible_goals,
    'viewer_context', jsonb_build_object(
      'is_owner', v_is_owner,
      'is_friend', v_is_friend,
      'is_partner', v_is_partner,
      'can_view_partner_goals', v_partner_can_view_goals
    )
  );
  
  RETURN result;
END;
$$;