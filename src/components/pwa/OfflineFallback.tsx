import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface OfflineFallbackProps {
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export const OfflineFallback = ({
  title = "You're offline",
  description = "This section requires an internet connection. Please check your connection and try again.",
  showRetry = true,
  onRetry,
}: OfflineFallbackProps) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-dashed border-2 border-muted bg-muted/20">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </div>

          {showRetry && (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
