import { AlertTriangle, ArrowRight, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Goal } from "@/types/goals";

interface CarryOverBannerProps {
  goals: Goal[];
  onCarryOver: () => void;
  onArchive: () => void;
  isLoading?: boolean;
}

export const CarryOverBanner = ({
  goals,
  onCarryOver,
  onArchive,
  isLoading = false
}: CarryOverBannerProps) => {
  if (goals.length === 0) return null;

  const previousYear = new Date(goals[0].created_at).getFullYear();

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">
              You have {goals.length} unfinished goal{goals.length > 1 ? 's' : ''} from {previousYear}
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Would you like to carry them over to this year or deprioritize them?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={onCarryOver}
                disabled={isLoading}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Carry Over to {new Date().getFullYear()}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onArchive}
                disabled={isLoading}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                Deprioritize All
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
