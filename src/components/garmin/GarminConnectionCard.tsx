import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGarminConnection } from "@/hooks/useGarminConnection";
import { Loader2, Unlink, Watch, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function GarminConnectionCard() {
  const { isConnected, connection, isLoading, initiateConnect, disconnect } =
    useGarminConnection();

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
          <Watch className="h-5 w-5 text-[#007CC3]" />
          Garmin
        </CardTitle>
        <CardDescription>
          Stream activities and sleep automatically — no more .fit or CSV uploads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connection ? (
          <>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="font-medium text-sm">Garmin connected</p>
                <p className="text-xs text-muted-foreground">
                  Connected {formatDistanceToNow(new Date(connection.connected_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {connection.last_sync_at
                    ? `Last activity received ${formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}`
                    : "Waiting for first sync from your watch"}
                </p>
              </div>
              <div className="flex h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
            </div>

            {connection.last_error && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                {connection.last_error}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              New workouts appear within ~1–5 minutes of finishing. Sleep data lands every
              morning. You can keep uploading .fit/CSV files as a fallback.
            </p>

            <Button variant="ghost" size="sm" onClick={disconnect}>
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect Garmin
            </Button>
          </>
        ) : (
          <Button
            onClick={initiateConnect}
            className="w-full"
            style={{ backgroundColor: "#007CC3", color: "white" }}
          >
            <Watch className="h-4 w-4 mr-2" />
            Connect with Garmin
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
