import { useIsMobile } from "@/hooks/use-mobile";
import { NavigationMenu } from "./NavigationMenu";
import { UserDropdownMenu } from "./UserDropdownMenu";
import { UserMobileMenu } from "./UserMobileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PendingSyncBadge } from "@/components/pwa/PendingSyncBadge";

import { useNavigate } from "react-router-dom";

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
          <PendingSyncBadge />
          <NotificationBell />

          {!isMobile && !isIOSPhone() ? (
            <UserDropdownMenu isAdmin={isAdmin} onSignOut={onSignOut} />
          ) : (
            <UserMobileMenu isAdmin={isAdmin} onSignOut={onSignOut} />
          )}
        </div>
      </div>
    </header>
  );
};
