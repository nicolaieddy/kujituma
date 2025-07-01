
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/goals')) return 'goals';
    return 'feed';
  };

  const currentSection = getCurrentSection();

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'goals':
        navigate('/goals');
        break;
      case 'feed':
        navigate('/');
        break;
      case 'admin':
        navigate('/admin');
        break;
    }
  };

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-white">Kujituma</h1>
          
          <Tabs value={currentSection} onValueChange={handleTabChange}>
            <TabsList className={`bg-white/10 backdrop-blur-lg border-white/20 ${
              isAdmin ? 'grid-cols-3' : 'grid-cols-2'
            }`}>
              <TabsTrigger 
                value="goals" 
                className="flex items-center gap-2 text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Goals & Progress</span>
                <span className="sm:hidden">Goals</span>
              </TabsTrigger>
              <TabsTrigger 
                value="feed" 
                className="flex items-center gap-2 text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Progress Feed</span>
                <span className="sm:hidden">Feed</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger 
                  value="admin" 
                  className="flex items-center gap-2 text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                  <span className="sm:hidden">Admin</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center space-x-2">
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
