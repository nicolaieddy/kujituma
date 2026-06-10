
-- Switch the view to security_invoker so it uses the caller's permissions
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- Revoke EXECUTE from PUBLIC/anon on new SECURITY DEFINER functions; keep authenticated grant
REVOKE EXECUTE ON FUNCTION public.find_kujituma_matches(text[], text[], text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_ai_features(uuid) FROM PUBLIC, anon;
