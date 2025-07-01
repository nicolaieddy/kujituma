
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Activity, Users } from "lucide-react";

interface DashboardHeaderProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

export const DashboardHeader = ({ isAdmin, onSignOut }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current section based on pathname
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/feed') || path === '/') return 'feed';
    if (path.startsWith('/goals')) return 'goals';
    return 'feed';
  };

  const currentSection = getCurrentSection();

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-bold text-white">Kujituma</h1>
          
          <nav className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/')}
              className={`text-white/80 hover:text-white transition-colors ${
                currentSection === 'feed' ? 'text-white font-medium' : ''
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => navigate('/goals')}
              className={`text-white/80 hover:text-white transition-colors ${
                currentSection === 'goals' ? 'text-white font-medium' : ''
              }`}
            >
              Goals and Progress
            </button>
          </nav>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => navigate('/admin')}
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
