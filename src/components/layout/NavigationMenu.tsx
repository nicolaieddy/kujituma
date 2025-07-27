import { useNavigate, useLocation } from "react-router-dom";

interface NavigationMenuProps {
  onItemClick?: () => void;
  isMobile?: boolean;
}

export const NavigationMenu = ({ onItemClick, isMobile = false }: NavigationMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current section based on pathname
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/community')) return 'community';
    if (path.startsWith('/goals')) return 'goals';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/profile')) return 'profile';
    return 'community';
  };

  const currentSection = getCurrentSection();

  const handleNavigation = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => handleNavigation('/community')}
          className={`w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 ${
            currentSection === 'community' ? 'text-white font-medium bg-white/10' : ''
          }`}
        >
          Community
        </button>
        <button
          onClick={() => handleNavigation('/goals')}
          className={`w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 ${
            currentSection === 'goals' ? 'text-white font-medium bg-white/10' : ''
          }`}
        >
          Goals
        </button>
        <button
          onClick={() => handleNavigation('/analytics')}
          className={`w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 ${
            currentSection === 'analytics' ? 'text-white font-medium bg-white/10' : ''
          }`}
        >
          Analytics
        </button>
      </>
    );
  }

  return (
    <nav className="flex items-center space-x-6 ml-8">
      <button
        onClick={() => handleNavigation('/community')}
        className={`text-base text-white/80 hover:text-white hover:scale-105 transition-all duration-200 ${
          currentSection === 'community' ? 'text-white font-medium' : ''
        }`}
      >
        Community
      </button>
      <button
        onClick={() => handleNavigation('/goals')}
        className={`text-base text-white/80 hover:text-white hover:scale-105 transition-all duration-200 ${
          currentSection === 'goals' ? 'text-white font-medium' : ''
        }`}
      >
        Goals
      </button>
      <button
        onClick={() => handleNavigation('/analytics')}
        className={`text-base text-white/80 hover:text-white hover:scale-105 transition-all duration-200 ${
          currentSection === 'analytics' ? 'text-white font-medium' : ''
        }`}
      >
        Analytics
      </button>
    </nav>
  );
};