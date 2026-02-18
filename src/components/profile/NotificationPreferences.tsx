import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationPreferences, NotificationChannel } from "@/hooks/useNotificationPreferences";
import { NotificationType } from "@/types/notifications";

interface NotificationRow {
  type: NotificationType;
  label: string;
  description: string;
}

interface NotificationGroup {
  title: string;
  rows: NotificationRow[];
}

const GROUPS: NotificationGroup[] = [
  {
    title: "Social",
    rows: [
      { type: "post_like", label: "Post Likes", description: "Someone liked your weekly progress post" },
      { type: "comment_added", label: "Comments", description: "Someone commented on your post" },
      { type: "comment_like", label: "Comment Likes", description: "Someone liked your comment" },
      { type: "mention", label: "Mentions", description: "Someone mentioned you in a comment" },
      { type: "comment_reaction", label: "Comment Reactions", description: "Emoji reactions on your comments" },
    ],
  },
  {
    title: "Friends",
    rows: [
      { type: "friend_request", label: "Friend Requests", description: "Someone sent you a friend request" },
      { type: "friend_request_accepted", label: "Request Accepted", description: "Your friend request was accepted" },
    ],
  },
  {
    title: "Accountability",
    rows: [
      { type: "accountability_partner_request", label: "Partner Request", description: "Someone wants to be your accountability partner" },
      { type: "accountability_partner_accepted", label: "Partner Accepted", description: "Your partnership request was accepted" },
      { type: "accountability_check_in", label: "Partner Check-In", description: "Your partner sent you a check-in message" },
      { type: "partner_objective_feedback", label: "Objective Feedback", description: "Your partner reacted to one of your objectives" },
    ],
  },
  {
    title: "Goals & Community",
    rows: [
      { type: "goal_update_cheer", label: "Goal Cheers", description: "Someone cheered on your goal update" },
      { type: "goal_milestone", label: "Goal Milestones", description: "You reached a goal milestone" },
      { type: "goal_help_request", label: "Help Requests", description: "Someone asked for help on a goal you follow" },
      { type: "goal_update_comment", label: "Goal Comments", description: "New comment on a goal update" },
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
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreference } = useNotificationPreferences();

  const channel: NotificationChannel = "in_app";

  const getValue = (type: NotificationType): boolean => {
    const key = `${channel}_${type}` as keyof typeof preferences;
    return preferences[key] as boolean;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading">Notification Preferences</h2>
        <p className="text-muted-foreground mt-1">Control what you get notified about and how.</p>
      </div>

      {/* Channel legend */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">In-App</span>
          <span className="text-xs text-primary/70">Active</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border opacity-60">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Email</span>
          <Badge variant="secondary" className="text-xs py-0">Coming soon</Badge>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border opacity-60">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">SMS</span>
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
                <CardTitle className="text-base font-semibold text-foreground">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-5 space-y-1">
                {group.rows.map((row, idx) => (
                  <div key={row.type}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-foreground">{row.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                      </div>
                      <Switch
                        checked={getValue(row.type)}
                        onCheckedChange={(val) => updatePreference(row.type, channel, val)}
                        aria-label={`Toggle ${row.label} notifications`}
                      />
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
  );
}
