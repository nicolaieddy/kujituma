
-- Add SMS preference columns to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS sms_friend_request boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_accountability_partner_request boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_accountability_partner_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_accountability_check_in boolean NOT NULL DEFAULT false;

-- Add phone_verified to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- Auto-set phone_verified when phone_number is saved/updated
CREATE OR REPLACE FUNCTION public.sync_phone_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_verified := true;
  ELSE
    NEW.phone_verified := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_phone_verified ON public.profiles;
CREATE TRIGGER trg_sync_phone_verified
  BEFORE INSERT OR UPDATE OF phone_number ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_phone_verified();

-- Postgres trigger to call send-sms edge function on notification insert
CREATE OR REPLACE FUNCTION public.trigger_sms_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sms_types TEXT[] := ARRAY['friend_request', 'accountability_partner_request', 'accountability_partner_accepted', 'accountability_check_in'];
  edge_url TEXT;
  service_key TEXT;
BEGIN
  -- Only proceed for SMS-eligible notification types
  IF NOT (NEW.type = ANY(sms_types)) THEN
    RETURN NEW;
  END IF;

  edge_url := current_setting('app.supabase_url', true) || '/functions/v1/send-sms';
  service_key := current_setting('app.service_role_key', true);

  -- Use pg_net to call the edge function asynchronously
  PERFORM net.http_post(
    url := 'https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/send-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.service_key', true))
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'type', NEW.type,
      'triggered_by_user_id', NEW.triggered_by_user_id,
      'message', NEW.message
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the notification insert
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sms_notification ON public.notifications;
CREATE TRIGGER trg_sms_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sms_notification();
