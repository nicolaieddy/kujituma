
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Menu, ChevronDown, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTourContext } from "@/components/tour/TourProvider";
import { useToast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

interface UserProfile {
  avatar_url?: string;
  full_name: string;
}

export const DashboardHeader = ({ isAdmin, onSignOut }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { startTour } = useTourContext();
  const { toast } = useToast();

  // Determine current section based on pathname
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/community')) return 'community';
    if (path.startsWith('/goals')) return 'goals';
    if (path.startsWith('/profile')) return 'profile';
    return 'community';
  };

  const currentSection = getCurrentSection();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRestartTour = async () => {
    try {
      await startTour();
      toast({
        title: "Tour restarted",
        description: "The onboarding tour has been restarted to help you get familiar with the app.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restart the tour. Please try again.",
        variant: "destructive",
      });
    }
  };

  const NavigationItems = () => (
    <>
      <button
        onClick={() => {
          navigate('/community');
          setMobileMenuOpen(false);
        }}
        className={`w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors ${
          currentSection === 'community' ? 'text-white font-medium bg-white/10' : ''
        }`}
      >
        Community
      </button>
      <button
        onClick={() => {
          navigate('/goals');
          setMobileMenuOpen(false);
        }}
        className={`w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors ${
          currentSection === 'goals' ? 'text-white font-medium bg-white/10' : ''
        }`}
      >
        Goals
      </button>
    </>
  );

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">Kujituma</h1>
          
          {!isMobile && (
            <nav className="flex items-center space-x-6 ml-8">
              <button
                onClick={() => navigate('/community')}
                className={`text-base text-white/80 hover:text-white transition-colors ${
                  currentSection === 'community' ? 'text-white font-medium' : ''
                }`}
              >
                Community
              </button>
              <button
                onClick={() => navigate('/goals')}
                className={`text-base text-white/80 hover:text-white transition-colors ${
                  currentSection === 'goals' ? 'text-white font-medium' : ''
                }`}
              >
                Goals
              </button>
            </nav>
          )}
        </div>
        
        <div className="flex items-center justify-end">
          {!isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm">
                      {userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-white/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-slate-800/95 backdrop-blur-lg border-white/20 text-white"
              >
                <DropdownMenuItem 
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={handleRestartTour}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Restart Tour
                </DropdownMenuItem>
                
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem 
                      onClick={() => navigate('/admin')}
                      className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator className="bg-white/20" />
                <DropdownMenuItem 
                  onClick={onSignOut}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-red-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm">
                      {userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <Menu className="h-4 w-4 text-white/60" />
                </button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 w-72"
              >
                <div className="flex flex-col space-y-4 mt-8">
                  <div className="text-white font-semibold text-lg mb-4">Navigation</div>
                  <NavigationItems />
                  
                  <div className="border-t border-white/20 my-4"></div>
                  
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </button>
                  
                  <button
                    onClick={() => {
                      handleRestartTour();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4 mr-3" />
                    Restart Tour
                  </button>
                  
                  {isAdmin && (
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left py-3 px-4 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Admin
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      onSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full text-left py-3 px-4 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
};
