import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Users, Settings } from "lucide-react";

interface MainNavigationProps {
  isAdmin?: boolean;
}

export const MainNavigation = ({ isAdmin }: MainNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current section based on pathname
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/goals') || path === '/') return 'goals';
    return 'goals';
  };

  const currentSection = getCurrentSection();

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'goals':
        navigate('/');
        break;
      case 'admin':
        navigate('/admin');
        break;
    }
  };

  return (
    <div className="w-full flex justify-center mb-6">
      <Tabs value={currentSection} onValueChange={handleTabChange} className="w-full max-w-2xl">
        <TabsList className={`grid w-full bg-accent border-border h-12 ${
          isAdmin ? 'grid-cols-2' : 'grid-cols-1'
        }`}>
          <TabsTrigger 
            value="goals" 
            className="flex items-center gap-2 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Goals & Progress</span>
            <span className="sm:hidden">Goals</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger 
              value="admin" 
              className="flex items-center gap-2 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
              <span className="sm:hidden">Admin</span>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
    </div>
  );
};
