import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useTourContext } from "@/components/tour/TourProvider";
import { useToast } from "@/hooks/use-toast";

export const HelpButton = () => {
  const { startTour } = useTourContext();
  const { toast } = useToast();

  const handleRestartTour = async () => {
    try {
      await startTour();
      toast({
        title: "Tour restarted",
        description: "The onboarding tour has been restarted to help you get familiar with the app.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restart the tour. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestartTour}
          className="h-9 w-9 p-0 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Restart product tour</p>
      </TooltipContent>
    </Tooltip>
  );
};