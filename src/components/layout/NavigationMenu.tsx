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
          className={`w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors ${
            currentSection === 'community' ? 'text-white font-medium bg-white/10' : ''
          }`}
        >
          Community
        </button>
        <button
          onClick={() => handleNavigation('/goals')}
          className={`w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors ${
            currentSection === 'goals' ? 'text-white font-medium bg-white/10' : ''
          }`}
        >
          Goals
        </button>
      </>
    );
  }

  return (
    <nav className="flex items-center space-x-6 ml-8">
      <button
        onClick={() => handleNavigation('/community')}
        className={`text-base text-white/80 hover:text-white transition-colors ${
          currentSection === 'community' ? 'text-white font-medium' : ''
        }`}
      >
        Community
      </button>
      <button
        onClick={() => handleNavigation('/goals')}
        className={`text-base text-white/80 hover:text-white transition-colors ${
          currentSection === 'goals' ? 'text-white font-medium' : ''
        }`}
      >
        Goals
      </button>
    </nav>
  );
};