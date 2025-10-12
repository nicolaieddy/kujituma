-- Add order_index to weekly_objectives for drag-and-drop ordering
ALTER TABLE weekly_objectives ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_objectives_order ON weekly_objectives(user_id, week_start, order_index);

-- Create post_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('👍', '❤️', '🎉', '💪', '🔥', '👏')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction)
);

-- Enable RLS on post_reactions
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_reactions
CREATE POLICY "Anyone can view post reactions"
  ON post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
  ON post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions(user_id);

-- Update goals order_index to ensure it exists and has proper default
ALTER TABLE goals ALTER COLUMN order_index SET DEFAULT 0;