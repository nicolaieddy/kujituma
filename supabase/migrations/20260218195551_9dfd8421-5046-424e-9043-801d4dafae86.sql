
-- Update get_accountability_data to treat any form of engagement
-- (check-ins, objective comments, reactions, feedback, goal comments)
-- as "checked in" for the my_last_check_in_at field.

CREATE OR REPLACE FUNCTION public.get_accountability_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'partners', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'partner_id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'partnership_id', ap.id,
        'status', ap.status,
        'last_check_in_at', ap.last_check_in_at,
        'can_view_partner_goals', CASE 
          WHEN ap.user1_id = v_user_id THEN ap.user1_can_view_user2_goals 
          ELSE ap.user2_can_view_user1_goals 
        END,
        'partner_can_view_my_goals', CASE 
          WHEN ap.user1_id = v_user_id THEN ap.user2_can_view_user1_goals 
          ELSE ap.user1_can_view_user2_goals 
        END,
        'my_check_in_cadence', CASE 
          WHEN ap.user1_id = v_user_id THEN COALESCE(ap.my_check_in_cadence_user1, 'weekly')
          ELSE COALESCE(ap.my_check_in_cadence_user2, 'weekly')
        END,
        'partnership_created_at', ap.created_at,
        -- Broadened definition: last engagement = max across all interaction types
        'my_last_check_in_at', (
          SELECT MAX(last_engagement)
          FROM (
            -- Explicit check-in messages
            SELECT MAX(ci.created_at) AS last_engagement
            FROM accountability_check_ins ci
            WHERE ci.partnership_id = ap.id
              AND ci.initiated_by = v_user_id

            UNION ALL

            -- Comments on partner's weekly objectives
            SELECT MAX(oc.created_at) AS last_engagement
            FROM objective_comments oc
            JOIN weekly_objectives wo ON wo.id = oc.objective_id
            WHERE wo.user_id = CASE 
                WHEN ap.user1_id = v_user_id THEN ap.user2_id 
                ELSE ap.user1_id 
              END
              AND oc.user_id = v_user_id

            UNION ALL

            -- Emoji feedback on partner's objectives
            SELECT MAX(opf.created_at) AS last_engagement
            FROM objective_partner_feedback opf
            JOIN weekly_objectives wo ON wo.id = opf.objective_id
            WHERE wo.user_id = CASE 
                WHEN ap.user1_id = v_user_id THEN ap.user2_id 
                ELSE ap.user1_id 
              END
              AND opf.partner_id = v_user_id

            UNION ALL

            -- Reactions on partner's check-ins
            SELECT MAX(cr.created_at) AS last_engagement
            FROM check_in_reactions cr
            JOIN accountability_check_ins ci ON ci.id = cr.check_in_id
            WHERE ci.partnership_id = ap.id
              AND ci.initiated_by != v_user_id
              AND cr.user_id = v_user_id

            UNION ALL

            -- Comments on partner's goals
            SELECT MAX(gc.created_at) AS last_engagement
            FROM goal_comments gc
            JOIN goals g ON g.id = gc.goal_id
            WHERE g.user_id = CASE 
                WHEN ap.user1_id = v_user_id THEN ap.user2_id 
                ELSE ap.user1_id 
              END
              AND gc.user_id = v_user_id
          ) engagements
        )
      )), '[]'::jsonb)
      FROM accountability_partnerships ap
      JOIN profiles p ON p.id = CASE 
        WHEN ap.user1_id = v_user_id THEN ap.user2_id 
        ELSE ap.user1_id 
      END
      WHERE ap.status = 'active'
        AND (ap.user1_id = v_user_id OR ap.user2_id = v_user_id)
    ),
    'sent_requests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'sender_id', r.sender_id,
        'receiver_id', r.receiver_id,
        'message', r.message,
        'status', r.status,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'sender_can_view_receiver_goals', r.sender_can_view_receiver_goals,
        'receiver_can_view_sender_goals', r.receiver_can_view_sender_goals,
        'receiver_profile', (
          SELECT jsonb_build_object(
            'full_name', rp.full_name,
            'avatar_url', rp.avatar_url,
            'email', rp.email
          )
          FROM profiles rp WHERE rp.id = r.receiver_id
        )
      )), '[]'::jsonb)
      FROM accountability_partner_requests r
      WHERE r.sender_id = v_user_id
        AND r.status = 'pending'
    ),
    'received_requests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'sender_id', r.sender_id,
        'receiver_id', r.receiver_id,
        'message', r.message,
        'status', r.status,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'sender_can_view_receiver_goals', r.sender_can_view_receiver_goals,
        'receiver_can_view_sender_goals', r.receiver_can_view_sender_goals,
        'sender_profile', (
          SELECT jsonb_build_object(
            'full_name', sp.full_name,
            'avatar_url', sp.avatar_url,
            'email', sp.email
          )
          FROM profiles sp WHERE sp.id = r.sender_id
        )
      )), '[]'::jsonb)
      FROM accountability_partner_requests r
      WHERE r.receiver_id = v_user_id
        AND r.status = 'pending'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
