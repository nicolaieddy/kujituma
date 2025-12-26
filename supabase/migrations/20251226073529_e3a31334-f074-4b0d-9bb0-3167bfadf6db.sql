-- Fix remaining functions without search_path set

CREATE OR REPLACE FUNCTION public.get_profile_visibility_level(profile_user_id uuid, requesting_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Profile owner gets full access
  IF requesting_user_id = profile_user_id THEN
    RETURN 'owner';
  END IF;
  
  -- Authenticated users get basic access
  IF requesting_user_id IS NOT NULL THEN
    RETURN 'authenticated';
  END IF;
  
  -- Anonymous users get minimal access
  RETURN 'anonymous';
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;