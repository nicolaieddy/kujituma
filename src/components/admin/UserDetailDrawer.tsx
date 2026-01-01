import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Clock, Calendar, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  posts_count: number;
  role?: string;
  last_active_at?: string;
  total_time_seconds?: number;
  days_active?: number;
}

interface UserSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  last_heartbeat_at: string;
}

interface UserDetailDrawerProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const UserDetailDrawer = ({ user, open, onOpenChange }: UserDetailDrawerProps) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchUserSessions(user.id);
    }
  }, [user, open]);

  const fetchUserSessions = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("id, started_at, ended_at, duration_seconds, last_heartbeat_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSessions((data as UserSession[]) || []);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate time breakdown by day
  const timeByDay = sessions.reduce((acc, session) => {
    const day = format(new Date(session.started_at), "yyyy-MM-dd");
    acc[day] = (acc[day] || 0) + session.duration_seconds;
    return acc;
  }, {} as Record<string, number>);

  const sortedDays = Object.entries(timeByDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7);

  // Calculate average session duration
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const avgSessionDuration = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;

  // Count active vs ended sessions
  const activeSessions = sessions.filter(s => !s.ended_at).length;

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-left">{user.full_name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant={user.role === "admin" ? "destructive" : "secondary"} className="mt-1">
                {user.role}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{formatDuration(user.total_time_seconds || 0)}</p>
              <p className="text-xs text-muted-foreground">Active Time</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{user.days_active || 0}</p>
              <p className="text-xs text-muted-foreground">Days Active</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Stats */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg session length</span>
                  <span className="font-medium">{formatDuration(avgSessionDuration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Currently active</span>
                  <Badge variant={activeSessions > 0 ? "default" : "secondary"}>
                    {activeSessions > 0 ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total sessions</span>
                  <span className="font-medium">{sessions.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Time Spent by Day */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Time Spent (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
                ) : (
                  sortedDays.map(([day, seconds]) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(day), "EEE, MMM d")}
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{
                            width: `${Math.min((seconds / 3600) * 20, 100)}px`,
                          }}
                        />
                        <span className="text-sm font-medium w-16 text-right">
                          {formatDuration(seconds)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No sessions recorded</p>
                ) : (
                  sessions.slice(0, 10).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {format(new Date(session.started_at), "MMM d, h:mm a")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.ended_at ? (
                            <>Ended at {format(new Date(session.ended_at), "h:mm a")}</>
                          ) : (
                            <span className="text-primary">● Currently active</span>
                          )}
                        </span>
                      </div>
                      <Badge variant={session.ended_at ? "secondary" : "default"}>
                        {formatDuration(session.duration_seconds)}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Info note */}
            <p className="text-xs text-muted-foreground text-center">
              Time is only tracked when the app tab is in foreground (actively viewing).
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailDrawer;
