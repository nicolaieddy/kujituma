import { Bell, Mail, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotificationPreferences, NotificationChannel } from "@/hooks/useNotificationPreferences";
import { NotificationType } from "@/types/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { PhoneVerificationSection } from "@/components/profile/PhoneVerificationSection";

interface NotificationRow {
  type: NotificationType;
  label: string;
  description: string;
  smsEligible?: boolean;
}

interface NotificationGroup {
  title: string;
  rows: NotificationRow[];
  hasSms?: boolean;
}

const GROUPS: NotificationGroup[] = [
  {
    title: "Friends",
    hasSms: true,
    rows: [
      { type: "friend_request", label: "Friend Requests", description: "Someone sent you a friend request", smsEligible: true },
      { type: "friend_request_accepted", label: "Request Accepted", description: "Your friend request was accepted" },
    ],
  },
  {
    title: "Accountability",
    hasSms: true,
    rows: [
      { type: "accountability_partner_request", label: "Partner Request", description: "Someone wants to be your accountability partner", smsEligible: true },
      { type: "accountability_partner_accepted", label: "Partner Accepted", description: "Your partnership request was accepted", smsEligible: true },
      { type: "accountability_check_in", label: "Partner Check-In", description: "Your partner sent you a check-in message", smsEligible: true },
      { type: "partner_objective_feedback", label: "Objective Feedback", description: "Your partner reacted to one of your objectives" },
    ],
  },
  {
    title: "Social",
    hasSms: false,
    rows: [
      { type: "post_like", label: "Post Likes", description: "Someone liked your weekly progress post" },
      { type: "comment_added", label: "Comments", description: "Someone commented on your post" },
      { type: "comment_like", label: "Comment Likes", description: "Someone liked your comment" },
      { type: "mention", label: "Mentions", description: "Someone mentioned you in a comment" },
      { type: "comment_reaction", label: "Comment Reactions", description: "Emoji reactions on your comments" },
    ],
  },
  {
    title: "Goals",
    hasSms: false,
    rows: [
      { type: "goal_milestone", label: "Goal Milestones", description: "You reached a goal milestone" },
    ],
  },
];

function PreferenceSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((g) => (
        <Card key={g} className="glass-card">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((r) => (
              <div key={r} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <div className="flex gap-6">
                  <Skeleton className="h-6 w-11 rounded-full" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface NotificationPreferencesProps {
  onSwitchToProfileTab?: () => void;
  onVerified?: () => void;
}

export function NotificationPreferences({ onSwitchToProfileTab, onVerified }: NotificationPreferencesProps) {
  const { user } = useAuth();
  const { preferences, isLoading, updatePreference } = useNotificationPreferences();
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);

  // Check if user has a verified phone number (once on mount)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("phone_number, phone_verified")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setHasPhone(!!(data?.phone_number && data?.phone_verified));
      });
  }, [user]);

  const handleVerified = (phoneNumber: string) => {
    setHasPhone(true);
    onVerified?.();
  };

  const getInAppValue = (type: NotificationType): boolean => {
    const key = `in_app_${type}` as keyof typeof preferences;
    return preferences[key] as boolean;
  };

  const getSmsValue = (type: NotificationType): boolean => {
    const key = `sms_${type}` as keyof typeof preferences;
    return (preferences[key] as boolean) ?? false;
  };

  const smsDisabled = hasPhone === false;

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading">Notification Preferences</h2>
          <p className="text-muted-foreground mt-1">Control what you get notified about and how.</p>
        </div>

        {/* Phone verification — embedded here so it's contextually relevant */}
        <PhoneVerificationSection onVerified={handleVerified} />

        {/* Channel legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">In-App</span>
            <span className="text-xs text-primary/70">Active</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${hasPhone ? "bg-primary/10 border-primary/20" : "bg-muted border-border"}`}>
            <Smartphone className={`h-4 w-4 ${hasPhone ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${hasPhone ? "text-primary" : "text-muted-foreground"}`}>SMS</span>
            {hasPhone ? (
              <span className="text-xs text-primary/70">Active</span>
            ) : (
              <Badge variant="secondary" className="text-xs py-0">Add phone to enable</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border opacity-60">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Email</span>
            <Badge variant="secondary" className="text-xs py-0">Coming soon</Badge>
          </div>
        </div>

        {/* Groups */}
        {isLoading ? (
          <PreferenceSkeleton />
        ) : (
          <div className="space-y-4">
            {GROUPS.map((group) => (
              <Card key={group.title} className="glass-card shadow-elegant">
                <CardHeader className="pb-2 pt-5 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground">{group.title}</CardTitle>
                    {/* Column headers for groups with SMS */}
                    {group.hasSms ? (
                      <div className="flex items-center gap-6 text-xs text-muted-foreground font-medium uppercase tracking-wide pr-1">
                        <span className="w-11 text-center">In-App</span>
                        <span className="w-11 text-center">SMS</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">In-App Only</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-5 space-y-1">
                  {group.rows.map((row, idx) => (
                    <div key={row.type}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-medium text-foreground">{row.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          {/* In-App toggle */}
                          <div className="w-11 flex justify-center">
                            <Switch
                              checked={getInAppValue(row.type)}
                              onCheckedChange={(val) => updatePreference(row.type, "in_app", val)}
                              aria-label={`Toggle ${row.label} in-app notifications`}
                            />
                          </div>
                          {/* SMS toggle (only for SMS-eligible groups) */}
                          {group.hasSms && (
                            <div className="w-11 flex justify-center">
                              {row.smsEligible ? (
                                smsDisabled ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-not-allowed">
                                        <Switch
                                          checked={false}
                                          disabled
                                          aria-label={`SMS ${row.label} (requires phone number)`}
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p>Add a phone number to your profile to enable SMS</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Switch
                                    checked={getSmsValue(row.type)}
                                    onCheckedChange={(val) => updatePreference(row.type, "sms", val)}
                                    aria-label={`Toggle ${row.label} SMS notifications`}
                                  />
                                )
                              ) : (
                                <span className="w-11 h-6 flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground/40">—</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {idx < group.rows.length - 1 && (
                        <div className="h-px bg-border/50" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
