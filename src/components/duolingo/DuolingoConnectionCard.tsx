import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { Loader2, RefreshCw, Unlink, Flame, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Duolingo green color
const DUOLINGO_GREEN = "#58CC02";

export function DuolingoConnectionCard() {
  const { 
    isConnected, 
    connection, 
    isLoading, 
    isConnecting,
    isSyncing,
    connect, 
    disconnect,
    syncActivities 
  } = useDuolingoConnection();
  
  const [username, setUsername] = useState("");

  const handleConnect = async () => {
    if (!username.trim()) return;
    const success = await connect(username.trim());
    if (success) {
      setUsername("");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={DUOLINGO_GREEN}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-2 5.5c-2.33 0-4.32-1.45-5.12-3.5h1.67c.69 1.19 1.97 2 3.45 2s2.76-.81 3.45-2h1.67c-.8 2.05-2.79 3.5-5.12 3.5z" />
          </svg>
          Duolingo
        </CardTitle>
        <CardDescription>
          Auto-track language learning streaks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connection ? (
          <>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {connection.display_name || connection.duolingo_username}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {connection.current_streak} day streak
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    {connection.total_xp.toLocaleString()} XP
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {connection.last_synced_at 
                    ? `Synced ${formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}`
                    : `Connected ${formatDistanceToNow(new Date(connection.created_at), { addSuffix: true })}`
                  }
                </p>
              </div>
              <div className="flex h-2 w-2 rounded-full" style={{ backgroundColor: DUOLINGO_GREEN }} title="Connected" />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => syncActivities()}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Now
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={disconnect}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Habits linked to Duolingo will auto-complete when you maintain your streak.
            </p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="duolingo-username">Duolingo Username</Label>
              <Input
                id="duolingo-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Duolingo username"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConnect();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Your Duolingo profile must be set to public for this to work.
              </p>
            </div>
            
            <Button 
              onClick={handleConnect}
              disabled={!username.trim() || isConnecting}
              className="w-full"
              style={{ backgroundColor: DUOLINGO_GREEN }}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isConnecting ? "Connecting..." : "Connect with Duolingo"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
