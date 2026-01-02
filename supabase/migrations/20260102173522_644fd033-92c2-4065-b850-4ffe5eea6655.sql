-- Create a function to delete a user and all their data for GDPR compliance
-- This function must be called by an admin user

CREATE OR REPLACE FUNCTION public.delete_user_gdpr(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Prevent self-deletion
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account through admin panel';
  END IF;

  -- Delete all user data from all tables in the correct order (respecting foreign keys)
  
  -- Delete partnership-related data
  DELETE FROM partnership_visibility_history WHERE changed_by = target_user_id;
  DELETE FROM partnership_visibility_history 
    WHERE partnership_id IN (SELECT id FROM accountability_partnerships WHERE user1_id = target_user_id OR user2_id = target_user_id);
  DELETE FROM accountability_check_ins WHERE initiated_by = target_user_id;
  DELETE FROM accountability_check_ins 
    WHERE partnership_id IN (SELECT id FROM accountability_partnerships WHERE user1_id = target_user_id OR user2_id = target_user_id);
  DELETE FROM accountability_partnerships WHERE user1_id = target_user_id OR user2_id = target_user_id;
  DELETE FROM accountability_partner_requests WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  
  -- Delete group-related data
  DELETE FROM accountability_check_ins 
    WHERE group_id IN (SELECT id FROM accountability_groups WHERE created_by = target_user_id);
  DELETE FROM accountability_group_members WHERE user_id = target_user_id;
  DELETE FROM accountability_group_members 
    WHERE group_id IN (SELECT id FROM accountability_groups WHERE created_by = target_user_id);
  DELETE FROM accountability_groups WHERE created_by = target_user_id;
  
  -- Delete social data
  DELETE FROM comment_likes WHERE user_id = target_user_id;
  DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE user_id = target_user_id);
  DELETE FROM comments WHERE user_id = target_user_id;
  DELETE FROM post_reactions WHERE user_id = target_user_id;
  DELETE FROM post_likes WHERE user_id = target_user_id;
  DELETE FROM posts WHERE user_id = target_user_id;
  
  -- Delete notification data
  DELETE FROM notifications WHERE user_id = target_user_id OR triggered_by_user_id = target_user_id;
  
  -- Delete friend data
  DELETE FROM friend_requests WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM friends WHERE user1_id = target_user_id OR user2_id = target_user_id;
  
  -- Delete goal-related data
  DELETE FROM public_commitments WHERE user_id = target_user_id;
  DELETE FROM weekly_objectives WHERE user_id = target_user_id;
  DELETE FROM goal_status_history WHERE user_id = target_user_id;
  DELETE FROM habit_completions WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  DELETE FROM custom_goal_categories WHERE user_id = target_user_id;
  
  -- Delete planning and check-in data
  DELETE FROM daily_check_ins WHERE user_id = target_user_id;
  DELETE FROM weekly_planning_sessions WHERE user_id = target_user_id;
  DELETE FROM weekly_progress_posts WHERE user_id = target_user_id;
  DELETE FROM quarterly_reviews WHERE user_id = target_user_id;
  
  -- Delete user session and streak data
  DELETE FROM user_sessions WHERE user_id = target_user_id;
  DELETE FROM user_streaks WHERE user_id = target_user_id;
  DELETE FROM user_tours WHERE user_id = target_user_id;
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- Delete the profile
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Finally, delete from auth.users (this requires the service role or admin privileges)
  -- Note: The profile deletion via trigger might handle this, but we explicitly call it
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION public.delete_user_gdpr(uuid) TO authenticated;