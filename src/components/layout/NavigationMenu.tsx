import { useNavigate, useLocation } from "react-router-dom";
import { Target, UserPlus, BarChart3, Shield, Blocks, Moon, Stethoscope, Dumbbell, Users, Megaphone } from "lucide-react";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import type { ModuleId } from "@/modules/types";

interface NavigationMenuProps {
  onItemClick?: () => void;
  isMobile?: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: typeof Target;
  section: string;
  /** When set, only render if this module is installed. */
  requiresModule?: ModuleId;
}

const navItems: NavItem[] = [
  { path: '/goals', label: 'Goals', icon: Target, section: 'goals' },
  { path: '/friends', label: 'Friends', icon: UserPlus, section: 'friends' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, section: 'analytics' },
  { path: '/training', label: 'Training', icon: Dumbbell, section: 'training', requiresModule: 'training_plan' },
  { path: '/sleep', label: 'Sleep', icon: Moon, section: 'sleep', requiresModule: 'sleep' },
  { path: '/health', label: 'Health', icon: Stethoscope, section: 'health', requiresModule: 'health_metrics' },
  { path: '/network', label: 'Network', icon: Users, section: 'network', requiresModule: 'network' },
  { path: '/modules', label: 'Modules', icon: Blocks, section: 'modules' },
];

export const NavigationMenu = ({ onItemClick, isMobile = false }: NavigationMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdminStatus();
  const { data: installedModules } = useInstalledModules();

  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/goals')) return 'goals';

    if (path.startsWith('/friends') || path.startsWith('/partner')) return 'friends';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/sleep')) return 'sleep';
    if (path.startsWith('/health')) return 'health';
    if (path.startsWith('/training')) return 'training';
    if (path.startsWith('/network')) return 'network';
    if (path.startsWith('/modules')) return 'modules';
    if (path.startsWith('/profile')) return 'profile';
    return 'goals';
  };

  const currentSection = getCurrentSection();

  const handleNavigation = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  // Filter out items whose required module isn't installed
  const visibleNavItems = navItems.filter(
    (item) => !item.requiresModule || installedModules?.has(item.requiresModule),
  );

  // Build nav items with optional admin
  const allNavItems = isAdmin
    ? [...visibleNavItems, { path: '/admin', label: 'Admin', icon: Shield, section: 'admin' }]
    : visibleNavItems;

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
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm leading-none transition-all duration-200 ${
              isActive 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 transition-colors duration-200 ${isActive ? 'text-primary' : ''}`} />
            {label}
          </button>
        );
      })}
    </nav>
  );
};
