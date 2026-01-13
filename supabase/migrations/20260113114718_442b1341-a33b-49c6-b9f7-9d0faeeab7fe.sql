-- Create table for partner objective feedback
CREATE TABLE public.objective_partner_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES weekly_objectives(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('agree', 'question')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(objective_id, partner_id)
);

-- Enable RLS
ALTER TABLE public.objective_partner_feedback ENABLE ROW LEVEL SECURITY;

-- Partners can create/update feedback on objectives they can view
CREATE POLICY "Partners can manage feedback on visible objectives"
ON public.objective_partner_feedback
FOR ALL
USING (
  partner_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM weekly_objectives wo
    JOIN accountability_partnerships ap ON (
      (ap.user1_id = auth.uid() AND ap.user2_id = wo.user_id AND ap.user1_can_view_user2_goals = true) OR
      (ap.user2_id = auth.uid() AND ap.user1_id = wo.user_id AND ap.user2_can_view_user1_goals = true)
    )
    WHERE wo.id = objective_id AND ap.status = 'active'
  )
)
WITH CHECK (
  partner_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM weekly_objectives wo
    JOIN accountability_partnerships ap ON (
      (ap.user1_id = auth.uid() AND ap.user2_id = wo.user_id AND ap.user1_can_view_user2_goals = true) OR
      (ap.user2_id = auth.uid() AND ap.user1_id = wo.user_id AND ap.user2_can_view_user1_goals = true)
    )
    WHERE wo.id = objective_id AND ap.status = 'active'
  )
);

-- Users can view feedback on their own objectives
CREATE POLICY "Users can view feedback on their objectives"
ON public.objective_partner_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM weekly_objectives wo
    WHERE wo.id = objective_id AND wo.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_objective_partner_feedback_objective ON public.objective_partner_feedback(objective_id);
CREATE INDEX idx_objective_partner_feedback_partner ON public.objective_partner_feedback(partner_id);