import { useNavigate, useLocation } from "react-router-dom";
import { Target, Users, UserPlus, BarChart3 } from "lucide-react";

interface NavigationMenuProps {
  onItemClick?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { path: '/goals', label: 'Goals', icon: Target, section: 'goals' },
  { path: '/community', label: 'Community', icon: Users, section: 'community' },
  { path: '/friends', label: 'Friends', icon: UserPlus, section: 'friends' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, section: 'analytics' },
];

export const NavigationMenu = ({ onItemClick, isMobile = false }: NavigationMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/goals')) return 'goals';
    if (path.startsWith('/community')) return 'community';
    if (path.startsWith('/friends')) return 'friends';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/profile')) return 'profile';
    return 'goals';
  };

  const currentSection = getCurrentSection();

  const handleNavigation = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  if (isMobile) {
    return (
      <>
        {navItems.map(({ path, label, icon: Icon, section }) => (
          <button
            key={section}
            onClick={() => handleNavigation(path)}
            className={`flex items-center w-full text-left py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 ${
              currentSection === section ? 'text-foreground font-medium bg-accent' : ''
            }`}
          >
            <Icon className="h-4 w-4 mr-3" />
            {label}
          </button>
        ))}
      </>
    );
  }

  return (
    <nav className="flex items-center space-x-1">
      {navItems.map(({ path, label, icon: Icon, section }) => (
        <button
          key={section}
          onClick={() => handleNavigation(path)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm leading-none transition-all duration-200 ${
            currentSection === section 
              ? 'text-foreground font-medium bg-accent' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </nav>
  );
};
