import { useNavigate, useLocation } from "react-router-dom";
import { Target, Users, UserPlus, BarChart3, Shield } from "lucide-react";
import { useAdminStatus } from "@/hooks/useAdminStatus";

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
  const { isAdmin } = useAdminStatus();

  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/goals')) return 'goals';
    if (path.startsWith('/community')) return 'community';
    if (path.startsWith('/friends') || path.startsWith('/partner')) return 'friends';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/profile')) return 'profile';
    return 'goals';
  };

  const currentSection = getCurrentSection();

  const handleNavigation = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  // Build nav items with optional admin
  const allNavItems = isAdmin 
    ? [...navItems, { path: '/admin', label: 'Admin', icon: Shield, section: 'admin' }]
    : navItems;

  if (isMobile) {
    return (
      <>
        {allNavItems.map(({ path, label, icon: Icon, section }) => (
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
      {allNavItems.map(({ path, label, icon: Icon, section }) => {
        const isActive = currentSection === section;
        return (
          <button
            key={section}
            onClick={() => handleNavigation(path)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm leading-none transition-all duration-200 group ${
              isActive 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 transition-all duration-200 ${isActive ? 'text-primary' : ''}`} />
            {label}
            
            {/* Underline indicator */}
            <span 
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary rounded-full transition-all duration-300 ${
                isActive 
                  ? 'w-4/5 opacity-100' 
                  : 'w-0 opacity-0 group-hover:w-1/2 group-hover:opacity-50'
              }`}
            />
            
            {/* Active glow effect */}
            {isActive && (
              <span className="absolute inset-0 rounded-md bg-primary/10 -z-10" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
