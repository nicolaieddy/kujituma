-- Create function to extract user mentions from comment text and send notifications
CREATE OR REPLACE FUNCTION public.handle_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  mention_pattern TEXT := '@([a-zA-Z0-9_]+)';
  mention_match TEXT;
  mentioned_user_id UUID;
  commenter_name TEXT;
  mentioned_user_name TEXT;
BEGIN
  -- Get commenter name
  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  -- Find all @mentions in the message and send notifications
  FOR mention_match IN
    SELECT unnest(regexp_split_to_array(NEW.message, '\s+'))
    WHERE unnest LIKE '@%'
  LOOP
    -- Extract username (remove @ symbol)
    mention_match := trim(substring(mention_match from 2));
    
    -- Find user by full_name (case insensitive, partial match)
    SELECT id INTO mentioned_user_id 
    FROM profiles 
    WHERE LOWER(REPLACE(full_name, ' ', '')) = LOWER(REPLACE(mention_match, ' ', ''))
       OR LOWER(full_name) LIKE LOWER('%' || mention_match || '%')
    LIMIT 1;
    
    -- If user found, create notification
    IF mentioned_user_id IS NOT NULL THEN
      SELECT full_name INTO mentioned_user_name FROM profiles WHERE id = mentioned_user_id;
      
      PERFORM create_notification(
        mentioned_user_id,
        'mention',
        COALESCE(commenter_name, 'Someone') || ' mentioned you in a comment',
        NEW.post_id,
        NEW.id,
        NEW.user_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$

-- Create trigger to handle mentions after comment insertion
CREATE TRIGGER handle_comment_mentions_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_mentions();