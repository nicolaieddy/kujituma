import { StravaConnectionCard } from "@/components/strava/StravaConnectionCard";
import { ActivityMappingCard } from "@/components/strava/ActivityMappingCard";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export function IntegrationsSection() {
  const { isConnected } = useStravaConnection();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Integrations</h2>
      </div>
      
      <p className="text-muted-foreground text-sm">
        Connect external services to automatically track your habits and activities.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <StravaConnectionCard />
        
        {isConnected && (
          <ActivityMappingCard />
        )}
      </div>

      {!isConnected && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">More integrations coming soon</CardTitle>
            <CardDescription>
              We're working on adding support for Garmin, Apple Health, and more fitness trackers.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}