import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Settings, User, Menu, HelpCircle, Users } from "lucide-react";
import { UserProfileAvatar } from "./UserProfileAvatar";
import { NavigationMenu } from "./NavigationMenu";

interface UserMobileMenuProps {
  isAdmin: boolean;
  onSignOut: () => void;
  onRestartTour: () => void;
}

export const UserMobileMenu = ({ isAdmin, onSignOut, onRestartTour }: UserMobileMenuProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuClose = () => setMobileMenuOpen(false);

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-accent transition-colors">
          <UserProfileAvatar />
          <Menu className="h-4 w-4 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="glass-card w-72"
      >
        <div className="flex flex-col space-y-4 mt-8">
          <div className="text-foreground font-semibold text-lg mb-4">Navigation</div>
          <NavigationMenu isMobile onItemClick={handleMenuClose} />
          
          <div className="border-t border-border my-4"></div>
          
          <button
            onClick={() => {
              navigate('/profile');
              handleMenuClose();
            }}
            className="flex items-center w-full text-left py-3 px-4 rounded-lg text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
          >
            <User className="h-4 w-4 mr-3" />
            Profile
          </button>
          
          <button
            onClick={() => {
              navigate('/friends');
              handleMenuClose();
            }}
            className="flex items-center w-full text-left py-3 px-4 rounded-lg text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
          >
            <Users className="h-4 w-4 mr-3" />
            Friends
          </button>
          
          <button
            onClick={() => {
              onRestartTour();
              handleMenuClose();
            }}
            className="flex items-center w-full text-left py-3 px-4 rounded-lg text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
          >
            <HelpCircle className="h-4 w-4 mr-3" />
            Restart Tour
          </button>
          
          {isAdmin && (
            <button
              onClick={() => {
                navigate('/admin');
                handleMenuClose();
              }}
              className="flex items-center w-full text-left py-3 px-4 rounded-lg text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4 mr-3" />
              Admin
            </button>
          )}
          
          <button
            onClick={() => {
              onSignOut();
              handleMenuClose();
            }}
            className="flex items-center w-full text-left py-3 px-4 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};