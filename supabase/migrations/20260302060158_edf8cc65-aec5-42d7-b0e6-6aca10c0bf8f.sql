
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DROP FUNCTION IF EXISTS public.create_mcp_api_token;
DROP FUNCTION IF EXISTS public.validate_mcp_api_token;

CREATE FUNCTION public.create_mcp_api_token(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_hash text;
  v_prefix text;
BEGIN
  v_token := 'kuj_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_prefix := substring(v_token from 1 for 12);
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.mcp_api_tokens (user_id, token_hash, token_prefix, name)
  VALUES (auth.uid(), v_hash, v_prefix, p_name);

  RETURN v_token;
END;
$$;

CREATE FUNCTION public.validate_mcp_api_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_user_id uuid;
BEGIN
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT user_id INTO v_user_id
  FROM public.mcp_api_tokens
  WHERE token_hash = v_hash
    AND is_revoked = false
    AND (expires_at IS NULL OR expires_at > now());

  IF v_user_id IS NOT NULL THEN
    UPDATE public.mcp_api_tokens
    SET last_used_at = now()
    WHERE token_hash = v_hash;
  END IF;

  RETURN v_user_id;
END;
$$;
