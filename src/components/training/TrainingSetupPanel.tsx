import { StravaConnectionCard } from "@/components/strava/StravaConnectionCard";
import { GarminConnectionCard } from "@/components/garmin/GarminConnectionCard";
import { ActivityMappingCard } from "@/components/strava/ActivityMappingCard";
import { WorkoutPreferencesSection } from "@/components/profile/WorkoutPreferencesSection";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { Zap } from "lucide-react";

/**
 * Training Setup — integrations, workout preferences, and bulk upload,
 * all folded into the Training module so the Profile stays focused on identity.
 */
export function TrainingSetupPanel() {
  const { isConnected: isStravaConnected } = useStravaConnection();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Integrations</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Connect Strava or Garmin to automatically pull in your activities and sleep.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <StravaConnectionCard />
          <GarminConnectionCard />
        </div>
        {isStravaConnected && <ActivityMappingCard />}
      </section>

      {/* Workout units + bulk .FIT upload */}
      <WorkoutPreferencesSection />
    </div>
  );
}
