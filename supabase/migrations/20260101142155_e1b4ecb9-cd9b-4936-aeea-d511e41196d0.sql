-- Update get_filtered_profile function to remove show_email references
CREATE OR REPLACE FUNCTION public.get_filtered_profile(profile_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Profile owner gets everything
  IF auth.uid() = profile_id THEN
    SELECT row_to_json(p) INTO result
    FROM public.profiles p
    WHERE p.id = profile_id;
  -- Authenticated users get limited data
  ELSIF auth.uid() IS NOT NULL THEN
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'about_me', p.about_me,
      'linkedin_url', p.linkedin_url,
      'instagram_url', p.instagram_url,
      'tiktok_url', p.tiktok_url,
      'twitter_url', p.twitter_url,
      'created_at', p.created_at,
      'last_active_at', p.last_active_at
    ) INTO result
    FROM public.profiles p
    WHERE p.id = profile_id;
  -- Anonymous users get minimal data
  ELSE
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'about_me', p.about_me,
      'created_at', p.created_at
    ) INTO result
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
  
  RETURN result;
END;
$function$;