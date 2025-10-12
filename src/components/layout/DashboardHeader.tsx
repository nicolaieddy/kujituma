import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useTourContext } from "@/components/tour/TourProvider";
import { NavigationMenu } from "./NavigationMenu";
import { UserDropdownMenu } from "./UserDropdownMenu";
import { UserMobileMenu } from "./UserMobileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
    <header className="bg-card/95 backdrop-blur-xl border-b border-border/30 sticky top-0 z-50 shadow-soft">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 
            className="text-xl font-bold text-primary cursor-pointer hover:text-primary/80 transition-colors duration-200 font-serif" 
            onClick={() => navigate('/community')}
          >
            Kujituma
          </h1>
          {!isMobile && <NavigationMenu />}
        </div>
        
        <div className="flex items-center justify-end gap-3">
          <NotificationBell />
          
          
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