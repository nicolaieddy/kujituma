
-- Create table for long-lived MCP API tokens
CREATE TABLE public.mcp_api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL, -- first 8 chars for display
  name TEXT NOT NULL DEFAULT 'Default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_revoked BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.mcp_api_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view their own tokens"
ON public.mcp_api_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own tokens
CREATE POLICY "Users can insert their own tokens"
ON public.mcp_api_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update (revoke) their own tokens
CREATE POLICY "Users can update their own tokens"
ON public.mcp_api_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own tokens"
ON public.mcp_api_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast token lookup during auth
CREATE INDEX idx_mcp_api_tokens_hash ON public.mcp_api_tokens (token_hash) WHERE is_revoked = false;
CREATE INDEX idx_mcp_api_tokens_user ON public.mcp_api_tokens (user_id);

-- Function to generate and store a token, returning the raw token
CREATE OR REPLACE FUNCTION public.create_mcp_api_token(p_name TEXT DEFAULT 'Default')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_token TEXT;
  hashed TEXT;
BEGIN
  -- Generate a secure random token: kuj_ prefix + 48 random chars
  raw_token := 'kuj_' || encode(gen_random_bytes(36), 'base64');
  -- Remove non-alphanumeric chars from base64
  raw_token := replace(replace(replace(raw_token, '+', ''), '/', ''), '=', '');
  
  hashed := encode(digest(raw_token::bytea, 'sha256'), 'hex');
  
  INSERT INTO public.mcp_api_tokens (user_id, token_hash, token_prefix, name)
  VALUES (auth.uid(), hashed, left(raw_token, 12), p_name);
  
  RETURN raw_token;
END;
$$;

-- Function to validate a token and return the user_id
CREATE OR REPLACE FUNCTION public.validate_mcp_api_token(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed TEXT;
  found_user_id UUID;
  found_token_id UUID;
BEGIN
  hashed := encode(digest(p_token::bytea, 'sha256'), 'hex');
  
  SELECT user_id, id INTO found_user_id, found_token_id
  FROM public.mcp_api_tokens
  WHERE token_hash = hashed
    AND is_revoked = false
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  IF found_user_id IS NOT NULL THEN
    -- Update last_used_at
    UPDATE public.mcp_api_tokens SET last_used_at = now() WHERE id = found_token_id;
  END IF;
  
  RETURN found_user_id;
END;
$$;
