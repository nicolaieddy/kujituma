-- Create function to auto-befriend nicolaieddy@gmail.com with all new users
CREATE OR REPLACE FUNCTION auto_befriend_nicolas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nicolas_id UUID;
BEGIN
  -- Get Nicolas's user ID
  SELECT id INTO nicolas_id FROM profiles WHERE email = 'nicolaieddy@gmail.com';
  
  -- If Nicolas exists and this is not Nicolas's own profile
  IF nicolas_id IS NOT NULL AND NEW.id != nicolas_id THEN
    -- Create friendship between Nicolas and the new user
    INSERT INTO friends (user1_id, user2_id)
    VALUES (
      LEAST(nicolas_id, NEW.id),
      GREATEST(nicolas_id, NEW.id)
    )
    ON CONFLICT DO NOTHING; -- Avoid duplicates
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-befriend Nicolas with new users
DROP TRIGGER IF EXISTS auto_befriend_nicolas_trigger ON profiles;
CREATE TRIGGER auto_befriend_nicolas_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_befriend_nicolas();

-- Also create friendships with existing users (one-time setup)
DO $$
DECLARE
  nicolas_id UUID;
  user_record RECORD;
BEGIN
  -- Get Nicolas's user ID
  SELECT id INTO nicolas_id FROM profiles WHERE email = 'nicolaieddy@gmail.com';
  
  IF nicolas_id IS NOT NULL THEN
    -- Loop through all existing users except Nicolas
    FOR user_record IN 
      SELECT id FROM profiles WHERE id != nicolas_id
    LOOP
      -- Create friendship if it doesn't exist
      INSERT INTO friends (user1_id, user2_id)
      VALUES (
        LEAST(nicolas_id, user_record.id),
        GREATEST(nicolas_id, user_record.id)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;