import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useTourContext } from "@/components/tour/TourProvider";
import { NavigationMenu } from "./NavigationMenu";
import { HelpButton } from "./HelpButton";
import { UserDropdownMenu } from "./UserDropdownMenu";
import { UserMobileMenu } from "./UserMobileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

export const DashboardHeader = ({ isAdmin, onSignOut }: DashboardHeaderProps) => {
  const isMobile = useIsMobile();
  const { startTour } = useTourContext();
  const { toast } = useToast();
  const navigate = useNavigate();

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
    <header className="bg-card/20 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 
            className="text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-all duration-300 hover:scale-105" 
            onClick={() => navigate('/community')}
          >
            Kujituma
          </h1>
          {!isMobile && <NavigationMenu />}
        </div>
        
        <div className="flex items-center justify-end gap-3">
          <HelpButton />
          <NotificationBell />
          <ThemeToggle />
          
          {!isMobile ? (
            <UserDropdownMenu 
              isAdmin={isAdmin} 
              onSignOut={onSignOut}
              onRestartTour={handleRestartTour}
            />
          ) : (
            <UserMobileMenu 
              isAdmin={isAdmin} 
              onSignOut={onSignOut}
              onRestartTour={handleRestartTour}
            />
          )}
        </div>
      </div>
    </header>
  );
};