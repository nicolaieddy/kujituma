import { StravaConnectionCard } from "@/components/strava/StravaConnectionCard";
import { DuolingoConnectionCard } from "@/components/duolingo/DuolingoConnectionCard";
import { GarminConnectionCard } from "@/components/garmin/GarminConnectionCard";
import { ActivityMappingCard } from "@/components/strava/ActivityMappingCard";
import { FitFileUploadCard } from "@/components/training/FitFileUploadCard";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ModuleGate } from "@/modules/ModuleGate";
import { useIsModuleInstalled } from "@/hooks/useInstalledModules";


export function IntegrationsSection() {
  const { isConnected: isStravaConnected } = useStravaConnection();
  const { isConnected: isDuolingoConnected } = useDuolingoConnection();
  const trainingInstalled = useIsModuleInstalled("training_plan");

  const hasAnyConnection = (trainingInstalled && isStravaConnected) || isDuolingoConnected;

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
        <ModuleGate
          id="training_plan"
          fallback={
            <Card className="border-dashed md:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Blocks className="h-4 w-4" />
                      Strava, Garmin & .FIT
                    </CardTitle>
                    <CardDescription>
                      Install the Training Plan module to connect your fitness devices.
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/modules?highlight=training_plan">Browse modules</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          }
        >
          <StravaConnectionCard />
          <GarminConnectionCard />
        </ModuleGate>
        <DuolingoConnectionCard />
      </div>

      <ModuleGate id="training_plan">
        <FitFileUploadCard />
      </ModuleGate>

      {hasAnyConnection && trainingInstalled && (
        <ActivityMappingCard />
      )}

      {!hasAnyConnection && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">More integrations coming soon</CardTitle>
            <CardDescription>
              We're working on adding support for Apple Health and more services.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
