
CREATE OR REPLACE FUNCTION public.notify_comment_reaction()
RETURNS TRIGGER AS $$
DECLARE
  reactor_name TEXT;
  comment_author_id UUID;
  comment_preview TEXT;
  notif_message TEXT;
BEGIN
  -- Get the reactor's name
  SELECT full_name INTO reactor_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Get the comment author and message
  SELECT user_id, LEFT(message, 50) INTO comment_author_id, comment_preview
  FROM public.objective_comments
  WHERE id = NEW.comment_id;

  -- Don't notify if reacting to your own comment
  IF comment_author_id IS NULL OR comment_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Build message
  notif_message := COALESCE(reactor_name, 'Someone') || ' reacted ' || NEW.emoji || ' to your comment: "' ||
    comment_preview ||
    CASE WHEN LENGTH(comment_preview) >= 50 THEN '..."' ELSE '"' END;

  -- Insert notification
  INSERT INTO public.notifications (
    user_id,
    type,
    message,
    triggered_by_user_id,
    related_comment_id,
    is_read
  ) VALUES (
    comment_author_id,
    'comment_reaction',
    notif_message,
    NEW.user_id,
    NEW.comment_id,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_comment_reaction_inserted ON public.objective_comment_reactions;
CREATE TRIGGER on_comment_reaction_inserted
  AFTER INSERT ON public.objective_comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment_reaction();
