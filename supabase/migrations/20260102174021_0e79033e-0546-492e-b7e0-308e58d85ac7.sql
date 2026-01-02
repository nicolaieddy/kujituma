-- Function for users to delete their own account (GDPR compliant)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid := auth.uid();
BEGIN
  -- Ensure user is authenticated
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user data from all tables (same logic as admin function)
  
  -- Delete accountability data
  DELETE FROM public.accountability_check_ins WHERE partner_id IN (
    SELECT id FROM public.accountability_partners WHERE user_id = target_user_id OR partner_id = target_user_id
  );
  DELETE FROM public.accountability_partners WHERE user_id = target_user_id OR partner_id = target_user_id;
  
  -- Delete habits data
  DELETE FROM public.habit_completions WHERE habit_id IN (
    SELECT id FROM public.habits WHERE user_id = target_user_id
  );
  DELETE FROM public.habit_streaks WHERE habit_id IN (
    SELECT id FROM public.habits WHERE user_id = target_user_id
  );
  DELETE FROM public.habits WHERE user_id = target_user_id;
  
  -- Delete goals and objectives
  DELETE FROM public.weekly_objectives WHERE goal_id IN (
    SELECT id FROM public.goals WHERE user_id = target_user_id
  );
  DELETE FROM public.objectives WHERE goal_id IN (
    SELECT id FROM public.goals WHERE user_id = target_user_id
  );
  DELETE FROM public.goals WHERE user_id = target_user_id;
  
  -- Delete weekly progress data
  DELETE FROM public.weekly_progress WHERE user_id = target_user_id;
  
  -- Delete check-ins and planning sessions
  DELETE FROM public.daily_check_ins WHERE user_id = target_user_id;
  DELETE FROM public.weekly_planning_sessions WHERE user_id = target_user_id;
  DELETE FROM public.quarterly_reviews WHERE user_id = target_user_id;
  
  -- Delete posts and interactions
  DELETE FROM public.post_comments WHERE user_id = target_user_id;
  DELETE FROM public.post_comments WHERE post_id IN (
    SELECT id FROM public.posts WHERE user_id = target_user_id
  );
  DELETE FROM public.post_likes WHERE user_id = target_user_id;
  DELETE FROM public.post_likes WHERE post_id IN (
    SELECT id FROM public.posts WHERE user_id = target_user_id
  );
  DELETE FROM public.post_reactions WHERE user_id = target_user_id;
  DELETE FROM public.post_reactions WHERE post_id IN (
    SELECT id FROM public.posts WHERE user_id = target_user_id
  );
  DELETE FROM public.posts WHERE user_id = target_user_id;
  
  -- Delete friendships
  DELETE FROM public.friends WHERE user_id = target_user_id OR friend_id = target_user_id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = target_user_id OR triggered_by = target_user_id;
  
  -- Delete custom categories
  DELETE FROM public.custom_categories WHERE user_id = target_user_id;
  
  -- Delete user sessions
  DELETE FROM public.user_sessions WHERE user_id = target_user_id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Finally delete the auth user (this will cascade to any remaining references)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;