-- Fix the search path security issue for the function I just created
CREATE OR REPLACE FUNCTION public.get_secure_profile_data(profile_row public.profiles)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    requesting_user_id uuid := auth.uid();
    is_owner boolean := (requesting_user_id = profile_row.id);
    is_authenticated boolean := (requesting_user_id IS NOT NULL);
    result json;
BEGIN
    -- Build response based on access level
    IF is_owner THEN
        -- Profile owner gets everything
        result := row_to_json(profile_row);
    ELSIF is_authenticated THEN
        -- Authenticated users get limited data
        result := json_build_object(
            'id', profile_row.id,
            'created_at', profile_row.created_at,
            'updated_at', profile_row.updated_at,
            'last_active_at', profile_row.last_active_at,
            'full_name', profile_row.full_name,
            'avatar_url', profile_row.avatar_url,
            'about_me', profile_row.about_me,
            'linkedin_url', profile_row.linkedin_url,
            'instagram_url', profile_row.instagram_url,
            'tiktok_url', profile_row.tiktok_url,
            'twitter_url', profile_row.twitter_url,
            'show_email', profile_row.show_email,
            'email', CASE WHEN profile_row.show_email THEN profile_row.email ELSE NULL END,
            'google_id', NULL -- Never expose to other users
        );
    ELSE
        -- Anonymous users get minimal data needed for app functionality
        result := json_build_object(
            'id', profile_row.id,
            'full_name', profile_row.full_name,
            'avatar_url', profile_row.avatar_url,
            'about_me', profile_row.about_me,
            'created_at', profile_row.created_at,
            'email', NULL,
            'google_id', NULL,
            'linkedin_url', NULL,
            'instagram_url', NULL,
            'tiktok_url', NULL,
            'twitter_url', NULL,
            'show_email', false
        );
    END IF;
    
    RETURN result;
END;
$$;