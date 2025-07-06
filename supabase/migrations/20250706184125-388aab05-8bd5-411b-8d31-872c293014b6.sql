-- Fix duplicate weekly progress posts issue

-- First, let's see what duplicates exist
DO $$ 
DECLARE 
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, week_start, COUNT(*) as cnt
        FROM public.weekly_progress_posts
        GROUP BY user_id, week_start
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % duplicate user-week combinations', duplicate_count;
END $$;

-- Remove duplicates, keeping only the most recent one
DELETE FROM public.weekly_progress_posts 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, week_start) id
    FROM public.weekly_progress_posts
    ORDER BY user_id, week_start, updated_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.weekly_progress_posts 
ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_start);

-- Add similar constraint for weekly_objectives if needed
DO $$ 
BEGIN
    -- Check if constraint already exists for weekly_objectives
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_week_objective' 
        AND table_name = 'weekly_objectives'
    ) THEN
        -- Remove duplicates first
        DELETE FROM public.weekly_objectives 
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id, week_start, text) id
            FROM public.weekly_objectives
            ORDER BY user_id, week_start, text, created_at DESC
        );
        
        -- Add unique constraint for objectives
        ALTER TABLE public.weekly_objectives 
        ADD CONSTRAINT unique_user_week_objective UNIQUE (user_id, week_start, text);
    END IF;
END $$;