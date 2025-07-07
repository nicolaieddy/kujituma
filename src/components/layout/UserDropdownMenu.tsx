import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, ChevronDown, HelpCircle } from "lucide-react";
import { UserProfileAvatar } from "./UserProfileAvatar";

interface UserDropdownMenuProps {
  isAdmin: boolean;
  onSignOut: () => void;
  onRestartTour: () => void;
}

export const UserDropdownMenu = ({ isAdmin, onSignOut, onRestartTour }: UserDropdownMenuProps) => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-white/10 transition-colors">
          <UserProfileAvatar />
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
          onClick={onRestartTour}
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
  );
};