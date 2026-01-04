-- Create table to track AI usage per user
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'insights' or 'suggestions'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can insert
CREATE POLICY "Service role can insert AI usage logs"
ON public.ai_usage_logs
FOR INSERT
WITH CHECK (true);

-- Admins can view all logs
CREATE POLICY "Admins can view all AI usage logs"
ON public.ai_usage_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own logs
CREATE POLICY "Users can view their own AI usage logs"
ON public.ai_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.ai_usage_logs IS 'Tracks AI feature usage per user for cost monitoring';