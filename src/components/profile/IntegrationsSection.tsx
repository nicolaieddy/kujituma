import { DuolingoConnectionCard } from "@/components/duolingo/DuolingoConnectionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useIsModuleInstalled } from "@/hooks/useInstalledModules";

export function IntegrationsSection() {
  const trainingInstalled = useIsModuleInstalled("training_plan");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Integrations</h2>
      </div>

      <p className="text-muted-foreground text-sm">
        Connect external services to automatically track your habits and activities.
      </p>

      {trainingInstalled && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  Strava, Garmin &amp; .FIT
                </CardTitle>
                <CardDescription>
                  Fitness integrations live inside the Training module.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/training?view=setup">Open Training Setup</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <DuolingoConnectionCard />
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            More integrations coming soon — Apple Health and others.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
