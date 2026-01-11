import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { Zap, ArrowRight, Activity, BookOpen } from "lucide-react";

interface IntegrationsPromptCardProps {
  category?: string | null;
  hasHabits?: boolean;
}

export const IntegrationsPromptCard = ({ category, hasHabits }: IntegrationsPromptCardProps) => {
  const { isConnected: isStravaConnected, isLoading: stravaLoading } = useStravaConnection();
  const { isConnected: isDuolingoConnected, isLoading: duolingoLoading } = useDuolingoConnection();

  const isLoading = stravaLoading || duolingoLoading;
  
  // Determine which integrations are relevant for this goal
  const isFitnessGoal = category?.toLowerCase().includes('fitness') || 
                        category?.toLowerCase().includes('health') ||
                        category?.toLowerCase().includes('sport');
  const isLanguageGoal = category?.toLowerCase().includes('language');
  
  // Check if we should show this prompt
  const shouldShowStrava = isFitnessGoal && !isStravaConnected;
  const shouldShowDuolingo = isLanguageGoal && !isDuolingoConnected;
  
  // For goals with habits but no specific category, show general prompt
  const hasRelevantHabits = hasHabits && !isStravaConnected && !isDuolingoConnected;
  
  // Don't show if all relevant integrations are already connected or loading
  if (isLoading) return null;
  if (!shouldShowStrava && !shouldShowDuolingo && !hasRelevantHabits) return null;

  // Build integration suggestions
  const suggestions = [];
  if (shouldShowStrava || (hasRelevantHabits && !isFitnessGoal && !isLanguageGoal)) {
    suggestions.push({
      name: "Strava",
      icon: Activity,
      description: "Auto-track runs, rides, and workouts",
      color: "text-[#FC4C02]"
    });
  }
  if (shouldShowDuolingo || isLanguageGoal) {
    suggestions.push({
      name: "Duolingo",
      icon: BookOpen,
      description: "Track your language learning streak",
      color: "text-[#58CC02]"
    });
  }

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 via-background to-primary/5 border border-primary/10">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-foreground">Supercharge your habits</h4>
            <Badge variant="secondary" className="text-xs">New</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Connect apps to automatically track progress and stay motivated.
          </p>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs"
                >
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <span className="font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          )}

          <Link to="/profile?tab=integrations">
            <Button size="sm" variant="outline" className="gap-1.5">
              Set up integrations
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
