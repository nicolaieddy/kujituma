
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  // Determine current section based on pathname
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/feed')) return 'feed';
    if (path.startsWith('/goals')) return 'goals';
    if (path.startsWith('/profile')) return 'profile';
    return 'feed';
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

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 sm:space-x-8">
          <h1 className="text-lg sm:text-xl font-bold text-white">Kujituma</h1>
          
          <nav className="flex items-center space-x-4 sm:space-x-6">
            <button
              onClick={() => navigate('/feed')}
              className={`text-sm sm:text-base text-white/80 hover:text-white transition-colors ${
                currentSection === 'feed' ? 'text-white font-medium' : ''
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => navigate('/goals')}
              className={`text-sm sm:text-base text-white/80 hover:text-white transition-colors ${
                currentSection === 'goals' ? 'text-white font-medium' : ''
              }`}
            >
              <span className="hidden sm:inline">Goals and Progress</span>
              <span className="sm:hidden">Goals</span>
            </button>
          </nav>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Profile Avatar */}
          <Avatar 
            className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
            onClick={() => navigate('/profile')}
          >
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
              {userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/20 px-2 sm:px-3"
              onClick={() => navigate('/admin')}
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
          
          <Button
            variant="ghost" 
            size="sm"
            onClick={onSignOut}
            className="text-white/80 hover:text-white hover:bg-white/20 px-2 sm:px-3"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
