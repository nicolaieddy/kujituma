
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

interface DashboardHeaderProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

export const DashboardHeader = ({ isAdmin, onSignOut }: DashboardHeaderProps) => {
  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">Kujituma</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => window.location.href = '/admin'}
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
          
          <Button
            variant="ghost" 
            size="sm"
            onClick={onSignOut}
            className="text-white/80 hover:text-white hover:bg-white/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};
