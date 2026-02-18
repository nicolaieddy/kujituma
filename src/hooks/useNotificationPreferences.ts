import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationType } from "@/types/notifications";

export type NotificationChannel = "in_app"; // email | sms coming soon

type PreferenceKey = `${NotificationChannel}_${string}`;

export type NotificationPreferences = {
  id?: string;
  user_id?: string;
  // in_app
  in_app_post_like: boolean;
  in_app_comment_added: boolean;
  in_app_comment_like: boolean;
  in_app_mention: boolean;
  in_app_comment_reaction: boolean;
  in_app_friend_request: boolean;
  in_app_friend_request_accepted: boolean;
  in_app_accountability_partner_request: boolean;
  in_app_accountability_partner_accepted: boolean;
  in_app_accountability_check_in: boolean;
  in_app_partner_objective_feedback: boolean;
  in_app_goal_update_cheer: boolean;
  in_app_goal_milestone: boolean;
  in_app_goal_help_request: boolean;
  in_app_goal_update_comment: boolean;
};

const DEFAULTS: NotificationPreferences = {
  in_app_post_like: true,
  in_app_comment_added: true,
  in_app_comment_like: true,
  in_app_mention: true,
  in_app_comment_reaction: true,
  in_app_friend_request: true,
  in_app_friend_request_accepted: true,
  in_app_accountability_partner_request: true,
  in_app_accountability_partner_accepted: true,
  in_app_accountability_check_in: true,
  in_app_partner_objective_feedback: true,
  in_app_goal_update_cheer: true,
  in_app_goal_milestone: true,
  in_app_goal_help_request: true,
  in_app_goal_update_comment: true,
};

export function columnForType(type: NotificationType, channel: NotificationChannel): keyof NotificationPreferences {
  return `${channel}_${type}` as keyof NotificationPreferences;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<NotificationPreferences>>({});

  // Load preferences on mount
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setPreferences(data as NotificationPreferences);
      } else if (!error && !data) {
        // Row doesn't exist yet — will be created on first update
        setPreferences(DEFAULTS);
      }
      setIsLoading(false);
    };

    load();
  }, [user]);

  // Debounced upsert
  const flushSave = useCallback(async () => {
    if (!user || Object.keys(pendingRef.current).length === 0) return;
    const payload = { ...pendingRef.current, user_id: user.id };
    pendingRef.current = {};
    await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" });
  }, [user]);

  const updatePreference = useCallback(
    (type: NotificationType, channel: NotificationChannel, value: boolean) => {
      const col = columnForType(type, channel);
      // Optimistic update
      setPreferences((prev) => ({ ...prev, [col]: value }));
      (pendingRef.current as Record<string, boolean>)[col as string] = value;

      // Debounce saves
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushSave, 800);
    },
    [flushSave]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flushSave();
    };
  }, [flushSave]);

  return { preferences, isLoading, updatePreference };
}
