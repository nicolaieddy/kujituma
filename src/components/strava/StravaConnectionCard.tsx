import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { Loader2, RefreshCw, Unlink, Zap, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function StravaConnectionCard() {
  const { 
    isConnected, 
    connection, 
    isLoading, 
    isSyncing,
    initiateConnect, 
    disconnect,
    syncActivities,
    toggleAutoSync,
  } = useStravaConnection();

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
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FC4C02">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Strava
        </CardTitle>
        <CardDescription>
          Automatically track workouts from Strava
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connection ? (
          <>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="font-medium text-sm">
                  {connection.athlete_firstname} {connection.athlete_lastname}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected {formatDistanceToNow(new Date(connection.created_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {connection.last_synced_at
                    ? `Synced ${formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}`
                    : "Not yet synced"}
                </p>
              </div>
              <div className="flex h-2 w-2 rounded-full bg-green-500" title="Connected" />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync" className="text-sm font-medium">
                  Auto-sync daily
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync new activities every day
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={connection.auto_sync_enabled ?? false}
                onCheckedChange={(checked) => toggleAutoSync(checked)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={syncActivities}
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
          </>
        ) : (
          <Button 
            onClick={initiateConnect}
            className="w-full"
            style={{ backgroundColor: "#FC4C02" }}
          >
            <Zap className="h-4 w-4 mr-2" />
            Connect with Strava
          </Button>
        )}
      </CardContent>
    </Card>
  );
}