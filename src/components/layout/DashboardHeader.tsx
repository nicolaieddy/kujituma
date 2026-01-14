import { useIsMobile } from "@/hooks/use-mobile";
import { NavigationMenu } from "./NavigationMenu";
import { UserDropdownMenu } from "./UserDropdownMenu";
import { UserMobileMenu } from "./UserMobileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PendingSyncBadge } from "@/components/pwa/PendingSyncBadge";
import { Button } from "@/components/ui/button";

import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";

interface DashboardHeaderProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

const isIOSPhone = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Only detect iPhone/iPod - iPad should get full navigation
  return /iPhone|iPod/.test(ua);
};

export const DashboardHeader = ({ isAdmin, onSignOut }: DashboardHeaderProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isIOSPhoneDevice = isIOSPhone();

  // iOS Safari/Chrome on iOS can hit stack overflows with Radix focus management
  // (Dialog/DropdownMenu/Popover) even when closed. Use a minimal header on iOS
  // to prevent "Maximum call stack size exceeded" crashes.
  const renderIOSActions = () => (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => navigate("/profile")}
        className="gap-2"
      >
        <User className="h-4 w-4" />
        Profile
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onSignOut}
        className="gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );

  return (
    <header className="bg-card/95 backdrop-blur-xl border-b border-border/30 sticky top-0 z-50 shadow-soft">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1
            className="text-xl font-bold leading-none text-primary cursor-pointer hover:text-primary/80 transition-colors duration-200 font-heading"
            onClick={() => navigate("/goals")}
          >
            Kujituma
          </h1>
          {!isMobile && <NavigationMenu />}
        </div>

        <div className="flex items-center justify-end gap-3">
          {isIOSPhoneDevice ? (
            renderIOSActions()
          ) : (
            <>
              <PendingSyncBadge />
              <NotificationBell />

              {!isMobile ? (
                <UserDropdownMenu isAdmin={isAdmin} onSignOut={onSignOut} />
              ) : (
                <UserMobileMenu isAdmin={isAdmin} onSignOut={onSignOut} />
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
