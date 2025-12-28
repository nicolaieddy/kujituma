import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Calendar, Users, Settings } from "lucide-react";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

interface MainNavigationProps {
  isAdmin?: boolean;
}

export const MainNavigation = ({ isAdmin }: MainNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasUnsavedChanges } = useUnsavedChanges();

  // Determine current section based on pathname
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/feed')) return 'feed';
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
      case 'feed':
        navigate('/feed');
        break;
      case 'admin':
        navigate('/admin');
        break;
    }
  };

  // Show indicator on Goals tab when there are unsaved changes
  const showUnsavedIndicator = hasUnsavedChanges && currentSection === 'goals';

  return (
    <div className="w-full flex justify-center mb-6">
      <Tabs value={currentSection} onValueChange={handleTabChange} className="w-full max-w-2xl">
        <TabsList className={`grid w-full bg-accent border-border h-12 ${
          isAdmin ? 'grid-cols-3' : 'grid-cols-2'
        }`}>
          <TabsTrigger 
            value="goals" 
            className="flex items-center gap-2 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Goals & Progress</span>
            <span className="sm:hidden">Goals</span>
            {showUnsavedIndicator && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="feed" 
            className="flex items-center gap-2 text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Progress Feed</span>
            <span className="sm:hidden">Feed</span>
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