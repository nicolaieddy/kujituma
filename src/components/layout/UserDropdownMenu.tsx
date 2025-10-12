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
        <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-accent transition-colors">
          <UserProfileAvatar />
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56"
      >
        <DropdownMenuItem 
          onClick={() => navigate('/profile')}
          className="cursor-pointer"
        >
          <User className="h-4 w-4 mr-2" />
          Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={onRestartTour}
          className="cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Restart Tour
        </DropdownMenuItem>
        
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate('/admin')}
              className="cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onSignOut}
          className="cursor-pointer text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};