
CREATE TABLE public.objective_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id uuid REFERENCES public.weekly_objectives(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_objective_comments_objective_id ON public.objective_comments(objective_id);

ALTER TABLE public.objective_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on own objectives"
  ON public.objective_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_objectives wo
      WHERE wo.id = objective_comments.objective_id
      AND wo.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can view comments on partner objectives"
  ON public.objective_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_objectives wo
      JOIN public.accountability_partnerships ap ON (
        (ap.user1_id = auth.uid() AND ap.user2_id = wo.user_id AND ap.user1_can_view_user2_goals = true)
        OR (ap.user2_id = auth.uid() AND ap.user1_id = wo.user_id AND ap.user2_can_view_user1_goals = true)
      )
      WHERE wo.id = objective_comments.objective_id
      AND ap.status = 'active'
    )
  );

CREATE POLICY "Users can add comments on own or partner objectives"
  ON public.objective_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.weekly_objectives wo
        WHERE wo.id = objective_comments.objective_id
        AND wo.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.weekly_objectives wo
        JOIN public.accountability_partnerships ap ON (
          (ap.user1_id = auth.uid() AND ap.user2_id = wo.user_id AND ap.user1_can_view_user2_goals = true)
          OR (ap.user2_id = auth.uid() AND ap.user1_id = wo.user_id AND ap.user2_can_view_user1_goals = true)
        )
        WHERE wo.id = objective_comments.objective_id
        AND ap.status = 'active'
      )
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.objective_comments FOR DELETE
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_objective_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  objective_owner_id uuid;
  objective_text_val text;
  commenter_name text;
BEGIN
  SELECT wo.user_id, wo.text INTO objective_owner_id, objective_text_val
  FROM weekly_objectives wo WHERE wo.id = NEW.objective_id;

  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;

  IF NEW.user_id != objective_owner_id THEN
    INSERT INTO notifications (user_id, triggered_by_user_id, type, message)
    VALUES (objective_owner_id, NEW.user_id, 'partner_objective_feedback',
      commenter_name || ' commented on your objective: "' ||
      LEFT(objective_text_val, 50) ||
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END
    );
  ELSE
    INSERT INTO notifications (user_id, triggered_by_user_id, type, message)
    SELECT DISTINCT oc.user_id, NEW.user_id, 'partner_objective_feedback',
      commenter_name || ' replied on objective: "' ||
      LEFT(objective_text_val, 50) ||
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END
    FROM objective_comments oc
    WHERE oc.objective_id = NEW.objective_id
      AND oc.user_id != NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_objective_comment_added
  AFTER INSERT ON public.objective_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_objective_comment();
